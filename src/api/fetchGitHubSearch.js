// src/api/fetchGitHubSearch.js
//
// Searches GitHub broadly for READMEs that contain hiring/job information,
// then uses Claude to extract structured job listings from the raw markdown.
//
// This is intentionally kept separate from fetchGitHub.js (known repos) so
// each can be enabled or disabled independently.
//
// How it works:
//   1. Use GitHub Code Search API to find repos tagged with job-related topics
//   2. Fetch each repo's README via the GitHub Contents API
//   3. Run heuristic pre-filter — skip READMEs that don't look job-related
//   4. Send promising READMEs to Claude to extract structured listings
//   5. Normalise Claude's output into the shared job schema
//
// Rate limits to be aware of:
//   - GitHub Code Search: 30 req/min authenticated, 10 req/min unauth
//   - GitHub Contents API: 5000 req/hr authenticated, 60 req/hr unauth
//   - Claude: billed per token — each README parse costs ~500–2000 tokens
//
// To plug this into the app:
//   1. Import fetchGitHubSearch in src/app/api/jobs/route.js and add to Promise.allSettled
//   2. Add 'githubsearch' to the SOURCES array in src/app/page.js
//   3. Create src/app/api/jobs/githubsearch/route.js (see sibling file)

import axios from 'axios'
import Anthropic from '@anthropic-ai/sdk'

// ─── Config ──────────────────────────────────────────────────────────────────

// GitHub repo topics to search for. These are curated tags repo owners apply.
const SEARCH_TOPICS = [
  'job-board',
  'jobs',
  'hiring',
  'remote-jobs',
  'job-listings',
  'job-postings',
]

// Max repos to process per topic. Keep low to manage API costs and latency.
// At 5 per topic × 6 topics = up to 30 READMEs → up to 30 Claude calls.
const MAX_REPOS_PER_TOPIC = 5

// Minimum signals required for a README to pass the heuristic pre-filter.
// Increasing this reduces Claude API calls but may miss some valid sources.
const MIN_HEURISTIC_SIGNALS = 2

// ─── Main export ─────────────────────────────────────────────────────────────

export async function fetchGitHubSearch() {
  const token = process.env.GITHUB_TOKEN
  const headers = buildHeaders(token)
  const anthropic = new Anthropic()

  // Step 1: Search GitHub for repos with job-related topics
  const repos = await discoverRepos(headers)
  if (repos.length === 0) return []

  // Step 2–4: Fetch README, pre-filter, extract via Claude — all in parallel
  const results = await Promise.allSettled(
    repos.map(repo => processRepo(repo, headers, anthropic))
  )

  const allJobs = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value)
    } else {
      console.error('[fetchGitHubSearch] Repo processing failed:', result.reason?.message)
    }
  }

  return allJobs
}

// ─── Step 1: Discover repos via topic search ──────────────────────────────────

async function discoverRepos(headers) {
  const seen = new Set()
  const repos = []

  // Search each topic and deduplicate by repo full name
  const searches = await Promise.allSettled(
    SEARCH_TOPICS.map(topic => searchByTopic(topic, headers))
  )

  for (const result of searches) {
    if (result.status !== 'fulfilled') continue
    for (const repo of result.value) {
      if (!seen.has(repo.full_name)) {
        seen.add(repo.full_name)
        repos.push(repo)
      }
    }
  }

  return repos
}

async function searchByTopic(topic, headers) {
  const url = `https://api.github.com/search/repositories?q=topic:${topic}&sort=stars&per_page=${MAX_REPOS_PER_TOPIC}`
  const response = await axios.get(url, { headers })
  return response.data.items ?? []
}

// ─── Step 2: Fetch README content ────────────────────────────────────────────

async function fetchReadme(owner, repo, headers) {
  // Using vnd.github.v3.raw returns the file content directly as a string
  const url = `https://api.github.com/repos/${owner}/${repo}/readme`
  const response = await axios.get(url, {
    headers: { ...headers, Accept: 'application/vnd.github.v3.raw' },
  })
  return typeof response.data === 'string' ? response.data : ''
}

// ─── Step 3: Heuristic pre-filter ────────────────────────────────────────────
// Counts how many job-related signals are present in the markdown.
// Returns true only if enough signals are found — avoids sending every
// README to Claude regardless of content.

function looksLikeJobList(markdown) {
  const text = markdown.toLowerCase()
  let signals = 0

  // Structural signals — these suggest a curated list format
  if (/\|\s*company\s*\|/i.test(markdown))   signals++ // table with "Company" column
  if (/\|\s*role\s*\|/i.test(markdown))       signals++ // table with "Role" column
  if (/\|\s*location\s*\|/i.test(markdown))   signals++ // table with "Location" column
  if (/##\s*(jobs|hiring|positions|openings|opportunities)/i.test(markdown)) signals++
  if (/\[apply\]/i.test(markdown))            signals++ // explicit [Apply] links

  // Keyword signals
  if (text.includes("we're hiring"))          signals++
  if (text.includes("we are hiring"))         signals++
  if (text.includes("open positions"))        signals++
  if (text.includes("job openings"))          signals++
  if (text.includes("remote"))                signals++
  if (text.includes("salary"))                signals++
  if (/\$[\d,]+/.test(markdown))              signals++ // dollar amount (salary indicator)

  return signals >= MIN_HEURISTIC_SIGNALS
}

// ─── Step 4: Claude extraction ────────────────────────────────────────────────
// Sends the README to Claude and asks it to extract job listings as JSON.
// Claude handles the unstructured nature of markdown much better than regex.

async function extractJobsWithClaude(markdown, repoFullName, anthropic) {
  // Truncate to keep token costs reasonable — most useful info is near the top
  const truncated = markdown.slice(0, 6000)

  const prompt = `You are a job listing extractor. Below is a README from a GitHub repository that may contain job listings or company hiring information.

Extract all job listings or companies that are actively hiring. For each one, return a JSON array of objects with this exact shape:

[
  {
    "title": "<job title or 'Various Positions' if multiple roles listed>",
    "company": "<company name>",
    "description": "<brief description of the role or company, max 300 chars>",
    "tags": ["<tech stack or skills mentioned>"],
    "applyUrl": "<direct URL to apply or company careers page>",
    "location": "<location or 'Remote' if remote>"
  }
]

Rules:
- Only include entries where there is a clear apply URL or careers page link
- If no valid job listings exist, return an empty array: []
- Return ONLY the JSON array — no explanation, no markdown fences

README content from ${repoFullName}:
---
${truncated}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  return parseClaudeResponse(message.content[0].text)
}

function parseClaudeResponse(text) {
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    console.error('[fetchGitHubSearch] Failed to parse Claude response:', text.slice(0, 200))
    return []
  }
}

// ─── Step 5: Normalise to shared job schema ───────────────────────────────────

function normalize(raw, repoFullName) {
  const company = raw.company ?? 'Unknown Company'
  const title = raw.title ?? 'Various Positions'

  return {
    id: `githubsearch-${slugify(repoFullName)}-${slugify(company)}-${slugify(title)}`,
    source: 'githubsearch',
    title,
    company,
    description: raw.description ?? '',
    tags: Array.isArray(raw.tags) ? raw.tags.map(t => t.toLowerCase()) : [],
    salary: null,
    location: raw.location ?? 'Remote',
    applyUrl: raw.applyUrl ?? `https://github.com/${repoFullName}`,
    postedAt: null,
    score: null,
    reasoning: null,
    matchingSkills: [],
    missingSkills: [],
    status: 'new',
  }
}

// ─── Full pipeline for one repo ───────────────────────────────────────────────

async function processRepo(repo, headers, anthropic) {
  const [owner, repoName] = repo.full_name.split('/')

  // Fetch README
  const markdown = await fetchReadme(owner, repoName, headers)
  if (!markdown) return []

  // Pre-filter — skip if it doesn't look like a job list
  if (!looksLikeJobList(markdown)) return []

  // Extract with Claude
  const rawJobs = await extractJobsWithClaude(markdown, repo.full_name, anthropic)
  if (rawJobs.length === 0) return []

  // Normalise and return
  return rawJobs
    .filter(raw => raw.applyUrl) // must have somewhere to apply
    .map(raw => normalize(raw, repo.full_name))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildHeaders(token) {
  return {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'JobRadar/1.0 (personal job search tool)',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function slugify(str) {
  return (str ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

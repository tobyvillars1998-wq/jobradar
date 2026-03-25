// src/api/fetchGitHub.js
//
// Fetches job listings from known GitHub repositories that maintain
// curated lists of companies/positions in their READMEs or structured files.
//
// Targeted repos:
//   - remoteintech/remote-jobs        → companies with remote positions (CSV data file)
//   - poteto/hiring-without-whiteboards → companies hiring without whiteboard interviews (README table)
//
// Requires: GITHUB_TOKEN env var for authenticated requests (5000 req/hr vs 60 unauthenticated).

import axios from 'axios'
import { RELEVANT_TAGS, DEAL_BREAKERS } from '@/utils/filters'

// ─── Repo definitions ────────────────────────────────────────────────────────
// Each entry tells the fetcher where to find job data and how to parse it.

const GITHUB_REPOS = [
  // remoteintech/remote-jobs removed — repo restructured to per-company .md files
  // in src/companies/, requires many API calls per run. Re-add once GITHUB_TOKEN is set.
  {
    id: 'hiringwow',
    owner: 'poteto',
    repo: 'hiring-without-whiteboards',
    // Rows format: [Company](url) | Region | Tech stack | (no leading pipe)
    path: 'README.md',
    parser: parseHiringWoW,
  },
]

// ─── Main export ─────────────────────────────────────────────────────────────

export async function fetchGitHub() {
  const token = process.env.GITHUB_TOKEN

  const headers = {
    Accept: 'application/vnd.github.v3.raw',
    'User-Agent': 'JobRadar/1.0 (personal job search tool)',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  // Fetch all repos in parallel; failures are isolated
  const results = await Promise.allSettled(
    GITHUB_REPOS.map(repoDef => fetchRepo(repoDef, headers))
  )

  const allJobs = []
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value)
    } else {
      console.error('[fetchGitHub] A repo fetch failed:', results[i].reason?.message)
    }
  }

  return allJobs
}

// ─── Per-repo fetcher ─────────────────────────────────────────────────────────

async function fetchRepo(repoDef, headers) {
  const url = `https://api.github.com/repos/${repoDef.owner}/${repoDef.repo}/contents/${repoDef.path}`
  const response = await axios.get(url, { headers })

  // GitHub returns base64-encoded content when Accept is application/vnd.github.v3+json,
  // but with vnd.github.v3.raw it returns the file content directly as a string.
  const content = typeof response.data === 'string'
    ? response.data
    : Buffer.from(response.data.content, 'base64').toString('utf-8')

  return repoDef.parser(content, repoDef.id)
}

// ─── Parser: remoteintech/remote-jobs ────────────────────────────────────────
// README contains a markdown table with columns:
//   | Company | Region | Tech Stack | Profiles |
// Each row links to a company profile page within the repo.

function parseRemoteIntech(markdown, sourceId) {
  const jobs = []

  // Match markdown table rows — skip the header and separator rows
  // Format: | [Company Name](url) | Worldwide | ... | ... |
  const tableRowRegex = /^\|\s*\[(.+?)\]\((https?:\/\/[^\)]+)\)\s*\|(.+)$/gm

  let match
  while ((match = tableRowRegex.exec(markdown)) !== null) {
    const company = match[1].trim()
    const profileUrl = match[2].trim()
    const rest = match[3].split('|').map(s => s.trim())
    const region = rest[0] ?? ''
    const techStack = rest[1] ?? ''

    const description = `${company} hires remotely. Region: ${region || 'Worldwide'}. Tech: ${techStack || 'Not specified'}.`

    const job = {
      id: `github-remoteintech-${slugify(company)}`,
      source: 'github',
      title: 'Remote Positions Available',
      company,
      description,
      tags: extractTags(techStack),
      salary: null,
      location: 'Remote',
      applyUrl: profileUrl,
      postedAt: null,
      score: null,
      reasoning: null,
      matchingSkills: [],
      missingSkills: [],
      status: 'new',
    }

    if (isRelevant(job)) jobs.push(job)
  }

  return jobs
}

// ─── Parser: poteto/hiring-without-whiteboards ───────────────────────────────
// README contains markdown tables per funding stage:
//   | Company | Region | Tech Stack | Funding |
// Some rows have plain company names (not linked), others are linked.

function parseHiringWoW(markdown, sourceId) {
  const jobs = []

  // Rows are markdown list items: - [Company](url) | Region | Description
  const linkedRowRegex = /^- \[(.+?)\]\((https?:\/\/[^\)]+)\)\s*\|(.+)$/gm

  let match
  while ((match = linkedRowRegex.exec(markdown)) !== null) {
    const company = match[1].trim()
    const applyUrl = match[2].trim()
    const rest = match[3].split('|').map(s => s.trim())
    const region = rest[0] ?? ''
    const techStack = rest[1] ?? ''

    const description = `${company} does not use whiteboard interviews. Region: ${region || 'Various'}. Tech: ${techStack || 'Not specified'}.`

    const job = {
      id: `github-hiringwow-${slugify(company)}`,
      source: 'github',
      title: 'Open Positions (No Whiteboard)',
      company,
      description,
      tags: extractTags(techStack),
      salary: null,
      location: 'Remote',
      applyUrl,
      postedAt: null,
      score: null,
      reasoning: null,
      matchingSkills: [],
      missingSkills: [],
      status: 'new',
    }

    if (isRelevant(job)) jobs.push(job)
  }

  return jobs
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRelevant(job) {
  const searchText = [
    job.title,
    job.description,
    ...job.tags,
  ].join(' ').toLowerCase()

  if (DEAL_BREAKERS.some(word => searchText.includes(word))) return false
  return RELEVANT_TAGS.some(tag => searchText.includes(tag))
}

// Convert a tech stack string like "React, Node.js, AWS" into tag array
function extractTags(techStackStr) {
  if (!techStackStr) return []
  return techStackStr
    .split(/[,\/\|]/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0 && s !== 'n/a' && s !== 'various')
}

// Make a URL-safe slug from a company name for use in IDs
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

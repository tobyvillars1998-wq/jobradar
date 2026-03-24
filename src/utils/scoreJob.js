// src/utils/scoreJob.js
//
// Sends a single job to Claude Haiku and returns a score + reasoning.
// Called by the /api/score route — not used directly.

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function scoreJob(job, profile) {
  const prompt = buildPrompt(job, profile)

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  return parseResponse(message.content[0].text)
}

function buildPrompt(job, profile) {
  const salaryLine = job.salary
    ? `Salary: $${job.salary.min ?? '?'} – $${job.salary.max ?? '?'} ${job.salary.currency ?? ''}`
    : 'Salary: not listed'

  const tagsLine = job.tags.length > 0 ? job.tags.join(', ') : 'none'

  // Truncate description to keep tokens low
  const description = (job.description ?? '').slice(0, 800)

  const locationLine = Array.isArray(profile.location)
    ? profile.location.join(', ')
    : profile.location || 'Remote'

  return `You are a job-fit evaluator. Score how well this job matches the candidate profile below.

## Candidate Profile
- Target roles: ${profile.targetRoles.join(', ')}
- Skills: ${profile.skills.join(', ')}
- Minimum salary: $${profile.minSalary ?? 0} USD
- Location preference: ${locationLine}

## Job Listing
- Title: ${job.title}
- Company: ${job.company}
- Tags: ${tagsLine}
- ${salaryLine}
- Description: ${description}

## Instructions
Return ONLY a JSON object with no extra text, markdown, or explanation:
{
  "score": <integer 0–100>,
  "reasoning": "<1–2 sentence explanation>",
  "matchingSkills": [<skills from candidate profile that appear in this job>],
  "missingSkills": [<skills the job requires that the candidate lacks>]
}`
}

function parseResponse(text) {
  // Strip any accidental markdown fences before parsing
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  const parsed = JSON.parse(cleaned)

  return {
    score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 0,
    reasoning: parsed.reasoning ?? '',
    matchingSkills: Array.isArray(parsed.matchingSkills) ? parsed.matchingSkills : [],
    missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
  }
}

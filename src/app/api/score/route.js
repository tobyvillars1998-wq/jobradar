// src/app/api/score/route.js  →  GET /api/score
//
// Fetches all jobs, pre-filters them, scores each one with Claude Haiku,
// caches results to data/scores.json, and returns jobs sorted by score.

import { promises as fs } from 'fs'
import path from 'path'
import { fetchRemoteOK } from '@/api/fetchRemoteOK'
import { fetchArbeitnow } from '@/api/fetchArbeitnow'
import { fetchJobicy } from '@/api/fetchJobicy'
import { fetchHimalayas } from '@/api/fetchHimalayas'
import { scoreJob } from '@/utils/scoreJob'
import candidateProfile from '@/utils/candidateProfile'

const CACHE_PATH = path.join(process.cwd(), 'data', 'scores.json')
const BATCH_SIZE = 5

export async function GET() {
  // ── 1. Fetch all jobs ──────────────────────────────────────────────────────
  const results = await Promise.allSettled([
    fetchRemoteOK(),
    fetchArbeitnow(),
    fetchJobicy(),
    fetchHimalayas(),
  ])

  const allJobs = []
  for (const result of results) {
    if (result.status === 'fulfilled') allJobs.push(...result.value)
  }

  // Deduplicate by apply URL
  const seen = new Set()
  const jobs = allJobs.filter(job => {
    if (!job.applyUrl || seen.has(job.applyUrl)) return false
    seen.add(job.applyUrl)
    return true
  })

  // ── 2. Pre-filter — keyword pass before touching Claude ────────────────────
  const candidates = preFilter(jobs)

  // ── 3. Load cache ──────────────────────────────────────────────────────────
  const cache = await loadCache()

  // ── 4. Score only uncached jobs ────────────────────────────────────────────
  const uncached = candidates.filter(job => !cache[job.id])

  if (uncached.length > 0) {
    const scored = await scoreInBatches(uncached)
    for (const { id, result } of scored) {
      cache[id] = result
    }
    await saveCache(cache)
  }

  // ── 5. Merge scores onto job objects ───────────────────────────────────────
  const scoredJobs = candidates.map(job => {
    const result = cache[job.id]
    if (!result) return job
    return { ...job, ...result }
  })

  // ── 6. Sort by score descending ────────────────────────────────────────────
  scoredJobs.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  return Response.json({
    count: scoredJobs.length,
    newlyScoredCount: uncached.length,
    jobs: scoredJobs,
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function preFilter(jobs) {
  const dealBreakers = candidateProfile.dealBreakers.map(d => d.toLowerCase())
  const targetKeywords = [
    ...candidateProfile.targetRoles,
    ...candidateProfile.skills,
  ].map(k => k.toLowerCase())

  return jobs.filter(job => {
    const text = [job.title, job.description, ...job.tags].join(' ').toLowerCase()

    if (dealBreakers.some(d => text.includes(d))) return false
    return targetKeywords.some(k => text.includes(k))
  })
}

async function scoreInBatches(jobs) {
  const results = []

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE)

    const batchResults = await Promise.allSettled(
      batch.map(job => scoreJob(job).then(result => ({ id: job.id, result })))
    )

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value)
      } else {
        console.error('Scoring failed for a job:', r.reason?.message)
      }
    }
  }

  return results
}

async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function saveCache(cache) {
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8')
}

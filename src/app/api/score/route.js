// src/app/api/score/route.js  →  GET /api/score
//
// Fetches all jobs, pre-filters them, scores each one with Claude Haiku,
// caches results to Supabase scores table, and returns jobs sorted by score.

import { getServerSession } from 'next-auth'
import { fetchRemoteOK } from '@/api/fetchRemoteOK'
import { fetchArbeitnow } from '@/api/fetchArbeitnow'
import { fetchJobicy } from '@/api/fetchJobicy'
import { fetchHimalayas } from '@/api/fetchHimalayas'
import { fetchGitHub } from '@/api/fetchGitHub'
import { scoreJob } from '@/utils/scoreJob'
import { getServiceClient } from '@/lib/supabase'

const BATCH_SIZE = 5

export async function GET() {
  // ── 0. Load user profile ───────────────────────────────────────────────────
  const profileData = await getUserProfile()
  if (!profileData) {
    return Response.json(
      { error: 'Your profile is incomplete. Please add your skills and target roles in the Profile page before searching for jobs.' },
      { status: 400 }
    )
  }
  const { userId, profile } = profileData

  // ── 1. Fetch all jobs ──────────────────────────────────────────────────────
  const results = await Promise.allSettled([
    fetchRemoteOK(),
    fetchArbeitnow(),
    fetchJobicy(),
    fetchHimalayas(),
    fetchGitHub(),
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
  const candidates = preFilter(jobs, profile)

  // ── 3. Load cache from Supabase ────────────────────────────────────────────
  const cache = await loadCache(userId)

  // ── 4. Score only uncached jobs ────────────────────────────────────────────
  const uncached = candidates.filter(job => !cache[job.id])

  if (uncached.length > 0) {
    const scored = await scoreInBatches(uncached, profile)
    await saveCache(scored, userId)
    for (const { id, result } of scored) {
      cache[id] = result
    }
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

function preFilter(jobs, profile) {
  const dealBreakers = profile.dealBreakers.map(d => d.toLowerCase())
  const targetKeywords = [
    ...profile.targetRoles,
    ...profile.skills,
  ].map(k => k.toLowerCase())

  return jobs.filter(job => {
    const text = [job.title, job.description, ...job.tags].join(' ').toLowerCase()
    if (dealBreakers.some(d => text.includes(d))) return false
    return targetKeywords.some(k => text.includes(k))
  })
}

async function scoreInBatches(jobs, profile) {
  const results = []

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE)

    const batchResults = await Promise.allSettled(
      batch.map(job => scoreJob(job, profile).then(result => ({ id: job.id, result })))
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

async function loadCache(userId) {
  const { data } = await getServiceClient()
    .from('scores')
    .select('job_id, score, reasoning, matching_skills, missing_skills')
    .eq('user_id', userId)

  const cache = {}
  for (const row of data ?? []) {
    cache[row.job_id] = {
      score: row.score,
      reasoning: row.reasoning,
      matchingSkills: row.matching_skills ?? [],
      missingSkills: row.missing_skills ?? [],
    }
  }
  return cache
}

async function saveCache(scored, userId) {
  if (!scored.length) return
  const rows = scored.map(({ id, result }) => ({
    user_id: userId,
    job_id: id,
    score: result.score,
    reasoning: result.reasoning,
    matching_skills: result.matchingSkills ?? [],
    missing_skills: result.missingSkills ?? [],
    scored_at: new Date().toISOString(),
  }))
  const { error } = await getServiceClient()
    .from('scores')
    .upsert(rows, { onConflict: 'user_id,job_id' })
  if (error) console.error('saveCache error:', error.message, error.details, error.hint)
}

// Fetch the logged-in user's profile from Supabase.
// Returns { userId, profile } or null if unavailable/incomplete.
async function getUserProfile() {
  const session = await getServerSession()
  if (!session?.user?.email) return null

  const supabase = getServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()

  if (!user) return null

  const { data: profiles } = await supabase
    .from('profiles')
    .select('target_roles, skills, deal_breakers, min_salary, location')
    .eq('id', user.id)
    .limit(1)

  const p = profiles?.[0]
  if (!p || (!p.target_roles?.length && !p.skills?.length)) return null

  return {
    userId: user.id,
    profile: {
      targetRoles: p.target_roles || [],
      skills: p.skills || [],
      dealBreakers: p.deal_breakers || [],
      minSalary: p.min_salary || 0,
      location: p.location || ['Remote'],
    },
  }
}

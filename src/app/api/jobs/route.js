// src/app/api/jobs/route.js  →  GET /api/jobs
//
// The aggregator. Calls all four sources in parallel, merges the results,
// and removes duplicate jobs that appear on more than one board.

import { getServerSession } from 'next-auth'
import { fetchRemoteOK } from '@/api/fetchRemoteOK'
import { fetchArbeitnow } from '@/api/fetchArbeitnow'
import { fetchJobicy } from '@/api/fetchJobicy'
import { fetchHimalayas } from '@/api/fetchHimalayas'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  // Run all four fetchers at the same time instead of one after another.
  // Promise.allSettled waits for all of them to finish regardless of whether
  // any individual one fails — so one broken API won't wipe out the others.
  const results = await Promise.allSettled([
    fetchRemoteOK(),
    fetchArbeitnow(),
    fetchJobicy(),
    fetchHimalayas(),
  ])

  // Each result is either { status: 'fulfilled', value: [...jobs] }
  //                     or { status: 'rejected', reason: Error }
  // We log failures but keep going with whatever succeeded.
  const allJobs = []
  const errors = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value)
    } else {
      errors.push(result.reason?.message ?? 'Unknown error')
      console.error('A job source failed:', result.reason?.message)
    }
  }

  // Deduplicate by apply URL — if the same job appears on two boards,
  // the first one encountered wins and the duplicate is dropped.
  const seen = new Set()
  const dedupedJobs = allJobs.filter(job => {
    if (!job.applyUrl || seen.has(job.applyUrl)) return false
    seen.add(job.applyUrl)
    return true
  })

  return Response.json({
    count: dedupedJobs.length,
    sources: {
      remoteok: results[0].status === 'fulfilled' ? results[0].value.length : 'failed',
      arbeitnow: results[1].status === 'fulfilled' ? results[1].value.length : 'failed',
      jobicy: results[2].status === 'fulfilled' ? results[2].value.length : 'failed',
      himalayas: results[3].status === 'fulfilled' ? results[3].value.length : 'failed',
    },
    errors: errors.length > 0 ? errors : undefined,
    jobs: dedupedJobs,
  })
}

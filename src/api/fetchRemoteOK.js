// src/api/fetchRemoteOK.js
//
// The actual fetch + filter + normalize logic for RemoteOK.
// Exported as a plain async function so it can be used by:
//   - The individual route:  src/app/api/jobs/remoteok/route.js
//   - The aggregator:        src/app/api/jobs/route.js

import axios from 'axios'
import { RELEVANT_TAGS, DEAL_BREAKERS } from '@/utils/filters'

export async function fetchRemoteOK() {
  const response = await axios.get('https://remoteok.com/api', {
    headers: { 'User-Agent': 'JobRadar/1.0 (personal job search tool)' },
  })

  const rawJobs = response.data.slice(1) // skip the legal notice at index 0

  return rawJobs
    .filter(job => isRelevant(job))
    .map(job => normalize(job))
}

function isRelevant(job) {
  const searchText = [
    job.position ?? '',
    job.description ?? '',
    ...(job.tags ?? []),
  ].join(' ').toLowerCase()

  if (DEAL_BREAKERS.some(word => searchText.includes(word))) return false
  return RELEVANT_TAGS.some(tag => searchText.includes(tag))
}

function normalize(job) {
  return {
    id: `remoteok-${job.id}`,
    source: 'remoteok',
    title: job.position ?? 'Unknown Title',
    company: job.company ?? 'Unknown Company',
    description: job.description ?? '',
    tags: job.tags ?? [],
    salary: job.salary_min || job.salary_max
      ? { min: job.salary_min ?? null, max: job.salary_max ?? null, currency: 'USD' }
      : null,
    location: 'Remote',
    applyUrl: job.url ?? `https://remoteok.com/remote-jobs/${job.id}`,
    postedAt: job.date ? new Date(job.date).toISOString() : null,
    score: null,
    reasoning: null,
    matchingSkills: [],
    missingSkills: [],
    status: 'new',
  }
}

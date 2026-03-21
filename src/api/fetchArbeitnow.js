// src/api/fetchArbeitnow.js

import axios from 'axios'
import { RELEVANT_TAGS, DEAL_BREAKERS } from '@/utils/filters'

export async function fetchArbeitnow() {
  const response = await axios.get('https://www.arbeitnow.com/api/job-board-api')
  const rawJobs = response.data.data

  return rawJobs
    .filter(job => job.remote === true)
    .filter(job => isRelevant(job))
    .map(job => normalize(job))
}

function isRelevant(job) {
  const searchText = [
    job.title ?? '',
    job.description ?? '',
    ...(job.tags ?? []),
  ].join(' ').toLowerCase()

  if (DEAL_BREAKERS.some(word => searchText.includes(word))) return false
  return RELEVANT_TAGS.some(tag => searchText.includes(tag))
}

function normalize(job) {
  return {
    id: `arbeitnow-${job.slug}`,
    source: 'arbeitnow',
    title: job.title ?? 'Unknown Title',
    company: job.company_name ?? 'Unknown Company',
    description: job.description ?? '',
    tags: job.tags ?? [],
    salary: null,
    location: 'Remote',
    applyUrl: job.url ?? '',
    postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : null,
    score: null,
    reasoning: null,
    matchingSkills: [],
    missingSkills: [],
    status: 'new',
  }
}

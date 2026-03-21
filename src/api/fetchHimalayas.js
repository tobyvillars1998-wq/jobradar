// src/api/fetchHimalayas.js

import axios from 'axios'
import { RELEVANT_TAGS, DEAL_BREAKERS } from '@/utils/filters'

export async function fetchHimalayas() {
  const response = await axios.get('https://himalayas.app/jobs/api')
  const rawJobs = response.data.jobs

  return rawJobs
    .filter(job => isRelevant(job))
    .map(job => normalize(job))
}

function isRelevant(job) {
  const seniority = (job.seniority ?? []).join(' ').toLowerCase()
  if (DEAL_BREAKERS.some(word => seniority.includes(word))) return false

  const searchText = [
    job.title ?? '',
    job.description ?? '',
    job.excerpt ?? '',
    ...(job.categories ?? []),
  ].join(' ').toLowerCase()

  if (DEAL_BREAKERS.some(word => searchText.includes(word))) return false
  return RELEVANT_TAGS.some(tag => searchText.includes(tag))
}

function normalize(job) {
  return {
    id: `himalayas-${job.guid?.split('/').pop() ?? Math.random()}`,
    source: 'himalayas',
    title: job.title ?? 'Unknown Title',
    company: job.companyName ?? 'Unknown Company',
    description: job.description ?? job.excerpt ?? '',
    tags: job.categories ?? [],
    salary: job.minSalary || job.maxSalary
      ? { min: job.minSalary ?? null, max: job.maxSalary ?? null, currency: job.currency ?? 'USD' }
      : null,
    location: 'Remote',
    applyUrl: job.applicationLink ?? '',
    postedAt: job.pubDate ? new Date(job.pubDate * 1000).toISOString() : null,
    score: null,
    reasoning: null,
    matchingSkills: [],
    missingSkills: [],
    status: 'new',
  }
}

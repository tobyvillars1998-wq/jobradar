// src/api/fetchJobicy.js

import axios from 'axios'
import { RELEVANT_TAGS, DEAL_BREAKERS } from '@/utils/filters'

export async function fetchJobicy() {
  const response = await axios.get('https://jobicy.com/api/v2/remote-jobs')
  const rawJobs = response.data.jobs

  return rawJobs
    .filter(job => isRelevant(job))
    .map(job => normalize(job))
}

function isRelevant(job) {
  const level = (job.jobLevel ?? '').toLowerCase()
  if (DEAL_BREAKERS.some(word => level.includes(word))) return false

  const searchText = [
    job.jobTitle ?? '',
    job.jobDescription ?? '',
    job.jobExcerpt ?? '',
    ...(job.jobIndustry ?? []),
  ].join(' ').toLowerCase()

  if (DEAL_BREAKERS.some(word => searchText.includes(word))) return false
  return RELEVANT_TAGS.some(tag => searchText.includes(tag))
}

function normalize(job) {
  return {
    id: `jobicy-${job.id}`,
    source: 'jobicy',
    title: job.jobTitle ?? 'Unknown Title',
    company: job.companyName ?? 'Unknown Company',
    description: job.jobDescription ?? job.jobExcerpt ?? '',
    tags: job.jobIndustry ?? [],
    salary: null,
    location: 'Remote',
    applyUrl: job.url ?? '',
    postedAt: job.pubDate ?? null,
    score: null,
    reasoning: null,
    matchingSkills: [],
    missingSkills: [],
    status: 'new',
  }
}

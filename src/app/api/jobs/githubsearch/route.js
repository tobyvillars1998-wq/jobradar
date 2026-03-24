// src/app/api/jobs/githubsearch/route.js  →  GET /api/jobs/githubsearch
//
// To plug this source into the main aggregator and UI, see the comment at the
// top of src/api/fetchGitHubSearch.js for the three steps required.

import { getServerSession } from 'next-auth'
import { fetchGitHubSearch } from '@/api/fetchGitHubSearch'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const jobs = await fetchGitHubSearch()
    return Response.json({ source: 'githubsearch', count: jobs.length, jobs })
  } catch (error) {
    console.error('GitHub search fetch failed:', error.message)
    return Response.json({ error: 'Failed to fetch from GitHub search' }, { status: 500 })
  }
}

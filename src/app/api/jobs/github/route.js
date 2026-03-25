// src/app/api/jobs/github/route.js  →  GET /api/jobs/github
import { getServerSession } from 'next-auth'
import { fetchGitHub } from '@/api/fetchGitHub'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const jobs = await fetchGitHub()
    return Response.json({ source: 'github', count: jobs.length, jobs })
  } catch (error) {
    console.error('GitHub fetch failed:', error.message)
    return Response.json({ error: 'Failed to fetch from GitHub' }, { status: 500 })
  }
}

// src/app/api/jobs/jobicy/route.js  →  GET /api/jobs/jobicy
import { getServerSession } from 'next-auth'
import { fetchJobicy } from '@/api/fetchJobicy'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const jobs = await fetchJobicy()
    return Response.json({ source: 'jobicy', count: jobs.length, jobs })
  } catch (error) {
    console.error('Jobicy fetch failed:', error.message)
    return Response.json({ error: 'Failed to fetch from Jobicy' }, { status: 500 })
  }
}

// src/app/api/jobs/jobicy/route.js  →  GET /api/jobs/jobicy
import { fetchJobicy } from '@/api/fetchJobicy'

export async function GET() {
  try {
    const jobs = await fetchJobicy()
    return Response.json({ source: 'jobicy', count: jobs.length, jobs })
  } catch (error) {
    console.error('Jobicy fetch failed:', error.message)
    return Response.json({ error: 'Failed to fetch from Jobicy' }, { status: 500 })
  }
}

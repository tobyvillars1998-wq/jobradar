// src/app/api/jobs/arbeitnow/route.js  →  GET /api/jobs/arbeitnow
import { getServerSession } from 'next-auth'
import { fetchArbeitnow } from '@/api/fetchArbeitnow'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const jobs = await fetchArbeitnow()
    return Response.json({ source: 'arbeitnow', count: jobs.length, jobs })
  } catch (error) {
    console.error('Arbeitnow fetch failed:', error.message)
    return Response.json({ error: 'Failed to fetch from Arbeitnow' }, { status: 500 })
  }
}

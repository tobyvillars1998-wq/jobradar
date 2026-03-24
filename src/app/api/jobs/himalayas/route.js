// src/app/api/jobs/himalayas/route.js  →  GET /api/jobs/himalayas
import { getServerSession } from 'next-auth'
import { fetchHimalayas } from '@/api/fetchHimalayas'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const jobs = await fetchHimalayas()
    return Response.json({ source: 'himalayas', count: jobs.length, jobs })
  } catch (error) {
    console.error('Himalayas fetch failed:', error.message)
    return Response.json({ error: 'Failed to fetch from Himalayas' }, { status: 500 })
  }
}

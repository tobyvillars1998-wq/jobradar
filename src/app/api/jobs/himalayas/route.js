// src/app/api/jobs/himalayas/route.js  →  GET /api/jobs/himalayas
import { fetchHimalayas } from '@/api/fetchHimalayas'

export async function GET() {
  try {
    const jobs = await fetchHimalayas()
    return Response.json({ source: 'himalayas', count: jobs.length, jobs })
  } catch (error) {
    console.error('Himalayas fetch failed:', error.message)
    return Response.json({ error: 'Failed to fetch from Himalayas' }, { status: 500 })
  }
}

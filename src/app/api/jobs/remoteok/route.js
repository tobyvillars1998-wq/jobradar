// src/app/api/jobs/remoteok/route.js  →  GET /api/jobs/remoteok
import { getServerSession } from 'next-auth'
import { fetchRemoteOK } from '@/api/fetchRemoteOK'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const jobs = await fetchRemoteOK()
    return Response.json({ source: 'remoteok', count: jobs.length, jobs })
  } catch (error) {
    console.error('RemoteOK fetch failed:', error.message)
    return Response.json({ error: 'Failed to fetch from RemoteOK' }, { status: 500 })
  }
}

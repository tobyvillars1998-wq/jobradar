// src/app/api/status/route.js
// GET /api/status  — returns all saved statuses for the logged-in user
// POST /api/status — body: { id, status } — updates one job's status

import { getServerSession } from 'next-auth'
import { getServiceClient } from '@/lib/supabase'

const VALID_STATUSES = ['new', 'saved', 'applied', 'skipped']

async function getUserId(email) {
  const { data } = await getServiceClient()
    .from('users')
    .select('id')
    .eq('email', email)
    .single()
  return data?.id ?? null
}

async function getStatusMap(userId) {
  const { data } = await getServiceClient()
    .from('statuses')
    .select('job_id, status')
    .eq('user_id', userId)
  const map = {}
  for (const row of data ?? []) map[row.job_id] = row.status
  return map
}

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = await getUserId(session.user.email)
  if (!userId) return Response.json({ error: 'User not found' }, { status: 404 })

  return Response.json(await getStatusMap(userId))
}

export async function POST(request) {
  const session = await getServerSession()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await request.json()
  if (!id || !status) return Response.json({ error: 'id and status are required' }, { status: 400 })
  if (!VALID_STATUSES.includes(status)) return Response.json({ error: 'Invalid status value' }, { status: 400 })

  const userId = await getUserId(session.user.email)
  if (!userId) return Response.json({ error: 'User not found' }, { status: 404 })

  const supabase = getServiceClient()
  if (status === 'new') {
    const { error } = await supabase.from('statuses').delete().eq('user_id', userId).eq('job_id', id)
    if (error) console.error('status delete error:', error.message, error.details, error.hint)
  } else {
    const { error } = await supabase.from('statuses').upsert({ user_id: userId, job_id: id, status }, { onConflict: 'user_id,job_id' })
    if (error) console.error('status upsert error:', error.message, error.details, error.hint)
  }

  return Response.json(await getStatusMap(userId))
}

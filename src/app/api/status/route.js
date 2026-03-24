// src/app/api/status/route.js
// GET /api/status  — returns all saved statuses
// POST /api/status — body: { id, status } — updates one job's status

import { getServerSession } from 'next-auth'
import { promises as fs } from 'fs'
import path from 'path'

const STATUS_PATH = path.join(process.cwd(), 'data', 'statuses.json')

async function load() {
  try {
    return JSON.parse(await fs.readFile(STATUS_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

async function save(data) {
  await fs.writeFile(STATUS_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json(await load())
}

export async function POST(request) {
  const session = await getServerSession()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await request.json()
  if (!id || !status) {
    return Response.json({ error: 'id and status are required' }, { status: 400 })
  }

  const VALID_STATUSES = ['new', 'saved', 'applied', 'skipped']
  if (!VALID_STATUSES.includes(status)) {
    return Response.json({ error: 'Invalid status value' }, { status: 400 })
  }

  const statuses = await load()

  if (status === 'new') {
    delete statuses[id]
  } else {
    statuses[id] = status
  }

  await save(statuses)
  return Response.json(statuses)
}

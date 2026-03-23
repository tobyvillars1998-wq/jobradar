// src/app/api/status/route.js
// GET /api/status  — returns all saved statuses
// POST /api/status — body: { id, status } — updates one job's status

import path from 'path'
import { readJson, writeJson } from '@/utils/storage'

const STATUS_PATH = path.join(process.cwd(), 'data', 'statuses.json')

async function load() {
  return readJson('jobradar:statuses', STATUS_PATH)
}

async function save(data) {
  await writeJson('jobradar:statuses', STATUS_PATH, data)
}

export async function GET() {
  return Response.json(await load())
}

export async function POST(request) {
  const { id, status } = await request.json()
  if (!id || !status) {
    return Response.json({ error: 'id and status are required' }, { status: 400 })
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

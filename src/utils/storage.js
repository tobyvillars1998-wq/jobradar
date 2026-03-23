// src/utils/storage.js
//
// Storage abstraction: uses Upstash Redis when env vars are present (remote/Vercel),
// falls back to local JSON files otherwise (local dev).
//
// To enable cloud storage, set in your environment:
//   UPSTASH_REDIS_REST_URL=https://...
//   UPSTASH_REDIS_REST_TOKEN=...

import { promises as fs } from 'fs'
import path from 'path'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
const useRedis = !!(redisUrl && redisToken)

async function redisCommand(...args) {
  const res = await fetch(redisUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })
  if (!res.ok) throw new Error(`Upstash error: ${res.status} ${await res.text()}`)
  const { result } = await res.json()
  return result
}

/**
 * Read a JSON object from storage.
 * @param {string} key   - Redis key (used in cloud mode)
 * @param {string} filePath - Absolute path to local JSON file (used in local mode)
 * @returns {Promise<object>} Parsed object, or {} if not found
 */
export async function readJson(key, filePath) {
  if (useRedis) {
    const raw = await redisCommand('GET', key)
    return raw ? JSON.parse(raw) : {}
  }
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf-8'))
  } catch {
    return {}
  }
}

/**
 * Write a JSON object to storage.
 * @param {string} key   - Redis key (used in cloud mode)
 * @param {string} filePath - Absolute path to local JSON file (used in local mode)
 * @param {object} data  - Data to persist
 */
export async function writeJson(key, filePath, data) {
  if (useRedis) {
    await redisCommand('SET', key, JSON.stringify(data))
    return
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

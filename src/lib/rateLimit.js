// Simple in-memory rate limiter.
// Works well for a single-server or dev setup.
// On serverless (Vercel) each function instance has its own store —
// acceptable for a personal app; swap for Redis/Upstash for multi-instance production.

const store = new Map()

/**
 * Check and increment a rate limit counter.
 * @param {string} key       - Unique key (e.g. 'reset:user@example.com')
 * @param {number} max       - Max attempts allowed in the window
 * @param {number} windowMs  - Window duration in milliseconds
 * @returns {{ limited: boolean, remaining: number }}
 */
export function rateLimit(key, max, windowMs) {
  const now = Date.now()
  let entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs }
  }

  entry.count++
  store.set(key, entry)

  return {
    limited: entry.count > max,
    remaining: Math.max(0, max - entry.count),
  }
}

/** Clear a rate limit counter (e.g. after a successful action). */
export function clearRateLimit(key) {
  store.delete(key)
}

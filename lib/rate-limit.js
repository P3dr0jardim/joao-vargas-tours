/**
 * In-memory sliding-window rate limiter.
 *
 * LIMITATION: state lives in the memory of one server instance. On serverless hosting every
 * instance counts on its own and counters reset on cold start, so this only slows down casual
 * abuse. It is a stop-gap: replace it with a shared store (Upstash Redis) once Pedro approves
 * the dependency. Keep the `consumeRateLimit` signature so the swap is local to this file.
 */
const hits = new Map() // key -> ascending array of timestamps (ms)
const MAX_KEYS = 10000

function prune(timestamps, windowMs, now) {
  const cutoff = now - windowMs
  let i = 0
  while (i < timestamps.length && timestamps[i] <= cutoff) i++
  if (i > 0) timestamps.splice(0, i)
}

/**
 * Check every rule and, only if all pass, record one hit for each.
 * rules: [{ key, limit, windowMs }]
 * Returns { allowed: true } or { allowed: false, retryAfterSec }.
 */
export function consumeRateLimit(rules, now = Date.now()) {
  let retryAfterMs = 0
  for (const { key, limit, windowMs } of rules) {
    const list = hits.get(key) ?? []
    prune(list, windowMs, now)
    if (list.length >= limit) {
      // Allowed again when the oldest hit in the window expires.
      retryAfterMs = Math.max(retryAfterMs, list[0] + windowMs - now)
    }
  }
  if (retryAfterMs > 0) return { allowed: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) }

  if (hits.size > MAX_KEYS) sweep(now)
  for (const { key } of rules) {
    const list = hits.get(key) ?? []
    list.push(now)
    hits.set(key, list)
  }
  return { allowed: true }
}

function sweep(now) {
  for (const [key, list] of hits) {
    if (list.length === 0 || list[list.length - 1] <= now - 24 * 3600 * 1000) hits.delete(key)
  }
}

/** For tests. */
export function resetRateLimits() {
  hits.clear()
}

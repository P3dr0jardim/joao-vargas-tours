/**
 * In-memory sliding-window rate limiter.
 *
 * LIMITATION: state lives in the memory of one server instance. On serverless hosting every
 * instance counts on its own and counters reset on cold start, so this only slows down casual
 * abuse. It is a stop-gap: replace it with a shared store (Upstash Redis) once Pedro approves
 * the dependency. Keep the `consumeRateLimit` signature so the swap is local to this file.
 *
 * Memory is bounded: the map never holds more than MAX_KEYS keys. Keys are kept in
 * least-recently-used order (a Map iterates in insertion order and a touched key is re-inserted
 * at the end), so the oldest key is always the first one and eviction is O(1), with no scan.
 * Each key holds at most `limit` timestamps because a hit is only recorded when it is allowed.
 */
const hits = new Map() // key -> ascending array of timestamps (ms)
export const MAX_KEYS = 10000

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
    const list = hits.get(key)
    if (!list) continue
    prune(list, windowMs, now)
    if (list.length >= limit) {
      // Allowed again when the oldest hit in the window expires.
      retryAfterMs = Math.max(retryAfterMs, list[0] + windowMs - now)
    }
  }
  if (retryAfterMs > 0) return { allowed: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) }

  for (const { key } of rules) {
    const list = hits.get(key) ?? []
    list.push(now)
    hits.delete(key) // re-insert at the end: most recently used
    hits.set(key, list)
  }
  while (hits.size > MAX_KEYS) hits.delete(hits.keys().next().value) // evict the oldest
  return { allowed: true }
}

/**
 * Give back the hit recorded at `now` for each rule (used when a request ends up not being served,
 * so the customer is not locked out for nothing). Does nothing for hits that are not found.
 */
export function releaseRateLimit(rules, now) {
  for (const { key } of rules) {
    const list = hits.get(key)
    if (!list) continue
    const i = list.lastIndexOf(now)
    if (i !== -1) list.splice(i, 1)
    if (list.length === 0) hits.delete(key)
  }
}

/** For tests: number of keys currently held. */
export function rateLimitKeyCount() {
  return hits.size
}

/** For tests. */
export function resetRateLimits() {
  hits.clear()
}

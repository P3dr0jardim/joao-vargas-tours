/** Default timeout for outbound provider calls (Resend, WhatsApp). */
export const PROVIDER_TIMEOUT_MS = 8000

/** fetch() that aborts after `ms`. Never log the request body: it holds personal data. */
export function fetchWithTimeout(url, init = {}, ms = PROVIDER_TIMEOUT_MS) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(ms) })
}

/** Reject if `promise` does not settle within `ms`. */
export function withTimeout(promise, ms, label = 'operation') {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}_timeout`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/** Short, personal-data-free error code for a failed provider call. */
export function errorCode(err) {
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return 'timeout'
  return 'network'
}

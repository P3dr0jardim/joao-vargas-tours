import { siteConfig } from '@/config/site'

const isProd = () => process.env.NODE_ENV === 'production'

/**
 * Client IP for rate limiting. Platform headers come first because the platform overwrites them,
 * so a client cannot choose them on Vercel: x-vercel-forwarded-for, then x-real-ip, then the first
 * entry of x-forwarded-for. Outside such a platform (own server without a trusted proxy) all of
 * them are client-controlled and the limiter can be dodged: put a proxy that sets them in front.
 */
export function clientIp(headers) {
  const first = (name) => headers.get(name)?.split(',')[0]?.trim()
  const ip = first('x-vercel-forwarded-for') || first('x-real-ip') || first('x-forwarded-for')
  return ip ? ip.slice(0, 64) : 'unknown'
}

function isLocalHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

/** Origin of a URL string, or null. */
function originOf(value) {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

/** The www and apex variants of an origin (https://a.pt <-> https://www.a.pt). */
function wwwVariants(origin) {
  const url = new URL(origin)
  const host = url.hostname
  if (isLocalHost(host) || /^[\d.]+$/.test(host) || host.includes(':') || !host.includes('.')) {
    return [origin]
  }
  const other = host.startsWith('www.') ? host.slice(4) : `www.${host}`
  return [origin, `${url.protocol}//${other}${url.port ? `:${url.port}` : ''}`]
}

/** Allowed origins: the site URL (www and apex), plus ALLOWED_ORIGINS (comma separated). */
function allowedOrigins() {
  const set = new Set()
  const site = originOf(siteConfig.url)
  if (site) for (const o of wwwVariants(site)) set.add(o)
  for (const entry of (process.env.ALLOWED_ORIGINS || '').split(',')) {
    const o = originOf(entry.trim())
    if (o) set.add(o)
  }
  return set
}

/** True when the request comes from the site's own origin (localhost is accepted outside prod). */
export function originAllowed(headers) {
  const origin = headers.get('origin')
  if (!origin) return false
  if (allowedOrigins().has(origin)) return true
  if (isProd()) return false
  try {
    return isLocalHost(new URL(origin).hostname)
  } catch {
    return false
  }
}

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { connectDb, isDbConfigured } from '@/lib/mongoose'
import AdminUser from '@/models/AdminUser'

/**
 * Admin sessions: a stateless cookie `<payload>.<signature>`, signed with HMAC-SHA256 and
 * ADMIN_SESSION_SECRET. Every check also loads the user, so deleting the account or bumping
 * `sessionVersion` (password change) ends its sessions at once.
 */
export const SESSION_COOKIE = 'jv_admin'
export const SESSION_TTL_SECONDS = 12 * 60 * 60

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET || ''
  return s.length >= 32 ? s : null
}

/** True when the admin panel can work: a database and a strong session secret. */
export function isAdminConfigured() {
  return isDbConfigured() && Boolean(secret())
}

const sign = (payload, key) => createHmac('sha256', key).update(payload).digest('base64url')

export function createSessionToken(user, now = Date.now()) {
  const key = secret()
  if (!key) throw new Error('ADMIN_SESSION_SECRET is missing or shorter than 32 characters')
  const payload = Buffer.from(
    JSON.stringify({
      sub: String(user._id),
      ver: user.sessionVersion ?? 1,
      exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
    })
  ).toString('base64url')
  return `${payload}.${sign(payload, key)}`
}

/** Payload of a valid, unexpired token, or null. */
export function readSessionToken(token, now = Date.now()) {
  const key = secret()
  if (!key || typeof token !== 'string') return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = Buffer.from(sign(payload, key))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof data.sub !== 'string' || !Number.isFinite(data.exp)) return null
    return data.exp * 1000 > now ? data : null
  } catch {
    return null
  }
}

export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  }
}

/** The signed-in admin ({ id, email, name }) for the current request, or null. */
export async function getAdmin() {
  if (!isAdminConfigured()) return null
  const store = await cookies()
  const data = readSessionToken(store.get(SESSION_COOKIE)?.value)
  if (!data || !/^[a-f0-9]{24}$/.test(data.sub)) return null
  await connectDb()
  const user = await AdminUser.findById(data.sub).lean()
  if (!user || (user.sessionVersion ?? 1) !== data.ver) return null
  return { id: String(user._id), email: user.email, name: user.name || user.email }
}

/** For admin pages: the signed-in admin, or a redirect to the login page. */
export async function requireAdminPage() {
  const admin = await getAdmin()
  if (!admin) redirect('/admin/login')
  return admin
}

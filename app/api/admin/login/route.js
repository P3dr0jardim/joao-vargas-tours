import { json, readJson } from '@/lib/admin/api'
import { dummyHash, verifyPassword } from '@/lib/admin/password'
import {
  SESSION_COOKIE,
  createSessionToken,
  isAdminConfigured,
  sessionCookieOptions,
} from '@/lib/admin/session'
import { clientIp, originAllowed } from '@/lib/origin'
import { connectDb } from '@/lib/mongoose'
import { consumeRateLimit } from '@/lib/rate-limit'
import AdminUser from '@/models/AdminUser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MINUTE = 60 * 1000

export async function POST(request) {
  if (!isAdminConfigured()) return json(503, { ok: false, code: 'ADMIN_NOT_CONFIGURED' })
  if (!originAllowed(request.headers)) return json(403, { ok: false, code: 'FORBIDDEN_ORIGIN' })

  const body = await readJson(request, 4 * 1024)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password || password.length > 200) {
    return json(400, { ok: false, code: 'INVALID_CREDENTIALS' })
  }

  // Slow down password guessing per IP and per account.
  const limit = consumeRateLimit([
    { key: `admin-ip:${clientIp(request.headers)}`, limit: 10, windowMs: 15 * MINUTE },
    { key: `admin-email:${email}`, limit: 10, windowMs: 60 * MINUTE },
  ])
  if (!limit.allowed) {
    return json(
      429,
      { ok: false, code: 'RATE_LIMITED' },
      { 'Retry-After': String(limit.retryAfterSec) }
    )
  }

  await connectDb()
  const user = await AdminUser.findOne({ email })
  // Always run one scrypt so a wrong email and a wrong password take the same time.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()))
  if (!user || !ok) return json(401, { ok: false, code: 'INVALID_CREDENTIALS' })

  user.lastLoginAt = new Date()
  await user.save()

  const response = json(200, { ok: true })
  response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions())
  return response
}

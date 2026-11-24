import { json } from '@/lib/admin/api'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/admin/session'
import { originAllowed } from '@/lib/origin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  if (!originAllowed(request.headers)) return json(403, { ok: false, code: 'FORBIDDEN_ORIGIN' })
  const response = json(200, { ok: true })
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
  return response
}

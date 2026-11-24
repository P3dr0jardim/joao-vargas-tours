import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { originAllowed } from '@/lib/origin'
import { getAdmin, isAdminConfigured } from '@/lib/admin/session'

export function json(status, body, headers = {}) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

/**
 * Guard for admin API routes. Writes must come from the site's own origin (CSRF) and every
 * call needs a valid session. Returns { admin } or { response } to send back as is.
 */
export async function requireAdmin(request) {
  if (!isAdminConfigured())
    return { response: json(503, { ok: false, code: 'ADMIN_NOT_CONFIGURED' }) }
  if (request.method !== 'GET' && !originAllowed(request.headers)) {
    return { response: json(403, { ok: false, code: 'FORBIDDEN_ORIGIN' }) }
  }
  const admin = await getAdmin()
  if (!admin) return { response: json(401, { ok: false, code: 'UNAUTHORIZED' }) }
  return { admin }
}

/** Read a JSON body of at most `max` bytes; null when it is missing, too big or invalid. */
export async function readJson(request, max = 64 * 1024) {
  const text = await request.text().catch(() => null)
  if (text == null || Buffer.byteLength(text) > max) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** Public pages are static: rebuild them after any change to the catalogue. */
export function refreshSite() {
  revalidatePath('/', 'layout')
}

/** Map a Mongo duplicate-key error to a field error, or null. */
export function duplicateField(err) {
  if (err?.code !== 11000) return null
  const field = Object.keys(err.keyPattern ?? err.keyValue ?? {})[0]
  return field === 'slug' || field === 'id' ? field : '_form'
}

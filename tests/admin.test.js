import { describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))

import { hashPassword, verifyPassword } from '@/lib/admin/password'
import { createSessionToken, readSessionToken, SESSION_TTL_SECONDS } from '@/lib/admin/session'
import { parseServiceInput } from '@/lib/admin/service-input'
import { slugify } from '@/lib/admin/slugify'
import { services } from '@/content/services'
import { getPublishedServices, pick } from '@/lib/services'

const SECRET = 'x'.repeat(40)

describe('admin passwords', () => {
  it('hashes with a salt and verifies only the right password', async () => {
    const a = await hashPassword('correct horse battery')
    const b = await hashPassword('correct horse battery')
    expect(a).not.toBe(b)
    expect(a.startsWith('scrypt$')).toBe(true)
    expect(await verifyPassword('correct horse battery', a)).toBe(true)
    expect(await verifyPassword('wrong horse battery!', a)).toBe(false)
  })

  it('rejects short passwords and malformed hashes', async () => {
    await expect(hashPassword('short')).rejects.toThrow()
    expect(await verifyPassword('anything long enough', 'not-a-hash')).toBe(false)
    expect(await verifyPassword(undefined, 'scrypt$1$1$1$a$b')).toBe(false)
  })
})

describe('admin session token', () => {
  const user = { _id: 'a'.repeat(24), sessionVersion: 3 }

  it('round-trips a signed token', () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', SECRET)
    const data = readSessionToken(createSessionToken(user, 1000), 2000)
    expect(data).toMatchObject({ sub: user._id, ver: 3 })
  })

  it('rejects tampered, expired, foreign or missing-secret tokens', () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', SECRET)
    const token = createSessionToken(user, 0)
    const [payload, sig] = token.split('.')
    const forged = Buffer.from(JSON.stringify({ sub: 'b'.repeat(24), ver: 3, exp: 9e9 })).toString(
      'base64url'
    )
    expect(readSessionToken(`${forged}.${sig}`, 1000)).toBeNull()
    expect(readSessionToken(`${payload}.${sig}x`, 1000)).toBeNull()
    expect(readSessionToken(token, (SESSION_TTL_SECONDS + 1) * 1000)).toBeNull()
    expect(readSessionToken('garbage', 1000)).toBeNull()
    vi.stubEnv('ADMIN_SESSION_SECRET', 'y'.repeat(40))
    expect(readSessionToken(token, 1000)).toBeNull()
    vi.stubEnv('ADMIN_SESSION_SECRET', 'too-short')
    expect(readSessionToken(token, 1000)).toBeNull()
    expect(() => createSessionToken(user)).toThrow()
  })
})

describe('admin service input', () => {
  it('accepts every service in content/services.js (the import button)', () => {
    for (const s of services) {
      const r = parseServiceInput(s)
      expect(r.success, `${s.id}: ${JSON.stringify(r.errors)}`).toBe(true)
    }
  })

  it('reports field paths for bad input', () => {
    const r = parseServiceInput({
      id: 'Bad Id',
      type: 'boat',
      slug: '',
      title: { en: '', pt: 'x'.repeat(200) },
      gallery: [{ src: 'javascript:alert(1)' }],
    })
    expect(r.success).toBe(false)
    expect(r.errors).toMatchObject({
      id: 'invalid',
      type: 'invalid',
      slug: 'required',
      'title.en': 'required',
      'title.pt': 'too_long',
      'gallery.0.src': 'invalid',
    })
  })

  it('drops empty rows, self links and fills the SEO title', () => {
    const r = parseServiceInput({
      id: 'tour-a',
      type: 'tour',
      slug: 'a',
      title: { en: 'A', pt: 'Á' },
      includes: [
        { en: '', pt: '' },
        { en: 'Fuel', pt: 'Combustível' },
      ],
      related: ['tour-a', 'tour-b', 'tour-b'],
    })
    expect(r.success).toBe(true)
    expect(r.data.includes).toEqual([{ en: 'Fuel', pt: 'Combustível' }])
    expect(r.data.related).toEqual(['tour-b'])
    expect(r.data.seo.title).toEqual({ en: 'A', pt: 'Á' })
    expect(r.data.priceFrom).toBeNull()
  })
})

describe('catalogue helpers', () => {
  it('slugify makes URL-safe slugs', () => {
    expect(slugify('Tour à Ponta de São Lourenço!')).toBe('tour-a-ponta-de-sao-lourenco')
  })

  it('getPublishedServices filters a given list and hides drafts', () => {
    const list = [
      { id: 'a', type: 'tour', published: true },
      { id: 'b', type: 'tour', published: false },
      { id: 'c', type: 'transfer', published: true },
    ]
    expect(getPublishedServices('tour', list).map((s) => s.id)).toEqual(['a'])
    expect(getPublishedServices(undefined, list)).toHaveLength(2)
  })

  it('pick falls back to English when the locale is empty', () => {
    expect(pick({ en: 'Hi', pt: '' }, 'pt')).toBe('Hi')
    expect(pick(undefined, 'pt')).toBe('')
  })
})

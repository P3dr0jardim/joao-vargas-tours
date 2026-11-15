import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FIELD_ORDER } from '@/components/booking/booking-helpers'
import en from '@/messages/en.json'
import pt from '@/messages/pt.json'

const read = (rel) => readFileSync(join(process.cwd(), rel), 'utf8')
const messages = { en, pt }

/** Flatten nested messages into { 'a.b.c': 'text' }. */
function flatten(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value && typeof value === 'object') Object.assign(acc, flatten(value, `${prefix}${key}.`))
    else acc[`${prefix}${key}`] = value
    return acc
  }, {})
}

/** Names of ICU arguments and rich-text tags used in a message. */
function placeholders(text) {
  const args = [...text.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((m) => `{${m[1]}}`)
  const tags = [...text.matchAll(/<(\w+)>/g)].map((m) => `<${m[1]}>`)
  return [...new Set([...args, ...tags])].sort()
}

const namespaces = ['Booking', 'Pages.book', 'Pages.thankYou']
const get = (root, path) => path.split('.').reduce((o, p) => o?.[p], root)

describe('Booking messages: parity between en and pt', () => {
  it.each(namespaces)('%s exists in both languages', (ns) => {
    expect(get(en, ns), `en ${ns}`).toBeTypeOf('object')
    expect(get(pt, ns), `pt ${ns}`).toBeTypeOf('object')
  })

  it.each(namespaces)('%s has the same keys in en and pt', (ns) => {
    const a = Object.keys(flatten(get(en, ns))).sort()
    const b = Object.keys(flatten(get(pt, ns))).sort()
    expect(a).toEqual(b)
  })

  it('has no empty or placeholder-looking Booking strings', () => {
    for (const locale of ['en', 'pt']) {
      for (const [key, value] of Object.entries(flatten(messages[locale].Booking))) {
        expect(value, `${locale} Booking.${key}`).toBeTypeOf('string')
        expect(value.trim().length, `${locale} Booking.${key}`).toBeGreaterThan(0)
        expect(value, `${locale} Booking.${key}`).not.toMatch(/TODO|lorem|undefined/i)
      }
    }
  })

  it('uses the same ICU arguments and tags in both languages for every message', () => {
    const a = flatten(en.Booking)
    const b = flatten(pt.Booking)
    for (const key of Object.keys(a)) {
      expect(placeholders(b[key]), `Booking.${key}`).toEqual(placeholders(a[key]))
    }
  })

  it('has no stray or unbalanced braces', () => {
    for (const locale of ['en', 'pt']) {
      for (const [key, value] of Object.entries(flatten(messages[locale].Booking))) {
        const open = (value.match(/\{/g) ?? []).length
        const close = (value.match(/\}/g) ?? []).length
        expect(open, `${locale} Booking.${key}`).toBe(close)
      }
    }
  })

  it('the thank-you WhatsApp message carries the {ref} argument only where meant', () => {
    for (const locale of ['en', 'pt']) {
      const t = messages[locale].Booking.thanks
      expect(t.whatsappMessage).toContain('{ref}')
      expect(t.whatsappMessageNoRef).not.toContain('{')
    }
  })

  it('pt messages are European Portuguese, not Brazilian', () => {
    const brazilian =
      /\b(você|vocês|celular|tela|usuário|cadastro|ônibus|equipe|gente|contato|e-mail de contato|reservar agora)\b|\bvc\b/i
    for (const [key, value] of Object.entries(flatten(pt.Booking))) {
      expect(value, `pt Booking.${key}`).not.toMatch(brazilian)
    }
    // Typical pt-PT forms the form relies on: "telemóvel", not "celular"; formal "o seu".
    expect(JSON.stringify(pt.Booking)).toMatch(/telemóvel|telefone/i)
  })

  it('the pt text is really translated, not a copy of the English one', () => {
    const a = flatten(en.Booking)
    const b = flatten(pt.Booking)
    // Names, "Email" and a few labels are legitimately identical.
    const same = Object.keys(a).filter((k) => a[k] === b[k] && a[k].length > 12)
    expect(same).toEqual([])
  })

  it('the legal consent sentence has a link tag in both languages', () => {
    for (const locale of ['en', 'pt']) {
      expect(messages[locale].Booking.consent).toMatch(/<link>.+<\/link>/)
    }
  })
})

describe('Booking messages: every key used by the components exists', () => {
  const sources = ['BookingForm.js', 'ServiceSummary.js'].map((f) =>
    read(`components/booking/${f}`)
  )
  const literalKeys = sources.flatMap((src) =>
    [...src.matchAll(/\bt\(\s*'([^'$]+)'/g)].map((m) => m[1])
  )

  it('finds the literal translation keys in the sources', () => {
    expect(literalKeys.length).toBeGreaterThan(20)
  })

  it('has every literal t("...") key of BookingForm in Booking (both languages)', () => {
    // ServiceSummary reads from the Services namespace, so only check BookingForm here.
    const formKeys = [...sources[0].matchAll(/\bt\(\s*'([^'$]+)'/g)].map((m) => m[1])
    for (const locale of ['en', 'pt']) {
      const flat = flatten(messages[locale].Booking)
      for (const key of formKeys) {
        const exists = key in flat || Object.keys(flat).some((k) => k.startsWith(`${key}.`))
        expect(exists, `${locale} Booking.${key}`).toBe(true)
      }
    }
  })

  it('has a label for every form field and a group name for each service type', () => {
    for (const locale of ['en', 'pt']) {
      const b = messages[locale].Booking
      for (const field of FIELD_ORDER.filter((f) => f !== 'service' && f !== 'consent')) {
        expect(b.fields[field]?.label, `${locale} fields.${field}.label`).toBeTypeOf('string')
      }
      expect(b.fields.service.label).toBeTypeOf('string')
      for (const type of ['tour', 'transfer'])
        expect(b.fields.service.groups[type], `${locale} groups.${type}`).toBeTypeOf('string')
    }
  })

  it('has summary, error summary and thanks keys the pages read', () => {
    const thanksSrc = read('app/[locale]/book/thank-you/page.js')
    // generateMetadata reads Pages.thankYou; the page body reads Booking.thanks
    const pageBody = thanksSrc.slice(thanksSrc.indexOf('export default'))
    const used = [...pageBody.matchAll(/\bt\(\s*'([^'$]+)'/g)].map((m) => m[1])
    expect(used.length).toBeGreaterThan(5)
    for (const locale of ['en', 'pt']) {
      for (const key of used)
        expect(messages[locale].Booking.thanks[key], `${locale} Booking.thanks.${key}`).toBeTypeOf(
          'string'
        )
    }
  })

  it('provides the loading text used as the Suspense fallback', () => {
    for (const locale of ['en', 'pt']) expect(messages[locale].Booking.loading).toBeTypeOf('string')
  })

  it('the book and thank-you pages have title and description for SEO', () => {
    for (const locale of ['en', 'pt']) {
      for (const page of ['book', 'thankYou']) {
        const p = messages[locale].Pages[page]
        expect(p.title, `${locale} ${page}.title`).toBeTypeOf('string')
        expect(p.description, `${locale} ${page}.description`).toBeTypeOf('string')
      }
    }
  })
})

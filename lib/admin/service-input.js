import { z } from 'zod'

/**
 * Validation for a service sent by the admin panel. Same shape as content/services.js.
 * Unknown keys are dropped; strings are trimmed; empty list items are removed.
 */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const str = (max, { required = false } = {}) => {
  const base = z.string().trim().max(max, { error: 'too_long' })
  return required ? base.min(1, { error: 'required' }) : base.default('')
}

const loc = (max, opts) => z.object({ en: str(max, opts), pt: str(max, opts) })
const optLoc = (max) => loc(max).default({ en: '', pt: '' })

/** List of { en, pt } items; rows that are empty in both languages are dropped. */
const locList = (max, maxItems = 30) =>
  z
    .array(loc(max))
    .max(maxItems, { error: 'too_many' })
    .default([])
    .transform((items) => items.filter((i) => i.en || i.pt))

const paragraphs = z
  .array(z.string().trim().max(2000, { error: 'too_long' }))
  .max(20, { error: 'too_many' })
  .default([])
  .transform((items) => items.filter(Boolean))

const imageSrc = z
  .string()
  .trim()
  .max(500, { error: 'too_long' })
  .refine((s) => s.startsWith('/') || /^https:\/\/[^\s]+$/.test(s), { error: 'invalid' })

export const serviceInput = z.object({
  id: z.string().trim().min(1, { error: 'required' }).max(60).regex(SLUG, { error: 'invalid' }),
  type: z.enum(['tour', 'transfer'], { error: 'invalid' }),
  slug: z.string().trim().min(1, { error: 'required' }).max(80).regex(SLUG, { error: 'invalid' }),
  published: z.boolean().default(false),
  placeholder: z.boolean().default(false),
  order: z.number().int().min(0).max(9999).default(0),
  title: loc(120, { required: true }),
  seo: z
    .object({ title: optLoc(120), description: optLoc(300) })
    .default({ title: { en: '', pt: '' }, description: { en: '', pt: '' } }),
  summary: optLoc(500),
  body: z.object({ en: paragraphs, pt: paragraphs }).default({ en: [], pt: [] }),
  duration: optLoc(80),
  priceFrom: z.number().int().min(0).max(100000).nullable().default(null),
  priceWeekend: z.number().int().min(0).max(100000).nullable().default(null),
  currency: z.enum(['EUR']).default('EUR'),
  pricingModel: z.enum(['perVehicle', 'perPerson']).default('perVehicle'),
  capacity: z.number().int().min(1).max(60).default(6),
  route: z.object({ from: optLoc(160), to: optLoc(160) }).default({
    from: { en: '', pt: '' },
    to: { en: '', pt: '' },
  }),
  stops: locList(200),
  includes: locList(200),
  excludes: locList(200),
  faq: z
    .array(z.object({ q: loc(300), a: loc(1500) }))
    .max(20, { error: 'too_many' })
    .default([])
    .transform((items) => items.filter((i) => i.q.en || i.q.pt)),
  gallery: z
    .array(z.object({ src: imageSrc, alt: optLoc(300) }))
    .max(20, { error: 'too_many' })
    .default([]),
  related: z.array(z.string().trim().regex(SLUG)).max(12, { error: 'too_many' }).default([]),
})

/**
 * Validate admin input. Returns { success: true, data } or { success: false, errors } where
 * errors maps a dotted path ("title.pt", "faq.0.a.en") to a short code.
 */
export function parseServiceInput(input) {
  const result = serviceInput.safeParse(input)
  if (result.success) {
    const data = result.data
    data.related = [...new Set(data.related.filter((id) => id !== data.id))]
    if (!data.seo.title.en) data.seo.title.en = data.title.en
    if (!data.seo.title.pt) data.seo.title.pt = data.title.pt
    return { success: true, data }
  }
  const errors = {}
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '_form'
    if (!(path in errors))
      errors[path] = /^[a-z_]+$/.test(issue.message) ? issue.message : 'invalid'
  }
  return { success: false, errors }
}

/** Plain object of a stored service, safe to send to the browser and to the public pages. */
export function serializeService(doc) {
  if (!doc) return null
  const { _id, __v, createdAt, updatedAt, ...rest } = doc
  return {
    ...rest,
    _id: String(_id),
    updatedAt: updatedAt ? new Date(updatedAt).toISOString().slice(0, 10) : undefined,
  }
}

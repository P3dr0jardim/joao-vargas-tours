import { describe, expect, it } from 'vitest'
import { locales } from '@/config/site'
import { services } from '@/content/services'
import sitemap from '@/app/sitemap'
import { absoluteUrl } from '@/lib/seo'
import { formatPrice, getPublishedServices, servicePath } from '@/lib/services'

/** Every localised field is an { en, pt } object with a non-empty string per locale. */
function expectLocalised(value, where) {
  for (const locale of locales) {
    expect(value?.[locale], `${where} (${locale})`).toBeTypeOf('string')
    expect(value[locale].trim(), `${where} (${locale}) is empty`).not.toBe('')
  }
}

describe('services content', () => {
  it('has at least one tour and one transfer', () => {
    expect(services.some((s) => s.type === 'tour')).toBe(true)
    expect(services.some((s) => s.type === 'transfer')).toBe(true)
  })

  it('has unique ids and slugs', () => {
    const ids = services.map((s) => s.id)
    const slugs = services.map((s) => s.slug)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('uses url-safe slugs', () => {
    for (const s of services) expect(s.slug, s.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('has en and pt for every translated field', () => {
    for (const s of services) {
      const at = (field) => `${s.id}.${field}`
      expectLocalised(s.title, at('title'))
      expectLocalised(s.seo.title, at('seo.title'))
      expectLocalised(s.seo.description, at('seo.description'))
      expectLocalised(s.summary, at('summary'))
      expectLocalised(s.duration, at('duration'))
      expectLocalised(s.route.from, at('route.from'))
      expectLocalised(s.route.to, at('route.to'))
      for (const locale of locales) {
        expect(s.body[locale], at(`body.${locale}`)).toHaveLength(2)
        s.body[locale].forEach((p, i) => expect(p.trim(), at(`body.${locale}[${i}]`)).not.toBe(''))
      }
      s.stops.forEach((stop, i) => expectLocalised(stop, at(`stops[${i}]`)))
      s.includes.forEach((item, i) => expectLocalised(item, at(`includes[${i}]`)))
      s.excludes.forEach((item, i) => expectLocalised(item, at(`excludes[${i}]`)))
      expect(s.faq.length, at('faq')).toBeGreaterThanOrEqual(2)
      expect(s.faq.length, at('faq')).toBeLessThanOrEqual(3)
      s.faq.forEach((item, i) => {
        expectLocalised(item.q, at(`faq[${i}].q`))
        expectLocalised(item.a, at(`faq[${i}].a`))
      })
      expect(s.gallery.length, at('gallery')).toBeGreaterThan(0)
      s.gallery.forEach((img, i) => {
        expect(img.src, at(`gallery[${i}].src`)).toMatch(/^\/images\//)
        expectLocalised(img.alt, at(`gallery[${i}].alt`))
      })
    }
  })

  it('keeps SEO title and description within sensible lengths', () => {
    for (const s of services) {
      for (const locale of locales) {
        expect(s.seo.title[locale].length, `${s.id} title ${locale}`).toBeLessThanOrEqual(70)
        expect(
          s.seo.description[locale].length,
          `${s.id} description ${locale}`
        ).toBeLessThanOrEqual(200)
      }
    }
  })

  it('only relates to ids that exist, never to itself', () => {
    const ids = new Set(services.map((s) => s.id))
    for (const s of services) {
      expect(s.related.length, s.id).toBeGreaterThan(0)
      for (const id of s.related) {
        expect(ids.has(id), `${s.id} -> ${id}`).toBe(true)
        expect(id, `${s.id} relates to itself`).not.toBe(s.id)
      }
    }
  })

  it('marks every record as placeholder with a complete price model', () => {
    for (const s of services) {
      expect(s.placeholder, s.id).toBe(true)
      expect(['tour', 'transfer']).toContain(s.type)
      expect(s.currency).toBe('EUR')
      expect(s.pricingModel).toBe('perVehicle')
      expect(Number.isInteger(s.priceFrom) && s.priceFrom > 0, `${s.id} price`).toBe(true)
      expect(s.capacity).toBe(6)
      expect(s.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('only uses images that exist in the public folder list', () => {
    for (const s of services) for (const img of s.gallery) expect(img.src).toBe('/images/hero.webp')
  })

  it('never claims awards, ratings or guide licences', () => {
    const text = JSON.stringify(services).toLowerCase()
    for (const banned of [
      'award',
      'prémio',
      'licensed guide',
      'guia licenciado',
      'years of experience',
    ]) {
      expect(text, banned).not.toContain(banned)
    }
  })
})

describe('sitemap', () => {
  it('includes every published service for every locale, with alternates', () => {
    const entries = sitemap()
    for (const s of getPublishedServices()) {
      for (const locale of locales) {
        const url = absoluteUrl(locale, servicePath(s))
        const entry = entries.find((e) => e.url === url)
        expect(entry, `missing ${url}`).toBeDefined()
        expect(Object.keys(entry.alternates.languages).sort()).toEqual(['en', 'pt-PT', 'x-default'])
      }
    }
  })

  it('has no duplicate URLs', () => {
    const urls = sitemap().map((e) => e.url)
    expect(new Set(urls).size).toBe(urls.length)
  })
})

describe('price formatting', () => {
  it('formats whole euros per locale', () => {
    expect(formatPrice(200, 'EUR', 'en')).toBe('€200')
    expect(formatPrice(200, 'EUR', 'pt').replace(/\s/g, ' ')).toBe('200 €')
  })
})

import { describe, expect, it } from 'vitest'
import { locales, defaultLocale } from '@/config/site'
import en from '@/messages/en.json'
import pt from '@/messages/pt.json'
import { absoluteUrl, languageAlternates, localizedPath } from '@/lib/seo'

const messages = { en, pt }

/** Flatten nested messages into dot-separated key paths. */
function keysOf(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object' ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  )
}

describe('messages', () => {
  it('has a messages file for every configured locale', () => {
    for (const locale of locales) expect(messages[locale]).toBeTypeOf('object')
  })

  it('has identical keys in every locale', () => {
    const reference = keysOf(messages[defaultLocale]).sort()
    for (const locale of locales.filter((l) => l !== defaultLocale)) {
      const keys = keysOf(messages[locale]).sort()
      expect(
        reference.filter((k) => !keys.includes(k)),
        `keys missing in ${locale}`
      ).toEqual([])
      expect(
        keys.filter((k) => !reference.includes(k)),
        `extra keys in ${locale}`
      ).toEqual([])
    }
  })

  it('has no empty strings', () => {
    for (const locale of locales) {
      const empty = keysOf(messages[locale]).filter((k) => {
        const value = k.split('.').reduce((o, p) => o[p], messages[locale])
        return typeof value === 'string' && value.trim() === ''
      })
      expect(empty, `empty values in ${locale}`).toEqual([])
    }
  })
})

describe('seo helpers', () => {
  it('prefixes only non-default locales', () => {
    expect(localizedPath('en', '/tours')).toBe('/tours')
    expect(localizedPath('pt', '/tours')).toBe('/pt/tours')
    expect(localizedPath('en', '/')).toBe('/')
    expect(localizedPath('pt', '/')).toBe('/pt')
  })

  it('builds reciprocal hreflang alternates with x-default', () => {
    const alt = languageAlternates('/tours')
    expect(Object.keys(alt).sort()).toEqual(['en', 'pt-PT', 'x-default'])
    expect(alt['x-default']).toBe(alt.en)
    expect(alt['pt-PT']).toBe(absoluteUrl('pt', '/tours'))
  })
})

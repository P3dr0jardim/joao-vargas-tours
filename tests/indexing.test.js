import { describe, expect, it } from 'vitest'
import robots from '@/app/robots'

describe('indexing switch', () => {
  it('blocks all crawlers unless SITE_INDEXING=on (default off)', () => {
    expect(process.env.SITE_INDEXING).not.toBe('on')
    const result = robots()
    expect(result.rules).toEqual({ userAgent: '*', disallow: '/' })
    expect(result.sitemap).toBeUndefined()
  })
})

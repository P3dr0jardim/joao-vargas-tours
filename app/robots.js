import { indexingEnabled, siteConfig } from '@/config/site'

// While SITE_INDEXING is not "on" (the default), the whole site is closed to crawlers.
export default function robots() {
  if (!indexingEnabled) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  }
}

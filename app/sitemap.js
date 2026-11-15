import { locales, siteConfig } from '@/config/site'
import { absoluteUrl, languageAlternates } from '@/lib/seo'
import { getPublishedServices, servicePath } from '@/lib/services'

// One entry per locale and path; each entry lists all language alternates (reciprocal hreflang).
// lastModified is omitted for static pages on purpose; services carry their own updatedAt.
export default function sitemap() {
  const pages = siteConfig.routes.map((path) => ({ path }))
  const services = getPublishedServices().map((service) => ({
    path: servicePath(service),
    lastModified: service.updatedAt,
  }))

  return [...pages, ...services].flatMap(({ path, lastModified }) =>
    locales.map((locale) => ({
      url: absoluteUrl(locale, path),
      ...(lastModified ? { lastModified } : {}),
      alternates: { languages: languageAlternates(path) },
    }))
  )
}

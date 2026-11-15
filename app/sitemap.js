import { locales, siteConfig } from '@/config/site'
import { absoluteUrl, languageAlternates } from '@/lib/seo'

// One entry per locale and route; each entry lists all language alternates (reciprocal hreflang).
// lastModified is omitted on purpose: add real dates once content comes from the database.
export default function sitemap() {
  return siteConfig.routes.flatMap((path) =>
    locales.map((locale) => ({
      url: absoluteUrl(locale, path),
      alternates: { languages: languageAlternates(path) },
    }))
  )
}

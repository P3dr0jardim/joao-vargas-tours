import { defaultLocale, localeTags, locales, ogLocales, siteConfig } from '@/config/site'

/** Path for a locale: English has no prefix, other locales are prefixed. */
export function localizedPath(locale, path = '/') {
  const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`
  if (locale === defaultLocale) return clean || '/'
  return `/${locale}${clean}`
}

export function absoluteUrl(locale, path = '/') {
  const p = localizedPath(locale, path)
  return p === '/' ? siteConfig.url : `${siteConfig.url}${p}`
}

/** hreflang map (en, pt-PT, x-default) with absolute URLs. */
export function languageAlternates(path = '/') {
  const languages = Object.fromEntries(
    locales.map((locale) => [localeTags[locale], absoluteUrl(locale, path)])
  )
  languages['x-default'] = absoluteUrl(defaultLocale, path)
  return languages
}

/** Metadata fragment: canonical + hreflang alternates for a page. */
export function buildAlternates(locale, path = '/') {
  return { canonical: absoluteUrl(locale, path), languages: languageAlternates(path) }
}

/** Full per-page metadata from a title/description pair. */
export function buildPageMetadata({ locale, path, title, description }) {
  return {
    title,
    description,
    alternates: buildAlternates(locale, path),
    openGraph: {
      title,
      description,
      url: absoluteUrl(locale, path),
      siteName: siteConfig.brand,
      locale: ogLocales[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => ogLocales[l]),
      type: 'website',
    },
  }
}

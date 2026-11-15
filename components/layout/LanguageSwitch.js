'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { localeLabels, localeTags, locales } from '@/config/site'

/** EN | PT switch. Keeps the current page and swaps only the locale. */
export default function LanguageSwitch({ className = '' }) {
  const t = useTranslations('LanguageSwitch')
  const current = useLocale()
  const pathname = usePathname()

  return (
    <nav aria-label={t('label')} className={className}>
      <ul className="flex items-center gap-1 text-sm font-semibold">
        {locales.map((locale, index) => {
          const active = locale === current
          return (
            <li key={locale} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden="true" className="text-sky-300">
                  |
                </span>
              )}
              <Link
                href={pathname}
                locale={locale}
                hrefLang={localeTags[locale]}
                lang={localeTags[locale]}
                aria-label={active ? undefined : t('switchTo', { language: localeLabels[locale] })}
                aria-current={active ? 'true' : undefined}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-2 ${
                  active ? 'bg-sky-100 text-blue-800' : 'text-blue-600 hover:bg-sky-50'
                }`}
              >
                {locale.toUpperCase()}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { indexingEnabled, localeTags, siteConfig } from '@/config/site'
import { buildPageMetadata } from '@/lib/seo'
import { bodyFont, headingFont } from '../fonts'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import MobileBottomBar from '@/components/layout/MobileBottomBar'
import '../globals.css'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Meta' })
  return {
    ...buildPageMetadata({
      locale,
      path: '/',
      title: t('siteTitle'),
      description: t('siteDescription'),
    }),
    metadataBase: new URL(siteConfig.url),
    // Inherited by every page. Default is noindex until SITE_INDEXING=on.
    robots: indexingEnabled ? { index: true, follow: true } : { index: false, follow: false },
    // Must come after the spread: child pages get "<title> | João Vargas Tours"
    title: { default: t('siteTitle'), template: `%s | ${siteConfig.brand}` },
  }
}

export const viewport = {
  themeColor: '#14487A',
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'Common' })

  return (
    <html lang={localeTags[locale]} className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only z-50 rounded-full bg-white px-5 py-3 font-semibold text-blue-800 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            {t('skipToContent')}
          </a>
          <Header />
          <main id="main" tabIndex={-1} className="min-h-[60vh] focus:outline-none">
            {children}
          </main>
          <Footer />
          <MobileBottomBar />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

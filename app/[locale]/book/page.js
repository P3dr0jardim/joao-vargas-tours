import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import BookingForm from '@/components/booking/BookingForm'
import ServiceSummary from '@/components/booking/ServiceSummary'
import { WhatsAppIcon } from '@/components/ui/icons'
import Section from '@/components/ui/Section'
import { siteConfig, whatsappLink } from '@/config/site'
import { maxAdultsFor } from '@/lib/booking/schema'
import { pageMetadata } from '@/lib/page-metadata'
import { getPublishedServices, pick } from '@/lib/services'

export async function generateMetadata(props) {
  return pageMetadata(props, 'book', '/book')
}

export default async function BookPage({ params }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Pages.book')
  const b = await getTranslations('Booking')
  const loading = b('loading')

  const published = getPublishedServices()
  // Light list for the client select; summaries are server-rendered (they reuse ServicePrice).
  const services = published.map((s) => ({
    slug: s.slug,
    type: s.type,
    maxAdults: maxAdultsFor(s),
    title: pick(s.title, locale),
  }))
  const summaries = Object.fromEntries(
    published.map((s) => [s.slug, <ServiceSummary key={s.slug} service={s} />])
  )

  return (
    <Section labelledBy="book-title">
      <div className="mb-10 max-w-2xl">
        <h1 id="book-title">{t('title')}</h1>
        <p className="mt-4 text-lg">{t('intro')}</p>
        <p className="mt-3">
          {t('whatsappPrompt')}{' '}
          <a
            href={whatsappLink(t('whatsappMessage'))}
            className="inline-flex items-center gap-1.5 font-semibold text-blue-800 underline"
          >
            <WhatsAppIcon />
            {t('whatsappLink')}
          </a>
        </p>
      </div>
      {/* The form needs JavaScript. Without it, show how to reach João directly. */}
      <noscript>
        <div className="space-y-3 rounded-2xl border-2 border-blue-600 bg-white p-5">
          <p className="font-semibold">{b('noscript.text')}</p>
          <ul className="space-y-1">
            <li>
              <a href={siteConfig.whatsapp.href} className="font-semibold text-blue-800 underline">
                {b('noscript.whatsapp')}
              </a>
            </li>
            <li>
              <a href={siteConfig.phone.href} className="font-semibold text-blue-800 underline">
                {b('noscript.phone', { number: siteConfig.phone.display })}
              </a>
            </li>
          </ul>
        </div>
      </noscript>
      {/* useSearchParams (?service=) needs a Suspense boundary to keep the page static. */}
      <Suspense fallback={<p>{loading}</p>}>
        <BookingForm services={services} summaries={summaries} />
      </Suspense>
    </Section>
  )
}

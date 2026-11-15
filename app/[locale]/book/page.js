import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import BookingForm from '@/components/booking/BookingForm'
import ServiceSummary from '@/components/booking/ServiceSummary'
import Section from '@/components/ui/Section'
import { pageMetadata } from '@/lib/page-metadata'
import { getPublishedServices, pick } from '@/lib/services'

export async function generateMetadata(props) {
  return pageMetadata(props, 'book', '/book')
}

export default async function BookPage({ params }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Pages.book')
  const loading = (await getTranslations('Booking'))('loading')

  const published = getPublishedServices()
  // Light list for the client select; summaries are server-rendered (they reuse ServicePrice).
  const services = published.map((s) => ({
    slug: s.slug,
    type: s.type,
    capacity: s.capacity,
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
      </div>
      {/* useSearchParams (?service=) needs a Suspense boundary to keep the page static. */}
      <Suspense fallback={<p>{loading}</p>}>
        <BookingForm services={services} summaries={summaries} />
      </Suspense>
    </Section>
  )
}

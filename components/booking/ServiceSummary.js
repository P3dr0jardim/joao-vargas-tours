import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { maxAdultsFor } from '@/lib/booking/schema'
import { pick, servicePath } from '@/lib/services'
import ServicePrice from '@/components/services/ServicePrice'

/**
 * Summary of one service for the booking page: what the visitor is requesting and the indicative
 * price. Server component, rendered once per service and swapped on the client by BookingForm.
 */
export default async function ServiceSummary({ service }) {
  const t = await getTranslations('Services')
  const b = await getTranslations('Booking')
  const locale = await getLocale()

  return (
    <div className="flex flex-col gap-4">
      <h3>{pick(service.title, locale)}</h3>
      <p>{pick(service.summary, locale)}</p>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex gap-1">
          <dt className="font-semibold">{t('facts.duration')}:</dt>
          <dd>{pick(service.duration, locale)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="font-semibold">{t('facts.capacity')}:</dt>
          <dd>{t('capacityValue', { count: maxAdultsFor(service) })}</dd>
        </div>
      </dl>
      <div className="border-t border-sky-300 pt-4">
        <ServicePrice service={service} />
      </div>
      <Link
        href={servicePath(service)}
        className="inline-flex min-h-12 items-center font-semibold text-blue-800 underline underline-offset-4"
      >
        {b('summary.details')}
      </Link>
    </div>
  )
}

import { getLocale, getTranslations } from 'next-intl/server'
import { formatPrice } from '@/lib/services'

/**
 * "From €150 per taxi", the weekend price when there is one, the Calheta board rule (+20% above
 * 4 people) and, while values are placeholders (service.placeholder), the indicative-price note.
 * `compact` drops the notes (cards and the price list show them once elsewhere).
 */
export default async function ServicePrice({ service, compact = false }) {
  const t = await getTranslations('Services')
  const locale = await getLocale()
  if (service.priceFrom == null) return <p className="text-lg">{t('priceOnRequest')}</p>
  const amount = formatPrice(service.priceFrom, service.currency, locale)

  return (
    <div>
      <p className="text-lg">
        {t.rich('priceFrom', {
          price: amount,
          strong: (chunks) => <strong className="font-heading text-blue-800">{chunks}</strong>,
        })}{' '}
        <span className="text-base">{t(`pricing.${service.pricingModel}`)}</span>
      </p>
      {service.priceWeekend != null && (
        <p className="text-sm">
          {t('weekend', { price: formatPrice(service.priceWeekend, service.currency, locale) })}
        </p>
      )}
      {!compact && (
        <>
          <p className="mt-1 text-sm">{t('groupNote')}</p>
          {service.placeholder && <p className="mt-1 text-sm">{t('priceNote')}</p>}
        </>
      )}
    </div>
  )
}

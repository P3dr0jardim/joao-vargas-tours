import { getLocale, getTranslations } from 'next-intl/server'
import { formatPrice, oneWayPrice, priceTrip } from '@/lib/services'

/**
 * Price per taxi as set by priceTrip: one way and return ("One way: €75 · Return: €150 per taxi"),
 * return only or one way only. Then the weekend prices when there are any and, while values are
 * placeholders (service.placeholder), the indicative-price note. `compact` drops the note (cards
 * and the price list show it elsewhere).
 */
export default async function ServicePrice({ service, compact = false }) {
  const t = await getTranslations('Services')
  const locale = await getLocale()
  if (service.priceFrom == null) return <p className="text-lg">{t('priceOnRequest')}</p>
  const format = (amount) => formatPrice(amount, service.currency, locale)
  const strong = (chunks) => <strong className="font-heading text-blue-800">{chunks}</strong>
  const trip = priceTrip(service)

  return (
    <div>
      <p className="text-lg">
        {trip === 'oneWay' && t.rich('priceOneWay', { price: format(service.priceFrom), strong })}
        {trip === 'both' && (
          <>
            {t.rich('priceOneWay', { price: format(oneWayPrice(service.priceFrom)), strong })}
            {' · '}
          </>
        )}
        {trip !== 'oneWay' && t.rich('priceReturn', { price: format(service.priceFrom), strong })}{' '}
        <span className="text-base">{t(`pricing.${service.pricingModel}`)}</span>
      </p>
      {service.priceWeekend != null && (
        <p className="text-sm">
          {trip === 'both'
            ? t('weekendBoth', {
                oneWay: format(oneWayPrice(service.priceWeekend)),
                roundTrip: format(service.priceWeekend),
              })
            : t('weekend', { price: format(service.priceWeekend) })}
        </p>
      )}
      {!compact && service.placeholder && <p className="mt-1 text-sm">{t('priceNote')}</p>}
    </div>
  )
}

import { getLocale, getTranslations } from 'next-intl/server'
import { formatPrice, isReturnOnly, oneWayPrice } from '@/lib/services'

/**
 * One-way and return price per taxi ("One way: €75 · Return: €150 per taxi"; island tours show the
 * return price only), the weekend prices when there are any and, while values are placeholders
 * (service.placeholder), the indicative-price note. `compact` drops the note (cards and the price list show it elsewhere).
 */
export default async function ServicePrice({ service, compact = false }) {
  const t = await getTranslations('Services')
  const locale = await getLocale()
  if (service.priceFrom == null) return <p className="text-lg">{t('priceOnRequest')}</p>
  const format = (amount) => formatPrice(amount, service.currency, locale)
  const strong = (chunks) => <strong className="font-heading text-blue-800">{chunks}</strong>

  return (
    <div>
      <p className="text-lg">
        {!isReturnOnly(service) && (
          <>
            {t.rich('priceOneWay', { price: format(oneWayPrice(service.priceFrom)), strong })}
            {' · '}
          </>
        )}
        {t.rich('priceReturn', { price: format(service.priceFrom), strong })}{' '}
        <span className="text-base">{t(`pricing.${service.pricingModel}`)}</span>
      </p>
      {service.priceWeekend != null && (
        <p className="text-sm">
          {t('weekendBoth', {
            oneWay: format(oneWayPrice(service.priceWeekend)),
            roundTrip: format(service.priceWeekend),
          })}
        </p>
      )}
      {!compact && service.placeholder && <p className="mt-1 text-sm">{t('priceNote')}</p>}
    </div>
  )
}

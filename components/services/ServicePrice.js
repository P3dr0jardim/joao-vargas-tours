import { getLocale, getTranslations } from 'next-intl/server'
import { formatPrice } from '@/lib/services'

/**
 * "From €200 per vehicle" plus the placeholder note. The note is shown next to every price while
 * values are placeholders (service.placeholder), because they are not final.
 */
export default async function ServicePrice({ service }) {
  const t = await getTranslations('Services')
  const locale = await getLocale()
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
      {service.placeholder && <p className="mt-1 text-sm">{t('priceNote')}</p>}
    </div>
  )
}

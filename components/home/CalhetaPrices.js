import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import Section from '@/components/ui/Section'
import { WhatsAppIcon } from '@/components/ui/icons'
import { serviceWhatsappHref } from '@/components/services/ServiceContact'
import {
  formatPrice,
  getPublishedServices,
  isLevada,
  isReturnOnly,
  loadCatalog,
  oneWayPrice,
  pick,
  servicePath,
} from '@/lib/services'

function Price({ service, locale, t }) {
  if (service.priceFrom == null) return t('Services.priceOnRequest')
  // Island tours show their return price; everything else shows one way (half the return price).
  const shown = (amount) => (isReturnOnly(service) ? amount : oneWayPrice(amount))
  const weekday = formatPrice(shown(service.priceFrom), service.currency, locale)
  if (service.priceWeekend == null) return weekday
  const weekend = formatPrice(shown(service.priceWeekend), service.currency, locale)
  return (
    <>
      {weekday}
      <span className="block text-sm font-normal">{t('Services.weekend', { price: weekend })}</span>
    </>
  )
}

/**
 * The Calheta taxi rank price board as a list: every published service, grouped, with its price
 * (return for island tours, one way, half the stored return price, for the rest) and a WhatsApp button that opens a message already naming the service.
 */
export default async function CalhetaPrices() {
  const t = await getTranslations()
  const locale = await getLocale()
  const all = getPublishedServices(undefined, await loadCatalog())
  const groups = [
    { key: 'tours', items: all.filter((s) => s.type === 'tour' && !isLevada(s)) },
    { key: 'levadas', items: all.filter(isLevada) },
    { key: 'transfers', items: all.filter((s) => s.type === 'transfer') },
  ].filter((g) => g.items.length > 0)
  if (groups.length === 0) return null
  const hrefs = Object.fromEntries(
    await Promise.all(all.map(async (s) => [s.id, await serviceWhatsappHref(s)]))
  )

  return (
    <Section labelledBy="prices-title">
      <h2 id="prices-title">{t('Home.prices.title')}</h2>
      <p className="mt-3 max-w-2xl">{t('Home.prices.intro')}</p>
      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        {groups.map((group) => (
          <section key={group.key} aria-labelledby={`prices-${group.key}`}>
            <h3 id={`prices-${group.key}`} className="border-b-2 border-blue-600 pb-2">
              {t(`Home.prices.${group.key}`)}
            </h3>
            <ul className="divide-y divide-sky-100">
              {group.items.map((service) => {
                const title = pick(service.title, locale)
                return (
                  <li key={service.id} className="flex items-center gap-3 py-3">
                    <Link
                      href={servicePath(service)}
                      className="min-w-0 flex-1 font-medium text-blue-800 hover:underline"
                    >
                      {title}
                    </Link>
                    <span className="shrink-0 text-right font-heading font-semibold text-blue-800">
                      <Price service={service} locale={locale} t={t} />
                    </span>
                    <a
                      href={hrefs[service.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('Services.whatsappAria', { title })}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-800"
                    >
                      <WhatsAppIcon />
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-8 text-sm">
        {t('Services.oneWayNote')} {t('Services.priceNote')}.
      </p>
    </Section>
  )
}

import { getLocale, getTranslations } from 'next-intl/server'
import Section from '@/components/ui/Section'
import { pick } from '@/lib/services'

/** FAQ with native <details>: keyboard and screen reader friendly with no client JS. */
export default async function ServiceFaq({ faq }) {
  const t = await getTranslations('Services')
  const locale = await getLocale()
  if (!faq?.length) return null

  return (
    <Section labelledBy="faq-title" tone="sky">
      <h2 id="faq-title">{t('faqTitle')}</h2>
      <div className="mt-8 max-w-3xl space-y-3">
        {faq.map((item, i) => (
          <details
            key={i}
            className="group rounded-2xl border border-sky-300 bg-white open:border-blue-600"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 font-semibold text-blue-800 [&::-webkit-details-marker]:hidden">
              {pick(item.q, locale)}
              <span aria-hidden="true" className="text-xl leading-none group-open:hidden">
                +
              </span>
              <span aria-hidden="true" className="hidden text-xl leading-none group-open:inline">
                −
              </span>
            </summary>
            <p className="px-5 pb-4">{pick(item.a, locale)}</p>
          </details>
        ))}
      </div>
    </Section>
  )
}

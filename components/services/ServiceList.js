import { getTranslations } from 'next-intl/server'
import Section from '@/components/ui/Section'
import ServiceGrid from '@/components/services/ServiceGrid'
import { getPublishedServices, isLevada, loadCatalog } from '@/lib/services'

/**
 * Listing page body for one service type. `pageKey` is "tours" or "transfers" (Pages.<key>).
 * The tours page shows island tours and levada walks as two groups.
 */
export default async function ServiceList({ type, pageKey }) {
  const t = await getTranslations('Pages')
  const services = getPublishedServices(type, await loadCatalog())
  const levadas = type === 'tour' ? services.filter(isLevada) : []
  const main = services.filter((s) => !levadas.includes(s))

  return (
    <Section labelledBy="list-title" className="space-y-14">
      <div>
        <h1 id="list-title">{t(`${pageKey}.title`)}</h1>
        <p className="mt-5 max-w-prose text-lg">{t(`${pageKey}.intro`)}</p>
      </div>
      {levadas.length === 0 ? (
        <ServiceGrid services={main} />
      ) : (
        <>
          <section aria-labelledby="list-tours">
            <h2 id="list-tours">{t(`${pageKey}.toursTitle`)}</h2>
            <div className="mt-6">
              <ServiceGrid services={main} />
            </div>
          </section>
          <section id="levadas" aria-labelledby="list-levadas" className="scroll-mt-24">
            <h2 id="list-levadas">{t(`${pageKey}.levadasTitle`)}</h2>
            <p className="mt-3 max-w-prose">{t(`${pageKey}.levadasIntro`)}</p>
            <div className="mt-6">
              <ServiceGrid services={levadas} />
            </div>
          </section>
        </>
      )}
    </Section>
  )
}

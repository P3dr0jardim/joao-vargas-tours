import { getTranslations } from 'next-intl/server'
import Section from '@/components/ui/Section'
import ServiceGrid from '@/components/services/ServiceGrid'
import { getPublishedServices } from '@/lib/services'

/** Listing page body for one service type. `pageKey` is "tours" or "transfers" (Pages.<key>). */
export default async function ServiceList({ type, pageKey }) {
  const t = await getTranslations('Pages')

  return (
    <Section labelledBy="list-title">
      <h1 id="list-title">{t(`${pageKey}.title`)}</h1>
      <p className="mt-5 max-w-prose text-lg">{t(`${pageKey}.intro`)}</p>
      <div className="mt-10">
        <ServiceGrid services={getPublishedServices(type)} />
      </div>
    </Section>
  )
}

import { getTranslations } from 'next-intl/server'
import Section from '@/components/ui/Section'
import ButtonLink from '@/components/ui/ButtonLink'
import ServiceGrid from '@/components/services/ServiceGrid'
import { getServiceById, loadCatalog } from '@/lib/services'

// Featured ids are picked by hand: the three Calheta board tours, three levadas, three transfers.
const featured = [
  {
    key: 'tours',
    href: '/tours',
    ids: ['tour-west', 'tour-middle', 'tour-east'],
  },
  {
    key: 'levadas',
    href: '/tours#levadas',
    ids: ['levada-25-fontes-risco', 'levada-fanal', 'levada-pico-areeiro'],
  },
  {
    key: 'transfers',
    href: '/transfers',
    ids: ['transfer-calheta-airport', 'transfer-calheta-funchal', 'transfer-calheta-porto-moniz'],
  },
]

export default async function FeaturedServices() {
  const t = await getTranslations('Home.services')
  const catalog = await loadCatalog()

  return (
    <Section labelledBy="services-title" tone="sky" className="space-y-14">
      <div>
        <h2 id="services-title">{t('title')}</h2>
        <p className="mt-3 max-w-2xl">{t('intro')}</p>
      </div>
      {featured.map((group) => {
        const services = group.ids.map((id) => getServiceById(id, catalog)).filter(Boolean)
        // Services removed or renamed in the admin simply drop out; an empty group is hidden.
        if (services.length === 0) return null
        return (
          <div key={group.key} role="group" aria-labelledby={`featured-${group.key}`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h3 id={`featured-${group.key}`}>{t(`${group.key}Title`)}</h3>
              <ButtonLink href={group.href} variant="outline">
                {t(`${group.key}All`)}
              </ButtonLink>
            </div>
            <div className="mt-6">
              <ServiceGrid services={services} />
            </div>
          </div>
        )
      })}
    </Section>
  )
}

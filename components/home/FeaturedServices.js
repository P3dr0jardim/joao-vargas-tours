import { getTranslations } from 'next-intl/server'
import Section from '@/components/ui/Section'
import ButtonLink from '@/components/ui/ButtonLink'
import ServiceGrid from '@/components/services/ServiceGrid'
import { getServiceById } from '@/lib/services'

// Featured ids are picked by hand: 3 tours and 2 transfers.
const featured = [
  {
    key: 'tours',
    href: '/tours',
    ids: ['tour-west', 'tour-north', 'tour-east'],
  },
  {
    key: 'transfers',
    href: '/transfers',
    ids: ['transfer-funchal-airport', 'transfer-calheta-funchal'],
  },
]

export default async function FeaturedServices() {
  const t = await getTranslations('Home.services')

  return (
    <Section labelledBy="services-title" tone="sky" className="space-y-14">
      <div>
        <h2 id="services-title">{t('title')}</h2>
        <p className="mt-3 max-w-2xl">{t('intro')}</p>
      </div>
      {featured.map((group) => (
        <div key={group.key} role="group" aria-labelledby={`featured-${group.key}`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h3 id={`featured-${group.key}`}>{t(`${group.key}Title`)}</h3>
            <ButtonLink href={group.href} variant="outline">
              {t(`${group.key}All`)}
            </ButtonLink>
          </div>
          <div className="mt-6">
            <ServiceGrid services={group.ids.map(getServiceById).filter(Boolean)} />
          </div>
        </div>
      ))}
    </Section>
  )
}

import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import Section from '@/components/ui/Section'

// Placeholder until services come from the database: two entry cards to the hubs.
export default async function FeaturedServices() {
  const t = await getTranslations('Home.services')
  const cards = [
    { key: 'tours', href: '/tours', title: t('toursTitle'), text: t('toursText') },
    { key: 'transfers', href: '/transfers', title: t('transfersTitle'), text: t('transfersText') },
  ]

  return (
    <Section labelledBy="services-title" tone="sky">
      <h2 id="services-title">{t('title')}</h2>
      <p className="mt-3 max-w-2xl">{t('intro')}</p>
      <ul className="mt-10 grid gap-6 md:grid-cols-2">
        {cards.map((card) => (
          <li key={card.key}>
            <Link
              href={card.href}
              className="group flex h-full flex-col gap-3 rounded-3xl border border-sky-300 bg-white p-7 hover:border-blue-600"
            >
              <h3 className="group-hover:underline">{card.title}</h3>
              <p>{card.text}</p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm">{t('empty')}</p>
    </Section>
  )
}

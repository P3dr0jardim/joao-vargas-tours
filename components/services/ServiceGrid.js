import { getTranslations } from 'next-intl/server'
import ServiceCard from '@/components/services/ServiceCard'

/** Responsive grid of service cards with an empty state. */
export default async function ServiceGrid({ services }) {
  const t = await getTranslations('Services')

  if (services.length === 0) {
    return (
      <p className="rounded-3xl border-2 border-dashed border-sky-300 p-8 text-center">
        {t('empty')}
      </p>
    )
  }

  return (
    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <li key={service.id}>
          <ServiceCard service={service} />
        </li>
      ))}
    </ul>
  )
}

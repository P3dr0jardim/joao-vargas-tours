import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { pick, servicePath } from '@/lib/services'
import ServicePrice from '@/components/services/ServicePrice'

/** Card for listings and the home page. The title link covers the whole card. */
export default async function ServiceCard({ service }) {
  const t = await getTranslations('Services')
  const locale = await getLocale()

  return (
    <article className="relative flex h-full flex-col gap-4 rounded-3xl border border-sky-300 bg-white p-6 focus-within:border-blue-600 hover:border-blue-600">
      <h3>
        <Link
          href={servicePath(service)}
          className="after:absolute after:inset-0 after:rounded-3xl hover:underline"
        >
          {pick(service.title, locale)}
        </Link>
      </h3>
      <p>{pick(service.summary, locale)}</p>
      <dl className="mt-auto flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex gap-1">
          <dt className="font-semibold">{t('facts.duration')}:</dt>
          <dd>{pick(service.duration, locale)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="font-semibold">{t('facts.capacity')}:</dt>
          <dd>{t('capacityValue', { count: service.capacity })}</dd>
        </div>
      </dl>
      <div className="border-t border-sky-100 pt-4">
        <ServicePrice service={service} />
      </div>
    </article>
  )
}

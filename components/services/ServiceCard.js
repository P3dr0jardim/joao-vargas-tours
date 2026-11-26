import Image from 'next/image'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { pick, servicePath } from '@/lib/services'
import ServiceContact from '@/components/services/ServiceContact'
import ServicePrice from '@/components/services/ServicePrice'

/**
 * Card for listings and the home page, with the service's first photo as background under a dark
 * gradient (white text stays readable on any photo). The title link covers the whole card; the
 * WhatsApp and call buttons sit above it (relative z-10) so they stay clickable.
 */
export default async function ServiceCard({ service }) {
  const t = await getTranslations('Services')
  const locale = await getLocale()
  const image = service.gallery?.[0] ?? { src: '/images/hero.webp', alt: { en: '', pt: '' } }

  return (
    <article className="group relative isolate flex h-full min-h-[28rem] flex-col gap-4 overflow-hidden rounded-3xl bg-blue-800 p-6 text-white ring-blue-600 ring-offset-2 focus-within:ring-2 hover:ring-2">
      <Image
        src={image.src}
        alt=""
        fill
        sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
        unoptimized={!image.src.startsWith('/')}
        className="-z-20 object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/65 to-black/25"
      />
      <h3 className="mt-auto text-white">
        <Link
          href={servicePath(service)}
          className="after:absolute after:inset-0 after:rounded-3xl hover:underline"
        >
          {pick(service.title, locale)}
        </Link>
      </h3>
      <p>{pick(service.summary, locale)}</p>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex gap-1">
          <dt className="font-semibold">{t('facts.duration')}:</dt>
          <dd>{pick(service.duration, locale)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="font-semibold">{t('facts.capacity')}:</dt>
          <dd>{t('capacityValue', { count: service.capacity })}</dd>
        </div>
      </dl>
      {service.stops?.length > 0 && (
        <p className="text-sm">
          <span className="font-semibold">{t('stopsLabel')}:</span>{' '}
          {service.stops.map((stop) => pick(stop, locale)).join(' · ')}
        </p>
      )}
      <div className="border-t border-white/30 pt-4 [&_strong]:text-white">
        <ServicePrice service={service} compact />
      </div>
      <ServiceContact service={service} className="relative z-10" />
    </article>
  )
}

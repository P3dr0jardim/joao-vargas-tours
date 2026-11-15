import Image from 'next/image'
import { getLocale, getTranslations } from 'next-intl/server'
import { whatsappLink } from '@/config/site'
import { absoluteUrl } from '@/lib/seo'
import { getRelatedServices, pick, sectionPath, servicePath } from '@/lib/services'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import ButtonLink from '@/components/ui/ButtonLink'
import Section from '@/components/ui/Section'
import { CheckIcon, WhatsAppIcon } from '@/components/ui/icons'
import JsonLd from '@/components/seo/JsonLd'
import ServiceFaq from '@/components/services/ServiceFaq'
import ServiceGrid from '@/components/services/ServiceGrid'
import ServicePrice from '@/components/services/ServicePrice'

function Fact({ label, children }) {
  return (
    <div>
      <dt className="text-sm font-semibold">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/** Shared detail page for tours and transfers. */
export default async function ServiceDetail({ service }) {
  const t = await getTranslations('Services')
  const nav = await getTranslations('Nav')
  const locale = await getLocale()
  const title = pick(service.title, locale)
  const hubPath = sectionPath(service.type)
  const hubLabel = nav(service.type === 'tour' ? 'tours' : 'transfers')
  const related = getRelatedServices(service)
  const image = service.gallery[0]

  const crumbs = [
    { label: nav('home'), href: '/' },
    { label: hubLabel, href: hubPath },
    { label: title, href: servicePath(service) },
  ]
  // BreadcrumbList only: no Offer/price, Review or AggregateRating while content is placeholder.
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      item: absoluteUrl(locale, crumb.href),
    })),
  }

  const bookHref = `/book?service=${service.slug}`

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <Section labelledBy="service-title" className="space-y-8">
        <Breadcrumbs items={crumbs} />
        <div>
          <h1 id="service-title" className="max-w-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg">{pick(service.summary, locale)}</p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="space-y-10">
            <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-sky-100">
              <Image
                src={image.src}
                alt={pick(image.alt, locale)}
                fill
                priority
                sizes="(min-width: 1024px) 760px, 100vw"
                className="object-cover"
              />
            </div>

            <div className="max-w-prose space-y-4">
              {service.body[locale].map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {service.stops.length > 0 && (
              <section aria-labelledby="stops-title">
                <h2 id="stops-title" className="text-2xl">
                  {t('stopsTitle')}
                </h2>
                <p className="mt-2 text-sm">{t('stopsNote')}</p>
                <ol className="mt-4 list-decimal space-y-1 pl-6 marker:font-semibold marker:text-blue-600">
                  {service.stops.map((stop) => (
                    <li key={stop.en}>{pick(stop, locale)}</li>
                  ))}
                </ol>
              </section>
            )}

            <div className="grid gap-8 sm:grid-cols-2">
              <section aria-labelledby="includes-title">
                <h2 id="includes-title" className="text-2xl">
                  {t('includesTitle')}
                </h2>
                <ul className="mt-4 space-y-2">
                  {service.includes.map((item) => (
                    <li key={item.en} className="flex gap-2">
                      <CheckIcon className="mt-1 shrink-0 text-blue-600" />
                      {pick(item, locale)}
                    </li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="excludes-title">
                <h2 id="excludes-title" className="text-2xl">
                  {t('excludesTitle')}
                </h2>
                <ul className="mt-4 list-disc space-y-2 pl-5">
                  {service.excludes.map((item) => (
                    <li key={item.en}>{pick(item, locale)}</li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          <aside
            aria-labelledby="facts-title"
            className="space-y-5 rounded-3xl border border-sky-300 bg-sky-50 p-6 lg:sticky lg:top-24"
          >
            <h2 id="facts-title" className="text-xl">
              {t('factsTitle')}
            </h2>
            <dl className="space-y-3">
              {service.type === 'transfer' && (
                <>
                  <Fact label={t('facts.from')}>{pick(service.route.from, locale)}</Fact>
                  <Fact label={t('facts.to')}>{pick(service.route.to, locale)}</Fact>
                </>
              )}
              <Fact label={t('facts.duration')}>{pick(service.duration, locale)}</Fact>
              <Fact label={t('facts.capacity')}>
                {t('capacityValue', { count: service.capacity })}
              </Fact>
              <Fact label={t('facts.price')}>
                <ServicePrice service={service} />
              </Fact>
            </dl>
            <div className="flex flex-col gap-3">
              <ButtonLink href={bookHref}>{t('requestThis')}</ButtonLink>
              <ButtonLink href={whatsappLink(t('whatsappMessage', { title }))} variant="outline">
                <WhatsAppIcon />
                {t('askWhatsapp')}
              </ButtonLink>
            </div>
            <p className="text-sm">{t('requestNote')}</p>
          </aside>
        </div>
      </Section>

      <ServiceFaq faq={service.faq} />

      {related.length > 0 && (
        <Section labelledBy="related-title">
          <h2 id="related-title">{t('relatedTitle')}</h2>
          <div className="mt-8">
            <ServiceGrid services={related} />
          </div>
        </Section>
      )}
    </>
  )
}

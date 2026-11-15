import { notFound } from 'next/navigation'
import { locales } from '@/config/site'
import { buildPageMetadata } from '@/lib/seo'
import { getPublishedServices, getServiceBySlug, pick, servicePath } from '@/lib/services'

/** generateStaticParams for a service type: every locale and published slug. */
export function serviceStaticParams(type) {
  return locales.flatMap((locale) =>
    getPublishedServices(type).map((service) => ({ locale, slug: service.slug }))
  )
}

/** Resolve the service for a route or render the not-found page. */
export function requireService(type, slug) {
  const service = getServiceBySlug(type, slug)
  if (!service) notFound()
  return service
}

/** generateMetadata for a service detail page, from the service's seo fields. */
export async function serviceMetadata({ params }, type) {
  const { locale, slug } = await params
  const service = requireService(type, slug)
  return buildPageMetadata({
    locale,
    path: servicePath(service),
    title: pick(service.seo.title, locale),
    description: pick(service.seo.description, locale),
  })
}

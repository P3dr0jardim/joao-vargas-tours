import { notFound } from 'next/navigation'
import { locales } from '@/config/site'
import { buildPageMetadata } from '@/lib/seo'
import {
  getPublishedServices,
  getServiceBySlug,
  loadCatalog,
  pick,
  servicePath,
} from '@/lib/services'

/** generateStaticParams for a service type: every locale and published slug. */
export async function serviceStaticParams(type) {
  const services = getPublishedServices(type, await loadCatalog())
  return locales.flatMap((locale) => services.map((service) => ({ locale, slug: service.slug })))
}

/** Resolve the service for a route or render the not-found page. */
export async function requireService(type, slug) {
  const service = getServiceBySlug(type, slug, await loadCatalog())
  if (!service) notFound()
  return service
}

/** generateMetadata for a service detail page, from the service's seo fields. */
export async function serviceMetadata({ params }, type) {
  const { locale, slug } = await params
  const service = await requireService(type, slug)
  return buildPageMetadata({
    locale,
    path: servicePath(service),
    title: pick(service.seo?.title, locale) || pick(service.title, locale),
    description: pick(service.seo?.description, locale) || pick(service.summary, locale),
  })
}

import { services } from '@/content/services'

/** URL section for each service type (locale-agnostic path prefix). */
const sections = { tour: '/tours', transfer: '/transfers' }

/** Services that may appear on the site. */
export function getPublishedServices(type) {
  return services.filter((s) => s.published && (!type || s.type === type))
}

export function getServiceBySlug(type, slug) {
  return getPublishedServices(type).find((s) => s.slug === slug) ?? null
}

export function getServiceById(id) {
  return getPublishedServices().find((s) => s.id === id) ?? null
}

/** Related services resolved from ids; unknown or unpublished ids are skipped. */
export function getRelatedServices(service) {
  return service.related.map(getServiceById).filter(Boolean)
}

/** Locale-agnostic path of a service page, e.g. /tours/west-madeira-tour. */
export function servicePath(service) {
  return `${sections[service.type]}/${service.slug}`
}

/** Hub path for a service type. */
export function sectionPath(type) {
  return sections[type]
}

/** Pick the string for a locale from an { en, pt } object. */
export function pick(field, locale) {
  return field[locale] ?? field.en
}

const priceLocales = { en: 'en-GB', pt: 'pt-PT' }

/** Whole-euro price, e.g. "€200" (en) or "200 €" (pt). */
export function formatPrice(amount, currency, locale) {
  return new Intl.NumberFormat(priceLocales[locale] ?? 'en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

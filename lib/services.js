import { cache } from 'react'
import { services as staticServices } from '@/content/services'
import { withTimeout } from '@/lib/http'
import { connectDb, isDbConfigured } from '@/lib/mongoose'

/** URL section for each service type (locale-agnostic path prefix). */
const sections = { tour: '/tours', transfer: '/transfers' }

/**
 * Every service (published or not), from MongoDB when it is configured and holds services,
 * otherwise from content/services.js. Loaded once per request (React cache). A database error
 * falls back to the static file so the public site never goes down with the DB.
 */
export const loadCatalog = cache(async () => {
  if (!isDbConfigured()) return staticServices
  try {
    const { default: Service } = await import('@/models/Service')
    const docs = await withTimeout(
      connectDb().then(() => Service.find().sort({ type: 1, order: 1, createdAt: 1 }).lean()),
      2500,
      'catalog'
    )
    if (docs.length === 0) return staticServices
    const { serializeService } = await import('@/lib/admin/service-input')
    return docs.map(serializeService)
  } catch (err) {
    console.error('[services] catalog load failed, using static content', {
      reason: typeof err?.name === 'string' ? err.name : 'Error',
    })
    return staticServices
  }
})

/**
 * Services that may appear on the site. The functions below take the list to search, so the
 * pages pass `await loadCatalog()`; without one they use the static content (tests, defaults).
 */
export function getPublishedServices(type, list = staticServices) {
  return list.filter((s) => s.published && (!type || s.type === type))
}

export function getServiceBySlug(type, slug, list = staticServices) {
  return getPublishedServices(type, list).find((s) => s.slug === slug) ?? null
}

export function getServiceById(id, list = staticServices) {
  return getPublishedServices(undefined, list).find((s) => s.id === id) ?? null
}

/** Levada walk drop-offs are tours whose id starts with "levada-"; they are listed as a group. */
export function isLevada(service) {
  return service.type === 'tour' && service.id.startsWith('levada-')
}

/** Related services resolved from ids; unknown or unpublished ids are skipped. */
export function getRelatedServices(service, list = staticServices) {
  return (service.related ?? []).map((id) => getServiceById(id, list)).filter(Boolean)
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
  return field?.[locale] || field?.en || ''
}

const priceLocales = { en: 'en-GB', pt: 'pt-PT' }

/** Euro price, e.g. "€200" or "€37.50" (en), "200 €" (pt). Cents only when there are any. */
export function formatPrice(amount, currency, locale) {
  const digits = Number.isInteger(amount) ? 0 : 2
  return new Intl.NumberFormat(priceLocales[locale] ?? 'en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
}

/**
 * Which prices a service shows: 'both' (one way and return), 'return' or 'oneWay'.
 * `priceTrip` set on the service (admin) wins; otherwise island tours (they start and end in
 * Calheta) are 'return' and everything else is 'both'.
 */
export function priceTrip(service) {
  if (service.priceTrip) return service.priceTrip
  return service.type === 'tour' && !isLevada(service) ? 'return' : 'both'
}

/** Stored prices (priceFrom, priceWeekend) are return trips, except for 'oneWay' services. */
export function oneWayPrice(amount) {
  return amount / 2
}

/** The single price shown in the price list: one way, except for return-only services. */
export function listPrice(service, amount) {
  return priceTrip(service) === 'both' ? oneWayPrice(amount) : amount
}

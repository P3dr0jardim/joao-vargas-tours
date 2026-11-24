import { redirect } from '@/i18n/navigation'
import { getPublishedServices, loadCatalog, servicePath } from '@/lib/services'

// The booking form is gone: requests go by WhatsApp or phone. Old /book links (and
// /book?service=<slug>) land on the service page, or on the contact page.
export default async function BookPage({ params, searchParams }) {
  const { locale } = await params
  const { service: slug } = await searchParams
  const service =
    typeof slug === 'string'
      ? getPublishedServices(undefined, await loadCatalog()).find((s) => s.slug === slug)
      : null
  redirect({ href: service ? servicePath(service) : '/contact', locale })
}

import { setRequestLocale } from 'next-intl/server'
import ServiceList from '@/components/services/ServiceList'
import { pageMetadata } from '@/lib/page-metadata'

export async function generateMetadata(props) {
  return pageMetadata(props, 'tours', '/tours')
}

export default async function ToursPage({ params }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <ServiceList type="tour" pageKey="tours" />
}

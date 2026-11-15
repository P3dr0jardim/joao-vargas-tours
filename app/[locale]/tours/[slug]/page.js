import { setRequestLocale } from 'next-intl/server'
import ServiceDetail from '@/components/services/ServiceDetail'
import { requireService, serviceMetadata, serviceStaticParams } from '@/lib/service-page'

export function generateStaticParams() {
  return serviceStaticParams('tour')
}

export async function generateMetadata(props) {
  return serviceMetadata(props, 'tour')
}

export default async function ToursDetailPage({ params }) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  return <ServiceDetail service={requireService('tour', slug)} />
}

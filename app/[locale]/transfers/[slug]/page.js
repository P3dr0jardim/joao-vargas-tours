import { setRequestLocale } from 'next-intl/server'
import ServiceDetail from '@/components/services/ServiceDetail'
import { requireService, serviceMetadata, serviceStaticParams } from '@/lib/service-page'

export function generateStaticParams() {
  return serviceStaticParams('transfer')
}

export async function generateMetadata(props) {
  return serviceMetadata(props, 'transfer')
}

export default async function TransfersDetailPage({ params }) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  return <ServiceDetail service={await requireService('transfer', slug)} />
}

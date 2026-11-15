import { setRequestLocale } from 'next-intl/server'
import ServiceList from '@/components/services/ServiceList'
import { pageMetadata } from '@/lib/page-metadata'

export async function generateMetadata(props) {
  return pageMetadata(props, 'transfers', '/transfers')
}

export default async function TransfersPage({ params }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <ServiceList type="transfer" pageKey="transfers" />
}

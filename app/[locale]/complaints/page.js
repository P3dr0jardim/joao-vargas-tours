import { setRequestLocale } from 'next-intl/server'
import StubPage from '@/components/ui/StubPage'
import { pageMetadata } from '@/lib/page-metadata'

export async function generateMetadata(props) {
  return pageMetadata(props, 'complaints', '/complaints')
}

export default async function ComplaintsPage({ params }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <StubPage pageKey="complaints" />
}

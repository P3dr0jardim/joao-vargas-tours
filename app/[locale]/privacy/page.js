import { setRequestLocale } from 'next-intl/server'
import StubPage from '@/components/ui/StubPage'
import { pageMetadata } from '@/lib/page-metadata'

export async function generateMetadata(props) {
  return pageMetadata(props, 'privacy', '/privacy')
}

export default async function PrivacyPage({ params }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <StubPage pageKey="privacy" />
}

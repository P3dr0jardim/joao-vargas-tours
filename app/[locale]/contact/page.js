import { setRequestLocale } from 'next-intl/server'
import StubPage from '@/components/ui/StubPage'
import { pageMetadata } from '@/lib/page-metadata'

export async function generateMetadata(props) {
  return pageMetadata(props, 'contact', '/contact')
}

export default async function ContactPage({ params }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <StubPage pageKey="contact" />
}

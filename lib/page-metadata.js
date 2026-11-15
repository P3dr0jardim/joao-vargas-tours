import { getTranslations } from 'next-intl/server'
import { buildPageMetadata } from '@/lib/seo'

/** generateMetadata helper for pages whose title/description live in Pages.<pageKey>. */
export async function pageMetadata({ params }, pageKey, path) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: `Pages.${pageKey}` })
  return buildPageMetadata({
    locale,
    path,
    title: t('title'),
    description: t('description'),
  })
}

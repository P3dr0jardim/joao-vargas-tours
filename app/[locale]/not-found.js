import { getTranslations } from 'next-intl/server'
import ButtonLink from '@/components/ui/ButtonLink'

export default async function NotFound() {
  const t = await getTranslations('NotFound')

  return (
    <div className="mx-auto max-w-content px-4 py-24 sm:px-6 lg:px-8">
      <h1>{t('title')}</h1>
      <p className="mt-4 max-w-prose">{t('text')}</p>
      <ButtonLink href="/" className="mt-8">
        {t('home')}
      </ButtonLink>
    </div>
  )
}

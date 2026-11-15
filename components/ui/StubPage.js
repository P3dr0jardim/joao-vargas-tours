import { getTranslations } from 'next-intl/server'
import ButtonLink from '@/components/ui/ButtonLink'

/** Placeholder page body: title and intro from messages under Pages.<pageKey>. */
export default async function StubPage({ pageKey, showBookingCta = true }) {
  const t = await getTranslations('Pages')
  const common = await getTranslations('Common')

  return (
    <div className="mx-auto max-w-content px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <h1>{t(`${pageKey}.title`)}</h1>
      <p className="mt-5 max-w-prose text-lg">{t(`${pageKey}.intro`)}</p>
      {showBookingCta && (
        <ButtonLink href="/book" className="mt-8">
          {common('requestBooking')}
        </ButtonLink>
      )}
    </div>
  )
}

import { getTranslations, setRequestLocale } from 'next-intl/server'
import { whatsappLink } from '@/config/site'
import { sanitiseRef } from '@/components/booking/booking-helpers'
import ButtonLink from '@/components/ui/ButtonLink'
import Section from '@/components/ui/Section'
import { CheckIcon, WhatsAppIcon } from '@/components/ui/icons'
import { buildPageMetadata } from '@/lib/seo'

/** Always noindex, whatever SITE_INDEXING says: it is a post-submit page with a personal reference. */
export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Pages.thankYou' })
  return {
    ...buildPageMetadata({
      locale,
      path: '/book/thank-you',
      title: t('title'),
      description: t('description'),
    }),
    robots: { index: false, follow: false },
  }
}

export default async function ThankYouPage({ params, searchParams }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Booking.thanks')
  const ref = sanitiseRef((await searchParams).ref)

  const message = ref ? t('whatsappMessage', { ref }) : t('whatsappMessageNoRef')

  return (
    <Section labelledBy="thanks-title">
      <div className="max-w-2xl">
        <h1 id="thanks-title" className="flex items-center gap-3">
          <CheckIcon className="h-9 w-9 shrink-0 text-blue-600" aria-hidden="true" />
          {t('title')}
        </h1>

        {ref ? (
          <div className="mt-6 rounded-3xl border border-sky-300 bg-sky-50 p-6">
            <p className="text-sm font-semibold">{t('refLabel')}</p>
            <p className="mt-1 break-all font-heading text-3xl font-semibold text-blue-800">
              {ref}
            </p>
            <p className="mt-2 text-sm">{t('refHint')}</p>
          </div>
        ) : (
          <p className="mt-6">{t('noRef')}</p>
        )}

        <p className="mt-6 text-lg font-semibold text-blue-800">{t('notConfirmed')}</p>
        <p className="mt-2 text-lg">{t('next')}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={whatsappLink(message)} aria-label={t('whatsappAria')}>
            <WhatsAppIcon />
            {t('whatsappButton')}
          </ButtonLink>
          <ButtonLink href="/" variant="outline">
            {t('home')}
          </ButtonLink>
        </div>
      </div>
    </Section>
  )
}

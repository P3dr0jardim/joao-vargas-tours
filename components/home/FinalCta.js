import { getTranslations } from 'next-intl/server'
import Section from '@/components/ui/Section'
import ButtonLink from '@/components/ui/ButtonLink'
import { WhatsAppIcon } from '@/components/ui/icons'
import { whatsappLink } from '@/config/site'

export default async function FinalCta() {
  const t = await getTranslations()

  return (
    <Section labelledBy="cta-title" tone="skyStrong">
      <div className="max-w-2xl">
        <h2 id="cta-title">{t('Home.cta.title')}</h2>
        <p className="mt-3">{t('Home.cta.text')}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/book">{t('Home.cta.button')}</ButtonLink>
          <ButtonLink href={whatsappLink()} variant="outline" aria-label={t('Common.whatsappAria')}>
            <WhatsAppIcon />
            {t('Common.whatsapp')}
          </ButtonLink>
        </div>
      </div>
    </Section>
  )
}

import { getTranslations, setRequestLocale } from 'next-intl/server'
import ButtonLink from '@/components/ui/ButtonLink'
import Section from '@/components/ui/Section'
import { PhoneIcon, WhatsAppIcon } from '@/components/ui/icons'
import { siteConfig, whatsappLink } from '@/config/site'
import { pageMetadata } from '@/lib/page-metadata'

export async function generateMetadata(props) {
  return pageMetadata(props, 'contact', '/contact')
}

/** No forms: every request goes to João by WhatsApp (prefilled message) or by phone. */
export default async function ContactPage({ params }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Pages.contact')
  const common = await getTranslations('Common')

  return (
    <Section labelledBy="contact-title">
      <h1 id="contact-title">{t('title')}</h1>
      <p className="mt-5 max-w-prose text-lg">{t('intro')}</p>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <section
          aria-labelledby="contact-whatsapp"
          className="flex flex-col gap-4 rounded-3xl border border-sky-300 bg-white p-6"
        >
          <h2 id="contact-whatsapp" className="text-2xl">
            {t('whatsappTitle')}
          </h2>
          <p>{t('whatsappText')}</p>
          <ButtonLink
            href={whatsappLink(t('whatsappMessage'))}
            aria-label={common('whatsappAria')}
            className="mt-auto"
          >
            <WhatsAppIcon />
            {common('whatsapp')}
          </ButtonLink>
        </section>
        <section
          aria-labelledby="contact-phone"
          className="flex flex-col gap-4 rounded-3xl border border-sky-300 bg-white p-6"
        >
          <h2 id="contact-phone" className="text-2xl">
            {t('phoneTitle')}
          </h2>
          <p>{t('phoneText')}</p>
          <ButtonLink href={siteConfig.phone.href} variant="outline" className="mt-auto">
            <PhoneIcon />
            {siteConfig.phone.display}
          </ButtonLink>
        </section>
        <section
          aria-labelledby="contact-base"
          className="flex flex-col gap-4 rounded-3xl bg-sky-50 p-6"
        >
          <h2 id="contact-base" className="text-2xl">
            {t('baseTitle')}
          </h2>
          <p>{t('baseText')}</p>
        </section>
      </div>
    </Section>
  )
}

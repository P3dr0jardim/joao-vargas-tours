import { getLocale, getTranslations } from 'next-intl/server'
import { siteConfig, whatsappLink } from '@/config/site'
import { pick } from '@/lib/services'
import ButtonLink from '@/components/ui/ButtonLink'
import { PhoneIcon, WhatsAppIcon } from '@/components/ui/icons'

/** WhatsApp link with a message that already names the service and asks for date and people. */
export async function serviceWhatsappHref(service) {
  const t = await getTranslations('Services')
  const locale = await getLocale()
  return whatsappLink(t('whatsappMessage', { title: pick(service.title, locale) }))
}

/**
 * The two ways to request a service: WhatsApp with a prefilled message, or a phone call.
 * There is no booking form. `className` positions the group (cards lift it above the card link).
 */
export default async function ServiceContact({ service, stacked = false, className = '' }) {
  const t = await getTranslations('Services')
  const locale = await getLocale()
  const title = pick(service.title, locale)

  return (
    <div className={`flex gap-3 ${stacked ? 'flex-col' : 'flex-wrap'} ${className}`}>
      <ButtonLink
        href={await serviceWhatsappHref(service)}
        aria-label={t('whatsappAria', { title })}
        className={stacked ? '' : 'flex-1'}
      >
        <WhatsAppIcon />
        {t('requestThis')}
      </ButtonLink>
      <ButtonLink
        href={siteConfig.phone.href}
        variant="outline"
        className={stacked ? '' : 'flex-1'}
      >
        <PhoneIcon />
        {t('callJoao')}
      </ButtonLink>
    </div>
  )
}

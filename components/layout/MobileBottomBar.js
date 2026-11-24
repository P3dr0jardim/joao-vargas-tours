import { getTranslations } from 'next-intl/server'
import { siteConfig, whatsappLink } from '@/config/site'
import ButtonLink from '@/components/ui/ButtonLink'
import { PhoneIcon, WhatsAppIcon } from '@/components/ui/icons'

/** Sticky bottom bar on mobile: WhatsApp and a phone call, the only ways to book. Hidden from `lg` up. */
export default async function MobileBottomBar() {
  const t = await getTranslations()

  return (
    <div
      role="region"
      aria-label={t('BottomBar.label')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sky-100 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-content gap-3">
        <ButtonLink
          href={whatsappLink(t('Pages.contact.whatsappMessage'))}
          aria-label={t('Common.whatsappAria')}
          className="flex-1"
        >
          <WhatsAppIcon />
          {t('Common.whatsapp')}
        </ButtonLink>
        <ButtonLink
          href={siteConfig.phone.href}
          variant="outline"
          aria-label={t('Common.callAria')}
          className="flex-1"
        >
          <PhoneIcon />
          {t('Common.call')}
        </ButtonLink>
      </div>
    </div>
  )
}

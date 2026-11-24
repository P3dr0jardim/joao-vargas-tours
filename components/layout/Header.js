import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { siteConfig, whatsappLink } from '@/config/site'
import ButtonLink from '@/components/ui/ButtonLink'
import Wordmark from '@/components/ui/Wordmark'
import { PhoneIcon, WhatsAppIcon } from '@/components/ui/icons'
import LanguageSwitch from './LanguageSwitch'
import MobileMenu from './MobileMenu'

export default async function Header() {
  const t = await getTranslations()

  return (
    <header className="sticky top-0 z-40 border-b border-sky-100 bg-white/95 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Link href="/" aria-label={t('Header.homeAria')} className="shrink-0 rounded-md">
          <Wordmark />
        </Link>

        <nav aria-label={t('Header.mainNav')} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {siteConfig.nav.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-full px-4 font-medium text-blue-800 hover:bg-sky-50"
                >
                  {t(`Nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageSwitch />
          <a
            href={siteConfig.phone.href}
            className="hidden min-h-11 items-center gap-2 rounded-full px-3 font-medium text-blue-800 hover:bg-sky-50 xl:inline-flex"
          >
            <PhoneIcon />
            {siteConfig.phone.display}
          </a>
          <ButtonLink
            href={whatsappLink(t('Pages.contact.whatsappMessage'))}
            aria-label={t('Common.whatsappAria')}
            className="hidden sm:inline-flex"
          >
            <WhatsAppIcon />
            {t('Common.whatsapp')}
          </ButtonLink>
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}

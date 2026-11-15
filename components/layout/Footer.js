import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { siteConfig } from '@/config/site'
import { MailIcon, PhoneIcon, WhatsAppIcon } from '@/components/ui/icons'
import Wordmark from '@/components/ui/Wordmark'

const linkClass = 'inline-flex min-h-11 items-center gap-2 hover:underline'

export default async function Footer() {
  const t = await getTranslations()
  const { company } = siteConfig

  return (
    <footer className="on-dark bg-blue-800 pb-24 text-white lg:pb-0">
      <div className="mx-auto grid max-w-content gap-10 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
        <div className="space-y-4">
          <Wordmark light />
          <p className="max-w-xs text-sky-100">{t('Footer.tagline')}</p>
        </div>

        <div>
          <h2 className="mb-2 !text-base !text-white">{t('Footer.contactTitle')}</h2>
          <ul>
            <li>
              <a href={siteConfig.phone.href} className={linkClass}>
                <PhoneIcon />
                {siteConfig.phone.display}
              </a>
            </li>
            <li>
              <a
                href={siteConfig.whatsapp.href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                <WhatsAppIcon />
                {t('Common.whatsapp')}
              </a>
            </li>
            <li>
              <a href={`mailto:${siteConfig.email}`} className={linkClass}>
                <MailIcon />
                {siteConfig.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 !text-base !text-white">{t('Footer.legalTitle')}</h2>
          <ul>
            {siteConfig.legalLinks.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className={linkClass}>
                  {t(`Legal.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/20">
        <div className="mx-auto max-w-content space-y-1 px-4 py-6 text-sm text-sky-100 sm:px-6 lg:px-8">
          {/* TODO: replace placeholders with the real licence numbers from João */}
          <p>
            {t('Footer.company')}: {company.name} · {t('Footer.nif')}: {company.nif}
          </p>
          <p>
            {t('Footer.rnaat')}: {company.rnaat} · {t('Footer.taxiLicence')}: {company.taxiLicence}
          </p>
          <p>
            © {new Date().getFullYear()} {siteConfig.brand}. {t('Footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  )
}

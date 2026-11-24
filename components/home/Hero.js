import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import ButtonLink from '@/components/ui/ButtonLink'
import { WhatsAppIcon } from '@/components/ui/icons'
import { siteConfig, whatsappLink } from '@/config/site'

export default async function Hero() {
  const t = await getTranslations()

  return (
    <section
      aria-labelledby="hero-title"
      className="on-dark relative isolate flex min-h-[80svh] items-end overflow-hidden bg-blue-800 text-white"
    >
      <Image
        src="/images/hero.webp"
        alt={t('Home.hero.imageAlt')}
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover"
      />
      {/* Dark scrim keeps the white text above AA contrast over the bright sea and sky */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-ink/55 to-ink/10"
      />
      <div className="mx-auto flex w-full max-w-content flex-col gap-10 px-4 pb-14 pt-32 sm:px-6 md:pb-20 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div>
          <h1 id="hero-title" className="max-w-3xl !text-white">
            {t('Home.hero.title')}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white">{t('Home.hero.subtitle')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href={whatsappLink(t('Pages.contact.whatsappMessage'))}
              variant="light"
              aria-label={t('Common.whatsappAria')}
            >
              <WhatsAppIcon />
              {t('Common.requestBooking')}
            </ButtonLink>
            <ButtonLink href="/tours" variant="ghostLight">
              {t('Common.seeTours')}
            </ButtonLink>
          </div>
        </div>
        <aside
          aria-label={t('Home.hero.driver.label')}
          className="flex w-full max-w-sm items-center gap-4 rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur"
        >
          <Image
            src="/images/joao.jpg"
            alt={t('Home.about.imageAlt')}
            width={96}
            height={96}
            sizes="96px"
            className="h-24 w-24 shrink-0 rounded-full bg-sky-100 object-cover object-top"
          />
          <div className="text-ink">
            <p className="text-sm font-medium text-blue-600">{t('Home.hero.driver.label')}</p>
            <p className="font-heading text-lg font-semibold text-blue-800">João Vargas</p>
            <p className="text-sm">{t('Home.hero.driver.role')}</p>
            <a
              href={siteConfig.phone.href}
              className="mt-1 inline-block text-sm font-medium text-blue-600 underline underline-offset-2"
            >
              {siteConfig.phone.display}
            </a>
          </div>
        </aside>
      </div>
    </section>
  )
}

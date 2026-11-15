import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import ButtonLink from '@/components/ui/ButtonLink'

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
      <div className="mx-auto w-full max-w-content px-4 pb-14 pt-32 sm:px-6 md:pb-20 lg:px-8">
        <h1 id="hero-title" className="max-w-3xl !text-white">
          {t('Home.hero.title')}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-white">{t('Home.hero.subtitle')}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/book" variant="light">
            {t('Common.requestBooking')}
          </ButtonLink>
          <ButtonLink href="/tours" variant="ghostLight">
            {t('Common.seeTours')}
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}

import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import Section from '@/components/ui/Section'
import ButtonLink from '@/components/ui/ButtonLink'
import { WhatsAppIcon } from '@/components/ui/icons'
import { whatsappLink } from '@/config/site'

export default async function AboutDriver() {
  const t = await getTranslations('Home.about')
  const contact = await getTranslations('Pages.contact')

  return (
    <Section id="about" labelledBy="about-title">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
        {/* The portrait has a white background: multiply blends it into the light-blue arch */}
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-t-full bg-sky-100">
          <Image
            src="/images/joao.jpg"
            alt={t('imageAlt')}
            width={900}
            height={1351}
            sizes="(min-width: 768px) 384px, 90vw"
            className="aspect-[4/5] w-full object-cover object-[50%_18%] mix-blend-multiply"
          />
        </div>
        <div className="space-y-4">
          <h2 id="about-title">{t('title')}</h2>
          <p>{t('text1')}</p>
          <p>{t('text2')}</p>
          <ButtonLink href={whatsappLink(contact('whatsappMessage'))} className="mt-4">
            <WhatsAppIcon />
            {t('cta')}
          </ButtonLink>
        </div>
      </div>
    </Section>
  )
}

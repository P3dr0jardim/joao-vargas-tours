import { getTranslations } from 'next-intl/server'
import Section from '@/components/ui/Section'

// Empty state until real reviews exist (with guest consent). No star-rating markup.
export default async function Testimonials() {
  const t = await getTranslations('Home.testimonials')

  return (
    <Section labelledBy="testimonials-title">
      <h2 id="testimonials-title">{t('title')}</h2>
      <p className="mt-8 rounded-3xl border-2 border-dashed border-sky-300 p-8 text-center">
        {t('empty')}
      </p>
    </Section>
  )
}

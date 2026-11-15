import { getTranslations } from 'next-intl/server'
import Section from '@/components/ui/Section'

const reasons = ['private', 'local', 'flexible', 'licensed']

export default async function WhyUs() {
  const t = await getTranslations('Home.why')

  return (
    <Section labelledBy="why-title" tone="sky">
      <h2 id="why-title">{t('title')}</h2>
      <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {reasons.map((key) => (
          <li key={key} className="border-t-4 border-sky-300 pt-4">
            <h3>{t(`${key}.title`)}</h3>
            <p className="mt-2">{t(`${key}.text`)}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

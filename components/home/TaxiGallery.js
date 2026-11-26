import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import Section from '@/components/ui/Section'

// João's taxi (Calheta licence 0724). The first photo is the large one; alts live in messages.
const photos = [
  { key: 'joao', src: '/images/taxi-joao.webp' },
  { key: 'side', src: '/images/taxi-side.webp' },
  { key: 'front', src: '/images/taxi-front.webp' },
  { key: 'door', src: '/images/taxi-door.webp' },
]

/** Photo grid of João's taxi: one large photo and three smaller ones (stacked on phones). */
export default async function TaxiGallery() {
  const t = await getTranslations('Home.taxi')

  return (
    <Section labelledBy="taxi-title" tone="skyStrong">
      <h2 id="taxi-title">{t('title')}</h2>
      <p className="mt-3 max-w-2xl">{t('intro')}</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:grid-rows-3 lg:gap-6">
        {photos.map((photo, i) => (
          <div
            key={photo.key}
            className={`relative aspect-[3/2] overflow-hidden rounded-3xl bg-sky-50 ${
              i === 0 ? 'sm:col-span-2 sm:row-span-3 sm:aspect-auto' : ''
            }`}
          >
            <Image
              src={photo.src}
              alt={t(`alt.${photo.key}`)}
              fill
              sizes={i === 0 ? '(min-width: 640px) 66vw, 100vw' : '(min-width: 640px) 33vw, 100vw'}
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </Section>
  )
}

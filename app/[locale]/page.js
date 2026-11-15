import { setRequestLocale } from 'next-intl/server'
import Hero from '@/components/home/Hero'
import FeaturedServices from '@/components/home/FeaturedServices'
import AboutDriver from '@/components/home/AboutDriver'
import WhyUs from '@/components/home/WhyUs'
import Testimonials from '@/components/home/Testimonials'
import FinalCta from '@/components/home/FinalCta'

// Metadata (title, description, canonical, hreflang) comes from the locale layout.
export default async function HomePage({ params }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <Hero />
      <FeaturedServices />
      <AboutDriver />
      <WhyUs />
      <Testimonials />
      <FinalCta />
    </>
  )
}

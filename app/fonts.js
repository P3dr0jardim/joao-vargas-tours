import { Inter, Poppins } from 'next/font/google'

// Self-hosted by next/font at build time: no request to Google at runtime.
export const headingFont = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-heading',
})

export const bodyFont = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
})

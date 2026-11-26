/**
 * Central site configuration. Non-secret values only.
 * Anything marked TODO is a placeholder that must be confirmed with João before launch.
 */
export const locales = ['en', 'pt']
export const defaultLocale = 'en'

/** BCP 47 tags used for <html lang> and hreflang. */
export const localeTags = { en: 'en', pt: 'pt-PT' }
/** Open Graph locales. */
export const ogLocales = { en: 'en_GB', pt: 'pt_PT' }
/** Language names shown in the switcher, each in its own language. */
export const localeLabels = { en: 'English', pt: 'Português' }

/**
 * Search engine indexing switch. Off unless SITE_INDEXING=on, so placeholder content and preview
 * deployments are never indexed by accident. Switch it on at launch, once real content is in.
 */
export const indexingEnabled = process.env.SITE_INDEXING === 'on'

const whatsappNumber = process.env.NEXT_PUBLIC_DRIVER_WHATSAPP_NUMBER || '351966167435'

export const siteConfig = {
  brand: 'João Vargas Tours',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  phone: { display: '+351 966 167 435', href: 'tel:+351966167435' },
  whatsapp: { number: whatsappNumber, href: `https://wa.me/${whatsappNumber}` },
  // TODO: confirm the real values with João
  email: 'TODO@example.com',
  company: {
    name: 'João Vargas, Unipessoal Lda',
    nipc: '515474177',
    taxiLicence: '0724',
    address: 'Estrada Simão Gonçalves da Câmara, n.º 116, 9370-139 Calheta, Madeira',
  },
  /** Nav items. `href` is locale-agnostic; labels live in messages under Nav.<key>. */
  nav: [
    { key: 'tours', href: '/tours' },
    { key: 'transfers', href: '/transfers' },
    { key: 'about', href: '/#about' },
    { key: 'info', href: '/info' },
    { key: 'contact', href: '/contact' },
  ],
  legalLinks: [
    { key: 'privacy', href: '/privacy' },
    { key: 'terms', href: '/terms' },
    { key: 'cookies', href: '/cookies' },
    { key: 'complaints', href: '/complaints' },
  ],
  /** Every indexable route (without locale prefix). Used by the sitemap. */
  routes: [
    '/',
    '/tours',
    '/transfers',
    '/info',
    '/contact',
    '/privacy',
    '/terms',
    '/cookies',
    '/complaints',
  ],
}

/** Build a WhatsApp deep link with an optional prefilled message. */
export function whatsappLink(text) {
  const base = siteConfig.whatsapp.href
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

import { defineRouting } from 'next-intl/routing'
import { defaultLocale, locales } from '@/config/site'

// English lives at "/", Portuguese at "/pt". The locale is detected from the
// Accept-Language header (and remembered in a cookie) on the first visit.
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
})

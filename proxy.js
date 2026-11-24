import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Next.js 16 renamed "middleware" to "proxy". It handles locale detection and redirects.
export default createMiddleware(routing)

export const config = {
  // Skip API routes, the admin panel (not translated), Next internals and files with an extension
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)'],
}

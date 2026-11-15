import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Next.js 16 renamed "middleware" to "proxy". It handles locale detection and redirects.
export default createMiddleware(routing)

export const config = {
  // Skip API routes, Next internals and files with an extension (images, favicon, etc.)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}

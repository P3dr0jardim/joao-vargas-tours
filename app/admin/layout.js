import { bodyFont, headingFont } from '../fonts'
import '../globals.css'

// Separate root layout: the admin panel is Portuguese only and lives outside the locale routes.
export const metadata = {
  title: { default: 'Admin', template: '%s | Admin João Vargas Tours' },
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }) {
  return (
    <html lang="pt-PT" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body className="bg-sky-50">{children}</body>
    </html>
  )
}

import { Link } from '@/i18n/navigation'

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold transition-colors'

const variants = {
  // White text on blue-600 (AA)
  primary: 'bg-blue-600 text-white hover:bg-blue-800',
  outline: 'border-2 border-blue-600 bg-white text-blue-800 hover:bg-sky-100',
  // For dark photo or blue-800 surfaces
  light: 'bg-white text-blue-800 hover:bg-sky-100',
  ghostLight: 'border-2 border-white text-white hover:bg-white/15',
}

/**
 * Link styled as a button. Internal paths use the locale-aware Link,
 * absolute URLs (https:, tel:, mailto:) render a plain anchor.
 */
export default function ButtonLink({
  href,
  variant = 'primary',
  className = '',
  children,
  ...rest
}) {
  const classes = `${base} ${variants[variant]} ${className}`
  const external = /^(https?:|tel:|mailto:)/.test(href)

  if (external) {
    const isWeb = href.startsWith('http')
    return (
      <a
        href={href}
        className={classes}
        {...(isWeb ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...rest}
      >
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  )
}

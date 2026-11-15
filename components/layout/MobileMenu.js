'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { siteConfig } from '@/config/site'
import { CloseIcon, MenuIcon } from '@/components/ui/icons'

/** Menu button and dropdown panel for screens below `lg`. */
export default function MobileMenu() {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)

  // Escape closes the menu and returns focus to the button.
  useEffect(() => {
    if (!open) return
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-11 items-center justify-center rounded-full text-blue-800 hover:bg-sky-100"
      >
        <span className="sr-only">{open ? t('Header.closeMenu') : t('Header.openMenu')}</span>
        {open ? <CloseIcon width={24} height={24} /> : <MenuIcon width={24} height={24} />}
      </button>

      {open && (
        <nav
          id="mobile-menu"
          aria-label={t('Header.mainNav')}
          className="absolute inset-x-0 top-full border-b border-sky-100 bg-white shadow-lg"
        >
          <ul className="mx-auto max-w-content px-4 py-2 sm:px-6">
            {siteConfig.nav.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center border-b border-sky-50 font-medium text-blue-800 last:border-0"
                >
                  {t(`Nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}

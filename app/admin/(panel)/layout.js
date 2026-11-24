import Link from 'next/link'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/admin/LogoutButton'
import NotConfigured from '@/components/admin/NotConfigured'
import Wordmark from '@/components/ui/Wordmark'
import { getAdmin, isAdminConfigured } from '@/lib/admin/session'

export const dynamic = 'force-dynamic'

/** Every page in this group requires a signed-in admin. */
export default async function AdminPanelLayout({ children }) {
  if (!isAdminConfigured()) return <NotConfigured />
  const admin = await getAdmin()
  if (!admin) redirect('/admin/login')

  return (
    <>
      <header className="border-b border-sky-100 bg-white">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/admin" aria-label="Painel: serviços">
            <Wordmark />
          </Link>
          <nav aria-label="Painel" className="flex flex-wrap items-center gap-5">
            <Link
              href="/admin"
              className="font-semibold text-blue-800 underline-offset-4 hover:underline"
            >
              Serviços
            </Link>
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="font-semibold text-blue-800 underline-offset-4 hover:underline"
            >
              Ver site
            </a>
            <span className="text-sm text-ink">{admin.email}</span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-content px-4 py-10">{children}</main>
    </>
  )
}

import { redirect } from 'next/navigation'
import LoginForm from '@/components/admin/LoginForm'
import NotConfigured from '@/components/admin/NotConfigured'
import Wordmark from '@/components/ui/Wordmark'
import { getAdmin, isAdminConfigured } from '@/lib/admin/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Entrar' }

export default async function AdminLoginPage() {
  if (!isAdminConfigured()) return <NotConfigured />
  if (await getAdmin()) redirect('/admin')

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Wordmark />
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="mb-6 text-2xl">Entrar no painel</h1>
          <LoginForm />
        </div>
      </div>
    </main>
  )
}

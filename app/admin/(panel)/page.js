import Link from 'next/link'
import ImportButton from '@/components/admin/ImportButton'
import { primaryButton } from '@/components/admin/styles'
import { serializeService } from '@/lib/admin/service-input'
import { requireAdminPage } from '@/lib/admin/session'
import { connectDb } from '@/lib/mongoose'
import { formatPrice, servicePath } from '@/lib/services'
import Service from '@/models/Service'

export const metadata = { title: 'Serviços' }

const groups = [
  { type: 'tour', title: 'Tours' },
  { type: 'transfer', title: 'Transfers' },
]

export default async function AdminServicesPage() {
  await requireAdminPage()
  await connectDb()
  const services = (await Service.find().sort({ type: 1, order: 1, createdAt: 1 }).lean()).map(
    serializeService
  )

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Serviços</h1>
          <p className="mt-2">
            Tours e transfers mostrados no site. As alterações ficam visíveis logo após guardar.
          </p>
        </div>
        <Link href="/admin/services/new" className={primaryButton}>
          Novo serviço
        </Link>
      </div>

      {services.length === 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl">Ainda não há serviços na base de dados</h2>
          <p className="mt-2">
            Enquanto a lista estiver vazia, o site mostra os serviços de exemplo do código.
            Importe-os para os poder editar aqui.
          </p>
          <div className="mt-4">
            <ImportButton />
          </div>
        </div>
      )}

      {groups.map(({ type, title }) => {
        const list = services.filter((s) => s.type === type)
        if (list.length === 0) return null
        return (
          <section key={type} aria-labelledby={`group-${type}`}>
            <h2 id={`group-${type}`} className="mb-4 text-2xl">
              {title}
            </h2>
            <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-left">
                <thead className="border-b border-sky-100 text-sm text-blue-800">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Preço desde</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Ordem</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s._id} className="border-b border-sky-100 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{s.title?.pt || s.title?.en}</div>
                        <div className="text-sm text-blue-600">{servicePath(s)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {s.priceFrom != null
                          ? formatPrice(s.priceFrom, s.currency || 'EUR', 'pt')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${
                            s.published ? 'bg-sky-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {s.published ? 'Publicado' : 'Rascunho'}
                        </span>
                        {s.placeholder && (
                          <span className="ml-2 text-sm text-ink">(provisório)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{s.order}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/services/${s._id}`}
                          className="font-semibold text-blue-800 underline"
                          aria-label={`Editar ${s.title?.pt || s.title?.en}`}
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}

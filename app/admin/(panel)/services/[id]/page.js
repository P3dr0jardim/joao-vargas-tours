import { notFound } from 'next/navigation'
import ServiceEditor from '@/components/admin/ServiceEditor'
import { serializeService } from '@/lib/admin/service-input'
import { requireAdminPage } from '@/lib/admin/session'
import { connectDb } from '@/lib/mongoose'
import Service from '@/models/Service'

export const metadata = { title: 'Editar serviço' }

export default async function EditServicePage({ params }) {
  await requireAdminPage()
  const { id } = await params
  if (!/^[a-f0-9]{24}$/.test(id)) notFound()
  await connectDb()
  const doc = await Service.findById(id).lean()
  if (!doc) notFound()
  const others = await Service.find({ _id: { $ne: doc._id } }, { id: 1, title: 1, type: 1 })
    .sort({ type: 1, order: 1 })
    .lean()

  return (
    <ServiceEditor
      initial={serializeService(doc)}
      others={others.map((s) => ({ id: s.id, type: s.type, title: s.title?.pt || s.title?.en }))}
    />
  )
}

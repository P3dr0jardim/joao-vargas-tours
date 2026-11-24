import ServiceEditor from '@/components/admin/ServiceEditor'
import { requireAdminPage } from '@/lib/admin/session'
import { connectDb } from '@/lib/mongoose'
import Service from '@/models/Service'

export const metadata = { title: 'Novo serviço' }

export default async function NewServicePage() {
  await requireAdminPage()
  await connectDb()
  const others = await Service.find({}, { id: 1, title: 1, type: 1 })
    .sort({ type: 1, order: 1 })
    .lean()

  return (
    <ServiceEditor
      others={others.map((s) => ({ id: s.id, type: s.type, title: s.title?.pt || s.title?.en }))}
    />
  )
}

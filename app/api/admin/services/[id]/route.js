import { duplicateField, json, readJson, refreshSite, requireAdmin } from '@/lib/admin/api'
import { parseServiceInput, serializeService } from '@/lib/admin/service-input'
import { connectDb } from '@/lib/mongoose'
import Service from '@/models/Service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const validId = (id) => /^[a-f0-9]{24}$/.test(id)
const notFound = () => json(404, { ok: false, code: 'NOT_FOUND' })

export async function GET(request, { params }) {
  const { response } = await requireAdmin(request)
  if (response) return response
  const { id } = await params
  if (!validId(id)) return notFound()
  await connectDb()
  const doc = await Service.findById(id).lean()
  return doc ? json(200, { ok: true, service: serializeService(doc) }) : notFound()
}

export async function PUT(request, { params }) {
  const { response } = await requireAdmin(request)
  if (response) return response
  const { id } = await params
  if (!validId(id)) return notFound()

  const parsed = parseServiceInput(await readJson(request))
  if (!parsed.success) return json(400, { ok: false, errors: parsed.errors })

  await connectDb()
  try {
    const doc = await Service.findByIdAndReplace(id, parsed.data, {
      returnDocument: 'after',
      runValidators: true,
    }).lean()
    if (!doc) return notFound()
    refreshSite()
    return json(200, { ok: true, service: serializeService(doc) })
  } catch (err) {
    const field = duplicateField(err)
    if (field) return json(409, { ok: false, errors: { [field]: 'taken' } })
    throw err
  }
}

export async function DELETE(request, { params }) {
  const { response } = await requireAdmin(request)
  if (response) return response
  const { id } = await params
  if (!validId(id)) return notFound()
  await connectDb()
  const doc = await Service.findByIdAndDelete(id).lean()
  if (!doc) return notFound()
  // Drop the deleted id from every `related` list so no page points at it.
  await Service.updateMany({ related: doc.id }, { $pull: { related: doc.id } })
  refreshSite()
  return json(200, { ok: true })
}

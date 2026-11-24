import { duplicateField, json, readJson, refreshSite, requireAdmin } from '@/lib/admin/api'
import { parseServiceInput, serializeService } from '@/lib/admin/service-input'
import { connectDb } from '@/lib/mongoose'
import Service from '@/models/Service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** All services, tours first, in display order. */
export async function GET(request) {
  const { response } = await requireAdmin(request)
  if (response) return response
  await connectDb()
  const docs = await Service.find().sort({ type: 1, order: 1, createdAt: 1 }).lean()
  return json(200, { ok: true, services: docs.map(serializeService) })
}

export async function POST(request) {
  const { response } = await requireAdmin(request)
  if (response) return response

  const parsed = parseServiceInput(await readJson(request))
  if (!parsed.success) return json(400, { ok: false, errors: parsed.errors })

  await connectDb()
  try {
    const doc = await Service.create(parsed.data)
    refreshSite()
    return json(201, { ok: true, service: serializeService(doc.toObject()) })
  } catch (err) {
    const field = duplicateField(err)
    if (field) return json(409, { ok: false, errors: { [field]: 'taken' } })
    throw err
  }
}

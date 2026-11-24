import { json, refreshSite, requireAdmin } from '@/lib/admin/api'
import { parseServiceInput } from '@/lib/admin/service-input'
import { services as staticServices } from '@/content/services'
import { connectDb } from '@/lib/mongoose'
import Service from '@/models/Service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Copy the services from content/services.js into an EMPTY collection (first setup).
 * Refuses when services already exist, so it can never overwrite edits made in the panel.
 */
export async function POST(request) {
  const { response } = await requireAdmin(request)
  if (response) return response

  await connectDb()
  if ((await Service.estimatedDocumentCount()) > 0) {
    return json(409, { ok: false, code: 'NOT_EMPTY' })
  }

  const docs = []
  for (const [index, service] of staticServices.entries()) {
    const parsed = parseServiceInput({ ...service, order: index * 10 })
    if (!parsed.success) {
      return json(500, { ok: false, code: 'INVALID_SEED', id: service.id, errors: parsed.errors })
    }
    docs.push(parsed.data)
  }
  await Service.insertMany(docs)
  refreshSite()
  return json(201, { ok: true, count: docs.length })
}

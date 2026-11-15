import { format, parse } from 'date-fns'
import { errorCode, fetchWithTimeout } from '@/lib/http'

const PARAM_MAX = 60

/**
 * Make a value safe for a WhatsApp template body parameter: no newlines, tabs or control
 * characters (Meta rejects them), single spaces, limited length, never empty.
 */
export function sanitizeWhatsappParam(value, max = PARAM_MAX) {
  const s = String(value ?? '')
    .replace(/[\p{Cc}\s]+/gu, ' ')
    .trim()
  if (!s) return '-'
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
}

function formatPeople({ adults, children, infants }) {
  const parts = [`${adults} ${adults === 1 ? 'adulto' : 'adultos'}`]
  if (children) parts.push(`${children} ${children === 1 ? 'criança' : 'crianças'}`)
  if (infants) parts.push(`${infants} ${infants === 1 ? 'bebé' : 'bebés'}`)
  return parts.join(', ')
}

function formatWhen({ date, time }) {
  const d = format(parse(date, 'yyyy-MM-dd', new Date(2000, 0, 1)), 'dd/MM/yyyy')
  return time ? `${d} ${time}` : d
}

/** Body parameters, in the order of the template in docs/whatsapp-template.md. */
export function buildTemplateParams({ ref, booking, snapshot }) {
  return [
    ref,
    snapshot.title.pt,
    formatWhen(booking),
    formatPeople(booking),
    booking.name,
    booking.phone,
  ].map((v) => sanitizeWhatsappParam(v))
}

/**
 * Notify the driver by WhatsApp Business Cloud API (template message).
 * Returns { status: 'sent' | 'skipped' | 'failed', providerId?, error? }.
 */
export async function sendWhatsapp({ ref, booking, snapshot }) {
  const env = process.env
  if (env.WHATSAPP_ENABLED !== 'true') return { status: 'skipped' }

  const token = env.WHATSAPP_API_TOKEN
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID
  const to = (env.WHATSAPP_DRIVER_TO || '').replace(/\D/g, '')
  const template = env.WHATSAPP_TEMPLATE_NAME
  if (!token || !phoneId || !to || !template) return { status: 'failed', error: 'config_missing' }

  const version = env.WHATSAPP_API_VERSION || 'v23.0'
  if (!/^v\d+\.\d+$/.test(version) || !/^\d+$/.test(phoneId)) {
    return { status: 'failed', error: 'config_invalid' }
  }

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: template,
      language: { code: env.WHATSAPP_TEMPLATE_LANG || 'pt_PT' },
      components: [
        {
          type: 'body',
          parameters: buildTemplateParams({ ref, booking, snapshot }).map((text) => ({
            type: 'text',
            text,
          })),
        },
      ],
    },
  }

  try {
    const res = await fetchWithTimeout(
      `https://graph.facebook.com/${version}/${phoneId}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    if (!res.ok) return { status: 'failed', error: `http_${res.status}` }
    const json = await res.json().catch(() => null)
    return { status: 'sent', providerId: json?.messages?.[0]?.id }
  } catch (err) {
    return { status: 'failed', error: errorCode(err) }
  }
}

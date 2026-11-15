import { randomInt } from 'node:crypto'

// No I, L, O, 0 or 1: easy to read out over the phone or WhatsApp.
export const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const REF_PATTERN = /^JV-\d{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/

/** e.g. JV-2026-AB12CD */
export function generateRef(now = new Date()) {
  let code = ''
  for (let i = 0; i < 6; i++) code += REF_ALPHABET[randomInt(REF_ALPHABET.length)]
  const year = new Intl.DateTimeFormat('en-CA', { timeZone: 'Atlantic/Madeira', year: 'numeric' })
    .format(now)
    .slice(0, 4)
  return `JV-${year}-${code}`
}

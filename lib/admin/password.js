import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// Plain Node crypto (no extra dependency). Format: scrypt$N$r$p$salt$hash (base64url).
const N = 16384
const R = 8
const P = 1
const KEY_LEN = 64

function derive(password, salt, n, r, p) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key)
    )
  })
}

export const MIN_PASSWORD_LENGTH = 12

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must have at least ${MIN_PASSWORD_LENGTH} characters`)
  }
  const salt = randomBytes(16)
  const key = await derive(password, salt, N, R, P)
  return ['scrypt', N, R, P, salt.toString('base64url'), key.toString('base64url')].join('$')
}

export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false
  const [algo, n, r, p, salt, hash] = stored.split('$')
  if (algo !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64url')
  const key = await derive(
    password,
    Buffer.from(salt, 'base64url'),
    Number(n),
    Number(r),
    Number(p)
  )
  return key.length === expected.length && timingSafeEqual(key, expected)
}

/** A valid hash to compare against when the email is unknown, so timing does not reveal it. */
let dummy
export async function dummyHash() {
  dummy ??= await hashPassword(randomBytes(18).toString('base64url'))
  return dummy
}

// Create or update an admin account for /admin.
//
//   npm run admin:create -- joao@example.pt
//   npm run admin:create -- joao@example.pt "a long password"   (non-interactive)
//
// Reads MONGODB_URI from .env.local. Running it again for the same email changes the password
// and signs out every open session of that account.
import { createInterface } from 'node:readline/promises'
import mongoose from 'mongoose'
import AdminUser from '../models/AdminUser.js'
import { MIN_PASSWORD_LENGTH, hashPassword } from '../lib/admin/password.js'

const [emailArg, passwordArg] = process.argv.slice(2)
const email = (emailArg || '').trim().toLowerCase()
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run admin:create -- <email> [password]')
  process.exit(1)
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set (add it to .env.local).')
  process.exit(1)
}

let password = passwordArg
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  password = await rl.question(`Password (min. ${MIN_PASSWORD_LENGTH} characters): `)
  rl.close()
}
if (!password || password.length < MIN_PASSWORD_LENGTH) {
  console.error(`The password needs at least ${MIN_PASSWORD_LENGTH} characters.`)
  process.exit(1)
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
const passwordHash = await hashPassword(password)
const existing = await AdminUser.findOne({ email })
if (existing) {
  existing.passwordHash = passwordHash
  existing.sessionVersion = (existing.sessionVersion ?? 1) + 1
  await existing.save()
  console.log(`Password updated for ${email}. Open sessions were signed out.`)
} else {
  await AdminUser.create({ email, passwordHash })
  console.log(`Admin ${email} created. Sign in at /admin/login.`)
}
await mongoose.disconnect()

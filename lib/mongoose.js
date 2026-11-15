import mongoose from 'mongoose'

/** True when a database is configured. The booking flow works without one (the DB is a log). */
export function isDbConfigured() {
  return Boolean(process.env.MONGODB_URI)
}

// Cache the connection on globalThis so hot reloads and serverless reuse do not open new ones.
const cache = (globalThis.__mongooseCache ??= { conn: null, promise: null })

export async function connectDb() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set')
  if (cache.conn) return cache.conn
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
      })
      .catch((err) => {
        cache.promise = null // allow a retry on the next request
        throw err
      })
  }
  cache.conn = await cache.promise
  return cache.conn
}

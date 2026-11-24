import mongoose from 'mongoose'

const { Schema } = mongoose

// Accounts for the /admin panel. Created with `npm run admin:create`, never from the web.
const adminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    passwordHash: { type: String, required: true }, // scrypt, see lib/admin/password.js
    // Bumped on password change: sessions signed with an older version stop working.
    sessionVersion: { type: Number, default: 1 },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
)

export default mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema)

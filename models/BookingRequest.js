import mongoose from 'mongoose'

const { Schema } = mongoose

const channel = {
  status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
  providerId: { type: String },
  at: { type: Date },
  error: { type: String }, // short code only, never provider payloads
}

const bookingRequestSchema = new Schema(
  {
    ref: { type: String, required: true, unique: true },
    idempotencyKey: { type: String, unique: true, sparse: true },
    serviceSlug: { type: String, required: true },
    type: { type: String, enum: ['tour', 'transfer'], required: true },
    // Frozen copy of the service at request time, so later content edits do not rewrite history.
    serviceSnapshot: {
      id: String,
      title: { pt: String, en: String }, // same shape as the service content
      priceFrom: Number,
      currency: String,
      placeholder: Boolean,
    },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String }, // HH:mm
    adults: { type: Number, required: true },
    children: { type: Number, default: 0 },
    infants: { type: Number, default: 0 },
    pickupLocation: { type: String },
    dropoffLocation: { type: String },
    flightNumber: { type: String },
    luggage: { type: String },
    notes: { type: String },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    locale: { type: String, enum: ['en', 'pt'], required: true },
    consent: {
      privacy: { type: Boolean, required: true },
      version: { type: String }, // privacy policy version
      textVersion: { type: String }, // version of the consent checkbox wording
      locale: { type: String }, // language the consent text was shown in
      at: { type: Date },
    },
    // 'delivery_failed': saved, but neither email nor WhatsApp reached the driver (needs follow-up).
    status: { type: String, enum: ['new', 'delivery_failed'], default: 'new' },
    delivery: { email: channel, whatsapp: channel },
    payment: { status: { type: String, default: 'none' } }, // reserved, no payments in v1
    // suspect: filled in faster than a human normally can (kept, not discarded).
    meta: { ipHash: String, userAgent: String, suspect: Boolean },
  },
  { timestamps: true }
)

bookingRequestSchema.index({ status: 1, createdAt: -1 })
// No TTL index on purpose: retention period is pending Pedro's decision (GDPR).

export default mongoose.models.BookingRequest ||
  mongoose.model('BookingRequest', bookingRequestSchema)

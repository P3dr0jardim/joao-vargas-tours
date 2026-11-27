import mongoose from 'mongoose'

const { Schema } = mongoose

// Same shape as one record in content/services.js, so the seed script can copy them 1:1.
const localized = { en: { type: String, default: '' }, pt: { type: String, default: '' } }
const localizedSchema = new Schema(localized, { _id: false })
const qaSchema = new Schema({ q: localizedSchema, a: localizedSchema }, { _id: false })
const imageSchema = new Schema(
  { src: { type: String, required: true }, alt: localizedSchema },
  { _id: false }
)

const serviceSchema = new Schema(
  {
    // Stable key used by `related` and the home page featured lists, e.g. "tour-west".
    id: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['tour', 'transfer'], required: true },
    slug: { type: String, required: true, unique: true, trim: true },
    published: { type: Boolean, default: false },
    placeholder: { type: Boolean, default: false },
    order: { type: Number, default: 0 }, // position in the listings, lowest first
    title: localizedSchema,
    seo: { title: localizedSchema, description: localizedSchema },
    summary: localizedSchema,
    body: { en: [String], pt: [String] }, // paragraphs
    duration: localizedSchema,
    priceFrom: { type: Number, min: 0 },
    priceWeekend: { type: Number, min: 0 }, // optional, shown next to priceFrom (weekdays)
    priceTrip: { type: String, enum: ['both', 'return', 'oneWay'], default: null }, // null = automatic
    currency: { type: String, default: 'EUR' },
    pricingModel: { type: String, default: 'perVehicle' },
    capacity: { type: Number, min: 1, default: 6 },
    route: { from: localizedSchema, to: localizedSchema },
    stops: [localizedSchema],
    includes: [localizedSchema],
    excludes: [localizedSchema],
    faq: [qaSchema],
    gallery: [imageSchema],
    related: [String], // service ids
  },
  { timestamps: true }
)

serviceSchema.index({ type: 1, order: 1 })

export default mongoose.models.Service || mongoose.model('Service', serviceSchema)

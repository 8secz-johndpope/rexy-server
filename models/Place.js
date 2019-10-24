const mongoose = require('mongoose')

const AddressSchema = mongoose.Schema({
    street1: { type: String },
    street2: { type: String },
    street3: { type: String },
    city: { type: String },
    country: { type: String },
    state: { type: String },
    zip: { type: String },
    formatted: { type: String }
}, {
    _id: false,
    id: false
})

const DailyOpenPeriodSchema = mongoose.Schema({
    close: { type: String },
    open: { type: String }
}, {
    _id: false,
    id: false
})

const HoursOfServiceExceptionsSchema = mongoose.Schema({
    date: { type: Date },
    hours: { type: [DailyOpenPeriodSchema] },
    isClosed: { type: Boolean, default: false },
    recurring: { type: String, enum: ["never", "monthly", "yearly"], default: "never" }
}, {
    _id: false,
    id: false
})

const HoursOfServiceSchema = mongoose.Schema({
    monday: { type: [DailyOpenPeriodSchema] },
    tuesday: { type: [DailyOpenPeriodSchema] },
    wednesday: { type: [DailyOpenPeriodSchema] },
    thursday: { type: [DailyOpenPeriodSchema] },
    friday: { type: [DailyOpenPeriodSchema] },
    saturday: { type: [DailyOpenPeriodSchema] },
    sunday: { type: [DailyOpenPeriodSchema] },
    exceptions: { type: [HoursOfServiceExceptionsSchema] }
}, {
    _id: false,
    id: false
})

const PlaceSchema = mongoose.Schema({
    accolades: { type: [String] },
    address: { type: AddressSchema },
    coordinate: { type: { type: String, default: "Point" }, coordinates: [Number] },
    hours: { type: HoursOfServiceSchema },
    isClean: { type: Boolean, default: false },
    isOpen: { type: Boolean, default: true },
    notes: { type: String },
    otherLists: { type: [String] },
    phoneNumber: { type: String },
    price: { type: Number },
    specialty: { type: String },
    subtitle: { type: String },
    tags: { type: [String] },
    title: { type: String, required: true },
    type: { type: String, required: true },
    url: { type: String }
}, {
    id: false,
    timestamps: true
})

PlaceSchema.index({ coordinate: "2dsphere" })

PlaceSchema.set('toObject', { virtuals: true })
PlaceSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('Place', PlaceSchema)
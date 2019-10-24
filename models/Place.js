const mongoose = require('mongoose')

const Address = mongoose.Schema({
    street1: { type: String },
    street2: { type: String },
    street3: { type: String },
    city: { type: String },
    country: { type: String },
    state: { type: String },
    zip: { type: String },
    formatted: { type: String }
})

const DailyOpenPeriod = mongoose.Schema({
    close: { type: String },
    open: { type: String }
})

const HoursOfServiceExceptions = mongoose.Schema({
    date: { type: Date },
    hours: { type: [DailyOpenPeriod] },
    isClosed: { type: Boolean, default: false },
    recurring: { type: String, enum: ["never", "monthly", "yearly"], default: "never" }
})

const HoursOfService = mongoose.Schema({
    monday: { type: [DailyOpenPeriod] },
    tuesday: { type: [DailyOpenPeriod] },
    wednesday: { type: [DailyOpenPeriod] },
    thursday: { type: [DailyOpenPeriod] },
    friday: { type: [DailyOpenPeriod] },
    saturday: { type: [DailyOpenPeriod] },
    sunday: { type: [DailyOpenPeriod] },
    exceptions: { type: [HoursOfServiceExceptions] }
})

const PlaceSchema = mongoose.Schema({
    accolades: { type: [String] },
    address: { type: Address },
    coordinate: { type: { type: String, default: "Point" }, coordinates: [Number] },
    hours: { type: HoursOfService },
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

module.exports = mongoose.model('Place', PlaceSchema)
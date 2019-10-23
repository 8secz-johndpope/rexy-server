const mongoose = require('mongoose')

const PlaceSchema = mongoose.Schema({
    accolades: { type: [String] },
    address: { type: Address },
    coordinate: { type: { type: String, default: "Point" }, coordinates: [Number], index: "2dsphere" },
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
    timestamps: true
})

const Address = mongoose.Schema({
    properties: {
        street1: { type: String },
        street2: { type: String },
        street3: { type: String },
        city: { type: String },
        country: { type: String },
        state: { type: String },
        zip: { type: String },
        formattedAddress: { type: String }
    }
})

const HoursOfService = mongoose.Schema({
    properties: {
        monday: { type: [DailyOpenPeriod] },
        tuesday: { type: [DailyOpenPeriod] },
        wednesday: { type: [DailyOpenPeriod] },
        thursday: { type: [DailyOpenPeriod] },
        friday: { type: [DailyOpenPeriod] },
        saturday: { type: [DailyOpenPeriod] },
        sunday: { type: [DailyOpenPeriod] },
        exceptions: { type: [HoursOfServiceExceptions] }
    }
})

const DailyOpenPeriod = mongoose.Schema({
    properties: {
        close: { type: String },
        open: { type: String }
    }
})

const HoursOfServiceExceptions = mongoose.Schema({
    properties: {
        date: { type: Date },
        hours: { type: [DailyOpenPeriod] },
        isClosed: { type: Boolean, default: false },
        recurring: { type: String, enum: ["never", "weekly", "monthly", "yearly"], default: "never" }
    }
})

module.exports = mongoose.model('Place', PlaceSchema)
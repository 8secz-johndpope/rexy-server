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

const AddressSchema = mongoose.Schema({
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
        closures: { type: [Closure] },
        specialHours: { type: [SpecialHours] }
    }
})

const DailyOpenPeriod = mongoose.Schema({
    properties: {
        close: { type: String },
        open: { type: String }
    }
})

const SpecialHours = mongoose.Schema({
    properties: {
        date: { type: Date },
        hours: { type: [DailyOpenPeriod] },
        isClosed: { type: Boolean },
        isRecurring: { type: Boolean }
    }
})

module.exports = mongoose.model('Place', PlaceSchema)
module.exports = mongoose.model('Address', AddressSchema)
module.exports = mongoose.model('HoursOfService', HoursOfService)
module.exports = mongoose.model('DailyOpenPeriod', DailyOpenPeriod)
module.exports = mongoose.model('SpecialHours', SpecialHours)
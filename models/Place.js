const mongoose = require('mongoose')

const PlaceSchema = mongoose.Schema({
    properties: {
        accolades: { type: [String] },
        address: { type: Address },
        hours: { type: HoursOfService },
        isOpen: { type: Boolean },
        notes: { type: String },
        otherLists: { type: [String] },
        phoneNumber: { type: String },
        price: { type: Number },
        requiresCleaning: { type: Boolean },
        specialty: { type: String },
        subtitle: { type: String },
        tags: { type: [String] },
        title: { type: String },
        type: { type: String },
        url: { type: String },
    },
    geometry: {
        coordinate: { type: [Number], index: '2dsphere' }
    }
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
        repeatsYearly: { type: Boolean }
    }
})

module.exports = mongoose.model('Place', PlaceSchema)
module.exports = mongoose.model('Address', AddressSchema)
module.exports = mongoose.model('HoursOfService', HoursOfService)
module.exports = mongoose.model('DailyOpenPeriod', DailyOpenPeriod)
module.exports = mongoose.model('SpecialHours', SpecialHours)
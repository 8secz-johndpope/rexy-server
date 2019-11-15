const mongoose = require('mongoose')
const mongoosastic = require('mongoosastic')

const AddressSchema = mongoose.Schema({
    street1: { type: String },
    street2: { type: String },
    street3: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String },
    country: { type: String },
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
    accolades: { type: [String], es_indexed: true },
    address: { type: AddressSchema, es_schema: AddressSchema, es_indexed: true, es_select: 'formatted' },
    coordinate: { type: { type: String, default: "Point" }, coordinates: [Number], es_indexed: false },
    hours: { type: HoursOfServiceSchema, es_indexed: false },
    isClean: { type: Boolean, default: false, es_indexed: false },
    isOpen: { type: Boolean, default: true, es_indexed: false },
    notes: { type: String, es_indexed: true },
    otherLists: { type: [String], es_indexed: true },
    phoneNumber: { type: String, es_indexed: true },
    price: { type: Number, es_indexed: false },
    specialty: { type: String, es_indexed: true },
    subtitle: { type: String, es_indexed: true },
    tags: { type: [String], es_indexed: true },
    title: { type: String, required: true, es_indexed: true },
    type: { type: String, es_indexed: true },
    url: { type: String, es_indexed: false },
    
    googlePlacesRating: { type: Number, es_indexed: false },
    googlePlacesReviewCount: { type: Number, es_indexed: false },
    yelpRating: { type: Number, es_indexed: false },
    yelpReviewCount: { type: Number, es_indexed: false }
}, {
    id: false,
    timestamps: true
})

PlaceSchema.index({ coordinate: "2dsphere" })

PlaceSchema.pre('find', function() {
    this.select('-googlePlacesRating').select('-googlePlacesReviewCount').select('-yelpRating').select('-yelpReviewCount')
})

PlaceSchema.pre('findOne', function() {
    this.select('-googlePlacesRating').select('-googlePlacesReviewCount').select('-yelpRating').select('-yelpReviewCount')
})

PlaceSchema.set('toObject', { virtuals: true })
PlaceSchema.set('toJSON', { virtuals: true })

PlaceSchema.plugin(mongoosastic, { hosts: [process.env.BONSAI_URL] })
mongoose.model('Place', PlaceSchema).createMapping(function(err, mapping) {
    if (err) {
      console.log('error creating mapping (you can safely ignore this)')
      console.log(err)
    } else {
      console.log('mapping created!')
      console.log(mapping)
    }
})
mongoose.model('Place', PlaceSchema).synchronize()

module.exports = mongoose.model('Place', PlaceSchema)
module.exports.supportedTypes = ["bakery", "bar", "cafe", "chocolatier", "food", "grocery store", "juice bar", "market", "meal_takeaway", "restaurant", "street vendor", "amusement park", "building", "castle", "church", "fountain", "garden", "house", "monument", "museum", "park", "point of interest", "square", "stadium"]
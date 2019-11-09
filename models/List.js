const mongoose = require('mongoose')
const mongoosastic = require('mongoosastic')

const ListSchema = mongoose.Schema({
    accoladesYear: { type: String },
    authorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    date: { type: Date, default: Date.now },
    dateBasedAccolades: { type: Boolean, default: false },
    description: { type: String, es_indexed: true },
    groupName: { type: String },
    isDeleted: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    placeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place" }],
    subscriberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    title: { type: String, required: true, es_indexed: true }
}, {
    id: false,
    timestamps: true
})

ListSchema.virtual('authors', {
    ref: 'User',
    localField: 'authorIds',
    foreignField: '_id'
})

ListSchema.virtual('places', {
    ref: 'Place',
    localField: 'placeIds',
    foreignField: '_id'
})

ListSchema.virtual('subscribers', {
    ref: 'User',
    localField: 'subscriberIds',
    foreignField: '_id'
})

ListSchema.pre('find', function() {
    this.populate('authors')
})

ListSchema.pre('findOne', function() {
    this.populate('authors').populate('places').populate('subscribers')
})

ListSchema.set('toObject', { virtuals: true })
ListSchema.set('toJSON', { virtuals: true })

ListSchema.plugin(mongoosastic)

module.exports = mongoose.model('List', ListSchema)
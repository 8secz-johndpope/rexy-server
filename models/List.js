const mongoose = require('mongoose')

const ListSchema = mongoose.Schema({
    accoladesYear: { type: String },
    authorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    date: { type: Date, default: Date.now },
    dateBasedAccolades: { type: Boolean, default: false },
    description: { type: String },
    groupName: { type: String },
    isDeleted: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    placeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place" }],
    subscriberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    title: { type: String, required: true }
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

ListSchema.set('toObject', { virtuals: true })
ListSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('List', ListSchema)
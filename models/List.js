const mongoose = require('mongoose')

const ListSchema = mongoose.Schema({
    accoladesYear: { type: String },
    date: { type: Date, default: Date.now },
    dateBasedAccolades: { type: Boolean, default: false },
    description: { type: String },
    groupName: { type: String },
    isDeleted: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    placeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place", unique: true }],
    title: { type: String, required: true }
}, {
    timestamps: true
})

ListSchema.virtual('places', {
    ref: 'Place',
    localField: 'placeIds',
    foreignField: '_id'
})

ListSchema.set('toObject', { virtuals: true })
ListSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('List', ListSchema)
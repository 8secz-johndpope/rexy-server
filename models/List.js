const mongoose = require('mongoose')

const ListSchema = mongoose.Schema({
    accoladesYear: { type: String },
    date: { type: Date, default: Date.now },
    dateBasedAccolades: { type: Boolean, default: false },
    description: { type: String },
    groupName: { type: String },
    isDeleted: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    placeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place" }],
    title: { type: String, required: true }
}, {
    timestamps: true
})

module.exports = mongoose.model('List', ListSchema)
const mongoose = require('mongoose')

const ListSchema = mongoose.Schema({
    accoladesYear: { type: String },
    date: { type: Date, default: Date.now },
    dateBasedAccolades: { type: Boolean },
    description: { type: String },
    groupName: { type: String },
    isDeleted: { type: Boolean },
    isPrivate: { type: Boolean },
    placeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place" }],
    title: { type: String, required: true }
}, {
    timestamps: true
})

module.exports = mongoose.model('List', ListSchema)
const mongoose = require('mongoose')

const ListSchema = mongoose.Schema({
    properties: {
        accoladesYear: { type: String },
        date: { type: Date },
        dateBasedAccolades: { type: Boolean },
        description: { type: String },
        groupName: { type: String },
        isDeleted: { type: Boolean },
        isPrivate: { type: Boolean },
        placeIds: { type: [String] },
        title: { type: String }
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('List', ListSchema)
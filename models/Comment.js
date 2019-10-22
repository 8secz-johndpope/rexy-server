const mongoose = require('mongoose')

const CommentSchema = mongoose.Schema({
    properties: {
        listId: { type: String },
        placeId: { type: String },
        text: { type: String },
        userId: { type: String }
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('Comment', CommentSchema)
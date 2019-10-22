const mongoose = require('mongoose')

const CommentSchema = new mongoose.Schema({
    listId: { type: mongoose.Schema.Types.ObjectId, ref: "List"},
    placeId: { type: mongoose.Schema.Types.ObjectId, ref: "Place"},
    text: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User"},
}, {
    timestamps: true
})

module.exports = mongoose.model('Comment', CommentSchema)
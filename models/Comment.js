const mongoose = require('mongoose')

const CommentSchema = mongoose.Schema({
    listId: { type: mongoose.Schema.Types.ObjectId, ref: "List" },
    placeId: { type: mongoose.Schema.Types.ObjectId, ref: "Place" },
    text: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, {
    id: false,
    timestamps: true
})

CommentSchema.virtual('list', {
    ref: 'List',
    localField: 'listId',
    foreignField: '_id',
    justOne: true
})

CommentSchema.virtual('place', {
    ref: 'Place',
    localField: 'placeId',
    foreignField: '_id',
    justOne: true
})

CommentSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true
})

CommentSchema.set('toObject', { virtuals: true })
CommentSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('Comment', CommentSchema)
const mongoose = require('mongoose')

const UserListSchema = mongoose.Schema({
    listId: { type: mongoose.Schema.Types.ObjectId, ref: "List" },
    type: { type: String, enum: ["authorship", "subscription"], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, {
    id: false,
    timestamps: true
})

UserListSchema.virtual('list', {
    ref: 'List',
    localField: 'listId',
    foreignField: '_id'
})

UserListSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id'
})

UserListSchema.set('toObject', { virtuals: true })
UserListSchema.set('toJSON', { virtuals: true })


module.exports = mongoose.model('UserList', UserListSchema)
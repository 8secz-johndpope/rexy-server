const mongoose = require('mongoose')

const UserListSchema = mongoose.Schema({
    listId: { type: String },
    type: { type: String, enum: ["authorship", "subscription"] },
    userId: { type: String }
}, {
    id: false,
    timestamps: true
})

module.exports = mongoose.model('UserList', UserListSchema)
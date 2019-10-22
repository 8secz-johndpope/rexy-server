const mongoose = require('mongoose')

const UserListSchema = mongoose.Schema({
    properties: {
        listId: { type: String },
        type: { type: String, enum: ["authorship", "subscription"] },
        userId: { type: String }
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('UserList', UserListSchema)
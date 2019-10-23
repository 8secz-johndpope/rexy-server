const mongoose = require('mongoose')

const UserSchema = mongoose.Schema({
    bookmarksListId: { type: mongoose.Schema.Types.ObjectId, ref: "List" },
    emailAddress: { type: String },
    firstName: { type: String },    
    isVerified: { type: Boolean, default: false },
    lastName: { type: String },
    otherLists: { type: [String] },
    phoneNumber: { type: String },
    prefersUsername: { type: Boolean, defaults: true },
    username: { type: String, unique: true },
    visitedListId: { type: mongoose.Schema.Types.ObjectId, ref: "List" },
    xid: { type: String, required: true, unique: true }
}, {
    timestamps: true
})

module.exports = mongoose.model('User', UserSchema)
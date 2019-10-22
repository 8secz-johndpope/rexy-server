const mongoose = require('mongoose')

const UserSchema = mongoose.Schema({
    properties: {
        bookmarksListId: { type: String },
        emailAddress: { type: String },
        firstName: { type: String },    
        isVerified: { type: Boolean },
        lastName: { type: String },
        otherLists: { type: [String] },
        phoneNumber: { type: String },
        prefersUsername: { type: Boolean },
        username: { type: String },
        visitedListId: { type: String }
    },
    geometry: {
        coordinate: { type: [Number], index: '2dsphere' }
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('User', UserSchema)

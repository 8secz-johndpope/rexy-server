const mongoose = require('mongoose')

const UserSchema = mongoose.Schema({
    bookmarkedPlaceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place", unique: true }],
    emailAddress: { type: String },
    firstName: { type: String },    
    isVerified: { type: Boolean, default: false },
    lastName: { type: String },
    phoneNumber: { type: String },
    prefersUsername: { type: Boolean, defaults: true },
    receiveSubscriptionNotifications: { type: Boolean, default: true },
    username: { type: String, unique: true },
    visitedPlaceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place", unique: true }],
    xid: { type: String, required: true, unique: true }
}, {
    id: false,
    timestamps: true
})

UserSchema.virtual('bookmarkedPlaces', {
    ref: 'Place',
    localField: 'bookmarkedPlaceIds',
    foreignField: '_id'
})

UserSchema.virtual('visitedPlaces', {
    ref: 'Place',
    localField: 'visitedPlaceIds',
    foreignField: '_id'
})

UserSchema.set('toObject', { virtuals: true })
UserSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('User', UserSchema)
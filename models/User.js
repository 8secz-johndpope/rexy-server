const mongoose = require('mongoose')

const UserSchema = mongoose.Schema({
    bookmarkedPlaceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place" }],
    emailAddress: { type: String },
    firstName: { type: String },    
    isVerified: { type: Boolean, default: false },
    lastName: { type: String },
    listIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "List" }],
    phoneNumber: { type: String, unique: true },
    prefersUsername: { type: Boolean, defaults: true },
    receiveSubscriptionNotifications: { type: Boolean, default: true },
    subscribedListIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "List" }],
    username: { type: String, unique: true },
    visitedPlaceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place" }],
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

UserSchema.virtual('lists', {
    ref: 'List',
    localField: 'listIds',
    foreignField: '_id'
})

UserSchema.virtual('subscribedLists', {
    ref: 'List',
    localField: 'subscribedListIds',
    foreignField: '_id'
})

UserSchema.virtual('visitedPlaces', {
    ref: 'Place',
    localField: 'visitedPlaceIds',
    foreignField: '_id'
})

UserSchema.pre('findOne', function() {
    this.populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces')
})

UserSchema.set('toObject', { virtuals: true })
UserSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('User', UserSchema)
const mongoose = require('mongoose')

const UserSchema = mongoose.Schema({
    bookmarkedPlaceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Place' }],
    emailAddress: { type: String, unique: true, sparse: true },
    firstName: { type: String },
    followerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    imagePath: { type: String },
    isVerified: { type: Boolean, default: false },
    lastName: { type: String },
    listIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'List' }],
    phoneNumber: { type: String, unique: true, sparse: true },
    prefersUsername: { type: Boolean, defaults: false },
    settingsId: { type: mongoose.Schema.Types.ObjectId, ref: 'Settings' },
    subscribedListIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'List' }],
    username: { type: String, unique: true, sparse: true },
    visitedPlaceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Place' }],
    xid: { type: String, required: true, unique: true, immutable: true, index: true }
}, {
    id: false,
    timestamps: true,
})

UserSchema.virtual('bookmarkedPlaces', {
    ref: 'Place',
    localField: 'bookmarkedPlaceIds',
    foreignField: '_id'
})

UserSchema.virtual('followers', {
    ref: 'User',
    localField: 'followerIds',
    foreignField: '_id'
})

UserSchema.virtual('following', {
    ref: 'User',
    localField: 'followingIds',
    foreignField: '_id'
})

UserSchema.virtual('lists', {
    ref: 'List',
    localField: 'listIds',
    foreignField: '_id'
})

UserSchema.virtual('settings', {
    ref: 'Settings',
    localField: 'settingsId',
    foreignField: '_id',
    justOne: true
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

UserSchema.virtual('displayName').get(function() {
    if (this.username && this.prefersUsername) {
        return this.username
    }

    const fullName = [this.firstName, this.lastName].join(' ').trim()

    if (fullName.length) {
        return fullName
    } else {
        return null
    }
})

UserSchema.set('toObject', { virtuals: true })
UserSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('User', UserSchema)
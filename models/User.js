const mongoose = require('mongoose')

const UserSchema = mongoose.Schema({
    bookmarkedPlaceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place" }],
    emailAddress: { type: String, unique: true, sparse: true },
    firstName: { type: String },
    imagePath: { type: String },
    isVerified: { type: Boolean, default: false },
    lastName: { type: String },
    listIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "List" }],
    notificationSettingsId: { type: mongoose.Schema.Types.ObjectId, ref: "NotificationSettings" },
    phoneNumber: { type: String, unique: true, sparse: true },
    prefersUsername: { type: Boolean, defaults: false },
    subscribedListIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "List" }],
    username: { type: String, unique: true, sparse: true },
    visitedPlaceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place" }],
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

UserSchema.virtual('lists', {
    ref: 'List',
    localField: 'listIds',
    foreignField: '_id'
})

UserSchema.virtual('notificationSettings', {
    ref: 'NotificationSettings',
    localField: 'notificationSettingsId',
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

UserSchema.set('toObject', { virtuals: true })
UserSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('User', UserSchema)
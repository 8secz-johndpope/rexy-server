const mongoose = require('mongoose')

const NotificationAttribute = mongoose.Schema({
    id: { type: String },
    key: { type: String },
    text: { type: String },
    type: { type: String, enum: ["list", "place", "user"] }
}, {
    _id: false,
    id: false
})

const NotificationAttributedDescription = mongoose.Schema({
    attributes: { type: [NotificationAttribute] },
    description: { type: String }
}, {
    _id: false,
    id: false
})

const NotificationObject = mongoose.Schema({
    listId: { type: String },
    placeId: { type: String },
    userId: { type: String },
}, {
    _id: false,
    id: false
})

NotificationObject.virtual('list', {
    ref: 'List',
    localField: 'listId',
    foreignField: '_id',
    justOne: true
})

NotificationObject.virtual('place', {
    ref: 'Place',
    localField: 'placeId',
    foreignField: '_id',
    justOne: true
})

NotificationObject.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true
})

const NotificationSchema = mongoose.Schema({
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    attributedDescription: { type: NotificationAttributedDescription },
    description: { type: String },
    isArchived: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    object: { type: NotificationObject },
    targetId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ["listShared", "placeShared", "userShared", "placeAddedToAuthoredList", "placeRemovedFromAuthoredList", "placeAddedToSubscribedList", "placeRemovedFromSubscribedList"] }
}, {
    id: false,
    timestamps: true
})

NotificationSchema.virtual('actor', {
    ref: 'User',
    localField: 'actorId',
    foreignField: '_id',
    justOne: true
})

NotificationSchema.virtual('target', {
    ref: 'User',
    localField: 'targetId',
    foreignField: '_id',
    justOne: true
})

NotificationSchema.set('toObject', { virtuals: true })
NotificationSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('Notification', NotificationSchema)
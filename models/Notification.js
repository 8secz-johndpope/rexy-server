const mongoose = require('mongoose')

const NotificationAttributeSchema = mongoose.Schema({
    key: { type: String },
    value: { type: String },
    type: { type: String, enum: ['list', 'place', 'user'] }
}, {
    _id: false,
    id: false
})

const NotificationAttributedDescriptionSchema = mongoose.Schema({
    attributes: { type: [NotificationAttributeSchema] },
    description: { type: String }
}, {
    _id: false,
    id: false
})

const NotificationObjectSchema = mongoose.Schema({
    listId: { type: String },
    placeId: { type: String },
    userId: { type: String },
}, {
    _id: false,
    id: false
})

const notificationTypes = ['listShared', 'placeShared', 'userShared', 'addedAsAuthor', 'removedAsAuthor', 'placeAddedToAuthoredList', 'placeRemovedFromAuthoredList', 'placeAddedToSubscribedList', 'placeRemovedFromSubscribedList', 'authorAddedToAuthoredList', 'authorRemovedFromAuthoredList']

const NotificationSchema = mongoose.Schema({
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attributedDescription: { type: NotificationAttributedDescriptionSchema },
    description: { type: String },
    isArchived: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    object: { type: NotificationObjectSchema },
    targetId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: notificationTypes }
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

NotificationSchema.virtual('object.list', {
    ref: 'List',
    localField: 'object.listId',
    foreignField: '_id',
    justOne: true
})

NotificationSchema.virtual('object.place', {
    ref: 'Place',
    localField: 'object.placeId',
    foreignField: '_id',
    justOne: true
})

NotificationSchema.virtual('object.user', {
    ref: 'User',
    localField: 'object.userId',
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

NotificationSchema.pre('save', async function() {
    const List = require('../models/List.js')
    const Place = require('../models/Place.js')
    const User = require('../models/User.js')
    
    const actor = await User.findById(this.actorId)

    var list
    if (this.object.listId) {
        list = await List.findById(this.object.listId)
    }

    var place
    if (this.object.placeId) {
        place = await Place.findById(this.object.placeId)
    }

    var user
    if (this.object.userId) {
        user = await User.findById(this.object.userId)
    }

    switch (this.type) {
        case 'listShared':
            this.attributedDescription = {
                attributes: [
                    {
                        key: this.actorId,
                        value: actor.username,
                        type: 'user'
                    },
                    {
                        key: this.object.listId,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${this.actorId} shared ${this.object.listId} with you.`
            }
            this.description = `${actor.username} shared ${list.title} with you.`
            break

        case 'placeShared':
            this.attributedDescription = {
                attributes: [
                    {
                        key: this.actorId,
                        value: actor.username,
                        type: 'user'
                    },
                    {
                        key: this.object.placeId,
                        value: place.title,
                        type: 'place'
                    }
                ],
                description: `${this.actorId} shared ${this.object.placeId} with you.`
            }
            this.description = `${actor.username} shared ${place.title} with you.`
            break

        case 'userShared':
            this.attributedDescription = {
                attributes: [
                    {
                        key: this.actorId,
                        value: actor.username,
                        type: 'user'
                    },
                    {
                        key: this.object.userId,
                        value: user.username,
                        type: 'user'
                    }
                ],
                description: `${this.actorId} shared ${this.object.userId} with you.`
            }
            this.description = `${actor.username} shared ${user.username} with you.`
            break

        case 'addedAsAuthor':
            this.attributedDescription = {
                attributes: [
                    {
                        key: this.actorId,
                        value: actor.username,
                        type: 'user'
                    },
                    {
                        key: this.object.listId,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${this.actorId} added you as an author on their list ${this.object.listId}.`
            }
            this.description = `${actor.username} added you as an author on their list ${list.title}.`
            break

        case 'removedAsAuthor':
            this.attributedDescription = {
                attributes: [
                    {
                        key: this.actorId,
                        value: actor.username,
                        type: 'user'
                    },
                    {
                        key: this.object.listId,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${this.actorId} removed you as an author from their list ${this.object.listId}.`
            }
            this.description = `${actor.username} removed you as an author from their list ${list.title}.`
            break

        case 'placeAddedToAuthoredList':
            this.attributedDescription = {
                attributes: [
                    {
                        key: this.actorId,
                        value: actor.username,
                        type: 'user'
                    },
                    {
                        key: this.object.placeId,
                        value: place.title,
                        type: 'place'
                    },
                    {
                        key: this.object.listId,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${this.actorId} added ${this.object.placeId} to your list ${this.object.listId}.`
            }
            this.description = `${actor.username} added ${place.title} to your list ${list.title}.`
            break

        case 'placeRemovedFromAuthoredList':
            this.attributedDescription = {
                attributes: [
                    {
                        key: this.actorId,
                        value: actor.username,
                        type: 'user'
                    },
                    {
                        key: this.object.placeId,
                        value: place.title,
                        type: 'place'
                    },
                    {
                        key: this.object.listId,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${this.actorId} removed ${this.object.placeId} from your list ${this.object.listId}.`
            }
            this.description = `${actor.username} removed ${place.title} from your list ${list.title}.`
            break

        case 'placeAddedToSubscribedList':
            this.attributedDescription = {
                attributes: [
                    {
                        key: this.actorId,
                        value: actor.username,
                        type: 'user'
                    },
                    {
                        key: this.object.placeId,
                        value: place.title,
                        type: 'place'
                    },
                    {
                        key: this.object.listId,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${this.actorId} added ${this.object.placeId} to their list ${this.object.listId}.`
            }
            this.description = `${actor.username} added ${place.title} to their list ${list.title}.`
            break

        case 'placeRemovedFromSubscribedList':
            this.attributedDescription = {
                attributes: [
                    {
                        key: this.actorId,
                        value: actor.username,
                        type: 'user'
                    },
                    {
                        key: this.object.placeId,
                        value: place.title,
                        type: 'place'
                    },
                    {
                        key: this.object.listId,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${this.actorId} removed ${this.object.placeId} from their list ${this.object.listId}.`
            }
            this.description = `${actor.username} removed ${place.title} from their list ${list.title}.`
            break

        case 'authorAddedToAuthoredList':
            this.attributedDescription = {
                attributes: [
                    {
                        key: this.actorId,
                        value: actor.username,
                        type: 'user'
                    },
                    {
                        key: this.object.userId,
                        value: user.username,
                        type: 'user'
                    },
                    {
                        key: this.object.listId,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${this.actorId} added ${this.object.userId} as an author on your list ${this.object.listId}.`
            }
            this.description = `${actor.username} added ${place.title} as an author on your list ${list.title}.`
            break

        case 'authorRemovedFromAuthoredList':
            this.attributedDescription = {
                attributes: [
                    {
                        key: this.actorId,
                        value: actor.username,
                        type: 'user'
                    },
                    {
                        key: this.object.userId,
                        value: user.username,
                        type: 'user'
                    },
                    {
                        key: this.object.listId,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${this.actorId} removed ${this.object.userId} as an author from your list ${this.object.listId}.`
            }
            this.description = `${actor.username} removed ${place.title} as an author from your list ${list.title}.`
            break
    }
})

NotificationSchema.post('save', function() {
    console.log('post save')
    NotificationSchema.send(savedNotification, function (err) {
        console.log('sent')
    })
})

NotificationSchema.statics.send = function send (notification, cb) {
    const APNSProvider = require('../services/NotificationService.js')

    var pushNotification = new APNSProvider.apn.Notification({
        badge: 0,
        body: 'Check it out in Rexy!',
        // collapseId: updatedList._id,
        // payload: {
        //     'category': 'kListUpdated',
        //     'listId': updatedList._id
        // },
        // titleLocArgs: ['title'],
        // titleLocKey: `A new place was added to ${updatedList.title}.`,
        topic: 'com.gdwsk.Rexy'
    })

    var deviceTokens = []

    switch (notification.type) {
        case 'listShared':
            if (notification.target.settings.deviceToken) {

            }

            break

        case 'placeShared':
            break

        case 'userShared':
            break

        case 'addedAsAuthor':
            break

        case 'removedAsAuthor':
            break

        case 'placeAddedToAuthoredList':
            break

        case 'placeRemovedFromAuthoredList':
            break

        case 'placeAddedToSubscribedList':
            break

        case 'placeRemovedFromSubscribedList':
            break

        case 'authorAddedToAuthoredList':
            break

        case 'authorRemovedFromAuthoredList':
            break
    }

    APNSProvider.provider.send(pushNotification, deviceTokens).then(result => {
        console.log('result', JSON.stringify(result))
    })

    cb()
}

module.exports = mongoose.model('Notification', NotificationSchema)
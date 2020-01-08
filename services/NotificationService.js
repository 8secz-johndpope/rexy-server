const Notification = require('../models/Notification.js')

const url = require('url')
const _ = require('lodash')

const amqp = require('amqplib')
var channel = null
const notificationExchange = 'notificationExchange'

const start = async () => {
    try {
        const connection = await amqp.connect(process.env.CLOUDAMQP_URL)
        const channel = await connection.createChannel()
        await channel.assertExchange(notificationExchange, 'fanout', { durable: true })

        return channel

    } catch (err) {
        console.error('[AMQP] start err', err)
    }
}
start().then(async chan => {
    channel = chan

    const q1 = await channel.assertQueue('', { exclusive: true })
    channel.bindQueue(q1.queue, notificationExchange, '')
    channel.consume(q1.queue, createNotifications)

    const q2 = await channel.assertQueue('', { exclusive: true })
    channel.bindQueue(q2.queue, notificationExchange, '')
    channel.consume(q2.queue, sendPushNotifications)
})

// apn
// https://github.com/node-apn/node-apn
const apn = require('apn')
const options = {
    token: {
        key: './config/gdwsk_apns_certificate.p8',
        keyId: process.env.APNS_KEY,
        teamId: process.env.APNS_TEAM
    },
    production: process.env.NODE_ENV === 'production'
}
const provider = new apn.Provider(options)


// notifications
const createNotifications = async (message) => {
    console.log('NotificationService.createNotifications')
    const body = JSON.parse(message.content.toString())

    const { actor, list, place, targets, user } = body.data

    // console.log('body', body)

    let attributedDescription = { attributes: [], description: '' }
    let description = ''

    switch (body.notificationType) {
        case 'kFollowedUserCreatedList':
            attributedDescription = {
                attributes: [
                    {
                        key: list._id,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `Check out ${list._id} in Rexy!`
            }
            description = `Check out ${list.title} in Rexy!`
            break

        case 'kAddedAsAuthor':
            attributedDescription = {
                attributes: [
                    {
                        key: actor._id,
                        value: actor.displayName,
                        type: 'user'
                    },
                    {
                        key: list._id,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `Congrats! ${actor._id} added you as an author on their shared list, ${list._id}.`
            }
            description = `Congrats! ${actor.displayName} added you as an author on their shared list, ${list.title}.`
            break

        case 'kAuthorAddedToAuthoredList':
            attributedDescription = {
                attributes: [
                    {
                        key: actor._id,
                        value: actor.displayName,
                        type: 'user'
                    },
                    {
                        key: user._id,
                        value: user.displayName,
                        type: 'user'
                    },
                    {
                        key: list._id,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${actor._id} added ${user._id} as an author on your shared list, ${list._id}.`,
            }
            description = `${actor.displayName} added ${user.displayName} as an author on your shared list, ${list.title}.`
            break

        case 'kAuthorAddedToSubscribedList':
            attributedDescription = {
                attributes: [
                    {
                        key: user._id,
                        value: user.displayName,
                        type: 'user'
                    },
                    {
                        key: list._id,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${user._id} was added as an author on your subscribed list, ${list._id}.`
            }
            description = `${user.displayName} was added as an author on your subscribed list, ${list.title}.`
            break

        case 'kRemovedAsAuthor':
            attributedDescription = {
                attributes: [
                    {
                        key: actor._id,
                        value: actor.displayName,
                        type: 'user'
                    },
                    {
                        key: list._id,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `Aww... ${actor._id} removed you as an author from their list, ${list._id}.`
            }
            description = `Aww... ${actor.displayName} removed you as an author from their list, ${list.title}.`
            break

        case 'kAuthorRemovedFromAuthoredList':
            attributedDescription = {
                attributes: [
                    {
                        key: actor._id,
                        value: actor.displayName,
                        type: 'user'
                    },
                    {
                        key: user._id,
                        value: user.displayName,
                        type: 'user'
                    },
                    {
                        key: list._id,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${actor._id} removed ${user._id} as an author from your shared list, ${list._id}.`
            }
            description = `${actor.displayName} removed ${user.displayName} as an author from your shared list, ${list.title}.`
            break

        case 'kAuthorRemovedFromSubscribedList':
            attributedDescription = {
                attributes: [
                    {
                        key: user._id,
                        value: user.displayName,
                        type: 'user'
                    },
                    {
                        key: list._id,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${user._id} was removed an an author from your subscribed list, ${list._id}.`
            }
            description = `${user.displayName} was removed an an author from your subscribed list, ${list.title}.`
            break

        case 'kPlaceAddedToAuthoredList':
            attributedDescription = {
                attributes: [
                    {
                        key: actor._id,
                        value: actor.displayName,
                        type: 'user'
                    },
                    {
                        key: place._id,
                        value: place.title,
                        type: 'place'
                    },
                    {
                        key: list._id,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${actor._id} added ${place._id} to your shared list, ${list._id}.`
            }
            description = `${actor.displayName} added ${place.title} to your shared list, ${list.title}.`
            break

        case 'kPlaceAddedToSubscribedList':
            attributedDescription = {
                attributes: [
                    {
                        key: place._id,
                        value: place.title,
                        type: 'place'
                    },
                    {
                        key: list._id,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${place._id} was added to your subscribed list, ${list._id}.`
            }
            description = `${place.title} was added to your subscribed list, ${list.title}.`
            break

        case 'kPlaceRemovedFromAuthoredList':
            attributedDescription = {
                attributes: [
                    {
                        key: actor._id,
                        value: actor.displayName,
                        type: 'user'
                    },
                    {
                        key: place._id,
                        value: place.title,
                        type: 'place'
                    },
                    {
                        key: list._id,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${actor._id} removed ${place._id} from your shared list, ${list._id}.`
            }
            description = `${actor.displayName} removed ${place.title} from your shared list, ${list.title}.`
            break

        case 'kPlaceRemovedFromSubscribedList':
            attributedDescription = {
                attributes: [
                    {
                        key: place._id,
                        value: place.title,
                        type: 'place'
                    },
                    {
                        key: list._id,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${place._id} was removed from your subscribed list, ${list._id}.`
            }
            description = `${place.title} was removed from your subscribed list, ${list.title}.`
            break

        case 'kListShared':
            return

        case 'kPlaceShared':
            return

        case 'kUserShared':
            return

        case 'kCommentAddedToPlaceOnAuthoredList':
            return

        case 'kCommentRemovedFromPlaceOnAuthoredList':
            return

        case 'kNewSubscriberOnAuthoredList':
            attributedDescription = {
                attributes: [
                    {
                        key: actor._id,
                        value: actor.displayName,
                        type: 'user'
                    },
                    {
                        key: list._id,
                        value: list.title,
                        type: 'list'
                    }
                ],
                description: `${actor._id} subscribed to your list, ${list._id}.`
            }
            description = `${actor.displayName} subscribed to your list, ${list.title}.`
            break

        case 'kNewFollower':
            attributedDescription = {
                attributes: [
                    {
                        key: actor._id,
                        value: actor.displayName,
                        type: 'user'
                    }
                ],
                description: `${actor._id} started following you.`
            }
            description = `${actor.displayName} started following you.`
            break
    }

    let notificationArray = []
    targets.forEach(function(target) {
        const notification = new Notification({
            actorId: _.get(body, 'data.actor._id'),
            attributedDescription,
            description,
            object: {
                listId: _.get(body, 'data.list._id'),
                placeId: _.get(body, 'data.place._id'),
                userId: _.get(body, 'data.user._id')
            },
            targetId: _.get(target, '_id'),
            type: body.notificationType
        })
        notificationArray.push(notification)

        console.log('notification', JSON.stringify(notification))        
    })

    try {
        await Notification.insertMany(notificationArray)
        channel.ack(message)

    } catch (err) {
        console.error('NotificationService.createNotifications err', err)
    }
}

const sendPushNotifications = async (message) => {
    console.log('NotificationService.sendPushNotifications')
    const body = JSON.parse(message.content.toString())

    const notification = new apn.Notification({
        badge: body.data.notification.badge,
        body: body.data.notification.body,
        collapseId: body.data.notification.collapseId,
        payload: body.data.notification.payload,
        threadId: body.data.notification.threadId,
        titleLocKey: body.data.notification.titleLocKey,
        topic: body.data.notification.topic
    })
    const deviceTokens = body.data.deviceTokens

    provider.send(notification, deviceTokens).then(result => {
        console.log('result', JSON.stringify(result))
    })

    channel.ack(message)
}

// create
const create = async (req, res) => {
    console.log('NotificationService.create')

    const { actorId, object, targetId, type } = req.body

    if (!actorId) {
        return res.status(400).send({
            message: 'Notification must have an actor.'
        })
    }

    if (!object) {
        return res.status(400).send({
            message: 'Notification must have an object.'
        })
    }

    if (!targetId) {
        return res.status(400).send({
            message: 'Notification must have a target.'
        })
    }

    if (!type) {
        return res.status(400).send({
            message: 'Notification must have a type.'
        })
    }

    switch (type) {
        case 'listShared':
            if (!object.listId) {
                return res.status(400).send({
                    message: `Notification of type ${type} must have a List.`
                })
            }
            break

        case 'placeShared':
            if (!object.placeId) {
                return res.status(400).send({
                    message: `Notification of type ${type} must have a Place.`
                })
            }
            break

        case 'userShared':
            if (!object.placeId) {
                return res.status(400).send({
                    message: `Notification of type ${type} must have a User.`
                })
            }
            break

        case 'addedAsAuthor':
            if (!object.listId) {
                return res.status(400).send({
                    message: `Notification of type ${type} must have a List.`
                })
            }
            break

        case 'removedAsAuthor':
            if (!object.listId) {
                return res.status(400).send({
                    message: `Notification of type ${type} must have a List.`
                })
            }
            break

        case 'placeAddedToAuthoredList':
            if (!object.placeId || !object.listId) {
                return res.status(400).send({
                    message: `Notification of type ${type} must have a Place and List.`
                })
            }
            break

        case 'placeRemovedFromAuthoredList':
            if (!object.placeId || !object.listId) {
                return res.status(400).send({
                    message: `Notification of type ${type} must have a Place and List.`
                })
            }
            break

        case 'placeAddedToSubscribedList':
            if (!object.placeId || !object.listId) {
                return res.status(400).send({
                    message: `Notification of type ${type} must have a Place and List.`
                })
            }
            break

        case 'placeRemovedFromSubscribedList':
            if (!object.placeId || !object.listId) {
                return res.status(400).send({
                    message: `Notification of type ${type} must have a Place and List.`
                })
            }
            break

        case 'authorAddedToAuthoredList':
            if (!object.userId || !object.listId) {
                return res.status(400).send({
                    message: `Notification of type ${type} must have a User and List.`
                })
            }
            break

        case 'authorRemovedFromAuthoredList':
            if (!object.userId || !object.listId) {
                return res.status(400).send({
                    message: `Notification of type ${type} must have a User and List.`
                })
            }
            break
    }

    const notification = new Notification({
        actorId,
        object,
        targetId,
        type
    })

    try {
        const savedNotification = await notification.save()
        res.send(savedNotification)

    } catch(err) {
        console.log('NotificationService.create err', err)

        res.status(500).send({
            message: err.message || 'An error occurred while creating a Notification.'
        })
    }
}

// get
const get = async (req, res) => {
    console.log('NotificationService.get')

    const q = url.parse(req.url, true).query
    const { targetId } = q

    try {
        const notifications = await Notification.find({ targetId })
        .populate('actor object.list object.place object.user target')
        res.send(notifications || [])
    
    } catch (err) {
        console.log('NotificationService.create err', err)

        res.status(500).send({
            message: err.message || `An error occurred while retrieving Notifications for ${targetId}`
        })
    }
}


module.exports = { create, get }
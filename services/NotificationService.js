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
    console.log('NotificationService send in-app notifications')

    // console.log(message)

    channel.ack(message)
}

const sendPushNotifications = async (message) => {
    console.log('NotificationService send push notifications')
    const body = JSON.parse(message.content.toString())
    // console.log(body)

    const notification = new apn.Notification({
        badge: body.data.notification.badge,
        body: body.data.notification.body,
        collapseId: body.data.notification.collapseId,
        payload: body.data.notification.payload,
        titleLocArgs: body.data.notification.titleLocArgs,
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
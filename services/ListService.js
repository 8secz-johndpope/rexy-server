const Comment = require('../models/Comment.js')
const List = require('../models/List.js')
const Place = require('../models/Place.js')
const User = require('../models/User.js')

const aws = require('aws-sdk')
const mongoose = require('mongoose')
const multer = require('multer')
const multerS3 = require('multer-s3')
const url = require('url')
const _ = require('lodash')


// message queue
const amqp = require('amqplib')

var channel = null
const notificationExchange = 'notificationExchange'
const createExchange = 'createExchange'
const updateExchange = 'updateExchange'
const deleteExchange = 'deleteExchange'

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

    const q = await channel.assertQueue('', { exclusive: true })
    channel.bindQueue(q.queue, createExchange, '')
    channel.consume(q.queue, createObject)
    
    const q2 = await channel.assertQueue('', { exclusive: true })
    channel.bindQueue(q2.queue, updateExchange, '')
    channel.consume(q2.queue, updateObject)

    const q3 = await channel.assertQueue('', { exclusive: true })
    channel.bindQueue(q3.queue, deleteExchange, '')
    channel.consume(q3.queue, deleteObject)
})

const createObject = async (message) => {
    const body = JSON.parse(message.content.toString())

    console.log('ListService.createObject in', body.collection)
}

const updateObject = async (message) => {
    const body = JSON.parse(message.content.toString())

    console.log('ListService.updateObject in', body.collection)
}

const deleteObject = async (message) => {
    const body = JSON.parse(message.content.toString())

    console.log('ListService.deleteObject in', body.collection)
}

function notificationPublisher(notificationType, data) {
    const message = { notificationType, data }
    channel.publish(notificationExchange, '', Buffer.from(JSON.stringify(message)))
}


// create
const create = async (req, res) => {
    console.log('ListService.create')

    const actor = req.user
    const { accoladesYear, authorIds, date, dateBasedAccolades, description, groupName, imagePath, isDeleted, isPrivate, placeIds, subscriberIds, title } = req.body

    if (!title) {
        return res.status(400).send({
            message: 'List must have a title.'
        })
    }

    const list = new List({ accoladesYear, authorIds, date, dateBasedAccolades, description, groupName, imagePath, isDeleted, isPrivate, placeIds, subscriberIds, title })

    try {
        const savedList = await list.save()

        if (actor.followers) {
            const targets = actor.followers.filter(user => user._id.toString() !== actor._id.toString())
            const deviceTokens = targets.filter(user => _.get(user, 'settings.deviceToken') && _.get(user, 'settings.receiveSubscriptionNotifications')).map(user => user.settings.deviceToken)

            if (deviceTokens && deviceTokens.length) {
                const notification = {
                    badge: 0,
                    body: `Check out ${list.title} in Rexy!`,
                    // collapseId: list._id,
                    payload: {
                        'actorId': actor._id,
                        'category': 'kFollowedUserCreatedList',
                        'listId': list._id
                    },
                    threadId: actor._id,
                    titleLocKey: `${actor.displayName.length ? actor.displayName : 'A user you follow'} created a list`,
                    topic: 'com.gdwsk.Rexy'
                }

                notificationPublisher('kFollowedUserCreatedList', { deviceTokens, notification, actor, list, targets })
            }
        }

        res.send(savedList)
        
    } catch (err) {
        console.log('ListService.create err', title, err)

        res.status(500).send({
            message: err.message || 'An error occurred while creating the List.'
        })
    }
}


// get
const get = async (req, res) => {
    console.log('ListService.get')

    const q = url.parse(req.url, true).query
    const { limit, sort } = q

    try {
        var lists = await List.find()
        .populate('authors')

        if (sort && sort.includes('subscriberCount')) {
            lists.sort(function(a, b) {
                const aObject = sort.charAt(0) === '-' ? b : a
                const bObject = sort.charAt(0) === '-' ? a : b

                const aValue = aObject.subscriberIds.length === bObject.subscriberIds.length ? aObject.updatedAt : aObject.subscriberIds.length
                const bValue = aObject.subscriberIds.length === bObject.subscriberIds.length ? bObject.updatedAt : bObject.subscriberIds.length

                return aValue - bValue
            })
        }

        if (limit) {
            lists = lists.slice(0, limit)
        }

        res.send(lists)
        
    } catch (err) {
        console.log('ListService.get err', q, err)

        res.status(500).send({
            message: err.message || 'An error occurred while retrieving Lists.'
        })
    }
}


// get by id
const getById = async (req, res) => {
    console.log('ListService.getById')

    const listId = req.params.id

    try {
        const list = await List.findById(listId)
        .populate('authors places subscribers')
        if (!list) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }
        res.send(list)

    } catch (err) {
        console.log('ListService.getById err', listId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while retrieving List with id ${listId}`
        })
    }
}


// update
const update = async (req, res) => {
    console.log('ListService.update')

    const listId = req.params.id
    const { accoladesYear, authorIds, date, dateBasedAccolades, description, groupName, imagePath, isDeleted, isPrivate, placeIds, subscriberIds, title } = req.body

    try {
        const list = await List.findByIdAndUpdate(listId, _.omitBy({
            accoladesYear,
            authorIds,
            date,
            dateBasedAccolades,
            description,
            groupName,
            imagePath,
            isDeleted,
            isPrivate,
            placeIds,
            subscriberIds,
            title
        }, _.isUndefined), { new: true })
        .populate('authors places subscribers')
        if (!list) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }
        res.send(list)

    } catch (err) {
        console.log('ListService.update err', listId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while updating List with id ${listId}`
        })
    }
}


// delete
const remove = async (req, res) => {
    console.log('ListService.remove')

    const listId = req.params.id

    try {
        const list = await List.findByIdAndDelete(listId)
        if (!list) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        Comment.deleteMany({ listId }, function (err) {
            if (err) {
                console.log('ListService.remove Comment.deleteMany err', listId, err)
            }
        })

        User.updateMany({ $pull: { listIds: mongoose.Types.ObjectId(listId), subscribedListIds: mongoose.Types.ObjectId(listId) } }, function (err) {
            if (err) {
                console.log('ListService.remove User.update err', listId, err)
            }
        })

        res.send(listId)
        
    } catch (err) {
        console.log('ListService.remove err', listId, err)
        
        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }
        return res.status(500).send({
            message: `An error occurred while deleting List with id ${listId}`
        })
    }
}


// search
const search = async (req, res) => {
    console.log('ListService.search')

    return res.status(9000).send({
        message: 'This is a work in progress, please try again later.'
    })

    const q = url.parse(req.url, true).query
    var { query } = q
    
    if (!query) {
        return res.status(500).send({
            message: 'An error occurred while searching for Lists'
        })
    }

    if (!query.endsWith('*')) {
        query += '*'
    }

    console.log('query', query)

    List.search({ query_string: { query }}, { hydrate: true }, function (err, results) {
        if (err) {
            console.log('ListService.search err', q, err)

            return res.status(500).send({
                message: err.message || 'An error occurred while searching for Lists'
            })
        }
        res.send(results.hits.hits)
    })
}


// upload image
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/heic' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true)
    } else {
        cb(new Error(`Invalid file type (${file.mimetype}), only HEIC, JPEG, and PNG are allowed.`))
    }
}

aws.config.update({
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    region: process.env.AWS_REGION
})

const s3 = new aws.S3()

const storage = multerS3({
    acl: 'public-read-write',
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    key: function (req, file, cb) {
        cb(null, 'lists/' + req.params.id + '-' + Date.now().toString())
    }
})

const uploadImage = multer({ fileFilter, storage }).single('image')


// remove image
const removeImage = async (req, res) => {
    console.log('ListService.removeImage')

    const listId = req.params.id

    try {
        var list = await List.findById(listId)
        .populate('authors places subscribers')
        if (!list) {
            return res.status(404).send({
                message: `List not found with id' ${listId}`
            })
        }

        if (!list.imagePath) {
            return res.send(list)
        }

        const oldKey = list.imagePath.replace(`https://s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_BUCKET_NAME}/`, '')
        const params = { Bucket: process.env.AWS_BUCKET_NAME, Key: oldKey }
        await s3.deleteObject(params).promise()

        const updatedList = await List.findByIdAndUpdate(listId, { imagePath: null }, { new: true })
        .populate('authors places subscribers')
        if (!updatedList) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }
        res.send(updatedList)

    } catch (err) {
        console.log('ListService.removeImage err', listId, err)
        
        return res.status(500).send({
            message: err.message || 'An error occurred while removing an image from List with id', listId
        })
    }
}


// add author
const addAuthor = async (req, res) => {
    console.log('ListService.addAuthor')

    const actor = req.user
    const listId = req.params.id
    const { _id, id } = req.body
    const userId = _id || id

    if (!listId) {
        return res.status(400).send({
            message: 'No List id provided to add Author to.'
        })
    }

    if (!userId) {
        return res.status(400).send({
            message: 'User does not have an id.'
        })
    }

    try {
        const updatedList = await List.findByIdAndUpdate(listId, { $addToSet: { authorIds: userId } }, { new: true })
        .populate('places')
        .populate({
            path: 'authors',
            populate: {
                path: 'settings',
                model: 'Settings'
            }
        })
        .populate({
            path: 'subscribers',
            populate: {
                path: 'settings',
                model: 'Settings'
            }
        })
        if (!updatedList) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        const user = await User.findByIdAndUpdate({ _id: userId }, { $addToSet: { listIds: listId } }, { new: true })
        .populate('settings')

        if (user.settings && _.get(user, 'settings.deviceToken') && _.get(user, 'settings.receiveSubscriptionNotifications')) {
            const notification = {
                badge: 0,
                body: `Congrats! ${actor.displayName} added you as an author on their shared list.`,
                // collapseId: updatedList._id,
                payload: {
                    'actorId': actor._id,
                    'category': 'kAddedAsAuthor',
                    'listId': updatedList._id
                },
                threadId: updatedList._id,
                titleLocKey: updatedList.title,
                topic: 'com.gdwsk.Rexy'
            }

            notificationPublisher('kAddedAsAuthor', { deviceTokens: [user.settings.deviceToken], notification, actor, list: updatedList, targets: [user] })
        }

        let authorIds = []

        if (updatedList.authors) {
            authorIds = updatedList.authors.filter(author => author._id.toString()).map(author => author._id)

            const targets = updatedList.authors.filter(user => user._id.toString() !== actor._id.toString())
            const deviceTokens = targets.filter(user => _.get(user, 'settings.deviceToken') && _.get(user, 'settings.receiveSubscriptionNotifications')).map(user => user.settings.deviceToken)

            if (deviceTokens && deviceTokens.length) {
                const notification = {
                    badge: 0,
                    body: `${actor.displayName} added ${user.displayName.length ? `${user.displayName} as an author` : 'a new author'} on your shared list.`,
                    // collapseId: updatedList._id,
                    payload: {
                        'actorId': actor._id,
                        'category': 'kAuthorAddedToAuthoredList',
                        'listId': updatedList._id
                    },
                    threadId: updatedList._id,
                    titleLocKey: updatedList.title,
                    topic: 'com.gdwsk.Rexy'
                }

                notificationPublisher('kAuthorAddedToAuthoredList', { deviceTokens, notification, actor, list: updatedList, user, targets })
            }
        }

        if (updatedList.subscribers) {
            const targets = updatedList.subscribers.filter(user => !authorIds.includes(user._id.toString) && user._id.toString() !== actor._id.toString())
            const deviceTokens = targets.filter(user => _.get(user, 'settings.deviceToken') && _.get(user, 'settings.receiveSubscriptionNotifications')).map(user => user.settings.deviceToken)

            if (deviceTokens && deviceTokens.length) {
                const notification = {
                    badge: 0,
                    body: `${user.displayName.length ? `${user.displayName} was added as an author` : 'A new author was added'} on your subscribed list.`,
                    // collapseId: updatedList._id,
                    payload: {
                        'actorId': actor._id,
                        'category': 'kAuthorAddedToSubscribedList',
                        'listId': updatedList._id
                    },
                    threadId: updatedList._id,
                    titleLocKey: updatedList.title,
                    topic: 'com.gdwsk.Rexy'
                }

                notificationPublisher('kAuthorAddedToSubscribedList', { deviceTokens, notification, list: updatedList, user, targets })
            }
        }

        res.send(updatedList)

    } catch (err) {
        console.log('ListService.addAuthor err', listId, userId, err)
        
        return res.status(500).send({
            message: `An error occurred while adding author to List with id ${listId}`
        })
    }
}


// remove author
const removeAuthor = async (req, res) => {
    console.log('ListService.removeAuthor')

    const actor = req.user
    const listId = req.params.id
    const userId = req.params.userId

    if (!listId) {
        return res.status(400).send({
            message: 'No List id provided to remove author from.'
        })
    }

    if (!userId) {
        return res.status(400).send({
            message: 'Author to remove from List does not have an id.'
        })
    }

    try {
        const updatedList = await List.findOneAndUpdate({ _id: listId }, { $pull: { authorIds: userId } }, { new: true })
        .populate('places')
        .populate({
            path: 'authors',
            populate: {
                path: 'settings',
                model: 'Settings'
            }
        })
        .populate({
            path: 'subscribers',
            populate: {
                path: 'settings',
                model: 'Settings'
            }
        })
        if (!updatedList) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        const user = await User.findOneAndUpdate({ _id: userId }, { $pull: { listIds: listId } })
        .populate('settings')

        if (user.settings && _.get(user, 'settings.deviceToken') && _.get(user, 'settings.receiveSubscriptionNotifications')) {
            const notification = {
                badge: 0,
                body: `Aww... ${actor.displayName} removed you as an author from their list.`,
                // collapseId: updatedList._id,
                payload: {
                    'actorId': actor._id,
                    'category': 'kRemovedAsAuthor',
                    'listId': updatedList._id
                },
                threadId: updatedList._id,
                titleLocKey: updatedList.title,
                topic: 'com.gdwsk.Rexy'
            }

            notificationPublisher('kRemovedAsAuthor', { deviceTokens: [user.settings.deviceToken], notification, actor, list: updatedList, targets: [user] })
        }

        let authorIds = []

        if (updatedList.authors) {
            authorIds = updatedList.authors.filter(author => author._id.toString()).map(author => author._id)

            const targets = updatedList.authors.filter(user => user._id.toString() !== actor._id.toString())
            const deviceTokens = targets.filter(user => _.get(user, 'settings.deviceToken') && _.get(user, 'settings.receiveSubscriptionNotifications')).map(user => user.settings.deviceToken)

            if (deviceTokens && deviceTokens.length) {
                const notification = {
                    badge: 0,
                    body: `${actor.displayName} removed ${user.displayName.length ? `${user.displayName} as an author` : 'an author'} from your shared list.`,
                    // collapseId: updatedList._id,
                    payload: {
                        'actorId': actor._id,
                        'category': 'kAuthorRemovedFromAuthoredList',
                        'listId': updatedList._id
                    },
                    threadId: updatedList._id,
                    titleLocKey: updatedList.title,
                    topic: 'com.gdwsk.Rexy'
                }

                notificationPublisher('kAuthorRemovedFromAuthoredList', { deviceTokens, notification, actor, list: updatedList, user, targets })
            }
        }

        if (updatedList.subscribers) {
            const targets = updatedList.subscribers.filter(user => !authorIds.includes(user._id.toString) && user._id.toString() !== actor._id.toString())
            const deviceTokens = targets.filter(user => _.get(user, 'settings.deviceToken') && _.get(user, 'settings.receiveSubscriptionNotifications')).map(user => user.settings.deviceToken)

            if (deviceTokens && deviceTokens.length) {
                const notification = {
                    badge: 0,
                    body: `${user.displayName.length ? `${user.displayName} was removed as an author` : 'An author was removed'} from your subscribed list.`,
                    // collapseId: updatedList._id,
                    payload: {
                        'actorId': actor._id,
                        'category': 'kAuthorRemovedFromSubscribedList',
                        'listId': updatedList._id
                    },
                    threadId: updatedList._id,
                    titleLocKey: updatedList.title,
                    topic: 'com.gdwsk.Rexy'
                }

                notificationPublisher('kAuthorRemovedFromSubscribedList', { deviceTokens, notification, list: updatedList, user, targets })
            }
        }

        res.send(updatedList)

    } catch (err) {
        console.log('ListService.removeAuthor err', listId, userId, err)

        return res.status(500).send({
            message: `An error occurred while removing an author from List with id ${listId}`
        })
    }
}


// comments
const getComments = async (req, res) => {
    console.log('ListService.getComments')

    const listId = req.params.id

    try {
        const comments = await Comment.find({ listId })
        .populate('list place user')
        res.send(comments)

    } catch (err) {
        console.log('ListService.getComments err', listId, err)

        res.status(500).send({
            message: err.message || 'An error occurred while retrieving List\'s Comments.'
        })
    }
}


// add place
const addPlace = async (req, res) => {
    console.log('ListService.addPlace')

    const actor = req.user
    const listId = req.params.id
    const { _id, id } = req.body
    const placeId = _id || id

    if (!listId) {
        return res.status(400).send({
            message: 'No List id provided to add Place to.'
        })
    }

    if (!placeId) {
        return res.status(400).send({
            message: 'Place does not have an id.'
        })
    }

    try {
        const updatedList = await List.findByIdAndUpdate(listId, { $addToSet: { placeIds: placeId } }, { new: true })
        .populate('places')
        .populate({
            path: 'authors',
            populate: {
                path: 'settings',
                model: 'Settings'
            }
        })
        .populate({
            path: 'subscribers',
            populate: {
                path: 'settings',
                model: 'Settings'
            }
        })
        if (!updatedList) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        const place = await Place.findById(placeId)

        let authorIds = []

        if (updatedList.authors) {
            authorIds = updatedList.authors.filter(author => author._id.toString()).map(author => author._id)

            const targets = updatedList.authors.filter(user => user._id.toString() !== actor._id.toString())
            const deviceTokens = targets.filter(user => _.get(user, 'settings.deviceToken') && _.get(user, 'settings.receiveSubscriptionNotifications')).map(user => user.settings.deviceToken)

            if (deviceTokens && deviceTokens.length) {
                const notification = {
                    badge: 0,
                    body: `${actor.displayName} added ${place.title.length ? place.title : 'a place'} to your shared list.`,
                    // collapseId: updatedList._id,
                    payload: {
                        'actorId': actor._id,
                        'category': 'kPlaceAddedToAuthoredList',
                        'listId': updatedList._id,
                        'placeId': placeId
                    },
                    threadId: updatedList._id,
                    titleLocKey: updatedList.title,
                    topic: 'com.gdwsk.Rexy'
                }

                notificationPublisher('kPlaceAddedToAuthoredList', { deviceTokens, notification, actor, list: updatedList, place, targets })
            }
        }

        if (updatedList.subscribers) {
            const targets = updatedList.subscribers.filter(user => !authorIds.includes(user._id.toString) && user._id.toString() !== actor._id.toString())
            const deviceTokens = targets.filter(user => _.get(user, 'settings.deviceToken') && _.get(user, 'settings.receiveSubscriptionNotifications')).map(user => user.settings.deviceToken)

            if (deviceTokens && deviceTokens.length) {
                const notification = {
                    badge: 0,
                    body: `${place.title.length ? place.title : 'A place'} was added to your subscribed list.`,
                    // collapseId: updatedList._id,
                    payload: {
                        'category': 'kPlaceAddedToSubscribedList',
                        'listId': updatedList._id,
                        'placeId': placeId
                    },
                    threadId: updatedList._id,
                    titleLocKey: updatedList.title,
                    topic: 'com.gdwsk.Rexy'
                }

                notificationPublisher('kPlaceAddedToSubscribedList', { deviceTokens, notification, list: updatedList, place, targets })
            }
        }

        res.send(updatedList)

    } catch (err) {
        console.log('ListService.addPlace err', listId, placeId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while updating List with id ${listId}`
        })
    }
}


// remove place
const removePlace = async (req, res) => {
    console.log('ListService.removePlace')

    const actor = req.user
    const listId = req.params.id
    const placeId = req.params.placeId

    if (!listId) {
        return res.status(400).send({
            message: 'No List id provided to remove Place from.'
        })
    }

    if (!placeId) {
        return res.status(400).send({
            message: 'No Place id provided to remove from List.'
        })
    }

    try {
        const updatedList = await List.findByIdAndUpdate(listId, { $pull: { placeIds: placeId } }, { new: true })
        .populate('places')
        .populate({
            path: 'authors',
            populate: {
                path: 'settings',
                model: 'Settings'
            }
        })
        .populate({
            path: 'subscribers',
            populate: {
                path: 'settings',
                model: 'Settings'
            }
        })
        if (!updatedList) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        const place = await Place.findById(placeId)

        let authorIds = []

        if (updatedList.authors) {
            authorIds = updatedList.authors.filter(author => author._id.toString()).map(author => author._id)

            const targets = updatedList.authors.filter(user => user._id.toString() !== actor._id.toString())
            const deviceTokens = targets.filter(user => _.get(user, 'settings.deviceToken') && _.get(user, 'settings.receiveSubscriptionNotifications')).map(user => user.settings.deviceToken)

            if (deviceTokens && deviceTokens.length) {
                const notification = {
                    badge: 0,
                    body: `${actor.displayName} removed ${place.title ? place.title : 'a place'} from your shared list.`,
                    // collapseId: updatedList._id,
                    payload: {
                        'category': 'kPlaceRemovedFromAuthoredList',
                        'listId': updatedList._id,
                        'placeId': placeId
                    },
                    threadId: updatedList._id,
                    titleLocKey: updatedList.title,
                    topic: 'com.gdwsk.Rexy'
                }

                notificationPublisher('kPlaceRemovedFromAuthoredList', { deviceTokens, notification, actor, list: updatedList, place, targets })
            }
        }

        if (updatedList.subscribers) {
            const targets = updatedList.subscribers.filter(user => !authorIds.includes(user._id.toString) && user._id.toString() !== actor._id.toString())
            const deviceTokens = targets.filter(user => _.get(user, 'settings.deviceToken') && _.get(user, 'settings.receiveSubscriptionNotifications')).map(user => user.settings.deviceToken)

            if (deviceTokens && deviceTokens.length) {
                const notification = {
                    badge: 0,
                    body: `${place.title ? place.title : 'A place'} was removed from your subscribed list.`,
                    // collapseId: updatedList._id,
                    payload: {
                        'category': 'kPlaceRemovedFromSubscribedList',
                        'listId': updatedList._id,
                        'placeId': placeId
                    },
                    threadId: updatedList._id,
                    titleLocKey: updatedList.title,
                    topic: 'com.gdwsk.Rexy'
                }

                notificationPublisher('kPlaceRemovedFromSubscribedList', { deviceTokens, notification, list: updatedList, place, targets })
            }
        }

        res.send(updatedList)

    } catch (err) {
        console.log('ListService.removePlace err', listId, placeId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while updating List with id ${listId}`
        })
    }
}


// add subscriber
const addSubscriber = async (req, res) => {
    console.log('ListService.addSubscriber')

    const actor = req.user
    const listId = req.params.id
    const { _id, id } = req.body
    const userId = _id || id

    if (!listId) {
        return res.status(400).send({
            message: 'No List id provided to add subscriber to.'
        })
    }

    if (!userId) {
        return res.status(400).send({
            message: 'Subscriber does not have an id.'
        })
    }

    try {
        const updatedList = await List.findByIdAndUpdate(listId, { $addToSet: { subscriberIds: userId } }, { new: true })
        .populate('places')
        .populate({
            path: 'authors',
            populate: {
                path: 'settings',
                model: 'Settings'
            }
        })
        .populate({
            path: 'subscribers',
            populate: {
                path: 'settings',
                model: 'Settings'
            }
        })
        if (!updatedList) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        const user = await User.findByIdAndUpdate(userId, { $addToSet: { subscribedListIds: listId} })

        if (updatedList.authors) {
            let deviceTokens = updatedList.authors.filter(user => user._id.toString() !== actor._id.toString() && _.get(user, 'settings.deviceToken') && _.get(user, 'settings.receiveSubscriptionNotifications')).map(user => user.settings.deviceToken)

            if (deviceTokens && deviceTokens.length) {
                const notification = {
                    badge: 0,
                    body: `${actor.displayName} subscribed to your list.`,
                    // collapseId: updatedList._id,
                    payload: {
                        'actorId': actor._id,
                        'category': 'kNewSubscriberOnAuthoredList',
                        'listId': updatedList._id
                    },
                    threadId: updatedList._id,
                    titleLocKey: updatedList.title,
                    topic: 'com.gdwsk.Rexy'
                }

                notificationPublisher('kNewSubscriberOnAuthoredList', { deviceTokens, notification, actor, list: updatedList, targets: [user] })
            }
        }

        res.send(updatedList)

    } catch (err) {
        console.log('ListService.addSubscriber err', listId, userId, err)
        
        return res.status(500).send({
            message: `An error occurred while subscribing to List with id ${listId}`
        })
    }
}


// remove subscriber
const removeSubscriber = async (req, res) => {
    console.log('ListService.removeSubscriber')

    const listId = req.params.id
    const userId = req.params.userId

    if (!listId) {
        return res.status(400).send({
            message: 'No List id provided to remove subscribed User from.'
        })
    }

    if (!userId) {
        return res.status(400).send({
            message: 'User to remove from subscribers does not have an id.'
        })
    }

    try {
        await User.updateOne({ _id: userId }, { $pull: { subscribedListIds: listId } })

        const updatedList = await List.findByIdAndUpdate(listId, { $pull: { subscriberIds: userId } }, { new: true })
        .populate('authors places subscribers')
        if (!updatedList) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }
        res.send(updatedList)

    } catch (err) {
        console.log('ListService.removeSubscriber', listId, userId, err)

        return res.status(500).send({
            message: `An error occurred while unsubscribing to List with id ${listId}`
        })
    }
}


module.exports = { create, get, getById, update, remove, search, uploadImage, removeImage, addAuthor, removeAuthor, getComments, addPlace, removePlace, addSubscriber, removeSubscriber }
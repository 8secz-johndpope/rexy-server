const Comment = require('../models/Comment.js')
const List = require('../models/List.js')
const User = require('../models/User.js')

const aws = require('aws-sdk')
const mongoose = require('mongoose')
const multer = require('multer')
const multerS3 = require('multer-s3')
const url = require('url')
const _ = require('lodash')

const amqp = require('amqplib')


// message queue
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

    console.log('ListService.createObject in %s', body.collection)
}

const updateObject = async (message) => {
    const body = JSON.parse(message.content.toString())

    console.log('ListService.updateObject in %s', body.collection)
}

const deleteObject = async (message) => {
    const body = JSON.parse(message.content.toString())

    console.log('ListService.deleteObject in %s', body.collection)
}

function notificationPublisher(actionType, data) {
    const message = { actionType, data }
    channel.publish(notificationExchange, '', Buffer.from(JSON.stringify(message)))
}


// create
const create = async (req, res) => {
    console.log('ListService.create')

    const { accoladesYear, authorIds, date, dateBasedAccolades, description, groupName, imagePath, isDeleted, isPrivate, placeIds, subscriberIds, title } = req.body

    if (!title) {
        return res.status(400).send({
            message: 'List must have a title.'
        })
    }

    const list = new List({ accoladesYear, authorIds, date, dateBasedAccolades, description, groupName, imagePath, isDeleted, isPrivate, placeIds, subscriberIds, title })

    try {
        const savedList = await list.save()
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
        const list = await List.findById(listId)
        .populate('authors places subscribers')
        if (!list) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        if (list.authorIds.includes(userId) && user.listIds.includes(listId)) {
            return res.send(list)
        }

        var authorIds = list.authorIds || []
        authorIds.addToSet(userId)

        var listIds = user.listIds
        if (!listIds) {
            listIds = [listId]
        } else {
            listIds.addToSet(listId)
        }

        await User.findByIdAndUpdate(userId, {
            listIds
        })
        const updatedList = await List.findByIdAndUpdate(listId, {
            authorIds
        }, { new: true })
        .populate('authors places subscribers')
        if (!updatedList) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
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
        const list = await List.findById(listId)
        .populate('authors places subscribers')
        if (!list) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        if (!list.authorIds.includes(userId) && !user.listIds.includes(listId)) {
            return res.send(list)
        }

        const authorIds = list.authorIds.filter(function(id) {
            return id != userId
        })

        const listIds = user.listIds.filter(function(id) {
            return id != listId
        })

        await User.findByIdAndUpdate(userId, {
            listIds
        })
        const updatedList = await List.findByIdAndUpdate(listId, {
            authorIds
        }, { new: true })
        .populate('authors places subscribers')
        if (!updatedList) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
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
    const { _id, id, title } = req.body
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
        const list = await List.findById(listId)
        if (!list) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        if (list.placeIds.includes(placeId)) {
            console.log(`List already contains place with id ${placeId}`)
            return res.send(list)
        }

        var placeIds = list.placeIds || []
        placeIds.addToSet(placeId)

        const updatedList = await List.findByIdAndUpdate(listId, {
            placeIds
        }, { new: true })
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

        let authorIds = []

        if (updatedList.authors) {
            authorIds = updatedList.authors.filter(author => author._id.toString()).map(author => author._id)

            let deviceTokens = updatedList.authors.filter(author => author._id.toString() !== actor._id.toString() && _.get(author, 'settings.deviceToken') && _.get(author, 'settings.receiveSubscriptionNotifications')).map(author => author.settings.deviceToken)

            if (deviceTokens && deviceTokens.length) {
                const notification = {
                    badge: 0,
                    body: 'Check it out in Rexy!',
                    collapseId: updatedList._id,
                    payload: {
                        'category': 'kPlaceAddedToAuthoredList',
                        'listId': updatedList._id
                    },
                    // titleLocArgs: ['title'],
                    titleLocKey: `${actor.username} added a new place to your list "${updatedList.title}".`,
                    topic: 'com.gdwsk.Rexy'
                }

                notificationPublisher('placeAddedToOwnList', { deviceTokens, notification })
            }
        }

        if (updatedList.subscribers) {
            const deviceTokens = updatedList.subscribers.filter(subscriber => !authorIds.includes(subscriber._id.toString) && subscriber._id.toString() !== actor._id.toString() && _.get(subscriber, 'settings.deviceToken') && _.get(subscriber, 'settings.receiveSubscriptionNotifications')).map(subscriber => subscriber.settings.deviceToken)

            if (deviceTokens && deviceTokens.length) {
                const notification = {
                    badge: 0,
                    body: 'Check it out in Rexy!',
                    collapseId: updatedList._id,
                    payload: {
                        'category': 'kPlaceAddedToSubscribedList',
                        'listId': updatedList._id
                    },
                    // titleLocArgs: ['title'],
                    titleLocKey: `A new place was added to ${updatedList.title}.`,
                    topic: 'com.gdwsk.Rexy'
                }

                notificationPublisher('placeAddedToList', { deviceTokens, notification })
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
        const list = await List.findById(listId)
        .populate('authors places subscribers')
        if (!list) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        if (!list.placeIds.includes(placeId)) {
            console.log(`List doesn't contain place with id ${placeId}`)
            return res.send(list)
        }

        const placeIds = list.placeIds.filter(function(item) {
            return item != placeId
        })

        const updatedList = await List.findByIdAndUpdate(listId, {
            placeIds
        }, { new: true })
        .populate('authors places subscribers')
        if (!updatedList) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        let authorIds = []

        if (updatedList.authors) {
            authorIds = updatedList.authors.filter(author => author._id.toString()).map(author => author._id)

            let deviceTokens = updatedList.authors.filter(author => author._id.toString() !== actor._id.toString() && _.get(author, 'settings.deviceToken') && _.get(author, 'settings.receiveSubscriptionNotifications')).map(author => author.settings.deviceToken)

            if (deviceTokens && deviceTokens.length) {
                const notification = {
                    badge: 0,
                    body: 'Check it out in Rexy!',
                    collapseId: updatedList._id,
                    payload: {
                        'category': 'kPlaceRemovedFromAuthoredList',
                        'listId': updatedList._id
                    },
                    // titleLocArgs: ['title'],
                    titleLocKey: `${actor.username} removed a place from your list "${updatedList.title}".`,
                    topic: 'com.gdwsk.Rexy'
                }

                notificationPublisher('placeAddedToOwnList', { deviceTokens, notification })
            }
        }

        if (updatedList.subscribers) {
            const deviceTokens = updatedList.subscribers.filter(subscriber => !authorIds.includes(subscriber._id.toString) && subscriber._id.toString() !== actor._id.toString() && _.get(subscriber, 'settings.deviceToken') && _.get(subscriber, 'settings.receiveSubscriptionNotifications')).map(subscriber => subscriber.settings.deviceToken)

            if (deviceTokens && deviceTokens.length) {
                const notification = {
                    badge: 0,
                    body: 'Check it out in Rexy!',
                    collapseId: updatedList._id,
                    payload: {
                        'category': 'kPlaceRemovedFromSubscribedList',
                        'listId': updatedList._id
                    },
                    // titleLocArgs: ['title'],
                    titleLocKey: `A place was removed from ${updatedList.title}.`,
                    topic: 'com.gdwsk.Rexy'
                }

                notificationPublisher('placeAddedToList', { deviceTokens, notification })
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
        const list = await List.findById(listId)
        .populate('authors places subscribers')
        if (!list) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        if (list.subscriberIds.includes(userId) && user.subscribedListIds.includes(listId)) {
            return res.send(list)
        }

        const subscriberIds = list.subscriberIds || []
        subscriberIds.addToSet(userId)

        const subscribedListIds = user.subscribedListIds || []
        subscribedListIds.addToSet(listId)

        await User.findByIdAndUpdate(userId, {
            subscribedListIds
        })
        const updatedList = await List.findByIdAndUpdate(listId, {
            subscriberIds
        }, { new: true })
        .populate('authors places subscribers')
        if (!updatedList) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
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
        const list = await List.findById(listId)
        .populate('authors places subscribers')
        if (!list) {
            return res.status(404).send({
                message: `List not found with id ${listId}`
            })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        if (!list.subscriberIds.includes(userId) && !user.subscribedListIds.includes(listId)) {
            return res.send(list)
        }

        const subscriberIds = list.subscriberIds.filter(function(id) {
            return id != userId
        })

        const subscribedListIds = user.subscribedListIds.filter(function(id) {
            return id != listId
        })

        await User.findByIdAndUpdate(userId, {
            subscribedListIds
        })
        const updatedList = await List.findByIdAndUpdate(listId, {
            subscriberIds
        }, { new: true })
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
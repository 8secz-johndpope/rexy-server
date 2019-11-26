const Comment = require('../models/Comment.js')
const List = require('../models/List.js')
const User = require('../models/User.js')
const APNSProvider = require('../services/NotificationService.js')

const mongoose = require('mongoose')
const url = require('url');
const _ = require('lodash')


// create
const create = async (req, res) => {
    const { accoladesYear, authorIds, date, dateBasedAccolades, description, groupName, isDeleted, isPrivate, placeIds, subscriberIds, title } = req.body

    if (!title) {
        return res.status(400).send({
            message: "List must have a title."
        })
    }

    const list = new List({ accoladesYear, authorIds, date, dateBasedAccolades, description, groupName, isDeleted, isPrivate, placeIds, subscriberIds, title })

    try {
        const savedList = await list.save()
        res.send(savedList)
        
    } catch (err) {
        console.log("ListService.create " + err)

        res.status(500).send({
            message: err.message || "An error occurred while creating the List."
        })
    }
}


// get
const get = async (req, res) => {
    try {
        const lists = await List.find()
        res.send(lists)
        
    } catch (err) {
        console.log("ListService.get " + err)

        res.status(500).send({
            message: err.message || "An error occurred while retrieving Lists."
        })
    }
}


// get by id
const getById = async (req, res) => {
    const listId = req.params.id

    try {
        const list = await List.findById(listId)
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }
        res.send(list)

    } catch (err) {
        console.log("ListService.getById " + listId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }

        return res.status(500).send({
            message: "An error occurred while retrieving List with id " + listId
        })
    }
}


// update
const update = async (req, res) => {
    const listId = req.params.id
    const { accoladesYear, authorIds, date, dateBasedAccolades, description, groupName, isDeleted, isPrivate, placeIds, subscriberIds, title } = req.body

    try {
        const list = await List.findByIdAndUpdate(listId, _.omitBy({
            accoladesYear,
            authorIds,
            date,
            dateBasedAccolades,
            description,
            groupName,
            isDeleted,
            isPrivate,
            placeIds,
            subscriberIds,
            title
        }, _.isUndefined), { new: true }).populate('authors', '-apnsDeviceToken').populate('places').populate('subscribers')
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }
        res.send(list)

    } catch (err) {
        console.log("ListService.update " + listId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }

        return res.status(500).send({
            message: "An error occurred while updating List with id " + listId
        })
    }
}


// delete
const remove = async (req, res) => {
    const listId = req.params.id

    try {
        const list = await List.findByIdAndDelete(listId)
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }

        Comment.deleteMany({ listId }, function (err) {
            if (err) {
                console.log("Comment.deleteMany err " + err)
            }
        })

        User.updateMany({ $pull: { listIds: mongoose.Types.ObjectId(listId), subscribedListIds: mongoose.Types.ObjectId(listId) } }, function (err) {
            if (err) {
                console.log("User.update err " + err)
            }
        })

        res.send(listId)
        
    } catch (err) {
        console.log("ListService.remove " + listId + err)
        
        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }
        return res.status(500).send({
            message: "An error occurred while deleting List with id " + listId
        })
    }
}


// search
const search = async (req, res) => {
    const q = url.parse(req.url, true).query
    var { query } = q

    if (!query) {
        return res.status(500).send({
            message: "An error occurred while searching for Places "
        })
    }

    if (!query.endsWith("*")) {
        query += "*"
    }

    List.search({ query_string: { query }}, { hydrate: true }, function (err, results) {
        if (err) {
            return res.status(500).send({
                message: err.message || "An error occurred while searching for Lists."
            })
        }
        res.send(results.hits.hits)
    })
}


// add author
const addAuthor = async (req, res) => {
    const listId = req.params.id
    const { _id, id } = req.body
    const userId = _id || id

    if (!listId) {
        return res.status(400).send({
            message: "No List id provided to add Author to."
        })
    }

    if (!userId) {
        return res.status(400).send({
            message: "User does not have an id."
        })
    }

    try {
        const list = await List.findById(listId)
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        if (list.authorIds.includes(userId) && user.listIds.includes(listId)) {
            return res.send(list)
        }

        var authorIds = list.authorIds || []
        console.log("authorIds " + authorIds)
        authorIds.addToSet(userId)

        var listIds = user.listIds || []
        console.log("listIds " + listIds)
        listIds.addToSet(listId)

        await User.findByIdAndUpdate(userId, {
            listIds
        })
        const updatedList = await List.findByIdAndUpdate(listId, {
            authorIds
        }, { new: true }).populate('authors', '-apnsDeviceToken').populate('places').populate('subscribers')
        if (!updatedList) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }
        res.send(updatedList)

    } catch (err) {
        console.log("UserService.addAuthor " + listId + req.body + err)
        
        return res.status(500).send({
            message: "An error occurred while adding author to List with id " + listId
        })
    }
}


// remove author
const removeAuthor = async (req, res) => {
    const listId = req.params.id
    const userId = req.params.userId

    if (!listId) {
        return res.status(400).send({
            message: "No List id provided to remove author from."
        })
    }

    if (!userId) {
        return res.status(400).send({
            message: "Author to remove from List does not have an id."
        })
    }

    try {
        const list = await List.findById(listId)
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + userId
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
        }, { new: true }).populate('authors', '-apnsDeviceToken').populate('places').populate('subscribers')
        if (!updatedList) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }
        res.send(updatedList)

    } catch (err) {
        console.log("UserService.removeAuthor " + listId + userId + err)

        return res.status(500).send({
            message: "An error occurred while removing an author from List with id " + listId
        })
    }
}


// comments
const getComments = async (req, res) => {
    const listId = req.params.id

    try {
        const comments = await Comment.find({ listId }).populate('user')
        res.send(comments)

    } catch (err) {
        console.log("ListService.getComments " + listId + err)

        res.status(500).send({
            message: err.message || "An error occurred while retrieving List's Comments."
        })
    }
}


// add place
const addPlace = async (req, res) => {
    const listId = req.params.id
    const { _id, id } = req.body
    const placeId = _id || id

    if (!listId) {
        return res.status(400).send({
            message: "No List id provided to add Place to."
        })
    }

    if (!placeId) {
        return res.status(400).send({
            message: "Place does not have an id."
        })
    }

    try {
        const list = await List.findById(listId)
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }

        if (list.placeIds.includes(placeId)) {
            return res.send(list)
        }

        var placeIds = list.placeIds || []
        placeIds.addToSet(placeId)

        const updatedList = await List.findByIdAndUpdate(listId, {
            placeIds
        }, { new: true }).populate('authors').populate('places').populate('subscribers')
        if (!updatedList) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }

        if (updatedList.subscribers) {
            const deviceTokens = updatedList.subscribers.filter(subscriber => subscriber.apnsDeviceToken && subscriber.receiveSubscriptionNotifications).map(subscriber => subscriber.apnsDeviceToken)
            
            const notification = new APNSProvider.apn.Notification({
                badge: 0,
                body: "Check it out in Rexy!",
                collapseId: updatedList._id,
                payload: {
                    "category": "kListUpdated",
                    "listId": updatedList._id
                },
                titleLocArgs: ["title"],
                titleLocKey: `A new place was added to ${updatedList.title}.`,
                topic: "com.gdwsk.Rexy"
            })

            APNSProvider.provider.send(notification, deviceTokens).then(result => {
                console.log("result " + JSON.stringify(result))
            })
        }

        res.send(updatedList)

    } catch (err) {
        console.log("ListService.addPlace " + listId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }

        return res.status(500).send({
            message: "An error occurred while updating List with id " + listId
        })
    }
}


// remove place
const removePlace = async (req, res) => {
    const listId = req.params.id
    const placeId = req.params.placeId

    if (!listId) {
        return res.status(400).send({
            message: "No List id provided to remove Place from."
        })
    }

    if (!placeId) {
        return res.status(400).send({
            message: "No Place id provided to remove from List."
        })
    }

    try {
        const list = await List.findById(listId)
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }

        if (!list.placeIds.includes(placeId)) {
            return res.send(list)
        }

        const placeIds = list.placeIds.filter(function(item) {
            return item != placeId
        })

        const updatedList = await List.findByIdAndUpdate(listId, {
            placeIds
        }, { new: true }).populate('authors', '-apnsDeviceToken').populate('places').populate('subscribers')
        if (!updatedList) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }
        res.send(updatedList)

    } catch (err) {
        console.log("ListService.removePlace " + listId + placeId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }

        return res.status(500).send({
            message: "An error occurred while updating List with id " + listId
        })
    }
}


// add subscriber
const addSubscriber = async (req, res) => {
    const listId = req.params.id
    const { _id, id } = req.body
    const userId = _id || id

    if (!listId) {
        return res.status(400).send({
            message: "No List id provided to add subscriber to."
        })
    }

    if (!userId) {
        return res.status(400).send({
            message: "Subscriber does not have an id."
        })
    }

    try {
        const list = await List.findById(listId)
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + userId
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
        }, { new: true }).populate('authors', '-apnsDeviceToken').populate('places').populate('subscribers')
        if (!updatedList) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }
        res.send(updatedList)

    } catch (err) {
        console.log("UserService.addSubscriber " + listId + req.body + err)
        
        return res.status(500).send({
            message: "An error occurred while subscribing to List with id " + listId
        })
    }
}


// remove subscriber
const removeSubscriber = async (req, res) => {
    const listId = req.params.id
    const userId = req.params.userId

    if (!listId) {
        return res.status(400).send({
            message: "No List id provided to remove subscribed User from."
        })
    }

    if (!userId) {
        return res.status(400).send({
            message: "User to remove from subscribers does not have an id."
        })
    }

    try {
        const list = await List.findById(listId)
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + userId
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
        }, { new: true }).populate('authors', '-apnsDeviceToken').populate('places').populate('subscribers')
        if (!updatedList) {
            return res.status(404).send({
                message: "List not found with id " + listId
            })
        }
        res.send(updatedList)

    } catch (err) {
        console.log("UserService.removeSubscriber " + listId + userId + err)

        return res.status(500).send({
            message: "An error occurred while unsubscribing to List with id " + listId
        })
    }
}


module.exports = { create, get, getById, update, remove, search, addAuthor, removeAuthor, getComments, addPlace, removePlace, addSubscriber, removeSubscriber }
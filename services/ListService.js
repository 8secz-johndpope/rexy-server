const List = require('../models/List.js')
const User = require('../models/User.js')
const mongoose = require('mongoose')
const url = require('url');
const _ = require('lodash')


// create
const create = async (req, res) => {
    const { accoladesYear, date, dateBasedAccolades, description, groupName, isDeleted, isPrivate, placeIds, title } = req.body

    if (!title) {
        return res.status(400).send({
            message: "List must have a title."
        })
    }

    const list = new List({ accoladesYear, date, dateBasedAccolades, description, groupName, isDeleted, isPrivate, placeIds, title })

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
    const { accoladesYear, date, dateBasedAccolades, description, groupName, isDeleted, isPrivate, placeIds, title } = req.body

    try {
        const list = await List.findByIdAndUpdate(listId, _.omitBy({
            accoladesYear,
            date,
            dateBasedAccolades,
            description,
            groupName,
            isDeleted,
            isPrivate,
            placeIds,
            title
        }, _.isUndefined), { new : true }).populate('authors').populate('places').populate('subscribers')
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
        res.send({
            message: "Successfully deleted List with id " + listId
        })

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
    const query = url.parse(req.url, true).query
    var terms = query["query"]

    if (!terms) {
        return res.status(500).send({
            message: "An error occurred while searching for Places "
        })
    }

    if (!terms.endsWith("*")) {
        terms += "*"
    }

    List.search({ query_string: { query: terms }}, { hydrate: true }, function (err, results) {
        if (err) {
            return res.status(500).send({
                message: err.message || "An error occurred while searching for Lists."
            })
        }
        res.send(results.hits.hits)
    })
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

        const placeId = mongoose.Types.ObjectId(placeId)
        if (list.placeIds.includes(placeId)) {
            return res.send(list)
        }

        const placeIds = list.placeIds || []
        placeIds.addToSet(placeId)

        const updatedList = await List.findByIdAndUpdate(listId, {
            placeIds
        }, { new : true }).populate('authors').populate('places').populate('subscribers')
        if (!updatedList) {
            return res.status(404).send({
                message: "List not found with id " + listId
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
        }, { new : true }).populate('authors').populate('places').populate('subscribers')
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
        }, { new : true }).populate('authors').populate('places').populate('subscribers')
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
        }, { new : true }).populate('authors').populate('places').populate('subscribers')
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


module.exports = { create, get, getById, update, remove, search, addPlace, removePlace, addSubscriber, removeSubscriber }
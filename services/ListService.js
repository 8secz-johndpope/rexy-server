const List = require('../models/List.js')
const UserList = require('../models/UserList.js')
const _ = require('lodash')
const mongoose = require('mongoose')


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
    try {
        const list = await List.findById(req.params.id).populate('places')
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }
        res.send(list)

    } catch (err) {
        console.log("ListService.getById " + req.params.id + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while retrieving List with id " + req.params.id
        })
    }
}


// update
const update = async (req, res) => {
    const { accoladesYear, date, dateBasedAccolades, description, groupName, isDeleted, isPrivate, placeIds, title } = req.body

    try {
        const list = await List.findByIdAndUpdate(req.params.id, _.omitBy({
            accoladesYear,
            date,
            dateBasedAccolades,
            description,
            groupName,
            isDeleted,
            isPrivate,
            placeIds,
            title
        }, _.isUndefined), { new : true }).populate('places')
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }
        res.send(list)

    } catch (err) {
        console.log("ListService.update " + req.params.id + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while updating List with id " + req.params.id
        })
    }
}


// delete
const remove = async (req, res) => {
    try {
        const list = await List.findByIdAndDelete(req.params.id)
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }
        res.send({
            message: "Successfully deleted List with id " + req.params.id
        })

    } catch (err) {
        console.log("ListService.remove " + req.params.id + err)
        
        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }
        return res.status(500).send({
            message: "An error occurred while deleting List with id " + req.params.id
        })
    }
}


// add place
const addPlace = async (req, res) => {
    const { _id, id } = req.body

    if (!req.params.id) {
        return res.status(400).send({
            message: "No List id provided to add Place to."
        })
    }

    if (!_id && !id) {
        return res.status(400).send({
            message: "Place does not have an id."
        })
    }

    try {
        const list = await List.findById(req.params.id)
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }

        const placeId = mongoose.Types.ObjectId(_id || id)
        if (list.placeIds.includes(placeId)) {
            return res.send(list)
        }

        const placeIds = list.placeIds || []
        placeIds.addToSet(placeId)

        const updatedList = await List.findByIdAndUpdate(req.params.id, {
            placeIds: placeIds
        }, { new : true }).populate('places')
        if (!updatedList) {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }
        res.send(updatedList)

    } catch (err) {
        console.log("ListService.addPlace " + req.params.id + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while updating List with id " + req.params.id
        })
    }
}


// remove place
const removePlace = async (req, res) => {
    if (!req.params.id) {
        return res.status(400).send({
            message: "No List id provided to remove Place from."
        })
    }

    if (!req.params.placeId) {
        return res.status(400).send({
            message: "No Place id provided to remove from List."
        })
    }

    try {
        const list = await List.findById(req.params.id)
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }

        if (!list.placeIds.includes(req.params.placeId)) {
            return res.send(list)
        }

        const placeIds = list.placeIds.filter(function(item) {
            return item != req.params.placeId
        })

        const updatedList = await List.findByIdAndUpdate(req.params.id, {
            placeIds: placeIds
        }, { new : true }).populate('places')
        if (!updatedList) {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }
        res.send(updatedList)

    } catch (err) {
        console.log("ListService.removePlace " + req.params.id + req.params.placeId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while updating List with id " + req.params.id
        })
    }
}


// add subscriber
const addSubscriber = async (req, res) => {
    const { _id, id } = req.body

    if (!req.params.id) {
        return res.status(400).send({
            message: "No List id provided to add subscriber to."
        })
    }

    if (!_id && !id) {
        return res.status(400).send({
            message: "Subscriber does not have an id."
        })
    }

    const listId = req.params.id
    const type = "subscription"
    const userId = _id || id

    try {
        const userList = await UserList.find({
            listId,
            type,
            userId
        })
        console.log("UserService.addSubscriber userList " + userList)

        if (!userList) {
            console.log("NO USER LIST")

            const newUserList = new UserList({ listId, type, userId })
            console.log("UserService.addSubscriber newUserList " + newUserList)

            const savedUserList = await newUserList.save()
            console.log("UserService.addSubscriber savedUserList " + savedUserList)
        }

        var list = await List.findById(listId).populate('places')
        const userLists = await UserList.find({
            listId
        }).populate('user')
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }

        list.authors = userLists.filter(function(uL) {
            return uL.type === "authorship"
        }).map(uL => uL.user)
        list.subscribers = userLists.filter(function(uL) {
            return uL.type === "subscription"
        }).map(uL => uL.user)

        res.send(list)

    } catch (err) {
        console.log("UserService.addSubscriber " + req.params.id + req.body + err)
        
        return res.status(500).send({
            message: "An error occurred while subscribing to List with id " + req.params.id
        })
    }
}


// remove subscriber
const removeSubscriber = async (req, res) => {
    return res.status(500).send({
        message: "An error occurred while unsubscribing from List with id " + req.params.id
    })
}


module.exports = { create, get, getById, update, remove, addPlace, removePlace, addSubscriber, removeSubscriber }   
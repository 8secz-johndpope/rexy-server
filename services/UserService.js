const User = require('../models/User.js')
const _ = require('lodash')
const mongoose = require('mongoose')


// create
const create = async (req, res) => {
    const { bookmarkedPlaceIds, emailAddress, firstName, isVerified, lastName, otherLists, phoneNumber, prefersUsername, receiveSubscriptionNotifications, username, visitedPlaceIds, xid } = req.body

    if (!xid) {
        return res.status(400).send({
            message: "User must have an XID."
        })
    }

    const user = new User({ bookmarkedPlaceIds, emailAddress, firstName, isVerified, lastName, otherLists, phoneNumber, prefersUsername, receiveSubscriptionNotifications, username, visitedPlaceIds, xid })

    try {
        const savedUser = await user.save()
        res.send(savedUser)

    } catch (err) {
        console.log("UserService.create " + err)

        res.status(500).send({
            message: err.message || "An error occurred while creating the User."
        })
    }
}


// get
const get = async (req, res) => {
    try {
        const users = await User.find()
        res.send(users)

    } catch (err) {
        console.log("UserService.get " + err)

        res.status(500).send({
            message: err.message || "An error occurred while retrieving Users."
        })
    }
}


// get by id
const getById = async (req, res) => {
    const { type } = req.body

    try {
        if (type === "xid") {
            const user = await User.find({
                xid: req.params.id
            }).populate('bookmarkedPlaces').populate('visitedPlaces')
            if (!user) {
                return res.status(404).send({
                    message: "User not found with id " + req.params.id
                })
            }
            res.send(user)
            } else {
            const user = await User.findById(req.params.id).populate('bookmarkedPlaces').populate('visitedPlaces')
            if (!user) {
                return res.status(404).send({
                    message: "User not found with id " + req.params.id
                })
            }
            res.send(user)
            }

    } catch (err) {
        console.log("UserService.getById " + req.params.id + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while retrieving User with id " + req.params.id
        })
    }
}


// update
const update = async (req, res) => {
    const { bookmarkedPlaceIds, emailAddress, firstName, isVerified, lastName, otherLists, phoneNumber, prefersUsername, receiveSubscriptionNotifications, username, visitedPlaceIds, xid } = req.body

    try {
        const user = await User.findByIdAndUpdate(req.params.id, _.omitBy({
            bookmarkedPlaceIds,
            emailAddress,
            firstName,
            isVerified,
            lastName,
            otherLists,
            phoneNumber,
            prefersUsername,
            receiveSubscriptionNotifications,
            username,
            visitedPlaceIds,
            xid
        }, _.isUndefined), { new : true }).populate('bookmarkedPlaces').populate('visitedPlaces')
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }
        res.send(user)

    } catch (err) {
        console.log("UserService.update " + req.params.id + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while updating User with id " + req.params.id
        })
    }
}


// delete
const remove = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id)
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }
        res.send({
            message: "Successfully deleted User with id " + req.params.id
        })

    } catch (err) {
        console.log("UserService.remove " + req.params.id + err)

        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }
        return res.status(500).send({
            message: "An error occurred while deleting User with id " + req.params.id
        })
    }
}


const UserList = require('../models/UserList.js')


// user lists
const getLists = async (req, res) => {
    const { id } = req.params

    try {
        const userLists = await UserList.find({
            userId: id,
            type: "authorship"
        }).populate({ 
            path: 'list',
            populate: {
              path: 'places',
              model: 'Place'
            } 
         })

        const lists = userLists.map(uL => uL.list)
        res.send(lists)

    } catch (err) {
        console.log("UserService.getLists " + req.params.id + err)

        res.status(500).send({
            message: err.message || "An error occurred while retrieving User's authored Lists."
        })
    }
}


// user subscriptions
const getSubscriptions = async (req, res) => {
    const { id } = req.params

    try {
        const userLists = await UserList.find({
            userId: id,
            type: "subscription"
        }).populate({ 
            path: 'list',
            populate: {
              path: 'places',
              model: 'Place'
            } 
         })
        const lists = userLists.map(uL => uL.list)
        res.send(lists)

    } catch (err) {
        console.log("getSubscriptions.getLists " + req.params.id + err)

        res.status(500).send({
            message: err.message || "An error occurred while retrieving User's subscribed Lists."
        })
    }
}


// add bookmark
const addBookmark = async (req, res) => {
    const { _id, id } = req.body

    if (!req.params.id) {
        return res.status(400).send({
            message: "No User id provided to add bookmarked Place to."
        })
    }

    if (!_id && !id) {
        return res.status(400).send({
            message: "Place to bookmark does not have an id."
        })
    }

    try {
        const user = await User.findById(req.params.id)
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }

        const placeId = mongoose.Types.ObjectId(_id || id)
        if (user.bookmarkedPlaceIds.includes(placeId)) {
            return res.send(user)
        }

        const placeIds = user.bookmarkedPlaceIds || []
        placeIds.addToSet(placeId)

        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            bookmarkedPlaceIds: placeIds
        }, { new : true }).populate('places')
        if (!updatedUser) {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log("UserService.addBookmark " + req.params.id + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while adding a bookmarked Place to User with id " + req.params.id
        })
    }
}


// delete bookmark
const removeBookmark = async (req, res) => {
    if (!req.params.id) {
        return res.status(400).send({
            message: "No User id provided to remove bookmarked Place from."
        })
    }

    if (!req.params.placeId) {
        return res.status(400).send({
            message: "Place to remove from bookmarks does not have an id."
        })
    }

    try {
        const user = await User.findById(req.params.id)
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }

        if (!user.bookmarkedPlaceIds.includes(req.params.placeId)) {
            return res.send(user)
        }

        const placeIds = user.bookmarkedPlaceIds.filter(function(item) {
            return item != req.params.placeId
        })

        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            bookmarkedPlaceIds: placeIds
        }, { new : true }).populate('places')
        if (!updatedUser) {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log("ListService.removeBookmark " + req.params.id + req.params.placeId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while removing a bookmarked Place from User with id " + req.params.id
        })
    }
}


// add visited
const addVisited = async (req, res) => {
    const { _id, id } = req.body

    if (!req.params.id) {
        return res.status(400).send({
            message: "No User id provided to add visited Place to."
        })
    }

    if (!_id && !id) {
        return res.status(400).send({
            message: "Place to mark as visited does not have an id."
        })
    }

    try {
        const user = await User.findById(req.params.id)
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }

        const placeId = mongoose.Types.ObjectId(_id || id)
        if (user.visitedPlaceIds.includes(placeId)) {
            return res.send(user)
        }

        const placeIds = user.visitedPlaceIds || []
        placeIds.addToSet(placeId)

        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            visitedPlaceIds: placeIds
        }, { new : true }).populate('places')
        if (!updatedUser) {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log("UserService.addVisited " + req.params.id + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while marking a Place as visited on User with id " + req.params.id
        })
    }
}


// delete visited
const removeVisited = async (req, res) => {
    if (!req.params.id) {
        return res.status(400).send({
            message: "No User id provided to remove visited Place from."
        })
    }

    if (!req.params.placeId) {
        return res.status(400).send({
            message: "Place to remove from visited does not have an id."
        })
    }

    try {
        const user = await User.findById(req.params.id)
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }

        if (!user.visitedPlaceIds.includes(req.params.placeId)) {
            return res.send(user)
        }

        const placeIds = user.visitedPlaceIds.filter(function(item) {
            return item != req.params.placeId
        })

        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            visitedPlaceIds: placeIds
        }, { new : true }).populate('places')
        if (!updatedUser) {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log("ListService.removeVisited " + req.params.id + req.params.placeId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while removing a visited Place from User with id " + req.params.id
        })
    }
}

module.exports = { create, get, getById, update, remove, getLists, getSubscriptions, addBookmark, removeBookmark, addVisited, removeVisited }   
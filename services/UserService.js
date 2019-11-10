const User = require('../models/User.js')
const url = require('url');
const _ = require('lodash')


// create
const create = async (req, res) => {
    const { bookmarkedPlaceIds, emailAddress, firstName, isVerified, lastName, listIds, phoneNumber, prefersUsername, receiveSubscriptionNotifications, subscribedListIds, username, visitedPlaceIds, xid } = req.body

    if (!xid) {
        return res.status(400).send({
            message: "User must have an XID."
        })
    }

    const user = new User({ bookmarkedPlaceIds, emailAddress, firstName, isVerified, lastName, listIds, phoneNumber, prefersUsername, receiveSubscriptionNotifications, subscribedListIds, username, visitedPlaceIds, xid })

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
        const users = await User.find().select('-xid')
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
    const query = url.parse(req.url, true).query
    const userId = req.params.id

    try {
        if (query["type"] === "xid") {
            const users = await User.find({
                xid: userId
            }).select('-xid').populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces')
            const user = users[0]
            if (!user) {
                return res.status(404).send({
                    message: "User not found with xid " + userId
                })
            }
            res.send(user)

        } else {
            const user = await User.findById(userId).select('-xid')
            if (!user) {
                return res.status(404).send({
                    message: "User not found with id " + userId
                })
            }
            res.send(user)
        }

    } catch (err) {
        console.log("UserService.getById " + userId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        return res.status(500).send({
            message: "An error occurred while retrieving User with id " + userId
        })
    }
}


// update
const update = async (req, res) => {
    const userId = req.params.id
    const { bookmarkedPlaceIds, emailAddress, firstName, isVerified, lastName, listIds, phoneNumber, prefersUsername, receiveSubscriptionNotifications, subscribedListIds, username, visitedPlaceIds, xid } = req.body

    try {
        const user = await User.findByIdAndUpdate(userId, _.omitBy({
            bookmarkedPlaceIds,
            emailAddress,
            firstName,
            isVerified,
            lastName,
            listIds,
            phoneNumber,
            prefersUsername,
            receiveSubscriptionNotifications,
            subscribedListIds,
            username,
            visitedPlaceIds,
            xid
        }, _.isUndefined), { new : true }).select('-xid').populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces')
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }
        res.send(user)

    } catch (err) {
        console.log("UserService.update " + userId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        return res.status(500).send({
            message: "An error occurred while updating User with id " + userId
        })
    }
}


// delete
const remove = async (req, res) => {
    const userId = req.params.id

    try {
        const user = await User.findByIdAndDelete(userId)
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }
        res.send({
            message: "Successfully deleted User with id " + userId
        })

    } catch (err) {
        console.log("UserService.remove " + userId + err)

        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }
        return res.status(500).send({
            message: "An error occurred while deleting User with id " + userId
        })
    }
}


// user lists
const getLists = async (req, res) => {
    const userId = req.params.id

    try {
        const user = await User.findById(userId).populate({
            path: 'lists',
            populate: {
                path: 'authors',
                model: 'User'
            }
        }).populate({
            path: 'lists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        }).populate({
            path: 'lists',
            populate: {
                path: 'subscribers',
                model: 'User'
            }
        })
        res.send(user.lists || [])

    } catch (err) {
        console.log("UserService.getLists " + userId + err)

        res.status(500).send({
            message: err.message || "An error occurred while retrieving User's authored Lists."
        })
    }
}


// user subscriptions
const getSubscriptions = async (req, res) => {
    const userId = req.params.id

    try {
        const user = await User.findById(userId).populate({
            path: 'subscribedLists',
            populate: {
                path: 'authors',
                model: 'User'
            }
        }).populate({
            path: 'subscribedLists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        }).populate({
            path: 'subscribedLists',
            populate: {
                path: 'subscribers',
                model: 'User'
            }
        })
        res.send(user.subscribedLists || [])

    } catch (err) {
        console.log("getSubscriptions.getLists " + userId + err)

        res.status(500).send({
            message: err.message || "An error occurred while retrieving User's subscribed Lists."
        })
    }
}


// add bookmark
const addBookmark = async (req, res) => {
    const userId = req.params.id
    const { _id, id } = req.body
    const placeId = _id || id

    if (!userId) {
        return res.status(400).send({
            message: "No User id provided to add bookmarked Place to."
        })
    }

    if (!placeId) {
        return res.status(400).send({
            message: "Place to bookmark does not have an id."
        })
    }

    try {
        const user = await User.findById(userId).select('-xid')
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        if (user.bookmarkedPlaceIds.includes(placeId)) {
            return res.send(user)
        }

        const placeIds = user.bookmarkedPlaceIds || []
        placeIds.addToSet(placeId)

        const updatedUser = await User.findByIdAndUpdate(userId, {
            bookmarkedPlaceIds: placeIds
        }, { new : true }).select('-xid').populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces')
        if (!updatedUser) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log("UserService.addBookmark " + userId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        return res.status(500).send({
            message: "An error occurred while adding a bookmarked Place to User with id " + userId
        })
    }
}


// delete bookmark
const removeBookmark = async (req, res) => {
    const userId = req.params.id
    const placeId = req.params.placeId

    if (!userId) {
        return res.status(400).send({
            message: "No User id provided to remove bookmarked Place from."
        })
    }

    if (!placeId) {
        return res.status(400).send({
            message: "Place to remove from bookmarks does not have an id."
        })
    }

    try {
        const user = await User.findById(userId).select('-xid')
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        if (!user.bookmarkedPlaceIds.includes(placeId)) {
            return res.send(user)
        }
        
        const bookmarkedPlaceIds = user.bookmarkedPlaceIds.filter(function(item) {
            return item != placeId
        }) || []

        const updatedUser = await User.findByIdAndUpdate(userId, {
            bookmarkedPlaceIds
        }, { new : true }).select('-xid').populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces')
        if (!updatedUser) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log("ListService.removeBookmark " + userId + placeId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        return res.status(500).send({
            message: "An error occurred while removing a bookmarked Place from User with id " + userId
        })
    }
}


// add visited
const addVisited = async (req, res) => {
    const userId = req.params.id
    const { _id, id } = req.body
    const placeId = _id || id

    if (!userId) {
        return res.status(400).send({
            message: "No User id provided to add visited Place to."
        })
    }

    if (!placeId) {
        return res.status(400).send({
            message: "Place to mark as visited does not have an id."
        })
    }

    try {
        const user = await User.findById(userId).select('-xid')
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        if (user.visitedPlaceIds.includes(placeId)) {
            return res.send(user)
        }

        const placeIds = user.visitedPlaceIds || []
        placeIds.addToSet(placeId)

        const updatedUser = await User.findByIdAndUpdate(userId, {
            visitedPlaceIds: placeIds
        }, { new : true }).select('-xid').populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces')
        if (!updatedUser) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log("UserService.addVisited " + userId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        return res.status(500).send({
            message: "An error occurred while marking a Place as visited on User with id " + userId
        })
    }
}


// delete visited
const removeVisited = async (req, res) => {
    const userId = req.params.id
    const placeId = req.params.placeId

    if (!userId) {
        return res.status(400).send({
            message: "No User id provided to remove visited Place from."
        })
    }

    if (!placeId) {
        return res.status(400).send({
            message: "Place to remove from visited does not have an id."
        })
    }

    try {
        const user = await User.findById(userId).select('-xid')
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        if (!user.visitedPlaceIds.includes(placeId)) {
            return res.send(user)
        }

        const placeIds = user.visitedPlaceIds.filter(function(item) {
            return item != placeId
        })

        const updatedUser = await User.findByIdAndUpdate(userId, {
            visitedPlaceIds: placeIds
        }, { new : true }).select('-xid').populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces')
        if (!updatedUser) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log("ListService.removeVisited " + userId + placeId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        return res.status(500).send({
            message: "An error occurred while removing a visited Place from User with id " + userId
        })
    }
}

module.exports = { create, get, getById, update, remove, getLists, getSubscriptions, addBookmark, removeBookmark, addVisited, removeVisited }
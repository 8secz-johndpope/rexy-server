const Comment = require('../models/Comment.js')
const List = require('../models/List.js')
const NotificationSettings = require('../models/NotificationSettings.js')
const User = require('../models/User.js')

const mongoose = require('mongoose')
const url = require('url');
const _ = require('lodash')


// create
const create = async (req, res) => {
    console.log("UserService.create")

    var { bookmarkedPlaceIds, emailAddress, firstName, isVerified, lastName, listIds, notificationSettingsId, phoneNumber, prefersUsername, subscribedListIds, username, visitedPlaceIds, xid } = req.body

    if (!xid) {
        return res.status(400).send({
            message: "User must have an XID."
        })
    }

    const user = new User({ bookmarkedPlaceIds, emailAddress, firstName, isVerified, lastName, listIds, notificationSettingsId, phoneNumber, prefersUsername, subscribedListIds, username, visitedPlaceIds, xid })

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
    console.log("UserService.get")

    try {
        const users = await User.find().select('-xid').select('-notificationSettings')
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
    console.log("UserService.getById")

    const userId = req.params.id
    const q = url.parse(req.url, true).query
    const { type } = q

    try {
        if (type === "xid") {
            const user = await User.findOne({
                xid: userId
            }).select('-xid').select('-notificationSettings')
            if (!user) {
                return res.status(404).send({
                    message: "User not found with xid " + userId
                })
            }
            res.send(user)

        } else {
            const user = await User.findById(userId).select('-xid').select('-notificationSettings')
            if (!user) {
                return res.status(404).send({
                    message: "User not found with id " + userId
                })
            }
            res.send(user)
        }

    } catch (err) {
        console.log("UserService.getById " + userId + ", " + err)

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
    console.log("UserService.update")

    const userId = req.params.id
    const { bookmarkedPlaceIds, emailAddress, firstName, isVerified, lastName, listIds, notificationSettingsId, phoneNumber, prefersUsername, subscribedListIds, username, visitedPlaceIds, xid } = req.body

    try {
        const user = await User.findByIdAndUpdate(userId, _.omitBy({
            bookmarkedPlaceIds,
            emailAddress,
            firstName,
            isVerified,
            lastName,
            listIds,
            notificationSettingsId,
            phoneNumber,
            prefersUsername,
            subscribedListIds,
            username,
            visitedPlaceIds,
            xid
        }, _.isUndefined), { new: true }).select('-xid').select('-notificationSettings').populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces')
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
    console.log("UserService.remove")

    const userId = req.params.id

    try {
        const user = await User.findByIdAndDelete(userId)
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        NotificationSettings.deleteMany({ userId }, function (err) {
            if (err) {
                console.log("NotificationSettings.deleteMany err" + err)
            }
        })

        Comment.deleteMany({ userId }, function (err) {
            if (err) {
                console.log("Comment.deleteMany err " + err)
            }
        })

        List.updateMany({ $pull: { authorIds: mongoose.Types.ObjectId(userId), subscriberIds: mongoose.Types.ObjectId(userId) } }, function (err) {
            if (err) {
                console.log("List.updateMany err " + err)
            }
        })

        res.send(userId)

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
    console.log("UserService.getLists")

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
    console.log("UserService.getSubscriptions")

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
    console.log("UserService.addBookmark")

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
        const user = await User.findById(userId).select('-xid').select('-notificationSettings')
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
        }, { new: true }).select('-xid').select('-notificationSettings').populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces')
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


// get bookmarks
const getBookmarks = async (req, res) => {
    console.log("UserService.getBookmarks")

    const userId = req.params.id

    if (!userId) {
        return res.status(400).send({
            message: "No User id provided to get bookmarked Places from."
        })
    }

    try {
        const user = await User.findById(userId).select('-xid').select('-notificationSettings')
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        res.send(user.bookmarkedPlaces || [])

    } catch (err) {
        console.log("UserService.getBookmarks " + userId + placeId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        return res.status(500).send({
            message: "An error occurred while getting bookmarked Places from User with id " + userId
        })
    }
}


// delete bookmark
const removeBookmark = async (req, res) => {
    console.log("UserService.removeBookmark")

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
        const user = await User.findById(userId).select('-xid').select('-notificationSettings')
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
        }, { new: true }).select('-xid').select('-notificationSettings').populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces')
        if (!updatedUser) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log("UserService.removeBookmark " + userId + placeId + err)

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
    console.log("UserService.addVisited")

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
        const user = await User.findById(userId).select('-xid').select('-notificationSettings')
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
        }, { new: true }).select('-xid').populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces')
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


// get visited
const getVisited = async (req, res) => {
    console.log("UserService.getVisited")

    const userId = req.params.id

    if (!userId) {
        return res.status(400).send({
            message: "No User id provided to get visited Places from."
        })
    }

    try {
        const user = await User.findById(userId).select('-xid').select('-notificationSettings')
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        res.send(user.visitedPlaces || [])

    } catch (err) {
        console.log("UserService.getVisited " + userId + placeId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }

        return res.status(500).send({
            message: "An error occurred while getting visited Places from User with id " + userId
        })
    }
}

// delete visited
const removeVisited = async (req, res) => {
    console.log("UserService.removeVisited")

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
        const user = await User.findById(userId).select('-xid').select('-notificationSettings')
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
        }, { new: true }).select('-xid').select('-notificationSettings').populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces')
        if (!updatedUser) {
            return res.status(404).send({
                message: "User not found with id " + userId
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log("UserService.removeVisited " + userId + placeId + err)

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

// register
const register = async (req, res) => {
    console.log("UserService.register")

    const userId = req.params.id
    const { deviceToken } = req.body

    if (!deviceToken) {
        return res.status(400).send({
            message: "No device token provided to register."
        })
    }

    const user = await User.findById(userId).select('-xid').populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces').populate('notificationSettings')

    if (!user) {
        return res.status(404).send({
            message: "User not found with id " + userId
        })
    }

    if (user.notificationSettings && user.notificationSettings.deviceToken && user.notificationSettings.deviceToken === deviceToken) {
        return res.send(user)
    }

    var notificationSettingsId

    const notificationSettings = new NotificationSettings({ deviceToken, userId })
    try {
        const savedSettings = await notificationSettings.save()
        notificationSettingsId = savedSettings._id
    } catch (err) {
        console.log("UserService.create " + err)

        res.status(500).send({
            message: err.message || "An error occurred while registering device token."
        })
    }

    var updatedUser = await User.findByIdAndUpdate(userId, {
        notificationSettingsId
    }, { new: true }).select('-xid').populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces').populate('notificationSettings')

    if (!updatedUser) {
        return res.status(404).send({
            message: "User not found with id " + userId
        })
    }

    if (!updatedUser.notificationSettings || !updatedUser.notificationSettings.deviceToken) {
        return res.status(500).send({
            message: "An error occurred while adding APNs device token to User with id " + userId
        })
    }

    res.send(updatedUser)
}

module.exports = { create, get, getById, update, remove, getLists, getSubscriptions, addBookmark, getBookmarks, removeBookmark, addVisited, getVisited, removeVisited, register }
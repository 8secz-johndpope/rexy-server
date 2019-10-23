const User = require('../models/User.js')
const _ = require('lodash')


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
    } catch(err) {
        console.log("UserService.create" + err)

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
    } catch(err) {
        console.log("UserService.get" + err)

        res.status(500).send({
            message: err.message || "An error occurred while retrieving Users."
        })
    }
}


// get by id
const getById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('bookmarkedPlaces, visitedPlaces')
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }
        res.send(user)
    } catch(err) {
        console.log("UserService.getById" + req.params.id + err)

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
        }, _.isUndefined), { new : true }).populate('bookmarkedPlaces, visitedPlaces')
        if (!user) {
            return res.status(404).send({
                message: "User not found with id " + req.params.id
            })
        }
        res.send(user)
    } catch(err) {
        console.log("UserService.update" + req.params.id + err)

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
    } catch(err) {
        console.log("UserService.remove" + req.params.id + err)

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


module.exports = { create, get, getById, update, remove }   
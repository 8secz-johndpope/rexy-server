const UserList = require('../models/UserList.js')
const _ = require('lodash')


// create
const create = async (req, res) => {
    const { listId, type, userId } = req.body

    if (!listId) {
        return res.status(400).send({
            message: "UserList must have a list."
        })
    }

    if (!type) {
        return res.status(400).send({
            message: "UserList must have a type."
        })
    }

    if (!userId) {
        return res.status(400).send({
            message: "UserList must have a user."
        })
    }

    const userList = new UserList({ listId, type, userId })

    try {
        const savedUserList = await userList.save()
        res.send(savedUserList)
        
    } catch(err) {
        console.log("UserListService.create " + err)

        res.status(500).send({
            message: err.message || "An error occurred while creating the UserList."
        })
    }
}


// get
const get = async (req, res) => {
    try {
        const userLists = await UserList.find()
        res.send(userLists)

    } catch(err) {
        console.log("UserListService.get " + err)

        res.status(500).send({
            message: err.message || "An error occurred while retrieving UserLists."
        })
    }
}


// delete
const remove = async (req, res) => {
    try {
        const userList = await UserList.findByIdAndDelete(req.params.id)
        if (!userList) {
            return res.status(404).send({
                message: "UserList not found with id " + req.params.id
            })
        }
        res.send({
            message: "Successfully deleted UserList with id " + req.params.id
        })

    } catch(err) {
        console.log("UserListService.remove " + req.params.id + err)
        
        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: "UserList not found with id " + req.params.id
            })
        }
        return res.status(500).send({
            message: "An error occurred while deleting UserList with id " + req.params.id
        })
    }
}


module.exports = { create, get, remove }   
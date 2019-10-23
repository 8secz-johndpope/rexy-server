const Comment = require('../models/Comment.js')
const _ = require('lodash')


// create
const create = async (req, res) => {
    const { text, userId, listId, placeId } = req.body

    if (!text) {
        return res.status(400).send({
            message: "Comment must have text."
        })
    }

    if (!userId) {
        return res.status(400).send({
            message: "Comment must have a user."
        })
    }

    if (!listId && !placeId) {
        return res.status(400).send({
            message: "Comment must have either a list or a place."
        })
    }

    const comment = new Comment({ listId, placeId, text, userId })

    try {
        const savedComment = await comment.save()
        res.send(savedComment)
    } catch(err) {
        console.log("CommentService.create" + err)

        res.status(500).send({
            message: err.message || "An error occurred while creating the Comment."
        })
    }
}


// get
const get = async (req, res) => {
    try {
        const comments = await Comment.find()
        res.send(comments)
    } catch(err) {
        console.log("CommentService.get" + err)

        res.status(500).send({
            message: err.message || "An error occurred while retrieving Comments."
        })
    }
}


// get by id
const getById = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id)
        if (!comment) {
            return res.status(404).send({
                message: "Comment not found with id " + req.params.id
            })
        }
        res.send(comment)
    } catch(err) {
        console.log("CommentService.getById" + req.params.id + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Comment not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while retrieving Comment with id " + req.params.id
        })
    }
}


// update
const update = async (req, res) => {
    const { text, userId, listId, placeId } = req.body

    try {
        const comment = await Comment.findByIdAndUpdate(req.params.id, _.omitBy({
            listId,
            placeId,
            text,
            userId
        }, _.isUndefined), { new : true })
        if (!comment) {
            return res.status(404).send({
                message: "Comment not found with id " + req.params.id
            })
        }
        res.send(comment)
    } catch(err) {
        console.log("CommentService.update" + req.params.id + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Comment not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while updating Comment with id " + req.params.id
        })
    }
}


// delete
const remove = async (req, res) => {
    try {
        const comment = await Comment.findByIdAndDelete(req.params.id)
        if (!comment) {
            return res.status(404).send({
                message: "Comment not found with id " + req.params.id
            })
        }
        res.send({
            message: "Successfully deleted Comment with id " + req.params.id
        })
    } catch(err) {
        console.log("CommentService.remove" + req.params.id + err)
        
        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: "Comment not found with id " + req.params.id
            })
        }
        return res.status(500).send({
            message: "An error occurred while deleting Comment with id " + req.params.id
        })
    }
}


module.exports = { create, get, getById, update, remove }   
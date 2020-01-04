const Comment = require('../models/Comment.js')

const url = require('url')
const _ = require('lodash')


// create
const create = async (req, res) => {
    console.log('CommentService.create')

    const { listId, placeId, text, userId } = req.body

    if (!text) {
        return res.status(400).send({
            message: 'Comment must have text.'
        })
    }

    if (!userId) {
        return res.status(400).send({
            message: 'Comment must have a user.'
        })
    }   

    if (!listId && !placeId) {
        return res.status(400).send({
            message: 'Comment must have either a list or a place.'
        })
    }

    const comment = new Comment({ listId, placeId, text, userId })

    try {
        const savedComment = await comment.save()
        res.send(savedComment)

    } catch(err) {
        console.log('CommentService.create err', listId, placeId, text, userId, err)

        res.status(500).send({
            message: err.message || 'An error occurred while creating the Comment.'
        })
    }
}


// get
const get = async (req, res) => {
    console.log('CommentService.get')

    const q = url.parse(req.url, true).query

    try {
        const comments = await Comment.find({ ...q })
        .populate('list place user')
        res.send(comments)

    } catch(err) {
        console.log('CommentService.get err', q, err)

        res.status(500).send({
            message: err.message || 'An error occurred while retrieving Comments.'
        })
    }
}


// get by id
const getById = async (req, res) => {
    console.log('CommentService.getById')

    const commentId = req.params.id

    try {
        const comment = await Comment.findById(commentId)
        .populate('list place user')
        if (!comment) {
            return res.status(404).send({
                message: `Comment not found with id ${commentId}`
            })
        }
        res.send(comment)

    } catch(err) {
        console.log('CommentService.getById err', commentId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `Comment not found with id ${commentId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while retrieving Comment with id ${commentId}`
        })
    }
}


// update
const update = async (req, res) => {
    console.log('CommentService.update')

    const commentId = req.params.id
    const { listId, placeId, text, userId } = req.body

    try {
        const comment = await Comment.findByIdAndUpdate(commentId, _.omitBy({
            listId,
            placeId,
            text,
            userId
        }, _.isUndefined), { new: true })
        .populate('list place user')
        if (!comment) {
            return res.status(404).send({
                message: `Comment not found with id ${commentId}`
            })
        }
        res.send(comment)

    } catch(err) {
        console.log('CommentService.update err', commentId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `Comment not found with id ${commentId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while updating Comment with id ${commentId}`
        })
    }
}


// delete
const remove = async (req, res) => {
    console.log('CommentService.remove')

    const commentId = req.params.id

    try {
        const comment = await Comment.findByIdAndDelete(commentId)
        if (!comment) {
            return res.status(404).send({
                message: `Comment not found with id ${commentId}`
            })
        }
        res.send(commentId)
        
    } catch(err) {
        console.log('CommentService.remove err', commentId, err)
        
        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: `Comment not found with id ${commentId}`
            })
        }
        return res.status(500).send({
            message: `An error occurred while deleting Comment with id ${commentId}`
        })
    }
}


module.exports = { create, get, getById, update, remove }   
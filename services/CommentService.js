const Comment = require('../models/Comment.js')

exports.create = (req, res) => {
    if (!req.body.text) {
        return res.status(400).send({
            message: "Comment must have text."
        })
    }

    if (!req.body.userId) {
        return res.status(400).send({
            message: "Comment must have a user."
        })
    }

    if (!req.body.listId && !req.body.placeId) {
        return res.status(400).send({
            message: "Comment must have either a list or a place."
        })
    }

    const comment = new Comment({
        listId: req.body.listId,
        placeId: req.body.placeId,
        text: req.body.text,
        userId: req.body.userId
    })

    comment.save()
    .then(data => {
        res.send(data)
    }).catch(err => {
        res.status(500).send({
            message: err.message || "An error occurred while creating the Comment."
        })
    })
}

exports.findAll = (req, res) => {
    Comment.find()
    .then(comments => {
        res.send(comments)
    }).catch(err => {
        res.status(500).send({
            message: err.message || "An error occurred while retrieving Comments."
        })
    })
}

exports.findOne = (res, req) => {
    console.log(req)

    Comment.findById(req.params.commentId)
    .then(comment => {
        if (!comment) {
            return res.status(404).send({
                message: "Comment not found with id " + req.params.commentId
            })
        }
        res.send(comment)
    }).catch(err => {
        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Comment not found with id " + req.params.commentId
            })
        }

        return res.status(500).send({
            message: "An error occurred while retrieving Comment with id " + req.params.commentId
        })
    })
}

exports.update = (req, res) => {
    if (!req.body.text) {
        return res.status(400).send({
            message: "Comment must have text."
        })
    }

    if (!req.body.userId) {
        return res.status(400).send({
            message: "Comment must have a user."
        })
    }

    if (!req.body.listId && !req.body.placeId) {
        return res.status(400).send({
            message: "Comment must have either a list or a place."
        })
    }

    Comment.findByIdAndUpdate(req.params.commentId, {
        listId: req.body.listId,
        placeId: req.body.placeId,
        text: req.body.text,
        userId: req.body.userId
    }, { new : true })
    .then(comment => {
        if (!comment) {
            return res.status(404).send({
                message: "Comment not found with id " + req.params.commentId
            })
        }
        res.send(comment)
    }).catch(err => {
        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Comment not found with id " + req.params.commentId
            })
        }

        return res.status(500).send({
            message: "An error occurred while updating Comment with id " + req.params.commentId
        })
    })
}

exports.delete = (req, res) => {
    Comment.findByIdAndDelete(req.params.commentId)
    .then(comment => {
        if (!comment) {
            return res.status(404).send({
                message: "Comment not found with id " + req.params.commentId
            })
        }
        res.send({
            message: "Successfully deleted Comment with id " + req.params.commentId
        }).catch(err => {
            if (err.kind === 'ObjectId' || err.name === 'NotFound') {
                return res.status(404).send({
                    message: "Comment not found with id " + req.params.commentId
                })
            }
            return res.status(500).send({
                message: "An error occurred while deleting Comment with id " + req.params.commentId
            })
        })
    })
}
const Comment = require('../models/Comment.js')

exports.create = (req, res) => {
    if (!req.body.content) {
        return res.status(400).send({
            message: "Comment content cannot be empty."
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
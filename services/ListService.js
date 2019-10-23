const List = require('../models/List.js')
const _ = require('lodash')


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
    } catch(err) {
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
    } catch(err) {
        res.status(500).send({
            message: err.message || "An error occurred while retrieving Lists."
        })
    }
}


// get by id
const getById = async (req, res) => {
    try {
        const list = await List.findById(req.params.id).populate('placeIds')
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }
        res.send(list)
    } catch(err) {
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
    try {
        const list = await List.findByIdAndUpdate(req.params.id, _.omitBy({
            accoladesYear: req.body.accoladesYear,
            date: req.body.date,
            dateBasedAccolades: req.body.dateBasedAccolades,
            description: req.body.description,
            groupName: req.body.groupName,
            isDeleted: req.body.isDeleted,
            isPrivate: req.body.isPrivate,
            placeIds: req.body.placeIds,
            title: req.body.title
        }, _.isUndefined), { new : true })
        if (!list) {
            return res.status(404).send({
                message: "List not found with id " + req.params.id
            })
        }
        res.send(list)
    } catch(err) {
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
    } catch(err) {
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


module.exports = { create, get, getById, update, remove }   
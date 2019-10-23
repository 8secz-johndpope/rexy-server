const Place = require('../models/Place.js')
const _ = require('lodash')


// create
const create = async (req, res) => {
    const { accolades, address, coordinate, hours, isClean, isOpen, notes, otherLists, phoneNumber, price, specialty, subtitle, tags, title, type, url } = req.body

    if (!type) {
        return res.status(400).send({
            message: "Place must have a type."
        })
    }

    if (!title) {
        return res.status(400).send({
            message: "Place must have a title."
        })
    }

    const place = new Place({ accolades, address, coordinate, hours, isClean, isOpen, notes, otherLists, phoneNumber, price, specialty, subtitle, tags, title, type, url })

    try {
        const savedPlace = await place.save()
        res.send(savedPlace)
    } catch(err) {
        res.status(500).send({
            message: err.message || "An error occurred while creating the Place."
        })
    }
}


// get
const get = async (req, res) => {
    try {
        const places = await Place.find()
        res.send(places)
    } catch(err) {
        res.status(500).send({
            message: err.message || "An error occurred while retrieving Places."
        })
    }
}


// get by id
const getById = async (req, res) => {
    try {
        const place = await Place.findById(req.params.id)
        if (!place) {
            return res.status(404).send({
                message: "Place not found with id " + req.params.id
            })
        }
        res.send(place)
    } catch(err) {
        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Place not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while retrieving Place with id " + req.params.id
        })
    }
}


// update
const update = async (req, res) => {
    const { accolades, address, coordinate, hours, isClean, isOpen, notes, otherLists, phoneNumber, price, specialty, subtitle, tags, title, type, url } = req.body

    try {
        const place = await Place.findByIdAndUpdate(req.params.id, _.omitBy({
            accolades,
            address,
            coordinate,
            hours,
            isClean,
            isOpen,
            notes,
            otherLists,
            phoneNumber,
            price,
            specialty,
            subtitle,
            tags,
            title,
            type,
            url
        }, _.isUndefined), { new : true })
        if (!place) {
            return res.status(404).send({
                message: "Place not found with id " + req.params.id
            })
        }
        res.send(place)
    } catch(err) {
        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Place not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while updating Place with id " + req.params.id
        })
    }
}


// delete
const remove = async (req, res) => {
    try {
        const place = await Place.findByIdAndDelete(req.params.id)
        if (!place) {
            return res.status(404).send({
                message: "Place not found with id " + req.params.id
            })
        }
        res.send({
            message: "Successfully deleted Place with id " + req.params.id
        })
    } catch(err) {
        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: "Place not found with id " + req.params.id
            })
        }
        return res.status(500).send({
            message: "An error occurred while deleting Place with id " + req.params.id
        })
    }
}


module.exports = { create, get, getById, update, remove }   
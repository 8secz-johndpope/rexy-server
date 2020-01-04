const Settings = require('../models/Settings.js')

const _ = require('lodash')


// create
const create = async (req, res) => {
    console.log('SettingsService.create')

    const { deviceToken } = req.body

    if (!deviceToken) {
        return res.status(400).send({
            message: 'Settings must have a device token.'
        })
    }

    const settings = new Settings({ deviceToken })

    try {
        const savedSettings = await settings.save()
        res.send(savedSettings)

    } catch(err) {
        console.log('SettingsService.create err', deviceToken, err)

        res.status(500).send({
            message: err.message || 'An error occurred while creating Settings.'
        })
    }
}


// get by id
const getById = async (req, res) => {
    console.log('SettingsService.getById')

    const settingsId = req.params.id

    try {
        const settings = await Settings.findById(settingsId).select('-deviceToken')
        if (!settings) {
            return res.status(404).send({
                message: `Settings not found with id ${settingsId}`
            })
        }
        res.send(settings)

    } catch(err) {
        console.log('SettingsService.getById err', settingsId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `Settings not found with id ${settingsId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while retrieving Settings with id ${settingsId}`
        })
    }
}


// update
const update = async (req, res) => {
    console.log('SettingsService.update')

    const settingsId = req.params.id
    const { deviceToken, receiveSubscriptionNotifications } = req.body

    try {
        const settings = await settings.findByIdAndUpdate(settingsId, _.omitBy({
            deviceToken,
            receiveSubscriptionNotifications
        }, _.isUndefined), { new: true }).select('-deviceToken')
        if (!settings) {
            return res.status(404).send({
                message: `Settings not found with id ${settingsId}`
            })
        }
        res.send(settings)

    } catch(err) {
        console.log('SettingsService.update err', settingsId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `Settings not found with id ${settingsId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while updating Settings with id ${settingsId}`
        })
    }
}


// delete
const remove = async (req, res) => {
    console.log('SettingsService.remove')

    const settingsId = req.params.id

    try {
        const settings = await Settings.findByIdAndDelete(settingsId)
        if (!settings) {
            return res.status(404).send({
                message: `Settings not found with id ${settingsId}`
            })
        }
        res.send(settingsId)
        
    } catch(err) {
        console.log('SettingsService.remove err', settingsId + err)
        
        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: `Settings not found with id ${settingsId}`
            })
        }
        return res.status(500).send({
            message: `An error occurred while deleting Settings with id ${settingsId}`
        })
    }
}

module.exports = { create, getById, update, remove }
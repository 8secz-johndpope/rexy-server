const NotificationSettings = require('../models/NotificationSettings.js')

const url = require('url');
const _ = require('lodash')


// create
const create = async (req, res) => {
    console.log("NotificationService.create")

    const { deviceToken } = req.body

    if (!deviceToken) {
        return res.status(400).send({
            message: "Notification Settings must have a device token."
        })
    }

    const notificationSettings = new NotificationSettings({ deviceToken })

    try {
        const savedSettings = await notificationSettings.save()
        res.send(savedSettings)

    } catch(err) {
        console.log("NotificationService.create " + err)

        res.status(500).send({
            message: err.message || "An error occurred while creating Notification Settings."
        })
    }
}


// get by id
const getById = async (req, res) => {
    console.log("NotificationService.getById")

    const notificationSettingsId = req.params.id

    try {
        const notificationSettings = await NotificationSettings.findById(notificationSettingsId).select('-deviceToken')
        if (!notificationSettings) {
            return res.status(404).send({
                message: "Notification Settings not found with id " + notificationSettingsId
            })
        }
        res.send(notificationSettings)

    } catch(err) {
        console.log("NotificationService.getById " + notificationSettingsId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Notification Settings not found with id " + notificationSettingsId
            })
        }

        return res.status(500).send({
            message: "An error occurred while retrieving Notification Settings with id " + notificationSettingsId
        })
    }
}


// update
const update = async (req, res) => {
    console.log("NotificationService.update")

    const notificationSettingsId = req.params.id
    const { deviceToken, receiveSubscriptionNotifications } = req.body

    try {
        const notificationSettings = await NotificationSettings.findByIdAndUpdate(notificationSettingsId, _.omitBy({
            deviceToken,
            receiveSubscriptionNotifications
        }, _.isUndefined), { new: true }).select('-deviceToken')
        if (!notificationSettings) {
            return res.status(404).send({
                message: "Notification Settings not found with id " + notificationSettingsId
            })
        }
        res.send(notificationSettings)

    } catch(err) {
        console.log("NotificationService.update " + notificationSettingsId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Notification Settings not found with id " + notificationSettingsId
            })
        }

        return res.status(500).send({
            message: "An error occurred while updating Notification Settings with id " + notificationSettingsId
        })
    }
}


// delete
const remove = async (req, res) => {
    console.log("NotificationService.remove")

    const notificationSettingsId = req.params.id

    try {
        const notificationSettings = await NotificationSettings.findByIdAndDelete(notificationSettingsId)
        if (!notificationSettings) {
            return res.status(404).send({
                message: "Notification Settings not found with id " + notificationSettingsId
            })
        }
        res.send(notificationSettingsId)
        
    } catch(err) {
        console.log("NotificationService.remove " + notificationSettingsId + err)
        
        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: "Notification Settings not found with id " + notificationSettingsId
            })
        }
        return res.status(500).send({
            message: "An error occurred while deleting Notification Settings with id " + notificationSettingsId
        })
    }
}


// https://github.com/node-apn/node-apn

const apn = require('apn')

const options = {
    token: {
        key: './config/gdwsk_apns_certificate.p8',
        keyId: process.env.APNS_KEY,
        teamId: process.env.APNS_TEAM
    },
    production: true
}
const provider = new apn.Provider(options)


module.exports = { create, getById, update, remove, apn, provider }
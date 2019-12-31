const Notification = require('../models/Notification.js')

const url = require('url');
const _ = require('lodash')


// create
const create = async (req, res) => {
    console.log("NotificationService.create")

    const { actorId, attributedDescription, description, isArchived, isRead, object, targetId, type } = req.body

    const notification = new Notification({
        actorId,
        attributedDescription,
        description,
        isArchived,
        isRead,
        object,
        targetId,
        type
    })

    try {
        const savedNotification = await notification.save()
        res.send(savedNotification)

    } catch(err) {
        console.log("NotificationService.create err", err)

        res.status(500).send({
            message: err.message || "An error occurred while creating a Notification."
        })
    }
}

// get
const get = async (req, res) => {
    console.log("NotificationService.get")

    const q = url.parse(req.url, true).query
    const { targetId } = q

    try {
        const notifications = await Notification.find({ targetId })
        .populate("actor target")
        console.log("sending", notifications)
        res.send(notifications || [])
    
    } catch (err) {

    }
}

// apn
// https://github.com/node-apn/node-apn
const apn = require('apn')
const options = {
    token: {
        key: './config/gdwsk_apns_certificate.p8',
        keyId: process.env.APNS_KEY,
        teamId: process.env.APNS_TEAM
    },
    production: process.env.NODE_ENV === 'production'
}
const provider = new apn.Provider(options)


module.exports = { create, get, apn, provider }
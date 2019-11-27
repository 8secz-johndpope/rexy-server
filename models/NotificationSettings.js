const mongoose = require('mongoose')

const NotificationSettingsSchema = mongoose.Schema({
    deviceToken: { type: String, unique: true },
    receiveSubscriptionNotifications: { type: Boolean, default: true }
}, {
    id: false,
    timestamps: false
})

module.exports = mongoose.model('NotificationSettings', NotificationSettingsSchema)
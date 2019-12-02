const mongoose = require('mongoose')

const NotificationSettingsSchema = mongoose.Schema({
    deviceToken: { type: String, unique: true, sparse: true },
    receiveSubscriptionNotifications: { type: Boolean, default: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true }
}, {
    id: false,
    timestamps: false
})

module.exports = mongoose.model('NotificationSettings', NotificationSettingsSchema)
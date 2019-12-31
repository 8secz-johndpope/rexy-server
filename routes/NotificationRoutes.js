module.exports = (app) => {
    const notifications = require('../services/NotificationService.js')

    // crud
    app.post('/notifications', notifications.create)
    app.get('/notifications', notifications.get)
}
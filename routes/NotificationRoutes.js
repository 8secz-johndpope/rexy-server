module.exports = (app) => {
    const notifications = require('../services/NotificationService.js')

    const auth = require('../middleware/auth.js').validateToken


    // crud
    app.post('/notifications', auth, notifications.create)
    app.get('/notifications', auth, notifications.get)
}
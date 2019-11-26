module.exports = (app) => {
    const notificationSettings = require('../services/NotificationService.js')

    // crud
    app.post('/notificationSettings', notificationSettings.create)
    app.get('/notificationSettings/:id', notificationSettings.getById)
    app.patch('/notificationSettings/:id', notificationSettings.update)
    app.delete('/notificationSettings/:id', notificationSettings.remove)
}
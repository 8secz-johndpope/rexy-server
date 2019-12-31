module.exports = (app) => {
    const settings = require('../services/SettingsService.js')

    // crud
    app.post('/settings', settings.create)
    app.get('/settings/:id', settings.getById)
    app.patch('/settings/:id', settings.update)
    app.delete('/settings/:id', settings.remove)
}
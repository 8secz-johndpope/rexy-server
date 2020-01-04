module.exports = (app) => {
    const settings = require('../services/SettingsService.js')

    const auth = require('../middleware/auth.js').validateToken


    // crud
    app.post('/settings', auth, settings.create)
    app.get('/settings/:id', auth, settings.getById)
    app.patch('/settings/:id', auth, settings.update)
    app.delete('/settings/:id', auth, settings.remove)
}
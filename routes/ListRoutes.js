module.exports = (app) => {
    const lists = require('../services/ListService.js')

    // crud
    app.post('/lists', lists.create)
    app.get('/lists', lists.get)
    app.get('/lists/:id', lists.getById)
    app.patch('/lists/:id', lists.update)
    app.delete('/lists/:id', lists.remove)

    // places on lists
    app.post('/lists/:id/places', lists.addPlace)
    app.delete('/lists/:id/places/:placeId', lists.removePlace)

    // subscriptions
    app.post('/lists/:id/subscribers', lists.addSubscriber)
    app.delete('/lists/:id/subscribers/:userId', lists.removeSubscriber)
}
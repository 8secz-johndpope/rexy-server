module.exports = (app) => {
    const lists = require('../services/ListService.js')

    // crud
    app.post('/lists', lists.create)
    app.get('/lists', lists.get)
    app.get('/lists/top', lists.getTop)
    app.get('/lists/:id', lists.getById)
    app.patch('/lists/:id', lists.update)
    app.delete('/lists/:id', lists.remove)

    // search
    app.get('/search/lists', lists.search)

    // authors
    app.post('/lists/:id/authors', lists.addAuthor)
    app.delete('/lists/:id/authors/:userId', lists.removeAuthor)

    // comments
    app.get('/lists/:id/comments', lists.getComments)

    // places
    app.post('/lists/:id/places', lists.addPlace)
    app.delete('/lists/:id/places/:placeId', lists.removePlace)

    // subscriptions
    app.post('/lists/:id/subscribers', lists.addSubscriber)
    app.delete('/lists/:id/subscribers/:userId', lists.removeSubscriber)
}
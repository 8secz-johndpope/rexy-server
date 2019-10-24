module.exports = (app) => {
    const users = require('../services/UserService.js')

    // crud
    app.post('/users', users.create)
    app.get('/users', users.get)
    app.get('/users/:id', users.getById)
    app.patch('/users/:id', users.update)
    app.delete('/users/:id', users.remove)

    // user lists and subscriptions
    app.get('/users/:id/lists', users.getLists)
    app.get('/users/:id/subscriptions', users.getSubscriptions)

    // user bookmarks
    app.post('/users/:id/bookmarks', users.addBookmark)
    app.delete('/users/:id/bookmarks/:placeId', users.removeBookmark)

    // user visited
    app.post('/users/:id/visited', users.addVisited)
    app.delete('/users/:id/visited/:placeId', users.removeVisited)
}
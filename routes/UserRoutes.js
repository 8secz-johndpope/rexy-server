module.exports = (app) => {
    const users = require('../services/UserService.js')

    // auth
    app.post('/users/authenticate', users.authenticate)

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
    app.get('/users/:id/bookmarks', users.getBookmarks)
    app.delete('/users/:id/bookmarks/:placeId', users.removeBookmark)

    // user visited
    app.post('/users/:id/visited', users.addVisited)
    app.get('/users/:id/visited', users.getVisited)
    app.delete('/users/:id/visited/:placeId', users.removeVisited)

    // register
    app.post('/users/:id/register', users.register)
}
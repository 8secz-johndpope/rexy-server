module.exports = (app) => {
    const users = require('../services/UserService.js')

    // crud
    app.post('/users', users.create)
    app.get('/users', users.get)
    app.get('/users/:id', users.getById)
    app.patch('/users/:id', users.update)
    app.delete('/users/:id', users.remove)

    // user lists
    // app.get('/users/:id/lists' users.getLists)
}
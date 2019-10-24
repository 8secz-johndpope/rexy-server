module.exports = (app) => {
    const userLists = require('../services/UserListService.js')

    // crud
    app.post('/userLists', userLists.create)
    app.get('/userLists', userLists.get)
    // app.get('/userLists/:id', userLists.getById)
    // app.patch('/userLists/:id', userLists.update)
    app.delete('/userLists/:id', userLists.remove)
}
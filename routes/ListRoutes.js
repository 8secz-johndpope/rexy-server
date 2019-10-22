module.exports = (app) => {
    const lists = require('../services/ListService.js')

    app.post('/lists', lists.create)

    app.get('/lists', lists.get)

    app.get('/lists/:id', lists.getById)

    app.patch('/lists/:id', lists.update)

    app.delete('/lists/:id', lists.remove)
}
module.exports = (app) => {
    const comments = require('../services/CommentService.js')

    app.post('/comments', comments.create)

    app.get('/comments', comments.findAll)

    app.get('/comments/:id', comments.findOne)

    app.put('/comments/:id', comments.update)

    app.delete('/comments/:id', comments.delete)
}
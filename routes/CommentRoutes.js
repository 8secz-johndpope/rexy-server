module.exports = (app) => {
    const comments = require('../services/CommentService.js')

    app.post('/comments', comments.create)

    app.get('/comments', comments.get)

    app.get('/comments/:id', comments.getById)

    // app.put('/comments/:id', comments.update)

    // app.delete('/comments/:id', comments.delete)
}
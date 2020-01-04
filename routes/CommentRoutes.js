module.exports = (app) => {
    const comments = require('../services/CommentService.js')

    const auth = require('../middleware/auth.js').validateToken


    // crud
    app.post('/comments', auth, comments.create)
    app.get('/comments', auth, comments.get)
    app.get('/comments/:id', auth, comments.getById)
    app.patch('/comments/:id', auth, comments.update)
    app.delete('/comments/:id', auth, comments.remove)
}
module.exports = (app) => {
    const User = require('../models/User.js')
    const users = require('../services/UserService.js')

    // auth
    app.post('/users/authenticate', users.authenticate)

    // crud
    app.post('/users', users.create)
    app.get('/users', users.get)
    app.get('/users/:id', users.getById)
    app.patch('/users/:id', users.update)
    app.delete('/users/:id', users.remove)

    // image
    app.post('/users/:id/image', users.uploadImage, async (req, res) => {
        const userId = req.params.id
        const imagePath = req.file.location
        
        try {
            const updatedUser = await User.findByIdAndUpdate(userId, { imagePath }, { new: true }).select('-xid').select('-notificationSettings').populate('bookmarkedPlaces').populate('lists').populate('subscribedLists').populate('visitedPlaces')
            if (!updatedUser) {
                return res.status(404).send({
                    message: "User not found with id " + userId
                })
            }
            res.send(updatedUser)
            
        } catch (err) {
            console.log("UserService.uploadImage " + userId + err)

            if (err.kind === 'ObjectId') {
                return res.status(404).send({
                    message: "User not found with id " + userId
                })
            }
    
            return res.status(500).send({
                message: "An error occurred while uploading an image to User with id " + userId
            })
        }
    })

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
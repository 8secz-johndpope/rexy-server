module.exports = (app) => {
    const User = require('../models/User.js')
    const users = require('../services/UserService.js')

    const aws = require('aws-sdk')


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
        console.log("UserService.uploadImage")

        const userId = req.params.id
        const imagePath = req.file.location
        
        try {
            var user = await User.findById(userId)
            if (!user) {
                return res.status(404).send({
                    message: `User not found with id ${userId}`
                })
            }

            if (user.imagePath) {
                aws.config.update({
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    region: process.env.AWS_REGION
                })
    
                const s3 = new aws.S3()

                const oldKey = user.imagePath.replace(`https://s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_BUCKET_NAME}/`, "")
                const params = { Bucket: process.env.AWS_BUCKET_NAME, Key: oldKey }
                await s3.deleteObject(params).promise()
            }

            const updatedUser = await User.findByIdAndUpdate(userId, { imagePath }, { new: true })
            .select('-xid -notificationSettings')
            .populate('bookmarkedPlaces lists subscribedLists visitedPlaces')
            if (!updatedUser) {
                return res.status(404).send({
                    message: `User not found with id ${userId}`
                })
            }
            res.send(updatedUser)
            
        } catch (err) {
            console.log("UserService.uploadImage err", userId, imagePath, err)

            if (err.kind === 'ObjectId') {
                return res.status(404).send({
                    message: `User not found with id ${userId}`
                })
            }
    
            return res.status(500).send({
                message: `An error occurred while uploading an image to User with id ${userId}`
            })
        }
    })
    app.delete('/users/:id/image', users.removeImage)

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
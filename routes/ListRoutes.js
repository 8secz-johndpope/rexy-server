module.exports = (app) => {
    const List = require('../models/List.js')
    const lists = require('../services/ListService.js')

    const aws = require('aws-sdk')


    // crud
    app.post('/lists', lists.create)
    app.get('/lists', lists.get)
    app.get('/lists/:id', lists.getById)
    app.patch('/lists/:id', lists.update)
    app.delete('/lists/:id', lists.remove)

    // search
    app.get('/search/lists', lists.search)

    // image
    app.post('/lists/:id/image', lists.uploadImage, async (req, res) => {
        console.log("ListService.uploadImage")

        const listId = req.params.id
        const imagePath = req.file.location

        try {
            var list = await List.findById(listId)

            aws.config.update({
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                region: process.env.AWS_REGION
            })

            const s3 = new aws.S3()

            if (!list.imagePath) {
                const oldImagePath = list.imagePath.replace(`https://s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_BUCKET_NAME}/`, "")
                const params = { Bucket: process.env.AWS_BUCKET_NAME, Key: oldImagePath }
                await s3.deleteObject(params).promise()
            }

            list.imagePath = imagePath
            const updatedList = await list.save()
            res.send(updatedList)
            
        } catch (err) {
            console.log("ListService.uploadImage " + listId + err)

            if (err.kind === 'ObjectId') {
                return res.status(404).send({
                    message: "List not found with id " + listId
                })
            }
    
            return res.status(500).send({
                message: "An error occurred while uploading an image to List with id " + listId
            })
        }
    })
    app.delete('/lists/:id/image', lists.removeImage)

    // authors
    app.post('/lists/:id/authors', lists.addAuthor)
    app.delete('/lists/:id/authors/:userId', lists.removeAuthor)

    // comments
    app.get('/lists/:id/comments', lists.getComments)

    // places
    app.post('/lists/:id/places', lists.addPlace)
    app.delete('/lists/:id/places/:placeId', lists.removePlace)

    // subscriptions
    app.post('/lists/:id/subscribers', lists.addSubscriber)
    app.delete('/lists/:id/subscribers/:userId', lists.removeSubscriber)
}
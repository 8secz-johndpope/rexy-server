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
            const list = await List.findById(listId)
            if (!list) {
                return res.status(404).send({
                    message: `List not found with id ${listId}`
                })
            }

            if (list.imagePath) {
                aws.config.update({
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    region: process.env.AWS_REGION
                })
    
                const s3 = new aws.S3()

                const oldKey = list.imagePath.replace(`https://s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_BUCKET_NAME}/`, "")
                const params = { Bucket: process.env.AWS_BUCKET_NAME, Key: oldKey }
                await s3.deleteObject(params).promise()
            }

            const updatedList = await List.findByIdAndUpdate(listId, { imagePath }, { new: true })
            if (!updatedList) {
                return res.status(404).send({
                    message: `List not found with id ${listId}`
                })
            }
            res.send(updatedList)
            
        } catch (err) {
            console.log("ListService.uploadImage err", listId, imagePath, err)

            if (err.kind === 'ObjectId') {
                return res.status(404).send({
                    message: `List not found with id ${listId}`
                })
            }
    
            return res.status(500).send({
                message: `An error occurred while uploading an image to List with id ${listId}`
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
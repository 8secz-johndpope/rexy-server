module.exports = (app) => {
    const Place = require('../models/Place.js')
    const places = require('../services/PlaceService.js')

    const aws = require('aws-sdk')


    // crud
    app.post('/places', places.create)
    app.get('/places', places.get)
    app.get('/places/:id', places.getById)
    app.patch('/places/:id', places.update)
    app.delete('/places/:id', places.remove)

    // search
    app.post('/search/places', places.search)

    // image
    app.post('/places/:id/image', places.uploadImage, async (req, res) => {
        console.log("PlaceService.uploadImage")

        const placeId = req.params.id
        const imagePath = req.file.location

        try {
            const place = await Place.findById(placeId)
            if (!place) {
                return res.status(404).send({
                    message: `Place not found with id ${placeId}`
                })
            }

            if (place.imagePath) {
                aws.config.update({
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    region: process.env.AWS_REGION
                })
    
                const s3 = new aws.S3()

                const oldKey = place.imagePath.replace(`https://s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_BUCKET_NAME}/`, "")
                const params = { Bucket: process.env.AWS_BUCKET_NAME, Key: oldKey }
                await s3.deleteObject(params).promise()
            }

            const updatedPlace = await Place.findByIdAndUpdate(placeId, { imagePath }, { new: true })
            if (!updatedPlace) {
                return res.status(404).send({
                    message: `Place not found with id ${placeId}`
                })
            }
            res.send(updatedPlace)
            
        } catch (err) {
            console.log("PlaceService.uploadImage err", placeId, imagePath, err)

            if (err.kind === 'ObjectId') {
                return res.status(404).send({
                    message: `Place not found with id ${placeId}`
                })
            }
    
            return res.status(500).send({
                message: `An error occurred while uploading an image to Place with id ${placeId}`
            })
        }
    })
    app.delete('/places/:id/image', places.removeImage)

    // migrate
    app.post('/places/migrate', places.migrate)
}
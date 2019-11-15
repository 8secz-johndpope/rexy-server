module.exports = (app) => {
    const places = require('../services/PlaceService.js')

    // crud
    app.post('/places', places.create)
    app.get('/places', places.get)
    app.get('/places/:id', places.getById)
    app.patch('/places/:id', places.update)
    app.delete('/places/:id', places.remove)

    // search
    app.get('/search/places', places.search)

    // migrate
    app.post('/places/migrate', places.migrate)
}
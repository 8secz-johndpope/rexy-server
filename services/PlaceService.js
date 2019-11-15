const Place = require('../models/Place.js')
const GooglePlaces = require('@google/maps').createClient({ key: process.env.GOOGLE_PLACES_API_KEY, Promise: Promise});
const url = require('url');
const Yelp = require('yelp-fusion').client(process.env.YELP_API_KEY)
const _ = require('lodash')


// create
const create = async (req, res) => {
    var { accolades, address, coordinate, hours, isClean, isOpen, notes, otherLists, phoneNumber, price, specialty, subtitle, tags, title, type, url } = req.body

    if (!type && isClean) {
        isClean = false
    }

    if (!title) {
        return res.status(400).send({
            message: "Place must have a title."
        })
    }

    const place = new Place({ accolades, address, coordinate, hours, isClean, isOpen, notes, otherLists, phoneNumber, price, specialty, subtitle, tags, title, type, url })

    try {
        const savedPlace = await place.save()
        res.send(savedPlace)

    } catch(err) {
        console.log("PlaceService.create " + err)

        res.status(500).send({
            message: err.message || "An error occurred while creating the Place."
        })
    }
}


// get
const get = async (req, res) => {
    try {
        const places = await Place.find()
        res.send(places)

    } catch(err) {
        console.log("PlaceService.get " + err)

        res.status(500).send({
            message: err.message || "An error occurred while retrieving Places."
        })
    }
}


// get by id
const getById = async (req, res) => {
    try {
        const place = await Place.findById(req.params.id)
        if (!place) {
            return res.status(404).send({
                message: "Place not found with id " + req.params.id
            })
        }
        res.send(place)

    } catch(err) {
        console.log("PlaceService.getById " + req.params.id + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Place not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while retrieving Place with id " + req.params.id
        })
    }
}


// update
const update = async (req, res) => {
    const { accolades, address, coordinate, hours, isClean, isOpen, notes, otherLists, phoneNumber, price, specialty, subtitle, tags, title, type, url } = req.body

    try {
        const place = await Place.findByIdAndUpdate(req.params.id, _.omitBy({
            accolades,
            address,
            coordinate,
            hours,
            isClean,
            isOpen,
            notes,
            otherLists,
            phoneNumber,
            price,
            specialty,
            subtitle,
            tags,
            title,
            type,
            url
        }, _.isUndefined), { new: true })
        if (!place) {
            return res.status(404).send({
                message: "Place not found with id " + req.params.id
            })
        }
        res.send(place)

    } catch(err) {
        console.log("PlaceService.update " + req.params.id + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Place not found with id " + req.params.id
            })
        }

        return res.status(500).send({
            message: "An error occurred while updating Place with id " + req.params.id
        })
    }
}


// delete
const remove = async (req, res) => {
    try {
        const place = await Place.findByIdAndDelete(req.params.id)
        if (!place) {
            return res.status(404).send({
                message: "Place not found with id " + req.params.id
            })
        }
        res.send({
            message: "Successfully deleted Place with id " + req.params.id
        })
        
    } catch(err) {
        console.log("PlaceService.remove " + req.params.id + err)
        
        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: "Place not found with id " + req.params.id
            })
        }
        return res.status(500).send({
            message: "An error occurred while deleting Place with id " + req.params.id
        })
    }
}


// search
const search = async (req, res) => {
    const q = url.parse(req.url, true).query
    var { query, location, latitude, longitude, radius } = q

    if (!query && !location && !latitude && !longitude) {
        return res.status(500).send({
            message: "Query, or latitude and longitude, or location are required to search for Places."
        })
    }

    if (!latitude && !longitude && location) {
        try {
            await GooglePlaces.geocode({
                address: location
            }).asPromise().then((response) => {
                const { lat, lng } = response.json.results[0].geometry.location
                latitude = lat
                longitude = lng
                
            }).catch((err) => {
                console.log("geocode err " + err)
            })

        } catch (err) {
            console.log("geocoder error " + err)
        }
    }

    console.log("query " + query)
    console.log("location " + location)
    console.log("latitude " + latitude)
    console.log("longitude " + longitude)

    let [rexyResults, yelpResults, googlePlaceResults] = await Promise.all([getRexyResults(query, latitude, longitude, location, radius), getYelpResults(query, latitude, longitude, location, radius), getGooglePlacesResults(query, latitude, longitude, location, radius)])

    const response = {}
    response.rexy = rexyResults.filter(function (place) { return place != null })
    response.yelp = yelpResults.filter(function (place) { return place != null })
    response.googlePlaces = googlePlaceResults.filter(function (place) { return place != null })

    res.send(response)
}

async function getRexyResults(query, latitude, longitude, location, radius) {
    console.log("getRexyResults " + [query, latitude, longitude, location, radius])

    var queryString
    if (query && !query.endsWith("*")) {
        queryString = query + "*"
    } else if (!query) {
        queryString = "*"
    }

    return new Promise((resolve, reject) => {
        Place.search({ bool: { must: { query_string: { query: queryString }}, filter: { geo_distance: { distance: radius, geo_coordinate: { "lat": latitude, "lon": longitude } } } } },
        { hydrate: true },
        function (err, results) {
            if (err) {
                console.log("err " + err)
                resolve([])
            } else {
                resolve(results.hits.hits)
            }
        })
    })
}

async function getYelpResults(query, latitude, longitude, location, radius) {
    console.log("getYelpResults " + [query, latitude, longitude, location, radius])

    if ((!latitude || !longitude) && !location) {
        return []
    }

    var placeIds
    await Yelp.search(_.omitBy({
        term: query,
        location,
        latitude,
        longitude,
        radius: radius ? Math.min(Math.round(radius), 40000) : 8047,
        categories: ["active", "arts", "food", "nightlife", "religiousorgs", "restaurants"],
        limit: 10
    }, _.isUndefined)).then(response => {
        placeIds = response.jsonBody.businesses./*filter(function(business) {
            return business.categories.some((category) => Place.supportedTypes.indexOf(category) !== -1)
        }).*/map(business => business.id)
    }).catch (err => {
        console.log("Yelp search err " + err)
    })

    return Promise.all(placeIds.map(placeId => getYelpDetails(placeId)))
}

async function getYelpDetails(id) { 
    console.log("getYelpDetails " + id)

    var business
    await Yelp.business(id).then(response => {
        business = response.jsonBody
    }).catch(err => {
        console.log("err " + id + ", " + err)
        return
    })

    if (!business) {
        console.log("no yelp business with id " + id)
        return undefined
    }

    return mapYelp(business)

    function mapYelp(yelpPlace) {
        const place = new Place()
        // place.accolades = 
        if (yelpPlace.location.display_address) {
            place.address = { formatted: yelpPlace.location.display_address.join(", ") }
        }
        if (yelpPlace.coordinates.latitude && yelpPlace.coordinates.longitude) {
            var coordinate = {}
            coordinate.type = "Point"
            coordinate.coordinates = [yelpPlace.coordinates.longitude, yelpPlace.coordinates.latitude]
            place.coordinate = coordinate
        }
        // place.hours = 
        place.isOpen = !yelpPlace.is_closed
        // place.notes = 
        // place.otherLists = 
        place.phoneNumber = yelpPlace.phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        if (yelpPlace.price) {
            place.price = yelpPlace.price.length
        }
        // place.specialty = 
        // place.subtitle = 
        // place.tags = 
        place.title = yelpPlace.name
        // place.type = 
        // place.url = googlePlace.website

        place.yelpRating = yelpPlace.rating
        place.yelpReviewCount = yelpPlace.review_count

        return place
    }
}

async function getGooglePlacesResults(query, latitude, longitude, location, radius) {
    console.log("getGooglePlacesResults " + [query, latitude, longitude, location, radius])

    if (!query) {
        return []
    }

    var placeIds
    if (latitude && longitude) {
        await GooglePlaces.placesAutoComplete({
            input: query,
            location: [latitude, longitude],
            radius: radius ? Math.min(Math.round(radius), 40000) : 8047,
            strictbounds: true
        }).asPromise().then((response) => {
            placeIds = response.json.predictions.filter(function(prediction) {
                return prediction.types.some((type) => Place.supportedTypes.indexOf(type) !== -1)
            }).map(prediction => prediction.place_id)

        }).catch((err) => {
            console.log("GooglePlaces placesAutoComplete err " + JSON.stringify(err))
        })
    
    } else if (location) {
        await GooglePlaces.placesAutoComplete({
            input: query + " " + location,
            radius: radius ? Math.min(Math.round(radius), 40000) : 8047,
            strictbounds: true
        }).asPromise().then((response) => {
            placeIds = response.json.predictions.filter(function(prediction) {
                return prediction.types.some((type) => Place.supportedTypes.indexOf(type) !== -1)
            }).map(prediction => prediction.place_id)
            
        }).catch((err) => {
            console.log("GooglePlaces placesAutoComplete err " + JSON.stringify(err))
        })

    } else {
        return []
    }

    return Promise.all(placeIds.map(placeId => getGooglePlaceDetails(placeId)))
}

async function getGooglePlaceDetails(placeid) {
    console.log("getGooglePlaceDetails " + placeid)

    var business
    await GooglePlaces.place({
        placeid
    }).asPromise().then((response) => {
        business = response.json.result
    }).catch((err) => {
        console.log("GooglePlaces place err " + JSON.stringify(err))
    })

    if (!business) {
        console.log("no google places business with id " + id)
        return undefined
    }

    return mapGooglePlace(business)

    function mapGooglePlace(googlePlace) {
        const place = new Place()
        // place.accolades = 
        place.address = { formatted: googlePlace.formatted_address }
        if (googlePlace.geometry.location.lat && googlePlace.geometry.location.lng) {
            var coordinate = {}
            coordinate.type = "Point"
            coordinate.coordinates = [googlePlace.geometry.location.lng, googlePlace.geometry.location.lat]
            place.coordinate = coordinate
        }
        // place.hours = 
        if (googlePlace.permanently_closed) {
            place.isOpen = false
        }
        // place.notes = 
        // place.otherLists = 
        if (googlePlace.formatted_phone_number) {
            place.phoneNumber = googlePlace.formatted_phone_number.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        }
        place.price = googlePlace.price_level
        // place.specialty = 
        // place.subtitle = 
        // place.tags = 
        place.title = googlePlace.name
        // place.type = 
        place.url = googlePlace.website

        place.googlePlacesRating = googlePlace.rating
        place.googlePlacesReviewCount = googlePlace.user_ratings_total

        return place
    }
}


// migrate coordinates
const migrate = async (req, res) => {
    const { trigger, latitude, longitude, distance, query } = req.body

    var places
    try {
        places = await Place.find()

    } catch (err) {
        console.log("PlaceService.migrate " + err)

        res.status(500).send({
            message: err.message || "An error occurred while retrieving Places prior to migration."
        })
    }

    console.log("Preparing to migrate " + places.length + " places...")

    // var queryString = query
    // if (!queryString.endsWith("*")) {
    //     queryString += "*"
    // }

    // Place.search({
    //     bool: { must: { query_string: { query: queryString }}, filter: { geo_distance: { distance, geo_coordinate: { "lat": latitude, "lon": longitude } } } }
    // }, { hydrate: true }, function (err, results) {
    //     if (err) {
    //         console.log("geo query err " + err)
    //     } else {
    //         console.log("geo query results " + JSON.stringify(results.hits.hits))
    //     }
    // })

    if (!trigger) {
        console.log("Migration was not triggered.")
        return res.status(500).send({
            message: "Migration was not triggered."
        })
    }

    console.log("migrate places with ids: " + places.map(place => place._id))

    // updatePlaceCoordinate(places[0])

    // places.map(place => updatePlaceCoordinate(place))

    res.send(true)
}

async function updatePlaceCoordinate(place) {
    console.log("updatePlaceCoordinate " + place._id)

    var geo_coordinate = { lat: place.coordinate.coordinates[1], lon: place.coordinate.coordinates[0]}

    console.log("geo coordinate for " + place.title + "(" + place._id + ") " + JSON.stringify(geo_coordinate))

    try {
        const updatedPlace = await Place.findByIdAndUpdate(place._id, {
            geo_coordinate
        }, { new: true })
        console.log("post-update " + JSON.stringify(updatedPlace.coordinate) + ", " + JSON.stringify(updatedPlace.geo_coordinate))

    } catch (err) {
        console.log("update err " + place._id + ", " + err)
    }

    return true
}


module.exports = { create, get, getById, update, remove, search, migrate }
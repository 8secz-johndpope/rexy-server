const Comment = require('../models/Comment.js')
const List = require('../models/List.js')
const Place = require('../models/Place.js')
const User = require('../models/User.js')

const GooglePlaces = require('@google/maps').createClient({ key: process.env.GOOGLE_PLACES_API_KEY, Promise: Promise});
const mongoose = require('mongoose')
const Yelp = require('yelp-fusion').client(process.env.YELP_API_KEY)
const _ = require('lodash')


// create
const create = async (req, res) => {
    var { accolades, address, geo_coordinate, hours, isClean, isOpen, notes, otherLists, phoneNumber, price, specialty, subtitle, tags, title, type, url, googlePlacesRating, googlePlacesReviewCount, yelpRating, yelpReviewCount } = req.body

    if (!type && isClean) {
        isClean = false
    }

    if (!title) {
        return res.status(400).send({
            message: "Place must have a title."
        })
    }

    const place = new Place({ accolades, address, geo_coordinate, hours, isClean, isOpen, notes, otherLists, phoneNumber, price, specialty, subtitle, tags, title, type, url, googlePlacesRating, googlePlacesReviewCount, yelpRating, yelpReviewCount })

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
    const placeId = req.params.id

    try {
        const place = await Place.findById(placeId)
        if (!place) {
            return res.status(404).send({
                message: "Place not found with id " + placeId
            })
        }
        res.send(place)

    } catch(err) {
        console.log("PlaceService.getById " + placeId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Place not found with id " + placeId
            })
        }

        return res.status(500).send({
            message: "An error occurred while retrieving Place with id " + placeId
        })
    }
}


// update
const update = async (req, res) => {
    const placeId = req.params.id
    const { accolades, address, geo_coordinate, hours, isClean, isOpen, notes, otherLists, phoneNumber, price, specialty, subtitle, tags, title, type, url, googlePlacesRating, googlePlacesReviewCount, yelpRating, yelpReviewCount } = req.body

    try {
        const place = await Place.findByIdAndUpdate(req.params.id, _.omitBy({
            accolades,
            address,
            geo_coordinate,
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
            url,
            googlePlacesRating,
            googlePlacesReviewCount,
            yelpRating,
            yelpReviewCount
        }, _.isUndefined), { new: true })
        if (!place) {
            return res.status(404).send({
                message: "Place not found with id " + placeId
            })
        }
        res.send(place)

    } catch(err) {
        console.log("PlaceService.update " + placeId + err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: "Place not found with id " + placeId
            })
        }

        return res.status(500).send({
            message: "An error occurred while updating Place with id " + placeId
        })
    }
}


// delete
const remove = async (req, res) => {
    const placeId = req.params.id

    try {
        const place = await Place.findByIdAndDelete(placeId)
        if (!place) {
            return res.status(404).send({
                message: "Place not found with id " + placeId
            })
        }

        Comment.deleteMany({ placeId }, function (err) {
            if (err) {
                console.log("Comment.deleteMany err " + err)
            }
        })

        List.updateMany({ $pull: { placeIds: mongoose.Types.ObjectId(placeId) } }, function (err) {
            if (err) {
                console.log("List.updateMany err " + err)
            }
        })

        User.updateMany({ $pull: { bookmarkedPlaceIds: mongoose.Types.ObjectId(placeId), visitedPlaceIds: mongoose.Types.ObjectId(placeId) } }, function (err) {
            if (err) {
                console.log("User.update err " + err)
            }
        })

        res.send(placeId)
        
    } catch(err) {
        console.log("PlaceService.remove " + placeId + err)
        
        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: "Place not found with id " + placeId
            })
        }
        return res.status(500).send({
            message: "An error occurred while deleting Place with id " + placeId
        })
    }
}


// search
const search = async (req, res) => {
    var { text, location, latitude, longitude, radius, filters } = req.body

    console.log("req.body " + JSON.stringify(req.body))

    if (!text && !location && !latitude && !longitude) {
        return res.status(500).send({
            message: "Text, or latitude and longitude, or location are required to search for Places."
        })
    }

    if (location && !latitude && !longitude) {
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

    console.log("text " + text)
    console.log("location " + location)
    console.log("latitude " + latitude)
    console.log("longitude " + longitude)

    let [rexyResults, yelpResults, googlePlaceResults] = await Promise.all([getRexyResults(text, latitude, longitude, location, radius, filters), getYelpResults(text, latitude, longitude, location, radius), getGooglePlacesResults(text, latitude, longitude, location, radius)])

    const response = {}
    response.rexy = rexyResults.filter(function (place) { return place != null })
    response.yelp = yelpResults.filter(function (place) { return place != null })
    response.googlePlaces = googlePlaceResults.filter(function (place) { return place != null })

    res.send(response)
}

async function getRexyResults(text, latitude, longitude, location, radius, filters) {
    console.log("getRexyResults " + [text, latitude, longitude, location, radius, filters])

    var must = []

    if (text && text.length > 0) {
        must.push({ query_string: { query: text.replace(/ +/g, " ").trim().split(" ").map(str => str + "*").join(" ") } })
    }

    if (filters) {
        if (filters.accolades) {
            var should = []

            for (var accolade of filters.accolades) {
                accolade += filters.accoladesYear ? filters.accoladesYear : "*"
                should.push({ query_string: { query: accolade } })
            }

            must.push({ bool: { should, minimum_should_match: 1 } })
        }

        if (filters.price) {
            var should = []

            for (var price of filters.price) {
                should.push({ match: { price } })
            }

            must.push({ bool: { should, minimum_should_match: 1 } })
        }
    }

    var query = {
        bool: {
            must,
            filter: {
                geo_distance: {
                    distance: radius || 16093,
                    geo_coordinate: {
                        lat: latitude,
                        lon: longitude
                    }
                }
            }
        }
    }

    console.log("query " + JSON.stringify(query))

    const options = {
        hydrate: true,
        sort: [
            {
                _geo_distance: {
                    geo_coordinate: {
                        lat: latitude,
                        lon: longitude
                    },
                    order: "asc"
                }
            }
        ]
    }

    return new Promise((resolve) => {
        Place.search(query, options, function (err, results) {
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
        radius: radius ? Math.min(Math.round(radius), 40000) : 16093,
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
        var place = new Place()
        // place.accolades = 
        if (yelpPlace.location.display_address) {
            place.address = { formatted: yelpPlace.location.display_address.join(", ") }
        }
        if (yelpPlace.coordinates.latitude && yelpPlace.coordinates.longitude) {
            place.geo_coordinate = { lat: yelpPlace.coordinates.latitude, lon: yelpPlace.coordinates.longitude }
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
            radius: radius ? Math.min(Math.round(radius), 40000) : 16093,
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
            radius: radius ? Math.min(Math.round(radius), 40000) : 16093,
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
        var place = new Place()
        // place.accolades = 
        place.address = { formatted: googlePlace.formatted_address }
        if (googlePlace.geometry.location.lat && googlePlace.geometry.location.lng) {
            place.geo_coordinate = { lat: googlePlace.geometry.location.lat, lon: googlePlace.geometry.location.lng }
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

    // migration(places[0])
    // places.map(place => migration(place))

    res.send(true)
}

async function migration(place) {
    console.log("updatePlaceCoordinate " + place._id)

    var geo_coordinate = { lat: place.coordinate.coordinates[1], lon: place.coordinate.coordinates[0] }

    console.log("geo coordinate for " + place.title + "(" + place._id + ") " + JSON.stringify(geo_coordinate))

    try {
        const updatedPlace = await Place.update({ _id: place._id }, { $unset: { coordinate: 1 } })
        // const updatedPlace = await Place.findByIdAndUpdate(place._id, {
        //     geo_coordinate
        // }, { new: true })
        console.log("post-update " + JSON.stringify(updatedPlace))

    } catch (err) {
        console.log("update err " + place._id + ", " + err)
    }

    return true
}


module.exports = { create, get, getById, update, remove, search, migrate }
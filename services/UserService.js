const Comment = require('../models/Comment.js')
const List = require('../models/List.js')
const Settings = require('../models/Settings.js')
const User = require('../models/User.js')

const aws = require('aws-sdk')
const axios = require('axios')
const fs = require('fs')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const multer = require('multer')
const multerS3 = require('multer-s3')
const { promisify } = require('util')
const querystring = require('querystring')
const url = require('url')
const _ = require('lodash')


// message queue
const amqp = require('amqplib')

var channel = null
const notificationExchange = 'notificationExchange'
const createExchange = 'createExchange'
const updateExchange = 'updateExchange'
const deleteExchange = 'deleteExchange'

const start = async () => {
    try {
        const connection = await amqp.connect(process.env.CLOUDAMQP_URL)
        const channel = await connection.createChannel()
        await channel.assertExchange(notificationExchange, 'fanout', { durable: true })

        return channel

    } catch (err) {
        console.error('[AMQP] start err', err)
    }
}
start().then(async chan => {
    channel = chan

    const q = await channel.assertQueue('', { exclusive: true })
    channel.bindQueue(q.queue, createExchange, '')
    channel.consume(q.queue, createObject)
    
    const q2 = await channel.assertQueue('', { exclusive: true })
    channel.bindQueue(q2.queue, updateExchange, '')
    channel.consume(q2.queue, updateObject)

    const q3 = await channel.assertQueue('', { exclusive: true })
    channel.bindQueue(q3.queue, deleteExchange, '')
    channel.consume(q3.queue, deleteObject)
})

const createObject = async (message) => {
    const body = JSON.parse(message.content.toString())

    console.log('UserService.createObject in', body.collection)
}

const updateObject = async (message) => {
    const body = JSON.parse(message.content.toString())

    console.log('UserService.updateObject in', body.collection)
}

const deleteObject = async (message) => {
    const body = JSON.parse(message.content.toString())

    console.log('UserService.deleteObject in', body.collection)
}

function notificationPublisher(notificationType, data) {
    const message = { notificationType, data }
    channel.publish(notificationExchange, '', Buffer.from(JSON.stringify(message)))
}


// auth
const jwksClient = require('jwks-rsa')
const client = jwksClient({ jwksUri: process.env.APPLE_PUBLIC_KEY_URL })

const getKey = (header, callback) => {
    client.getSigningKey(header.kid, function(err, key) {
        const signingKey = key.publicKey || key.rsaPublicKey
        callback(null, signingKey)
    })
}

const verifyPromised = promisify(jwt.verify)
const signPromised = promisify(jwt.sign)

// authenticate
// https://developer.apple.com/documentation/signinwithapplerestapi/verifying_a_user
const authenticate = async (req, res) => {
    console.log('UserService.authenticate')

    const { authorizationCode, identityToken } = req.body

    // console.log('authorizationCode', authorizationCode)
    // console.log('identityToken', identityToken)

    if (!identityToken) {
        return res.status(400).send({
            message: 'No JWT provided.'
        })
    }

    let xid
    let emailAddress

    try {
        const { iss, sub, aud, exp, iat, nonce, email, email_verified } = await verifyPromised(identityToken, getKey)
        xid = sub
        emailAddress = email
        
        if (!iss.includes(process.env.JWT_ISSUER)) {
            return res.status(401).send({
                message: 'Authentication failed due to incorrect issuer.'
            })
        }

        if (aud !== process.env.JWT_AUDIENCE) {
            return res.status(401).send({
                message: 'Authentication failed due to incorrect audience.'
            })
        }

        console.log('Token expires in', (exp * 1000) - Date.now())

        const algorithm = 'ES256'
        const header = {
            alg: algorithm,
            kid: process.env.APPLE_SIGN_IN_KEY
        }
        const claims = {
            iss: process.env.APNS_TEAM,
            iat: (Date.now() / 1000),
            exp: (Date.now() / 1000) + 15552000, // 180 days (in seconds) from now, the max Apple will allow
            aud: 'https://appleid.apple.com',
            sub: process.env.JWT_AUDIENCE
        }
        const privateKey = fs.readFileSync('./config/AuthKey_VKSGV95576.p8', 'utf8')

        const clientSecret = await signPromised(claims, privateKey, { algorithm, header })

        let params = {
            client_id: 'com.gdwsk.Rexy',
            client_secret: clientSecret,
            code: authorizationCode,
            grant_type: 'authorization_code'
        }

        const response = await axios.post('https://appleid.apple.com/auth/token', querystring.stringify(params))
        const { access_token, id_token, refresh_token } = response.data

        const user = await User.findOneAndUpdate({ xid }, { emailAddress }, {new: true})
        .populate('bookmarkedPlaces followers following lists settings subscribedLists visitedPlaces')
        if (!user) {
            return res.status(404).send({
                message: `User not found with xid ${userId}`
            })
        }
        res.send({ accessToken: access_token, identityToken: id_token, refreshToken: refresh_token, user })
        
    } catch (err) {
        console.log('UserService.authenticate err', identityToken, err)

        res.status(500).send({
            message: err.message || 'An error occurred while authenticating the User.'
        })
    }
}


// create
const create = async (req, res) => {
    console.log('UserService.create')

    var { bookmarkedPlaceIds, emailAddress, firstName, imagePath, isVerified, lastName, listIds, settingsId, phoneNumber, prefersUsername, subscribedListIds, username, visitedPlaceIds, xid } = req.body

    if (!xid) {
        return res.status(400).send({
            message: 'User must have an XID.'
        })
    }

    const user = new User({ bookmarkedPlaceIds, emailAddress, firstName, imagePath, isVerified, lastName, listIds, settingsId, phoneNumber, prefersUsername, subscribedListIds, username, visitedPlaceIds, xid })

    try {
        const savedUser = await user.save()
        res.send(savedUser)

    } catch (err) {
        console.log('UserService.create err', xid, err)

        res.status(500).send({
            message: err.message || 'An error occurred while creating the User.'
        })
    }
}


// get
const get = async (req, res) => {
    console.log('UserService.get')

    const q = url.parse(req.url, true).query
    const { username } = q
    var usernameQuery
    if (username) {
        usernameQuery = { username: new RegExp(`^${username}$`, 'i') }
    }
    
    try {
        const users = await User.find(usernameQuery)
        .select('-xid -settings')
        res.send(users)

    } catch (err) {
        console.log('UserService.get err', username, err)

        res.status(500).send({
            message: err.message || 'An error occurred while retrieving Users.'
        })
    }
}


// get by id
const getById = async (req, res) => {
    console.log('UserService.getById')

    const userId = req.params.id
    const q = url.parse(req.url, true).query
    const { type } = q

    try {
        if (type === 'xid') {
            const user = await User.findOne({
                xid: userId
            })
            .populate('bookmarkedPlaces followers following settings visitedPlaces')
            .populate({
                path: 'lists',
                populate: {
                    path: 'places',
                    model: 'Place'
                }
            })
            .populate({
                path: 'subscribedLists',
                populate: {
                    path: 'places',
                    model: 'Place'
                }
            })
            if (!user) {
                return res.status(404).send({
                    message: `User not found with xid ${userId}`
                })
            }
            res.send(user)

        } else {
            const user = await User.findById(userId)
            .select('-xid -settings')
            .populate('bookmarkedPlaces followers following lists subscribedLists visitedPlaces')
            if (!user) {
                return res.status(404).send({
                    message: `User not found with id ${userId}`
                })
            }
            res.send(user)
        }

    } catch (err) {
        console.log('UserService.getById err', userId, type, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while retrieving User with id ${userId}`
        })
    }
}


// update
const update = async (req, res) => {
    console.log('UserService.update')

    const userId = req.params.id
    const { bookmarkedPlaceIds, emailAddress, firstName, imagePath, isVerified, lastName, listIds, settingsId, phoneNumber, prefersUsername, subscribedListIds, username, visitedPlaceIds, xid } = req.body

    try {
        const user = await User.findByIdAndUpdate(userId, _.omitBy({
            bookmarkedPlaceIds,
            emailAddress,
            firstName,
            imagePath,
            isVerified,
            lastName,
            listIds,
            settingsId,
            phoneNumber,
            prefersUsername,
            subscribedListIds,
            username,
            visitedPlaceIds,
            xid
        }, _.isUndefined), { new: true })
        .populate('bookmarkedPlaces followers following settings visitedPlaces')
        .populate({
            path: 'lists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        .populate({
            path: 'subscribedLists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
    if (!user) {
        return res.status(404).send({
            message: `User not found with id ${userId}`
        })
    }
    res.send(user)

    } catch (err) {
        console.log('UserService.update err', userId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while updating User with id ${userId}`
        })
    }
}


// delete
const remove = async (req, res) => {
    console.log('UserService.remove')

    const userId = req.params.id

    try {
        const user = await User.findByIdAndDelete(userId)
        if (!user) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        Settings.deleteMany({ userId }, function (err) {
            if (err) {
                console.log('UserService.remove Settings.deleteMany err', userId, err)
            }
        })

        Comment.deleteMany({ userId }, function (err) {
            if (err) {
                console.log('UserService.remove Comment.deleteMany err', userId, err)
            }
        })

        List.updateMany({ $pull: { authorIds: mongoose.Types.ObjectId(userId), subscriberIds: mongoose.Types.ObjectId(userId) } }, function (err) {
            if (err) {
                console.log('UserService.remove List.updateMany err', userId, err)
            }
        })

        res.send(userId)

    } catch (err) {
        console.log('UserService.remove err', userId, err)

        if (err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }
        return res.status(500).send({
            message: `An error occurred while deleting User with id ${userId}`
        })
    }
}

// upload image
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/heic' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true)
    } else {
        cb(new Error(`Invalid file type (${file.mimetype}), only HEIC, JPEG, and PNG are allowed.`))
    }
}

aws.config.update({
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    region: process.env.AWS_REGION
})

const s3 = new aws.S3()

const storage = multerS3({
    acl: 'public-read-write',
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    key: function (req, file, cb) {
        cb(null, 'users/' + req.params.id + '-' + Date.now().toString())
    }
})

const uploadImage = multer({ fileFilter, storage }).single('image')


// remove image
const removeImage = async (req, res) => {
    console.log('UserService.removeImage')

    const userId = req.params.id

    try {
        const user = await User.findById(userId)
        .populate('bookmarkedPlaces followers following settings visitedPlaces')
        .populate({
            path: 'lists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        .populate({
            path: 'subscribedLists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        if (!user) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        if (!user.imagePath) {
            return res.send(user)
        }

        const oldKey = user.imagePath.replace(`https://s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_BUCKET_NAME}/`, '')
        const params = { Bucket: process.env.AWS_BUCKET_NAME, Key: oldKey }
        await s3.deleteObject(params).promise()

        const updatedUser = await User.findByIdAndUpdate(userId, { imagePath: null }, { new: true })
        .populate('bookmarkedPlaces followers following settings visitedPlaces')
        .populate({
            path: 'lists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        .populate({
            path: 'subscribedLists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        if (!updatedUser) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log('ListService.removeImage err', userId, err)
        
        return res.status(500).send({
            message: err.message || `An error occurred while removing an image from List with id ${userId}`
        })
    }
}


// get followers
const getFollowers = async (req, res) => {
    console.log('UserService.getFollowers')

    const userId = req.params.id

    if (!userId) {
        return res.status(400).send({
            message: 'No User id provided to get followers from.'
        })
    }

    try {
        const user = await User.findById(userId)
        .populate('followers')
        if (!user) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        res.send(user.followers || [])

    } catch (err) {
        console.log('UserService.getFollowers err', userId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while getting followers from User with id ${userId}`
        })
    }
}


// add follower
const addFollowing = async (req, res) => {
    console.log('UserService.addFollowing')

    const actor = req.user
    const followerUserId = req.params.id
    const { _id, id } = req.body
    const userId = _id || id

    if (!followerUserId) {
        return res.status(400).send({
            message: 'No User id provided to add following to.'
        })
    }

    if (!userId) {
        return res.status(400).send({
            message: 'Followed User does not have an id.'
        })
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(followerUserId, { $addToSet: { followingIds: userId } }, { new: true })
        .populate('bookmarkedPlaces followers following settings visitedPlaces')
        .populate({
            path: 'lists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        .populate({
            path: 'subscribedLists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        if (!updatedUser) {
            return res.status(404).send({
                message: `User not found with id ${followerUserId}`
            })
        }

        const followedUser = await User.findByIdAndUpdate(userId, { $addToSet: { followerIds: followerUserId } })
        .populate('settings')

        const targets = [followedUser].filter(user => user._id.toString() !== actor._id.toString())
        const deviceTokens = targets.filter(user => _.get(user, 'settings.deviceToken') && _.get(user, 'settings.receiveSubscriptionNotifications')).map(user => user.settings.deviceToken)

        const notification = {
            badge: 0,
            body: `${updatedUser.displayName} started following you.`,
            // collapseId: updatedList._id,
            payload: {
                'actorId': updatedUser._id,
                'category': 'kNewFollower'
            },
            threadId: followedUser._id,
            // titleLocKey: updatedList.title,
            topic: 'com.gdwsk.Rexy'
        }
        
        notificationPublisher('kNewFollower', { deviceTokens, notification, actor, user: updatedUser, targets })

        res.send(updatedUser)

    } catch (err) {
        console.log('UserService.addFollowing err', followerUserId, userId, err)
    }
}


// get following
const getFollowing = async (req, res) => {
    console.log('UserService.getFollowing')

    const userId = req.params.id

    if (!userId) {
        return res.status(400).send({
            message: 'No User id provided to get following from.'
        })
    }

    try {
        const user = await User.findById(userId)
        .populate('following')
        if (!user) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        res.send(user.following || [])

    } catch (err) {
        console.log('UserService.getFollowing err', userId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while getting following from User with id ${userId}`
        })
    }
}


// remove following
const removeFollowing = async (req, res) => {
    console.log('UserService.removeFollowing')

    const followerUserId = req.params.id
    const userId = req.params.userId

    if (!followerUserId) {
        return res.status(400).send({
            message: 'No User id provided to remove following from.'
        })
    }

    if (!userId) {
        return res.status(400).send({
            message: 'User to remove from follower from does not have an id.'
        })
    }

    try {
        await User.updateOne({ _id: userId }, { $pull: { followerIds: followerUserId } })

        const updatedUser = await User.findByIdAndUpdate(followerUserId, { $pull: { followingIds: userId } }, { new: true })
        .populate('bookmarkedPlaces followers following settings visitedPlaces')
        .populate({
            path: 'lists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        .populate({
            path: 'subscribedLists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        if (!updatedUser) {
            return res.status(404).send({
                message: `User not found with id ${followerUserId}`
            })
        }

        res.send(updatedUser)
        
    } catch (err) {
        console.log('UserService.removeFollowing err', followerUserId, userId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while removing a following User (${followerUserId}) from User (${userId})`
        })
    }
}


// user lists
const getLists = async (req, res) => {
    console.log('UserService.getLists')

    const userId = req.params.id

    try {
        const user = await User.findById(userId)
        .select('-xid -settings')
        .populate({
            path: 'lists',
            populate: {
                path: 'authors',
                model: 'User'
            }
        })
        .populate({
            path: 'lists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        .populate({
            path: 'lists',
            populate: {
                path: 'subscribers',
                model: 'User'
            }
        })
        res.send(user.lists || [])

    } catch (err) {
        console.log('UserService.getLists err', userId, err)

        res.status(500).send({
            message: err.message || 'An error occurred while retrieving User\'s authored Lists.'
        })
    }
}


// user subscriptions
const getSubscriptions = async (req, res) => {
    console.log('UserService.getSubscriptions')

    const userId = req.params.id

    try {
        const user = await User.findById(userId)
        .select('-xid -settings')
        .populate({
            path: 'subscribedLists',
            populate: {
                path: 'authors',
                model: 'User'
            }
        })
        .populate({
            path: 'subscribedLists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        .populate({
            path: 'subscribedLists',
            populate: {
                path: 'subscribers',
                model: 'User'
            }
        })
        res.send(user.subscribedLists || [])

    } catch (err) {
        console.log('getSubscriptions.getLists err', userId, err)

        res.status(500).send({
            message: err.message || 'An error occurred while retrieving User\'s subscribed Lists.'
        })
    }
}


// add bookmark
const addBookmark = async (req, res) => {
    console.log('UserService.addBookmark')

    const userId = req.params.id
    const { _id, id } = req.body
    const placeId = _id || id

    if (!userId) {
        return res.status(400).send({
            message: 'No User id provided to add bookmarked Place to.'
        })
    }

    if (!placeId) {
        return res.status(400).send({
            message: 'Place to bookmark does not have an id.'
        })
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, { $addToSet: { bookmarkedPlaceIds: placeId } }, { new: true })
        .populate('bookmarkedPlaces followers following settings visitedPlaces')
        .populate({
            path: 'lists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        .populate({
            path: 'subscribedLists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        if (!updatedUser) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log('UserService.addBookmark err', userId, placeId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while adding a bookmarked Place to User with id ${userId}`
        })
    }
}


// get bookmarks
const getBookmarks = async (req, res) => {
    console.log('UserService.getBookmarks')

    const userId = req.params.id

    if (!userId) {
        return res.status(400).send({
            message: 'No User id provided to get bookmarked Places from.'
        })
    }

    try {
        const user = await User.findById(userId)
        .populate('bookmarkedPlaces')
        if (!user) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        res.send(user.bookmarkedPlaces || [])

    } catch (err) {
        console.log('UserService.getBookmarks err', userId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while getting bookmarked Places from User with id ${userId}`
        })
    }
}


// delete bookmark
const removeBookmark = async (req, res) => {
    console.log('UserService.removeBookmark')

    const userId = req.params.id
    const placeId = req.params.placeId

    if (!userId) {
        return res.status(400).send({
            message: 'No User id provided to remove bookmarked Place from.'
        })
    }

    if (!placeId) {
        return res.status(400).send({
            message: 'Place to remove from bookmarks does not have an id.'
        })
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, { $pull: { bookmarkedPlaceIds: placeId } }, { new: true })
        .populate('bookmarkedPlaces followers following settings visitedPlaces')
        .populate({
            path: 'lists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        .populate({
            path: 'subscribedLists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        if (!updatedUser) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log('UserService.removeBookmark err', userId, placeId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while removing a bookmarked Place from User with id ${userId}`
        })
    }
}


// add visited
const addVisited = async (req, res) => {
    console.log('UserService.addVisited')

    const userId = req.params.id
    const { _id, id } = req.body
    const placeId = _id || id

    if (!userId) {
        return res.status(400).send({
            message: 'No User id provided to add visited Place to.'
        })
    }

    if (!placeId) {
        return res.status(400).send({
            message: 'Place to mark as visited does not have an id.'
        })
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, { $addToSet: { visitedPlaceIds: placeId } }, { new: true })
        .populate('bookmarkedPlaces followers following settings visitedPlaces')
        .populate({
            path: 'lists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        .populate({
            path: 'subscribedLists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        if (!updatedUser) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log('UserService.addVisited err', userId, placeId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while marking a Place as visited on User with id ${userId}`
        })
    }
}


// get visited
const getVisited = async (req, res) => {
    console.log('UserService.getVisited')

    const userId = req.params.id

    if (!userId) {
        return res.status(400).send({
            message: 'No User id provided to get visited Places from.'
        })
    }

    try {
        const user = await User.findById(userId)
        .populate('visitedPlaces')
        if (!user) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        res.send(user.visitedPlaces || [])

    } catch (err) {
        console.log('UserService.getVisited err', userId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while getting visited Places from User with id ${userId}`
        })
    }
}

// delete visited
const removeVisited = async (req, res) => {
    console.log('UserService.removeVisited')

    const userId = req.params.id
    const placeId = req.params.placeId

    if (!userId) {
        return res.status(400).send({
            message: 'No User id provided to remove visited Place from.'
        })
    }

    if (!placeId) {
        return res.status(400).send({
            message: 'Place to remove from visited does not have an id.'
        })
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, { $pull: { visitedPlaceIds: placeId } }, { new: true })
        .populate('bookmarkedPlaces followers following settings visitedPlaces')
        .populate({
            path: 'lists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        .populate({
            path: 'subscribedLists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        if (!updatedUser) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log('UserService.removeVisited err', userId, placeId, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        return res.status(500).send({
            message: `An error occurred while removing a visited Place from User with id ${userId}`
        })
    }
}

// register
const register = async (req, res) => {
    console.log('UserService.register')

    const userId = req.params.id
    const { deviceToken } = req.body

    if (!deviceToken) {
        return res.status(400).send({
            message: 'No device token provided to register.'
        })
    }

    try {
        // const user = await User.findById(userId)
        // .populate('bookmarkedPlaces followers following settings visitedPlaces')
        // .populate({
        //     path: 'lists',
        //     populate: {
        //         path: 'places',
        //         model: 'Place'
        //     }
        // })
        // .populate({
        //     path: 'subscribedLists',
        //     populate: {
        //         path: 'places',
        //         model: 'Place'
        //     }
        // })
        // if (!user) {
        //     return res.status(404).send({
        //         message: `User not found with id ${userId}`
        //     })
        // }
        // if (user.settings && user.settings.deviceToken && user.settings.deviceToken === deviceToken) {
        //     return res.send(user)
        // }

        // if (user.settings && user.settings.deviceToken) {
        //     console.log('update existing notification settings')
        //     const updatedSettings = await Settings.findByIdAndUpdate(user.settingsId, { deviceToken })
        //     if (!updatedSettings) {
        //         return res.status(404).send({
        //             message: `User not found with id ${userId}`
        //         })
        //     }
        //     const updatedUser = await User.findById(userId)
        //     .populate('bookmarkedPlaces followers following settings visitedPlaces')
        //     .populate({
        //         path: 'lists',
        //         populate: {
        //             path: 'places',
        //             model: 'Place'
        //         }
        //     })
        //     .populate({
        //         path: 'subscribedLists',
        //         populate: {
        //             path: 'places',
        //             model: 'Place'
        //         }
        //     })
        //     if (!user) {
        //         return res.status(404).send({
        //             message: `User not found with id ${userId}`
        //         })
        //     }
        //     return res.send(updatedUser)
        // }

        const settings = new Settings({ deviceToken, userId })
        const savedSettings = await settings.save()
        const settingsId = savedSettings._id
        
        const updatedUser = await User.findByIdAndUpdate(userId, { settingsId }, { new: true })
        .populate('bookmarkedPlaces followers following settings visitedPlaces')
        .populate({
            path: 'lists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        .populate({
            path: 'subscribedLists',
            populate: {
                path: 'places',
                model: 'Place'
            }
        })
        if (!updatedUser) {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }
        if (!updatedUser.settings || !updatedUser.settings.deviceToken) {
            return res.status(500).send({
                message: `An error occurred while adding APNs device token to User with id ${userId}`
            })
        }
        res.send(updatedUser)

    } catch (err) {
        console.log('UserService.register err', userId, deviceToken, err)

        if (err.kind === 'ObjectId') {
            return res.status(404).send({
                message: `User not found with id ${userId}`
            })
        }

        res.status(500).send({
            message: err.message || 'An error occurred while registering device token.'
        })
    }
}

module.exports = { authenticate, create, get, getById, update, remove, uploadImage, removeImage, getFollowers, addFollowing, getFollowing, removeFollowing, getLists, getSubscriptions, addBookmark, getBookmarks, removeBookmark, addVisited, getVisited, removeVisited, register }
const User = require('../models/User.js')

const jwt = require('jsonwebtoken')
const { promisify } = require('util')

const jwksClient = require('jwks-rsa')
const client = jwksClient({ jwksUri: process.env.APPLE_PUBLIC_KEY_URL })

const getKey = (header, callback) => {
    client.getSigningKey(header.kid, function(err, key) {
        const signingKey = key.publicKey || key.rsaPublicKey        
        callback(null, signingKey)
    })
}

const verifyPromised = promisify(jwt.verify)
const validateToken = async (req, res, next) => {
    if (!req.header('Authorization')) {
        return res.status(401).send({ error: 'No authorization method present.' })
    }

    const token = req.header('Authorization').replace('Bearer ', '')

    try {
        const { sub } = jwt.decode(token, { json: true })

        // const data = await verifyPromised(token, getKey)
        const user = await User.findOne({ xid: sub })
        if (!user) {
            throw new Error()
        }

        req.user = user
        req.token = token

        next()

    } catch (err) {
        console.log('validateToken err', err)
        res.status(401).send({ error: 'Not authorized to access this resource.' })
    }
}

module.exports = { validateToken }
// https://github.com/node-apn/node-apn

const apn = require('apn')

const options = {
    token: {
        key: './config/gdwsk_apns_certificate.p8',
        keyId: process.env.APNS_KEY,
        teamId: process.env.APNS_TEAM
    },
    production: false
}
const provider = new apn.Provider(options)


module.exports = { apn, provider }

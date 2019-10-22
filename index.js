// const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')

// create express app
const app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended : true}))

// parse application/json
app.use(bodyParser.json())
app.use(express.json())

// configure database
const databaseConfig = require('./config/database.config.js')
const mongoose = require('mongoose')

mongoose.Promise = global.Promise

// connect to the database
mongoose.connect(databaseConfig.url, {
    useNewUrlParser: true
}).then(() => {
    console.log("Successfully connected to the database")
}).catch(err => {
    console.log('Could not connect to the database. Exiting now...', err)
    process.exit()
})

require('./routes/CommentRoutes.js')(app)
require('./routes/ListRoutes.js')(app)

const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(`rexy-server listening on port ${port}!`)
})
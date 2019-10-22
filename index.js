// const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')

// create express app
const app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended : true}))

// parse application/json
app.use(bodyParser.json())

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

// simple route
app.get('/', (req, res) => {
    res.json({"message" : "Hello, Alex Oh!"})
})

require('./routes/CommentRoutes.js')(app)

app.listen(3000, () => {
    console.log("rexy-server listening on port 3000!")
})
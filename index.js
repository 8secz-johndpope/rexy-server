const dotenv = require('dotenv')
const express = require('express')
const bodyParser = require('body-parser')

// configure dotenv
dotenv.config()

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
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Successfully connected to the database')
}).catch(err => {
    console.log('Could not connect to the database. Exiting now...', err)
    process.exit()
})

require('./routes/CommentRoutes.js')(app)
require('./routes/ListRoutes.js')(app)
require('./routes/NotificationRoutes.js')(app)
require('./routes/PlaceRoutes.js')(app)
require('./routes/SettingsRoutes.js')(app)
require('./routes/UserRoutes.js')(app)

console.log(`Using ${process.env.NODE_ENV} environment`)

const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(`rexy-server listening on port ${port}!`)
})
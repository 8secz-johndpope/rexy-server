const http = require('http');
const mongoose = require('mongoose');

const hostname = '127.0.0.1';
const PORT = process.env.PORT || 5000;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello, Alex Oh\n')
});

server.listen(PORT, () => {
    console.log(`Server running on ${PORT}/`);
});

var uriString = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/HelloMongoose';

mongoose.connect(uriString, function (err, res) {
    if (err) {
        console.log ('ERROR connecting to: ' + uriString + '. ' + err);
    } else {
        console.log ('Succeeded connected to: ' + uriString);
    }
});
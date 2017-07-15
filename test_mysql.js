var express = require('express'); 
var bodyparser = require('body-parser'); 

var connection = require('./connection'); 
var routes = require('./routes'); // Route handling for express API  

var port = process.env.PORT || 8080;


var app = express();  
app.use(bodyparser.urlencoded({  
    extended: true
}));
app.use(bodyparser.json());

connection.init();  
routes.configure(app);


var server = app.listen(port, function() {  
    console.log('Server listening on port ' + port);
});
var mysql = require('mysql');

function Connection() {  
    this.pool = null;

    this.init = function() {
        this.pool = mysql.createPool({
            connectionLimit: 100,
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'oxen',
            ssl: false,
			multipleStatements: true
        });
    };

    this.acquire = function(callback) {
        this.pool.getConnection(function(err, connection) {
            callback(err, connection);
        });
    };

	this.execute = function (connection, query, param, callback){
		connection.query (query, param, function(err, result) {
			connection.release();		
			if(err) {
				//throw err;
				console.log(err)
				callback(err,null)
				return;
			}
		
			callback(null,result);
		});

	};
}

module.exports = new Connection();  
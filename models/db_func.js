var connection = require('../connection');  

module.exports = function(req, res) {  
    this.get = function(res) {
        connection.acquire(function(err, con) {
                    var query = "SELECT dc.description,  \
                                 COUNT(cancellation_code) AS count  \
                    FROM   performance p  \
                                 LEFT JOIN def_cancel dc  \
                                                ON dc.code = p.cancellation_code  \
                    WHERE  dc.description IS NOT NULL  \
                    GROUP  BY dc.description \
                    ";

            con.query(query, function(err, result) {
                con.release();
                                res.send(result);
            });
        });
    };
}
// MySQL proc:
// ---------
// select @var := column from table
// sama dengan --> set @var = (select column from table)

// added Error-Catch for insering watch (primary-key duplicate)
// removing Array elm when only showing 1 result;

// Error-Catch when bidding on NON-EXIST listing

// Put res.status first, before res.send! (or else it'll always be 200)

var connection = require('../connection');  

module.exports = function(req, res) {  


	/* ============================	*/
	/*		1. BID section ....	   */
	/* ========================== */

    this.getBids = function(res) {
        connection.acquire(function(err, con) {

			var query = "SELECT * FROM bids \
							ORDER BY bid_date desc";

			con.query(query, function(err, result) {
                con.release();
				res.send(result);
            });
        });
    };

	this.getBidDetail = function(req,res) {
        connection.acquire(function(err, con) {
				
			console.log ('showing bid details: #' + req.params.bid);

			var query = "SELECT * FROM bids b LEFT OUTER JOIN members m ON m.m_id = b.user_id WHERE bid_id = ?";
			
			connection.execute (con, query, req.params.bid, function(err,result){
				res.send(result[0]);
			});
		});
	};

	 this.newBid = function (req,res) {
        connection.acquire(function(err, con) {
			
			var bid = req.query.b;
			var uID = req.query.u;
			//var uID = Math.ceil (Math.random() * 350);

				console.log ('posting new bid ' + bid + ' on listing: #' + req.params.list_id + '(bidder: ' + uID + ')');

			var query = "CALL new_bid(?,?,@out1,?,@out2); select @out1 as status, @out2 as msg";
			
			connection.execute (con, query, [uID, req.params.list_id, bid], function(err,result){

				if(err){
					var error_msg = {"result":"Operation failed.","details": err};
					res.status(400).send(error_msg);
					return;
				}
				
				var JSON_response = result[1][0];
				JSON_response.result = (JSON_response.status <=2) ? "OK":"Operation failed.";				
				
				//added to let fronted know which Listing is updated..!
				JSON_response.list_id = uID;
				var JSON_header = (JSON_response.status <=2) ? 200: 400;

				res.status(JSON_header).send(JSON_response);
			});
		});
	 };


	/* ============================	*/
	/*	   2. LISTING section ...  */
	/* ========================== */

	this.getListings = function(res) {
        connection.acquire(function(err, con) {

			var query = "SELECT * FROM rules r INNER JOIN auction a \
						  ON a.auction_id = r.auction_id \
						 INNER JOIN item i \
						  ON i.item_id = r.item_id \
						 INNER JOIN h_bid h \
						  ON h.rule_id = r.rule_id \
						 WHERE active = 1";
			
			connection.execute (con, query, null, function(err,result){
				res.send(result);
			});
		});
	};

	this.getHighestBid= function(req,res) {
        connection.acquire(function(err, con) {

			var query = "SELECT b.*,h.*,r.Kelipatan, i.item_title FROM h_bid h \
						  INNER JOIN bids b \
							ON h.bid_id = b.bid_id \
						  INNER JOIN rules r \
							ON r.rule_id = h.rule_id \
						  INNER JOIN item i \
							ON i.item_id = r.item_id \
						 WHERE h.rule_id = " + req.params.list_id;
			
			connection.execute (con, query, null, function(err,result){
				res.send(result[0]);
			});
		});
	};

	// For searching with hashtags, sort_by, and search key..
	// ---------------------------------------------
	this.getListingsHashtags = function(req,res) {
        connection.acquire(function(err, con) {
			//console.log ('sorted listing; using ' + req.query.sort.toUpperCase() + ', ASC: ' + req.query.asc);
			req.query.search = req.query.search || '';

/*
			if(req.query.ladang != '') {
				var ladang_arr = req.query.ladang.split(",");
				loop_count = 0;
				for (var i in ladang_arr ) 
					ladang_arr [loop_count] = "'" + ladang_arr[loop_count++] + "'"

				var ladang_string = ladang_arr.join(',');				
				console.log (ladang_string)
			}
*/
			
			console.log ('sorted listing: ' + ((typeof req.query.sort_by != 'undefined') ? req.query.sort_by.toUpperCase() : '') + '; search keyword: ' + req.query.search + '; hashtags: ' + req.query.ladang);

			var query = "SET @OrderBy = ?; \
						 SET @SearchParam = CONCAT('%',?,'%'); \
						 SELECT * FROM rules r \
							INNER JOIN auction a \
								ON a.auction_id = r.auction_id \
							LEFT OUTER JOIN h_bid h \
								ON h.rule_id = r.rule_id \
							INNER JOIN item i \
								ON i.item_id = r.item_id \
							INNER JOIN item_ladang lm \
								ON lm.rule_id = r.rule_id \
							INNER JOIN ladang l \
								ON l.ladang_id = lm.ladang_id \
							WHERE active in (0, 1) \
							  AND item_title LIKE @SearchParam \
							  AND FIND_IN_SET(ladang_name, ?) \
							ORDER BY \
								CASE WHEN @OrderBy = 'end_soonest' THEN end_date END ASC, \
								CASE WHEN @OrderBy = 'post_latest' THEN start_date END DESC, \
								CASE WHEN @OrderBy = 'highest_bid' THEN price END DESC, \
								CASE WHEN @OrderBy = 'lowest_bid' THEN price END ASC; \
							";
			
			connection.execute (con, query, [req.query.sort_by, req.query.search, req.query.ladang], function(err,result){
				res.send(result[2]);
			});
		});
	};

	// for Sort & Search only.. (WITHOUT ladang)
	// ---------------------------------------
	this.getListingsSorted = function(req,res) {
        connection.acquire(function(err, con) {
			req.query.search = req.query.search || '';

			console.log ('sorted listing: ' + ((typeof req.query.sort_by != 'undefined') ? req.query.sort_by.toUpperCase() : '') + '; search keyword: ' + req.query.search );

			var query = "SET @OrderBy = ?; \
						 SET @SearchParam = CONCAT('%',?,'%'); \
						 SELECT * FROM rules r \
							INNER JOIN auction a \
								ON a.auction_id = r.auction_id \
							LEFT OUTER JOIN h_bid h \
								ON h.rule_id = r.rule_id \
							INNER JOIN item i \
								ON i.item_id = r.item_id \
							WHERE active in (0, 1) \
							  AND item_title LIKE @SearchParam \
							ORDER BY \
							  CASE WHEN @OrderBy = 'end_soonest' THEN end_date END ASC, \
							  CASE WHEN @OrderBy = 'post_latest' THEN start_date END DESC, \
							  CASE WHEN @OrderBy = 'highest_bid' THEN price END DESC, \
							  CASE WHEN @OrderBy = 'lowest_bid' THEN price END ASC; \
							";
			
			connection.execute (con, query, [req.query.sort_by, req.query.search], function(err,result){
				res.send(result[2]);
			});
		});
	};

	this.getListingDetail = function(req, res) {
        connection.acquire(function(err, con) {
			console.log ('showing listing details: #' + req.params.list_id);

			var query = "SELECT *, COUNT(w.user_id) as watcher FROM rules r \
							INNER JOIN auction a \
							  ON a.auction_id = r.auction_id \
							INNER JOIN item i \
							  ON i.item_id = r.item_id \
							INNER JOIN item_img img \
							  ON img.item_id = i.item_id \
							LEFT OUTER JOIN h_bid h \
							  ON h.rule_id = r.rule_id \
							INNER JOIN bids b \
							  ON b.bid_id = h.bid_id \
							INNER JOIN sellers s \
							  ON s.s_id = a.seller_id \
							INNER JOIN watch w \
							  ON w.rule_id = r.rule_id \
							WHERE r.rule_id = ? \
							  AND active=1";
			
			connection.execute (con, query, req.params.list_id, function(err,result){
				res.send(result[0]);
			});
		});
	};


	/* ============================	*/
	/*	  3. AUCTIONS section ...  */
	/* ========================== */

	this.getActiveAuctions = function(res) {
        connection.acquire(function(err, con) {

			var query = "SELECT *, COUNT(rule_id) as item_count FROM auction a \
							INNER JOIN rules r \
							  ON a.auction_id = r.auction_id \
							WHERE active = 1 \
							GROUP BY a.auction_id \
							ORDER BY start_date ASC";
			
			connection.execute (con, query, null, function(err,result){
				res.send(result);
			});
		});
	};

	this.getAuctionMembers = function(req, res) {
        connection.acquire(function(err, con) {
			console.log ('showing auction members: #' + req.params.auction_id);

			var query = "SELECT * FROM rules r \
							INNER JOIN auction a \
							  ON a.auction_id = r.auction_id \
							INNER JOIN item i \
							  ON i.item_id = r.item_id \
							WHERE a.auction_id = ?";
			
			connection.execute (con, query, req.params.auction_id, function(err,result){
				res.send(result);
			});
		});
	};


	/* ============================	*/
	/*	  4. WATCHED section ...   */
	/* ========================== */

	this.getWatch = function(req,res) {
        connection.acquire(function(err, con) {

			var query = "SELECT m.*,w.* FROM rules r \
							INNER JOIN watch w \
							  ON w.rule_id = r.rule_id \
							LEFT JOIN members m \
							  ON m.m_id = w.user_id \
							WHERE r.rule_id = ? \
							";
			
			connection.execute (con, query, req.params.list_id, function(err,result){
				res.send(result);
			});
		});
	};

	this.addWatch = function(req,res) {
        connection.acquire(function(err, con) {

			console.log('adding watch item #' + req.params.list_id + ' for user ' + req.query.u)

			var uID = req.query.u;
			var query = "CALL add_watch(?,?,@out1); select @out1 as output";
			
			connection.execute (con, query, [uID, req.params.list_id], function(err,result){
				if(err){
					var error_msg = {"result":"Operation failed.","details": err, "listId": req.params.list_id};
					res.status(400).send(error_msg);

					return;
				}
				res.status(200).send({"result":"OK","msg":result[1][0].output, "listId": req.params.list_id});

			});
		});
	};

	this.removeWatch = function(req,res) {
        connection.acquire(function(err, con) {
			
			var uID = req.query.user_id;
			var query = "CALL remove_watch(?,?,@out1); select @out1 as output";
			
			connection.execute (con, query, [uID, req.params.list_id], function(err,result){
				res.send({"result":"OK","msg":result[1][0].output});
			});
		});
	};
}
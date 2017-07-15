var oxen = require('./models/oxen')  
var oxen = new oxen(); 

module.exports = {  

  configure: function(app) {

  // BIDS  
  // ====
	app.get('/bids', function(req, res, next) {
			oxen.getBids(res);
		});

	app.get('/bid/:bid', function(req, res, next) {
			oxen.getBidDetail(req,res);
		});

	app.post('/bid/:list_id', function(req,res,next) {
			oxen.newBid (req, res);
		});


  // LISTINGS  
  // =========	
	app.get('/listings', function(req, res, next) {
		if (req.query.ladang) {
			oxen.getListingsHashtags(req,res);
			return;
		}
		else if (req.query.sort_by || req.query.search) { 
			oxen.getListingsSorted(req,res);
			return;
		}
		oxen.getListings(res);
	});

	app.get('/listing/:list_id', function(req, res, next) {
		oxen.getListingDetail(req,res);
	});
	
	app.get('/listing/:list_id/top', function(req, res, next) {
		oxen.getHighestBid(req,res);
	});


  // AUCTIONS  
  // =========	
	app.get('/auctions', function(req, res, next) {
		oxen.getActiveAuctions(res);
	});

	app.get('/auction/:auction_id', function(req, res, next) {
		oxen.getAuctionMembers(req,res);
	});


  // WATCH  
  // =========	
	app.get('/watch/:list_id', function(req, res, next) {
		oxen.getWatch(req,res);
	});

	app.post('/watch/:list_id', function(req, res, next) {
		oxen.addWatch(req,res);
	});

	app.delete('/watch/:list_id', function(req, res, next) {
		oxen.removeWatch(req,res);
	});

	}
};
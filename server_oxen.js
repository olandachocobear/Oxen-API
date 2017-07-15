var http = require('http');
var io = require('socket.io');

var express  = require('express');
var app      = express();         
//var sql		 = require('mssql');
var request	 = require('request');
//var cors	 = require('cors')
var jwt = require('jsonwebtoken');


console.log("   ---------------------- ")
console.log('||    OXEN server v1.0	  ||')
console.log('||    runs on PORT 8030   ||')
console.log('   ---================---  ')  


var config = {
	user: 'idtemp',
	password: 'katamso7',
	server: '172.17.0.20',
	database: 'OXEN'
}

server = http.createServer(app,function(req, res){
    //res.end('It Works!! Path Hit: ' + req.url);
	var username = req.url; // gak bisa
	//res.sendfile('index.html');
	
});

app.use(express.static(__dirname ));       	

//app.use(cors())

/*
var server = app.listen(8030,function(){
    console.log("Server listening ...");
});
*/

// socket.io 
var socket = io.listen(server);


app.set('port', process.env.PORT || 8030);

server.listen(app.get('port'));


var member_arr = new Array();

socket.on('connection', function(client){
	
	//console.log (client.request.connection.remoteAddress)

	//member_arr.push( { user_id: client.handshake.query.id , socket_id: client.handshake.query.sockID });
	//console.log(member_arr);
	
	//console.log('User connected: ' + client.handshake.query.__adc);

	var token = client.handshake.query.__adc;


	// Verifying JWT-Token...
	// =======================
	jwt.verify(token, 'some secret', function(err, decoded) {
	
		if(err){
			console.log(err)
			return	
		}

		//::fff:123.123.23.3 <=> 123.123.23.3 still allowed
		if (client.handshake.address.indexOf(decoded.IP) == -1 )
		{
			console.log('token used from different domain (by: '+client.uid+')')
			
			client.emit('wrongAuth');
			client.disconnect();
		}

		else 
		{
			console.log('----------------------------------------------------')
			console.log('User connected (uID #' + decoded.uid + ') - coming from IP: ' + decoded.IP);
			client.handshake.headers.url = client.handshake.url
			console.log('info:');
			console.log (client.handshake.headers)
			console.log('----------------------------------------------------')
			// give uIDs to new connected client...
			client.uid = decoded.uid;
		}
		
	});





	client.on('message', function(msg){
		socket.send(msg);
	});  
  
	client.on('pesan', function(bundel){
		socket.emit('catch', {isi: bundel.apa, dari: bundel.siapa});
	});

	client.on('directSend', function(bundel){
		socket.emit('PM', {isi:bundel.apa, to: bundel.siapa, from: bundel.dari});
	});

	client.on('join', function(data){
		client.join(data.id);
	});

	client.on('directSend2', function(bundel){
		// please notice the difference in:
		// client.emit(....) and socket.emit(....) as the 1st will send to sender only
		// (except it was written client.broadcast.emit)
		
		socket.to(bundel.siapa).emit('PM2', {isi:bundel.apa, from:bundel.dari});

		//STEP 5 :
		//-------
		//client.broadcast.to('TeamA').emit('PM2', {isi:bundel.apa, from:bundel.dari});
	});

	client.on('fetch', function(data){
		fetchItemInfo (data.aucId)
	});
	
	client.on('getHighest', function(data){
		fetchHighestPrice (client, data.aucId, data.notif);
		//console.log ('getHighest: ' + data.notif);
	});

	client.on('raiseBid', function(data){
		//newBid (data.auc, data.who)
		addBid (client, data.auc, data.who, data.b)
		
	});

	client.on('placeJejak', function(data){
		addJejak (client, data.auc)
	});

	client.on('endusJejak', function(data){
		getJejak (client,data.auc)
	});

	client.on('typing', function(data){
		updateStatus(client,data.auc, data.client, 'is typing...')
	})

	client.on('masukRoom', function(data){
		client.join(data.aucId);
		
		setTimeout(function() {
			//getChat(data.aucId);		
			//console.log(data.aucId);
		}, 500); // give it a break before fetching data

	});

	client.on('fetchChat', function(data){
		getChat (data.aucId);
	});

	client.on('newChat', function(data){
		insertMsg (data.auc, data.who, data.msg, 1)
	});

		
}); 

function addJejak (client,what) {
	request.post('http://127.0.0.1:8080/watch/'+what+'?u='+client.uid, function (error, response, body) {
	
	  console.log('Connect to: http://localhost:8080/watch/'+what+'?u='+client.uid+'..')

	  body = JSON.parse(body);
  	  console.log(body.result + ' ' + JSON.stringify(body))
	  
	  // follow-up actions..
	  if(body.result == 'OK' ) {
		socket.in(what).emit('afterJejak', body);
	  }

	  else {
		 sendMessageToEmitter (client, {
			"title": 'Watch Failed', 
			"msg": "Errno: " + body.details.errno
		 });
	  }

	});
}

function getJejak (client,what) {
	request.get('http://127.0.0.1:8080/watch/'+what, function (error, response, body) {
		console.log('Connect to: http://localhost:8080/watch/'+what);

		client.emit('updateJejak', JSON.parse(body));
	});
}


function fetchItemInfo (what) {
	request('http://127.0.0.1:8080/listing/'+what, function (error, response, body) {

	  console.log('Connect to: http://localhost:8080/listing/'+what+'...')
	  
	  socket.in(what).emit('updateBid', JSON.parse(body));

	  if (error)	
		  console.log('error:', error); // Print the error if one occurred 
		
	  console.log('body:', body); // Print the HTML for the Google homepage. 
	});

}

function fetchHighestPrice (client, what, notify) {
	request('http://127.0.0.1:8080/listing/'+what+'/top', function (error, response, body) {

	  console.log('Connect to: http://localhost:8080/listing/'+what+'/top..')

	  body = JSON.parse(body);

	  if (notify==1)
	  {
		  body.notify = true
	  }

	  client.emit('updateBid', body);
	  if (error)	
		  console.log('error:', error); // Print the error if one occurred 

	  // Print the HTML for the Google homepage. 
		//console.log('body:', JSON.stringify(body)); 

	});

}

function addBid (client, what, who, amount) {	
/*
request({
  url: 'http://localhost/test2.php',
  method: 'POST',
  json: {mes: 'heydude'} OR form: { mes: "heydude" }
})
*/

	request.post('http://127.0.0.1:8080/bid/'+what+'?b='+amount+'&u='+client.uid, function (error, response, body) {

	  console.log('Connect to: http://localhost:8080/bid/'+what+'?b='+amount+'&u='+client.uid+'..')

	  body = JSON.parse(body);

	  //only the bidder will get popup.. others get corner-notification
	  //socket.in(what).emit('afterBid', JSON.parse(body));
	  client.emit('afterBid', body);

	  //cek if bid success or not to notify others..
	  if(body.status == 2)
		  client.broadcast.to(what).emit('priceHasChanged');

	  if (error)	
		  console.log('error:', error); // Print the error if one occurred 

	  console.log('result:', JSON.stringify(body)); // Print the HTML for the Google homepage. 
	});

}


/* NON-TRANSCACTIONAL (generic function) */

function sendMessageToEmitter(client, payload) {
	client.emit('showMessage', payload);
}

function updateStatus(client,where, who, msg){	
	var msg = who + ' ' + msg;

	//console.log(where+' '+msg)
	//socket.in(where).emit('appendStatus', {msg: msg});

	//client.join(where); //GAK Perlu, kalo pake broadcast to
	client.broadcast.to(where).emit('appendStatus', {msg:msg});
	
}





/*
function doSQL(what){
	// SQL Connection
	sql.connect(config, function(err) {
		if(err)
		{
			console.log(err)
			return;
		}

		var request = new sql.Request(sql);

		request.query ("select * from Bids b inner join Auction a on a.auc_id = b.auc_id where a.auc_id='"+what+"' order by nominal desc", function(err,recordSet){
			console.log(recordSet); //--> bikin lambat
			socket.in(what).emit('updateBid', {data: recordSet});
		});

		request.on('error', function(err) {
			console.log(err);
		});
	});

	sql.on('error', function(err){		
		console.log(err);
	});

	//sql.close(); --> BIKIN ERROR ga jalanin apa2
}

function newBid(where, who){
	sql.connect(config, function(err) {
		if(err)
		{
			console.log(err)
			return;
		}
	
		var request = new sql.Request(sql);
	
	var highest_bid,new_bid=0;

request.query ("select * from Bids where auc_id='"+where+"' order by nominal desc", function(err,recordSet){
	highest_bid=recordSet[0].nominal
new_bid = parseInt(highest_bid)+5000;
//console.log(highest_bid+"-"+new_bid);


		request.query ("Insert into Bids (auc_id,date,nominal,bidder_id) values ('"+where+"',getdate(),"+new_bid+", '"+who+"')", function(err,recordSet,result){
			//console.log(result + " row affected.");
			doSQL(where);
			setTimeout(function() {
				insertMsg(where, who, who + " has bid this item for <b>Rp " + new_bid + ",-.</b>"  , 2);
			}, 2000);
		});
});

		request.on('error', function(err) {
			console.log(err);
		});
	});

	//sql.close();
}
*/


/*
function getChat(what){
	sql.connect(config, function(err) {
		if(err)
		{
			console.log(err)
			return;
		}

		var request = new sql.Request(sql);

		request.query ("select * from Chats c where c.auc_id='"+what+"' order by timestamp", function(err,recordSet){
			console.log(recordSet); //--> bikin lambat
			//socket.emit('retrieveChat', {data: recordSet});
			socket.in(what).emit('retrieveChat', {data: recordSet});
			
			//io.sockets.broadcast.to(what).emit('retrieveChat', {data: recordSet}); */

			/*
			var clients_in_the_room = io.sockets.adapter.rooms['PP0001']; 
			for (var clientId in clients_in_the_room ) {
			  console.log('client: %s', clientId); //Seeing is believing 
			  //var client_socket = io.sockets.connected[clientId];//Do whatever you want with this
			}
			*/
/*		});

		request.on('error', function(err) {
			console.log(err);
		});
	});

	sql.on('error', function(err){		
		console.log(err);
	});

	//sql.close(); --> BIKIN ERROR ga jalanin apa2
}
*/


/*
function insertMsg(where, who, what, tipe){
	sql.connect(config, function(err) {
		if(err)
		{
			console.log(err)
			return;
		}
	
		var request = new sql.Request(sql);

		request.query ("Insert into Chats values ('"+where+"', '"+who+"', getdate(),'"+what+"', " + tipe + ")", function(err,recordSet,result){
			getChat(where);
		});

		request.on('error', function(err) {
			console.log(err);
		});
	});

	//sql.close();
}
*/
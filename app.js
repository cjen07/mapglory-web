var app = require('koa')();
var router = require('koa-router')();
var serve = require('koa-static');
var views = require("co-views");
var render = views(__dirname + "/", { map: { html: 'swig' } });
var db = require('monk')('localhost:27017/map-glory');


app.use(serve(__dirname + '/'));
app.use(router.routes()).use(router.allowedMethods());


var server = require('http').createServer(app.callback());
var io = require('socket.io')(server);
io.on('connection', function(socket){

	/// Flash
	socket.on('flash', function(data){

	});

	/// Popup

	socket.on('getPopups', function(){
		// query database of all popups and with fields like attr & geo
		db.get('popups').find({}, function (err, docs) {
			socket.emit('popups', docs);
		});
	});

	geoDistance = function(geo1, geo2){
		return Math.abs(geo1.lat - geo2.lat) +
				Math.abs(geo1.lng - geo2.lng);
	}

	/// SignIn

	socket.on('signIn', function(data){
		// data: {name: name, geo: geo}
		db.get('users').find({}, function (err, docs) {
			// a little analysis
			for (var i = 0; i < docs.length; i++){
				if (docs[i].name === data.name &&
					geoDistance(docs[i].geo, data.geo) <= 0.0002){
					socket.emit('signIn', {
						result: true,
						name: docs[i].name,
						geo: docs[i].geo
					});
					return;
				}
			}
			socket.emit('signIn', {
				result: false,
				msg: "sign in"
			});
			return;
		});
	})

	/// SignUp

	socket.on('signUp', function(data){
		// data: {name: name, geo: geo}
		db.get('users').find({}, function (err, docs) {
			// a little analysis
			for (var i = 0; i < docs.length; i++){
				if (data.name === "" ||
					geoDistance(docs[i].geo, data.geo) <= 0.001){
					socket.emit('signIn', {
						result: false,
						msg: "sign up"						
					});
					return;
				}
			}
			db.get('users').insert({
				name: data.name,
				geo: data.geo
			}, function(){
				socket.emit('signIn', {
					result: true,
					name: data.name,
					geo: data.geo
				});
			});			
			return;
		});
	});

	/// PopupList

	socket.on('getPopupList', function(data){
		// data : {geo: geo}
		// query database of all popups of the same user
		db.get('popups').find({name: data.geo}, function (err, docs) {
			socket.emit('popupList', docs);
		});
	});

	/// ConversationList

	socket.on('getConversationList', function(data){
		// data: {popup: {geo: geo}}
		// query database of all lastest conversation of the popups
		db.get('conversations').find({name: data.popup.geo}, {sort: {date: -1}}, function (err, docs) {
			var conversationList = [];
			for (var i = 0; i < docs.length; i++){
				conversationList.push(docs[i]);
				for (var j = 0; j < i; j++){
					if (geoDistance(docs[i].geo, docs[j].geo) === 0){
						conversationList.pop();
						break;
					}
				}
			}
			socket.emit('conversationList', conversationList);
		});
	});

	/// TextList

	socket.on('getTextList', function(data){
		// data: {chat: {name: name, geo: geo}}
		// query database of all conversations of the particular user and popup
		db.get('conversations').find({name: data.chat.name, geo: data.chat.geo}, {sort: {date: 1}}, function (err, docs) {
			socket.emit('textList', docs);
		});
	});

	/// FriendList

	socket.on('getFriendList', function(data){
		// data : {geo: geo}
		// query database of all conversation of the same geo
		db.get('conversations').find({geo: data.geo}, {sort: {date: -1}}, function (err, docs) {
			var friendList = [];
			for (var i = 0; i < docs.length; i++){
				friendList.push(docs[i]);
				for (var j = 0; j < i; j++){
					if (geoDistance(docs[i].geo, docs[j].geo) === 0){
						friendList.pop();
						break;
					}
				}
			}
			socket.emit('friendList', friendList);
		});
	});

	/// Edit

	// risks with no user/popupOldGeo check

	socket.on('updatePopup', function(data){
		// data : {userGeo: geo, popupOldGeo: popup.geo, popupNewGeo: popupGeo, attr: attr, text: text}
		// check if popupNewGeo is valid
		db.get('popups').find({}, function (err, docs) {
			// a little analysis
			for (var i = 0; i < docs.length; i++){
				if (geoDistance(docs[i].geo, data.popupNewGeo) <= 0.0002){
					socket.emit('edit', {
						result: false,
						msg: "invalid popup geo"						
					});
					return;
				}
			}
			var now = new Date();
			db.get('popups').update(
				{
					geo: data.popupOldGeo
				},
				{
					$set: {
				        geo: data.popupNewGeo,
				        attr: data.attr,
				        text: data.text,
				        date: now
				    }
				},
				function (err, docs) {
					// update all related conversation
					db.get('conversations').update(
						{
							name: data.popupOldGeo
						},
						{
							$set: {
						        name: data.popupNewGeo
						    }
						},
						function (err, docs){
							socket.emit('edit', {
								result: true,
								msg: "popup updated"
							});
						}
					);					
				}
			);		
			return;
		});		
	});
	socket.on('removePopup', function(data){
		// remove existed popup
		// remove all related conversation		
		db.get('popups').remove(
			{
				geo: data.popup.geo
			},
			function (err, docs) {
				// update all related conversation
				db.get('conversations').remove(
					{
						name: data.popup.geo
					},
					function (err, docs){
						socket.emit('edit', {
							result: true,
							msg: "popup removed"
						});
					}
				);					
			}
		);		
		return;
	});
	socket.on('newPopup', function(data){
		// data : {userGeo: geo, popupGeo: popupGeo, attr: attr, text: text}
		// check if popupGeo is valid
		db.get('popups').find({}, function (err, docs) {
			// a little analysis
			for (var i = 0; i < docs.length; i++){
				if (geoDistance(docs[i].geo, data.popupGeo) <= 0.0002){
					socket.emit('edit', {
						result: false,
						msg: "invalid popup geo"						
					});
					return;
				}
			}
			var now = new Date();
			db.get('popups').insert(
				{
					name: data.userGeo,
					geo: data.popupGeo,
					attr: data.attr,
				    text: data.text,
				    date: now
				},
				function (err, docs) {
					socket.emit('edit', {
						result: true,
						msg: "popup created"
					});
				}
			);
			return;
		});
	});

	/// Text

	socket.on('newText', function(data){
		// to be fixed
		if (geoDistance(data.chat.geo, data.userGeo) === 0){
			var now = new Date();
			db.get('conversations').insert({
				name: data.chat.name,
				geo: data.chat.geo,
				turn: 1,
				text: data.msg,
				date: now
			}, function(){
				socket.emit('text', {
					result: true,
					msg: "send message"
				});
			});
		}
		else{
			// without other checks
			var now = new Date();
			db.get('conversations').insert({
				name: data.chat.name,
				geo: data.chat.geo,
				turn: 0,
				text: data.msg,
				date: now
			}, function(){
				socket.emit('text', {
					result: true,
					msg: "send message"
				});
			});
		}
	});
});


router.get('/', function* (next){
  this.body = render("index");
});


server.listen(3000, function(){
  console.log("listen on 3000");
});
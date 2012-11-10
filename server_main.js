var io = require('socket.io').listen(8080);

var mysql = require('mysql');
var TEST_DATABASE = 'nodejs_mysql_test';
var TEST_TABLE = 'test';
var dbConnection = mysql.createClient({
	user: 'root',
	password: 'soylentgnome9',
        database: "wordsort"
    });

io.sockets.on('connection', function (socket) {
    var client = socket;
    // Listen for clients joining rooms:
    socket.on("join room", function(data) {
        // Remember which room this client is in:
        console.log("Joining room " + data.room);
        client.join(data.room);
        var socket = this;
        // send socket the list of all words in the current room
        dbConnection.query( "SELECT * FROM words WHERE room=?", 
			    [data.room],
            function(err, results, fields) {
	    for (var i = 0; i < results.length; i++) {
		socket.emit("word created",
                    { x: results[i].x,
                      y: results[i].y,
                      text: results[i].text,
                      color: results[i].color,
                      fontsize: results[i].fontsize,
		      wrapstyle: results[i].boxwrap?"box":"strip",
                      id: results[i].id });
	    }
	});
    });

    // when client reports a new word: assign it an id,
    // add it to the list, send new word to all clients
    socket.on("new word", function (data) {
        var socket = this;
	console.log("Creating word " + data.text + " in room " + data.room);
	// Write new word to database
	dbConnection.query( "INSERT INTO words SET text=?, x=?, y=?, " +
		      "boxwrap=?, color=?, fontsize=?, room=?",
                      [data.text, data.x, data.y, true, "#FFF", 14, data.room],
		      function(err, info) {
			  if (err) {throw err;}
                          // info.insertId gives us id of last insertion made
			  var newWord = {x: data.x,
                                         y: data.y,
                                         text: data.text,
                                         id: info.insertId,
					 color: "#FFF",
					 fontsize: 14,
					 wrapstyle: "box"};
	
			  socket.broadcast.to(data.room).emit("word created", newWord);
			  // Broadcast does not send it back to the socket it
			  // came from -- but we need to do that, so that the
			  // creator of the word can know what id the server assigned it
			  socket.emit("word created", newWord);
		      });
    });

    // TODO break this into one function for x/y and another function for text?
    socket.on("update word", function (data) {
        this.broadcast.to(data.room).emit("word updated", {id: data.id,
                                             x: data.x,
                                             y: data.y,
                                             text: data.text});
        dbConnection.query("UPDATE words SET x=?, y=?, text=? WHERE id=?",
                     [data.x, data.y, data.text, data.id]);
    });

    socket.on("delete word", function (data) {
	this.broadcast.to(data.room).emit("word deleted", {id: data.id});
	dbConnection.query("DELETE FROM words WHERE id=?", [data.id]);
    });

    socket.on("update color", function(data) {
        this.broadcast.to(data.room).emit("color changed", {id: data.id, color: data.color});
        dbConnection.query("UPDATE words SET color=? WHERE id=?",
                     [data.color, data.id]);
    });

    socket.on("update wrap", function(data) {
        this.broadcast.to(data.room).emit("wrap changed", {id: data.id, style: data.style});
        dbConnection.query("UPDATE words SET boxwrap=? WHERE id=?",
            [(data.style=="box"), data.id]);
    });

    socket.on("update size", function(data) {
        this.broadcast.to(data.room).emit("size changed", {id: data.id, fontsize: data.fontsize});
        dbConnection.query("UPDATE words SET fontsize=? WHERE id=?",
			 [data.fontsize, data.id]);
    });

    socket.on("claim word", function(data) {
	    this.broadcast.to(data.room).emit("word busy", {id: data.id});
	});

    socket.on("release word", function(data) {
	    this.broadcast.to(data.room).emit("word freed", {id: data.id});
	});
});
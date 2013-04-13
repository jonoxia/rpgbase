var allthewords = [];
var chosenword = null;
var movingword = null;
var socket = null;
var roomname = null;

// Get URL parameters - used to read room name from URL
function gup( name )
{
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( window.location.href );
    if( results == null )
	return "";
    else
	return unescape(results[1]);
}

function onLoad()
{
    roomname = gup("room"); // Get room name from URL
    socket = io.connect("http://runjumpbuild.com:8080"); // Connect to node server

    var deskarea= document.getElementById("deskarea"); //$('#deskarea'); //div of the area on the page that the words go in
    deskarea.addEventListener("mousemove", function(event) {
	// If there's a word that is currently being moved, it updates the location of the word to the mouse pointer.
        if (movingword != null)
	{
	    movingword.updatePosition(event.pageX, event.pageY);

	}
    });
    
    $('#deskarea').click( 
			 function(event) //If the deskarea is clicked, it de-highlights any currently chosen words
			 {
			     if (movingword == null && chosenword!=null)
				 {
				     chosenword.setChosen(false);
				     chosenword = null;
				 }
			 }
			  );

    // Tell the server what room I want:
    socket.emit("join room", {room: roomname});
    
    // respond to notifications that the server sends us:
    socket.on("word created", function(data) {
      // create new word in allthewords array.
	var newWord = new Word(data.x, data.y, data.text, data.id);
        newWord.setBGColor(data.color);
	newWord.setFontSize(data.fontsize);
	newWord.updateWrapStyle(data.wrapstyle);
	allthewords.push(newWord);
    });

    socket.on("word updated", function(data) {
	var word = getWordById(data.id);
	if (word) {
	    word.updatePosition(data.x, data.y);
	    word.updateText(data.text);
	}
    });

    socket.on("color changed", function(data) {
        var word = getWordById(data.id);
	if (word) {
	    word.setBGColor(data.color);
	}
    });

    socket.on("size changed", function(data) {
	var word = getWordById(data.id);
	if (word) {
	    word.setFontSize(data.fontsize);
	}
    });

    socket.on("wrap changed", function(data) {
	var word = getWordById(data.id);
	if (word) {
	    word.updateWrapStyle(data.style);
	}
    });

    socket.on("word deleted", function(data) {
	var word = getWordById(data.id);
	if (word) {
	    // TODO can this screw up if it's called 2 times concurrnetly?
	    // need some kind of mutex?
	    word.removeSelf();
	    var i = allthewords.indexOf(word);
	    allthewords.splice(i, 1);
	}
    });

    socket.on("word busy", function(data) {
        var word = getWordById(data.id);
	if (word) {
	    word.setBusy(true);
	}
    });

    socket.on("word freed", function(data) {
        var word = getWordById(data.id);
	if (word) {
	    word.setBusy(false);
	}
    });
}
		
$(document).ready(onLoad);
		
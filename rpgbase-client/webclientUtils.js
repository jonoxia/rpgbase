function AssetLoader() {
    this._things = [];
    this._thingsToLoad = 0;
    this._thingsLoaded = 0;
}
AssetLoader.prototype = {
  add: function(url) {
    // TODO if we've already been asked to load this URL,
    // just return the tag we already have!
    this._thingsToLoad++;
    var tag = new Image();
    var thing = { url: url,
	          tag: tag };
    this._things.push(thing);
    return tag;
  },

  loadThemAll: function(callback, updateFunc) {
    var self = this;
    // Edge case where nothing has been added - call callback immediately:
    if (this._thingsToLoad == 0) {
      callback();
      return;
    }
    for (var t = 0; t < this._thingsToLoad; t++) {
      (function(thing) {
	thing.tag.onload = function() {
	  self._thingsLoaded ++;
	  if (updateFunc) {
	    updateFunc( self._thingsLoaded / self._thingsToLoad );
	  }
	  if (self._thingsLoaded == self._thingsToLoad) {
	    callback();
	  }
	};
	thing.tag.src = thing.url;
      })(this._things[t]);
    }
  }
};

function rollDice(number, type) {
  var total = 0;
  for (var i = 0; i < number; i++) {
    total += Math.floor(Math.random() * type + 1);
  }
  return total;
}

function AudioPlayer() {
  this._preloads = {};
  this._fileType = null;

  // returns a boolean
  var audioTagSupport = !!(document.createElement('audio').canPlayType);

  // Need to check the canPlayType first or an exception
  // will be thrown for those browsers that don't support it      

  var myAudio = document.createElement('audio'); 
  if (!!myAudio.canPlayType) {
    // Currently canPlayType(type) returns: "", "maybe" or "probably" 
    var canPlayMp3 =  "" != myAudio.canPlayType('audio/mpeg');
    var canPlayOgg =  "" != myAudio.canPlayType('audio/ogg; codecs="vorbis"');

    if (canPlayMp3) {
      this._fileType = "mp3";
    } else if (canPlayOgg) {
      this._fileType = "ogg";
    }
  }
}
AudioPlayer.prototype = {
  correctFileExt: function(filename) {
    
    return filename.split(".")[0] + "." + this._fileType;
  },

  preload: function(filename) {
    filename = this.correctFileExt(filename);
    if (!this._preloads[filename]) {
      this._preloads[filename] = new Audio();
      this._preloads[filename].src = filename;
    }
    return filename;
  },

  play: function(filename) {
    filename = this.correctFileExt(filename);
    if (!this._preloads[filename]) {
      this.preload(filename);
    }
    this._preloads[filename].play();
    console.log("Playing: " + filename);
  }
};

// TODO if we can figure out how to get notified that an audio file
// finished loading, we could combine this with asset loader.

// TODO looping the audio
// TODO make AssetLoader able to load other kinds of things as well:
// music and CSV files.
// give it a deleteTags() method.
// 
function AssetLoader() {
    this._things = [];
    this._thingsToLoad = 0;
    this._thingsLoaded = 0;
}
AssetLoader.prototype = {
  add: function(url) {
    // if we've already been asked to load this URL,
    // just return the tag we already have:
    for (var i = 0; i < this._things.length; i++) {
      if (this._things[i].url === url) {
        return this._things[i].tag;
      }
    }

    // if no match found, create new record:
    this._thingsToLoad++;
    var tag = new Image();
    var thing = { url: url,
	          tag: tag };
    this._things.push(thing);
    return tag;
  },

  addAudio: function(url) {
    // TODO
  },

  addMapDataFile: function(url) {
    // TODO
  },

  parseMapDataFile: function(url) {
    // TODO
  },

  listUnloaded: function() {
    var unloaded = [];
    for (var i = 0; i < this._things.length; i++) {
      if (!this._things[i].loaded) {
        unloaded.push(this._things[i].url);
      }
      console.log("waiting for: " + unloaded.join(", "));
    }
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
          thing.loaded = true;
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
  },

  deleteTags: function() {
    // TODO
    // remove from the page all tags I created
  }
};

function rollDice(number, type) {
  var total = 0;
  for (var i = 0; i < number; i++) {
    total += Math.floor(Math.random() * type + 1);
  }
  debugLog(number + "d" + type + " result = " + total);
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

  this._currentPlayingFile = null;
  this._enabled = true;
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

  play: function(filename, loop) {
    filename = this.correctFileExt(filename);
    this._currentPlayingFile = filename;
    if (!this._enabled) {
      return;
    }
    if (!this._preloads[filename]) {
      this.preload(filename);
    }
    if (loop) {
      this._loopAudio(this._preloads[filename]);
    } else {
      // when playing non-loop audio, reset it to 0 before starting:
      this._preloads[filename].currentTime = 0;
    }
    this._preloads[filename].play();
  },

  getCurrentTrack: function() {
    return this._currentPlayingFile;
  },

  stop: function() {
    if (this._currentPlayingFile) {
      if (this._preloads[this._currentPlayingFile]) {
        this._preloads[this._currentPlayingFile].pause();
      }
    }
  },

  _loopAudio: function(audioObj) {
    if (typeof audioObj.loop == 'boolean') {
      audioObj.loop = true;
    } else {
      audioObj.addEventListener('ended', function() {
        this.currentTime = 0;
        this.play();
      }, false);
    }
    // TODO: Support an intro segment that plays once followed by
    // the looping segment that plays indefinitely.
  },

  changeTrack: function(filename, loop) {
    this.stop();
    if (this._preloads[filename]) {
      this._preloads[filename].currentTime = 0;
    }
    this.play(filename, loop);
  },

  enable: function() {
    this._enabled = true;
    if (this._currentPlayingFile) {
      this.play(this._currentPlayingFile, true); // TODO WRONG
    }
  },
  
  disable: function() {
    this._enabled = false;
    this.stop();
  },

  playSfx: function(filename) {
    if (!this._preloads[filename]) {
      this.preload(filename);
    }
    if (this._currentPlayingSfx) {
      this._currentPlayingSfx.pause();
      this._currentPlayingSfx.currentTime = 0;
    }
    this._preloads[filename].play();
    this._currentPlayingSfx = this._preloads[filename];
  }
};

// TODO if we can figure out how to get notified that an audio file
// finished loading, we could combine this with asset loader.

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

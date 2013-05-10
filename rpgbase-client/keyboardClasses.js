//CONTROLS
const DOWN_ARROW = 40;
const UP_ARROW = 38;
const LEFT_ARROW = 37;
const RIGHT_ARROW = 39;
const CONFIRM_BUTTON = 67;
const CANCEL_BUTTON = 88;

function NoRepeatKeyHandler(keyCallback) {
  this.keysThatAreDown = [];
  var self = this;

  this.onKeydown = function(evt) {
    if ([LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW, CONFIRM_BUTTON, CANCEL_BUTTON].indexOf(evt.which) > -1) {
      evt.preventDefault();
      if (self.keysThatAreDown.indexOf(evt.which) == -1) {
        self.keysThatAreDown.push(evt.which);
        keyCallback(evt.which);
      }
    }
  };

  this.onKeyup = function(evt) {
    var index = self.keysThatAreDown.indexOf(evt.which);
    if (index > -1) {
      evt.preventDefault();
      self.keysThatAreDown.splice(index, 1);
    }
  };
}
NoRepeatKeyHandler.prototype = {
  startListening: function() {
    this.keysThatAreDown = [];
    $(document).bind("keydown", this.onKeydown);
    $(document).bind("keyup", this.onKeyup);
  },
  stopListening: function() {
    $(document).unbind("keydown", this.onKeydown);
    $(document).unbind("keyup", this.onKeyup);
  }
};

function DPadStyleKeyHandler(repeatRate, keyCallback) {
  this.repeatRate = repeatRate;
  this.keyCallback = keyCallback;
  this.queued = null;
  this.processing = null;
  this.busyWaiting = false;
  this.timer = null;
  this.keysThatAreDown = [];

  var self = this;

  this.loop = function() {
    // If a key's being held down, queue it up
    if (self.keysThatAreDown.length > 0) {
      self.queueNextKey();
    }

    // if we're ready to start processing a key:
    if (!self.busyWaiting && self.queued != null) {
      // pull the key out of the queue
      var key = self.queued;
      self.queued = null;

      // process the key:
      self.keyCallback(key);
      // the keyCallback will call waitForAnimation if it
      // wants us to wait. Check if busyWaiting has been set...
      if (self.busyWaiting) {
        // that means we should consider the key to be in
        // the state of being processed
        self.processing = key;
      }
    }
    
  };

  this.onKeyup = function(evt) {
    var index = self.keysThatAreDown.indexOf(evt.which);
    if (index > -1) {
      evt.preventDefault();
      self.keysThatAreDown.splice(index, 1);
    }
  };

  this.onKeydown = function(evt) {
    if ([LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW, CONFIRM_BUTTON, CANCEL_BUTTON].indexOf(evt.which) > -1) {
      evt.preventDefault();
      if (self.keysThatAreDown.indexOf(evt.which) == -1) {
        self.keysThatAreDown.push(evt.which);
        self.queueNextKey();
      }
    }
  };
}
DPadStyleKeyHandler.prototype = {
  waitForAnimation: function(animation) {
    this.busyWaiting = true;
    var self = this;
    animation.onFinish(function() {
      self.busyWaiting = false;
      self.processing = null;
    });
  },

  queueNextKey: function() {
    // If queue is empty, then queue up the key most recently
    // held down, unless we're already processing that key.
    if (this.queued == null) {
      var nextKey = this.keysThatAreDown[this.keysThatAreDown.length-1];
      if (nextKey != this.processing) {
        this.queued = nextKey;
      }
    }
  },

  startListening: function() {
    this.timer = window.setInterval(this.loop, this.repeatRate);
    $(document).bind("keydown", this.onKeydown);
    $(document).bind("keyup", this.onKeyup);

    this.queued = null;
    this.processing = null;
    this.keysThatAreDown = [];
  },

  stopListening: function() {
    window.clearInterval(this.timer);
    this.timer = null;
    $(document).unbind("keydown", this.onKeydown);
    $(document).unbind("keyup", this.onKeyup);
  }
};

function Animator(frameLength) {
  // A loop that can run any number of animations at the same time
  // just create an animation and pass it to runAnimation.
  this._frameLength = frameLength;
  this._timer = null;
  this._currentAnimations = [];

  var self = this;
  this._loop = function() {
    var stillGoingAnims = [];
    for (var i = 0; i < self._currentAnimations.length; i++) {
      var anim = self._currentAnimations[i];
      anim.doOneFrame();

      if (!anim.done) {
        stillGoingAnims.push(anim);
      }
    }

    // remove finished animations:
    self._currentAnimations = stillGoingAnims;
  }
}
Animator.prototype = {
  start: function() {
    this._timer = window.setInterval(this._loop, this._frameLength);
  },

  stop: function() {
    if (this._timer) {
      window.clearInterval(this._timer);
    }
    this._timer = null;
  },
  
  runAnimation: function(animation) {
    animation.currFrame = 0;
    this._currentAnimations.push(animation);
  }
};

function Animation(numFrames, frameCallback, finishCallback) {
  this.numFrames = numFrames;
  this.currFrame = 0;
  this.frameCallback = frameCallback;
  this.finishCallbacks = [];
  if (finishCallback) {
    this.finishCallbacks.push(finishCallback);
  }
  this.done = false;
};
Animation.prototype = {
  doOneFrame: function() {
    this.currFrame ++;
    this.frameCallback(this.currFrame);
    
    if (this.currFrame == this.numFrames) {
      this.done = true;
      for (var i = 0; i < this.finishCallbacks.length; i++) {
        this.finishCallbacks[i]();
      }
    }
  },

  onFinish: function(finishCallback) {
    this.finishCallbacks.push(finishCallback);
  }
};



function makeInputDispatcher(repeatRate, mapScreenKeyCallback) {
  /* Handles switching between map screen input mode and any
   * number of menu input modes */
  var openMenu = null;

  var menuModes = {};

  var menuInputHandler = new NoRepeatKeyHandler(
    function(key) {
      if (openMenu) {
        openMenu.handleKey(key);
      }
    });

  var mapInputHandler = new DPadStyleKeyHandler(repeatRate,
                                                mapScreenKeyCallback);
  var dispatcher = {
    addMenuMode: function(name, menuMode) {
      // assumes menuMode implements standard menu mode interface
      // including onClose(callback) and handleKey(key).
      menuModes[name] = menuMode;
      menuMode.onClose(function() {
        dispatcher.mapMode();
      });
    },

    menuMode: function(name) {
      openMenu = menuModes[name];
      mapInputHandler.stopListening();
      menuInputHandler.startListening();
      return openMenu;
    },
    
    mapMode: function() {
      openMenu = null;
      menuInputHandler.stopListening();
      mapInputHandler.startListening();
    },

    waitForAnimation: function(animation) {
      // TODO this is a really weird wart on the interface
      mapInputHandler.waitForAnimation(animation);
    }
  };

  return dispatcher;
}

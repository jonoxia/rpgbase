//CONTROLS
const DOWN_ARROW = 40;
const UP_ARROW = 38;
const LEFT_ARROW = 37;
const RIGHT_ARROW = 39;
const CONFIRM_BUTTON = 67;
const CANCEL_BUTTON = 88;

function DPadStyleKeyHandler(repeatRate, keyCallback) {
  this.repeatRate = repeatRate;

  this.keyCallback = keyCallback;
  this.frameCallback = null;
  this.animationFinishCallback = null;

  this.animationRunning = false;
  this.currFrame = 0;
  this.numFrames = 0;
  this.queued = null;
  this.processing = null;

  this.timer = null;

  this.keysThatAreDown = [];
}
DPadStyleKeyHandler.prototype = {
  startAnimation: function(animationData) {
    this.numFrames = animationData.numFrames;
    this.frameCallback = animationData.frameCallback;
    this.finishCallback = animationData.finishCallback;
    this.animationRunning = true;
    this.currFrame = 0;
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
    var self = this;

    self.timer = window.setInterval(function() {
      // If a key's being held down, queue it up
      if (self.keysThatAreDown.length > 0) {
        self.queueNextKey();
      }

      // if we're ready to start an animation:
      if (!self.animationRunning && self.queued != null) {
        // pull the key out of the queue
        var key = self.queued;
        self.queued = null;

        // process the key:
        self.keyCallback(key);
        // the keyCallback will call startAnimation if it wants
        // any animation. Check if an animation has started...
        if (self.animationRunning) {
          // that means we should consider the key to be in
          // the state of being processed
          self.processing = key;
        }
      }

      if (self.animationRunning) {
        // if an animation is going on, run one frame of it:
        self.currFrame ++;
        if (self.frameCallback) {
          self.frameCallback(self.currFrame);
        }

        // If that was the last frame, finish up the animation:
        if (self.currFrame == self.numFrames) {
          if (self.finishCallback) {
            self.finishCallback();
          }
          // clear the state
          self.animationRunning = false;
          self.processing = null;
          self.currFrame = 0;
        }
      }
    }, self.repeatRate);

    $(document).bind("keydown", function(evt) {
      if ([LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW, CONFIRM_BUTTON, CANCEL_BUTTON].indexOf(evt.which) > -1) {
        evt.preventDefault();
        if (self.keysThatAreDown.indexOf(evt.which) == -1) {
          self.keysThatAreDown.push(evt.which);
          self.queueNextKey();
        }
      }
    });

    $(document).bind("keyup", function(evt) {
      var index = self.keysThatAreDown.indexOf(evt.which);
      if (index > -1) {
        evt.preventDefault();
        self.keysThatAreDown.splice(index, 1);
      }
    });
  }
};
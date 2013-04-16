
function addListener(a, b, c, d) {
  if (a.addEventListener) {
    a.addEventListener(b, c, d);
    return true;
  } else if (a.attachEvent) {
    var e = a.attachEvent("on" + b, c);
    return e;
  } else {
    alert("Handler could not be attached");
  }
}

function bind(a,b,c,d) {
  return window.addListener(a, b, function() {
			      d.apply(c, arguments);
			    });
}

function handleKeystroke(evt) {
  // Grab the cross browser event
  if (!evt) {
    evt = window.event;
  }
  // Character code of key pressed
  var asc = !evt.keyCode ? (!evt.which ? evt.charCode : evt.which) : evt.keyCode;
  // ASCII character of above code
  var chr = String.fromCharCode(asc).toLowerCase();
  for (var i in this)
  {
    if (asc == i)
    {
      this[i](evt);
      break;
    }
  }
}

function cancelEvent(evt)
{
  evt.cancelBubble = true;
  evt.returnValue = false;
  if (evt.preventDefault)
    evt.preventDefault();
  if (evt.stopPropagation)
    evt.stopPropagation();
  return false;
}
//
// KEY COMMANDS
var keyMap = new Array();
/*var PAGE_DOWN  = 34;
var PAGE_UP    = 33;
var ARROW_DOWN = 40;
var ARROW_UP   = 38;
var ARROW_RIGHT = 39;
var ARROW_LEFT = 37;*/


//CONTROLS
const DOWN_ARROW = 40;
const UP_ARROW = 38;
const LEFT_ARROW = 37;
const RIGHT_ARROW = 39;
const CONFIRM_BUTTON = 67;
const CANCEL_BUTTON = 88;


function SmoothWalker(numFrames, timePerFrame, frameCallback) {
  this.numFrames = numFrames;
  this.timePerFrame = timePerFrame;
  this.frameCallback = frameCallback;

  this.busyDirection = null;
  this.busy = false;
  this.frame = 0;
  this.queued = false;

  this.timer = null;
}
SmoothWalker.prototype = {
  startListening: function() {
    var self = this;

    self.timer = window.setInterval(function() {
      if (self.queued && !self.busy) {
        self.busy = true;
        self.busyDirection = self.queued;
        self.queued = false;
      }
      
     if (self.busy) {
       self.frameCallback(self.frame, self.busyDirection);       
       self.frame ++;
       if (self.frame == self.numFrames) {
           self.busy = false;
           self.frame = 0;
       }
     }
    }, self.timePerFrame);

    $(document).bind("keydown", function(evt) {
      if ((evt.which == LEFT_ARROW) || (evt.which == RIGHT_ARROW) || (evt.which == UP_ARROW) || (evt.which == DOWN_ARROW) || (evt.which == CONFIRM_BUTTON) || (evt.which == CANCEL_BUTTON)) {
        evt.preventDefault();
        if (evt.which != self.queued) {
          self.queued = evt.which;
        }
      } else {
        self.queued=false;
      }
    });
  }
};
//CONTROLS
const DOWN_ARROW = 40;
const UP_ARROW = 38;
const LEFT_ARROW = 37;
const RIGHT_ARROW = 39;
const CONFIRM_BUTTON = 67;
const CANCEL_BUTTON = 88;

function SmoothKeyListener(repeatRate, callback) {
  this.repeatRate = repeatRate;
  this.callback = callback;

  this.busyDirection = null;
  this.busy = false;
  this.frame = 0;
  this.queued = false;

  this.timer = null;
}
SmoothKeyListener.prototype = {
  startListening: function() {
    var self = this;

    self.timer = window.setInterval(function() {
      if (self.queued && !self.busy) {
        self.busy = true;
        self.busyDirection = self.queued;
        self.queued = false;
      }
      
     if (self.busy) {
       self.callback(self.busyDirection);
       self.busy = false;
     }
    }, self.repeatRate);

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
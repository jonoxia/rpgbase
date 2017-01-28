
function GameEventService() {
  this._subscribers = {}; // keys will be event names, values will be arrays of subscribers
  this._classSubscribers = {}; // same, but class prototype references not instances
  this._eventQueue = [];
}
GameEventService.prototype = {
  subscribe: function(eventName, subscriber) {
    // subscriber must be an object implementing the GameEventSubscriber interface
    if (!this._subscribers[eventName]) {
      this._subscribers[eventName] = [];
    }
    if (this._subscribers[eventName].indexOf(subscriber) === -1) {
      this._subscribers[eventName].push(subscriber);
    }
  },

  unsubscribe: function(eventName, subscriber) {
    if (!this._subscribers[eventName]) {
      return;
    }
    var index = this._subscribers[eventName].indexOf(subscriber);
    if (index === -1) {
      return;
    }
    this._subscribers[eventName].splice(index, 1);
  },

  queueGameEvent: function(eventName, eventData) {
    // This method doesn't process the event, it just queues it for processing.
    // This puts the new event on the end, so it will be processed last.
    this._eventQueue.push({name: eventName, data: eventData});
  },

  stackGameEvent: function(eventName, eventData) {
    // This puts the new event on the beginning, so it will be processed first.
    this._eventQueue.unshift({name: eventName, data: eventData});
  },

  fireGameEvent: function(eventName, eventData) {
    // Call this to just proc the event immediately with no queueing
    var receivers = this._subscribers[eventName];
    if (!receivers) {
      receivers = [];
    }

    // also notify the source and target, if any, so that class-level handlers can be
    // triggered for them:
    if (eventData.source) { // not all events have sources
      if (receivers.indexOf( eventData.source ) === -1) { // don't notify twice
        receivers.push(eventData.source);
      }
    }
    if (eventData.target) { // not all events have targets
      if (receivers.indexOf( eventData.target ) === -1) { // don't notify twice
        if (eventData.target.takeEvent) {
          // this check necessitated by the times where target is an array of targets
          // TODO instead of skipping it, notify every object in the array?
          // OR put that array in a different field not named "target"
          receivers.push(eventData.target);
        } else {
          console.log("WARN: Target with no takeEvent function is " + eventData.target);
        }
      }
    }

    $.each(receivers, function(i, receiver) {
      receiver.takeEvent(eventName, eventData);
    });
  },

  processGameEvent: function() {
    if (this.queueIsEmpty()) {
      return;
    }
    var event = this._eventQueue.shift();
    this.fireGameEvent(event.name, event.data);
  },

  queueIsEmpty: function() {
    return (this._eventQueue.length == 0);
  },

  clearQueue: function() {
    this._eventQueue = [];
  },

  cancelEvent: function(eventName) {
    // only does anything if the next event matches event name
    if (this.queueIsEmpty()) {
      return;
    }
    if (this._eventQueue[0].name === eventName) {
      this._eventQueue.shift(); // discard it
    }
  },

  procAllEvents: function() {
    while (!this.queueIsEmpty()) {
      this.processGameEvent();
    }
  },

  subscribeClass: function(constructor, eventName, callback) {
    var prototype = constructor.prototype;
    // is this remotely legal? am i gonna get in trouble for this?

    if (!prototype._classEventHandlers[eventName]) {
      prototype._classEventHandlers[eventName] = [];
    }

    prototype._classEventHandlers[eventName].push(callback);

    // maybe instead of modifying the prototype, we could store this callback in
    // some kind of data structure inside the event service...?


    /*if (!this._classSubscribers[eventName]) {
      this._classSubscribers[eventName] = [];
    }
    this._classSubscribers[eventName].push(prototype);*/
  },

  unsubscribeClass: function(constructor, eventName) {
    var prototype = constructor.prototype;
    if (prototype._classEventHandlers[eventName]) {
      prototype._classEventHandlers[eventName] = [];
    }
  }
};



function GameEventSubscriberMixin(prototype) {

  //prototype._instances = [];
  prototype._classEventHandlers = {};

  prototype.gameEventSubscriberInit = function() {
    this._eventHandlers = {};
    // this.__proto__._instances.push(this); // ummmmmm.... ???
    // will this stop me from ever getting garbage collected??? (YES IT WILL)
  };

  prototype.takeEvent = function(eventName, eventData) {
    var self = this;
    var propogate = true;

    if (this._eventHandlers[eventName]) {
      $.each(this._eventHandlers[eventName], function(i, handler) {
        // call the handler in such a way that "this" will refer to
        // the subscriber:

        var result = handler.call(self, eventData);
        if (!result) {
          // in case of multiple handlers, a single false stops propogation
          propogate = false;
        }
      });
    } 
    // Call generic class-level event handlers (if any) if there is no instance-level
    // handler OR if all the instance-level handlers return true:
    if (propogate) {
      if (this.__proto__._classEventHandlers[eventName]) {
        $.each(this.__proto__._classEventHandlers[eventName], function(i, handler) {
          // call the handler in such a way that "this" will refer to
          // the subscriber:
          handler.call(self, eventData);
        });
      }
    }
   
    // TODO it may be the case that the only times we want to trigger generic
    // event handlers is when i am the specific target of something
    // (i.e. all the handlers where i listen to somebody else's events will be
    // instance-specific)
  };

  prototype.onEvent = function(eventName, callback) {
    if (!this._eventHandlers[eventName]) {
      this._eventHandlers[eventName] = [];
    }
    this._eventHandlers[eventName].push(callback);
  };

  prototype.subscribeEvent = function(service, eventName, callback) {
    // shortcut for subscribe + onEvent
    service.subscribe(eventName, this);
    this.onEvent(eventName, callback);
  };

  // todo do we need a way to unregister a handler?
}

// i feel like the last piece this needs is to have multiple event handlers for the same game event, which can either all happen, or a more specific one can override a more generic one...
// for example, what if i want...
// a generic handler for all battlers to respond to "damage" event
// an additional handler for just playerCharacters responding to "damage" event
// an additional handler for a player character with a specific ability responding to "damage" event.


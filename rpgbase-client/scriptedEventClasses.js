// When playing a scripted event, use dialoglog, but set the
// freely exit flag to false so you have a non-cancelable dialog.

// dialoglog needs to hold the input focus until scripted event
// is done, so that you can't move your character while the event
// is happening.
function ScriptedEvent() {
  this._steps = [];
  this._player = null;
  this._dialoglog = null;
  this._mapScreen = null;
}
ScriptedEvent.prototype = {
  npcEnter: function(npc, x, y) {
    var self = this;
    this._addStep(function() {
      // do stuff here
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  npcSpeak: function(npc, text) {
    var self = this;
    this._addStep(function() {
      // do stuff here

      // TODO call nextStep when player closes the dialog
      // window.
      self.nextStep();
    });
    return this; // for daisy-chaining
  },
  
  npcMove: function(npc, directionList) {
    var self = this;
    this._addStep(function() {
      // do stuff here
      // TODO call nextStep when npc move animation is done
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  npcMoveTo: function(npc, x, y) {
    var self = this;
    this._addStep(function() {
      // do stuff here
      // TODO call nextStep when npc move animation is done
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  npcExit: function(npc) {
    var self = this;
    this._addStep(function() {
      // do stuff here
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  pcSpeak: function(pc, text) {
    var self = this;
    this._addStep(function() {
      // TODO call nextStep when player closes the dialog
      // window. Actually not sure how this will be different from
      // npcSpeak.
      self.nextStep();
    });
    return this; // for daisy-chaining
  },
  
  pcMove: function(pc, directionList) {
    var self = this;
    this._addStep(function() {
      // do stuff here
      // TODO call nextStep when pc move animation finishes
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  pcMoveTo: function(pc, x, y) {
    var self = this;
    this._addStep(function() {
      // do stuff here
      // TODO call nextStep when pc move animation finishes
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  switchMapDomain: function(mapDomain) {
    var self = this;
    this._addStep(function() {
      // do stuff here
      // self._mapScreen
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  scrollMapTo: function(x, y) {
    var self = this;
    this._addStep(function() {
      // do stuff here
      // self._mapScreen
      // TODO call nextStep when scroll animation done
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  _addStep: function(stepFunction) {
    this._steps.push(stepFunction);
  },

  nextStep: function() {
    this.currStep += 1;
    if (this.currStep < this._steps.length) {
      this._steps[currStep].call(this);
    } else {
      this._finish();
    }
  },

  play: function(party, mapScreen, dialoglog) {
    var self = this;
    self._party = party;
    self._mapScreen = mapScreen;
    self._dialoglog = dialoglog;

    this.currStep = 0;
    this._steps[currStep].call(this);
    // TODO test!!!
  },

  _finish: function() {
    // TODO put party back in order, center map screen on them,
    // and resume player control.
  }
};

/* Example of use would be like:
 * var coolStuff = new ScriptedEvent();
 * coolStuff.setMapDomain(domain);
 * coolStuff.movePcTo(pc, x, y);
 * coolStuff.pcSpeak(pc, "blah blah blah");
 *
 * 
 * and then later:
 * coolStuff.play();
 */
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
      self._mapScreen._currentDomain.addNPC(npc, x, y);
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  // could make a new menu system just for holding the keyboard
  // focus during scripted events...
  npcSpeak: function(npc, text) {
    // if this event was triggered by talking to an NPC, then
    // dispatcher has already set menu mode to dialog.... and if
    // you've dismissed the first npcSpeak, then the dispatcher
    // has been set back to map mode.  Hmm, this is a problem.
    var self = this;
    this._addStep(function() {
      var dlg = self._dialoglog;
      // This code is duplicated from Dialoglog.scrollText()
      dlg.clearMsg();
      var textBox = new ScrollingTextBox(text, dlg);
      dlg.pushMenu(textBox);
      textBox.setPos(dlg._positioning.msgLeft,
                     dlg._positioning.msgTop);
      textBox.onClose(function() {
        self.nextStep();
      });
    });
    return this; // for daisy-chaining
  },
  
  npcMove: function(npc, directionList) {
    var self = this;
    this._addStep(function() {
      npc.walkPath(directionList, function() {
        self.nextStep();
      });
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
      self._mapScreen._currentDomain.removeNPC(npc);
      // wow that's encapsulation breaky
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

  switchMapDomain: function(mapDomain, x, y) {
    var self = this;
    this._addStep(function() {
      self._mapScreen.setNewDomain(mapDomain);
      self._mapScreen.scrollToShow(x, y);
      // TODO animate map screen...
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
      this._steps[this.currStep].call(this);
    } else {
      this._finish();
    }
  },

  play: function(player, mapScreen, dialoglog) {
    var self = this;
    self._player = player;
    self._mapScreen = mapScreen;
    self._dialoglog = dialoglog;
    self._dialoglog._freelyExit = false; // can't leave
    // the scripted event until it's done.

    self._dialoglog._rootMenu = new InvisibleTextBox();
    self._dialoglog.open(self._player);
    // TODO maybe it's easier not to use dialoglog at all, but create
    // a new MenuSystem that does exactly what we want

    this.currStep = 0;
    this._steps[this.currStep].call(this);
  },

  _finish: function() {
    console.log("Scripted event finished.");
    this._dialoglog._freelyExit = true;
    this._dialoglog._rootMenu = null;
    this._dialoglog.emptyMenuStack();
    this._dialoglog.close();
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
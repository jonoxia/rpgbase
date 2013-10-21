// When playing a scripted event, use dialoglog, but set the
// freely exit flag to false so you have a non-cancelable dialog.


function PlotManager() {
  this._flags = [];
  this._miscStorage = {};
}
PlotManager.prototype = {
  serializableClassName: "PlotManager",
  serializableFields: ["_flags"],

  onSerialize: function(jsonobj) {
    for (var key in this._miscStorage) {
      var val = this._miscStorage[key];
      if (!jsonobj["miscStorage"]) {
        jsonobj["miscStorage"] = {};
      }
      var className = val.serializableClassName;
      var subObjectJson = val.serialize();
      jsonobj["miscStorage"][key] ={serializedClass: className,
              json: subObjectJson};
    }
  },

  onDeserialize: function(jsonobj) {
    // TODO move this to serializer class as the
    // default handler for a serializable dictionary?
    if (jsonobj["miscStorage"]) {
      for (var key in jsonobj["miscStorage"]) {
        var value = jsonobj["miscStorage"][key];
        if (value.serializedClass) {
          var cons = Serializer.getConstructor(
            value.serializedClass);
          var newSubObj = new cons();
          newSubObj.restore(value.json);
          this._miscStorage[key] = newSubObj;
        } else {
            console.log("No serialized class provided.");
        }
      }
    }
  },

  setFlag: function(flagName) {
    if (this._flags.indexOf(flagName) == -1) {
      this._flags.push(flagName);
    }
  },
  
  getFlag: function(flagName) {
    return (this._flags.indexOf(flagName) > -1);
  },

  makeEvent: function(flagName) {
    return new ScriptedEvent(this, flagName);
  },

  setData: function(key, value) {
    this._miscStorage[key] = value;
  },

  getData: function(key) {
    return this._miscStorage[key];
  }
};
SerializableMixin(PlotManager);


// dialoglog needs to hold the input focus until scripted event
// is done, so that you can't move your character while the event
// is happening.
function ScriptedEvent(plotMgr, plotFlagName) {
  this._steps = [];
  this._player = null;
  this._dialoglog = null;
  this._mapScreen = null;
  this._plotFlagName = plotFlagName;
  this._plotMgr = plotMgr;
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

  scrollText: function(text, callback) {
      var dlg = this._dialoglog;
      // This code is duplicated from Dialoglog.scrollText()
      dlg.clearMsg();
      var textBox = new ScrollingTextBox(text, dlg);
      dlg.pushMenu(textBox);
      textBox.setPos(dlg._positioning.msgLeft,
                     dlg._positioning.msgTop);
      textBox.onClose(function() {
        callback();
      });
  },

  // could make a new menu system just for holding the keyboard
  // focus during scripted events...
  npcSpeak: function(npc, text) {
    var self = this;
    this._addStep(function() {
            self.scrollText(text, function() {
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

  getItem: function(itemType) {
    var self = this;
    this._addStep(function() {
      self._player.findRoomForAnItem(
        self._dialoglog,
        itemType._name,
        function(receiver) {
          receiver.gainItem(itemType);
          self.scrollText(receiver.name + " OBTAINED " + itemType._name + "!", function() {
            self.nextStep();
          });
        });
      });
      // TODO what do we do with the progression of the plot
      // point if player doesn't accept the item?
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
      if (typeof x == 'undefined')  {
          // if x, y not specified, scroll to player location
          var mainChar = self._player.aliveParty[0];
          var pos = mainChar.getPos();
          x = pos.x; y = pos.y;
      }
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

    // Set a flag to record that this event has completed:
    this._plotMgr.setFlag(this._plotFlagName);

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
// When playing a scripted event, use dialoglog, but set the
// freely exit flag to false so you have a non-cancelable dialog.


function PlotManager(htmlElem, cursorImg, width, height) {
  this._flags = [];
  this._miscStorage = {};
  this.dlog = new PlotDialogSystem(htmlElem, cursorImg, width, height);
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

function PlotDialogSystem(htmlElem, cursorImg, width, height) {
  this._init(htmlElem, cursorImg, width, height);
  this._rootMenu = new BackgroundImgBox(width, height);
  this._freelyExit = false;
}
MenuSystemMixin(PlotDialogSystem.prototype);
PlotDialogSystem.prototype.handleKey = function(keyCode) {
    if (keyCode == CANCEL_BUTTON) {
        // Ignore cancel button - plot points cannot be canceled.
        return;
    }
    if (this.menuStack.length > 0) {
        var topMenu = this.menuStack[ this.menuStack.length - 1];
        topMenu.onKey(keyCode);
    }

};


// dialoglog needs to hold the input focus until scripted event
// is done, so that you can't move your character while the event
// is happening.
function ScriptedEvent(plotMgr, plotFlagName) {
  this._steps = [];
  this._player = null;
  this._mapScreen = null;
  this._plotFlagName = plotFlagName;
  this._plotMgr = plotMgr;
  this._dialoglog = plotMgr.dlog;
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
        dlg.popMenu();
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
        self.scrollText(text, function() {
            self.nextStep();
        });
    });
    return this;
  },

  partyMove: function(directionList) {
    // moves the whole party according to directionList
    // TODO much code duplicated from NPC.walkPath
    var self = this;


    function simplifiedMove(player, mapScreen, dx, dy) {
        var aliveParty = player.aliveParty;
        var mainChar = aliveParty[0];
        var numAnimFrames = mainChar.walkAnimationFrames;
        // set facing of main character even if we can't move:
        mainChar.setFacing(dx, dy);
        var scrolliness = mapScreen.calcAutoScroll( mainChar._x, 
				                         mainChar._y,
				                         dx,
				                         dy);
        var animation = null;
        if (scrolliness.x != 0 || scrolliness.y != 0) {
            // if screen will scroll, start with the scrolling animation
            animation = mapScreen.getScrollAnimation(scrolliness,
                                                     numAnimFrames);
        } else {
            // otherwise start with an empty animation.
            animation = new Animation(numAnimFrames);
        }
        var partyMoveDirections = [{x: dx, y: dy}];
        for (var i = 0; i < aliveParty.length - 1; i++) {
          partyMoveDirections.push(aliveParty[i].getLastMoved());
        }

        for (var i = 0; i < aliveParty.length; i++) {
          var member = aliveParty[i];
          var walkDir = partyMoveDirections[i];
          animation.composite(member.makeStepAnimation
                              (mapScreen, numAnimFrames,
                               walkDir.x, walkDir.y));
        }
        
        return animation;
    }

    function doAddStep(deltaX, deltaY) {
      self._addStep(function() {
          /* Make sure not to make one call to simplifiedMove until
           * the previous call has done animating.  Otherwise
           * lastMoved won't be correct and nobody will follow the
           * lead character. */
          var stepAnim = simplifiedMove(self._player,
                                        self._mapScreen, deltaX, deltaY);
          stepAnim.onFinish(function() {
              self.nextStep();
          });
          self._mapScreen.animate(stepAnim);
      });
    }

    var deltaX, deltaY;
    for (var i = 0; i < directionList.length; i++) {
        switch(directionList[i]) {
        case "n":
            deltaX = 0, deltaY = -1; break;
        case "s":
            deltaX = 0, deltaY = 1; break;
        case "e":
            deltaX = 1, deltaY = 0; break;
        case "w":
            deltaX = -1, deltaY = 0; break;
        }

        doAddStep(deltaX, deltaY);
    }
     
    return this;
  },

  partyEnter: function(mapDomain, x, y) {
    // Puts party onto map at location x, y.
    // Different from switchMapDomain because this one moves
    // the party, that one only moves the "camera".
    var self = this;
    this._addStep(function() {
      self._mapScreen.setNewDomain(mapDomain);
      self._player.enterMapScreen(self._mapScreen, x, y);
      self.nextStep();
    });
    return this;
  },

  pcEnter: function(pc, mapDomain, x, y) {
    var self = this;
    this._addStep(function() {
      self._mapScreen.setNewDomain(mapDomain);
      pc.setPos(x, y);
      pc.setFacing(0, 1);
      self.nextStep();
    });
    return this;
  },

  pcMove: function(pc, directionList) {
      var self = this;
    function doAddStep(deltaX, deltaY) {
      self._addStep(function() {
          var numAnimFrames = pc.walkAnimationFrames;
          var stepAnim = pc.makeStepAnimation(self._mapScreen,
                                              numAnimFrames,
                                              deltaX, deltaY);
          stepAnim.onFinish(function() {
              self.nextStep();
          });
          self._mapScreen.animate(stepAnim);
      });
    }

    var deltaX, deltaY;
    for (var i = 0; i < directionList.length; i++) {
        switch(directionList[i]) {
        case "n":
            deltaX = 0, deltaY = -1; break;
        case "s":
            deltaX = 0, deltaY = 1; break;
        case "e":
            deltaX = 1, deltaY = 0; break;
        case "w":
            deltaX = -1, deltaY = 0; break;
        }

        doAddStep(deltaX, deltaY);
    }
     
    return this;
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
      // TODO animate scrolling of map screen...
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  scrollMapTo: function(x, y) {
    var self = this;
    this._addStep(function() {
      self._mapScreen.scrollToShow(x, y);
      // TODO animate scrolling of map screen...
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  showPicture: function(img, width, height) {
    var self = this;
    this._addStep(function() {
      self._dialoglog._rootMenu.blacken(true);
      window.setTimeout(function() {
        self._dialoglog._rootMenu.setImg(img, width, height);
        window.setTimeout(function() {
                self.nextStep();
            }, 500);
      }, 250);
    });
  },

  hidePicture: function() {
    var self = this;
    this._addStep(function() {
      window.setTimeout(function() {
        self._dialoglog._rootMenu.clearImg();
        window.setTimeout(function() {
          self._dialoglog._rootMenu.blacken(false);
                self.nextStep();
            }, 500);
          }, 250);
    });
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

  play: function(player, mapScreen) {
    var self = this;
    self._player = player;
    self._mapScreen = mapScreen;
    self._dialoglog.open(self._player);
    this._plotMgr.setFlag(this._plotFlagName);

    this.currStep = 0;
    this._steps[this.currStep].call(this);
  },

  _finish: function() {
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
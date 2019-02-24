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

  setData: function(key, value) {
    this._miscStorage[key] = value;
  },

  getData: function(key) {
    return this._miscStorage[key];
  }
};
SerializableMixin(PlotManager);

function PlotDialogSystem(htmlElem, cursorImg, width, height) {
  // Note: code overlaps a LOT with Dialoglog - could they be merged?
  this._init(htmlElem, cursorImg, width, height);
  this._rootMenu = new BackgroundImgBox(width, height);
  this._freelyExit = false;

  this._waitingForKeypress = null; // used to support a command to wait for keypress
  // before advancing to next step.

  var self = this;
  this.onClose(function() {
    console.log("scriptedEventClasses PlotDialogSystem onClose callback");
    self.hideStatusBoxes("portrait");
    self._rootMenu.clearPanelStack();
  });
}
MenuSystemMixin(PlotDialogSystem.prototype);
PlotDialogSystem.prototype.handleKey = function(keyCode) {
  // Only the confirm button does anything:
  if (keyCode === CONFIRM_BUTTON) {
    console.log("Plot dialog system got a confirm-button press");
    // Are we waiting for a keypress?
    if (this._waitingForKeypress) {
      this._waitingForKeypress();
    } else if (this.menuStack.length > 0) {
      // otherwise pass keypress along to top menu in stack.
      var topMenu = this.menuStack[ this.menuStack.length - 1];
      topMenu.onKey(keyCode);
    }
  }
};
PlotDialogSystem.prototype.showPortraitBox = function(portrait) {
  if (!this.portraitBox) {
      this.portraitBox = new CssFixedImgBox("", this); // TODO canvasImpl alternative
      this.addStatusBox(this.portraitBox, "portrait");
      this.portraitBox.setPos(this._positioning.imgLeft,
                              this._positioning.imgTop);
      // TODO setOutsideDimensions, maybe?
  }

  this.showStatusBoxes("portrait");
  var imgWidth = this._calculatedScale * this._positioning.imgWidth;
  var imgHeight = this._calculatedScale * this._positioning.imgHeight;
  this.portraitBox.setImg(portrait, imgWidth, imgHeight);
};
PlotDialogSystem.prototype.hidePortraitBox = function() {
  this.hideStatusBoxes("portrait");
};
PlotDialogSystem.prototype.waitForKeyPress = function(callback) {
  this.clearMsg();
  this._waitingForKeypress = callback;
};



// dialoglog needs to hold the input focus until scripted event
// is done, so that you can't move your character while the event
// is happening.
function ScriptedEvent(plotMgr, plotFlagName, dialoglog) {
  this._steps = [];
  this._player = null;
  this._mapScreen = null;
  this._plotFlagName = plotFlagName;
  this._plotMgr = plotMgr;
  this._dialoglog = dialoglog;
}
ScriptedEvent.prototype = {
  npcEnter: function(npcName, npcSpriteFile, mapId, x, y) {
    var self = this;
    
    // TODO this could become assetLoader.add in a future where the cutscene gets its
    // own asset loader.
    var spritesheet = self._plotMgr.engine.loadImage("sprites/" + npcSpriteFile);
    
    self.showAnotherMap(mapId, x, y); // will do nothing if we're already on that map

    console.log("Adding the npcEnter step");
    this._addStep(function() {
      var engine = self._plotMgr.engine;
      var actor;
      if (engine.hasLibrary("npc")) {
        actor = engine.libraryLoad("npc", npcName);
      }
      if (!actor) {
        // we don't know an NPC with this name yet -- instantiate one!
        actor = new NPC(spritesheet, self._mapScreen);
        actor.name = npcName;
        engine.librarySave("npc", npcName, actor);
      }
      self._mapScreen._currentDomain.addNPC(actor, x, y);
      console.log("Resovling npcEnter step");
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  scrollText: function(text, callback, title) {
    var dlg = this._dialoglog;
    dlg.clearMsg();
    console.log("calling dlg.scrollText with title "+ title);
    var textBox = dlg.scrollText(text, title);
    console.log("Positioning msgWidth is " + dlg._positioning.msgWidth);
    if (dlg._positioning.msgWidth !== "auto") {
      console.log("Setting outer dimensions of text box to " + dlg._positioning.msgWidth + ", " +  dlg._positioning.msgHeight);
      textBox.setOuterDimensions(dlg._positioning.msgWidth,
                                 dlg._positioning.msgHeight);
    }

    textBox.onClose(callback);
  },

  // could make a new menu system just for holding the keyboard
  // focus during scripted events...
  npcSpeak: function(npc, text, title) {
    var self = this;
    var dlg = this._dialoglog;
    console.log("Adding an NPC SPeak step");
    this._addStep(function() {
      dlg.hidePortraitBox(); // because npcs don't have portraits
      self.scrollText(text, function() {
        console.log("Resovling npcSpeak step");
        self.nextStep();
      }, title);
    }); 
    return this; // for daisy-chaining
  },
  
  npcMove: function(npcName, directionList) {
    var self = this;
    console.log("Adding an NPC Move step");
    this._addStep(function() {
      var engine = self._plotMgr.engine;
      var actor;
      if (engine.hasLibrary("npc")) {
        actor = engine.libraryLoad("npc", npcName);
      }
      actor.walkPath(directionList, function() {
        console.log("Resovling npcMove step");
        self.nextStep();
      });
    });
    return this; // for daisy-chaining
  },

  npcMoveTo: function(npcName, x, y) {
    var self = this;
    console.log("Adding an NPC MoveTo step");
    this._addStep(function() {
      // do stuff here
      // TODO call nextStep when npc move animation is done
      console.log("Resovling npcMoveTo step");
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  npcExit: function(npcName) {
    var self = this;
    console.log("Adding an NPC Exit step");
    this._addStep(function() {
      var engine = self._plotMgr.engine;
      var actor =  self._mapScreen._currentDomain.getNPCByName(npcName);
      if (actor) {
        console.log("Domain has " + self._mapScreen._currentDomain.getAllNPCs().length + " npcs. Removing one...");
        self._mapScreen._currentDomain.removeNPC(actor);
        console.log("Domain now has " + self._mapScreen._currentDomain.getAllNPCs().length + " npcs.");
      } else {
        console.warn("No NPC named " +  npcName + " in map " + self._mapScreen._currentDomain._id);
      }
      // wow that's encapsulation breaky
      console.log("Resovling npcExit step");
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
            console.log("Resovling getItem step");
            self.nextStep();
          });
        });
      });
    // TODO what do we do with the progression of the plot
    // point if player has a full inventory and doesn't discard something
    // to take the item? if it's a story-critical item that could leave the
    // game in an unwinnable state.
  },

  pcSpeak: function(pc, text, title) {
    // TODO pc arg is unused
    var self = this;
    this._addStep(function() {
      self.scrollText(text, function() {
        console.log("Resovling pcSpeak step");
        self.nextStep();
      }, title);
    });
    return this;
  },

  pcSpeakWithPortrait: function(text, portrait, speaker) {
    var self = this;
    var dlg = this._dialoglog;
    this._addStep(function() {
      dlg.showPortraitBox(portrait);
      console.log("Scrolling cutscene text with speaker = " + speaker);
      self.scrollText(text, function() {
        dlg.hidePortraitBox();
        console.log("Resovling pcSpeakWithPortrait step");
        self.nextStep();
      }, speaker);
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
          console.log("Resovling doAddStep step step");
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
    console.log("Adding a PartyEnter step");
    this._addStep(function() {
      self._mapScreen.switchTo(mapDomain.getId(), x, y, function() {
        console.log("Resovling partyEnter step");
        self.nextStep();
      });
    });
    return this;
  },

  pcEnter: function(pc, mapId, x, y) {
    var self = this;
    console.log("Adding a PCEnter step");
    // puts the given PC into the given map at x,y and displays that map, but
    // without changing the *player's* current map.

    // TODO: this is actually an incoherent concept as the engine currently operates.
    // the map screen draws npcs and it draws the party. PCs have no concept of which
    // map they're in.

    // approach one: a map shown during a cutscene is not actually a map it's an image
    // backdrop with sprites in front of it. there's no pcEnter or npcEnter just
    // spriteEnter(spritesheet, name, mapDomain, x, y)

    // approach two: it's a real map, but when we make a "PC" enter we're really creating
    // an NPC using that PC's spritesheet. 

    // approach three: every PC actually does have a "what map am I on" variable. Instead
    // of drawing "the party", the map draws whatever PCs are on the current map. Possibly
    // player.getAliveParty() could have an optional "what map" argument. This would be
    // very useful as a basis for future "multiple parties, switch between them" feature.

    // this means that every time the player goes to a new map we need to explicitly set the
    // "what map are you on?" of each party member.
    //self.showAnotherMap(mapId, x, y); // this does nothing if we're already in that map
    this._addStep(function() {
      // TODO actually place the PC into the map... how?

      self._mapScreen.setNewDomain(mapId);
      pc.setPos(x, y);
      pc.setFacing(0, 1);
      console.log("Resovling pcEnter step");
      self.nextStep();
    });
    return this;
  },

  pcMove: function(pc, directionList) {
    var self = this;
    function doAddStep(deltaX, deltaY) {
      console.log("Adding a PCMove step");
      self._addStep(function() {
          var numAnimFrames = pc.walkAnimationFrames;
          var stepAnim = pc.makeStepAnimation(self._mapScreen,
                                              numAnimFrames,
                                              deltaX, deltaY);
        stepAnim.onFinish(function() {
          console.log("Resovling pcEnter step");
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
    console.log("Adding a PCMoveTo step");
    this._addStep(function() {
      // do stuff here
      // TODO call nextStep when pc move animation finishes
      console.log("Resovling PCMoveTo step");
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  pcExit: function() {
    var self = this;
    console.log("Adding a PCExit step");
    this._addStep(function() {
      // TODO what the heck does this even mean? If they're in the party and
      // the party is here, how do we stop showing them without removing
      // them from the party?
      console.log("Resovling PCExit step");
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  // formerly known as switchMapDomain()
  showAnotherMap: function(mapId, x, y) {
    // moves the "camera" to this map without moving the PCs to this map. Unfolds
    // the new map but does NOT trigger onLoad/onUnload.
    var self = this;
    console.log("Adding the showAnotherMap step");
    this._addStep(function() {
      console.log("showAnotherMap is resolving");
      if (mapId === self._mapScreen.getCurrentMapId()) {
        // if we're already in this domain, it's a no-op:
        console.log("Resovling showAnotherMap step (no-op)");
        self.nextStep();
      } else {
        var previousDomain = self._mapScreen._currentDomain;
        var newDomain = self._mapScreen.getMap(mapId);
        newDomain.unfold(function() {
          // do NOT call exitOldDomain or setNewDomain as those will trigger
          // onLoad() / onUnload() which we don't want
          self._mapScreen._currentDomain = newDomain; // so encapsulation-breaky
          self._mapScreen._scrollX = 0;
          self._mapScreen._scrollY = 0;
          // if x/y  provided, then scroll to show that location:
          if (typeof x !== 'undefined') {
            self._mapScreen.scrollToShow(x, y);
          }
          // fold up previous map to put away if needed:
          if (previousDomain && previousDomain !== newDomain) {
            previousDomain.fold();
          }
          console.log("Resovling showAnotherMap step (unfolded case)");
          self.nextStep();
        });
        // TODO xxx is refreshing NPCs part of unfold or part of load? does unfold call load?
        // what do we gotta do to make sure unfold is called everywhere but load() is only
        // called if the player party enters the map.
      }
    });
    return this;
  },

  scrollMapTo: function(x, y) {
    var self = this;
    console.log("Adding a scrollMapTo step");
    this._addStep(function() {
      self._mapScreen.scrollToShow(x, y);
      // TODO animate scrolling of map screen...
      console.log("Resovling scrollMapTo step");
      self.nextStep();
    });
    return this; // for daisy-chaining
  },

  stackPanel: function(img, x, y, doClear) {
    // stacks the given manga panel image on top of other images already there, manga-style
    var self = this;
    console.log("Adding a stckPanel step");
    this._addStep(function() {
      self._dialoglog._rootMenu.blacken(true);
      if (doClear) {
        self._dialoglog._rootMenu.clearPanelStack();
      }
      self._dialoglog._rootMenu.stackPanel(img, x, y);
      console.log("Resovling stackPanel step");
      self.nextStep();
    });
  },

  clearPanel: function(imgFileName) {
    var self = this;
    console.log("Adding a clearPanell step");
    this._addStep(function() {
      console.log("Trying to clear panel named " + imgFileName);
      self._dialoglog._rootMenu.clearNamedPanel(imgFileName);
      console.log("Resovling clearPanel step");
      self.nextStep();
    });
  },

  clearAllPanels: function() {
    var self = this;
    console.log("Adding a clearAllPanels step");
    this._addStep(function() {
      self._dialoglog._rootMenu.clearPanelStack();
      console.log("Resovling clearAllPanels step");
      self.nextStep();
    });
  },

  showPicture: function(img, width, height) {
    // displays the image alone and centered
    var self = this;
        console.log("Adding a showPicture step");
    this._addStep(function() {
      self._dialoglog._rootMenu.blacken(true);
      window.setTimeout(function() {
        self._dialoglog._rootMenu.setImg(img, width, height);
        window.setTimeout(function() {
          console.log("Resovling showPicture step");
          self.nextStep();
        }, 500);
      }, 250);
    });
  },

  hidePicture: function() {
    var self = this;
    console.log("Adding a hidePicgture step");
    this._addStep(function() {
      window.setTimeout(function() {
        self._dialoglog._rootMenu.clearImg();
        window.setTimeout(function() {
          self._dialoglog._rootMenu.blacken(false);
          console.log("Resovling hidePicture step");
                self.nextStep();
            }, 500);
          }, 250);
    });
  },

  waitForKey: function() {
    var self = this;
    console.log("Adding step to wait for keypress");
    this._addStep(function() {
      console.log("Waiting for keypress");
      self._dialoglog.waitForKeyPress(function() {
        console.log("Keypress happened");
        console.log("Resovling waitForKey step");
        self.nextStep();
      });
    });
  },

  waitForMs: function(milliseconds) {
    var self = this;
    console.log("Adding a wait-for-ms step");
    this._addStep(function() {
      window.setTimeout(function() {
        console.log("Resovling waitForMs step");
        self.nextStep();
      }, milliseconds);
    });
  },

  _addStep: function(stepFunction) {
    this._steps.push(stepFunction);
    console.log("_addStep called. there are now " + this._steps.length + " steps.");
  },

  nextStep: function() {
    this.currStep += 1;
    console.log("nextStep called, advancing currStep to " + this.currStep + " out of " + this._steps.length);
    if (this.currStep < this._steps.length) {
      this._steps[this.currStep].call(this);
    } else {
      console.log("Therefore finishing");
      this._finish();
    }
  },

  play: function(player, mapScreen) {
    var self = this;
    self._player = player;
    self._mapScreen = mapScreen;
    self._priorMapSetting = {map: mapScreen.getCurrentMapId(), // save this to restore it after cutscene ends
			     x: mapScreen._scrollX,
			     y: mapScreen._scrollY};
    self._dialoglog.open(self._player);
    this._plotMgr.setFlag(this._plotFlagName);

    this.currStep = 0;
    this._steps[this.currStep].call(this);
  },

  _finish: function() {
    this._dialoglog.emptyMenuStack();
    console.log("SCRIPTED EVENT._FINISH");

    // Restore us to the map we were on before cutscene started:
    var self = this;
    // TODO code duplicated from showAnotherMap, factor out:
    if (this._mapScreen.getCurrentMapId() != this._priorMapSetting.map) {
      var previousDomain = self._mapScreen._currentDomain;
      var newDomain = self._mapScreen.getMap(this._priorMapSetting.map);
      newDomain.unfold(function() {
        // do NOT call exitOldDomain or setNewDomain as those will trigger
        // onLoad() / onUnload() which we don't want
        self._mapScreen._currentDomain = newDomain; // so encapsulation-breaky
	var pos = self._mapScreen.player.getAliveParty()[0].getPos();
	self._mapScreen.scrollToShow(pos.x, pos.y);
        if (previousDomain && previousDomain !== newDomain) {
          previousDomain.fold();
        }
      });
    }
    
    this._dialoglog.close();
    // TODO put party back in order, center map screen on them,
    // and resume player control.
    // since we're back on map screen we should resume map music:
    this._mapScreen.playMusicForCurrentMap();
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

function Player() {
  this.mapScreen = null;
  this.party = [];
  this.aliveParty = this.party;
  this.moveListeners = [];
  this._resources = {}; // money and stuff
  this.inVehicle = null;
}
Player.prototype = {
  serializableClassName: "Player",
  serializableFields: ["_resources", "party"],

  onSerialize: function(jsonobj) {
    // TODO record lead character x, y, the name or ID of the
    // MapDomain I'm standing in,
    // and where I left my boat.
  },

  onDeserialize: function(jsonobj) {
    // TODO
    // Restore mapDomain, restore boat position, etc.
    // Call post-constructor initialize method on each PC
    // to get our ducks in a row.
  },

  enterMapScreen: function(mapScreen, x, y) {
    this.mapScreen = mapScreen;
    mapScreen.setPlayer(this);
    for (var i = 0; i < this.party.length; i++) {
      this.party[i].setPos(x, y);
      this.party[i].clearLastMoved();
    }
    mapScreen.scrollToShow(x, y);
  },

  marchInOrder: function() {
    // call after any change in party order or any party member
    // killed/revived in order to wrangle sprites so they'll appear
    // in correct order.
    this.aliveParty = [];
    for (var i =0 ; i< this.party.length; i++) {
      if (this.party[i].isAlive()) {
        this.aliveParty.push(this.party[i]);
      }

      if (!this.inVehicle && this.party[i].isAlive()) {
        this.party[i].show();
      } else {
        // don't draw dead people, or people on boats
        this.party[i].hide();
      }
    }
    if (!this.inVehicle) {
      // eliminate gaps in alive party
      for (i = 1; i < this.aliveParty.length; i++) {
        var leaderPos = this.aliveParty[i - 1].getPos();
        var lastMoved = this.aliveParty[i - 1].getLastMoved();
        // put each alive person after the first in the space 
        // previously occupied by the alive person in front of them
        var x= leaderPos.x - lastMoved.x;
        var y = leaderPos.y - lastMoved.y;
        this.aliveParty[i].setPos(x, y);
      }
    }
  },

  move: function(dx, dy) {
    var self = this;
    var mainChar = this.aliveParty[0];
    var numAnimFrames = mainChar.walkAnimationFrames;
    // set facing of main character even if we can't move:
    mainChar.setFacing(dx, dy);

    // see if there's a vehicle in front of me that i might
    // be trying to move into:

    var newPos = self.mapScreen.getNeighbor(mainChar._x, mainChar._y, dx, dy);
    var newX = newPos.x;
    var newY = newPos.y;
    var aVehicle = self.mapScreen.getVehicleAt(newX, newY);

    // if we're in vehicle, use the vehicle's canMove method to
    // decide if we can move forward...
    var canMove;
    if (this.inVehicle) {
      if (aVehicle) {
        // moving from one vehicle into another...?
        canMove = this.inVehicle.canMoveToAnotherVehicle(aVehicle);
      } else {
        canMove = this.inVehicle.canMove(self.mapScreen, dx, dy);
        // vehicle not being able to move MAY be a sign to
        // disembark.
        if (!canMove) {
          this.inVehicle.bump(self.mapScreen, dx, dy);
        }
      }
    }

    if (!this.inVehicle) {
      // if not in a vehicle, use mainChar's canMove method
      // to decide if we can take this step...
      // this is a separate check because we may have JUST
      // disembarked in the above code block.
      canMove = mainChar.canMove(self.mapScreen, dx, dy);
      // always allow us to move in order to embark into a
      // vehicle:
      if (aVehicle) {
          canMove = true;
      }
    }
    var scrolliness = this.mapScreen.calcAutoScroll( mainChar._x, 
				                     mainChar._y,
				                     dx,
				                     dy);
    var animation = null;
    if (scrolliness.x != 0 || scrolliness.y != 0) {
      if (canMove) {
        // if screen will scroll, start with the scrolling animation
        animation = this.mapScreen.getScrollAnimation(scrolliness,
                                                     numAnimFrames);
      }
    }
    if (animation == null) {
      // otherwise start with an empty animation.
      animation = new Animation(numAnimFrames);
    }

    // make walking animations for each party member and composite
    // them.
    if (canMove) {
      if (this.inVehicle) {
        // show the vehicle moving
        animation.composite(this.inVehicle.makeStepAnimation(self.mapScreen, numAnimFrames, dx, dy));
        // when vehicle animation finished, update all party member
        // positions to equal vehicle's position.
        animation.onFinish(function() {
          for (var i = 0; i < self.aliveParty.length; i++) {
            var member = self.aliveParty[i];
            member.move(self.mapScreen, dx, dy);
          }
        });
      } else {
        // show the party members moving
        // each person moves in the direction last moved by the person
        // in front of them
        var partyMoveDirections = [{x: dx, y: dy}];
        for (var i = 0; i < this.aliveParty.length - 1; i++) {
          partyMoveDirections.push(this.aliveParty[i].getLastMoved());
        }

        for (var i = 0; i < this.aliveParty.length; i++) {
          var member = this.aliveParty[i];
          var walkDir = partyMoveDirections[i];
          animation.composite(member.makeStepAnimation
                              (self.mapScreen, numAnimFrames,
                               walkDir.x, walkDir.y));
        }
      }
    } else {
      if (this.inVehicle) { // on vehicle, can't move
        // show the vehicle wiggling in place
        animation.onFrame(function(currFrame) {
          if (self.inVehicle) {
            self.inVehicle._animationCallback(dx, dy, currFrame);
          }
        });
      } else { // not on a vehicle, can't move
        // show main character wiggling in place
        animation.onFrame(function(currFrame) {
          mainChar._animationCallback(dx, dy, currFrame);
        });
      }
    } 

    // when animation is done, if we moved, trigger
    // map effects of the lead character's step
    if (canMove) {
      animation.onFinish(function() {
        if (aVehicle && self.inVehicle) {
           // TODO other step effects of vehicle movement
          // would go here:
          self.inVehicle.bumpIntoAnotherVehicle(aVehicle);
        } else {
          self.mapScreen.processStep(self,
                                     mainChar._x,
                                     mainChar._y);
        }
      });
    }

    // When animation is done, call user-defined callbacks!
    animation.onFinish(function() {
      for (i = 0; i < self.moveListeners.length; i++) {
        self.moveListeners[i](self, dx, dy, canMove);
      }
    });

    return animation;
  },

  addCharacter: function(playerCharacter) {
    playerCharacter._marchOrder = this.party.length;
    this.party.push(playerCharacter);
  },

  getParty: function() {
    return this.party;
  },

  getAliveParty: function() {
    return this.aliveParty;
  },

  onMove: function(callback) {
    this.moveListeners.push(callback);
  },

  getFacingSpace: function() {
    var mainChar = this.aliveParty[0];
    var pos = mainChar.getPos();
    var facing = mainChar.getFacing();
    var space = this.mapScreen.getNeighbor(pos.x, pos.y, facing.x, facing.y);
    return space;
  },

  boardVehicle: function(vehicle) {
    this.inVehicle = vehicle;
    // hide party
    var vehiclePos = vehicle.getPos();
    for (var i = 0; i < this.party.length; i++) {
      // literally put everybody on board:
      this.party[i].setPos(vehiclePos.x, vehiclePos.y);
      this.party[i].hide();
    }
  },

  exitVehicle: function() {
    this.inVehicle = null;
    // show party
    for (var i = 0; i < this.party.length; i++) {
      this.party[i].show();
    }
    this.marchInOrder();
  },

  findRoomForAnItem: function(dialoglog, itemName, successCallback) {
    for (var i = 0; i < this.party.length; i++) {
      if (!this.party[i].inventoryIsFull()) {
        successCallback(this.party[i]);
        return;
      }
    }

    // TODO should this stuff be moved to the Dialoglog class or what?

    // Nobody has room - prompt if you want to drop something
    dialoglog.open(this);
    dialoglog.showMsg("There's a " + itemName + " here, but everybody's hands are full. Drop something to pick it up?");
    dialoglog.yesOrNo(function(choice) {
      if (choice) {
        dialoglog.chooseCharacter("Who will drop something?", function(receiver) {
          var menu = dialoglog.makeMenu();
          menu.setTitle("Drop what?");

          // TODO this part duplicates code from FieldMenu
          var itemCmds = receiver.getInventoryCmds(false);
          for (var i = 0; i < itemCmds.length; i++) {
            (function(trash) {
              menu.addCommand(trash.name,
                              function() {
                                dialoglog.showMsg("Drop " + trash.name 
                                               + " to pick up " +
                                               itemName + "?");
                                dialoglog.yesOrNo(function(choice) {
                                  if (choice) {
                                    receiver.loseItem(trash.reference);
                                    dialoglog.emptyMenuStack();
                                    dialoglog.clearMsg();
                                    successCallback(receiver);
                                  } else {
                                    dialoglog.popMenu();
                                    dialoglog.popMenu();
                                  }
                                });
                              });
            })(itemCmds[i]);
          }
          dialoglog.pushMenu(menu);
        });
      } else {
        dialoglog.popMenu();
        dialoglog.clearMsg();
        dialoglog.scrollText("Leaving the " + itemName + " here for now.");
      }
    });
  },

  gainResource: function(resourceName, amount) {
    if (!this._resources[resourceName]) {
      this._resources[resourceName] = 0;
    }
    this._resources[resourceName] += amount;
  },

  setResource: function(resourceName, amount) {
    this._resources[resourceName] = amount;
  },

  hasResource: function(resourceName, amount) {
    if (!this._resources[resourceName]) {
      return false;
    }
    return (this._resources[resourceName] >= amount);
  },

  spendResource: function(resourceName, amount) {
    if (this._resources[resourceName]) {
      this._resources[resourceName] -= amount;
    }
  },
  
  getResource: function(resourceName) {
    if (this._resources[resourceName]) {
      return this._resources[resourceName];
    } else {
      return 0;
    }
  },

  listResources: function() {
    var names = [];
    for (var name in this._resources) {
      names.push(name);
    }
    return names;
  },

  forEachAliveMember: function(callback) {
    for (var i = 0; i < this.aliveParty.length; i++) {
      callback(this.aliveParty[i]);
    }
  },

  getPcByName: function(name) {
    // can't believe we got by so long without this method
    for (var i = 0; i < this.aliveParty.length; i++) {
      if (this.aliveParty[i].name == name) {
        return this.aliveParty[i];
      }
    }
    return null;
  }
};
SerializableMixin(Player);


// Prototype hackery!
var MapSprite = {
  _subClassPrototypes: [],
  
  setDefault: function(propertyName, value) {
    for (var i = 0; i < this._subClassPrototypes.length; i++) {
      this._subClassPrototypes[i][propertyName] = value;
    }
  }
};

function MapSpriteMixin(subClassPrototype) {
  MapSprite._subClassPrototypes.push(subClassPrototype);

  subClassPrototype.defineSprite = function(spriteSheet, width, height,
                               offsetX, offsetY) {
    // the "constructor" for map sprites -- must be called by the
    // constructor of the subclass to initialize relevant attributes
    this._img = spriteSheet;
    this._x = 0;
    this._y = 0;
    this._spriteSlice = {x: 0, y: 0};
    this._defaultSpriteSlice = {x: 0, y: 0};
    this._width = width;
    this._height = height;

    this._offsetX = offsetX;
    this._offsetY = offsetY;

    this._animationOffset = {x: 0, y: 0};
    //this._animationCallback = null;

    this._lastMoved = {x: 0, y: 0};
    this._isVisible = true;
  };

  subClassPrototype.setSpriteSheet = function(spriteSheet) {
    // overrides the default spritesheet, redefines sprite based on it,
    // without changing other properties
    this.defineSprite(spriteSheet, this._width, this._height,
                      this._offsetX, this._offsetY);
  };
  
  subClassPrototype.setSprite = function(sliceX, sliceY) {
    this._spriteSlice = {x: sliceX, y: sliceY};
    this._defaultSpriteSlice = {x: sliceX, y: sliceY};
  };

  subClassPrototype.useSpriteRow = function(sliceY) {
    this._spriteSlice.y = sliceY;
  };

  subClassPrototype.useSpriteCol = function(sliceX) {
    this._spriteSlice.x = sliceX;
  };

  subClassPrototype.setAnimationOffset = function(offset) {
    this._animationOffset = offset;
  };

  subClassPrototype.walkAnimation = function(callback) {
    this._animationCallback = callback;
  };

  subClassPrototype.isVisible = function() {
    return this._isVisible;
  };

  subClassPrototype.hide = function() {
    this._isVisible = false;
  };

  subClassPrototype.show = function() {
    this._isVisible = true;
  };

  subClassPrototype.plot = function(mapScreen, adjustment) {
    if (!this.isVisible()) {
      return;
    }
    //adjustment is optional, but if provided it should have x, y
    var screenCoords = mapScreen.transform(this._x, this._y);
    var x = screenCoords[0] + this._offsetX;
    var y = screenCoords[1] + this._offsetY;
    if (this._animationOffset) {
      x+= this._animationOffset.x;
      y+= this._animationOffset.y;
    }
    if (adjustment) {
      x+= adjustment.x;
      y+= adjustment.y;
    }

    var spriteOffsetX = this._spriteSlice.x * this._width;
    var spriteOffsetY = this._spriteSlice.y * this._height;

    mapScreen._ctx.drawImage(this._img,
                             spriteOffsetX, spriteOffsetY,
                             this._width, this._height,
                             x, y,
                             this._width, this._height);
  };

  subClassPrototype.scalePlot = function(ctx, scaleWidth, scaleHeight,
                                         x, y) {
    var spriteOffsetX = this._spriteSlice.x * this._width;
    var spriteOffsetY = this._spriteSlice.y * this._height;
    ctx.drawImage(this._img, spriteOffsetX,
                  spriteOffsetY,
                  this._width, this._height, x, y,
                  scaleWidth, scaleHeight);
  };
    
  subClassPrototype.canMove = function(mapScreen, deltaX, deltaY)  {
    var newPos = mapScreen.getNeighbor(this._x, this._y, deltaX, deltaY);
    var newX = newPos.x;
    var newY = newPos.y;
    if (!mapScreen.pointInBounds(newX, newY)) {
      // don't go off the map
      return false;
    }
    if (mapScreen.getNPCAt(newX, newY)) {
      // don't walk through an NPC
      return false;
    }

    if (!this._walksThroughPCs) {
      if (mapScreen.getPCAt(newX, newY)) {
        // don't walk through a PC either (unless you are also a PC)
        return false;
      }
      // TODO: make NPCs not start walking into the space a PC
      // has *started* moving into, otherwise there may be a collision
      // maybe PC needs to lay claim to the space in front as soon
      // as they start walking?
    }

    // don't walk through impassible terrain types
    if (this.canCross) { // i.e. if method has been defined
      var nextStepLandType = mapScreen.getLandType(newX, newY);
      if (!this.canCross(nextStepLandType)) {
        return false;
      }
    }
    return true;
  };

  subClassPrototype.move = function( mapScreen, deltaX, deltaY ) {
    var newPos = mapScreen.getNeighbor(this._x, this._y, deltaX, deltaY);
    this._x = newPos.x;
    this._y = newPos.y;

    this._lastMoved = {x: deltaX, y: deltaY};
    this._facing = {x: deltaX, y: deltaY};
  };

  subClassPrototype.setPos = function( x, y ) {
    this._x = x;
    this._y = y;
  };

  subClassPrototype.getPos = function() {
    return {x: this._x, y: this._y};
  };

  subClassPrototype.getLastMoved = function() {
    return this._lastMoved;
  };

  subClassPrototype.clearLastMoved = function() {
    this._lastMoved = {x: 0, y: 0};
  };

  subClassPrototype.setFacing = function(dx, dy) {
    this._facing = {x: dx, y: dy};
  };

  subClassPrototype.getFacing = function() {
    if (!this._facing) {
      this._facing = {x: 0, y: 1}; //facing south is default
    }
    return this._facing;
  };

  subClassPrototype.makeStepAnimation = function(mapScreen, numFrames, dx, dy) {
    var self = this;
    // total pixels to move in x dir and pixels to move in y dir:
    var xPixels = mapScreen.tilePixelsX * dx; 
    var yPixels = mapScreen.tilePixelsY * dy;
    var finishCallback = function() {
      self.setAnimationOffset({x: 0, y: 0});
      self.move(mapScreen, dx, dy);
    };
    var frameCallback = function(currFrame) {
      var offset = {
        x: xPixels * currFrame / numFrames,
        y: yPixels * currFrame / numFrames
      };
      self.setAnimationOffset(offset);
      if (self._animationCallback) {
        self._animationCallback(dx, dy, currFrame);
      }
    };
    return new Animation(numFrames, frameCallback,
                         finishCallback);
  };
}

function PlayerCharacter() {
  this.battlerInit();
  this._statBlock = {};
  // spriteSheet and spriteDimensions have been set on prototype
  this.defineSprite(this.spriteSheet,
                    this.spriteDimensions.width,
                    this.spriteDimensions.height,
                    this.spriteDimensions.offsetX,
                    this.spriteDimensions.offsetY);
  this._walksThroughPCs = true;

  this._inventory = new Inventory(8); // TODO don't hard-code
  // TODO this is assuming that inventory is a per-PC thing
  // and that each PC will always have an ITEM command in battle
  // these assumptions might not be true for some games
  // so this should really go in userland.

  this._equippableTypes = [];
  this._equippedItems = {};

  this._battleSpells = [];
  this._fieldSpells = [];
}
PlayerCharacter.prototype = {
  serializableClassName: "PlayerCharacter",
  serializableFields: ["name", "_statBlock", "_inventory", 
                       "_dead", "_stati", "_equippableTypes",
                       "_marchOrder", "_spriteSlice"],

  onSerialize: function(jsonobj) {
    // handle serialization of important external references
    // Spell list: Serialize names of spells only
    jsonobj.battleSpells = [];
    jsonobj.fieldSpells = [];
    for (var i =0; i < this._battleSpells.length; i++) {
      jsonobj.battleSpells.push(this._battleSpells[i].name);
    }
    for (i =0; i < this._fieldSpells.length; i++) {
      jsonobj.fieldSpells.push(this._fieldSpells[i].name);
    }
    // TODO i think this is pushing in undefined objects? Anyway
    // spells aren't castable after reloading a saved game.

    // Equipped equipment: Serialize indices into inventory
    jsonobj.equipped = {};
    for (var slot in this._equippedItems) {
      var item = this._equippedItems[slot];
      var index = this._inventory._itemList.indexOf(item);
      jsonobj.equipped[slot] = index;
    }

    // TODO other external refs: _lockedAction,
    //  _portrait
    // onEffect handlers ("heal" and "fullheal")
  },

  onDeserialize: function(jsonobj) {
    // Restore spell list!
    for (var i =0; i < jsonobj.battleSpells.length; i++) {
      var cmd = g_batCmdHack[jsonobj.battleSpells[i]];
      this._battleSpells.push(cmd);
    }
    for (i =0; i < jsonobj.fieldSpells.length; i++) {
      var cmd = g_batCmdHack[jsonobj.fieldSpells[i]];
      this._fieldSpells.push(cmd);
    }

    // Restore equipped equipment (assumes inventory already restored)
    for (var slot in jsonobj.equipped) {
      var index = jsonobj.equipped[slot];
      var item = this._inventory._itemList[index];
      this._equippedItems[slot] = item;
    }
  },

  gainItem: function(itemType) {
    this._inventory.gainItem(itemType);
  },
  loseItem: function(instance) {
    if (this.isEquipped(instance)) {
      this.unEquipItem(instance);
    }
    this._inventory.removeItem(instance);
  },
  receiveItemFrom: function(instance, giver) {
    giver.loseItem(instance);
    this._inventory.gainInstance(instance);
  },
  getItemByName: function(name) {
    return this._inventory.getItemByName(name);
  },
  getInventoryCmds: function(isBattle) {
    return this._inventory.getItemNamesAndUses(isBattle);
  },
  inventoryIsFull: function() {
    return this._inventory.isFull();
  },
  generateItemSubMenu: function() {
    // Should we be making this new one every time? Does old one
    // get garbage collected???
    var myItemCmd = new BattleCommandSet();
    var myItems = this.getInventoryCmds(true);
    for (var i = 0; i < myItems.length; i++) {
      myItemCmd.add(myItems[i].name, new BatCmd(myItems[i]));
    }
    return myItemCmd;
  },
  generateMagicSubMenu: function() {
    var myMagicCmd = new BattleCommandSet();
    for (i = 0; i < this._battleSpells.length; i++) {
      var spell = this._battleSpells[i];
      myMagicCmd.add(spell.name, spell);
    }
    return myMagicCmd;
  },
  customizeCmds: function(defaultCmds) {
    // called at beginning of each battle round
    // to allow us a chance to override
    // the default cmds with our own spell list, item list, etc.
    var newCmds = defaultCmds.deepCopy();
    newCmds.replace("ITEM", this.generateItemSubMenu());
    // Override spell list with my spell list!!
    newCmds.replace("MAGIC", this.generateMagicSubMenu());
    return newCmds;
    // TODO what happens if you REPEAT a round of battle in which
    // somebody used a one-use item?
  },
  getStatDisplay: function(mode) {
    var html = this.name;
    html += "<br>";
    if (mode != "longform") {
      var importantStats = ["level", "hp", "mp"];
      for (var i = 0; i < importantStats.length; i++) {
        if (this.hasStat(importantStats[i])) {
          html += importantStats[i] + ":" + this.getStat(importantStats[i]) + "<br>";
        }
      }
    }
    
    if (mode == "longform") {
      for (var propName in this._statBlock) {
        html+= propName + ": " + this.getStat(propName) + "<br>";
      }
      for (var slot in this._equippedItems) {
        if (this._equippedItems[slot]) {
          html += slot + ": " 
            + this._equippedItems[slot].getName() + "<br>";
        }
      }
    }
    if (mode == "battle" && this._lockedAction) {
      html += this._lockedAction.cmd.name;
    }
    return html;
  },

  // LONGTERM TODO maybe all these functions related to equipping items could go
  // in some kind of EquipmentUserMixin and move it to inventory.js ?
  setEquippableTypes: function(typeList) {
    // takes an array of strings
    this._equippableTypes = typeList;
  },

  canEquipItem: function(item) {
    // returns true or false
    if (!item.isEquippable()) {
      return false;
    }
    var equipType = item.getEquipType();
    return (this._equippableTypes.indexOf(equipType) > -1);
  },

  equipItem: function(item) {
    // TODO check if item is in my inventory, just as a sanity check?
    if (this.canEquipItem(item)) {
      var slot = item.getEquipSlot();
      this._equippedItems[slot] = item;
      // TODO do anything with the item that used to be there?
    }
  },

  equipItemToSlot: function(item, slot) {
    if (this.canEquipItem(item)) {
      this._equippedItems[slot] = item;
    }
  },

  isEquipped: function(instance) {
    for (var slot in this._equippedItems) {
      if (this._equippedItems[slot] == instance) {
        return true;
      }
    }
    return false;
  },

  unEquipItem: function(instance) {
    if (this.isEquipped(instance)) {
      var slot = instance.getEquipSlot();
      this._equippedItems[slot] = null;
    }
  },

  unEquipAll: function() {
    for (var slot in this._equippedItems) {
      this._equippedItems[slot] = null;
    }
  },

  getEquippedType: function(slot) {
    if (this._equippedItems[slot]) {
      return this._equippedItems[slot].getEquipType();
    }
    return null;
  },

  learnSpell: function(spellCmd, useInBattle, useInField) {
    if (useInBattle) {
      this._battleSpells.push(spellCmd);
    }
    if (useInField) {
      this._fieldSpells.push(spellCmd);
    }
  }
};
BattlerMixin.call(PlayerCharacter.prototype);
MapSpriteMixin(PlayerCharacter.prototype);
SerializableMixin(PlayerCharacter);

// Overriding the getStat that is defined in MapSpriteMixin.
// TODO: This is
// a bit hacky and I should think about how to implement proper
// subclassing that lets me override but still call the base method:
PlayerCharacter.prototype.parentGetStat = PlayerCharacter.prototype.getStat;
PlayerCharacter.prototype.getEquipmentStat = function(statName) {
  var statValue = 0;
  for (var slot in this._equippedItems) {
    if (this._equippedItems[slot]) {
      var mod = this._equippedItems[slot].getEquipStat(statName);
      statValue += mod;
    }
  }
  return statValue;
};
PlayerCharacter.prototype.getEquipmentQuality = function(qualityName) {
  // this can return an array of values, if the PC has multiple equipped items
  // with values for the same quality.
  var values = [];
  for (var slot in this._equippedItems) {
    if (this._equippedItems[slot]) {
      var value = this._equippedItems[slot].getEquipQuality(qualityName);
      if (value != null) {
        values.push(value);
      }
    }
  }
  return values;
};
PlayerCharacter.prototype.getStat = function(statName) {
  var statValue;
  if (this.hasStat(statName)) {
    statValue = this.parentGetStat(statName);
  } else {
    statValue = 0;
  }
  statValue += this.getEquipmentStat(statName);
  return statValue;
};


function Vehicle() {
  // spriteSheet and spriteDimensions have been set on prototype
  this.defineSprite(this.spriteSheet,
                    this.spriteDimensions.width,
                    this.spriteDimensions.height,
                    this.spriteDimensions.offsetX,
                    this.spriteDimensions.offsetY);
  this._playerOnboard = null;
  this._embarkCallback = null;
  this._bumpCallback = null;
}
Vehicle.prototype = {
  serializableClassName: "vehicle",
  serializableFields: ["_x", "_y", "_id"],

  setId: function(id) {
     this._id = id;// Used to keep track of which vehicle is which when
  // saving/restoring game state.
  },

  embark: function(player) {
    // called when party tries to walk onto space with vehicle
    this._playerOnboard = player;
    player.boardVehicle(this);

    if (this._embarkCallback) {
      this._embarkCallback(this, player);
    }
  },
  disembark: function() {
    var playerOnboard = this._playerOnboard;
    this._playerOnboard.exitVehicle();
    this._playerOnboard = null;
    return playerOnboard;
  },
  bump: function(mapScreen, dx, dy) {
    // just failed to move in {dx, dy} direction.
    // TODO this duplicates some code from canMove
    var newPos = mapScreen.getNeighbor(this._x, this._y, dx, dy);
    var newX = newPos.x;
    var newY = newPos.y;
    if (!mapScreen.pointInBounds(newX, newY)) {
      // going off the map is not a bump
      return;
    }
    if (mapScreen.getNPCAt(newX, newY)) {
      // if you somehow bump into a seagoing NPC, do not try to
      // disembark on the NPC's head
      return;
    }

    var landType = mapScreen.getLandType(newX, newY);
    if (this._bumpCallback) {
      this._bumpCallback(mapScreen, newX, newY, landType);
      // bump callback MAY lead to disembarking
    }
  },
  onEmbark: function(callback) {
    this._embarkCallback = callback;
  },
  onBump: function(callback) {
    this._bumpCallback = callback;
    // callback will be called when vehicle tries to move into
    // a tile it can't cross -- this can be signal to disembark.
  },
  canMoveToAnotherVehicle: function(otherVehicle) {
    // override this if you want to be able to move into another
    // vehicle...
        console.log("CanMove into another vehicle called");
    return false; 
  },
  bumpIntoAnotherVehicle: function(otherVehicle) {
        console.log("Bump into another vehicle called");
        if (otherVehicle === this) {
            console.log("Wait, it's me");
        }
    // and override this to make it do something...
  }
};
MapSpriteMixin(Vehicle.prototype);
SerializableMixin(Vehicle);

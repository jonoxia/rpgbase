function Player() {
  this.mapScreen = null;
  this.party = [];
  this.aliveParty = this.party;
  this.moveListeners = [];

  this.inVehicle = null;
}
Player.prototype = {
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
    var x = this.party[0]._x;
    var y = this.party[0]._y;
    for (var i = 0; i < this.party.length; i++) {
      this.party[i].setPos(x, y);
      this.party[i].clearLastMoved();
    }
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
  },

  move: function(dx, dy, numAnimFrames) {
    var self = this;
    var mainChar = this.aliveParty[0];
    // set facing of main character even if we can't move:
    mainChar.setFacing(dx, dy);

    // if we're in vehicle, use the vehicle's canMove method to
    // decide if we can move forward; otherwise use the mainChar
    var canMove
    if (this.inVehicle) {
      canMove = this.inVehicle.canMove(self.mapScreen, dx, dy);
      // vehicle not being able to move MAY be a sign to
      // disembark.
      if (!canMove) {
        this.inVehicle.bump(self.mapScreen, dx, dy);
      }
    }

    if (!this.inVehicle) {
      // this is a separate check because we may have just left vehicle
      // or we may never have been in one.
      // can main char take this step or are they blocked?
      canMove = mainChar.canMove(self.mapScreen, dx, dy);
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
      if (this.inVehicle) {
        // TODO if in vehicle, process vehicle's step too ?
      }
      animation.onFinish(function() {
        self.mapScreen.processStep(self, mainChar._x, mainChar._y);
      });
    }

    // When animation is done, call user-defined callbacks!
    animation.onFinish(function() {
      for (i = 0; i < self.moveListeners.length; i++) {
        self.moveListeners[i].call(self, dx, dy, canMove);
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
    var space = {x: pos.x + facing.x, y: pos.y + facing.y};
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
  }
}


// Prototype hackery!
var MapSprite = {
  _subClassPrototypes: [],
  defaultCrossable: function(callback) {
    for (var i = 0; i < this._subClassPrototypes.length; i++) {
      this._subClassPrototypes[i].canCross = callback;
    }
  },
  defaultSpritePicker: function(callback) {
    for (var i = 0; i < this._subClassPrototypes.length; i++) {
      this._subClassPrototypes[i]._animationCallback = callback;
    }
  }
};

function MapSpriteMixin(subClassPrototype) {
  MapSprite._subClassPrototypes.push(subClassPrototype);

  subClassPrototype.defineSprite = function(spriteSheet, width, height,
                               offsetX, offsetY) {
    this._img = spriteSheet;
    this._x = 0;
    this._y = 0;
    this._spriteSlice = {x: 0, y: 0};
    this._width = width;
    this._height = height;

    this._offsetX = offsetX;
    this._offsetY = offsetY;

    this._animationOffset = {x: 0, y: 0};
    //this._animationCallback = null;

    this._lastMoved = {x: 0, y: 0};
    this._isVisible = true;
  };
  
  subClassPrototype.setSprite = function(sliceX, sliceY) {
    this._spriteSlice = {x: sliceX, y: sliceY};
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

  subClassPrototype.canMove = function(mapScreen, deltaX, deltaY) {
    var newX = this._x + deltaX;
    var newY = this._y + deltaY;
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

    // if there's a vehicle in the space we're walking into,
    // we're always allowed to enter it, even if it's on an otherwise
    // impassible land type:
    if (mapScreen.getVehicleAt(newX, newY)) {
      return true;
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
    var newX = this._x + deltaX;
    var newY = this._y + deltaY;
    this._x = newX;
    this._y = newY;

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

  subClassPrototype.getFacing = function(dx, dy) {
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

function PlayerCharacter(spriteSheet, width, height, offsetX, offsetY, statBlock) {
  this._statBlock = statBlock;
  this._effectHandlers = {};
  this.defineSprite(spriteSheet, width, height, offsetX, offsetY);
  this._walksThroughPCs = true;

  this._inventory = new Inventory(8); // TODO don't hard-code
  // TODO this is assuming that inventory is a per-PC thing
  // and that each PC will always have an ITEM command in battle
  // these assumptions might not be true for some games
  // so this should really go in userland.
}
PlayerCharacter.prototype = {
  gainItem: function(itemType) {
    this._inventory.gainItem(itemType);
  },
  loseItem: function(instance) {
    this._inventory.removeItem(instance);
  },
  transferItem: function(instance, receiver) {
    // this breaks all kinds of encapsulation
    this.loseItem(instance);
    instance.inventory = receiver._inventory;
    // have to set that so the item knows whose inventory to 
    // disappear from if it's used up
    receiver._inventory.gainInstance(instance);
  },
  getInventoryCmds: function(isBattle) {
    return this._inventory.getItemNamesAndUses(isBattle);
  },
  customizeCmds: function(defaultCmds) {
    // called at beginning of battle to allow us a chance to override
    // the default cmds with our own spell list, item list, etc.
    
    // TODO make a deep copy so we're not modifying the original
    // (not that it matters for now)
    //var defaultCmds = defaultCmds.clone();
    var myItemCmd = new BattleCommandSet();
    var myItems = this.getInventoryCmds(true);
    for (var i = 0; i < myItems.length; i++) {
      myItemCmd.add(myItems[i].name, new BatCmd(myItems[i]));
    }
    defaultCmds.add("ITEM", myItemCmd);
    return defaultCmds;
    // TODO what happens if you REPEAT a round of battle in which
    // somebody used a one-use item?
  },
  getStatDisplay: function() {
    var html = this.name;
    html += "<br>";
    for (var propName in this._statBlock) {
      html+= propName + " : " + this._statBlock[propName] + "<br>";
    }
    return html;
  }
};
BattlerMixin.call(PlayerCharacter.prototype);
MapSpriteMixin(PlayerCharacter.prototype);


function Vehicle(spriteSheet, width, height, offsetX, offsetY) {
  this.defineSprite(spriteSheet, width, height, offsetX, offsetY);
  this._playerOnboard = null;
  this._embarkCallback = null;
  this._bumpCallback = null;
}
Vehicle.prototype = {
  embark: function(player) {
    // called when party tries to walk onto space with vehicle
    this._playerOnboard = player;
    player.boardVehicle(this);

    if (this._embarkCallback) {
      this._embarkCallback(this, player);
    }
  },
  disembark: function() {
    console.log("You are disembarking");
    this._playerOnboard.exitVehicle();
    this._playerOnboard = null;
  },
  bump: function(mapScreen, dx, dy) {
    // just failed to move in {dx, dy} direction.
    // TODO this duplicates some code from canMove
    var newX = this._x + dx;
    var newY = this._y + dy;
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
  }
};
MapSpriteMixin(Vehicle.prototype);
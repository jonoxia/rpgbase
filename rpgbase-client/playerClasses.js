function Player() {
  this.mapScreen = null;
  this.party = [];
  this.aliveParty = this.party;
  this.moveListeners = [];
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
    }
  },

  move: function(dx, dy, numAnimFrames) {
    var self = this;
    
    // each person moves in the direction last moved by the person
    // in front of them
    var partyMoveDirections = [{x: dx, y: dy}];
    for (var i = 0; i < this.aliveParty.length - 1; i++) {
      partyMoveDirections.push(this.aliveParty[i].getLastMoved());
    }
    var mainChar = this.aliveParty[0];

    // set facing of main character even if we can't move:
    mainChar.setFacing(dx, dy);

    // can main char take this step or are they blocked?
    var canMove = mainChar.canMove(self.mapScreen, dx, dy);
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
      for (var i = 0; i < this.aliveParty.length; i++) {
        var member = this.aliveParty[i];
        var walkDir = partyMoveDirections[i];
        animation.composite(member.makeStepAnimation
                            (self.mapScreen, numAnimFrames,
                             walkDir.x, walkDir.y));
      }
    } else {
      // if you can't move, just wiggle in place
      animation.onFrame(function(currFrame) {
        mainChar._animationCallback(dx, dy, currFrame);
      });
    } 

    // when animation is done, if we moved, trigger
    // map effects of the lead character's step
    if (canMove) {
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
  }
}

function MapSpriteMixin() {
  this.defineSprite = function(spriteSheet, width, height,
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
    this._animationCallback = null;

    this._lastMoved = {x: 0, y: 0};
  };
  
  this.setSprite = function(sliceX, sliceY) {
    this._spriteSlice = {x: sliceX, y: sliceY};
  };

  this.setAnimationOffset = function(offset) {
    this._animationOffset = offset;
  };

  this.walkAnimation = function(callback) {
    this._animationCallback = callback;
  };

  this.plot = function(mapScreen, adjustment) {
    if (!this.isAlive()) {
      return; // this will leave a gap in the party... not the best
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

  this.canCross = function( landType ) {
    // OVERRIDE THIS
    return true;
  };

  this.canMove = function(mapScreen, deltaX, deltaY) {
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

    // don't walk through impassible terrain types
    var nextStepLandType = mapScreen.getLandType(newX, newY);
    if (!this.canCross(nextStepLandType)) {
      return false;
    }
    return true;
  };

  this.move = function( mapScreen, deltaX, deltaY ) {
    var newX = this._x + deltaX;
    var newY = this._y + deltaY;
    this._x = newX;
    this._y = newY;

    this._lastMoved = {x: deltaX, y: deltaY};
    this._facing = {x: deltaX, y: deltaY};
  };

  this.setPos = function( x, y ) {
    this._x = x;
    this._y = y;
  };

  this.getPos = function() {
    return {x: this._x, y: this._y};
  };

  this.getLastMoved = function() {
    return this._lastMoved;
  };

  this.clearLastMoved = function() {
    this._lastMoved = {x: 0, y: 0};
  };

  this.setFacing = function(dx, dy) {
    this._facing = {x: dx, y: dy};
  };

  this.getFacing = function(dx, dy) {
    if (!this._facing) {
      this._facing = {x: 0, y: 1}; //facing south is default
    }
    return this._facing;
  };

  this.makeStepAnimation = function(mapScreen, numFrames, dx, dy) {
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
      self._animationCallback(dx, dy, currFrame);
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
}
PlayerCharacter.prototype = {};
BattlerMixin.call(PlayerCharacter.prototype);
MapSpriteMixin.call(PlayerCharacter.prototype);
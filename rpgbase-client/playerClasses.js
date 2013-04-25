function Player() {
  this.mapScreen = null;
  this.party = [];
  this.moveListeners = [];
}
Player.prototype = {
  enterMapScreen: function(mapScreen, x, y) {
    this.mapScreen = mapScreen;
    mapScreen.setPlayer(this);
    for (var i = 0; i < this.party.length; i++) {
      this.party[i].setPos(x, y);
    }
  },

  move: function(deltaX, deltaY, numAnimFrames) {
    var self = this;

    var partyMoveDirections = [{x: deltaX, y: deltaY}];
    for (var i = 0; i < this.party.length - 1; i++) {
      partyMoveDirections.push(this.party[i].getLastMoved());
    }

    var mainChar = this.party[0];

    var canMove = mainChar.canMove(self.mapScreen, deltaX, deltaY);
    var scrolliness = this.mapScreen.calcAutoScroll( mainChar._x, 
				                     mainChar._y,
				                     deltaX,
				                     deltaY);
    var mapAnimator = null;
    if (scrolliness.x != 0 || scrolliness.y != 0) {
      if (canMove) {
        mapAnimator = this.mapScreen.getScrollAnimator(scrolliness,
                                                       numAnimFrames);
      }
    }

    var finishCallback = function() {
      var i;
      for (i = 0; i < self.party.length; i++) {
        self.party[i].setAnimationOffset({x: 0, y: 0});
        if (canMove) {
          self.party[i].move(self.mapScreen,
                             partyMoveDirections[i].x,
                             partyMoveDirections[i].y);
        }
      }
      self.mapScreen.render();

      // map effects of the lead character's step
      if (canMove) {
        self.mapScreen.processStep(this, mainChar._x, mainChar._y);
      }

      // user-defined callback(s):
      for (i = 0; i < self.moveListeners.length; i++) {
        self.moveListeners[i].call(self, deltaX, deltaY, canMove);
      }
    };

    var frameCallback = function(currFrame) {
      // For each animation frame:

      // Adjust each party member's screen position:
      var i;
      if (canMove) {
        var pixels = currFrame * 16 / numAnimFrames;
        for (var i = 0; i < self.party.length; i++) {
          var offset = {
            x: pixels * partyMoveDirections[i].x,
            y: pixels * partyMoveDirections[i].y
          };
          self.party[i].setAnimationOffset(offset);
        }
      }

      // Change the sprites for each party member:
      for (i = 0; i < self.party.length; i++) {
        if (self.party[i]._animationCallback) {
          self.party[i]._animationCallback(partyMoveDirections[i].x,
                                           partyMoveDirections[i].y,
                                           currFrame);
        }
      }

      // scroll the map if needed:
      if (mapAnimator) {
        mapAnimator(currFrame); // this will render
      } else {
        // if not scrolling, just redraw our new positions:
        self.mapScreen.render();
      }
    };

    return {numFrames: numAnimFrames,
            frameCallback: frameCallback,
            finishCallback: finishCallback};
  },

  addCharacter: function(playerCharacter) {
    playerCharacter._marchOrder = this.party.length;
    this.party.push(playerCharacter);
  },

  getParty: function() {
    return this.party;
  },

  onMove: function(callback) {
    this.moveListeners.push(callback);
  }

}

function PlayerCharacter(spriteSheet, width, height, offsetX, offsetY) {
  this._init(spriteSheet, width, height, offsetX, offsetY);
}
PlayerCharacter.prototype = {
  _init: function(spriteSheet, width, height, offsetX, offsetY) {
    this._img = spriteSheet;
    /*this._stuckInEncounter = false;
    this._inventory = [];*/

    this._x = 0;
    this._y = 0;
    this._spriteSlice = {x: 0, y: 0};

    this.width = width;
    this.height = height;

    this._offsetX = offsetX;
    this._offsetY = offsetY;

    this._animationOffset = {x: 0, y: 0};
    this._animationCallback = null;

    this.lastMoved = {x: 0, y: 0};
  },
  
  setSprite: function(sliceX, sliceY) {
    this._spriteSlice = {x: sliceX, y: sliceY};
  },

  setAnimationOffset: function(offset) {
    this._animationOffset = offset;
  },

  walkAnimation: function(callback) {
    this._animationCallback = callback;
  },

  plot: function(mapScreen, adjustment) {
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

   /* $("#debug").html("My x = " + this._x + ", y = " + this._y
                     + " so plotting at screen x =" + x + ", y=" + y);*/
    var spriteOffsetX = this._spriteSlice.x * this.width;
    var spriteOffsetY = this._spriteSlice.y * this.height;

    mapScreen._ctx.drawImage(this._img, spriteOffsetX, spriteOffsetY, this.width, this.height, x, y, this.width, this.height);
    
  },

  getItem: function( item ) {
    this._inventory.push(item);
    $("#item-menu").html( this.makeItemMenu());
  },

  canCross: function( landType ) {
    // OVERRIDE THIS
    return true;
  },

  canMove: function(mapScreen, deltaX, deltaY) {
    var canMove = true;
    var newX = this._x + deltaX;
    var newY = this._y + deltaY;
    if (!mapScreen.pointInBounds(newX, newY)) {
      canMove = false;
    }
    if (canMove) {
      var nextStepLandType = mapScreen.getLandType(newX, newY);
      if (!this.canCross(nextStepLandType)) {
        canMove = false;
      }
    }
    return canMove;
  },

  move: function( mapScreen, deltaX, deltaY ) {
    /*if (this._stuckInEncounter) {
      return false;
    }

    if (this._movementCallback) {
      var canMove = this._movementCallback(deltaX, deltaY);
    }*/

    var newX = this._x + deltaX;
    var newY = this._y + deltaY;
    this._x = newX;
    this._y = newY;

    this.lastMoved = {x: deltaX, y: deltaY};
    //this._updatePositionToServer();

    // map triggers:
    //mapScreen.processStep(this, newX, newY);
    //this.plot(mapScreen);
    //$("#debug").html("x = " + this._x + ", y = " + this._y);
    //gEncounterManager.checkForEncounters(this._x, this._y, this);
  },

  setPos: function( x, y ) {
    this._x = x;
    this._y = y;
    //this._updatePositionToServer();
  },

  setDomain: function( domainId ) {
    this._domainId = domainId;
  },

  getLastMoved: function() {
    return this.lastMoved;
  },

  // used by the battle system:
  lockInCmd: function(cmd, target) {
    this._lockedAction = {cmd: cmd,
                          target: target};
  },
  getLockedInCmd: function() {
    return this._lockedAction;
  }
};

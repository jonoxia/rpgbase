
function Player() {
  this.mapScreen = null;
  this.party = [];

  this.scrollAnimFrames = 5;
  this.scrollAnimTime = 50;

  this.moveListeners = [];
  this.busyMoving = false;
}
Player.prototype = {
  enterMapScreen: function(mapScreen, x, y) {
    this.mapScreen = mapScreen;
    mapScreen.setPlayer(this);
    for (var i = 0; i < this.party.length; i++) {
      this.party[i].setPos(x, y);
    }
  },

  useScrollAnimation: function( numFrames, frameTime) {
    this.scrollAnimFrames = numFrames;
    this.scrollAnimTime = frameTime;
  },

  move: function(deltaX, deltaY) {
    var self = this;
    if (this.busyMoving) {
      return;
      // don't process another move event till this animation is done
    }
    this.busyMoving = true;
    var mainChar = this.party[0];

    var canMove = mainChar.canMove(self.mapScreen, deltaX, deltaY);
    var scrolliness = this.mapScreen.calcAutoScroll( mainChar._x, 
				                     mainChar._y,
				                     deltaX,
				                     deltaY);

    var animator = null;
    if (scrolliness.x != 0 || scrolliness.y != 0) {
      if (canMove) {
        animator = this.mapScreen.getScrollAnimator(scrolliness,
                                                    self.scrollAnimFrames);
      }
    } else {
      animator = function(frame) {
        var i;
        if (canMove) {
          var offset = {
            x: deltaX * frame * 16 / self.scrollAnimFrames,
            y: deltaY * frame * 16 / self.scrollAnimFrames
          };
          for (var i = 0; i < self.party.length; i++) {
            self.party[i].setAnimationOffset(offset);
          }
        }
        self.mapScreen.render();
      };
    }

    var finish = function() {
      for (var i = 0; i < self.party.length; i++) {
        self.party[i].setAnimationOffset({x: 0, y: 0});
        if (canMove) {
          self.party[i].move(self.mapScreen, deltaX, deltaY);
        }
      }
      self.mapScreen.scroll(scrolliness.x, scrolliness.y);
      // user-defined callback(s):
      for (var i = 0; i < self.moveListeners.length; i++) {
        self.moveListeners[i].call(self.party[i],
                                   deltaX, deltaY, canMove);
      }
      self.mapScreen.render();
      self.busyMoving = false;
    }

    var currFrame = 0;
    var timer = window.setInterval(function() {

      if (animator) {
        animator(currFrame);
      }

      for (var i = 0; i < self.party.length; i++) {
        if (self.party[i]._animationCallback) {
          self.party[i]._animationCallback(deltaX, deltaY, currFrame);
        }
      }
      
      currFrame ++;
      if (currFrame == self.scrollAnimFrames) {
        window.clearInterval(timer);
        finish();
      }
    }, self.scrollAnimTime);
  },

  addCharacter: function(playerCharacter) {
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
    this._img = new Image();
    this._img.src = spriteSheet;
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

  plot: function(mapScreen) {
    //adjustment is optional, but if provided it should have x, y
    var screenCoords = mapScreen.transform(this._x, this._y);
    var x = screenCoords[0] + this._offsetX;
    var y = screenCoords[1] + this._offsetY;

    if (this._animationOffset) {
      x+= this._animationOffset.x;
      y+= this._animationOffset.y;
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
    //this._updatePositionToServer();

    // map triggers:
    mapScreen.processStep(this, newX, newY);
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
  }
};

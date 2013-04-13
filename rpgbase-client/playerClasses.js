
function Player() {
  this.mapScreen = null;
  this.party = [];
}
Player.prototype = {
  enterMapScreen: function(mapScreen, x, y) {
    this.mapScreen = mapScreen;
    // Set up keyboard input:
    var self = this;
    keyMap[ARROW_DOWN] = function(evt) {
      self.move( 0, 1 );
      cancelEvent(evt);
    };
    keyMap[ARROW_UP] = function(evt) {
      self.move( 0, -1);
      cancelEvent(evt);
    };
    keyMap[ARROW_LEFT] = function(evt) {
      self.move( -1, 0);
      cancelEvent(evt);
    };
    keyMap[ARROW_RIGHT] = function(evt) {
      self.move( 1, 0);
      cancelEvent(evt);
    };

    // Add the keydown listner to the document object
    bind(document, 'keydown', keyMap, handleKeystroke);

    for (var i = 0; i < this.party.length; i++) {
      this.party[i].setPos(x, y);
    }
  },

  move: function(deltaX, deltaY) {
    for (var i = 0; i < this.party.length; i++) {
      this.party[i].move(this.mapScreen, deltaX, deltaY);
    }
    this.mapScreen.render();
    this.plotAll();
  },

  addCharacter: function(playerCharacter) {
    this.party.push(playerCharacter);
  },

  plotAll: function() {
    for (var i = 0; i < this.party.length; i++) {
      this.party[i].plot(this.mapScreen);
    }
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

    this.moveListeners = [];
  },
  
  setSprite: function(sliceX, sliceY) {
    this._spriteSlice = {x: sliceX, y: sliceY};
  },

  plot: function(mapScreen) {
    mapScreen.autoScrollToPlayer( this._x, this._y );
    var screenCoords = mapScreen.transform(this._x, this._y);
    var x = screenCoords[0] + this._offsetX;
    var y = screenCoords[1] + this._offsetY;

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

  move: function( mapScreen, deltaX, deltaY ) {
    /*if (this._stuckInEncounter) {
      return false;
    }

    if (this._movementCallback) {
      var canMove = this._movementCallback(deltaX, deltaY);
    }*/
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

    if (canMove) {
      var oldX = this._x;
      var oldY = this._y;
      this._x = newX;
      this._y = newY;
      //this._updatePositionToServer();
    }

    // user-defined callback(s):
    for (var i = 0; i < this.moveListeners.length; i++) {
      this.moveListeners[i].call(this, deltaX, deltaY, canMove);
    }
    this.plot(mapScreen);
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

  onMove: function(callback) {
    this.moveListeners.push(callback);
  }

};

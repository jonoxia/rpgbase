// http://javascriptweblog.wordpress.com/2011/05/31/a-fresh-look-at-javascript-mixins/

function NPC(spriteSheet, width, height, offsetX, offsetY) {
  this.defineSprite(spriteSheet, width, height, offsetX, offsetY);
  this._talkCallback = null;
  this._wanders = false;
  this._wanderloop = null;
  this._mapScreen = null;
}
NPC.prototype = {
  step: function(deltaX, deltaY) {
    var canMove = this.canMove(this._mapScreen, deltaX, deltaY);
    this.setFacing(deltaX, deltaY);

    var numAnimFrames = 5; // TODO don't hardcode

    if (canMove) {
      var self = this;
      var stepAnim = this.makeStepAnimation(this._mapScreen,
                                            numAnimFrames,
                                            deltaX, deltaY);
      this._mapScreen.animate(stepAnim);
    } else {
      // just turn to face the direction without moving
      this.turn(deltaX, deltaY);
    }

  },

  wander: function(mapScreen) {
    this._mapScreen = mapScreen;
    this._wanders = true;

    var spriteSheetRow = 2; // HAXXX

    // TODO set the canCross method to some reasonable default!!!
  },

  sleep: function() {
    if (this._wanderloop) {
      window.clearInterval(this._wanderloop);
    }
    this._wanderloop = null;
  },

  wake: function() {
    // TODO maybe it would make more sense to share one wanderloop
    // for all NPCs rather than a separate wanderloop for each!!!

    var self = this;
    if (this._wanders) {
      this._wanderloop = window.setInterval(function() {
        if (Math.random() > 0.5) {
          var dir = Math.floor( 4 * Math.random());
          switch(dir) {
          case 0:
            self.step(0, -1);
            break;
          case 1:
            self.step(1, 0);
            break;
          case 2:
            self.step(0, 1);
            break;
          case 3:
            self.step(-1, 0);
            break;
          }
        }
      }, 1000);
    }
  },

  onTalk: function(callback) {
    this._talkCallback = callback;
  },

  talk: function(dialoglog, player) {
    if (this._talkCallback) {
      if (this._wanders) {
        // turn to face speaker;
        var playerFacing = player.getAliveParty()[0].getFacing();
        this.turn((-1)*playerFacing.x, (-1)*playerFacing.y);
        // don't wander away while i'm talking to you!!
        dialoglog.occupyNPC(this);
      }
      this._talkCallback(dialoglog);
    }
  },

  turn: function(deltaX, deltaY){ 
    if (this._animationCallback) {
      this._animationCallback(deltaX, deltaY, 0);
      this._mapScreen.render();
    }
  }

};
MapSpriteMixin(NPC.prototype);

/* NPCs belong to a Map.
 * MapScreen only draws NPCs for the current Map.
 * An NPC on a square makes the square impassible! */

function TreasureChest(itemType, spriteSheet, width, height, offsetX, offsetY) {
  this.defineSprite(spriteSheet, width, height, offsetX, offsetY);
  this.setSprite(0, 0);

  this._itemType = itemType;
  this._taken = false;
}
TreasureChest.prototype = {
  wake: function() {
    // will be treated as NPCs so must satisfy NPC interface
  },
  sleep: function() {
  },
  
  talk: function(dialoglog, player) {
    if (!this._taken) {
      // give it to first character with open inventory slot...
      var self = this;
      player.findRoomForAnItem(dialoglog, self._itemType._name,
                               function(receiver) {
        dialoglog.scrollText(receiver.name + " got a " + self._itemType._name + "!");
        self._taken = true;
        self.setSprite(1, 0);
        receiver.gainItem(self._itemType);
      });
    } else {
      dialoglog.scrollText("It's empty. :-(");
    }
  },
};
MapSpriteMixin(TreasureChest.prototype);
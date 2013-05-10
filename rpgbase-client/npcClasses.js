// http://javascriptweblog.wordpress.com/2011/05/31/a-fresh-look-at-javascript-mixins/

function NPC(spriteSheet, width, height, offsetX, offsetY) {
  this.defineSprite(spriteSheet, width, height, offsetX, offsetY);
  this._talkCallback = null;
  this._wanders = false;
  this._animator = null;
  this._wanderloop = null;
  this._mapScreen = null;
}
NPC.prototype = {
  isAlive: function() {
    // unless they're a combatant, they can't die, but they need this
    // because plot() queries it.
    return true;
  },

  step: function(deltaX, deltaY) {
    // TODO duplicates a LOT of code from Player class. Maybe move
    // the "walking animation" to the MapSpriteMixin.
    var canMove = this.canMove(this._mapScreen, deltaX, deltaY);
    this.setFacing(deltaX, deltaY);

    var numAnimFrames = 5; // TODO don't hardcode

    if (canMove) {
      var self = this;

      var finishCallback = function() {
        self.setAnimationOffset({x: 0, y: 0});
        self.move(self._mapScreen, deltaX, deltaY);
        self._mapScreen.render(); // TODO have animator attached to
        // map screen and have it render map screen once after each
        // frame? Otherwise if multiple people are walking around we're
        // over-rendering.
      };
      var frameCallback = function(currFrame) {
        var pixels = currFrame * 16 / numAnimFrames;
        var offset = {
          x: pixels * deltaX,
          y: pixels * deltaY,
        };
        self.setAnimationOffset(offset);
        self._animationCallback(deltaX, deltaY, currFrame);
        self._mapScreen.render();
      };

      var stepAnim = new Animation(numAnimFrames, frameCallback,
                                  finishCallback);
      this._animator.runAnimation(stepAnim);
    } else {
      // just turn to face the direction without moving
      turn(deltaX, deltaY);
    }

  },

  wander: function(mapScreen, animator) {
    this._mapScreen = mapScreen;
    this._wanders = true;
    this._animator = animator;

    var frameCount = 0;
    var spriteSheetRow = 2; // HAXXX
    // TODO standardize this walkAnimation thing!!
    // maybe attach it to a SpriteSheet object which we create
    // ONCE and use for many PCs and NPCs...
    this.walkAnimation(function(deltaX, deltaY, frame) {
      frameCount += 1;
      var walkFrame = (Math.floor(frameCount / 3) % 2);
      // switch sprite every 3 animation frames
      if (deltaX < 0) {
        this.setSprite(6+walkFrame, spriteSheetRow);
      }
      if (deltaX > 0) {
        this.setSprite(2 +walkFrame, spriteSheetRow);
      }
      if (deltaY < 0) {
        this.setSprite(4+walkFrame, spriteSheetRow);
      }
      if (deltaY > 0) {
        this.setSprite(0+walkFrame, spriteSheetRow);
      }
      
    });

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

    // maybe we should require a reference to the animator whenever
    // creating a map screen sprite? just a thought.

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

  talk: function(dialoglog, playerFacing) {
    if (this._talkCallback) {
      if (this._wanders) {
        // turn to face speaker;
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
MapSpriteMixin.call(NPC.prototype);

/* NPCs belong to a Map.
 * MapScreen only draws NPCs for the current Map.
 * An NPC on a square makes the square impassible! */
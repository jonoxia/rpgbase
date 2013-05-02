
// http://javascriptweblog.wordpress.com/2011/05/31/a-fresh-look-at-javascript-mixins/

function NPC(spriteSheet, width, height, offsetX, offsetY, wanders) {
  this.defineSprite(spriteSheet, width, height, offsetX, offsetY);
  this._wanders = wanders;
  this._talkCallback = null;
}
NPC.prototype = {
  isAlive: function() {
    // unless they're a combatant, they can't die, but they need this
    // because plot() queries it.
    return true;
  },

  onTalk: function(callback) {
    this._talkCallback = callback;
  },

  talk: function() {
    if (this._talkCallback) {
      this._talkCallback();
      // will probably be a call to the non-battle menu system
    }
  }

  /* some kind of onTick that makes wandering ones wander around? */
};
MapSpriteMixin.call(NPC.prototype);

/* TODO:  NPCs belong to a Map.
 * MapScreen only draws NPCs for teh current Map.
 * An NPC on a square makes the square impassible! */
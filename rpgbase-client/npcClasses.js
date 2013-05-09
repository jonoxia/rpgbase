function NonCombatMenuSystem() {
  // TODO - support both CSS menus and Canvas menus?
}
NonCombatMenuSystem.prototype = {

  // TODO this shares a lot of code with battle system's menus
  // actually factor that out and start with it.
  // userland should be able to customize both battle and nonbattle
  // menus at the same time, since they probably want the same style.
};




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

  talk: function(dialoglog) {
    if (this._talkCallback) {
      this._talkCallback(dialoglog);
    }
  }

  /* some kind of onTick that makes wandering ones wander around? */
};
MapSpriteMixin.call(NPC.prototype);

/* NPCs belong to a Map.
 * MapScreen only draws NPCs for the current Map.
 * An NPC on a square makes the square impassible! */
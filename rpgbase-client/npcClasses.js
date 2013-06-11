// http://javascriptweblog.wordpress.com/2011/05/31/a-fresh-look-at-javascript-mixins/

function NPC(spriteSheet, mapScreen, width, height, offsetX, offsetY) {
  this.defineSprite(spriteSheet, width, height, offsetX, offsetY);
  this._talkCallback = null;
  this._wanders = false;
  this._wanderloop = null;
  this._mapScreen = mapScreen;
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

  wander: function() {
    this._wanders = true;
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
      // turn to face speaker;
      var playerFacing = player.getAliveParty()[0].getFacing();
      this.turn((-1)*playerFacing.x, (-1)*playerFacing.y);
      if (this._wanders) {
        // don't wander away while i'm talking to you!!
        dialoglog.occupyNPC(this);
      }
      this._talkCallback(dialoglog, player);
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

function makeShop(spriteSheet, mapScreen, width, height,
                  offsetX, offsetY, spriteX, spriteY, inventory) {

  // expects inventory argument to be like this:
  /*  var inventory = [{item: coolsword, price: 500},
                       {item: ether, price: 120},
                       {item: potion, price: 90},
                       {item: coolarmor, price: 850}]; */

  var shopkeeper = new NPC(spriteSheet, mapScreen, width, height,
                           offsetX, offsetY);
  
  // String padding to make item names and prices line up nicely:
  var longestString = 0;
  var strLens = [];
  for (var i = 0; i < inventory.length; i++) {
    var strLen = inventory[i].item.getName().length;
    strLen += (" " + inventory[i].price).length;
    if (strLen > longestString) {
      longestString = strLen;
    }
    strLens.push(strLen);
  }

  var textRows = [];
  for (var i = 0; i < inventory.length; i++) {
    var textRow = inventory[i].item.getName() + " ";
    for (var j = 0; j < (longestString - strLens[i]); j++) {
      textRow += " ";
    }
    textRow += inventory[i].price;
    textRows.push(textRow);
  }

  function doPurchase(dialog, player, character, itemType) {
    // TODO check that you have
    // sufficient money. (For this, money needs to be a thing.)
    if (character.inventoryIsFull()) {
      dialog.scrollText(character.name + "'s hands are full. Come back later.");
    } else {
      character.gainItem(itemType);
      dialog.showMsg("Thank you, come again");
      dialog.popMenu();
    }
  }


  shopkeeper.onTalk(function(dialog, player) {
    dialog.open(player.party);
    dialog.showMsg("Hey welcome to my shop!");
    var menu = dialog.makeMenu();
    menu.setTitle("Stuff For Sale");

    for (var i = 0; i < inventory.length; i++) {
      var itemType = inventory[i].item;
      var price = inventory[i].price;
      var menuText = textRows[i];
      (function(itemType) {
        menu.addCommand(menuText,
                        function() {
                          dialog.chooseCharacter("Who will hold it?",
                            function(character) {
                              doPurchase(dialog, player,
                                         character, itemType);
                            });
                        });
      })(itemType);
    }
    dialog.pushMenu(menu);
  });
  shopkeeper.setSprite(spriteX, spriteY);
  return shopkeeper;
}

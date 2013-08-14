// http://javascriptweblog.wordpress.com/2011/05/31/a-fresh-look-at-javascript-mixins/

function NPC(spriteSheet, mapScreen) {
  this.defineSprite(spriteSheet,
                    this.spriteDimensions.width,
                    this.spriteDimensions.height,
                    this.spriteDimensions.offsetX,
                    this.spriteDimensions.offsetY);
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
        dialoglog.scrollText(receiver.name + " obtained " + self._itemType._name + "!");
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

function MoneyChest(resource, amount, spriteSheet, width, height, offsetX, offsetY) {
  this.defineSprite(spriteSheet, width, height, offsetX, offsetY);
  this.setSprite(0, 0);

  this._resource = resource;
  this._amount = amount;
  this._taken = false;
}
MoneyChest.prototype = {
  wake: function() {
    // will be treated as NPCs so must satisfy NPC interface
  },
  sleep: function() {
  },
  
  talk: function(dialoglog, player) {
    if (!this._taken) {
      player.gainResource(this._resource, this._amount);
      this._taken = true;
      this.setSprite(1, 0);
      dialoglog.showPartyResources(player, this._resource);
      dialoglog.scrollText("You found " + this._amount + " "
                           + this._resource + "!");
    } else {
      dialoglog.scrollText("It's empty. :-(");
    }
  },
};
MapSpriteMixin(MoneyChest.prototype);


function makeShop(spriteSheet, mapScreen, width, height,
                  offsetX, offsetY, spriteX, spriteY, inventory,
                  denomination, shopMessage) {

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
    if (!inventory[i].price) {
	// use default price if not specified
	inventory[i].price = inventory[i].item.getDefaultPrice();
    }
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

  function doPurchase(dialog, player, character, entry) {
    var itemType = entry.item;
    var price = entry.price;
    if (character.inventoryIsFull()) {
      dialog.scrollText(character.name + "'s hands are full. Come back later.");
    } else {
      player.spendResource(denomination, price);
      character.gainItem(itemType);
      dialog.popMenu();
      dialog.scrollText("Thank you, come again");
    }
  }

  function chooseItemToSell(dialog, player, character, item) {
    var salePrice = Math.floor(item.reference.getDefaultPrice() / 2);
    dialog.showMsg("Sell " + item.name
                   + " for " + 
                   salePrice + 
                   denomination + " ?");
    dialog.yesOrNo(function(choice) {
      if (choice) {
        character.loseItem(item.reference);
        player.gainResource(denomination,
                            salePrice);
        dialog.showMsg("Thank you!");
      }
      dialog.popMenu();
      dialog.popMenu();
    });
  }

  function buyMenu(dialog, player) {
    var menu = dialog.makeMenu();
    menu.setTitle("Buy");
    for (var i = 0; i < inventory.length; i++) {
      var menuText = textRows[i];
      (function(entry) {
        menu.addCommand(menuText,
                        function() {
                          if (player.hasResource(denomination, 
                                                 entry.price)) {
                          dialog.chooseCharacter("Who will hold it?",
                            function(character) {
                              doPurchase(dialog, player,
                                         character, entry);
                            });
                          } else {
                            dialog.scrollText("You can't afford that, sorry.");
                          }
                        });
      })(inventory[i]);
    }
    dialog.pushMenu(menu);
  }

  function sellMenu(dialog, player) {
    dialog.chooseCharacter("Who will sell?", function(seller) {
      var menu = dialog.makeMenu();
      menu.setTitle("Sell what?");
      
      var itemCmds = seller.getInventoryCmds(false);
      for (var i = 0; i < itemCmds.length; i++) {
        (function(saleItem) {
          menu.addCommand(saleItem.name,
                          function() {
                            chooseItemToSell(dialog,
                                             player,
                                             seller, 
                                             saleItem);
                          });
        })(itemCmds[i]);
      }
      dialog.pushMenu(menu);
    });
  }

  shopkeeper.onTalk(function(dialog, player) {
    dialog.open(player);
    dialog.showPartyResources(player, denomination);
    dialog.showMsg(shopMessage);

    var menu = dialog.makeMenu();
    menu.addCommand("buy", function() {
      buyMenu(dialog, player);
    });
    menu.addCommand("sell", function() {
      sellMenu(dialog, player);
    });
    dialog.pushMenu(menu);
  });
  
  shopkeeper.setSprite(spriteX, spriteY);
  return shopkeeper;
}

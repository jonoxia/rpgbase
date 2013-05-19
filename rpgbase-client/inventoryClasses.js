// PlayerCharacter gets an Inventory
// Inventory contains Items
// Items can be usable and/or equippable
// distinction between an item type and an individual instance
// i.e. a type is Medical Herb, you can have like ten of them
// so, an instantiate method like with monsters?

// equippable items have stat blocks? (that are applied as pluses and minuses?)
// what slot they go in (i.e. displacing anything previously in that slot)
// who can equip them

// usable items are usable only once or many times
// usable just in battle, just on map screen, or both?

// I guess there are also some items which are neither useable nor equippable but only plot triggers (no wait they could be infinite use, and the use just display sa message.)

// the Use of a usable item is kind of like a BatCmd isn't it? Requires a target choice and so on...
// oh oh on ok.  The useInBattle is a batCmd. useOutOfBattle is a mapCmd (see menuClasses.js)  Define one, the other, both, or neither.

function Inventory(limit) {
  // items with same name stack?
  // per individual character or shared for whole party?
  // can we sort it? give items to other characters?
  // maximum number of items that can be held?
  this._limit = limit;
  this._itemList = [];
}
Inventory.prototype = {
  gainItem: function(itemType) {
    // returns false if item cannot be gained
    if (this._itemList.length >= this._limit) {
      return false;
    }
    var instance = itemType.instantiate(this);
    this._itemList.push(instance);
    return true;
  },

  removeItem: function(instance) {
    var index = this._itemList.indexOf(instance);
    if (index > -1) {
      this._itemList.splice(index, 1);
    }
  },

  getList: function() {
    return this._itemList;
  },

  makeBattleCommand: function(item) {
    // TODO let's do battle commands later, because they're complicated,
    // because they require customizing a particular PC to have a
    // command set different from the other PCs, and they require the
    // batCmd hierarchy to be dynamically generated rather than
    // static (it could change every round of battle) and somewhere
    // in there the battle system needs to query the inventory somehow
  },

  makeNonBattleCommand: function(item, menuSystem, character) {
    if (!item.canUseInField()) {
      return function() {
        menuSystem.showMsg(character.name 
                           + " tries to use the "
                           + item.getName()
                           + "... but nothing happens.");
        menuSystem.returnToRoot();
      }
    }

    if (item.getTargetType() == "ally") {
        return function() {
          menuSystem.chooseCharacter(function(target) {
            item.useInField(menuSystem, character, target);
            menuSystem.returnToRoot();
          });
        }
    } else {
      // TODO are there other target types?
      return function() {
        item.useInField(menuSystem, character, null);
        menuSystem.returnToRoot();
      }
    }
  },

  makeMenu: function(menuSystem, isBattle, character) {
    var menu = menuSystem.makeMenu();
    for (var i = 0; i < this._itemList.length; i++) {
      var execFunc;
      if (isBattle) {
        execFunc = this.makeBattleCommand(this._itemList[i],
                                          menuSystem, character);
      } else {
        execFunc = this.makeNonBattleCommand(this._itemList[i], 
                                             menuSystem, character);
      }
      menu.addCommand(this._itemList[i].getName(), execFunc);
    }
    // creates a menu using menuSystem with one choice for each item in 
    // this inventory
    return menu;
    // TODO: share as much code as possible between in-battle inventory and out-of-battle inventory!  the key difference i suppose is that in-battle inventory locks in the command, while out-of-battle just does the thing now.
  }
};


function ItemType(name, numUses) {
  // can be used infinity times if numUses is not provided.
  this._name = name;
  if (numUses) {
    this._numUses = numUses;
  } else {
    this._numUses = null;
  }
  this._battleEffect = null;
  this._fieldEffect = null;
  this._equipSlot = null;
  this._equipStats = null;
}
ItemType.prototype = {
  instantiate: function(inventory) {
    var instance = new ItemInstance(this._name, this._numUses,
                            this._battleEffect, this._battleTarget,
                            this._fieldEffect,
                            this._equipSlot, this._equipType, this._equipStats);
    instance.inventory = inventory;
    return instance;
  },

  inBattleEffect: function(options) {
    this._battleTarget = options.target;
    this._battleEffect = options.effect;
  },

  outOfBattleEffect: function(cmd) {
    this._fieldEffect = cmd;
  },

  useEffect: function(options) {
    // convenience method for making in battle effect and out of battle effect
    // the same
    if (options.inBattle) {
      this.inBattleEffect(options);
    }
    if (options.outOfBattle) {
      this.outOfBattleEffect(options.effect);
    }
  },

  equippable: function(equipSlot, equipType, equipStats) {
    this._equipSlot = equipSlot;
    this._equipType = equipType;
    this._equipStats = equipStats;
    // equip stats must be a stat block. Other two are strings.
  }
};

function ItemInstance(name, numUses, battleEffect, battleTarget,
                      fieldEffect,
                      equipSlot, equipType, equipStats) {
  this._name = name;
  this._numUses = numUses;
  var self = this;
  
  this._battleEffect = battleEffect;
  this._fieldEffect = fieldEffect;
  this._target = battleTarget;
  // actually equippability is three things:
  // 1. equip slot
  // 2. who can equip  (item defines itself as "axe", PC says "i can use axes")
  // 3. stat modifiers
  if (equipSlot) {
    this._equipSlot = equipSlot;
    this._equipType = equipType;
    this._equipStats = equipStats;
  } else {
    this._equipSlot = null;
    this._equipType = null;
    this._equipStats = null;
  }
  
}
ItemInstance.prototype = {
  getName: function() {
    return this._name;
  },

  getTargetType: function() {
    return this._target;
  },

  checkUsesLeft: function() {
    if (this._numUses != null) {
      this._numUses -= 1;
      if (this._numUses <= 0) {
        this.inventory.removeItem(this);
      }
    }
  },

  canUseInBattle: function() {
    return (this._battleEffect != null);
  },

  canUseInField: function() {
    return (this._fieldEffect != null);
  },

  useInBattle: function(system, user, target) {
    if (this._battleEffect) {
      this.checkUsesLeft();
      this._battleEffect(system, user, target);
    }
  },

  useInField: function(system, user, target) {
    if (this._fieldEffect) {
      this.checkUsesLeft();
      this._fieldEffect(system, user, target);
    }
  },

  isEquippable: function() {
    return (this._equipType != null);
  },

  getEquipType: function() {
    return this._equipType;
  },

  getEquipSlot: function() {
    return this._equipSlot;
  },

  getEquipStats: function() {
    return this._equipStats;
  }
};
/*
var healingHerb = new ItemType("Healing Herb", 1);
healingHerb.useEffect({target: "ally",
                       inBattle: true,
                       outOfBattle: true,
                       effect: function(system, user, target) {
                         system.showMsg(user.name + " applies the medical herb to " + target.name);
                         system.sendEffect(target, "heal", {amount: rollDice(1, 6)});
                       }
                      });


var crummySword = new ItemType("Crummy Sword");
crummySword.equippable("1hand", "sword", {attack: 5});

pc.canEquip(["sword", "knife", "axe", "leather", "chain", "plate", "shield"]);
*/
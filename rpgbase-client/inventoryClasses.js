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
// oh oh oh ok.  The useInBattle is a batCmd. useOutOfBattle is a mapCmd (see menuClasses.js)  Define one, the other, both, or neither.


// global map of item names to ItemType instances, because we
// need these to re-instantiate your items on reloading a saved
// game.
var g_inventoryHack = {};

function Inventory(limit) {
  // items with same name stack?
  // per individual character or shared for whole party?
  // can we sort it? give items to other characters?
  // maximum number of items that can be held?
  this._limit = limit;
  this._itemList = [];
}
Inventory.prototype = {
  serializableClassName: "Inventory",
  serializableFields: ["_limit"],

  onSerialize: function(jsonobj) {
    jsonobj.itemList = [];
    for (var i = 0; i < this._itemList.length; i++) {
      // just remember the names of the items
      jsonobj.itemList.push(this._itemList[i].getName());
      // TODO: numUses should be stored too if we want
      // to have items with neither 1 nor infinity uses
    }
  },
  
  onDeserialize: function(jsonobj) {
    // Re-instantiate the items from their stored names
    for (var i = 0; i < jsonobj.itemList.length; i++) {
      var name = jsonobj.itemList[i];
      var itemType = g_inventoryHack[name];
      this.gainItem(itemType);
    }
  },

  gainItem: function(itemType) {
    // returns false if item cannot be gained
    if (this.isFull()) {
      return false;
    }
    this.gainInstance(itemType.instantiate());
    return true;
  },

  gainInstance: function(instance) {
    this._itemList.push(instance);
    instance.inventory = this;
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
    return {name: item.getName(),
            target: item.getTargetType(),
            effect: function(system, user, target) {
              item.useInBattle(system, user, target);
            },
            reference: item
           };
  },

  makeNonBattleCommand: function(item) {
    return {name: item.getName(),
            target: item.getTargetType(),
            effect: function(system, user, target) {
              item.useInField(system, user, target);
            },
            reference: item
           };
  },

  getItemNamesAndUses: function(isBattle) {
    // to avoid having dependency with the menu system or battle
    // system, just return {name, target, effect} objects (suitable for
    // passing into BatCmd constructor OR for immediate execution)
    var namesAndUses = [];
    var itemCmd;
    for (var i = 0; i < this._itemList.length; i++) {
      if (isBattle) {
        itemCmd = this.makeBattleCommand(this._itemList[i]);
      } else {
        itemCmd = this.makeNonBattleCommand(this._itemList[i]);
      }
      namesAndUses.push(itemCmd);
    }
    return namesAndUses;
  },

  isFull: function() {
    return (this._itemList.length >= this._limit);
  },

  getItemByName: function(name) {
    // If it contains an item with the given name, then returns a
    // reference to it. otherwise returns null.
    for (var i = 0; i < this._itemList.length; i++) {
      if (this._itemList[i].getName() == name) {
        return this._itemList[i];
      }
    }
    return null;

  },

  hasMultiple: function(name, number) {
    // returns true if you have at least <number> of the named item,
    // otherwise false.
    var copiesFound = 0
    for (var i = 0; i < this._itemList.length; i++) {
      if (this._itemList[i].getName() == name) {
        copiesFound ++;
      }
    }
    return (copiesFound >= number);
  }
};
SerializableMixin(Inventory);

function ItemType(name, numUses, defaultPrice) {
  // can be used infinity times if numUses is not provided.
  this._name = name;
  if (numUses) {
    this._numUses = numUses;
  } else {
    this._numUses = null;
  }
  if (defaultPrice) {
    this._defaultPrice = defaultPrice;
  } else {
    this._defaultPrice = 0;
  }
  this._targetType = "self"; // default target type if no other is set
  // (prevent errors from having undefined target)
  this._battleEffect = null;
  //this._fieldEffect = null;
  this._equipSlot = null;
  this._equipStats = null;
  this._equipQualities = null;

  // register item type globally
  g_inventoryHack[name] = this;
}
ItemType.prototype = {
  instantiate: function() {
    var instance = new ItemInstance(this._name, this._numUses,
                                    this._battleEffect, this._targetType,
                                    this._fieldEffect,
                                    this._equipSlot, this._equipType,
                                    this._equipStats, this._equipQualities,
                                    this._defaultPrice);

    // TODO apply this in a more organized way
    instance.sortOrder = this.sortOrder;
    // For instance, if we could make the ItemType into the prototype of all
    // itemInstances, we wouldn't even have to copy any of the static data to
    // the instance...
    // Failing that, have a "metadata" dictionary that always gets copied to
    // instances, and make sortOrder just a part of metadata.
    // (defaultPrice could also be metadata)

    return instance;
  },

  getDefaultPrice: function() {
    return this._defaultPrice;
  },

  inBattleEffect: function(options) {
    this._targetType = options.target;
    this._battleEffect = options.effect;
  },

  outOfBattleEffect: function(options) {
    if (options.target) {
      this._targetType = options.target;
    }
    this._fieldEffect = options.effect;
  },

  useEffect: function(options) {
    // convenience method for making in battle effect and out of battle effect
    // the same
    if (options.inBattle) {
      this.inBattleEffect(options);
    }
    if (options.outOfBattle) {
      this.outOfBattleEffect(options);
    }
  },

  equippable: function(equipSlot, equipType, equipStats) {
    this._equipSlot = equipSlot;
    this._equipType = equipType;
    this._equipStats = equipStats;
    // equip stats must be a stat block. Other two are strings.
  },

  setEquipQuality: function(qualityName, qualityValue) {
    // this could be rolled into .equippable() but i'm leaving it separate for now
    // for backwards compatibility.
    if (! this._equipQualities) {
      this._equipQualities = {};
    }
    this._equipQualities[qualityName] = qualityValue;
  },

  getName: function() {
    return this._name;
  }
};

function ItemInstance(name, numUses, battleEffect, targetType,
                      fieldEffect,
                      equipSlot, equipType, equipStats, equipQualities,
                      defaultPrice) {
  this._name = name;
  this._defaultPrice = defaultPrice;
  this._numUses = numUses;
  var self = this;
  
  this._battleEffect = battleEffect;
  this._fieldEffect = fieldEffect;
  this._target = targetType;
  // actually equippability is three things:
  // 1. equip slot
  // 2. who can equip  (item defines itself as "axe", PC says "i can use axes")
  // 3. stat modifiers
  // 4. equip qualities (like "gain immunity to poison" or whatever)
  if (equipSlot) {
    this._equipSlot = equipSlot;
    this._equipType = equipType;
    this._equipStats = equipStats;
    this._equipQualities = equipQualities;
  } else {
    this._equipSlot = null;
    this._equipType = null;
    this._equipStats = null;
    this._equipQualities = null;
  }
  /* LONGTERM TODO rather than having itemType and itemInstance, and all this logic
   * that copies data from the former to the latter, maybe itemInstance could just have
   * its prototype set to the itemType instance and override only the stateful data
   * (numUses) ? */
}
ItemInstance.prototype = {
  serializableClassName: "Item",
  serializableFields: ["_name", "_defaultPrice", "_numUses"],

  // TODO battleEffect and fieldEffect are references to things
  // defined elsewhere; the Item doesn't own them. In fact, it
  // might be better to just store the item name and 
  // re-instantiate the item on game load.

  isConsumable: function() {
    return (this._numUses != null);
  },
  getName: function() {
    return this._name;
  },

  getDefaultPrice: function() {
    return this._defaultPrice;
  },

  getTargetType: function() {
    return this._target;
  },

  consume: function() {
    console.log(this._name + " is consumed");
    if (this._numUses != null) {
      console.log(this._name + " is limited use");
      this._numUses -= 1;
      if (this._numUses <= 0) {
	  console.log(this._name + " is out of uses.");
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
      var used = this._battleEffect(system, user, target);
      if (used) {
          this.consume();
      }
    } else {
      system.showMsg(user.name 
                     + " TRIES TO USE THE "
                     + this._name
                     + "... BUT NOTHING HAPPENS.");
    }
  },

  useInField: function(system, user, target) {
      console.log("Use in field: " + this._name);
    if (this._fieldEffect) {
	console.log("This item has a field effect...");
      var used = this._fieldEffect(system, user, target);
      if (used) {
          this.consume();
      }
    } else {
      system.showMsg(user.name 
                     + " TRIES TO USE THE "
                     + this._name
                     + "... BUT NOTHING HAPPENS.");
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
  },

  getEquipStat: function(statName, character) {
    if (this._equipStats.hasOwnProperty(statName)) {
      // this._equipStats[statName] is either a number or a function.
      // (the function version lets us implement variable or scaling equipment)
      // if it's a function, call it:
      var stat = this._equipStats[statName];
      if (typeof stat === "function") {
        return stat.call(this, character);
      }
      return stat;
    } else {
      return 0;
    }
  },

  getEquipQuality: function(qualityName) {
    // equip qualities are a key-value store for things like "does fire type damage" or
    // "makes you immune to poison"
    if (this._equipQualities) {
      if (this._equipQualities.hasOwnProperty(qualityName)) {
        return this._equipQualities[qualityName];
      }
    }
    return null;
  }
};
SerializableMixin(ItemInstance);
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

/* TODO may need to rewrite the equip rules slightly so that
 * instead of telling an item "go into the slot you like going into", we can instead say
 * "hey item, can you go into this slot?" and if the itme says "yes" then we can say
 * "put item into slot x". */

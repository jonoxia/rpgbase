function instantAnim(anim) {
    // todo copypastad from MoonSerpentSpec.js -- move to animation class itself?
    for (i = 0; i < anim.finishCallbacks.length; i++) {
        anim.finishCallbacks[i]();
    }
}

function genericRPGSetup() {
  var gameEngine = new GenericRPG("mapscreen-canvas");
  // Now we would normally call _initEverything...
  var mapData = [[0]];
  gameEngine._initEverything({
    scaleFactor: 2,
    canvasWidth: 512/2,
    canvasHeight: 384/2,
    //fontImg: "font.png",
    //partyInit: setUpParty,
    battleInit: function() { return new BattleSystem(null, gameEngine.canvas, {}) },
    monsterInit: function() {},
    fieldMenuInit: function() { return new FieldMenu(null, null, 512/2, 384/2,
                                                     []); },// must return something},
    overworldInit: function(engine) {
      return new Map("Overworld", mapData, "overworldsprites") 
    },
    mapFrameRate: 40, // milliseconds between frames
    mazeFrameRate: 100});
  
  // seems we are adding a menu mode that is empty?
  
  gameEngine.player = new Player();
  gameEngine.mapScreen.setNewDomain(gameEngine.overworld);
  gameEngine.player.enterMapScreen(gameEngine.mapScreen, 0, 0);
  
  MapSprite.setDefault("spriteDimensions", {width: 16, height: 24,
                                            offsetX: 0, offsetY: -8});
  MapSprite.setDefault("walkAnimationFrames", 8);
  PlayerCharacter.prototype.spriteSheet = "spritesheet"; // loader.add("pc-sprites.png");
  
  // spriteSheet and spriteDimensions must be set before we can instantiate PlayerCharacter.
  
  var character = new PlayerCharacter();
  character.name = "dudebro";
  
  // Now we would normally setSprite, register handlers, etc etc.
  
  gameEngine.player.addCharacter(character);
  return gameEngine;
}


describe("GenericRPG save/restore feature", function() {
  /* A lot to do to make GenericRPG into something testable.
   * Not to mention, disentangling the truly generic stuff from the
   * Moonserpent stuff. There's a lot of tight coupling in moonserpent-main.js right
   * now. */

  it("Should retain party location when serialized/deserialized.", function() {
    var gameEngine = genericRPGSetup();
    var character = gameEngine.player.getParty()[0];
    character.setPos(128, 96);
    var gameData = gameEngine.serialize();

  
    var restoredGameEngine = genericRPGSetup();
    restoredGameEngine.restore(gameData);
    var pos = restoredGameEngine.player.getParty()[0].getPos();
    expect(pos.x).toEqual(128);
    expect(pos.y).toEqual(96);
  });

  it("Should retain vehicle locations when serialized/deserialized.", function() {

    var gameEngine = genericRPGSetup();
    var ship = new Vehicle();
    ship.setId("ship");
    var boat = new Vehicle();
    boat.setId("canoe");
    gameEngine.addVehicle(ship);
    gameEngine.addVehicle(boat);
    ship.setPos(32, 64);
    boat.setPos(64, 32);
    var gameData = gameEngine.serialize();

  
    var restoredGameEngine = genericRPGSetup();
    restoredGameEngine.restore(gameData);
    var restoredBoat = restoredGameEngine.getVehicle("canoe");
    var restoredShip = restoredGameEngine.getVehicle("ship");
    var pos = restoredBoat.getPos();
    expect(pos.x).toEqual(64);
    expect(pos.y).toEqual(32);
    pos = restoredShip.getPos();
    expect(pos.x).toEqual(32);
    expect(pos.y).toEqual(64);
  });


  it("Should remember whether party is on board ship", function() {
    var gameEngine = genericRPGSetup();
    var ship = new Vehicle();
    ship.setId("ship");
    gameEngine.addVehicle(ship);
    ship.embark(gameEngine.player);

    var gameData = gameEngine.serialize();

  
    var restoredGameEngine = genericRPGSetup();
    restoredGameEngine.restore(gameData);
    var restoredShip = restoredGameEngine.getVehicle("ship");
    expect(restoredShip._playerOnboard).toBe(restoredGameEngine.player);
    expect(restoredGameEngine.player.inVehicle).toBe(restoredShip);
  });

  // TODO test loading canoe onto ship and unloading off of ship into river
});

describe("GenericRPG battle system", function() {
    it("Shouldn't allow REPEAT if any of last round's commands can't be repeated", function() {
      // battleSystem.repeatLastRoundCommands() is the method
      // gotta lock in some commands first
      // Need to hack the showMsg function so a unit test can retrieve the message
      // being shown and verify its correctness.
      
      // in makeMenuForPC we have if (!cmd.canUse(pc)) to check. It always shows a
      // NOT ENOUGH MP message even though there may be other reasons...! Should fix
      // that too.
      
      // Another reason to disallow REPEAT is if the target for a non-random-target cmd
      // (i.e. a heal spell)  is now invalid (i.e. dead)

      var partyComList = new BattleCommandSet();
      partyComList.add("REPEAT", new BatCmd({
        effect: function(battle, party) {
          battle.repeatLastRoundCommands();
        }
      }));
      partyComList.add("COMBAT", new BatCmd({
        effect: function(battle, party) {
          battle.showFirstPCMenu();
        }
      }));

      var expensiveSpellCast = false;

      var comList = new BattleCommandSet();
      comList.add("ATTACK", new BatCmd({
        effect: function(battle, user) {
          battle.showMsg(user.name + " does a fight!");
        }
      }));
      comList.add("EXPENSIVE SPELL", new BatCmd({
        effect: function(battle, user) {
          battle.showMsg(user.name + " casts the expensive spell!");
          expensiveSpellCast = true;
        },
        cost: {resource: "mp", amount: 5}
      }));
            
      var canvas = $("#mapscreen-canvas")[0];
      var BS = new BattleSystem(null, canvas, {
        frameDelay: 0, // No animation, everything just happens instantly
        metaCmdSet: partyComList,
        metaCmdSetName: null,
        defaultCmdSet: comList
      });
      
      // disable drawing of battle:
      BS.draw = function() {};
      
      // todo set menuImpl to canvas or not?
      // Do we need to give the battlesyste functions like onRollInitiative?
      
      var player = new Player();
      var character = new PlayerCharacter();
      character.name = "dudebro";
      character.setStat("mp", 8); // enough to cast EXPENSIVE SPELL once but not twice
      player.addCharacter(character);

      var monsterType = new MonsterType(null, "BITEWORM",  {hp: 12, acc: 0,  str: 0, pow: 0, def: 0, agi: 0,  gps: 1,  exp: 1}, [comList.get("ATTACK")]);
      // I guess we need to create a player and a monstertype here
      var encounter = {number: 1, type: monsterType};
      var landType = 0; // don't care


      runs(function() {
        BS.startBattle(player, encounter, landType);
        BS.handleKey(DOWN_ARROW);
        expect(BS.getHilitedCmd().name).toEqual("COMBAT");
        BS.handleKey(CONFIRM_BUTTON);
        BS.handleKey(DOWN_ARROW);
        expect(BS.getHilitedCmd().name).toEqual("EXPENSIVE SPELL");
        BS.handleKey(CONFIRM_BUTTON);
        expect(expensiveSpellCast).toBe(true);
      });

      waitsFor(function() {
        return (BS.menuStack.length > 0);
      }, 5000); // Waits for new menu to appear at end of round

      runs(function() {
        expensiveSpellCast = false;
        expect(BS.getHilitedCmd().name).toEqual("REPEAT");
        BS.handleKey(CONFIRM_BUTTON);
      });

      waitsFor(function() {
        return (BS.menuStack.length > 0);
      }, 5000); // Waits for new menu to appear at end of round

      runs(function() {
        expect(expensiveSpellCast).toBe(false);
        expect(BS._lastMsgShown).toBe("NOT ENOUGH MP.");
        // Would be better if it said name + " HAS NOT ENOUGH MP TO CAST " + spell.
      });

      // TODO:
      // An additional test: make a command that's only valid on certain targets,
      // like a "CAN'T HEAL THE DEAD" limitation, try casting it on legal target, then
      // making target illegal, then use REPEAT and see that we get back the
      // CAN'T HEAL THE DEAD message instead of the NOT ENOUGH MP message.

    });

    it("Should consume consumable items used in combat", function() {
      var comList = new BattleCommandSet();
      comList.add("ATTACK", new BatCmd({
        effect: function(battle, user) {
          battle.showMsg(user.name + " does a fight!");
        }
      }));
      comList.add("EXPENSIVE SPELL", new BatCmd({
        effect: function(battle, user) {
          battle.showMsg(user.name + " casts the expensive spell!");
          expensiveSpellCast = true;
        },
        cost: {resource: "mp", amount: 5}
      }));
            
      var canvas = $("#mapscreen-canvas")[0];
      var BS = new BattleSystem(null, canvas, {
        frameDelay: 0, // No animation, everything just happens instantly
        defaultCmdSet: comList
      });
      
      // disable drawing of battle:
      BS.draw = function() {};
      
      var player = new Player();
      var character = new PlayerCharacter();
      character.name = "dudebro";
      character.setStat("mp", 8); // enough to cast EXPENSIVE SPELL once but not twice
      player.addCharacter(character);

      var monsterType = new MonsterType(null, "BITEWORM",  {hp: 12, acc: 0,  str: 0, pow: 0, def: 0, agi: 0,  gps: 1,  exp: 1}, [comList.get("ATTACK")]);
      // I guess we need to create a player and a monstertype here
      var encounter = {number: 1, type: monsterType};
      
      var herbUsed = false;

      var healingHerb = new ItemType("HERB", 1);
      healingHerb.useEffect({target: "ally",
                             inBattle: true,
                             outOfBattle: true,
                             effect: function(system, user, target) {
                               system.showMsg(user.name + " applies the medical herb to " + target.name);
                               herbUsed = true;
                               return true; // herb used up
                             }
                            });

      character.gainItem(healingHerb);

      // ok 
      runs(function() {
        BS.startBattle(player, encounter, 0); // don't care about land type
        BS.handleKey(DOWN_ARROW);
        BS.handleKey(DOWN_ARROW);
        // use the herb on myself:
        expect(BS.getHilitedCmd().name).toEqual("ITEM");
        BS.handleKey(CONFIRM_BUTTON);
        expect(BS.getHilitedCmd().name).toEqual("HERB");
        BS.handleKey(CONFIRM_BUTTON);
        expect(BS.getHilitedCmd().name).toEqual("dudebro");
        BS.handleKey(CONFIRM_BUTTON);
      });

      waitsFor(function() {
        return (BS.menuStack.length > 0);
      }, 5000); // Waits for new menu to appear at end of round

      runs(function() {
        expect(herbUsed).toBe(true);
        
        herbUsed = false;
        BS.handleKey(DOWN_ARROW);
        BS.handleKey(DOWN_ARROW);
        expect(character._inventory.getList().length).toEqual(0); // this fails too
        expect(BS.getHilitedCmd().name).toEqual("ITEM");
        BS.handleKey(CONFIRM_BUTTON);
        expect(BS.getHilitedCmd().name).toEqual("NOTHING");
      });
      
    });

    it("should list duplicate items separately", function() {
      // Get two of the same item, test that it appears twice in 
      // the item command menu...!

      var comList = new BattleCommandSet();
      comList.add("ATTACK", new BatCmd({
        effect: function(battle, user) {
          battle.showMsg(user.name + " does a fight!");
        }
      }));
      comList.add("EXPENSIVE SPELL", new BatCmd({
        effect: function(battle, user) {
          battle.showMsg(user.name + " casts the expensive spell!");
          expensiveSpellCast = true;
        },
        cost: {resource: "mp", amount: 5}
      }));
            
      var canvas = $("#mapscreen-canvas")[0];
      var BS = new BattleSystem(null, canvas, {
        frameDelay: 0, // No animation, everything just happens instantly
        defaultCmdSet: comList
      });
      
      // disable drawing of battle:
      BS.draw = function() {};
      
      var player = new Player();
      var character = new PlayerCharacter();
      character.name = "dudebro";
      character.setStat("mp", 8);
      player.addCharacter(character);

      var monsterType = new MonsterType(null, "BITEWORM",  {hp: 12, acc: 0,  str: 0, pow: 0, def: 0, agi: 0,  gps: 1,  exp: 1}, [comList.get("ATTACK")]);
      // I guess we need to create a player and a monstertype here
      var encounter = {number: 1, type: monsterType};
      
      var healingHerb = new ItemType("HERB", 1);
      healingHerb.useEffect({target: "ally",
                             inBattle: true,
                             outOfBattle: true,
                             effect: function(system, user, target) {
                               system.showMsg(user.name + " applies the medical herb to " + target.name);
                               herbUsed = true;
                             }
                            });

      character.gainItem(healingHerb);
      character.gainItem(healingHerb);

      
      BS.startBattle(player, encounter, 0); // don't care about land type
      BS.handleKey(DOWN_ARROW);
      BS.handleKey(DOWN_ARROW);
      
      expect(BS.getHilitedCmd().name).toEqual("ITEM");
      BS.handleKey(CONFIRM_BUTTON);
      
      var menu = BS.menuStack[BS.menuStack.length - 1];
      expect(menu.cmdList.length).toEqual(2);
      expect(menu.cmdList[0].name).toEqual("HERB");
      expect(menu.cmdList[1].name).toEqual("HERB");
    });

    // TODO And a test where you have a one-use item, you use it up, then you try
    // to REPEAT. what should happen?
});


describe("BattleCommandSet", function() {
  var set;
  
  beforeEach(function() {
    set = new BattleCommandSet();
    set.add("ATTACK", new BatCmd({
      effect: function(battle, user) {}
    }));
    set.add("SPELL", new BatCmd({
      effect: function(battle, user) {}
    }));
    set.add("ITEM", new BatCmd({
      effect: function(battle, user) {}
    }));
    set.add("RUN", new BatCmd({
      effect: function(battle, user) {}
    }));
  });

  it("Should support a foreach method with callback", function() {
  
    var calledWith = {"ATTACK": 0, "SPELL": 0, "ITEM": 0, "RUN": 0};
    
    set.forEach(function(name, cmd) {
      expect(name).toEqual(cmd.name);
      calledWith[cmd.name] ++;
    });

    expect(calledWith["ATTACK"]).toEqual(1);
    expect(calledWith["SPELL"]).toEqual(1);
    expect(calledWith["ITEM"]).toEqual(1);
    expect(calledWith["RUN"]).toEqual(1);

  });

  it("Should allow new cmd to be added even if it has same name", function() {
    
    var secondItemCalled = false;

    set.add("ITEM", new BatCmd({
      effect: function(battle, user) {
        secondItemCalled = true;
      }
    }));

    var numCmds = 0;
    set.forEach(function(name, cmd) {
      numCmds ++;
    });

    expect(numCmds).toEqual(5);
    // get should still return the first one though
    var itemCmd = set.get("ITEM");
    itemCmd.effect(null, {name: "user"}, {name: "target"});
    expect(secondItemCalled).toBe(false);
  
  });

  it("Should support a replace method", function() {
    var secondItemCalled = false;

    set.replace("ITEM", new BatCmd({
      effect: function(battle, user) {
        secondItemCalled = true;
      }
    }));

    var numCmds = 0;
    set.forEach(function(name, cmd) {
      numCmds ++;
    });

    expect(numCmds).toEqual(4);

    var itemCmd = set.get("ITEM");
    itemCmd.effect(null, {name: "user"}, {name: "target"});
    expect(secondItemCalled).toBe(true);

  });
  
});

describe("Map screen", function() {

  var dummyCanvas;
  var mapScreen;
  var player;
  var thisland;

  beforeEach(function() {
    dummyCanvas = document.createElement("canvas");
    var spriteSheet = "npcsprites";
    // make a small (16x16) map
          var mapData = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                         [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]];
    
    // make a map screen that shows 8x8 squares at a time
    mapScreen = new MapScreen(dummyCanvas,
                              8, 8, 32, 32, 50);
    
    thisland = new Map("thisland", mapData, spriteSheet) ;
    mapScreen.setNewDomain(thisland);

    MapSprite.setDefault("spriteDimensions", {width:16, height: 16, offsetX: 0, offsetY: 0});
    MapSprite.setDefault("walkAnimationFrames", 8);
    // Put a party with one character at 0, 0
    player = new Player();
    var character = new PlayerCharacter();
    character.spriteSheet = "not a sprite sheet";
    character.name = "dudebro";
    character.setStat("mp", 8); // Need to give them a sprite!
    player.addCharacter(character);
    player.enterMapScreen(mapScreen, 0, 0);
  });



  it("Shouldn't allow NPCs to move through each other", function() {
    var spriteSheet = "npcsprites";
    this.mapScreen = new MapScreen(dummyCanvas,
                                   dim.squaresX,
                                   dim.squaresY,
                                   dim.pixelsX,
                                   dim.pixelsY,
                                   animFrameTime);
    var town = new Map("Testy town", mapData, spriteSheet) ;
    
    // gameEngine.adNPCToTown?
    var npcOne = new NPC(spriteSheet, mapScreen);
    npcOne.setSprite(0, 0);
    town.addNPC(npcOne, 0, 0);
    var npcTwo = new NPC(spriteSheet, mapScreen);
    npcOne.setSprite(0, 1);
    town.addNPC(npcOne, 1, 1);
    // have npcOne walk right and npcTwo walk up
    // test that they do not both end up in square (1, 0)
  });

  it("Should block you at map borders by default", function() {
    // walk west, should bump into edge of map:
    var anim = player.move(-1, 0);
    instantAnim(anim);
    var pos = player.party[0].getPos();
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);

    // walk north, should bump into top of map:
    var anim = player.move(0, -1);
    instantAnim(anim);
    var pos = player.party[0].getPos();
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);

    // but walk right a bunch of times...
    for (var i = 1; i < 16; i++) {
        var anim = player.move(1, 0);
        instantAnim(anim);
        var pos = player.party[0].getPos();
        expect(pos.x).toBe(i);
        expect(pos.y).toBe(0);
    }
    // then walk right again, should bump into right edge of map:
    var anim = player.move(1, 0);
    instantAnim(anim);
    var pos = player.party[0].getPos();
    expect(pos.x).toBe(15);
    expect(pos.y).toBe(0);

    // walk down a bunch of times:
    for (var i = 1; i < 16; i++) {
        var anim = player.move(0, 1);
        instantAnim(anim);
        var pos = player.party[0].getPos();
        expect(pos.x).toBe(15);
        expect(pos.y).toBe(i);
    }

    // walk down again, should bump into bottom of map:
    var anim = player.move(0, 1);
    instantAnim(anim);
    var pos = player.party[0].getPos();
    expect(pos.x).toBe(15);
    expect(pos.y).toBe(15);
    
  });


  it("With x-wrap set to true, should wrap around west to east and east to west", function() {
    thisland.x_wrap = true;
    // TODO 

    // walk west, should wrap around to east side of map:
    var anim = player.move(-1, 0);
    instantAnim(anim);
    var pos = player.party[0].getPos();
    expect(pos.x).toBe(15);
    expect(pos.y).toBe(0);

    // walk north, should bump into top of map:
    var anim = player.move(0, -1);
    instantAnim(anim);
    var pos = player.party[0].getPos();
    expect(pos.x).toBe(15);
    expect(pos.y).toBe(0);

    // walk right, should wrap back around to left:

    var anim = player.move(1, 0);
    instantAnim(anim);
    var pos = player.party[0].getPos();
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);
  });

  // Other things to test:
  // impassible terrain on the other side of the map still blocks my step
  // i can still step into a vehicle on the other side of the international date line
  // i can open a treasure chest across the international date line (not that this ever comes up)
  // if party is split across the international date line, they all draw correctly
  // that vehicles can cross the international date line OK

  // OK to write this test I need a way to say "what land type is at
  // screen coordinate x, y right now?" which doesn't currently exist

});

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

      // An additional test: make a command that's only valid on certain targets,
      // like a "CAN'T HEAL THE DEAD" limitation, try casting it on legal target, then
      // making target illegal, then use REPEAT and see that we get back the
      // CAN'T HEAL THE DEAD message instead of the NOT ENOUGH MP message.

    });

    it("Should consume consumable items used in combat", function() {
    });
});

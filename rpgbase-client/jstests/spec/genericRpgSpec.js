
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


  it("Should remember whether canoe is loaded onto ship", function() {
    var gameEngine = genericRPGSetup();
    var ship = new Vehicle();
    ship.setId("ship");
    var boat = new Vehicle();
    boat.setId("canoe");
    gameEngine.addVehicle(ship);
    gameEngine.addVehicle(boat);
    ship.loadedCanoe = boat;

    var gameData = gameEngine.serialize();

  
    var restoredGameEngine = genericRPGSetup();
    restoredGameEngine.restore(gameData);
    var restoredBoat = restoredGameEngine.getVehicle("canoe");
    var restoredShip = restoredGameEngine.getVehicle("ship");
    expect(restoredShip.loadedCanoe).toBe(restoredBoat);
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

});

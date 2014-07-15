
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


describe("GenericRPG", function() {
  /* A lot to do to make GenericRPG into something testable.
   * Not to mention, disentangling the truly generic stuff from the
   * Moonserpent stuff. There's a lot of tight coupling in moonserpent-main.js right
   * now.
   * Let's get started. */
  it("Should retain party location when serialized/deserialized.", function() {

    // TOOD also create a vehicle, set its location
    // Set their locations
    var gameEngine = genericRPGSetup();
    var character = gameEngine.player.getParty()[0];
    character.setPos(128, 96);
    
    var gameData = gameEngine.serialize();
  


    var restoredGameEngine = genericRPGSetup();
    restoredGameEngine.restore(gameData);
    var pos = restoredGameEngine.player.getParty()[0].getPos();
    // TODO test that player and vehicle locations are as-saved.
    expect(pos.x).toEqual(128);
    expect(pos.y).toEqual(96);
  });

});

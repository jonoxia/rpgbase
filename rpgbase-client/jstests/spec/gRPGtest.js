describe("gRPG.GameEngine", function() {
  beforeEach(function() {
     /* <canvas id="mapscreen-canvas" width="512" height="384"> */
  });

  it("Should allow me to register and switch modes", function() {

    var engine = new gRPG.GameEngine($("#mapscreen-canvas"), 512, 384);
    var mapScreen = new gRPG.MapScreen();
    engine.addMode( "mapscreen", mapScreen);
    expect(engine.getModeByName("mapscreen")).toBe(mapScreen);

    var battleScreen = new gRPG.BattleScreen();
    engine.addMode( "battle", battleScreen);
    expect(engine.getModeByName("battle")).toBe(battleScreen);

    engine.mainMode("mapscreen");
    expect(engine.getActiveMode()).toBe(mapScreen);
    engine.mainMode("battle");
    expect(engine.getActiveMode()).toBe(battleScreen);
    
  });

  it("Should use defaults for settings i don't specify", function() {
    var mapScreen = new gRPG.MapScreen();
    expect(mapScreen.settings.scale).toEqual(1.0); // default
    expect(mapScreen.settings.pixelsPerSquare).toEqual(16); // default
    expect(mapScreen.settings.widthSquares).toEqual(20); // default
    expect(mapScreen.settings.heightSquares).toEqual(18); // default

    // now set some settings, should override that stuff
    mapScreen.setOptions({
      scale: 2.0,
      pixelsPerSquare: 24,
      widthSquares: 17,
      heightSquares: 13
    });

    expect(mapScreen.settings.scale).toEqual(2.0);
    expect(mapScreen.settings.pixelsPerSquare).toEqual(24);
    expect(mapScreen.settings.widthSquares).toEqual(17);
    expect(mapScreen.settings.heightSquares).toEqual(13);
  });

  it("Should propagate settings to modes", function() {
    var engine = new gRPG.GameEngine($("#mapscreen-canvas"), 512, 384);
    engine.setOptions({
      menuImpl: "css",
      menuBaseElem: $("#menu-base"),
      scale: 2.0
    });
    var mapScreen = new gRPG.MapScreen();
    engine.addMode( "mapscreen", mapScreen);
    var fieldMenu = new gRPG.FieldMenuSystem();
    engine.addMode( "fieldMenu", fieldMenu);

    // mapScreen should now be using mapscreen-canvas, with width=512 and height=384.
    // fieldMenu should be using CSS menus, based in #menu-base.
    expect(mapScreen.settings.htmlElem).toEqual($("#mapscreen-canvas"));
    expect(mapScreen.settings.scale).toEqual(2.0);
    expect(mapScreen.settings.screenWidth).toEqual(512);
    expect(mapScreen.settings.screenHeight).toEqual(384);

    expect(fieldMenu.settings.menuBaseElem).toEqual($("#menu-base"));
    expect(fieldMenu.settings.menuImpl).toEqual("css");

  });

  it("Should return me to the mode i was in before opening field menu", function() {
    // make a field menu, a map screen, and a maze screen
    var engine = new gRPG.GameEngine($("#mapscreen-canvas"), 512, 384);
    var mapScreen = new gRPG.MapScreen();
    engine.addMode("mapscreen", mapScreen);
    var mazeScreen = new gRPG.MazeScreen();
    engine.addMode("mazescreen", mazeScreen);
    var fieldMenu = new gRPG.FieldMenuSystem();
    engine.addMode("fieldMenu", fieldMenu);
    
    // switch to map screen
    // open field menu
    // close field menu
    // check that we're back in map screen
    // switch to maze screen
    // open field menu
    // close field menu
    // check that we're back in maze screen

    engine.mainMode("mapscreen");
    expect(engine.getActiveMode()).toBe(mapScreen);
    engine.openMode("fieldMenu");
    expect(engine.getActiveMode()).toBe(fieldMenu);
    engine.closeMode();
    expect(engine.getActiveMode()).toBe(mapScreen);

    engine.mainMode("mazescreen");
    expect(engine.getActiveMode()).toBe(mazeScreen);
    engine.openMode("fieldMenu");
    expect(engine.getActiveMode()).toBe(fieldMenu);
    engine.closeMode();
    expect(engine.getActiveMode()).toBe(mazeScreen);
  });

  it("Should direct input to the active mode", function() {
    var engine = new gRPG.GameEngine($("#mapscreen-canvas"), 512, 384);
    var mapScreen = new gRPG.MapScreen();
    engine.addMode("mapscreen", mapScreen);
    var mazeScreen = new gRPG.MazeScreen();
    engine.addMode("mazescreen", mazeScreen);
    var fieldMenu = new gRPG.FieldMenuSystem();
    engine.addMode("fieldMenu", fieldMenu);


    // stub out the handle key method, just make sure it's called:
    var mapScreenKeyPressed = null;
    var fieldMenuKeyPressed = null;
    mapScreen.handleKey = function(key) {
      mapScreenKeyPressed = key;
    };
    fieldMenu.handleKey = function(key) {
      fieldMenuKeyPressed = key;
    };
    
    runs(function() {
      engine.mainMode("mapscreen");
      // map screen should now be receiving input

      // fake an input:
      // TODO UPGRADE VERSION OF JQUERY BUNDLED IN RPGBASE
      $(document).trigger(new $.Event("keydown", {which: DOWN_ARROW}));
      $(document).trigger(new $.Event("keyup", {which: DOWN_ARROW}));
    });

    waits(500);

    runs(function() {
      expect(mapScreenKeyPressed).toEqual(DOWN_ARROW);

      mapScreenKeyPressed = null;

      // switch modes:
      engine.openMode("fieldMenu");
      
      // fake input:
      $(document).trigger(new $.Event("keydown", {which: DOWN_ARROW}));
      $(document).trigger(new $.Event("keyup", {which: DOWN_ARROW}));
    });

    waits(500);

    runs(function() {
      // input should have gone to field menu and not to map screen:
      expect(fieldMenuKeyPressed).toEqual(DOWN_ARROW);
      expect(mapScreenKeyPressed).toBeNull();
    });
  });

  it("Should activate/deactivate animators when switching modes", function() {

    var engine = new gRPG.GameEngine($("#mapscreen-canvas"), 512, 384);
    var mapScreen = new gRPG.MapScreen();
    engine.addMode("mapscreen", mapScreen);
    var mazeScreen = new gRPG.MazeScreen();
    engine.addMode("mazescreen", mazeScreen);
    var fieldMenu = new gRPG.FieldMenuSystem();
    engine.addMode("fieldMenu", fieldMenu);
    var battleScreen = new gRPG.BattleScreen();
    engine.addMode("battle", battleScreen);

    engine.mainMode("mapscreen");
    expect(mapScreen.animator._timer).not.toBeNull();
    expect(mazeScreen.animator._timer).toBeNull();
    // TODO maybe give the animator a isRunning method?

    engine.mainMode("mazescreen");
    expect(mapScreen.animator._timer).toBeNull();
    expect(mazeScreen.animator._timer).not.toBeNull();
    
    // start the field menu, it does not have its own animator,
    // so it should not stop the main mode animator:
    engine.openMode("fieldMenu");
    expect(mapScreen.animator._timer).toBeNull();
    expect(mazeScreen.animator._timer).not.toBeNull();

    engine.closeMode();
    expect(mapScreen.animator._timer).toBeNull();
    expect(mazeScreen.animator._timer).not.toBeNull();

    // but if i start a battle, it does have its own animator:
    engine.openMode("battle");
    expect(mapScreen.animator._timer).toBeNull();
    expect(mazeScreen.animator._timer).toBeNull();
    expect(battleScreen.animator._timer).not.toBeNull();

    // when i close the battle, main mode's animator should resume:
    engine.closeMode();
    expect(mapScreen.animator._timer).toBeNull();
    expect(mazeScreen.animator._timer).not.toBeNull();
    expect(battleScreen.animator._timer).toBeNull();

    // LONGTERM TODO what if the game engine just owned a single animator
    // that's always running?

  });
});

describe("gRPG.MapScreen", function() {
  it("should allow registering maps", function() {

    var engine = new gRPG.GameEngine($("#mapscreen-canvas"), 512, 384);
    var mapScreen = new gRPG.MapScreen();
    engine.addMode( "mapscreen", mapScreen);

    var overworld = new gRPG.TileMap([0, 0, 0, 0], "overworldtiles.png");
    var underworld = new gRPG.SingleImageMap([0, 0, 0, 0], "underworldmap.png");
    engine.getModeByName("mapscreen").addMap("overworld", overworld);
    engine.getModeByName("mapscreen").addMap("underworld", underworld);

    expect(engine.getModeByName("mapscreen").getMap("overworld")._tileset).toEqual("overworldtiles.png");
    expect(engine.getModeByName("mapscreen").getMap("underworld")._imagefile).toEqual("underworldmap.png");

    // maze screen can also register maps:

    var mazeScreen = new gRPG.MazeScreen();
    engine.addMode( "maze", mazeScreen);
    var spooky = new gRPG.TileMap([0, 0, 0, 0], "cavetiles.png");
    // neither tilemap nor singleimage map really makes any sense for first person maze screen
    // ... what kind of map do you use there?
    engine.getModeByName("maze").addMap("spookycave", spooky);
    expect(engine.getModeByName("maze").getMap("spookycave")._tileset).toEqual("cavetiles.png");
  });


});

describe("gRPG.GameEngine", function() {
  beforeEach(function() {
     /* <canvas id="mapscreen-canvas" width="512" height="384"> */

    // Stub out the drawing method -- don't want to actually draw during tests:
    MapScreen.prototype.render = function() {
    };
  });

  it("Should allow me to register and switch modes", function() {

    var engine = new gRPG.GameEngine($("#mapscreen-canvas"), 512, 384);
    var mapMode = new gRPG.MapMode();
    engine.addMode( "mapscreen", mapMode);
    expect(engine.getModeByName("mapscreen")).toBe(mapMode);

    var battleMode = new gRPG.BattleMode();
    engine.addMode( "battle", battleMode);
    expect(engine.getModeByName("battle")).toBe(battleMode);

    engine.mainMode("mapscreen");
    expect(engine.getActiveMode()).toBe(mapMode);
    engine.mainMode("battle");
    expect(engine.getActiveMode()).toBe(battleMode);
    
  });

  it("Should use defaults for settings i don't specify", function() {
    var mapMode = new gRPG.MapMode();
    expect(mapMode.settings.scale).toEqual(1.0); // default
    expect(mapMode.settings.pixelsPerSquare).toEqual(16); // default
    expect(mapMode.settings.widthSquares).toEqual(20); // default
    expect(mapMode.settings.heightSquares).toEqual(18); // default

    // now set some settings, should override that stuff
    mapMode.setOptions({
      scale: 2.0,
      pixelsPerSquare: 24,
      widthSquares: 17,
      heightSquares: 13
    });

    expect(mapMode.settings.scale).toEqual(2.0);
    expect(mapMode.settings.pixelsPerSquare).toEqual(24);
    expect(mapMode.settings.widthSquares).toEqual(17);
    expect(mapMode.settings.heightSquares).toEqual(13);
  });

  it("Should propagate settings to modes", function() {
    var engine = new gRPG.GameEngine($("#mapscreen-canvas"), 512, 384);
    engine.setOptions({
      menuImpl: "css",
      menuBaseElem: $("#menu-base"),
      scale: 2.0
    });
    var mapMode = new gRPG.MapMode();
    engine.addMode( "mapscreen", mapMode);
    var fieldMenu = new gRPG.MenuMode();
    engine.addMode( "fieldMenu", fieldMenu);

    // mapMode should now be using mapscreen-canvas, with width=512 and height=384.
    // fieldMenu should be using CSS menus, based in #menu-base.
    expect(mapMode.settings.htmlElem).toEqual($("#mapscreen-canvas"));
    expect(mapMode.settings.scale).toEqual(2.0);
    expect(mapMode.settings.screenWidth).toEqual(512);
    expect(mapMode.settings.screenHeight).toEqual(384);

    expect(fieldMenu.settings.menuBaseElem).toEqual($("#menu-base"));
    expect(fieldMenu.settings.menuImpl).toEqual("css");

  });

  it("Should return me to the mode i was in before opening field menu", function() {
    // make a field menu, a map screen, and a maze screen
    var engine = new gRPG.GameEngine($("#mapscreen-canvas"), 512, 384);
    var mapMode = new gRPG.MapMode();
    engine.addMode("mapscreen", mapMode);
    var mazeMode = new gRPG.MazeMode();
    engine.addMode("mazescreen", mazeMode);
    var fieldMenu = new gRPG.MenuMode();
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
    expect(engine.getActiveMode()).toBe(mapMode);
    engine.openMode("fieldMenu");
    expect(engine.getActiveMode()).toBe(fieldMenu);
    engine.closeMode();
    expect(engine.getActiveMode()).toBe(mapMode);

    engine.mainMode("mazescreen");
    expect(engine.getActiveMode()).toBe(mazeMode);
    engine.openMode("fieldMenu");
    expect(engine.getActiveMode()).toBe(fieldMenu);
    engine.closeMode();
    expect(engine.getActiveMode()).toBe(mazeMode);
  });

  it("Should direct input to the active mode", function() {
    var engine = new gRPG.GameEngine($("#mapscreen-canvas"), 512, 384);
    var mapMode = new gRPG.MapMode();
    engine.addMode("mapscreen", mapMode);
    var mazeMode = new gRPG.MazeMode();
    engine.addMode("mazescreen", mazeMode);
    var fieldMenu = new gRPG.MenuMode();
    engine.addMode("fieldMenu", fieldMenu);


    // stub out the handle key method, just make sure it's called:
    var mapModeKeyPressed = null;
    var fieldMenuKeyPressed = null;
    mapMode.handleKey = function(key) {
      mapModeKeyPressed = key;
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
      expect(mapModeKeyPressed).toEqual(DOWN_ARROW);

      mapModeKeyPressed = null;

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
      expect(mapModeKeyPressed).toBeNull();
    });
  });

  it("Should activate/deactivate animators when switching modes", function() {

    var engine = new gRPG.GameEngine($("#mapscreen-canvas"), 512, 384);
    var mapMode = new gRPG.MapMode();
    engine.addMode("mapscreen", mapMode);
    var mazeMode = new gRPG.MazeMode();
    engine.addMode("mazescreen", mazeMode);
    var fieldMenu = new gRPG.MenuMode();
    engine.addMode("fieldMenu", fieldMenu);
    var battleMode = new gRPG.BattleMode();
    engine.addMode("battle", battleMode);

    engine.mainMode("mapscreen");
    expect(mapMode.getAnimator()._timer).not.toBeNull();
    expect(mazeMode.getAnimator()._timer).toBeNull();
    // TODO maybe give the animator a isRunning method?

    engine.mainMode("mazescreen");
    expect(mapMode.getAnimator()._timer).toBeNull();
    expect(mazeMode.getAnimator()._timer).not.toBeNull();
    
    // start the field menu, it does not have its own animator,
    // so it should not stop the main mode animator:
    engine.openMode("fieldMenu");
    expect(mapMode.getAnimator()._timer).toBeNull();
    expect(mazeMode.getAnimator()._timer).not.toBeNull();

    engine.closeMode();
    expect(mapMode.getAnimator()._timer).toBeNull();
    expect(mazeMode.getAnimator()._timer).not.toBeNull();

    // but if i start a battle, it does have its own animator:
    engine.openMode("battle");
    expect(mapMode.getAnimator()._timer).toBeNull();
    expect(mazeMode.getAnimator()._timer).toBeNull();
    expect(battleMode.getAnimator()._timer).not.toBeNull();

    // when i close the battle, main mode's animator should resume:
    engine.closeMode();
    expect(mapMode.getAnimator()._timer).toBeNull();
    expect(mazeMode.getAnimator()._timer).not.toBeNull();
    expect(battleMode.getAnimator()._timer).toBeNull();

    // LONGTERM TODO what if the game engine just owned a single animator
    // that's always running?

  });

  it("should allow registering callbacks for button presses", function() {

    var engine = new gRPG.GameEngine($("#mapscreen-canvas"), 512, 384);
    var mapMode = new gRPG.MapMode();
    engine.addMode("map", mapMode);
    var mazeMode = new gRPG.MazeMode();
    engine.addMode("maze", mazeMode);

    var buttonPressed = false;

    engine.onButtonPress(CANCEL_BUTTON, function(engine) {
      buttonPressed = "cancel";
    });
    engine.onButtonPress(CONFIRM_BUTTON, function(engine) {
      buttonPressed = "confirm";
    });

    runs(function() {
      engine.mainMode("map");
      // map screen should now be receiving input

      $(document).trigger(new $.Event("keydown", {which: CONFIRM_BUTTON}));
    });

    waits(500);
    
    runs(function() {
      expect(buttonPressed).toEqual("confirm");
      // now try the other one:
      $(document).trigger(new $.Event("keydown", {which: CANCEL_BUTTON}));
    });

    waits(500);

    runs(function() {
      expect(buttonPressed).toEqual("cancel");
    });    

  });
});

describe("gRPG.MapMode", function() {
  it("should allow registering maps", function() {

    var engine = new gRPG.GameEngine($("#mapscreen-canvas"), 512, 384);
    var mapMode = new gRPG.MapMode();
    engine.addMode( "mapscreen", mapMode);

    var overworld = new gRPG.TileMap([0, 0, 0, 0], "overworldtiles.png");
    var underworld = new gRPG.SingleImageMap([0, 0, 0, 0], "underworldmap.png");
    engine.getModeByName("mapscreen").addMap("overworld", overworld);
    engine.getModeByName("mapscreen").addMap("underworld", underworld);

    expect(engine.getModeByName("mapscreen").getMap("overworld")._tileset).toEqual("overworldtiles.png");
    expect(engine.getModeByName("mapscreen").getMap("underworld")._imagefile).toEqual("underworldmap.png");

    // maze screen can also register maps:

    var mazeMode = new gRPG.MazeMode();
    engine.addMode( "maze", mazeMode);
    var spooky = new gRPG.TileMap([0, 0, 0, 0], "cavetiles.png");
    // neither tilemap nor singleimage map really makes any sense for first person maze screen
    // ... what kind of map do you use there?
    engine.getModeByName("maze").addMap("spookycave", spooky);
    expect(engine.getModeByName("maze").getMap("spookycave")._tileset).toEqual("cavetiles.png");
  });


});

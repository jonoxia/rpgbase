"use strict";

/* TODO:
 * 
 * setMenuPositions for menu modes
 * image loader, loadThemAll()
 * start method for engine
 * registerMap, getCurrentMapId, 

 * put an actual map screen inside the map screen mode

 * onSerialize, onDeserialize:
 *     allow each game mode to do whatever serialization/deserialization it wants
 *     and then record which mode is currently the main

 * Clean API for saving game data:
 *     saveGlobalGameState({})
 *     or just  engine.globalGameState['key'] = "value"
 *     and then anything written in engine.globalGameData gets saved

 */

var gRPG = (function(){
/* gRPG Namepsace */
  
  function GameEngine(canvasElem, width, height, options) {

    this.settings = {htmlElem: canvasElem,
                     screenWidth: width,
                     screenHeight: height};
    console.log("Instantiated game engine, htmlElem is " + this.settings.htmlElem);
    if (!!options) {
      this.setOptions(options);
    }
    console.log("Now htmlElem is " + this.settings.htmlElem);

    this._modeRegistry = {};
    this._monsterRegistry = {};
    this._characterRegistry = {};
    this._itemRegistry = {};
    this._commandRegistry = {};
    this._vehicleRegistry = {};
    this._keypressCallbacks = {};

    this._mainMode = null;
    this._subMode = null; // TODO be a stack? Probably not.

    var self = this;
    this._menuInputHandler = new NoRepeatKeyHandler(
      function(key) {
        if (self._subMode) {
          self._subMode.handleKey(key);
        }
      });

    this._mapInputHandler = new DPadStyleKeyHandler(40, // TODO NO HARDCODE KEY REPEAT RATE
      function(key) {
        if (self._mainMode) {
          self._mainMode.handleKey(key);
        }
      });
    
    this.loader = new AssetLoader()

    // implement scaling:
    this.canvas = this.settings.htmlElem[0];
    var ctx = this.canvas.getContext("2d");
    if (this.settings.scale && this.settings.scale != 1) {
      // Zoom in the canvas to given factor, without anti-aliasing:
      ctx.scale(this.settings.scale, this.settings.scale);
      ctx.mozImageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.imageSmoothingEnabled = false;
    }

  }
  GameEngine.prototype = {
    // TODO Needs to have mechanism for saving/loading globals

    setOptions: function(options) {
      // Needs to support options like:
      // default to CSS or canvas menus?
      // if css menus, needs base HTML elem to use (or it could just create one)
      // if canvas menus, needs menu cursor image and font image
      // default text styles
      // controls? (i.e. keyboard mappings)
      // scale factor

      var optionKeys = ["htmlElem", "screenWidth", "screenHeight", 
                        "menuImpl", "menuBaseElem", "scale"];
      var self = this;

      // Set global options:
      $(optionKeys).each(function(index, fieldName) {
        if (options.hasOwnProperty(fieldName)) {
          self.settings[fieldName] = options[fieldName];
        }
      });

      // Propagate to already-registered modes:
      for (var mode in self._modeRegistry) {
        if (self._modeRegistry.hasOwnProperty(mode)) {
          self._modeRegistry[mode].setOptions(options);
        }
      }
    },
    
    addMode: function(name, modeObject) {
      console.log("Adding mode " + name );
      this._modeRegistry[name] = modeObject;
      // Let the mode know about the global settings:
      console.log("Adding mode " + name + ", will give it my htmlElem = " + this.settings.htmlElem);
      modeObject.engine = this;
      modeObject.setOptions(this.settings);

    },
    
    getModeByName: function(name) {
      return this._modeRegistry[name];
    },

    getActiveMode: function() {
      if (this._subMode) {
        return this._subMode;
      } else {
        return this._mainMode;
      }
    },

    mainMode: function(name) {
      // TODO raise an exception if the named mode cannot be
      // a main mode
      if (!this._modeRegistry.hasOwnProperty(name)) {
        throw "There is no mode named " + name;
      }

      if (this._mainMode) {
        this._mainMode.stop();
        this._mapInputHandler.stopListening();
      }

      this._mainMode = this._modeRegistry[name];

      // start animator of new mode:
      this._mainMode.start();

      this._mapInputHandler.startListening();      
      // TODO weird things might happen if you called this while a 
      // sub-mode was active...
    },

    openMode: function(name) {
      // TODO raise an exception if the named mode cannot be
      // a sub mode
      if (!this._modeRegistry.hasOwnProperty(name)) {
        throw "There is no mode named " + name;
      }
      this._subMode = this._modeRegistry[name];

      // switch input to menu style:
      this._mapInputHandler.stopListening();
      this._menuInputHandler.startListening();

      // TODO in some cases we want to do subMode.menuSystem.open(self.player);
      // ... but not in all cases?

      // if the submode has an animator (e.g. battlesystem),
      // stop the old mode and start the new mode:
      if (this._subMode.hasOwnAnimator) {
        this._mainMode.stop();
        this._subMode.start();
      }
    },
    
    closeMode: function() {
      if (this._subMode.hasOwnAnimator) {
        this._subMode.stop();
        this._mainMode.start();
      }

      // switch input to map style:
      this._menuInputHandler.stopListening();
      this._mapInputHandler.startListening();
      this._subMode = null;
    },

    loadImage: function(filename) {
      return this.loader.add(filename);
    },
    
    addMap: function(name, map) {
    },
    
    getMap: function(name) {
    },

    addMonster: function(name, monster) {
    },

    getMonster: function(name) {
    },

    addCharacter: function(name, character) {
      // doesn't immediately add them to your party,
      // just stores their data for now
    },

    getCharacter: function(name) {
    },

    addItem: function(name, item) {
    },

    getItem: function(name) {
    },

    addCommand: function(name, command) {
    },

    getCommand: function(name) {
    },

    addVehicle: function(name, vehicle) {
    },

    getVehicle: function(name) {
    },
    
    mainMenu: function(callback) {
    },

    onButtonPress: function(keycode, callback) {
      // all main modes will listen for this keycode and call the
      // callback when it's pressed.

      this._keypressCallbacks[keycode] = callback;
    },

    handleKey: function(keycode) {
      if (this._keypressCallbacks.hasOwnProperty(keycode)) {
        this._keypressCallbacks[keycode](this);
      }
    },
    
    onStartGame: function(callback) {
      // called whether it's a new game or a loaded save game
    },

    onNewGame: function(callback) {
      // called only when you start a new game
    },

    onLoadGame: function(callback) {
      // called only when you load a save
    },

    onSaveGame: function(callback) {
    },

    onGameOver: function(callback) {
      // might be cleaner to implement this by having a GameSession object that we
      // can create and destroy, while GameEngine remains persistent?
      // (player object probably belongs to session)
    },

    start: function(startingMode, callback) {
      var self = this;
      console.log("Gonna loadThemAll");
      // This is a common place for startup to fail, because if
      // any of the loading files doesnt' load, the callback never
      // gets called
      this.loader.loadThemAll(function() {
        console.log("Loaded them all");
        self.mainMode(startingMode);
        if (callback) {
          callback();
        }
      });

    }

    // do save?
    // do load?

    // send player to ('mapname', x, y) ?
  };

  function GameModeMixin(subclassPrototype) {
    /* All game modes need to have:
     * - an input interpreter
     * - either their own animator or to piggyback on another mode's renderer
     * - functions for switching into and out of the mode */

    subclassPrototype.saveNamedOptions = function(options, fieldNames){
      if (!options) {
        // nothing to do here
        return;
      }
      var self = this;
      if (!self.settings) {
        self.settings = {};
      }
      $(fieldNames).each(function(index, fieldName) {
        if (options.hasOwnProperty(fieldName)) {
          self.settings[fieldName] = options[fieldName];
        }
      });
    };
  }

  
  function MapMode(options) {
    // Defaults:
    this.settings = {scale: 1.0,
                     pixelsPerSquare: 16,
                     widthSquares: 20,
                     heightSquares: 18,
                     mapAnimFrameTime: 40,
                     tileOffset: {x: 0, y: 0},
                     spriteDimensions: {width: 16, height: 16,
                                        offsetX: 0, offsetY: 0},
                     walkAnimationFrames: 5,
                     scrollMargins: {left: 6, top: 5, right: 6, bottom: 5},
                     animationCallback: function() {}
                    };
    this.setOptions(options);
    this.hasOwnAnimator = true;
    this.engine = null;
    this.animator = new Animator(this.settings.mapAnimFrameTime);

    this._mapRegistry = {};

  }
  MapMode.prototype = {
    setOptions: function(options) {
      this.saveNamedOptions(options, ["htmlElem", "screenWidth", "screenHeight",
                                      "scale", "widthSquares", "heightSquares",
                                      "pixelsPerSquare", "mapAnimFrameTime",
                                      "tileOffset", "walkAnimationFrames",
                                      "spriteDimensions",
                                      "scrollMargins", "animationCallback"]);
      // TODO maybe better to read this list from my own defaults?

      if (this.settings.htmlElem) {
        // i'm assuming this gets called only once...
        this._realMapScreen = new MapScreen(this.settings.htmlElem[0],
                                            this.settings.widthSquares,
                                            this.settings.heightSquares,
                                            this.settings.pixelsPerSquare,
                                            this.settings.pixelsPerSquare,
                                            this.settings.mapAnimFrameTime
                                           );
        
        this._realMapScreen.setTileOffset(this.settings.tileOffset);
        this._realMapScreen.setScrollMargins(this.settings.scrollMargins);
        
        MapSprite.setDefault("spriteDimensions", this.settings.spriteDimensions);
        MapSprite.setDefault("walkAnimationFrames", this.settings.walkAnimationFrames);
        MapSprite.setDefault("_animationCallback", this.settings.animationCallback);

      }
    },

    handleKey: function(key) {
      var self = this;

      var delX = 0, delY =0;
      switch (key) {
      case DOWN_ARROW:
        delX = 0; delY = 1;
        break;
      case LEFT_ARROW:
        delX = -1; delY = 0;
        break;
      case UP_ARROW:
        delX = 0; delY = -1;
        break;
      case RIGHT_ARROW:
        delX = 1; delY = 0;
        break;
      default:
        this.engine.handleKey(key);
        break;
      }

      if (delX != 0 || delY != 0) {
        // Animate the player moving, wait for animation to finish:
        var anim = self.player.move(delX, delY);
        self.engine._mapInputHandler.waitForAnimation(anim); // encapsulation breaky
        self._realMapScreen.animate(anim); // ??
      }
    },

    getAnimator: function() {
      return this._realMapScreen._animator;
    },

    start: function() {
      //this.animator.start();
      this._realMapScreen.start();
    },

    stop: function() {
      //this.animator.stop();
      this._realMapScreen.stop();
    },

    addMap: function(name, map) {
      this._mapRegistry[name] = map;
    },

    getMap: function(name) {
      return this._mapRegistry[name];
    },
    
    putPlayerAt: function(player, mapName, x, y) {
      this.player = player;
      this._realMapScreen.setNewDomain(this.getMap(mapName)._realMap);
      player.enterMapScreen(this._realMapScreen, x, y);
    }


    // Figure out the best place to set which land types are crossable
    // (on foot and in each vehicle)
  };
  GameModeMixin(MapMode.prototype);


  function BattleMode(options) {
    // Defaults:
    this.settings = {
    };
    this.setOptions(options);
    this.hasOwnAnimator = true;
    this.animator = new Animator(10);
  }
  BattleMode.prototype = {
    setOptions: function(options) {
      // Should support options like:
      // animation frame rate
      // defaultCmdSet -- just a list of command NAMES which refer to command registry
      // onDrawBattle
      // canvas or css menus?
      // menuPositions
      // if these are "options" then they should have sensible defaults!
    },

    getAnimator: function() {
      return this.animator;
    },

    start: function() {
      this.animator.start();
    },

    stop: function() {
      this.animator.stop();
    },

    onDrawBattle: function(callback) {
      // TODO
    }
  };
  GameModeMixin(BattleMode.prototype);


  function MazeMode(options) {
    // Defaults:
    this.settings = {
      mazeAnimFrameTime: 100
    };
    this.setOptions(options);
    this.hasOwnAnimator = true;
    this.engine = null;
    this.animator = new Animator(this.settings.mazeAnimFrameTime);

    this._mapRegistry = {};
  }
  MazeMode.prototype = {
    setOptions: function(options) {
      this.saveNamedOptions(options, ["mazeAnimFrameTime"]);
    },

    handleKey: function(key) {
      var self = this;
      var anim;
      switch (key) {
      case DOWN_ARROW:
        anim = self.mazeScreen.goBackward();
        break;
      case LEFT_ARROW:
        anim = self.mazeScreen.turnLeft();
        break;
      case UP_ARROW:
        anim = self.mazeScreen.goForward();
        break;
      case RIGHT_ARROW:
        anim = self.mazeScreen.turnRight();
        break;
      default:
        this.engine.handleKey(key);
        break;
      }
      if (anim) {
        self.engine._mapInputHandler.waitForAnimation(anim); // encapsulation breaky
        self.animator.runAnimation(anim);
      }
    },

    getAnimator: function() {
      return this.animator;
    },

    start: function() {
      this.animator.start();
    },

    stop: function() {
      this.animator.stop();
    },

    addMap: function(name, map) {
      this._mapRegistry[name] = map;
    },

    getMap: function(name, map) {
      return this._mapRegistry[name];
    }
  };
  GameModeMixin(MazeMode.prototype);

  
  function MenuMode(options) {
    // Defaults:
    this.settings = {
      menuImpl: "css"
    };
    this.setOptions(options);
    this.hasOwnAnimator = false;
  }
  MenuMode.prototype = {
    setOptions: function(options) {
      this.saveNamedOptions(options, ["menuBaseElem", "menuImpl"]);
      // Should support options like:
      // default command set (do these go in the command registry or not?)
      // include spell menu? include item menu?
      // canvas vs css menus, and text style are set globally in game engine
      // but menu positions are set here
    }
    
    // needs a 'setMenuPositions'
  };
  GameModeMixin(MenuMode.prototype);

  function MapMixin(subclassPrototype) {
  }


  function TileMap(data, tileset) {
    this._mapData = data;
    this._tileset = tileset;
  }
  TileMap.prototype = {
  };
  MapMixin(TileMap.prototype);


  function SingleImageMap(data, imagefile) {
    this._mapData = data;
    this._imagefile = imagefile;

    this._realMap = new Map("mapname", data, null);
  }
  SingleImageMap.prototype = {
  };
  MapMixin(SingleImageMap.prototype);



  return { GameEngine: GameEngine,
           MapMode: MapMode,
           BattleMode: BattleMode,
           MazeMode: MazeMode,
           MenuMode: MenuMode,
           TileMap: TileMap,
           SingleImageMap: SingleImageMap
         };

})();

"use strict";

/* TODO:
 * 
 * setMenuPositions for menu modes
 * image loader, loadThemAll()
 * start method for engine
 * registerMap, getCurrentMapId, 

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


  function overrideDefaults(settings, engine, options) {
    // first override default settings with engine settings
    // then override default settings with options

    for (var key in settings) {
      if (settings.hasOwnProperty(key)) {
        if (options.hasOwnProperty(key)) {
          settings[key] = options[key];
        }
        else if (engine.settings.hasOwnProperty(key)) {
          settings[key] = engine.settings[key];
        }
      }
    }
    return settings;
  }

  function LoadingScreenMode(htmlElem, frameRate) {
    this._htmlElem = htmlElem;  // must be canvas
    this._ctx = this._htmlElem.getContext("2d");

    var self = this;
    this._animator = new Animator(frameRate,
                                  function() {self.render();});
    this._percentLoaded = 0;
    this._frameCount = 0;
  }
  LoadingScreenMode.prototype = {
    handleKey: function(keyCode) {
      console.log("LOADING SCREEN EATING YOUR KEYPRESS");
    },
    hasOwnAnimator: function() {
      return true;
    },
    getAnimator: function() {
      return this._animator;
    },
    start: function() {
      if (this._scratchpadCtx) {
        // Save a snapshot of whatever is on screen now, so we can do
        // a fade-out animation over it if desired.
        this._scratchpadCtx.drawImage(this._htmlElem, 0, 0);
      }
      this._frameCount = 0;
      this._animator.start();
    },

    setScratchpadContext: function(htmlElem) {
      // TODO maybe this and mapmode could get access to it via gRPG the way
      // they get htmlElem, instead?
      this._scratchpad = htmlElem;
      this._scratchpadCtx = this._scratchpad.getContext("2d");
    },

    onRender: function(renderCallback) {
      this._renderCallback = renderCallback;
    },

    render: function() {
      if (this._renderCallback) {
        this._renderCallback(this._ctx, this._frameCount, this._percentLoaded);
      }
      this._frameCount ++;
    },
    stop: function() {
      this._animator.stop();
    },
    setPercent: function(percentLoaded) {
      this._percentLoaded = percentLoaded;
    }
  };

  
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

    // All-purpose storage for standard game objects (monsters, spells, items, etc)
    this.library = {};

    this._keypressCallbacks = {}; // TODO do i use this anywhere???


    this._mainMode = null;
    this._subMode = null; // TODO make the modes a stack?

    this._canonicalSize = {width: width,
                           height: height};
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
    
    this.loader = new AssetLoader();
    this.audioPlayer = new AudioPlayer();
    this.eventService = new GameEventService();
    this.csvLoader = new CSVLoader(this.settings.basePath, []);

    // implement scaling:
    this.canvas = this.settings.htmlElem[0];
    var ctx = this.canvas.getContext("2d");
    if (this.settings.scale) { // && this.settings.scale != 1) {
      // Zoom in the canvas to given factor, without anti-aliasing:
      ctx.mozImageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      var ratio;
      if (this.settings.scale == "auto") {
        ratio = this.getRatioFromWindowSize();
      } else {
	ratio = this.settings.scale;
      }
      this.setScale(ratio);
    }

    this.player = new Player();
  }
  GameEngine.prototype = {
    // TODO Needs to have mechanism for saving/loading globals

    getRatioFromWindowSize: function() {
      var windowSize = {width: $(window).width(),
                        height: $(window).height()};
      var gameSize = {width: this.settings.screenWidth,
                      height: this.settings.screenHeight};

      var ratios = {width: windowSize.width/gameSize.width,
                    height: windowSize.height/gameSize.height};

      var ratio = ratios.width < ratios.height ? ratios.width : ratios.height;
      return ratio;
    },

    setScale: function(ratio) {
      var gameSize = {width: this.settings.screenWidth,
                      height: this.settings.screenHeight};
      $("#mapscreen-canvas").attr("width", gameSize.width * ratio);
      $("#mapscreen-canvas").attr("height", gameSize.height * ratio);
      console.log("Set width and height to " +  gameSize.width*ratio + ", " + gameSize.height*ratio);
      var ctx = this.canvas.getContext("2d");
      ctx.scale(ratio, ratio);
      
      this._calculatedScale = ratio; // TODO pass this to all modes that are added...
      // and if it changes, pass the change to all current modes.

     /* var fontSize = Math.ceil( 18 * ratio);
      $("body").css("font-size", fontSize + "pt");
      console.log("Set font size to " + fontSize);*/
    },

    /*rescale: function(newScale) {
      // Does not work, do not use
      var ctx = this.canvas.getContext("2d");
      //ctx.restore();
      //ctx.save();
      this.settings.scale = newScale;
      ctx.scale(this.settings.scale, this.settings.scale);
      
      this.settings.screenWidth = this._canonicalSize.width * newScale;
      this.settings.screenHeight = this._canonicalSize.height * newScale;
      this.canvas.setAttribute("width", this.settings.screenWidth);
      this.canvas.setAttribute("height", this.settings.screenHeight);
    },*/

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
    },

    addMode: function(name, modeObject) {
      console.log("Adding mode " + name );
      this._modeRegistry[name] = modeObject;
      // Let the mode know about the global settings:
      console.log("Adding mode " + name + ", will give it my htmlElem = " + this.settings.htmlElem);
      modeObject.engine = this;
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
    /* TODO implement this as a stack of modes instead?
     * menu, battle, or dialog gets pushed onto the top of the stack and then popped off?
     * map mode is usually the base, maze mode gets pushed on top of map mode when you enter
     * maze, popped off when you exit maze, etc.
     * i suppose at the very bottom would go the system menu mode, then?
     */

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
      console.log("GameEngine.openMode for " + name);
      this._subMode = this._modeRegistry[name];

      // switch input to menu style:
      var keys = this._mapInputHandler.keysThatAreDown.slice();
      this._mapInputHandler.stopListening();
      this._menuInputHandler.startListening();
      // Preserve key state across the switch in input handlers.
      // (TODO: should there be features in keyboardClasses.js to do this?)
      this._menuInputHandler.keysThatAreDown = keys;

      // TODO in some cases we want to do subMode.menuSystem.open(self.player);
      // ... but not in all cases?

      // if the submode has an animator (e.g. battlesystem),
      // stop the old mode and start the new mode:
      if (this._subMode.hasOwnAnimator) {
        this._mainMode.stop();
      }
      // otherwise, just start the new one:
      this._subMode.start();
    },

    closeMode: function() {
      console.log("GameEngine.closeMode");
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

    librarySave: function(typeName, instanceName, object) {
      /* all-purpose method for storing "game library" objects
       * (monsters, spells, items, characters, etc. etc.) for easy
       * retrieval later without using global scope */
      if (!this.library.hasOwnProperty(typeName)) {
        this.library[typeName] = {};
      }
      this.library[typeName][instanceName] = object;
    },

    libraryLoad: function(typeName, instanceName) {
      /* retrieves an object stored earlier by librarySave */
      if (!this.library[typeName]) {
        throw "No library called " + typeName;
      }
      return this.library[typeName][instanceName];
    },

    libraryGetKeys: function(typeName) {
      var keys = [];
      for (var key in this.library[typeName]) {
        if (this.library[typeName].hasOwnProperty(key)) {
          keys.push(key);
          // if this was python i could just say g_PCdict.keys()
        }
      }
      return keys;
    },

    hasLibrary: function(typeName) {
      if (this.library[typeName]) {
        return true;
      }
      return false;
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

    addDataFiles: function(fileList) {
      this.csvLoader.addFiles(fileList);
    },

    loadDataFiles: function(callback) {
      this.csvLoader.loadAll(callback);
    },

    start: function(startingMode, callback) {
      var self = this;
      // (does it make sense for engine.start to just always start you in loading screen mode
      // instead of taking an argument?)
      this.mainMode("loading");
      console.log("Gonna loadThemAll");
      // This is a common place for startup to fail, because if
      // any of the loading files doesnt' load, the callback never
      // gets called
      this.loader.loadThemAll(
        function() {
          console.log("Loaded them all");
          self.mainMode(startingMode);
          if (callback) {
            callback();
          }
        },
        function(percentLoaded) {
          // the progress bar callback function
          self.getModeByName("loading").setPercent(percentLoaded);
        }
      );
      window.setTimeout(function() {
	self.loader.listUnloaded(); // just for debug
      }, 5000);
    },

    // do save?
    // do load?
    // send player to ('mapname', x, y) ?
    
    /* The Input Mode interface:
     * to be an input mode, an object must implement:

     * handleKey(keyCode)
     * start()
     * stop()
     * hasOwnAnimator (true or false)
     * getAnimator()*/

    makeMapMode: function(modeName, options) {
      // factory method: returns a MapScreen

      // defaults:
      var settings = {htmlElem: null,
                      screenWidth: 800,
                      screenHeight: 600,
                      scale: 1.0,
                      spriteScaleFactor: 1.0,
                      downsampleFactor: 1.0,
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

      settings = overrideDefaults(settings, this, options);

      var mapScreen =  new MapScreen(settings.htmlElem[0],
                                     settings.widthSquares,
                                     settings.heightSquares,
                                     settings.pixelsPerSquare,
                                     settings.pixelsPerSquare,
                                     settings.mapAnimFrameTime);
      mapScreen.spriteScale = settings.spriteScaleFactor;
      mapScreen.downsampleFactor = settings.downsampleFactor;

      mapScreen.hasOwnAnimator = true;
      mapScreen._mapRegistry = {};
      mapScreen.engine = this;
      
      mapScreen.setTileOffset(settings.tileOffset);
      mapScreen.setScrollMargins(settings.scrollMargins);
      
      MapSprite.setDefault("spriteDimensions", settings.spriteDimensions);
      MapSprite.setDefault("walkAnimationFrames", settings.walkAnimationFrames);
      MapSprite.setDefault("_animationCallback", settings.animationCallback);

      // Make mapScreen implement the InputMode interface!!

      mapScreen.handleKey = function(key) {
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
          self.animate(anim); // ??
        }
      };

      mapScreen.getAnimator = function() {
        return this._animator; // TODO are animator and _animator different?
        //return this._realMapScreen._animator;
      };

      mapScreen.addMap = function(name, map) {
        this._mapRegistry[name] = map;
      };

      mapScreen.getMap = function(name) {
        return this._mapRegistry[name];
      };

      // a mapScreen mode requires a loading screen mode:
      this.makeLoadingMode("loading", options); // TODO this is janky

      mapScreen.putPlayerAt = function(player, mapName, x, y, callback) {
        this.player = player;
        this.switchTo(mapName, x, y, callback);
        // was: setNewDomain, then enterMapScreen.
        // setNewDomain does unload, then sets domain, then loads, then starts music
        // enterMapScreen sets references, then sets position to x,y, then calls
        // scrollToShow.
        // What we actually want is:
        // 1. unload, 2. set position to x,y, 3. load, 4. scrollToShow.

        // TODO this function is completely redundant since switchTo calls player.enterMapScreen
        // which calls mapScreen.setPlayer !!!  get rid of this one and maybe rename switchTo
        // to putPlayerAt?
      };

      mapScreen.switchTo = function(mapName, x, y, callback) {
        // NOW AN EXCITING ASYNC CALL

        this.engine.mainMode("loading");
        var self = this;
        var previousDomain = this._currentDomain;

        this.getMap(mapName).unfold(function() {
          self.exitOldDomain();
          self.player.enterMapScreen(self, mapName, x, y);
          var newDomain = self.getMap(mapName);
          self.setNewDomain(newDomain);
          self.scrollToShow(x, y);
          // fold up old map if any:
          if (previousDomain && previousDomain !== newDomain ) {
            // it's valid to call putPlayerAt(mapYouAreAlreadyIn, newX, newY) which
            // will trigger this, so make sure we don't fold the map in that case!!!
            previousDomain.fold(); 
          }

          self.flash("black", 0, 0, 24); // 24 frames fade-back-in
          // this flash never fades back in
          self.engine.mainMode("map"); // close the loading screen // TODO XXX what if the name is not map? too many assumptions here
          if (callback) { callback(); }
            // TODO: return Promise instead?
        }, function(updatePercent) {
          self.engine.getModeByName("loading").setPercent(updatePercent);
        });
      };

      this.addMode(modeName, mapScreen);
      return mapScreen;
    },

    makeBattleMode: function(modeName, options) {
      // factory function, returns BattleMode

      var settings = {
        menuBaseElem: null,
        menuImpl: "css",
        screenWidth: 800,
        screenHeight: 600,
        stdBattleCmds: [],
        retarget: false,
        //battleCmdSet: [],
        menuPositions: {msgLeft: 10,
                        msgTop: 100,
                        menuLeft: 100,
                        menuTop: 100,
                        menuXOffset: 25},
        menuTextStyles: {
        },
        startBattleMsg: "Your Start Battle Message Here"
      };

      settings = overrideDefaults(settings, this, options);

      var battleSystem = new BattleSystem(settings.menuBaseElem,
                                          this.canvas,
                                          this.eventService,
                                          {defaultCmdSet: settings.stdBattleCmds,
                                           width: settings.screenWidth,
                                           height: settings.screenHeight,
                                           startBattleMsg: settings.startBattleMsg,
                                           retarget: settings.retarget
                                          });
      battleSystem.hasOwnAnimator = true;
      battleSystem.setMenuPositions(settings.menuPositions);
      battleSystem.engine = this;

      battleSystem.onClose(function() {
        battleSystem.engine.closeMode();
      });

      // Make Battle System implement the Input Mode interface:
      battleSystem.getAnimator = function() {
        return this._animator;
      },

      battleSystem.start = function() {
        //this._realBattleSystem._animator.start();
      };

      battleSystem.stop = function() {
        //this._realBattleSystem._animator.stop();
      };

      /* TODO the following line is supposed to scale the menu system to match
       * the scale of the game engine as a whole. Would probably be better
       * to make part of the InputMode interface be a function updateScale or something
       * like that, which we can call whenever the window size changes. */
      battleSystem._calculatedScale = this._calculatedScale;
      this.addMode(modeName, battleSystem);
      return battleSystem;
    },

    makeLoadingMode: function(modeName, options) {
      var settings = {htmlElem: null,
                      mapAnimFrameTime: 40};
      settings = overrideDefaults(settings, this, options);
      var loadingScreen = new LoadingScreenMode(settings.htmlElem[0],settings.mapAnimFrameTime);
      this.addMode(modeName, loadingScreen);
      return loadingScreen;
    },

    makeMazeMode: function(modeName, options) {
      // Defaults:
      var settings = {
        screenWidth: 800,
        screenHeight: 600,
        mazeAnimFrameTime: 100
      };

      settings = overrideDefaults(settings, this, options);

      var mazeMode = new FirstPersonMaze(settings.htmlElem[0].getContext("2d"),
                                         settings.screenWidth,
                                         settings.screenHeight,
                                         settings.mazeAnimFrameTime);

      mazeMode.hasOwnAnimator = true;
      mazeMode.engine = this;
      mazeMode._mapRegistry = {};

      mazeMode.handleKey = function(key) {
        var self = this;
        var anim;
        switch (key) {
        case DOWN_ARROW:
          anim = self.goBackward();
          break;
        case LEFT_ARROW:
          anim = self.turnLeft();
          break;
        case UP_ARROW:
          anim = self.goForward();
          break;
        case RIGHT_ARROW:
          anim = self.turnRight();
          break;
        default:
          self.engine.handleKey(key);
          break;
        }
        if (anim) {
          self.engine._mapInputHandler.waitForAnimation(anim); // encapsulation breaky
          self.animator.runAnimation(anim);
        }
      };

      // already has start and stop functions
      mazeMode.getAnimator = function() {
        return this.animator;
      };

      mazeMode.addMap = function(name, map) {
        this._mapRegistry[name] = map;
      };

      mazeMode.getMap = function(name, map) {
        return this._mapRegistry[name];
      };
      this.addMode(modeName, mazeMode);
      return mazeMode;
    },

    makeMenuMode: function(modeName, options) {

      var settings = {
        menuBaseElem: null,
        menuImpl: "css",
        screenWidth: 800,
        screenHeight: 600,
        defaultCmdSet: [],
        menuPositions: {msgLeft: 10,
                        msgTop: 100,
                        menuLeft: 100,
                        menuTop: 100,
                        menuXOffset: 25},
        menuTextStyles: {
        },
        uiText: null,
        fieldMenuConstructor: FieldMenu
      };

      settings = overrideDefaults(settings, this, options);

      var menuMode = new settings.fieldMenuConstructor(
        settings.menuBaseElem, 
        null, settings.screenWidth,
        settings.screenHeight,
        settings.defaultCmdSet,
        settings.uiText);

      menuMode.setMenuPositions(settings.menuPositions);
      menuMode.engine = this;
      menuMode.onClose(function() {
        menuMode.engine.closeMode();
      });
      menuMode.hasOwnAnimtor = false;

      menuMode.start = function() {
        this.open(this.engine.player);
      };

      menuMode.stop = function() {
      };

      /* TODO the following line is supposed to scale the menu system to match
       * the scale of the game engine as a whole. Would probably be better
       * to make part of the InputMode interface be a function updateScale or
       * something like that, which we can call whenever the window size 
       * changes. */
      menuMode._calculatedScale = this._calculatedScale;

      this.addMode(modeName, menuMode);
      return menuMode;
    },
    
    makeDialogMode: function(modeName, options) {
      var settings = {
        menuBaseElem: null,
        menuImpl: "css",
        screenWidth: 800,
        screenHeight: 600,
        defaultCmdSet: [],
        menuPositions: {msgLeft: 10,
                        msgTop: 100,
                        menuLeft: 100,
                        menuTop: 100,
                        menuXOffset: 25},
        menuTextStyles: {
        }
      };

      settings = overrideDefaults(settings, this, options);

      var dialogMode = new Dialoglog(settings.menuBaseElem, 
                                     null, settings.screenWidth,
                                     settings.screenHeight);
      dialogMode.setMenuPositions(settings.menuPositions);
      // TODO MenuSystem should have a public method for this.
      // TODO do it to field menu and plot manager
      dialogMode._calculatedScale = this._calculatedScale;

      dialogMode.engine = this;
      dialogMode.onClose(function() {
        dialogMode.engine.closeMode();
      });
      dialogMode.hasOwnAnimtor = false;

      dialogMode.start = function() {
        this.open(this.engine.player);
      };

      dialogMode.stop = function() {
      };

      this.addMode(modeName, dialogMode);
      return dialogMode;
    },

    makePlotMode: function(modeName, options) {
      var settings = {
        menuBaseElem: null,
        menuImpl: "css",
        screenWidth: 800,
        screenHeight: 600,
        defaultCmdSet: [],
        menuPositions: {msgLeft: 10,
                        msgTop: 100,
                        menuLeft: 100,
                        menuTop: 100,
                        menuXOffset: 25},
        menuTextStyles: {
        }
      };

      settings = overrideDefaults(settings, this, options);

      var plotMode = new PlotDialogSystem(settings.menuBaseElem, 
                                            null, settings.screenWidth,
                                            settings.screenHeight);
      plotMode.setMenuPositions(settings.menuPositions);

      plotMode.engine = this;
      plotMode.onClose(function() {
        console.log("PLOT MODE ONCLOSE");
        plotMode.engine.closeMode();
      });
      plotMode.hasOwnAnimtor = false;

      plotMode.start = function() {
        this.open(this.engine.player);
      };

      plotMode.stop = function() {
      };
      plotMode._calculatedScale = this._calculatedScale;
      this.addMode(modeName, plotMode);
      return plotMode;
    }
  };

  return { GameEngine: GameEngine };

})();

function GenericRPG(canvasTagId) {
  this._canvasTagId = canvasTagId;
  this._setupCallbacks = [];
  this._mapScreenDim = {};
  this._maps = [];
}
GenericRPG.prototype = {

  setMapScreenDimensions: function(squaresX, squaresY,
                                   pixelsX, pixelsY) {

    this._mapScreenDim = {squaresX: squaresX,
                          squaresY: squaresY,
                          pixelsX: pixelsX,
                          pixelsY: pixelsY};
  },
  
  _setUpMapScreen: function() {
    var dim = this._mapScreenDim;
    this.mapScreen = new MapScreen(this.canvas,
                                   dim.squaresX,
                                   dim.squaresY,
                                   dim.pixelsX,
                                   dim.pixelsY, 40);
    // TODO don't hard code 
    // 40 is milliseconds per frame
    this.mapScreen.setTileOffset({x: -0.5, y: -0.5});
    this.mapScreen.useAudioPlayer(this.audioPlayer);
  },

  _initEverything: function() {
  // Get the canvas from the HTML document:
  this.canvas = document.getElementById(this._canvasTagId);
  var ctx = this.canvas.getContext("2d");

  // Zoom in the canvas to 2x, without anti-aliasing:
  ctx.scale(2, 2);
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;

  // Create the loader (to load all images)
  this.loader = new AssetLoader();
  // Create the main game components (see the various setUp functions)
    // TODO 512/2 and 384/2 should be decided by userland
  this.mazeScreen = new FirstPersonMaze(ctx, 512/2, 384/2);


    // TODO setUpParty, setUpBattleSystem,
    // setUpMonstrousManuel, setUpOverworldMap, and setUpFieldMenu
    // are all defined in userland -- they should not be referenced
    // here by name; instead they should be set as callbacks or they
    // should override methods of this class.
  this.player = setUpParty(this.loader);
  this._setUpAudioPlayer();
  this._setUpMapScreen();
  this.battleSystem = setUpBattleSystem(this.canvas,
                                        this.loader,
                                        this.mazeScreen);
  this.manuel = setUpMonstrousManuel(this.loader); // monster dictionary
  this.overworld = setUpOverworldMap(this);

  this._maps[this.overworld.getId()] = this.overworld;

  this.fieldMenu = setUpFieldMenu();
    // TODO the root html tag should be decided by userland
  this.dialoglog = new Dialoglog($("#battle-system"));
  //var boat = makeBoat(loader, overworld);

  this.dialoglog.setMenuPositions({msgLeft: 20,
	      msgTop: 128});

  this._setupInputDispatch();

  var self = this;

  // TODO this only needs to happen if menus are canvas mode:
  this.mapScreen.afterRender(function(ctx) {
    self.fieldMenu.drawCanvasMenus(ctx);
    self.dialoglog.drawCanvasMenus(ctx);
  });
  this.mazeScreen.afterRender(function(ctx) {
    self.fieldMenu.drawCanvasMenus(ctx);
    self.dialoglog.drawCanvasMenus(ctx);
  });

  /* When a battle ends, return to map-screen style input, and
   * redraw the map screen: */
  this.battleSystem.onClose(function(winLoseDraw) {
    if (self.battleSystem.originalMode == "overworld") {
      self.mapScreen.start();
    } 
    if (self.battleSystem.originalMode == "maze") {
      self.mazeScreen.start();
    }
  });

  },

  _setupInputDispatch: function() {

    var self = this;
    var dispatcher = makeInputDispatcher(40);
    
    var mazeKeyCallback = function(key) {
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
      case CANCEL_BUTTON:
        // Pop open the field menu system
        console.log("Opening field menu from maze");
        dispatcher.menuMode("menu").open(self.player);
        break;
      }
      if (anim) {
        dispatcher.waitForAnimation(anim);
        self.mazeScreen.animator.runAnimation(anim);
      }
    };

    var mapScreenKeyCallback = function(key) {
      // Frame-rate = one frame per 40 ms
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
      case CONFIRM_BUTTON:
        // If you're facing an NPC, talk to them!
        var facingSpace = self.player.getFacingSpace();
        var npc = self.mapScreen.getNPCAt(facingSpace.x, 
                                          facingSpace.y);
        if (npc) {
          npc.talk(dispatcher.menuMode("dialog"), self.player);
        }
        break;
      case CANCEL_BUTTON:
        // Pop open the field menu system
        dispatcher.menuMode("menu").open(self.player);
        break;
      }

      if (delX != 0 || delY != 0) {
        // Animate the player moving over the course of 8 frames
        // TODO inject this 8 from userland, don't hard-code it.
        var anim = self.player.move(delX, delY, 8);
        dispatcher.waitForAnimation(anim);
        self.mapScreen.animate(anim);
      }
    };

    dispatcher.addMapMode("overworld", mapScreenKeyCallback);
    dispatcher.addMapMode("maze", mazeKeyCallback);
    dispatcher.addMenuMode("menu", self.fieldMenu);
    dispatcher.addMenuMode("battle", self.battleSystem);
    dispatcher.addMenuMode("dialog", self.dialoglog);

    this.inputDispatcher = dispatcher;
  },

  _setUpAudioPlayer: function() {
    // The check box for turning audio on and off:
    var audioPlayer = new AudioPlayer();
    // For best results preload music files here:

    // TODO track names belong in userland
    audioPlayer.preload("music/overworld");
    audioPlayer.preload("music/battle");
    audioPlayer.preload("music/cave");
    audioPlayer.preload("music/boss");
    audioPlayer.preload("music/town");

    // TODO this toggle elem should be set in userland
    var checkAudioState = function() {
      if ($("#bgm-toggle").is(":checked")) {
        audioPlayer.enable();
      } else {
        audioPlayer.disable();
      }
    }
    checkAudioState();
    $("#bgm-toggle").click(checkAudioState);
    this.audioPlayer = audioPlayer;
  },
  
  setup: function(callback) {
    this._setupCallbacks.push(callback);
  },

  start: function() {
    for (var i = 0; i < this._setupCallbacks; i++) {
      this._setupCallbacks[i](this);
    }

    var self = this;
    this.loader.loadThemAll(function() {
      self.inputDispatcher.mapMode("overworld");
      self.mapScreen.start();
    });

  },

  addTownToMap: function(theTownMap, x1, y1, x2, y2) {
    var self = this;
    /* Enter the town: */
    this.overworld.onStep({x: x1, y: y1}, function(pc, x, y) {
      self.mapScreen.setNewDomain(theTownMap);
      self.player.enterMapScreen(self.mapScreen, x2, y2);
      self.mapScreen.render();
    });
    /* To get back out of the town: */
    theTownMap.onStep({edge: "any"}, function(pc, x, y) {
      self.mapScreen.setNewDomain(self.overworld);
      self.player.enterMapScreen(self.mapScreen, x1, y1);
      self.mapScreen.render();
    });

    // TODO these two should go in userland:
    theTownMap.setMusicTrack("music/town");
    theTownMap.getTileForCode = function(mapCode) {
	return {x:mapCode, y:DayNight};
    };
  },

  makeNPC: function(spriteSheet) {
    return new NPC(spriteSheet, this.mapScreen);
  },

  addNPCToTown: function(town, spriteSheet, spriteSliceX, 
		         spriteSliceY, dialogText, xPos, yPos,
		         wanders) {
    var newNPC = this.makeNPC(spriteSheet);
    if (wanders) {
      newNPC.wander();
    }
    var self = this;
    newNPC.setSprite(spriteSliceX, spriteSliceY);
    newNPC.onTalk(function(dialog) {
      dialog.scrollText(dialogText);
    });
    town.addNPC(newNPC,xPos, yPos);
  },

  makeShop: function(spriteSheet, sliceX, sliceY, inventory, speech) {
    // TODO put "~" in userland,
    // TODO standardize pc/npc sprite dimensions
    return makeShop(spriteSheet,
                    this.mapScreen, 16, 24, 0, -8,
                    sliceX, sliceY, inventory, "~",
                    speech);
  },

  makeChurch: function(spriteSheet, spriteX, spriteY, price) {

    var priest = this.makeNPC(spriteSheet);
    priest.setSprite(spriteX, spriteY);
    priest.onTalk(function(dialog, player) {
	    dialog.open(player);
	    // make list of dead guys:
	    var deadGuys = [];
	    var party = player.getParty();
	    for (var i = 0; i < party.length; i++) {
		if (!party[i].isAlive()) {
		    deadGuys.push(party[i]);
		}
	    }
	    if (deadGuys.length == 0) {
		dialog.scrollText("Nobody seems to be dead right now; see you later.");
	    } else {
		dialog.showPartyResources(player, "~");
		dialog.showMsg("Who needs reviving? It's " + price + " greppals.");
		var menu = dialog.makeMenu();
		menu.setTitle("Deadites");
		for (var i = 0; i < deadGuys.length; i++) {
		    (function(pc) {
			menu.addCommand(pc.name,
                          function() {
			    if (player.hasResource("~", price)) {
				player.spendResource("~", price);
				pc.revive();
				pc.setStat("hp", 1);
				player.marchInOrder();
				dialog.popMenu();
				dialog.scrollText(pc.name + " is revived! Praise <Nintendo acceptable substitute for Jesus>!");
			    } else {
				dialog.scrollText("You can't afford that, sorry.");
			    }
			  });
		    })(deadGuys[i]);
		}
		dialog.pushMenu(menu);
	    }
	});
    return priest;
  },

  makeInn: function(spriteSheet, spriteX, spriteY, pricePer) {
    var innkeeper = this.makeNPC(spriteSheet);
    innkeeper.onTalk(function(dialog, player) {
	    dialog.open(player);
	    dialog.showPartyResources(player, "~");
	    var totalPrice = pricePer * player.getAliveParty().length;
	    dialog.showMsg("For you to stay the night will be " + totalPrice + "~.");

	    dialog.yesOrNo(function(answer) {
		    if (answer) {
			if (player.hasResource("~", totalPrice)) {
			    player.forEachAliveMember(function(pc) {
				    pc.takeEffect("fullheal", {});
				    // see moonserpent-party for where "fullheal" is
				    // defined
				});
			    // TODO black out screen and play lullaby
			    player.spendResource("~", totalPrice);
			    dialog.popMenu();
			    dialog.scrollText("Thank you, come again.");
			} else {
			    dialog.popMenu();
			    dialog.scrollText("You can't afford that, sorry.");
			}
		    } else {
			dialog.popMenu();
			dialog.scrollText("Hope to see you again!");
		    }
		});
	});
    innkeeper.setSprite(spriteX, spriteY);
    return innkeeper;
  },

  connectMazeToOverworld: function(maze, overworldX, overworldY,
				   mazeX, mazeY, facing) {
    var self = this;
    this.overworld.onStep({x: overworldX, y: overworldY},
        function(pc, x, y, landType) {
	  self.inputDispatcher.mapMode("maze");
	  self.mapScreen.stop();
	  self.mazeScreen.loadMaze(maze,
				   mazeX,
				   mazeY,
				   facing);
	  self.mazeScreen.start();
	});

    maze.onStep({x: mazeX, y: mazeY},
        function(pc, x, y) {
	  // TODO pc argument is bogus, don't use it
	  self.inputDispatcher.mapMode("overworld");
	  self.mazeScreen.stop();
	  self.mapScreen.start();
	  self.player.enterMapScreen(self.mapScreen,
                                     overworldX,
				     overworldY);
	});
  },

  startEncounter: function(encounter, originalMode, landType) {
    var self = this;
    self.inputDispatcher.menuMode("battle");
    if (originalMode == "maze") {
      self.mazeScreen.stop();
      self.battleSystem.originalMode = "maze";
    }
    if (originalMode == "overworld") {
      self.mapScreen.stop();
      self.battleSystem.originalMode = "overworld";
    }

    // TODO audio track choice should be up to userland
    self.audioPlayer.changeTrack("music/boss", true);
    self.battleSystem.startBattle(self.player, encounter, landType);
  },

  registerMap: function(map) {
    this._maps[map.getId()] = map;
  },

  getMapById: function(id) {
    return this._maps[id];
  }

};
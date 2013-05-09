var mapData = [
[36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36],
[36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36],
[36,36,36,36,36, 4, 9, 6,36,36,36,36,36,36,36,36,36,36,36],
[36,36,36,36, 4, 1,37, 3, 6,36,36,36,36,36,36,36,36,36,36],
[36,36,36, 4, 1,37,39,37,10,36,36,36,36,36,36,36,36,36,36],
[ 4,17, 9, 1,37,39,39,37, 3, 6,36,36,36,36,36,36,36,36,36],
[ 1,40,37,37,39,39,39,37,37, 3, 6,36,36,36,36,36,36,36, 4],
[37,40,37,39,39,47,39,39,37,37, 3, 6,36,36,36,36,36, 4, 1],
[37,40,37,37,39,39,39,37,37,37,37, 3, 9, 6,36,36, 4, 1,37],
[37,40,37,37,39,39,37,37,37,37,37,37,37, 3, 6,36,11,37,37],
[37,40,37,37,39,37,37,37,37,37,32,32,37,37, 3, 9, 1,37,37],
[37,40,37,37,37,37,37,32,32,34,44,44,35,32,37,37,37,37,37],
[37,40,37,37,37,37,34,44,44,46,44,44,46,44,35,37,12,14,37],
[37,15,40,14,37,37,37,45,45,32,45,45,32,45,37,12,40,13,37],
[37,37,37,15,14,34,46,44,44,44,44,44,44,44,35,40,13,37,37],
[37,37,37,37,40,37,34,44,44,44,44,44,44,44,35,40,37,37,37],
[37,37,37,37,40,37,37,33,33,33,45,33,33,33,37,40,37,37,37],
[37,37,37,37,15,14,37,37,41,37,33,37,37,37,37,40,37,37,37],
[37,37,37,37,37,40,37,37,37,37,37,37,12,40,40,13,37,37,37],
[37,37,37,37,37,40,37,37,37,37,37,37,40,37,37,37,37,37,37],
[37,37,37,37,37,40,37,37,37,37,37,37,40,37,37,37,37,37,37],
[37,37,37,37,37,15,14,37,37,37,37,37,40,37,37,37,37,37,37],
[37,37,37,37,37,37,40,37,37,12,40,40,13,37,37,37,37,37,37],
[37,37,37,37,37,37,40,40,40,13,37,37,37,37,37,37,37,37,37],
[37,37,37,37,37,37,40,37,37,37,37,37,37,37,37,37,37,37,37]
];

var townData = [
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

/* TODO: any global variables that will need to be accessed by
 * multiple functions (e.g. day/night, phase of moon, etc)
 * should be declared here, before all functions. */


function makeOnePC(name, spriteSheet, spriteSheetRow) {
  /* Returns a new PlayerCharacter that uses the given row of the
   * given spriteSheet for its walk animation. */

  var pc = new PlayerCharacter(spriteSheet, 16, 24, 0, -8, {hp: 20});
  pc.name = name;

  var frameCount = 0;
  pc.walkAnimation(function(deltaX, deltaY, frame) {
    // "this" refers to pc
    frameCount += 1;
    var walkFrame = (Math.floor(frameCount / 3) % 2);
    // switch sprite every 3 animation frames
    if (deltaX < 0) {
      this.setSprite(6+walkFrame, spriteSheetRow);
    }
    if (deltaX > 0) {
      this.setSprite(2 +walkFrame, spriteSheetRow);
    }
    if (deltaY < 0) {
      this.setSprite(4+walkFrame, spriteSheetRow);
    }
    if (deltaY > 0) {
      this.setSprite(0+walkFrame, spriteSheetRow);
    }
  });

  pc.setSprite(0, spriteSheetRow);
  return pc;
}


function setUpParty(loader) {
  var player = new Player();

  var spriteSheet = loader.add("mapsprites.png");

  var canCross = function(landType) {
    if ( landType == 36 || landType == 12 || landType == 13 || landType == 14 || landType == 15 || landType == 17 || landType == 40) {
      return false;
    } else {
      return true;
    }
  };

  var hero = makeOnePC("ALIS", spriteSheet, 1);
  // for debugging main character death
  hero.setStat("hp", 1);
  var sidekick = makeOnePC("MYAU", spriteSheet, 0);
  var sidekick2 =  makeOnePC("ODIN", spriteSheet, 0);
  var sidekick3 =  makeOnePC("NOAH", spriteSheet, 0);

  hero.canCross = canCross;

  player.addCharacter(hero);
  player.addCharacter(sidekick);
  player.addCharacter(sidekick2);
  player.addCharacter(sidekick3);

  return player;
}


function setUpMapScreen(canvas) {
  var mapScreen = new MapScreen(canvas, 17, 13, 16, 16);
  mapScreen.setScrollMargins({left: 8, top: 6, right: 8, bottom: 6});
  mapScreen.setTileOffset({x: -0.5, y: -0.5});
  return mapScreen;
}

function setUpOverworldMap(loader) {
  var map = new Map(mapData, loader.add("terrain.png"));
  map.getTileForCode = function(mapCode) {
    return {x:mapCode, y:0};
  };

  // Example of how to trigger a function when player steps on
  // a certain type of tile:
  map.onStep({landType: 39}, function(pc, x, y) {
    $("#debug").html("You stepped on a hill.");
  });

  return map;
}

function setUpTownMap(loader) {
  var town = new Map(townData, loader.add("terrain.png"));
  var spriteSheet = loader.add("mapsprites.png");
  var shopkeeper = new NPC(spriteSheet, 16, 24, 0, -8);
  shopkeeper.setSprite(0, 2);
  shopkeeper.onTalk(function(dialog) {
    dialog.show("HELLO I AM A SHOMPKEEPER");
  });
  town.addNPC(shopkeeper, 5, 5);
  return town;
}


function setUpBattleSystem(canvas, loader) {

  /* Create the default command list. (Later, individual PCs will
   * be able to override this command list with their own spells/
   * items/ etc. */
  var spellList = new BattleCommandSet();
  spellList.add("CURE1", new BatCmd({
    target: "ally",
    /* A BatCmd with target "ally" will pop up a menu to choose which
     * ally you are targeting. */
    effect: function(battle, user, target) {
      battle.showMsg(user.name + " casts CURE1 on " + target.name);
    }
  }));
  spellList.add("FIRE1", new BatCmd({
    target: "random_enemy",
    /* A BatCmd with target "random_enemy" will randomly choose a
     * target with no need for player input */
    effect: function(battle, user, target) {
      battle.showMsg(user.name + " casts FIRE1 on " + target.name + "!");
    }
  }));

  var defaultCmdSet = new BattleCommandSet();
  defaultCmdSet.add("FIGHT", new BatCmd({
    target: "random_enemy",
    effect: function(battle, user, target) {
      battle.showMsg(user.name + " attacks " + target.name + "!");
      battle.sendEffect(target, "damage", {amount: rollDice(1, 6)});
    }
  }));
  // Here is how you nest a sub-menu inside the main menu:
  defaultCmdSet.add("MAGIC", spellList);
  defaultCmdSet.add("ITEM", new BatCmd({
    effect: function(battle, user) {
      battle.showMsg(user.name + " uses an appropriate ITEM!");
    }
  }));
  defaultCmdSet.add("DEFEND", new BatCmd({
    effect: function(battle, user) {
      battle.showMsg(user.name + " gets ready to DEFEND!");
    }
  }));

  var metaCmdSet = new BattleCommandSet();
  metaCmdSet.add("REPEAT", new BatCmd({
    effect: function(battle, party) {
      battle.repeatLastRoundCommands();
    }
  }));
  metaCmdSet.add("TACTIC", new BatCmd({
    effect: function(battle, party) {
      battle.showMsg("TACTICs are SO TOTALLY NOT IMPLEMENTED YET. Sorry.");
    }
  }));
  metaCmdSet.add("COMBAT", new BatCmd({
    effect: function(battle, party) {
      battle.showFirstPCMenu();
    }
  }));

  var escapeCmdSet = new BattleCommandSet();
  escapeCmdSet.add("SAFELY", new BatCmd({
    effect: function(battle, party) {
      battle.endBattle("run");
    }
  }));
  escapeCmdSet.add("SPEEDY", new BatCmd({
    effect: function(battle, party) {
      battle.endBattle("run");
    }
  }));
  escapeCmdSet.add("PANIC", new BatCmd({
    effect: function(battle, party) {
      battle.endBattle("run");
    }
  }));

  metaCmdSet.add("ESCAPE", escapeCmdSet);


  var battleSystem = new BattleSystem($("#battle-system"),
                                      canvas,
                                      {
                                        metaCmdSet: metaCmdSet,
                                        defaultCmdSet: defaultCmdSet
                                      });

  /* TODO if you want to plot an image in the background of the
   * battle screen, you'd start by loading it here: 
   * var battleScreenTiles = loader.add("filename.png");
   */

  battleSystem.onDrawBattle(function(context, monsters, landType) {
    context.fillStyle = "black";
    context.fillRect(0, 0, 512, 384); // TODO no hardcode

    /* TODO then you could plot slices of that image here
     * like this:
     context.drawImage(battleScreenTiles, x, y);
    */

    for (var i = 0; i < monsters.length; i++) {
      monsters[i].setPos(50 + 50 * i, 50);
      monsters[i].plot(context);
    }
  });
  
  /*battleSystem.onRollInitiative(function(party, monsters)) {
    // TODO
    return [];
  });*/

  battleSystem.onEffect("damage", function(target, data) {
    target.modifyStat("hp", (-1) * data.amount);

    battleSystem.showMsg(target.name + "'s HP drops to " + target.getStat("hp"));
    // check for death:
    if (target.getStat("hp") <= 0) {
      battleSystem.removeFromBattle(target);
    }
  });

  return battleSystem;
}

function setUpMonstrousManuel(loader) {
  var manuel = {
    biteWorm: new MonsterType(loader.add("monsters/biteworm.png"),
                              "Biteworm",
                              {hp: 10}),
    groundSnake: new MonsterType(loader.add("monsters/groundsnake.png"),
                                 "Groundsnake",
                                 {hp: 15})
    // TODO - Add more monster definitions here. Comma-separated.
  };
  return manuel;
}

function setUpFieldMenu() {
  // set up menu system
  var fieldCommands = {
    "ITEM": function(menus, party) {
      menus.showMsg("You can't find any good items in your backpack. You should keep it better organized.");
    },
    "SPELL": function(menus, party) {
      menus.showMsg("You sure magiced up that spell!");
    },
    "EQUIP": function(menus, party) {
      menus.showMsg("You put your recently purchased upgrades on your body");
    },
    "STATS": function(menus, party) {
      menus.showMsg("Each of your characters definitely has stats of some kind");
    },
    "ORDER": function(menus, party) {
      menus.showMsg("You put your squishy wizards and healers in the back!");
    },
    "SAVE": function(menus, party) {
      menus.showMsg("Like this game has a save system yet!");
    }
  };
  
  var fieldMenu = new MenuSystem($("#battle-system"), fieldCommands);
  return fieldMenu;
}



function setUpInputDispatch(player, mapScreen, fieldMenu) {
  var theOpenMenu = null;
  var inputDispatcher;

  var menuInputHandler = new NoRepeatKeyHandler(function(key) {
    if (theOpenMenu) {
      theOpenMenu.handleKey(key);
    }
  });

  var dialog = new Dialoglog($("#battle-system"));

  var mapInputHandler = new DPadStyleKeyHandler(50, function(key) {
    // Frame-rate = one frame per 50 ms
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
      var facingSpace = player.getFacingSpace();
      var npc = mapScreen.getNPCAt(facingSpace.x, facingSpace.y);
      if (npc) {
        npc.talk(dialog);
        inputDispatcher.menuMode(dialog);
      }
      break;
    case CANCEL_BUTTON:
      // Pop open the field menu system
      fieldMenu.open(player.getParty());
      inputDispatcher.menuMode(fieldMenu);
      break;
    }

    if (delX != 0 || delY != 0) {
      // Animate the player moving over the course of 5 frames
      mapInputHandler.startAnimation(player.move(delX, delY, 5));
    }
  });

  inputDispatcher = {
    menuMode: function(menuSystem) {
      theOpenMenu = menuSystem;
      mapInputHandler.stopListening();
      menuInputHandler.startListening();
    },

    mapMode: function() {
      theOpenMenu = null;
      menuInputHandler.stopListening();
      mapInputHandler.startListening();
    }
  };

  // return control to map screen key handler when menus are closed
  fieldMenu.onClose(function() {
    inputDispatcher.mapMode();
  });
  dialog.onClose(function() {
    inputDispatcher.mapMode();
  });

  return inputDispatcher;
}


/* Main function - Everything starts here */
$(document).ready( function() {
  // Get the canvas from the HTML document:
  var canvas = document.getElementById("mapscreen-canvas");
  var ctx = canvas.getContext("2d");

  // Zoom in the canvas to 2x, without anti-aliasing:
  ctx.scale(2, 2);
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;

  // Create the loader (to load all images)
  var loader = new AssetLoader();

  // Create the main game components (see the various setUp functions)
  var player = setUpParty(loader);
  var mapScreen = setUpMapScreen(canvas);
  var battleSystem = setUpBattleSystem(canvas, loader);
  var manuel = setUpMonstrousManuel(loader); // monster dictionary
  var overworld = setUpOverworldMap(loader);
  var fieldMenu = setUpFieldMenu();

  // Set up the relationships between the main game components
  var inputDispatcher = setUpInputDispatch(player, mapScreen, fieldMenu);

  /* 5% chance of random encounter on each step through overworld
   * When an encounter happens, switch to the battlescreen-style
   * input, and start the battle */
  overworld.onStep({chance: 0.05}, function(pc, x, y, landType) {
    inputDispatcher.menuMode(battleSystem);
    battleSystem.startBattle(player, {type: manuel.biteWorm,
                                      number: 3}, landType);
  });

  var townMap = setUpTownMap(loader);


  function situateTown(theTownMap, theOverworldMap, x1, y1, x2, y2) {
    /* Enter the town: */
    theOverworldMap.onStep({x: x1, y: y1}, function(pc, x, y) {
      mapScreen.setNewDomain(theTownMap);
      player.enterMapScreen(mapScreen, x2, y2);
      mapScreen.render();
    });
    /* To get back out of the town: */
    theTownMap.onStep({edge: "any"}, function(pc, x, y) {
      mapScreen.setNewDomain(theOverworldMap);
      player.enterMapScreen(mapScreen, x1, y1);
      mapScreen.render();
    });
  }

  situateTown(townMap, overworld, 8, 17, 4, 4);


  /* When a battle ends, return to map-screen style input, and
   * redraw the map screen: */
  battleSystem.onEndBattle(function() {
    inputDispatcher.mapMode();
    mapScreen.render();
  });


  /* Prepare for the game to start!
   * Put the player at position 4, 4 in the overworld: */
  mapScreen.setNewDomain(overworld);
  player.enterMapScreen(mapScreen, 4, 4);

  // When all image loading is done, draw the map screen:
  loader.loadThemAll(function() {
    mapScreen.render();
    // and start listening for (map screen) input:
    inputDispatcher.mapMode();

    /*inputHandler.stopListening();
    battleInputHandler.startListening();
    battleSystem.startBattle(player, {type: manuel.biteWorm,
                                      number: 3}, 1);*/

  });
});
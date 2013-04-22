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

$(document).ready( function() {
  var ctx = document.getElementById("mapscreen-canvas").getContext("2d");
  ctx.scale(2, 2);
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;

  var loader = new AssetLoader();

  var player = new Player();
  var hero = new PlayerCharacter(loader.add("mapsprites.png"),
                                 16, 24, 0, -8);
  var sidekick =  new PlayerCharacter(loader.add("mapsprites.png"),
                                 16, 24, 0, -8);

  var canCross = function(landType) {
    if ( landType == 36 || landType == 12 || landType == 13 || landType == 14 || landType == 15 || landType == 17 || landType == 40) {
      return false;
    } else {
      return true;
    }
  };

  hero.canCross = canCross;
  hero.setSprite(0, 1);

  var frameCount = 0;
  hero.walkAnimation(function(deltaX, deltaY, frame) {
    // "this" refers to hero
    frameCount += 1;
    walkFrame = (Math.floor(frameCount / 3) % 2);
    // switch sprite every 3 animation frames
    if (deltaX < 0) {
      this.setSprite(6+walkFrame, 1);
    }
    if (deltaX > 0) {
      this.setSprite(2 +walkFrame, 1);
    }
    if (deltaY < 0) {
      this.setSprite(4+walkFrame, 1);
    }
    if (deltaY > 0) {
      this.setSprite(0+walkFrame, 1);
    }
  });
  hero.name = "ALIS";

  var sidekickWalk = function(deltaX, deltaY, frame) {
    walkFrame = (Math.floor(frameCount / 3) % 2);
    if (deltaX < 0) {
      this.setSprite(6+walkFrame, 0);
    }
    if (deltaX > 0) {
      this.setSprite(2 +walkFrame, 0);
    }
    if (deltaY < 0) {
      this.setSprite(4+walkFrame, 0);
    }
    if (deltaY > 0) {
      this.setSprite(0+walkFrame, 0);
    }
  };
  sidekick.walkAnimation(sidekickWalk);
  sidekick.name = "MYAU";

  var sidekick2 =  new PlayerCharacter(loader.add("mapsprites.png"),
                                 16, 24, 0, -8);
  sidekick2.walkAnimation(sidekickWalk);
  sidekick2.name = "ODIN";

  var sidekick3 =  new PlayerCharacter(loader.add("mapsprites.png"),
                                 16, 24, 0, -8);
  sidekick3.walkAnimation(sidekickWalk);
  sidekick3.name = "NOAH";

  player.addCharacter(hero);
  player.addCharacter(sidekick);
  player.addCharacter(sidekick2);
  player.addCharacter(sidekick3);

  var mapScreen = new MapScreen(document.getElementById("mapscreen-canvas"), 17, 13, 16, 16);
  mapScreen.setScrollMargins({left: 8, top: 6, right: 8, bottom: 6});
  mapScreen.setTileOffset({x: -0.5, y: -0.5});


  var spellList = new BattleCommandSet();
  spellList.add("CURE1", new BatCmd({
    effect: function(battle, user) {
      battle.showMsg(user + " casts CURE1!");
    }
  }));
  spellList.add("FIRE1", new BatCmd({
    effect: function(battle, user) {
      battle.showMsg(user + " casts FIRE1!");
    }
  }));

  var defaultCmdSet = new BattleCommandSet();
  defaultCmdSet.add("FIGHT", new BatCmd({
    effect: function(battle, user) {
      battle.showMsg(user + " does some fierce FIGHTING!");
    }
  }));
  defaultCmdSet.add("MAGIC", spellList);
  defaultCmdSet.add("ITEM", new BatCmd({
    effect: function(battle, user) {
      battle.showMsg(user + " uses an appropriate ITEM!");
    }
  }));
  defaultCmdSet.add("RUN", new BatCmd({
    effect: function(battle, user) {
      battle.showMsg(user + " prudently RUNS AWAY!");
      battle.endBattle("run");
    }
  }));

  var battleSystem = new BattleSystem($("#battle-system"), {
    defaultCmdSet: defaultCmdSet
  });

  var inputHandler = new DPadStyleKeyHandler(50, function(key) {
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
      break;
    case CANCEL_BUTTON:
      break;
    }

    if (delX != 0 || delY != 0) {
      inputHandler.startAnimation(player.move(delX, delY, 5));
    }
  });
  inputHandler.startListening();

  var battleInputHandler = new NoRepeatKeyHandler(function(key) {
     battleSystem.handleKey(key);
  });
  battleSystem.onEndBattle(function() {
    battleInputHandler.stopListening();
    inputHandler.startListening();
    mapScreen.render();
  });
  battleSystem.onDrawBattle(function(context, monsters) {
    context.fillStyle = "black";
    context.fillRect(0, 0, 512, 384); // TODO no hardcode

    for (var i = 0; i < monsters.length; i++) {
      monsters[i].setPos(50 + 50 * i, 50);
      monsters[i].plot(context);
    }
  });


  var map = new Map(19, 25, mapData, loader.add("terrain.png"));
  map.getTileForCode = function(mapCode) {
    return {x:mapCode, y:0};
  };

  map.onStep({x: 8, y: 17}, function(pc, x, y) {
    $("#debug").html("You stepped on a town.");
  });

  map.onStep({landType: 39}, function(pc, x, y) {
    $("#debug").html("You stepped on a hill.");
  });

  var biteWorm = new MonsterType(loader.add("monsters/biteworm.png"),
                                 {});

  map.onStep({chance: 0.05}, function(pc, x, y) {
    inputHandler.stopListening();
    battleInputHandler.startListening();
    battleSystem.startBattle(player, {type: biteWorm,
                                     number: 3});
  });

  mapScreen.setNewDomain(map);
  player.enterMapScreen(mapScreen, 4, 4);

  loader.loadThemAll(function() {
    mapScreen.render();
  });
});
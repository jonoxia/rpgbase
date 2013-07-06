var sampleMazeData = [ // 1  2  3  4  5  6  7  8  9
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1,], // 0
  [3, 0, 0, 0, 0, 0, 0, 1, 1, 1,], // 1
  [1, 1, 0, 0, 2, 0, 0, 0, 0, 1,], // 2
  [1, 0, 0, 0, 0, 2, 0, 0, 0, 1,], // 3
  [1, 0, 0, 2, 0, 0, 2, 0, 0, 1,], // 4
  [1, 0, 0, 0, 2, 0, 0, 0, 1, 1,], // 5
  [1, 1, 1, 0, 0, 0, 0, 1, 1, 1,], // 6
  [1, 1, 1, 0, 0, 1, 0, 0, 1, 1,], // 7
  [1, 1, 1, 1, 1, 1, 0, 0, 1, 1,], // 8
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1,], // 9
];


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

var experienceForLevel = [0, 30, 75, 100];
var statsByLevel = [{atk: 4, def: 2},
                    {atk: 8, def: 4},
                    {atk: 12, def: 6},
                    {atk: 16, def: 8}];

function pcCheckLevelUp(pc) {
  var currLevel = pc.getStat("level");
  var curExp = pc.getStat("exp");
  var msg = "";
  if (curExp >= experienceForLevel[currLevel]) {
    currLevel ++; // todo edge case where you gain multiple levels
    // at once?
    msg = pc.name + " went up to Level " + currLevel + "!";
    pc.setStat("level", currLevel);
    var newStats = statsByLevel[ currLevel - 1 ];
    for (var statName in newStats) {
      pc.setStat(statName, newStats[statName]);
      msg += " " + statName + " increased to " + newStats[statName] + ".";
    }
  }
  return msg;
}

/* TODO: any global variables that will need to be accessed by
 * multiple functions (e.g. day/night, phase of moon, etc)
 * should be declared here, before all functions. */

function makeOnePC(name, spriteSheet, spriteSheetRow) {
  /* Returns a new PlayerCharacter that uses the given row of the
   * given spriteSheet for its walk animation. */

  var pc = new PlayerCharacter(spriteSheet, 16, 24, 0, -8,
                               {hp: 20, exp: 0, level: 1});
  var startingStats = statsByLevel[0];
  for (var statName in startingStats) {
    pc.setStat(statName, startingStats[statName]);
  }

  pc.name = name;
  pc.setSprite(0, spriteSheetRow);
  return pc;
}


function setUpParty(loader) {
  var player = new Player();

  var spriteSheet = loader.add("mapsprites.png");

  MapSprite.defaultCrossable(function(landType) {
    if ( landType == 36 || landType == 12 || landType == 13 || landType == 14 || landType == 15 || landType == 17 || landType == 40) {
      return false;
    } else {
      return true;
    }
  });

  MapSprite.defaultSpritePicker(function(deltaX,
                                         deltaY,
                                         currFrame) {
    var walkFrame = (Math.floor(currFrame / 3) % 2);
    // switch sprite every 3 animation frames
    if (deltaX < 0) {
      this.useSpriteCol(6+walkFrame);
    }
    if (deltaX > 0) {
      this.useSpriteCol(2 +walkFrame);
    }
    if (deltaY < 0) {
      this.useSpriteCol(4+walkFrame);
    }
    if (deltaY > 0) {
      this.useSpriteCol(0+walkFrame);
    }
  });

  var hero = makeOnePC("ALIS", spriteSheet, 1);
  var sidekick = makeOnePC("MYAU", spriteSheet, 0);
  var sidekick2 =  makeOnePC("ODIN", spriteSheet, 0);
  var sidekick3 =  makeOnePC("NOAH", spriteSheet, 0);

  var medicalHerb = new ItemType("Medical Herb", 1);
  medicalHerb.useEffect({target: "ally",
                         inBattle: true,
                         outOfBattle: true,
                         effect: function(system, user, target) {
                           system.showMsg(user.name + " applies the medical herb to " + target.name);
                         }
                        });
  var homingDevice = new ItemType("Homing Device", 1);
  homingDevice.useEffect({target: "party",
                         inBattle: false,
                         outOfBattle: true,
                         effect: function(system, user, target) {
                           system.showMsg(user.name + " thows the homing device in the air, and the party is teleported back to town.");
                         }
                        });

  var sword = new ItemType("Crummy Sword");
  sword.equippable("hand", "sword", {atk: 5});
  var fur = new ItemType("Crummy Fur");
  fur.equippable("body", "fur", {def: 5});
  var axe = new ItemType("Crummy Axe");
  axe.equippable("hand", "axe", {atk: 10});
  var robes = new ItemType("Crummy Robes");
  robes.equippable("body", "cloth", {def: 5});

  hero.setEquippableTypes(["sword", "chain", "shield", "plate"]);
  sidekick.setEquippableTypes(["fang", "fur"]);
  sidekick2.setEquippableTypes(["sword", "axe", "chain", "shield", "plate"]);
  sidekick3.setEquippableTypes(["staff", "cloth"]);

  hero.gainItem(sword);
  hero.gainItem(medicalHerb);
  hero.gainItem(homingDevice);
  var i;
  for (var i = 0; i < 5; i++) { hero.gainItem(medicalHerb); }
  sidekick.gainItem(fur);
  for (var i = 0; i < 7; i++) { sidekick.gainItem(medicalHerb); }
  sidekick2.gainItem(axe);
  for (var i = 0; i < 7; i++) { sidekick2.gainItem(medicalHerb); }
  sidekick3.gainItem(robes);
  for (var i = 0; i < 7; i++) { sidekick3.gainItem(medicalHerb); }


  player.addCharacter(hero);
  player.addCharacter(sidekick);
  player.addCharacter(sidekick2);
  player.addCharacter(sidekick3);


  // starting money:
  player.gainResource("gold", 100);

  return player;
}


function setUpMapScreen(canvas, audioPlayer) {
  var mapScreen = new MapScreen(canvas, 17, 13, 16, 16, 50);
  mapScreen.setScrollMargins({left: 8, top: 6, right: 8, bottom: 6});
  mapScreen.setTileOffset({x: -0.5, y: -0.5});
  mapScreen.useAudioPlayer(audioPlayer);
  return mapScreen;
}

function setUpOverworldMap(loader, encounterTable) {
  var map = new Map(mapData, loader.add("terrain.png"));
  map.getTileForCode = function(mapCode) {
    return {x:mapCode, y:0};
  };

  // Example of how to trigger a function when player steps on
  // a certain type of tile:
  map.onStep({landType: 39}, function(pc, x, y) {
    $("#debug").html("You stepped on a hill.");
  });
  map.setMusicTrack("music/overworld");
  map.setEncounterTable(encounterTable);

  return map;
}

function setUpTownMap(loader, mapScreen) {
  var town = new Map(townData, loader.add("terrain.png"));
  town.setMusicTrack("music/town");
  var spriteSheet = loader.add("mapsprites.png");
  var hintguy = new NPC(spriteSheet, mapScreen, 16, 24, 0, -8);
  hintguy.wander();
  hintguy.setSprite(0, 2);
  hintguy.onTalk(function(dialog) {
    dialog.scrollText("Good morrow, travellers! Let me regale you with an endless, boring story in which I infodump the entire history of the game world! So it all started a thousand years ago when a great evil (who is obviously the last boss) was sealed away by a group of heroes, who you are obviously supposed to emulate...");
  });
  town.addNPC(hintguy, 5, 5);

  var coolsword = new ItemType("Sword +1");
  var ether = new ItemType("Ether");
  var potion = new ItemType("Potion");
  var coolarmor = new ItemType("Chain mail +1");
  
  var inventory = [{item: coolsword, price: 500},
                   {item: ether, price: 120},
                   {item: potion, price: 90},
                   {item: coolarmor, price: 850}];
  var shop = makeShop(spriteSheet, mapScreen, 16, 24, 0, -8,
                      0, 2, inventory, "gold");
  town.addNPC(shop, 10, 4);

  var treasureSheet = loader.add("treasure.png");
  var shield = new ItemType("Crummy Shield");
  shield.equippable("hand", "shield", {def: 5});
  var box = new TreasureChest(shield, treasureSheet, 16, 16, 0, 0);
  town.addNPC(box, 6, 4);

  var moneyChest = new MoneyChest("gold", 250, treasureSheet, 16, 16,
                                  0, 0);
  town.addNPC(moneyChest, 6, 5);

  return town;
}


function setUpBattleSystem(canvas, loader, mazeScreen) {

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

  var hitSpriteSheet = loader.add("wounds.png");
  defaultCmdSet.add("FIGHT", new BatCmd({
    target: "random_enemy",
    effect: function(battle, user, target) {
      battle.showMsg(user.name + " attacks " + target.name + "!");
      battle.sendEffect(target, "damage", {amount: rollDice(1, 6)});
    },
    animate: function(battle, user, target) {
      var spriteOffsetY = 0;
      if (user.getEquippedType) {
        var weaponType = user.getEquippedType("weapon");
        switch(weaponType) {
          case "smallblade":
          spriteOffsetY = 64 * 1;
          break;
          case "medblade":
          spriteOffsetY = 64 * 2;
          break;
          case "heavyblade":
          spriteOffsetY = 64 * 3;
          break;
        }
      }
      // TODO should be like target.getBattlescreenXY()
      // then when used against player character it can show atop
      // your stats box / portrait.
      var x = target.x;
      var y = target.y;

      var animation = new Animation(8);
      animation.onDraw(function(ctx, frame) {
        if (hitSpriteSheet) {
          var spriteOffsetX = (Math.floor(frame/2)) * 64;
          ctx.drawImage(hitSpriteSheet,
                        spriteOffsetX, spriteOffsetY,
                        64, 64,
                        x, y,
                        64, 64);
        }
      });
      return animation;
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
                                        frameDelay: 100,
                                        metaCmdSet: metaCmdSet,
                                        defaultCmdSet: defaultCmdSet
                                      });

  /* TODO if you want to plot an image in the background of the
   * battle screen, you'd start by loading it here: 
   * var battleScreenTiles = loader.add("filename.png");
   */

  battleSystem.onDrawBattle(function(context, monsters, landType) {
    
    if (battleSystem.originalMode == "maze") {
      // use maze as background
      mazeScreen.render();
    } else {
      context.fillStyle = "black";
      context.fillRect(0, 0, 512, 384); // TODO no hardcode
    }

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

    battleSystem.showMsg(target.name + " takes " + data.amount + " damage!");
    // check for death:
    if (target.getStat("hp") <= 0) {
      battleSystem.removeFromBattle(target);
    }
  });

  battleSystem.onStartBattle(function(battleSystem) {
    battleSystem._ctx.save();

    var frameCallback = function(frame) {
      var halfX = 256/2;
      var halfY = 192/2;
      var xStep = frame * halfX / 10;
      var yStep = frame * halfY / 10;
      var left = halfX - xStep;
      var right = halfX + xStep;
      var top = halfY - yStep;
      var bottom = halfY + yStep;
      battleSystem._ctx.restore(); // to clear previous clip rect
      battleSystem._ctx.save(); // because we need one save for every
      // restore
      battleSystem._ctx.beginPath();
      battleSystem._ctx.moveTo(left, top);
      battleSystem._ctx.lineTo(right, top);
      battleSystem._ctx.lineTo(right, bottom);
      battleSystem._ctx.lineTo(left, bottom);
      battleSystem._ctx.lineTo(left, top);
      battleSystem._ctx.clip();
    };
    var finishCallback = function() {
      battleSystem._ctx.restore();
      battleSystem.showStartRoundMenu();
    };
    var animation = new Animation(10, frameCallback, finishCallback);
    battleSystem.animate(animation);
  });

  battleSystem.setMenuPositions({
    statsLeft: 0,
    statsTop: 137,
    statsWidth: 64,
    statsHeight: 50,
    statsXOffset: 64,
    statsYOffset: 0,
    msgLeft: 10,
    msgTop: 115,
    menuXOffset: 50,
    menuYOffset: 10,
    resetPerPC: true
  });

  battleSystem.onVictory(function(player, deadMonsters) {
    var gold = 0;
    var exp = 0;
    for (var i = 0; i < deadMonsters.length; i++) {
      gold += deadMonsters[i].getStat("gp");
      exp += deadMonsters[i].getStat("exp");
    }
    var victoryText = "You defeated the monsters! Your party gains " + gold + " gold pieces and " + exp + " experience points.";

    player.gainResource("gold", gold);
    var aliveCharacters = player.getAliveParty();
    for (i = 0; i < aliveCharacters.length; i++) {
      aliveCharacters[i].modifyStat("exp", exp);
      // see if anybody levels up from the exp:
      victoryText += pcCheckLevelUp(aliveCharacters[i]);
    }
    return victoryText;
  });

  return battleSystem;
}

function setUpMonstrousManuel(loader) {
  var manuel = {
    biteWorm: new MonsterType(loader.add("monsters/biteworm.png"),
                              "Biteworm",
                              {hp: 10, gp: 2, exp: 3}),
    groundSnake: new MonsterType(loader.add("monsters/groundsnake.png"),
                                 "Groundsnake",
                                 {hp: 15, gp: 4, exp: 7}),
    seaWorm: new MonsterType(loader.add("monsters/biteworm.png"),
                              "Seaworm",
                              {hp: 20, gp: 8, exp: 12}),
    seaSnake: new MonsterType(loader.add("monsters/groundsnake.png"),
                              "Seasnake",
                              {hp: 30, gp: 12, exp: 17}),
    eastWorm: new MonsterType(loader.add("monsters/biteworm.png"),
                              "Eastworm",
                              {hp: 20, gp: 8, exp: 12}),
    eastSnake: new MonsterType(loader.add("monsters/groundsnake.png"),
                              "Eastsnake",
                              {hp: 30, gp: 12, exp: 17})

    // TODO - Add more monster definitions here. Comma-separated.
  };
  return manuel;
}

function setUpEncounterTable(manuel) {
  var westLandEncounters = new EncounterTable([
    {highRoll: 35, number: 1, type: manuel.biteWorm},
    {highRoll: 65, number: 3, type: manuel.biteWorm},
    {highRoll: 85, number: 1, type: manuel.groundSnake},
    {highRoll: 100, number: 2, type: manuel.groundSnake}
  ]);

  var eastLandEncounters = new EncounterTable([
    {highRoll: 35, number: 1, type: manuel.eastWorm},
    {highRoll: 65, number: 3, type: manuel.eastWorm},
    {highRoll: 85, number: 1, type: manuel.eastSnake},
    {highRoll: 100, number: 2, type: manuel.eastSnake}
  ]);

  var waterEncounters = new EncounterTable([
    {highRoll: 50, number: 2, type: manuel.seaWorm},
    {highRoll: 100, number: 1, type: manuel.seaSnake}
  ]);

  var masterTable = new EncounterTableSet();
  
  masterTable.defineRegion(10, 6, 19, 19, "eastlands");
  masterTable.addTable(waterEncounters, {landType: 36});
  masterTable.addTable(eastLandEncounters, {regionCode: "eastlands"});
  masterTable.addTable(westLandEncounters, {}); // everything else

  return masterTable;
}

function setUpFieldMenu() {
  // set up menu system
  var fieldCommands = new BattleCommandSet();
  // TODO: this really shouldn't be called a
  // BattleCommandSet then should it?
  // TODO cheating a little here because i'm not creating BatCmd
  // instances but just throwing in an anoymous object with an 
  
  fieldCommands.add("ITEM",{
    effect: function(menus, party) {
      menus.chooseCharacter("Whose?", function(character) {
        menus.showItemMenu(character);
      });
    }});
  fieldCommands.add("SPELL",{
    effect: function(menus, party) {
      menus.showMsg("You sure magiced up that spell!");
    }});
  fieldCommands.add( "EQUIP",{
    effect: function(menus, party) {
      menus.showMsg("You put your recently purchased upgrades on your body");
    }});
  fieldCommands.add("STATS",{
    effect: function(menus, party) {
      menus.showPartyStats();
      menus.showPartyResources();
      menus.chooseCharacter("Whose?", function(character) {
        var stats = character.getStatDisplay("longform");
        var textLines = stats.split("<br>");
        var statsBox = new FixedTextBox(textLines, menus);
        menus.pushMenu(statsBox);
      });
    }});
  fieldCommands.add("ORDER",{
    effect: function(menus, party) {
      menus.showMsg("You put your squishy wizards and healers in the back!");
    }});
  fieldCommands.add("SAVE",{
    effect: function(menus, party) {
      menus.showMsg("Like this game has a save system yet!");
    }});
  
  var fieldMenu = new FieldMenu($("#battle-system"), fieldCommands);
  return fieldMenu;
}

function setUpInputDispatch(player, mapScreen, mazeScreen) {

  var mazeKeyCallback = function(key) {
    var anim;
    switch (key) {
    case DOWN_ARROW:
      anim = mazeScreen.goBackward();
      break;
    case LEFT_ARROW:
      anim = mazeScreen.turnLeft();
      break;
    case UP_ARROW:
      anim = mazeScreen.goForward();
      break;
    case RIGHT_ARROW:
      anim = mazeScreen.turnRight();
      break;
    case CANCEL_BUTTON:
      // Pop open the field menu system
      console.log("Opening field menu from maze");
      dispatcher.menuMode("menu").open(player);
      break;
    }
    if (anim) {
      dispatcher.waitForAnimation(anim);
      mazeScreen.animator.runAnimation(anim);
    }
  };

  var mapScreenKeyCallback = function(key) {
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
        npc.talk(dispatcher.menuMode("dialog"), player);
      }
      break;
    case CANCEL_BUTTON:
      // Pop open the field menu system
      dispatcher.menuMode("menu").open(player);
      break;
    }

    if (delX != 0 || delY != 0) {
      // Animate the player moving over the course of 5 frames
      var anim = player.move(delX, delY, 5);
      dispatcher.waitForAnimation(anim);
      mapScreen.animate(anim);
    }
  };

  var dispatcher = makeInputDispatcher(50);
  dispatcher.addMapMode("overworld",  mapScreenKeyCallback);
  dispatcher.addMapMode("maze", mazeKeyCallback);

  return dispatcher;
}

function makeBoat(loader, overworld) {
  var boat = new Vehicle(loader.add("ship.png"), 16, 16, 0, 0);
  boat.canCross = function(landType) {
    if ( landType == 36 ) { 
      // deep water
      return true;
    } else {
      return false;
    }
  };
  boat.setSprite(2, 0);

  boat.onEmbark(function(boat, polayer) {
    console.log("You got on the boat!!");
    // TODO: embarking animation
  });
  boat.onBump(function(mapScreen, x, y, landType) {
    // check if land type is beach:
    var beachTypes = [4, 6, 9, 10, 11];
    if (beachTypes.indexOf(landType) > -1) {
      boat.disembark();
    }

    // TODO if land type is river:
    // deploy the canoe in the space in front of me
    // then disembark
    // which will let the player step forward
    // which will trigger embarking into the canoe
    // then in the canoe's bump method
    // check if the boat is in front of me
    // and if it is, then disembark and then remove canoe from map
  });
  overworld.addVehicle(boat, 2, 4);
  return boat;
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
  var mazeScreen = new FirstPersonMaze(ctx, 512/2, 384/2);
  var player = setUpParty(loader);
  var audioPlayer = new AudioPlayer();
  var mapScreen = setUpMapScreen(canvas, audioPlayer);
  var battleSystem = setUpBattleSystem(canvas, loader, mazeScreen);
  var manuel = setUpMonstrousManuel(loader); // monster dictionary
  var overworldEncounters = setUpEncounterTable(manuel);
  var overworld = setUpOverworldMap(loader, overworldEncounters);
  var fieldMenu = setUpFieldMenu();
  var dialoglog = new Dialoglog($("#battle-system"));
  var boat = makeBoat(loader, overworld);


  audioPlayer.preload("music/overworld");
  audioPlayer.preload("music/boss");
  audioPlayer.preload("music/town");

  CanvasTextUtils.setFontImg(loader.add("font.png"));
  CanvasTextUtils.setStyles({cornerRadius: 5, fontSize: 8,
                             maxLineLength: 26});
  fieldMenu.setMenuPositions({msgLeft: 10,
                              msgTop: 125,
                              menuLeft: 5,
                              menuTop: 5,
                              menuXOffset: 25,
                              statsLeft: 0,
                              statsTop: 127,
                              statsWidth: 64,
                              statsHeight: 60,
                              statsXOffset: 64,
                              statsYOffset: 0
                             });

  // Set up the relationships between the main game components
  var inputDispatcher = setUpInputDispatch(player, mapScreen,
                                          mazeScreen);
  inputDispatcher.addMenuMode("menu", fieldMenu);
  inputDispatcher.addMenuMode("battle", battleSystem);
  inputDispatcher.addMenuMode("dialog", dialoglog);

  // TODO this only needs to happen if menus are canvas mode:
  // Is there a less klugey way of this?
  mapScreen.afterRender(function(ctx) {
    fieldMenu.drawCanvasMenus(ctx);
    dialoglog.drawCanvasMenus(ctx);
  });
  mazeScreen.afterRender(function(ctx) {
    fieldMenu.drawCanvasMenus(ctx);
    dialoglog.drawCanvasMenus(ctx);
  });

  function startEncounter(x, y, landType) {
    // choose a random encounter:
    var table = mapScreen.getEncounterTable();
    if (!table) {
      console.log("Error - no encounter table defined for this domain!");
      return;
    }
    var encounter = table.rollEncounter(x, y, landType);
    // switch input mode:
    inputDispatcher.menuMode("battle");
    // switch bgm to battle
    audioPlayer.changeTrack("music/boss", true);
    // start battleSystem!
    battleSystem.startBattle(player, encounter, landType);
  }

  /* 5% chance of random encounter on each step through overworld
   * When an encounter happens, switch to the battlescreen-style
   * input, and start the battle */
  overworld.onStep({chance: 0.05}, function(pc, x, y, landType) {
    // stop map screen animator:
    mapScreen.stop();
    battleSystem.originalMode = "overworld"; // klugy way to remember
    // where to go back to after battle ends
    startEncounter(x, y, landType);
  });

  // Cave entrance -- when you step on this square, switch to maze
  // mode!
  overworld.onStep({x: 5, y: 7}, function(pc, x, y, landType) {
    inputDispatcher.mapMode("maze");
    mapScreen.stop();
    mazeScreen.loadMaze(sampleMazeData, 1, 1, "w");
    mazeScreen.start();
  });

  // make it so I can exit the maze by stepping back to the door
  mazeScreen.onStep({x: 1, y: 1}, function(pc, x, y) {
    inputDispatcher.mapMode("overworld");
    mazeScreen.stop();
    mapScreen.start();
  });

  // maze encounters:
  mazeScreen.onStep({chance: 0.05}, function(pc, x, y, landType) {
    // stop map screen animator:
    mazeScreen.stop();
    battleSystem.originalMode = "maze"; // klugy way to remember
    // where to go back to after battle ends
    startEncounter(x, y, landType);
  });

  var townMap = setUpTownMap(loader, mapScreen);


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
  battleSystem.onClose(function() {
    // switch back to map music
    if (battleSystem.originalMode == "overworld") {
      mapScreen.start();
    } 
    if (battleSystem.originalMode == "maze") {
      mazeScreen.start();
    }
  });

  /* Prepare for the game to start!
   * Put the player at position 4, 4 in the overworld: */
  mapScreen.setNewDomain(overworld);
  player.enterMapScreen(mapScreen, 4, 4);

  // When all image loading is done, draw the map screen:
  loader.loadThemAll(function() {
    // and start listening for (map screen) input:
    inputDispatcher.mapMode("overworld");
    // and begin map animation:
    mapScreen.start();
    /*inputDispatcher.menuMode("battle");
    battleSystem.startBattle(player, {type: manuel.biteWorm,
                                    number: 3}, 1);*/

  });

  var checkAudioState = function() {
    if ($("#bgm-toggle").is(":checked")) {
      audioPlayer.enable();
    } else {
      audioPlayer.disable();
    }
  }
  checkAudioState();
  $("#bgm-toggle").click(checkAudioState);
});
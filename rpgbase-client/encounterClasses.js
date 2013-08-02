
function randomElementFromArray(arr) {
  var index = Math.floor( Math.random() * arr.length);
  return arr[index];
}

function EncounterTable(data, dieSize) {
  if (dieSize) {
    this._dieSize = dieSize;
  } else {
    this._dieSize = 100;
  }
  this._data = data;
}
EncounterTable.prototype = {
  rollEncounter: function() {
    var dieRoll = rollDice(1, this._dieSize);

    var matchIndex = 0;
    console.log("Random encounter table rolls: " + dieRoll);
    while (dieRoll > this._data[matchIndex].highRoll) {
      matchIndex ++;
      if (matchIndex >= this._data.length) {
        return null;
      }
    }
    var encounter = this._data[matchIndex];
    return {number: encounter.number, type: encounter.type};
  }
};


function EncounterTableSet() {
  // Each map domain should get its own instance of this class??
  // either that or have one instance but implement domain-id filters
  this._tableFilters = [];
  this._geoRegions = [];
}
EncounterTableSet.prototype = {
  addTable: function(table, filter) {
    // filter can have .landType, .georegion, and/or .callback
    // this table will be used only if all specified filters match
    this._tableFilters.push({filter: filter,
                             table: table});
  },

  getMatchingTable: function(landType, regionCode) {
    for (var i = 0; i < this._tableFilters.length; i++) {
      var filter = this._tableFilters[i].filter;
      var table = this._tableFilters[i].table;
      
      if (filter.landType != undefined) {
        if (landType != filter.landType) {
          continue;
        }
      }
      if (filter.regionCode != undefined) {
        if (regionCode != filter.regionCode) {
          continue;
        }
      }
      // TODO implement additional filter types here!

      // still here? must be a match
      return table;
    }
    return null;
  },
  
  defineRegion: function(left, top, right, bottom, code) {
    this._geoRegions.push({left: left, top: top, right: right,
                           bottom: bottom, code: code});
  },

  setEncounterCodeMap: function(mapData) {
    this._encounterCodeMap = mapData;
  },

  getRegion: function(x, y) {
    if (this._encounterCodeMap) {
	return this._encounterCodeMap[y][x];
    }
    for (var i = 0; i < this._geoRegions.length; i++) {
      var region = this._geoRegions[i];
      if (x >= region.left && x <= region.right &&
          y >= region.top && y <= region.bottom) {
        return region.code;
      }
    }
    return null;
  },
  
  rollEncounter: function(x, y, landType) {
    var regionCode = this.getRegion(x, y);
    var table = this.getMatchingTable(landType, regionCode);
    if (table == null) {
      return null;
    } else {
      return table.rollEncounter();
    }
  }
};


function BattleSystem(htmlElem, canvas, options) {
  var self = this;
  this._init(htmlElem);
  this._ctx = canvas.getContext("2d");
  this.hide();
  // this.endBattleCallbacks = []; // deprecated
  // use onClose instead
  this._attackSFX = null;
  this._statDisplayType = "battle";

  if (options.defaultMsg) {
    this.defaultMsg = options.defaultMsg;
  } else {
    this.defaultMsg = "Monsters appeared!";
  }

  if (options.defaultMonsterCmd) {
    this._defaultMonsterCmd = options.defaultMonsterCmd;
  } else {
    this._defaultMonsterCmd = new BatCmd({
      target: "random_enemy",
      effect: function(battle, user, target) {
        battle.showMsg(user.name + " uses PLACEHOLDER ATTACK on "
                       + target.name + "!");
      }
    });
    // so monsters have something to use if it's not defined elsewhere
  }
  if (options.defaultCmdSet) {
    this.defaultCmdSet = options.defaultCmdSet;
  }
  this._drawCallback = null;
  if (options.onDrawBattle) {
    this._drawCallback = options.onDrawBattle;
  }
  this._initiativeCallback = null;
  if (options.onRollInitiative) {
    this._initiativeCallback = options.onRollInitiative;
  }
  this._startBattleCallback = null;
  if (options.onStartBattle) {
    this._startBattleCallback = options.onStartBattle;
  }
  this._victoryCallback = null;
  if (options.onVictory) {
    this._victoryCallback = options.onVictory;
  }
  this._randomTargetCallback = null;

  this._endRoundCallback = null;
  if (options.onEndRound) {
    this._endRoundCallback = options.onEndRound;
  }

  var frameDelay = 50; // default (very fast)
  if (options.frameDelay) {
    frameDelay = options.frameDelay;
  }
  if (options.metaCmdSet) {
    this._rootMenu = this.menuFromCmdSet("Party", options.metaCmdSet);
  } else {
    this._rootMenu = null;
  }
  this._wholePartyCmd = null;

  this._effectHandlers = {};

  this._freelyExit = false;

  this._animator = new Animator(frameDelay,
                                function() {self.draw();});

  // Stuff to always do when battle ends:
  this.onClose(function() {
    self._animator.stop();
    if (self.player) {
      // tell player to re-jigger party in case people died during
      // battle TODO maybe put this in client code??
      self.player.marchInOrder();
    }
  });
}
BattleSystem.prototype = {
  getActiveParty: function() {
    // returns list of all PCs who are 1. alive and 2. have not fled
    // these are the ones who get to act and can be valid targets
    // of enemy attacks.
    var activeParty = [];
    for (var i =0 ; i< this._party.length; i++) {
      if (this._party[i].isAlive() && 
          !this._party[i].hasStatus("fled")) {
        activeParty.push(this._party[i]);
      }
    }
    return activeParty;
  },

  showMenuForPC: function(pc) {
    // kind of a hack to allow non-index-based access to menus
    // in case some pcs are dead:
    var index = this._party.indexOf(pc);
    var menu = this.pcMenus[index];
    this.pushMenu(menu);
    if (this._positioning.resetPerPC) {
      menu.setPos(this._positioning.menuLeft,
                  this._positioning.menuTop);
    }
    this.saveStackDepth();
  },

  choosePCCommand: function(pc, cmd, target) {
    // lock in the choice:
    pc.lockInCmd(cmd, target);
    // pop off any sub menus:
    this.restoreStackDepth();
    // show stats so player can see what's locked in:
    this.showPartyStats();

    var nextPC = this.getNextActingPC(pc);
    if (nextPC == null) {
      // If that was the last party member, then hide the menus
      // and start the round!
      this.fightOneRound();
    } else {
      // Otherwise, show menu for next alive party member!
      this.showMenuForPC(nextPC); 
   }
  },

  chooseWholePartyCmd: function(cmd, skipPCTurns) {
    this._wholePartyCmd = cmd;

    if (skipPCTurns) {
      for (var i = 0; i < this._party.length; i++) {
        this._party[i].setStatus("fleeing", true); 
        // so they won't act on thier turn
        // TODO maybe call this status something that implies
        // "busy with whole-party command" instead of fleeing
        // specifically -- no reason it can only work for escape
        // commands.
      }
    }
    this.fightOneRound();
  },

  chooseRandomEnemy: function(team) {
    var possibleTargets;
    if (team == "monster") {
	possibleTargets = this.monsters;
    } else {
	possibleTargets = this.getActiveParty();
    }

    if (this._randomTargetCallback) {
	return this._randomTargetCallback(possibleTargets);
    } else {
      return randomElementFromArray(possibleTargets);
    }
  },

  makeMenuForPC: function(pc, cmdSet) {
    var self = this;
    var cmdMenu = this.makeMenu();

    var addOneCmd = function(name, cmd) {
      // if this command has a submenu, then choosing it
      // just opens the submenu:
      if (cmd.isContainer) {
        cmdMenu.setTitle(pc.name);
        cmdMenu.addCommand(name, function() {
          self.pushMenu(self.makeMenuForPC(pc, cmd));
        });
      } else {
        // but if it's a "leaf node", then next step is to see
        // whether you can use it right now...
        if (!cmd.canUse(pc)) {
          cmdMenu.addCommand(name, function() {
            self.showMsg("Not enough MP!");
            // TODO what if this isn't the reason
          });
          return;
        }
        // and if you can, then pick a target...
        switch (cmd.target) {
        case "random_enemy":
          cmdMenu.addCommand(name, function() {
            self.choosePCCommand(pc, cmd, "random_monster");
          });
          break;
        case "ally":
          // if it targets one ally, then picking it pops open
          // the ally menu:
          cmdMenu.addCommand(name, function() {
            self.chooseCharacter("", function(target) {
              self.choosePCCommand(pc, cmd, target);
            });
          });
          break;
        default:
          // if no target needed, then choosing it
          // locks in the command for the PC.
          cmdMenu.addCommand(name, function() {
            self.choosePCCommand(pc, cmd, cmd.target);
          });
          break;
        }
      }
    };
    for (var name in cmdSet.cmds) {
      addOneCmd(name, cmdSet.cmds[name]);
    }
    return cmdMenu;
  },

  onChooseRandomTarget: function(callback) {
    this._randomTargetCallback = callback;
  },
 
  onStartBattle: function(callback) {
    this._startBattleCallback = callback;
  },

  onEndRound: function(callback) {
    this._endRoundCallback = callback;
  },
/*
  onEndBattle: function(callback) {
  // deprecated
    this.endBattleCallbacks.push(callback);
  },*/ 
  
  startBattle: function(player, encounter, landType) {
    // TODO this is similar to MenuSystemMixin.open() but not quite
    // the same:
    this._freelyExit = false;
    this.deadMonsters = [];
    this.player = player;
    this._party = player.getParty();
    this._htmlElem.show();
    this.clearMsg();
    this.landType = landType;
    this._attackSFX = null;
    this._whoseTurn = null; // currently only used to target counters

    this.monsters = [];
    if (encounter.number) {
      for (var i = 0; i < encounter.number; i++) {
        var monster = encounter.type.instantiate();
        // name them e.g. "Biteworm A", "Biteworm B" etc.
        var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        monster.setName(encounter.type.name + " " + letters[i]);
        this.monsters.push(monster);
      }
    }

    this.showMsg(this.defaultMsg);
    this.emptyMenuStack();
    this.pcMenus = [];
    for (var i = 0; i < this._party.length; i++) {
      // undo any "fled" status set at the end of last battle...
      this._party[i].setStatus("fled", false);
      this._party[i].setStatus("fleeing", false);

      // callback to userland to let menu be customized for this PC:
      var customCmds = this._party[i].customizeCmds(
        this.defaultCmdSet);
      this.pcMenus.push(this.makeMenuForPC(this._party[i],
                                           customCmds));
    }
    this.showPartyStats();
    this._animator.start();

    if (this._startBattleCallback) {
      // do any start-battle animation
      this._startBattleCallback(this);
    } else {
      // just start the round!
      this.showStartRoundMenu();
    }
  },

  draw: function() {
    if (this._drawCallback) {
      this._drawCallback(this._ctx, this.monsters, this.landType);
    } else {
      this._ctx.fillStyle = "black";
      this._ctx.fillRect(0, 0, 512, 384); // TODO no hardcode

      for (var i = 0; i < this.monsters.length; i++) {
        this.monsters[i].setPos(25 + 50 * i, 25);
        this.monsters[i].plot(this._ctx);
      }
    }

    if (this.menuImpl == "canvas" && this.monsters.length > 0) {
      // draw monster stats 
      // TODO make this FixedTextBox once, and give it a way to
      // update the text inside when needed. Then make it a special
      // case of menu system info window.
      // TODO position of this info window (and its existince)
      // should be set in userland.
      var monsterStatLines = [];
      monsterStatLines.push(this.monsters[0].name);
      for (var i = 0; i < this.monsters.length; i++) {
        var monsterName = this.monsters[i].name;
        var monsterLetter = monsterName[monsterName.length -1 ];
        monsterStatLines.push(monsterLetter + " " + this.monsters[i].getStat("hp"));
      }
      var box = new FixedTextBox(monsterStatLines, this);
      box.setPos(180, 0);
      box.display(this._ctx);
    }

    if (this.menuImpl == "canvas") {
      this.drawCanvasMenus(this._ctx);
    }

    // now draw any attack SFX:
    if (this._attackSFX) {
      this._attackSFX.draw(this._ctx);
    }
  },

  onDrawBattle: function(callback) {
    this._drawCallback = callback;
  },

  onRollInitiative: function(callback) {
    this._initiativeCallback = callback;
  },

  onVictory: function(callback) {
    this._victoryCallback = callback;
  },

  onEffect: function(effectName, callback) {
    // callback should take target and data, and do things using
    // target.setStat or target.modifyStat.
    this._effectHandlers[effectName] = callback;
    // TODO allow more than one??
  },

  showStartRoundMenu: function() {
    for (var i = 0; i < this.pcMenus.length; i++) {
      this.pcMenus[i].reset();
    }
    if (this._rootMenu) {
      this._wholePartyCmd = null;
      this._rootMenu.reset();
      this.pushMenu(this._rootMenu);
    } else {
      this.showFirstPCMenu();
    }
  },

  getNextActingPC: function(previousPC) {
    // Return the next PC after previousPC who can
    // go (is not dead/incapacitated). Returns null
    // if there are no more; if previousPC is null,
    // returns first PC who can act.
    var index;
    if (previousPC == null) {
      index = 0;
    } else {
      index = this._party.indexOf(previousPC) + 1;
    }
    while (index < this._party.length) {
      if (this._party[index].canAct()) {
        return this._party[index];
      }
      index++;
    }
    return null; // no next pc, this was last one
  },

  showFirstPCMenu: function() {
    var firstPC = this.getNextActingPC(null);
    if (firstPC) {
      this.showMenuForPC(firstPC);
    } else {
      // No PCs can act this turn-- could happen if like
      // everybody in the party was asleep or something. In which case
      // we just fight a round without asking anything.
      this.fightOneRound();
    }
  },

  repeatLastRoundCommands: function() {
    // (LONGTERM_TODO: retarget any command with a chosen target
    // that is no longer valid.)

    // make sure everyone has a command:
    var everyoneHasCommands = true;
    for (var i = 0; i < this._party.length; i++) {
      if (!this._party[i].getLockedInCmd()) {
        everyoneHasCommands = false;
      }
    }
    if (everyoneHasCommands) {
      this.fightOneRound();
    } else {
      this.showMsg("You haven't entered commands yet, so there's nothing to REPEAT.");
    }
  },

  setDefaultMonsterCmd: function(cmd) {
    // this command will be used by monsters without AI
    this._defaultMonsterCmd = cmd;
  },

  getDefaultMonsterCmd: function(cmd) {
    return this._defaultMonsterCmd;
  },

  fightOneRound: function() {
    var activeParty = this.getActiveParty();
    var fighters = activeParty.concat(this.monsters); //everyone
    var i;

    // Tick down all temporary stat mods - they expire now if
    // their duration has run out
    for (i = 0; i < fighters.length; i++) {
      fighters[i].tickDownMods();
    }

    // Choose actions for each monster
    for (i = 0; i < this.monsters.length; i++) {
      if (this.monsters[i].canAct()) {
        var name = this.monsters[i].name;
        this.monsters[i].defaultAI(this);
      }
    }

    // Apply START OF ROUND stat mods from chosen commands
    // i.e. the command you chose may affect your initiative order
    // or your defense for the round, so that must be applied before
    // rolling initiative.
    if (this._wholePartyCmd) {
      this._wholePartyCmd.onStartRound(this, activeParty);
    }
    for (i = 0; i < fighters.length; i++) {
      if (fighters[i].canAct()) {
        var action = fighters[i].getLockedInCmd();
        if (action.cmd.onStartRound) {
          action.cmd.onStartRound(this, fighters[i]);
        }
      }
    }

    if (this._initiativeCallback) {
      // if initiative callback is set, use it to determine
      // order of fighters - otherwise, the default order
      // is every PC followed by every monster.
      fighters = this._initiativeCallback(activeParty,
                                          this.monsters);
    }

    // hide menus
    this.emptyMenuStack();
    // build list of {fighter, cmd, target} objects:
    this._fightQueue = [];
    for (i = 0; i < fighters.length; i++) {
      if (fighters[i].canAct()) {
        var action = fighters[i].getLockedInCmd();
        this._fightQueue.push({fighter: fighters[i],
                               cmd: action.cmd,
                               target: action.target});
      }
    }
    this.executeNextFighterAction();
  },

  outOfSequenceAction: function(fighter, cmd, target) {
    // stick this on beginning of fight queue
    this._fightQueue.unshift({fighter: fighter,
                              cmd: cmd,
                              target: target});
  },

  executeNextFighterAction: function() {
    // first, make sure the fight hasn't ended:
    if (this.checkBattleEndConditions()) {
      // If battle has already ended mid-round,
      // don't continue executing.
      return;
    }
    this.displayElem.empty();// clear the message
    // Skip any dead or otherwise incapacitated people
    // (they may have died, fled, etc. during the round before their
    // turn came up)
    while (this._fightQueue.length > 0 && 
           !this._fightQueue[0].fighter.canAct()) {
      this._fightQueue.shift();
    }
    
    // If fight queue is empty, then round is done
    if (this._fightQueue.length == 0) {
      this.finishRound();
      return;
    }
    var fightRecord = this._fightQueue.shift();
    var fighter = fightRecord.fighter;
    var cmd = fightRecord.cmd;
    var target = fightRecord.target;
    this._whoseTurn = fighter;

    // choose random targets now, right before executing:
    if (target == "random_monster") {
      target = this.chooseRandomEnemy("monster");
    } else if (target == "random_pc") {
      target = this.chooseRandomEnemy("pc");
    }
    // Turn "all allies" and "all enemies" target types into
    // arrays:
    else if (target == "all_allies") {
      target = this.getAllies(fighter);
    } else if (target == "all_enemies") {
      target = this.getEnemies(fighter);
      console.log("All enemies of " + fighter.name + " is array: "+ target);
    }
        
    if (cmd) {
      cmd.effect(this, fighter, target);
    } else {
      this.showMsg(fighter.name + " has no idea what to do!");
    }
    // update stats display so we can see effects of action
    this.showPartyStats();

    // run animation for this action, then go on to execute next action.
    if (cmd.animate) {
      this._attackSFX = cmd.animate(this, fighter, target);
    } else {
      this._attackSFX = new Animation(10);
    }
    var self = this;
    this._attackSFX.onFinish(function() {
      self._attackSFX = null; // clear the attack sfx
      self.executeNextFighterAction();
    });
    this._animator.runAnimation(this._attackSFX);
  },

  finishRound: function() {
    var activeParty = this.getActiveParty();
    var fighters = activeParty.concat(this.monsters); //everyone
    for (var i = 0; i < fighters.length; i++) {
      // clear fleeing status so they can go again
      fighters[i].setStatus("fleeing", false);
      // any special end-of-round effects (e.g. poison damage)
    }

    if (this._endRoundCallback) {
      this._endRoundCallback(this, fighters);
    }

    if (this._wholePartyCmd) {
      if (this._wholePartyCmd.onEndRound) {
        this._wholePartyCmd.onEndRound(this, this.getActiveParty());
      }
    }
    this.clearMsg();
    this.showPartyStats(); // in case end of round effects changed 
    // anything
    this.showStartRoundMenu();
  },

  endBattle: function(winLoseRun) {
    // Trigger a ScrollingTextBox to come up
    // with end of battle messages; closing the ScrollingTextBox
    // closes the battle menu system.
    this._animator.cancelAllCallbacks();
    this.emptyMenuStack();
    this.pcMenus = [];
    this._attackSFX = null;
    this.clearMsg();

    // TODO another error:  topMenu.getPos is not a function
    // that appears to be the result of pushing a menu onto the
    // menu stack just as the menu stack is emptied.

    // Clear all temporary stat mods that happened to PCs during
    // the battle - these should not persist:
    for (var i = 0; i < this._party.length; i++) {
      this._party[i].clearTempStatMods();
    }
  
    var endBattleMessage;
    switch (winLoseRun) {
    case "win":
      this._freelyExit = true;
      if (this._victoryCallback) {
        endBattleMessage = this._victoryCallback(this.player,
                                                 this.deadMonsters);
      } else {
        endBattleMessage = "You won! Let's assume there is a whole lot of end battle text, including how many experience points you got, how much gold you got, whether anybody went up a level, and all that jazz.";
      }
      break;
    case "lose":
      endBattleMessage = "You lost! It is very sad. There should probably be a button here to reload a save or whatever.";
      break;
    case "run":
      this._freelyExit = true;
      endBattleMessage = "You bravely ran away, away!";
      break;
    }
    var endBattleText = new ScrollingTextBox(endBattleMessage, this);
    this.pushMenu(endBattleText);
  },

  sendEffect: function(target, effectName, data) {
    // Identify source of effect as whichever fighter just went:
    data.source = this._whoseTurn;
    
    // 1. if target has a handler for this name, call that
    // (target.takeEffect)

    data = target.takeEffect(effectName, data);
    // takeEffect will return null to mean prevent default, or
    // will return modified data....
    if (!data) {
      return;
    }

    // 2. if not, if i have a default handler, call the default handler
    if (this._effectHandlers[effectName]) {
      var result = this._effectHandlers[effectName](target, data);
    }
  },

  removeFromBattle: function(target) {
    // dead fighters will be skipped during command input and execution
    target.die();
    
    var index = this.monsters.indexOf(target);
    if (index > -1) {
      // if it's a monster...
      this.monsters.splice(index, 1);
      // remove it from active monsters list...
      this.deadMonsters.push(target);
      // and put it in the dead monsters list.

      // redraw so we see what's gone missing:
      this.draw();
    }
    
  },

  animate: function(animation) {
    this._animator.runAnimation(animation);
  },

  getAllies: function(fighter) {
    // returns array of everybody active on fighter's side
    if (this.monsters.indexOf(fighter) > -1) {
      return this.monsters;
    }
    if (this._party.indexOf(fighter) > -1) {
      return this.getActiveParty();
    }
    return [];
  },

  getEnemies: function(fighter) {
    // oppostite of getAllies: returns array of everybody
    // active on side opposing fighter.
    // The slice is to copy the array, so that the command's
    // effect function has a working copy that's guaranteed not
    // to be modified during iteration (if e.g. it kills some monsters
    // during the loop)
    if (this.monsters.indexOf(fighter) > -1) {
      return this.getActiveParty().slice();
    }
    if (this._party.indexOf(fighter) > -1) {
      return this.monsters.slice();
    }
    return [];
  },

  checkBattleEndConditions: function() {
    var activeParty = this.getActiveParty();

    if (this.monsters.length == 0) {
      // if all monsters die, you win!
      this.endBattle("win");
      return true;
    }
    
    if (activeParty.length == 0) {
      // if no pcs left fighting...
      for (var i = 0; i < this._party.length; i++) {
        if (this._party[i].isAlive() && 
           this._party[i].hasStatus("fled")) {
          // if any of them escaped, count it as a run
          this.endBattle("run");
          return true;
        }
      }
      // if nobody escaped, it's a tpk
      this.endBattle("lose");
      return true;
    }
    return false;
  }
};
MenuSystemMixin(BattleSystem.prototype);

function BatCmd(options) {
  if (options.cost) {
    this.cost = options.cost;
  }
  if (options.canUse) {
    this._canUse = canUse;
  }
  if (options.animate) {
    this.animate = options.animate;
  }
  if (options.name) {
    this.name = options.name;
  }
  this.target = options.target;
  this._effect = options.effect;
  this.onStartRound = options.onStartRound;
  this.onEndRound = options.onEndRound;
}
BatCmd.prototype = {
  isContainer: false,
  canUse: function(user) {
    if (this.cost) {
      if (user.getStat(this.cost.resource) < this.cost.amount) {
        return false;
      }
    }
    if (this._canUse) {
      return this._canUse(user);
    }
    return true;
  },
  effect: function(system, user, target) {
    if (!this.canUse) {
      system.showMsg(user.name + " can't use " + this.name);
      return; // can happen if e.g. you REPEAT a spell when out of MP
    }
    if (this.cost) {
      user.modifyStat(this.cost.resource, (-1)*this.cost.amount);
    }
    this._effect(system, user, target);
  }
};


function BattleCommandSet() {
  this.cmds = {};
}
BattleCommandSet.prototype = {
  add: function(name, battleCommand) {
    battleCommand.name = name;
    this.cmds[name] = battleCommand;
    // battleCommand can be another BattleCommandSet
    // so these sets can nest recursively.
  },

  get: function(name) {
    return this.cmds[name];
  },

  isContainer: true
};

function MonsterType(img, name, statBlock, commandList) {
  this.img = img;
  this.statBlock = statBlock;
  this.name = name;
  // TODO: monster AI callback
  // TODO: need a way to set some generic functions, like, default monster
  // AI, default monster on-die handler, etc. I guess we set those on
  // the battle system?
  if (commandList) {
    this._commandList = commandList;
  } else {
    this._commandList = [];
  }
  this._effectHandlers = {};
}
MonsterType.prototype = {
  onEffect: function(effectName, callback) {
    this._effectHandlers[effectName] = callback;
  },

  knowsCommand: function(cmd) {
    this._commandList.push(cmd);
  },

  instantiate: function() {
    // return a Monster instance
    var cloneStats = {};
    for (var name in this.statBlock) {
      cloneStats[name] = this.statBlock[name];
    }
    var cloneCmds = this._commandList.slice();
    return new Monster(this.img, cloneStats, cloneCmds,
                       this._effectHandlers);
  }
};

var BattlerMixin = function() {
  /* Used for Monsters and PlayerCharacters - anybody who can take
   * part in a battle. Syntax for using mixin:
   * BattlerMixin.call(class.prototype);  */
  this.battlerInit = function() {
    this._effectHandlers = {};
    this._statMods = [];
    this._stati = [];
    this._lockedAction = null;
    this._dead = false;
  };
  this.lockInCmd = function(cmd, target) {
    this._lockedAction = {cmd: cmd,
                          target: target};
  };
  this.getLockedInCmd =function() {
    return this._lockedAction;
  };
  this.setStats = function(statBlock) {
    this._statBlock = statBlock;
  };
  this.die = function() {
    this._dead = true;
  };
  this.revive = function() {
    this._dead = false;
  };
  this.isAlive = function() {
    return !this._dead;
  };
  this.setStat = function(statName, value) {
    this._statBlock[statName] = value;
  };
  this.getStat = function(statName) {
    // Add all tempStatMods.  Then figure out how that affects
    // PlayerCharacter's use of this method.
    var value = this.getBaseStat(statName);
    for (var i = 0; i < this._statMods.length; i++) {
      value += this._statMods[i].getVal(statName);
    }
    return value;
  };
  this.getBaseStat = function(statName) {
    return this._statBlock[statName];
  };
  this.getEquipmentStat = function(statName) {
    return 0;
  };
  this.hasStat = function(statName) {
    return (this._statBlock[statName] != undefined);
  };
  this.modifyStat = function(statName, delta) {
    this._statBlock[statName] += delta;
  };
  this.tickDownMods = function() {
    var modsStillActive = [];
    for (var i = 0; i < this._statMods.length; i++) {
      this._statMods[i].tickDown();
      if (this._statMods[i].isActive()) {
        modsStillActive.push(this._statMods[i]);
      }
    }
    this._statMods = modsStillActive;
    // TODO does this deletion pattern allow original array to be
    // garbage-collected correctly? Serious question.
  };
  this.tempStatMod = function(statName, amount, duration) {
    this._statMods.push(new TempStatMod(statName, amount, duration));
  };
  this.tempStatus = function(statusName, duration) {
    this._statMods.push(new TempStatusCondition(statusName, duration));
  };
  this.clearTempStatMods = function() {
    this._statMods = [];
  };
  this.onEffect = function(effectName, callback) {
    this._effectHandlers[effectName] = callback;
  };
  this.takeEffect = function(effectName, data) {
    if (this._effectHandlers[effectName]) {
      data = this._effectHandlers[effectName](this, data);
      // return null to prevent default
    }
    // otherwise, return (possibly modified) data to continue
    // with the default handler.
    return data;
  };
  this.setStatus = function(name, val) {
    this._stati[name] = val; // should be true or false only
  };
  this.hasStatus = function(name) {
    for (var i = 0; i < this._statMods.length; i++) {
      if (this._statMods[i].isStatus(name)) {
        return true;
      }
    }
    return !!(this._stati[name]);
  };
  this.canAct = function() {
    // TODO make this under-rideable; these specific status codes
    // belong in userland!!
    return (! this._dead ) && (! this.hasStatus("asleep")) &&
      (! this.hasStatus("fleeing")) && (! this.hasStatus("fled"));
  };
}

function Monster(img, statBlock, cmdList, effectHandlers) {
  this.battlerInit();
  this.img = img;
  this._statBlock = statBlock;
  this.x = null;
  this.y = null;
  this.name = "A Monster";
  this._commands = cmdList;
  this._effectHandlers = effectHandlers; // shallow copy, not cloned
};
Monster.prototype = {
  setName: function(name) {
    this.name = name;
  },
  setPos: function(x, y) {
    this.x = x;
    this.y = y;
  },
  plot: function(ctx) {
    ctx.drawImage(this.img, this.x, this.y);
  },
  defaultAI: function(battleSystem) {
    if (this._commands.length > 0) {
      var cmd = randomElementFromArray(this._commands);
    } else {
      cmd = battleSystem.getDefaultMonsterCmd();
    }
    var target = cmd.target;
    if (target == "ally") {
      target = randomElementFromArray(battleSystem.getAllies(this));
    } else if (target == "random_enemy") {
      target = "random_pc";
    }
    
    this.lockInCmd(cmd, target);
  }
};
BattlerMixin.call(Monster.prototype);

function TempStatMod(statName, amount, duration) {
  // give a battler one of these to give it +amount to statName for duration rounds
  this._statName = statName;
  this._amount = amount;
  this._duration = duration;
}
TempStatMod.prototype = {
  getVal: function(statName) {
    if (this._statName == statName) {
      return this._amount;
    } else {
      return 0;
    }
  },

  tickDown: function() {
    this._duration --;
  },

  isActive: function() {
    return (this._duration > 0);
  },

  isStatus: function(statusName) {
    return false;
  }
};

function TempStatusCondition(statusName, duration) {
  // give a battler one of these to give it the status for the given
  // duration
  this._statusName = statusName;
  this._duration = duration;
}
TempStatusCondition.prototype = {
  getVal: function(statName) {
    return 0;
  },

  tickDown: function() {
    this._duration --; // duplicated code
  },

  isActive: function() {
    return (this._duration > 0); // duplicated code
  },

  isStatus: function(statusName) {
    var result = (this._statusName == statusName);
    return result;
  }
};

/* TODO:
Part I: Monster Actions
(done) 1. name each monster
(default done) 2. have a callback for random target selection; if not provided, all enemy targets are equally likely. (define enemy target) (done)
(shared for now) 3. give monsters a default battle command set too
(done) 4. give monsters turns too
(default done) 5. AI callback that chooses which battle command a monster uses (default: it's always 'fight')
6. initiative callback to determine order of actions (default: it's random)

Part II: Game Mechanics
(done) 7. getStats and setStats
(done) 8. Message passing, registering message handlers
(done) 9. 'remove this guy from combat' function
(done) 10. write handler for "take damage" that removes guy from combat if hp drops to 0
(done) 11. have the fight command send the "take damage" message.
(done) 12. display PCs stats (at least HP) somewhere
(done) 13. trigger end battle (win or lose) when everybody on one side are wiped out
(done) 14. allow individual PC /individual monster types to override default command list with their own custom commands.
*/



/* TODO:

   monsters and players all get statblocks with 
   setStats(dictionary)
   setStat(name, value)
   getStat(name)

   create a stats display for each player character
   positioning and style of stats displays determined by css
   contents of stat display decided by userland callback

   battlesystem calls back userland to decide action order
   (here's an array of stat blocks. tell me who goes next!)

   on monster's go, call monster AI callback to let monster
   pick its action

   on PC's go, pop up a menu of that PC's commands

   one of the battlesystem options should be "batch commands" --
   if true, ask for action for all PCs at beginning of "round"
   (in which case, whoGoesNext callback should be able to say "end the
      round")(perhaps by returning null?)
   if false, each PC action is queried at the beginning of that PC's go.

   how about supporting a battle system where you put in the action but
   there's some time before it resolves (i.e. different actions have
   varying initiative penalties?)

   
   jake wants a kind of "aggro system" for monster target selection
   (that can really go in userland i think -- he just sets a stat
    called 'targetTickets' for each PC, uses that in the AI callback)


    want a 'standard command menu' which individual characters use as
    the default, but can override (especially override the magic 
      submenu).
      
    so there's probably a BattleCommandSet class which can recursively
    contain other BattleCommandSets
    and has some kind of .clone() method maybe? so you can clone it
    and then modify the clones?

    var fightCmds = new BattleCommandSet();
    fightCmds.add("CHARGE", function() {});
    fightCmds.add("STRIKE", function() {});
    // etc etc.
    var stdSet = new BattleCommandSet();
    stdSet.add("FIGHT", fightCmds);
    stdSet.add("MAGIC", null);
    // null means it's greyed out and not selectable
    
    hero.commandSet = stdSet.clone().replace("MAGIC", heroMagic);
    
    // note we want the subitems of MAGIC and the subitems of ITEM to
    be determined dynamically, at fight-start time, or better yet,
    when the menu is displayed.

    maybe each PC gets an (optional) customizeCommands callback? Now
    we're getting somewhere.

    hero.spellList = new BattleCommandSet();
    hero.spellList.add("HEAL", function() {});

    hero.onShowCommandMenu(function(pc, stdCmds) {
        stdCmds.replace("MAGIC", hero.magic);
        stdCmds.replace("ITEM", hero.items);
    });


    for implementing game mechanics like "take damage", "heal", etc
    make a message-passing API:

    something like
    
    battleSystem.onEffect("damage", function(target, effectData) {
       // the generic damage handler, which individual PCs or monster
       // types can override if they wish.
    });
    
    monsterType.onEffect("damage", function(monster, effectData) {
    });

    pc.onEffect("damage", function(monster, effectData) {
    });

    new BatCmd({
      effect: function(battle, user, target) {
        target.takeEffect("damage", {amount: 5, type: "fire"});
      }

   });

   
   Think about: how to chain multiple effect handlers together?
   Like, do we want to fall through to the default handler, or prevent
   it?

   How about: if you return an effectData, that gets passed to next
   handler in the chain. If you return nothing, the chain ends.

   This way, a fire-immune monster can be like:
   
   if (effectData.type == "fire") {
       effectData.amount = effectData.amount / 2;
   }
   return effectData;

   Battle system needs a callback for random *player* target selection
   too. If PC uses a "random_enemy" ability, how does it choose which
   one?

   Battle system doesn't need to know about hit points but it needs
   to know about how to remove a monster from the fight!

   Battle system needs "start battle" callback (mostly for animation)
*/
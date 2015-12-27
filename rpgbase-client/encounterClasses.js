
function randomElementFromArray(arr) {
  var index = Math.floor( Math.random() * arr.length);
  return arr[index];
}

function SpecialEncounter(number, type) {
  /* For special plot-relevant encounters, 
   * put this in an encounter
   * table instead of a {type, number} record */
  this.number = number;
  this.type = type;
  this._startCallback = null;
  this._winCallback = null;
  this._loseCallback = null;
}
SpecialEncounter.prototype = {
  onStart: function(callback) {
    this._startCallback = callback;
  },
  onWin: function(callback) {
    this._winCallback = callback;
  },
  onLose: function(callback) {
    this._loseCallback = callback;
  },
  canHappen: function(party) {
    // Override me!
    // if it returns false, then the
    // encounter will be nullified when rolled.
    return true;
  },
  start: function(system, party) {
    if (this._startCallback) {
      return this._startCallback(system, party);
    }
  },
  win: function(system, party) {
    if (this._winCallback) {
      return this._winCallback(system, party);
    }
  },
  lose: function(system, party) {
    if (this._loseCallback) {
      return this._loseCallback(system, party);
    }
  }
};


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

    if (encounter.special) {
      return encounter.special;
    }

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
  this._init(htmlElem, options.cursorImg, options.width, options.height);
  this._ctx = canvas.getContext("2d");
  this.hide();
  // this.endBattleCallbacks = []; // deprecated
  // use onClose instead
  this._attackSFX = null;
  this._statDisplayType = "battle";
  this._battleOver = false;

  if (options.startBattleMsg) {
    this.startBattleMsg = options.startBattleMsg;
  } else {
    this.startBattleMsg = "";
  }

  if (options.hasOwnProperty("retarget")) {
    this._autoRetarget = options.retarget;
  } else {
    this._autoRetarget = true;
  }

  if (options.defaultMonsterCmd) {
    this._defaultMonsterCmd = options.defaultMonsterCmd;
  } else {
    this._defaultMonsterCmd = new BatCmd({
      target: "random_enemy",
      effect: function(battle, user, target) {
        battle.showMsg(user.name + " USES PLACEHOLDER ATTACK ON "
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
  this._defeatCallback = null;
  if (options.onDefeat) {
    this._defeatCallback = options.onDefeat;
  }
  this._randomTargetCallback = null;

  this._endRoundCallback = null;
  if (options.onEndRound) {
    this._endRoundCallback = options.onEndRound;
  }
  // TODO refactor to have a general purpose event listener
  // registry instead of all these specific named methods!
  this._beginRoundCallback = null;
  if (options.onBeginRound) {
    this._beginRoundCallback = options.onBeginRound;
  }
  this._showMenuCallback = null;
  if (options.onShowMenu) {
    this._showMenuCallback = options.onShowMenu;
  }

  var frameDelay = 50; // default (very fast)
  if (options.frameDelay) {
    frameDelay = options.frameDelay;
  }
  if (options.metaCmdSet) {
    this._rootMenu = this.menuFromCmdSet(options.metaCmdSetName,
					 options.metaCmdSet);
  } else {
    this._rootMenu = null;
  }
  this._wholePartyCmd = null;

  this._effectHandlers = {};

  this._freelyExit = false;

  if (frameDelay > 0) {
    this._animator = new Animator(frameDelay,
                                  function() {self.draw();});
  } else {
    // if frameDelay is zero, then no animation
    this._animator = null;
  }

  // Stuff to always do when battle ends:
  this.onClose(function() {
    if (self._animator) {
      self._animator.stop();
    }
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
    console.log("Show menu for pc called");
    // kind of a hack to allow non-index-based access to menus
    // in case some pcs are dead:
    var index = this._party.indexOf(pc);
    var menu = this.pcMenus[index];
    this.pushMenu(menu);
    if (this._positioning.resetPerPC) {
      // Negative value means offset from bottom:
      var pos = this.getScaledMenuPos();
      menu.setPos(pos.x, pos.y);
    }
    this.saveStackDepth();

    if (this._showMenuCallback) {
      this._showMenuCallback(this, pc);
    }
  },

  choosePCCommand: function(pc, cmd, target) {
    // lock in the choice:
    pc.lockInCmd(cmd, target);
    // pop off any sub menus:
    this.restoreStackDepth();
    // show stats so player can see what's locked in:
    this.updateStats();

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
        // container with stuff in it: recurse!
        //cmdMenu.setTitle(pc.name); // TODO title maybe 
        // desired by some games but not moonserpent.
        cmdMenu.addCommand(name, function() {
          self.pushMenu(self.makeMenuForPC(pc, cmd));
        });
      } else {
        // but if it's a "leaf node", then next step is to see
        // whether you can use it right now...
        if (!cmd.canUse(pc)) {
          cmdMenu.addCommand(name, function() {
            self.scrollText("NOT ENOUGH MP!");
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
        case "one_enemy":
          // if it targets one enemy, then picking it pops open
          // the enemy menu:
          cmdMenu.addCommand(name, function() {
            self.chooseOne("", self.monsters, function(target) {
              self.choosePCCommand(pc, cmd, target);
            });
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
    cmdSet.forEach(addOneCmd);

    // special-case the empty container:
    if (cmdSet.isEmpty()) {
      // put a placeholder command that does nothing
      cmdMenu.addCommand("NOTHING", function() {
      });
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
    // TODO allow more than one callback for some of these events?
    this._endRoundCallback = callback;
  },

  onBeginRound: function(callback) {
    this._beginRoundCallback = callback;
  },

  onShowMenu: function(callback) {
    this._showMenuCallback = callback;
  },
/*
  onEndBattle: function(callback) {
  // deprecated
    this.endBattleCallbacks.push(callback);
  },*/ 
  
  startBattle: function(player, encounter, landType) {
    // TODO this is similar to MenuSystemMixin.open() but not quite
    // the same:
    var self = this;
    this._battleOver = false;
    this._freelyExit = false;
    this.deadMonsters = [];
    this.player = player;
    this._party = player.getParty();
    if (this.menuImpl == "css") {
      this._htmlElem.show();
    }
    this.clearMsg();
    this.landType = landType;
    this._attackSFX = null;
    this._whoseTurn = null; // currently only used to target counters
    this.encounter = encounter;

    var encounterGroups = null;
    // A mixed-type encounter could look like this:
    // {groups: [{number: 1, type: hawk}, {number:2, type: bandit}, {number:1, type: commander}]}
    // but an old style-single type encounter looks like this:
    // {number: 3, type: wolf}

    if (encounter.groups) {
      encounterGroups = encounter.groups
    } else {
      encounterGroups = [encounter]; // backwards compatibility
    }

    this._fixedDisplayBoxes = [];
    this.peacefulResolutionText = null;

    // Monster name box: (TODO should this be moved out to moonserpent actually?)
    this._monsterNameBox = this.makeFixedTextBox([encounterGroups[0].type.name]);
    // Right-align option...
    if (this._positioning.monsterNameX == "right") {
        this._monsterNameBox.setPos(this._screenWidth - this._monsterNameBox.outsideWidth(),
                                    this._positioning.monsterNameY);
    } else {
        this._monsterNameBox.setPos(this._positioning.monsterNameX, this._positioning.monsterNameY);
    }
    // TODO create right-align option?
    this._fixedDisplayBoxes.push(this._monsterNameBox);

    // Give each monster a letter for a name:
    var monsterStatLines = [];
    this.monsters = [];

    $.each(encounterGroups, function(i, group) {
      for (var i = 0; i < group.number; i++) {
        var monster = group.type.instantiate();
        // name them e.g. "Biteworm A", "Biteworm B" etc.
        var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        monster.setName(group.type.name + " " + letters[i]);
        self.monsters.push(monster);
        monsterStatLines.push("   ");
      }
    });

    // Monster HP display:
    // (Note repeates a lot of code from monster name box. TODO refactor!
    this._monsterHitPoints = this.makeFixedTextBox(monsterStatLines);
    // Right-align option...
    if (this._positioning.monsterStatsX == "right") {
        this._monsterHitPoints.setPos(this._screenWidth - this._monsterHitPoints.outsideWidth(),
                                    this._positioning.monsterStatsY);
    } else {
        this._monsterHitPoints.setPos(this._positioning.monsterStatsX,
                                      this._positioning.monsterStatsY);
    }
    this._fixedDisplayBoxes.push(this._monsterHitPoints);

    if (this.startBattleMsg && this.startBattleMsg != "") {
      this.showMsg(this.startBattleMsg);
    }
    this.emptyMenuStack();
    this.pcMenus = [];

    for (var i = 0; i < this._party.length; i++) {
      // undo any "fled" status set at the end of last battle...
      this._party[i].setStatus("fled", false);
      this._party[i].setStatus("fleeing", false);
    }

    this.updateStats();
    if (this._animator) {
      this._animator.start();
    }

    // startBattleCallback needs to itself take a callback!
    var afterAnimation = function() {
      if (encounter.start) {
        encounter.start(self, self.player);
      }
      self.showStartRoundMenu();
    };

    if (this._startBattleCallback) {
      // do any start-battle animation
      this._startBattleCallback(this, afterAnimation);
    } else {
      // just start the round!
      afterAnimation();
    }
  },

  updateStats: function() {
    this.showPartyStats();
    // update monster stats (hit points) display:
    if (this.menuImpl == "canvas" && this.monsters.length > 0) {
      var monsterStatLines = [];
      for (var i = 0; i < this.monsters.length; i++) {
        var hp = this.monsters[i].getStat("hp");
        if (hp >= 100) {
          monsterStatLines.push("" + hp);
        } else if (hp >= 10) {
          monsterStatLines.push(" " + hp);
        } else {
          monsterStatLines.push("  " + hp);
        }
      }
      this._monsterHitPoints.setText(monsterStatLines);
    }
  },

  draw: function() {
    if (this._drawCallback) {
      this._drawCallback(this._ctx, this.monsters, this.landType);
    } else {
      this._ctx.fillStyle = "black";
      this._ctx.fillRect(0, 0, this._screenWidth, this._screenHeight);
      // draw monsters:
      for (var i = 0; i < this.monsters.length; i++) {
        this.monsters[i].setPos(25 + 50 * i, 25);
        this.monsters[i].plot(this._ctx);
      }
    }
    // draw menus
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

  onDefeat: function(callback) {
    this._defeatCallback = callback;
  },
  
  onGameOver: function(callback) {
    this._gameOverCallback = callback;
  },

  onEffect: function(effectName, callback) {
    // callback should take target and data, and do things using
    // target.setStat or target.modifyStat.
    this._effectHandlers[effectName] = callback;
    // TODO allow more than one??
  },

  showStartRoundMenu: function() {
    console.log("Show start round menu called");
    // Adjust PC menu contents in case there were any changes last round
    // (e.g. single-use items used up)
    this.pcMenus = [];
    for (var i = 0; i < this._party.length; i++) {
      // callback to userland to let menu be customized for this PC:
      var customCmds = this._party[i].customizeCmds(
          this.defaultCmdSet);
      // TODO this means I'm going to be replacing one pcMenu with another, potentially
      // breaking any references to it...? does this break anything?
      this.pcMenus.push(this.makeMenuForPC(this._party[i],
                                           customCmds));
    }

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
    console.log("Show first pc menu called");
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
    // make sure everyone has a command and that they're still legal:
    for (var i = 0; i < this._party.length; i++) {
      var pc = this._party[i];
      var lockin = pc.getLockedInCmd();
      if (!lockin || !lockin.cmd) {
        this.scrollText("YOU HAVEN'T ENTERED ANY COMMANDS YET TO REPEAT.");
        return;
      }

      if (!lockin.cmd.canUse(pc)) {
        this.scrollText("NOT ENOUGH MP."); // TODO what if this isn't the reason?
        // canUse should actually return a record with both true/false and error msg.
        // or mabye change name to ".unusable" and have it return an error msg or falsy to
        // be usable.
        return;
      }

      // TODO we have lockin.target, so check also for the target no longer being valid...!
    }
    // If all commands are OK, then just start the round, everyone will reuse
    // their locked-in commands from last round.
    this.fightOneRound();
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

    if (this._beginRoundCallback) {
      this._beginRoundCallback(this, fighters);
    }

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
      this.finishRound();
      return;
    }
    if (this.menuImpl == "css") {
      this.displayElem.empty();// clear the message
    }
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

    if (this._autoRetarget) {
      // If autoRetarget option is true, then if the target has died or
      // fled before a single-target attack has resolved, a new random
      // target is selected instead:
      if (target.hasOwnProperty("_statBlock")) {
        // meaning target is an individual ally/enemy and not a string code
        if (target._dead || target.hasStatus("fled")) {
          // no longer a valid target for most things;
          // TODO EXCEPTION
          // revive spells could target dead fighters

          // If target was a monster, pick another monster; if target
          // was a PC pick another PC.
          if (this.monsters.indexOf(target) > -1 || this.deadMonsters.indexOf(target) > -1) {
            target = "random_monster";
          }
          else if (this._party.indexOf(target) > -1) {
            target = "random_pc";
          }
        }
      }
    }

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
    this.updateStats();

    // run animation for this action, then go on to execute next action.
    var self = this;
    if (this._animator) {
      if (cmd.animate) {
        this._attackSFX = cmd.animate(this, fighter, target);
      } else {
        this._attackSFX = new Animation(10);
      }
      this._attackSFX.onFinish(function() {
        self._attackSFX = null; // clear the attack sfx
        self.executeNextFighterAction();
      });
      this._animator.runAnimation(this._attackSFX);
    } else {
      // if animation disabled, just go to next fighter action now:
      self.executeNextFighterAction();
    }
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
    this.updateStats(); // in case end of round effects changed 
    // anything
    if (!this._battleOver) {
      // Unless fight has ended already, show menu for next round
      this.showStartRoundMenu();
    }
  },

  endBattle: function(winLoseRun) {
    // Trigger a ScrollingTextBox to come up
    // with end of battle messages; closing the ScrollingTextBox
    // closes the battle menu system.
    if (this._animator) {
      this._animator.cancelAllCallbacks();
    }
    this.emptyMenuStack();
    this.pcMenus = [];
    this._fixedDisplayBoxes = [];
    this._attackSFX = null;
    this._battleOver = true;
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
      if (this._victoryCallback) {
        // Regular battle victory -- call victory callback, and use its return value
        // for the end of battle text.
        endBattleMessage = this._victoryCallback(this.player,
                                                 this.deadMonsters);
      } else {
        endBattleMessage = "You won! Let's assume there is a whole lot of end battle text, including how many experience points you got, how much gold you got, whether anybody went up a level, and all that jazz.";
      }

      /* If there's a special encounter in effect, call its win callback, AND replace the
       * normal end-of-battle text with the special encounter end-of-battle-text (i.e.
       * whatever is returned.) */
      if (this.encounter.win) {
        var specialMessage = this.encounter.win(this, this.player);
        if (specialMessage != null) {
          endBattleMessage = specialMessage;
        }
      }
      break;
    case "lose":
        if (this._defeatCallback) {
            endBattleMessage = this._defeatCallback();
        } else {
            endBattleMessage = "YOU LOST! IT IS VERY SAD. DEFEAT TEXT GOES HERE.";
        }
      if (this.encounter.lose) {
        // special encounter lose results
        var specialMessage  = this.encounter.lose(this, this.player);
        if (specialMessage != null) {
          endBattleMessage = specialMessage;
        }
      }
      break;
    case "run":
      endBattleMessage = "YOU BRAVELY RAN AWAY, AWAY!";
      break;
    case "peace":
      endBattleMessage = this.peacefulResolutionText || "THE ENCOUNTER RESOLVES PEACEFULLY.";
      break;
    }
    var endBattleText = this.scrollText(endBattleMessage);
    var self = this;
    endBattleText.onClose(function() {
      self._freelyExit = true;
      self.close();
      if (winLoseRun == "lose" && self._gameOverCallback) {
        self._gameOverCallback();
      }
    });
    //endBattleText.setPos(16, 16);
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
    var result;
    if (this._effectHandlers[effectName]) {
      var result = this._effectHandlers[effectName](target, data);
    }

    return result;
    // TODO can this return stuff??
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
    // TODO set some kind of guard flag? didn't we used to have one?
    var activeParty = this.getActiveParty();

    // if all monsters are dead or fled, you win:
    var aliveMonsters = false;
    for (var i = 0; i < this.monsters.length; i++) {
        if (this.monsters[i].isAlive() &&
            !this.monsters[i].hasStatus("fled")) {
            aliveMonsters = true;
        }
    }
    if (!aliveMonsters) {
      // you win!
      this.endBattle("win");
      return true;
    }
    // TODO how do peaceful and fled interact?

    // if all monsters are peaceful, it's a peaceful resolution:
    var peacefulResolution = true;
    for (var i = 0; i < this.monsters.length; i++) {
      if (this.monsters[i].isAlive() &&
         !this.monsters[i].hasStatus("peaceful")) {
         peacefulResolution = false;
      }
    }
    if (peacefulResolution) {
      this.endBattle("peace");
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

// name-> instance map, 
// for recovering spell references after game reload
var g_batCmdHack = {
};

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
  this.wrapsItem = options.reference; // undefined if not item
}
BatCmd.prototype = {
  isContainer: false,
  canUse: function(user) {
    // TODO what if usability depends on target selection?
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
  this._cmds = [];
}
BattleCommandSet.prototype = {
  add: function(name, battleCommand) {
    // note this allows multiple commands with the same name to be
    // added. Use .replace() if you don't want this.
    battleCommand.name = name;
    this._cmds.push(battleCommand);
    // battleCommand can be another BattleCommandSet
    // so these sets can nest recursively.

    if (name && !battleCommand.isContainer) {
      g_batCmdHack[name] = battleCommand;
    }
  },

  get: function(name) {
    // gets a command by name. Returns the first match if there
    // is more than one.
    for (var i = 0; i < this._cmds.length; i++) {
      if (this._cmds[i].name == name) {
        return this._cmds[i];
      }
    }
    return null;
  },

  forEach: function(callback) {
    for (var i = 0; i < this._cmds.length; i++) {
      callback(this._cmds[i].name, this._cmds[i]);
    }
  },

  replace: function(name, battleCommand) {
    // remove old one by this name if it exists:
    for (var i = 0; i < this._cmds.length; i++) {
      if (this._cmds[i].name == name) {
        this._cmds.splice(i, 1);
        break;
      }
    }
    this.add(name, battleCommand);
  },
  
  isEmpty: function() {
    return (this._cmds.length == 0);
  },

  deepCopy: function() {
    var copy = new BattleCommandSet();
    this.forEach(function(name, cmd) {
      if (cmd.isContainer) {
        copy.add(name, cmd.deepCopy()); // recursively deep copy sub-menus
      } else {
        copy.add(name, cmd);
      }
    });
    return copy;
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

  this._loot = null; // loot table
}
MonsterType.prototype = {
  onEffect: function(effectName, callback) {
    this._effectHandlers[effectName] = callback;
  },

  knowsCommand: function(cmd) {
    this._commandList.push(cmd);
  },
  
  setLootTable: function(lootTable) {
    this._loot = lootTable;
  },

  instantiate: function() {
    // return a Monster instance
    var cloneStats = {};
    for (var name in this.statBlock) {
      cloneStats[name] = this.statBlock[name];
    }
    var cloneCmds = this._commandList.slice();
    var instance = new Monster(this.img, cloneStats, cloneCmds,
                               this._effectHandlers);
    if (this._loot) {
      instance.loot = this._loot;
    }
    return instance;
  }
};

// Prototype hackery! Allows us to set a default function for every class that uses
// BattlerMixin:
var Battler = {
  _subClassPrototypes: [],
  
  setDefault: function(propertyName, value) {
    for (var i = 0; i < this._subClassPrototypes.length; i++) {
      this._subClassPrototypes[i][propertyName] = value;
    }
  }
};
var BattlerMixin = function() {
  /* Used for Monsters and PlayerCharacters - anybody who can take
   * part in a battle. Syntax for using mixin:
   * BattlerMixin.call(class.prototype);  */

  Battler._subClassPrototypes.push(this);

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

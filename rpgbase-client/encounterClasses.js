
function randomElementFromArray(arr) {
  var index = rollDice(1, arr.length) - 1;
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

function BattleSystem(htmlElem, canvas, eventService, options) {
  var self = this;
  this.eventService = eventService;
  this.gameEventSubscriberInit();

  this._init(htmlElem, options.cursorImg, options.width, options.height);
  this._ctx = canvas.getContext("2d");
  this.hide();
  this._attackSFX = null;
  this._statDisplayType = "battle";
  this._battleOver = false;
  this._animationQueue = [];

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
  this._randomTargetCallback = null;


  // TODO the following options are all standard eventService handlers; we
  // could combine them.
  if (options.onStartBattle) {
    this.onStartBattle(options.onStartBattle);
  }
  if (options.onEndBattle) {
    this.onEndBattle(options.onEndBattle);
  }
  if (options.onEndRound) {
    this.onEndRound(options.onEndRound);
  }
  if (options.onBeginRound) {
    this.onBeginRound(options.onBeginRound);
  }
  if (options.onShowMenu) {
    this.onShowMenu(options.onShowMenu);
  }

  var frameDelay = 50; // default (very fast)
  if (options.hasOwnProperty("frameDelay")) {
    frameDelay = options.frameDelay;
  }
  if (options.metaCmdSet) {
    this._rootMenu = this.menuFromCmdSet(options.metaCmdSetName,
					 options.metaCmdSet);
  } else {
    this._rootMenu = null;
  }
  this._wholePartyCmd = null;
  this._freelyExit = false;

  if (frameDelay > 0) {
    this._animator = new Animator(frameDelay,
                                  function() {self.draw();});
  } else {
    // if frameDelay is zero, then no animation
    // TODO maybe we can deprecate this option?
    this._animator = null;
  }

  // Subscribe my own default event handlers:
  this.subscribeEvent(this.eventService, "attack", this.onAttackEvent);
  this.subscribeEvent(this.eventService, "attack-declared", this.onAttackDeclaredEvent);
  this.subscribeEvent(this.eventService, "attack-resolved", this.onAttackResolvedEvent);


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
    // kind of a hack to allow non-index-based access to menus
    // in case some pcs are dead:
    var index = this._party.indexOf(pc);
    var menu = this.pcMenus[index];
    this.pushMenu(menu);
    if (this._positioning.resetPerPC) {
      // Negative value means offset from bottom:
      //var pos = this.getScaledMenuPos();
      menu.setPos(this._positioning.menuLeft,
                  this._positioning.menuTop);
    }
    this.saveStackDepth();

    this.eventService.fireGameEvent("menu-shown", {pc: pc});
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

  monsterMenu: function(title, callback) {
    this.chooseOne(title, this.monsters, callback);
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
          self.eventService.fireGameEvent("submenu-shown", {name: cmd.name,
                                                            pcName: pc.name});
        });
      } else {

        // if pc has a cmdDisplayText function use that instead of name
        if (pc.cmdDisplayText) {
          name = pc.cmdDisplayText(cmd, self);
        }

        // but if it's a "leaf node", then next step is to see
        // whether you can use it right now...
        var result = cmd.checkUsability(self, pc);
        if (!result.usable) {
          cmdMenu.addCommand(name, function() {
            // Show reason why command is not usable:
            self.eventService.fireGameEvent("invalid-selection", {});
            self.scrollText(result.reason).finishPage();
            // is "scrollText().finishPage()" the new .showMsg() ?
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
            self.monsterMenu("", function(target) {
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

  // The following five methods are all standard event service handlers --
  // these could easily be combined into one function.
  onStartBattle: function(callback) {
    this.subscribeEvent(this.eventService, "start-battle", callback);
  },

  onEndBattle: function(callback) {
    this.subscribeEvent(this.eventService, "end-battle", callback);
  },

  onEndRound: function(callback) {
    this.subscribeEvent(this.eventService, "end-round", callback);
  },

  onBeginRound: function(callback) {
    this.subscribeEvent(this.eventService, "begin-round", callback);
  },

  onShowMenu: function(callback) {
    this.subscribeEvent(this.eventService, "menu-shown", callback);
  },

  _instantiateMonsters: function(encounterGroups) {
    // Instantiate monsters from monters types and give each monster a letter for a name:
    var monsters = [];
    $.each(encounterGroups, function(i, group) {
      for (var i = 0; i < group.number; i++) {
        var monster = group.type.instantiate();
        // name them e.g. "Biteworm A", "Biteworm B" etc.
        var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        monster.setName(group.type.name + " " + letters[i],
                        group.type.pluralName);
        monsters.push(monster);
      }
    });
    return monsters;
  },

  startBattle: function(player, encounter, landType, options) {
    /* player: the player object.
     * encounter: either a dictionary of monster number and type, or an encounter
     *   object with a .monsters property. see below.
     * landType: a code for where the encounter is taking place, used to select
     *   background image.
     * options: if provided, an object - supports the following options:
     *   .startMsg: a message displayed instead of default startBattleMsg
     *   .startConvo: a multipart conversation, optionally with portraits,
     *      of the kind that you'd pass into dialoglog. Battle starts after
     *      whole conversation is finished.
     */
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
    //this._whoseTurn = null; // currently only used to target counters
    this.encounter = encounter;
    this._fixedDisplayBoxes = [];
    this.peacefulResolutionText = null;
    this.monsters = [];
    this._endBattleText = "";
    this._endBattleConvo = null;

    var encounterGroups = null;
    // A mixed-type encounter could look like this:
    // {groups: [{number: 1, type: hawk}, {number:2, type: bandit}, {number:1, type: commander}]}
    // but an old style-single type encounter looks like this:
    // {number: 3, type: wolf}

    if (encounter.groups) {
      // Option where we pass in groups, each containing monster type and number
      this.monsters = this._instantiateMonsters(encounter.groups);
    } else if (encounter.monsters) {
      // Option where we pass in already-instantiated monster list:
      this.monsters = encounter.monsters;
    } else {
      // backwards compatibility: single type and number (moonserpent uses this one)
      this.monsters = this._instantiateMonsters([encounter]);
      var monsterTypeTitle = encounter.type.name;
    }

    // Monster name box: (TODO should this be moved out to moonserpent actually?)
    if (monsterTypeTitle) {
      this._monsterNameBox = this.makeFixedTextBox(monsterTypeTitle);
      // Right-align option...
      if (this._positioning.monsterNameX == "right") {
        this._monsterNameBox.setPos(this._screenWidth - this._monsterNameBox.outsideWidth(),
                                    this._positioning.monsterNameY);
      } else {
        this._monsterNameBox.setPos(this._positioning.monsterNameX, this._positioning.monsterNameY);
      }
      // TODO create right-align option?
      this._fixedDisplayBoxes.push(this._monsterNameBox);
    }

    // Monster HP display: (TODO should be moved out to moonserpent, or made an option?)
    var monsterStatLines = [];
    $.each(this.monsters, function(i,x) { monsterStatLines.push("   "); });
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

    this.eventService.fireGameEvent("start-battle", {});

    if (encounter.start) {
      encounter.start(self, self.player); // TODO this could be rewritten as a
      // "start-battle" listener? (especially if start-battle event data included an
      // encounter reference)
    }

    if (this._animationQueue.length > 0) {
      // In case any start-battle listener pushed an animation onto our queue:
      // play that animation before proceeding. TODO this duplicates logic from
      // runEventQueue; could we use that somehow?

      var nextAnimation = this._animationQueue.shift();
      // TODO this only handles one animation, would there ever be multiple?
      nextAnimation.onFinish(function() {
        // after animation continue with the next step of starting battle:
        self._showStartMessage(options);
      });
      this._animator.runAnimation(nextAnimation);
    } else {
      // if no animation, continue with the next step immediately:
      this._showStartMessage(options);
    }
  },

  _showStartMessage: function(options) {
    /* Continuation of startBattle after the starting animation.
     * If there's a whole start-of-battle conversation, require the player
     * to page through it before the battle proper starts. If there's just
     * a single line, show it as a non-blocking message. */
    var self = this;
    if (options && options.startConvo && options.startConvo.length > 0) {
      this._multipartTextDisplay(options.startConvo, function() {
        self.showStartRoundMenu();
      });
    } else if (options && options.startMsg && options.startMsg !== "") {
      this._multipartTextDisplay(options.startMsg, function() {
        self.showStartRoundMenu();
      });
    } else if (this.startBattleMsg && this.startBattleMsg != "") {
      this.showMsg(this.startBattleMsg);
      this.showStartRoundMenu();
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

  onGameOver: function(callback) {
    this._gameOverCallback = callback;
  },

  showStartRoundMenu: function() {
    if (this.checkBattleEndConditions()) {
      // edge case - the battle is over before it starts - bail out!
      return;
    }

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

    this._wholePartyCmd = null;
    for (var i = 0; i < this.pcMenus.length; i++) {
      this.pcMenus[i].reset();
    }
    if (this._rootMenu) {
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
    // make sure everyone has a command and that they're still legal:
    for (var i = 0; i < this._party.length; i++) {
      var pc = this._party[i];
      var lockin = pc.getLockedInCmd();
      if (!lockin || !lockin.cmd) {
        this.scrollText("YOU HAVEN'T ENTERED ANY COMMANDS YET TO REPEAT.");
        return;
      }

      var result = cmd.checkUsability(this, pc);
      if (!result.usable) {
        // Show reason why PC can not repeat last round's command
        // (e.g. because they're out of MP):
        this.scrollText(result.reason);
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

    this.eventService.fireGameEvent("begin-round", {});

    // Tick down all temporary stat mods - they expire now if
    // their duration has run out
    for (i = 0; i < fighters.length; i++) {
      fighters[i].tickDownMods();
    }

    // Choose actions for each monster
    for (i = 0; i < this.monsters.length; i++) {
      var monster = this.monsters[i];
      if (monster.canAct()) {
        var name = monster.name;
        this.monsters[i].pickAction(this);
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
    // build up an event queue of attacks:
    for (i = 0; i < fighters.length; i++) {
      if (fighters[i].canAct()) {
        var action = fighters[i].getLockedInCmd();

        // note this target may not be final target
        var attackEventData = {source: fighters[i],
                               cmd: action.cmd,
                               target: action.target,
                               hits: []
                              };

        // The four event stages of every attack:
        this.eventService.queueGameEvent("attack-declared", attackEventData);
        this.eventService.queueGameEvent("attack-targeted", attackEventData);
        this.eventService.queueGameEvent("attack", attackEventData);
        this.eventService.queueGameEvent("attack-resolved", attackEventData);
      }
    }
    this.runEventQueue(); // this will call finishRound() when it's done.
  },

  outOfSequenceAction: function(fighter, cmd, target) {
    // sticks an attack on the beginning of the attack queue. Use for
    // counterattacks, bonus attacks, etc.
    var counterAttackData = {source: fighter,
                             cmd: cmd,
                             target: target,
                             hits: []
                            };
    // since we're stacking these, put them on in the reverse order that we want
    // them to happen:
    this.eventService.stackGameEvent("attack-resolved", counterAttackData);
    this.eventService.stackGameEvent("attack", counterAttackData);
    this.eventService.stackGameEvent("attack-targeted", counterAttackData);
    this.eventService.stackGameEvent("attack-declared", counterAttackData);
  },
  
  onAttackEvent: function(eventData) {
    if (this.menuImpl == "css") {
      this.displayElem.empty();// clear the message
    }
      
    if (eventData.cmd) {
      eventData.cmd.effect(this, eventData.source, eventData.target);
    } else {
      this.showMsg(eventData.source.name + " has no idea what to do!");
    }
    // update stats display so we can see effects of action
    this.updateStats();
    
  },

  onAttackDeclaredEvent: function(eventData) {

    /* Check if this declared attack is still a legal attack.
       If it's not, cancel the attack OR retarget it.
       This is also where we turn attack target declaration strings
       (like "all_enemies" or "random_enemy") into concrete object references.
     */

    // If attacker was disabled before their turn came, cancel the attack:
    if (eventData.source.canAct() == false) {
      eventData.target = null; // do not propagate to original target
      this.eventService.cancelEvent("attack-targeted");
      this.eventService.cancelEvent("attack");
      this.eventService.cancelEvent("attack-resolved");
      return;
    }

    // For single target attacks, check target is still valid:
    var target = eventData.target;
    var cmd = eventData.cmd;
    if (target.hasOwnProperty("_statBlock")) {
      // meaning target is an individual ally/enemy and not a string code
      if ((target._dead && !cmd.targetsDead) || target.hasStatus("fled")) {
        // Cannot target battlers who have died or fled already.
        // TODO other reasons something can no longer be targeted??
        // set targetsDead = true for commands that are supposed to target
        // dead people, e.g. Revive spell.

        if (this._autoRetarget) {
          /* If autoRetarget option is true, select a new random target:
           * If target was a monster, pick another monster; if target
           * was a PC pick another PC. (this will retarget heals as well as attacks)*/
          if (this.monsters.indexOf(target) > -1 || this.deadMonsters.indexOf(target) > -1) {
            target = "random_monster";
          }
          else if (this._party.indexOf(target) > -1) {
            target = "random_pc";
          }
        } else {
          // If autoRetarget option is false, then we must cancel this now invalid attack.
          eventData.target = null; // do not propagate to original target
          this.eventService.cancelEvent("attack-targeted");
          this.eventService.cancelEvent("attack");
          this.eventService.cancelEvent("attack-resolved");
          return;
        }
      }
    }

    // If the attack is going ahead, then interpret attack intention strings:

    // For the "random" strings, choose random targets now, right before executing:
    if (target == "random_monster") {
      target = this.chooseRandomEnemy("monster");
    } else if (target == "random_pc") {
      target = this.chooseRandomEnemy("pc");
    }
    // Turn "all allies" and "all enemies" target types into
    // arrays:
    else if (target == "all_allies") {
      target = this.getAllies(eventData.source);
    } else if (target == "all_enemies") {
      target = this.getEnemies(eventData.source);
    }
    else if (target == "self") {
      // target yourself
      target = eventData.source;
    }

    // Modify the event's target:
    eventData.target = target;

    var declarationText = eventData.cmd.declare(this, eventData.source, eventData.target);
    if (declarationText && declarationText !== "") {
      this.queueMsg(declarationText);
    }
  },

  onAttackResolvedEvent: function(eventData) {
    // check if the target has died, and then check if that ends the battle.
    var self = this;

    // eventData.target can be one or multiple?
    if (eventData.target.length) {
      $.each(eventData.target, function(i, x) {
        console.log("EventData.target is a list and this one is : " + x.name);
        if (x.hasDied()) {
          console.log("onAttackResolved event: someone has 0 hp or less");
          self.removeFromBattle(x); // this fires "battler-slain"
        }
      });
    } else if (eventData.target) {
      console.log("EventData.target is singleton: " + eventData.target.name);
      if (eventData.target.hasDied()) {
        console.log("onAttackResolved event: someone has 0 hp or less");
        self.removeFromBattle(eventData.target); // this fires "battler-slain"
      }
    }

    if (this.checkBattleEndConditions()) {
      // xxx i donn't thinnk clearQueue is even doing anythingn here since
      // checkBattleEndConditions calls endBattle if battle is over, and that clears
      // queue.
      this.eventService.clearQueue();
      // this.finishRound();
      // What we want to do here is clear out all events still pending in the queue!
      // TODO actually maybe only cancel the attack events and leave in the text
      // events, that would let us treat end of battle text as a normal part of the queue
      // instead of special-casing it.
      // (and then push on a new end of battle event? maybe?)
      // (finishRound will be called because the event queue empties)
    }
  },

  runEventQueue: function() {
    // the heartbeat of the battle system, keeps events and animations flowing in the
    // correct order.

    // Control battle speed by inserting delays here?

    if (this.eventService.queueIsEmpty()) {
      this.finishRound();
    } else {
      this.eventService.processGameEvent();
      // after processing each event, play all queued animations/messages before proceeding
      // to next event. This is because a single "event" can produce several animations/
      // messages as its results, which should all happen before next event.
      var self = this;
      if (this._animationQueue.length > 0) {
        // play all the animations here before calling runEventQueue as last callback
        var nextThingInQueue = this._animationQueue.shift();

        // Everything on the animation queue is EITHER an animation OR a scrolling
        // text message. if it's a scrolling text message then the CALLBACK from the
        // scroll text box CLOSING should advance the animation queue.
        if (nextThingInQueue.onFinish) { // i.e. if it is an Animation and has onFinish method
          this._attackSFX = nextThingInQueue;
          // Return here after each animation is done:
          this._attackSFX.onFinish(function() {
            self._attackSFX = null;
            self.runEventQueue();
          });
          this._animator.runAnimation(this._attackSFX);
        } else if (nextThingInQueue.text) { // next thing in queue is a message
          // something like this????  (why doesn't scrollText take an onClose callback yet?)
          // nextThingInQueue has text, and optionally img and speaker
          self._multipartTextDisplay([nextThingInQueue],
                                     function() { // Return here after player hits button:
                                       self.runEventQueue();
                                     });
        }
      } else { // No more animations in queue, proceed with next actual event.
        // TODO is this a good place for a "yield" continuation?

        this.runEventQueue();
        // TODO JS doesn't optimize tail recursion so this ends up making the
        // call stack really deep. hmmm. Should probably rewrite this as a while()
        // loop.
      }
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
    this.clearMsg(); // moved clearMsg before endRound stuff so that
    // endRound events can show messages and have them be visible at the
    // start of next round. Keep an eye on whether this causes any problems.
    this.eventService.fireGameEvent("end-round", {fighters: fighters});

    if (this._wholePartyCmd) {
      if (this._wholePartyCmd.onEndRound) {
        this._wholePartyCmd.onEndRound(this, this.getActiveParty());
      }
    }
    // clearMsg was here
    this.updateStats(); // in case end of round effects changed
    // anything
    if (!this._battleOver) {
      // Unless fight has ended already, show menu for next round
      this.showStartRoundMenu();
    }
  },

  addEndBattleText: function(text) {
    /* Appends given text to the messages that the player will scroll through
     * after the battle resolves before returning to the map.*/
    this._endBattleText += text;
  },

  addEndBattleConvo: function(convoData) {
    this._endBattleConvo = convoData; // should it append if called multiple times?

    /* This is not passed in from options because it may be set in response to
     * "end-battle" event, for instance. If there's endBattleText and
     * endBattleConvo, the convo happens first, then the text. */
  },

  endBattle: function(resolutionType) {
    // Trigger a ScrollingTextBox to come up
    // with end of battle messages; closing the ScrollingTextBox
    // closes the battle menu system.
    if (this._animator) {
      this._animator.cancelAllCallbacks();
    }
    this.eventService.clearQueue(); // clear out any events still pending
    this.emptyMenuStack();
    this.pcMenus = [];
    this._fixedDisplayBoxes = [];
    this._attackSFX = null;
    this._battleOver = true;
    this.clearMsg();

    /* TODO another error:  topMenu.getPos is not a function
     * that appears to be the result of pushing a menu onto the
     * menu stack just as the menu stack is emptied. */

    // Clear all temporary stat mods that happened to PCs during
    // the battle - these should not persist:
    for (var i = 0; i < this._party.length; i++) {
      this._party[i].clearTempStatMods();
    }

    this.eventService.fireGameEvent("end-battle", {battle: this,
                                                   resolution: resolutionType,
                                                   aliveMonsters: this.monsters,
                                                   deadMonsters: this.deadMonsters});

    switch (resolutionType) {
    case "win":
      /* If there's a special encounter in effect, call its win callback, AND replace the
       * normal end-of-battle text with the special encounter end-of-battle-text (i.e.
       * whatever is returned.) */
      if (this.encounter.win) {
        var specialMessage = this.encounter.win(this, this.player);
        if (specialMessage != null) {
          this._endBattleText = specialMessage;
        }
      }
      break;
    case "lose":
      if (this.encounter.lose) {
        // special encounter lose results
        var specialMessage  = this.encounter.lose(this, this.player);
        if (specialMessage != null) {
          this._endBattleText = specialMessage;
        }
      }
      break;
    }

    if (this._endBattleText === "") {
      // if userland end-battle handlers didn't set any end battle text, use a default:
      var defaultMsgs = {"win": "You won! Let's assume there is a whole lot of end battle text, including how many experience points you got, how much gold you got, whether anybody went up a level, and all that jazz.",
                         "lose":  "YOU LOST! IT IS VERY SAD. DEFEAT TEXT GOES HERE.",
                         "peace": "THE ENCOUNTER RESOLVES PEACEFULLY.",
                         "run": "YOU BRAVELY RAN AWAY, AWAY!",
                         "no contest": "THERE WAS NOONE TO FIGHT"};
      this._endBattleText = defaultMsgs[resolutionType];
    }

    /* TODO there's sort of a conflict here between two (three?) ways of inserting
     * text into the battle - there's a Moon Serpent way (encounter.win) and there's
     * a Eagle Princess way (options.startConvo) and i think both should be
     * refactored into something where the encounter registers an event listener
     * and the event listener sticks conversation into the battle message queue. */

    /* we could almost just build this on top of encounter.win / encounter.lose --
     * that's SO CLOSE to what we need. */


    /* There can be both "endBattleConvo" (e.g. a story conversation happening
     * within the battle system after the battle ends) as well as "endBattleText"
     * (e.g. listing of experience rewards, items found, level ups, etc.)
     * endBattleConvo comes first if present. */
    var self = this;
    if (this._endBattleConvo) {
      var self = this;
      this._multipartTextDisplay(this._endBattleConvo, function() {
        self.hideStatusBoxes("portrait");
        self._scrollEndBattleText(resolutionType);
      });
    } else {
      // no end battle convo, go straight to end battle text:
      this._scrollEndBattleText(resolutionType);
    }
  },

  _scrollEndBattleText: function (resolutionType) {
    // currently this is handling both "you beat x monsters" type text and "you went up a level"
    // type text. i want it to work more like:
    // -- scroll everything that's in the you beat X monsters type text
    // -- that scroll has an on close method which checks for rewards and level up
    // -- that one plays the level up music
    // so really, we want a separate event that fires on battle rewards text being
    // *closed*

    // we could keep the event loop running? and use queueMsg to keep adding stuff?
    //  not let battle actually close until no more messages in the queue... then we
    //  don't have to  treat endbattletext differently from message queue
    // or, maybe we should have a separate event that could be listened for?
    // (onEndBattle, then onGetRewards, then onClose)?
    var endBattleText = this.scrollText(this._endBattleText);
    if (this._positioning.msgWidth !== "auto") {
        endBattleText.setOuterDimensions(this._positioning.msgWidth,
                                         this._positioning.msgHeight);
    }
    // TODO wow this literally can't work without some kind of end battle text.
    // there has to be a final text window shown so its onClose can do the stuff
    // below. this limitation will be gone if we shift to just keeping the event
    // queue going, and when it runs out of events it checks whether the battle
    // is over or whether to start the next round. if battle is over and no more
    // events (all end of battle text is just normal events in this idea) then
    // it just closes.

    var self = this;
    endBattleText.onClose(function() {
      self._freelyExit = true;
      self.close();
      if (resolutionType == "lose" && self._gameOverCallback) {
        self._gameOverCallback();
      }
    });
    //endBattleText.setPos(16, 16);
  },

  removeFromBattle: function(target) {
    // dead fighters will be skipped during command input and execution
    target.die(); // TODO is there any other reason we might remove from battle
    // when not dead? what do we do with fled enemies for isntance?

    // TODO set "source" of this event to be whoever dealt the last blow?
    this.eventService.fireGameEvent("battler-slain", {target: target});

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

  // DEPRECATED use queueAnimation instead:
  animate: function(animation) {
    this._animator.runAnimation(animation);
  },

  queueAnimation: function(animation) {
    this._animationQueue.push(animation);
  },

  queueMsg: function(msgText) {
    /* Unlike showMsg, this shows the given message for a certain period of time
     * before proceeding with the battle. If you queueMsg multiple times then
     * the messages appear in sequence. Use it to make text more readable. */
    /*var anim = new Animation( 12 );
    var self = this;
    anim.onFrame(function(frameNum) {
      if (frameNum == 1) {
        self.showMsg(msgText);
      }
    });
    this.queueAnimation(anim);*/

    // Change of plans: if we push a textSegment into teh animation queue,
    // then runEventQueue will treat it as a _multipartTextDisplay.
    this._animationQueue.push({text: msgText, img: null, speaker: null});
    // i.e. it will display this as a scrollTextBox and wait until the player
    // presses a key before continuing.

    // TODO make this do one or the other depending on battle speed setting.
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
    if (this._battleOver) {
      return true; // so we don't end the same battle twice
    }

    var activeParty = this.getActiveParty();

    // if there are no alive or dead monsters, it's a "no contest"
    // resolution:
    if (this.monsters.length + this.deadMonsters.length === 0) {
      this.endBattle("no contest");
      return true;
    }

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
  },

  addToHitList: function(battler) {
    /* for issue jonoxia/mongolian-princess#138
     * instead of just firing a hit event when a target is hit by an attack,
     * we keep a list of targets hit inside the attack-resolved event.
     * So one attack that hits mulitple enemies still only generates one hit
     * event. The '.hits' property of the event data will contain a list of
     * all targets who where hit, so listeners can check it. */
    var hitEvent = null;
    for (var i = 0; i < this.eventService._eventQueue.length; i++) {
      if (this.eventService._eventQueue[i].name === "attack-resolved") {
        hitEvent = this.eventService._eventQueue[i];
        if (hitEvent.data.hits.indexOf(battler) === -1) {
          hitEvent.data.hits.push(battler);
        }
        break;
      }
    }
    if (!hitEvent) {
      console.warn("Trying to record a hit but no attack-resolved event");
    }
  }
};
MenuSystemMixin(BattleSystem.prototype);
GameEventSubscriberMixin(BattleSystem.prototype);

// name-> instance map, 
// for recovering spell references after game reload
var g_batCmdHack = {
};

function BatCmd(options) {
  if (options.cost) {
    this.cost = options.cost;
  }
  if (options.canUse) {
    this._canUse = options.canUse;
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
  if (options.declare) {
    this.declare = options.declare;
  }
  // why did i invent my own weird way of overriding the class here???
}
BatCmd.prototype = {
  isContainer: false,
  INSUFFICIENT_RESOURCE_MSG: "NOT ENOUGH MP", // game should override this
  
  checkUsability: function(system, user) {
    // Return a record with {usable: true/false, reason: string}
    // if it's not usable string should tell user why
    // TODO what if usability depends on target selection?
    if (this.cost) {
      if (user.getStat(this.cost.resource) < this.cost.amount) {
        return {usable: false, reason: this.INSUFFICIENT_RESOURCE_MSG};
      }
    }
    if (this._canUse) {
      return this._canUse(system, user);
    }
    return {usable: true, reason: ""};
  },
  declare: function(system, user, target) {
    // return a string to be shown by the battle system when the action is declared.
    return user.name + ": " + this.name;
  },
  canUse: function(system, user) {
     // deprecated but kept for backwards compatibility
    return this.checkUsability(user).usable;
  },
  effect: function(system, user, target) {
    var result = this.checkUsability(system, user);
    if (!result.usable) {
      system.queueMsg(this.name + ": " + result.reason);
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
  this._resistances = null; // damage type weakenesses/resistances
  this._aiCallback = null;
  this.pluralName = this.name + "s"; // overwrite this for irregular plurals
}
MonsterType.prototype = {
  onEffect: function(effectName, callback) {
    this._effectHandlers[effectName] = callback;
  },

  knowsCommand: function(cmd) {
    this._commandList.push(cmd);
  },
  
  setLootTable: function(lootTable) {
    this._loot = lootTable; // or should this be in userland?
  },

  setResistances: function(resistances) {
    this._resistances = resistances; // or should this be in userland?
  },

  setAI: function(aiCallback) {
    this._aiCallback = aiCallback;
  },

  instantiate: function() {
    // return a Monster instance
    var cloneStats = {};
    for (var name in this.statBlock) {
      cloneStats[name] = this.statBlock[name];
    }
    var cloneCmds = this._commandList.slice();
    var instance = new Monster(this.img, cloneStats, cloneCmds,
                               this._effectHandlers, this._aiCallback);
    if (this._loot) {
      instance.loot = this._loot;
    }
    if (this._resistances) {
      instance.resistances = this._resistances;
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

  GameEventSubscriberMixin(this);

  this.battlerInit = function() {
    this.gameEventSubscriberInit();
    this._effectHandlers = {};
    this._statMods = [];
    this._stati = {};
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
      } else {
        this._statMods[i].onExpire();
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
  /*this.onEffect = function(effectName, callback) {
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
  };*/
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
    // Userland should underride this to define what statuses prevent a battler
    // from acting.
    return (! this._dead ) && (! this.hasStatus("asleep")) &&
      (! this.hasStatus("fleeing")) && (! this.hasStatus("fled"));
  };
  this.hasDied = function() {
    // userland should underride this to define what causes a battler to be removed
    // from battle.
    return this.getStat("hp") < 0;
  };
}

function Monster(img, statBlock, cmdList, effectHandlers, aiCallback) {
  this.battlerInit();
  this.img = img;
  this._statBlock = statBlock;
  this.x = null;
  this.y = null;
  this.name = "A Monster";
  this._commands = cmdList;
  //this._effectHandlers = effectHandlers; // shallow copy, not cloned
  this._aiCallback = aiCallback;
};
Monster.prototype = {
  setName: function(name, pluralName) {
    this.name = name;
    this.pluralName = pluralName;
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
    return {cmd: cmd, target: target};
  },
  pickAction: function(battleSystem) {
    var choice;
    if (this._aiCallback) {
      var pcTeam = battleSystem.getEnemies(this);
      choice = this._aiCallback(this, battleSystem, pcTeam);
    } else {
      choice = this.defaultAI(battleSystem);
    }
    this.lockInCmd(choice.cmd, choice.target);
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
  },

  onExpire: function() {
    // will be called when the stat mod expires -- override this to have
    // something happen.
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
  },

  onExpire: function() {
    // will be called when the stat mod expires -- override this to have
    // something happen.
  }
};

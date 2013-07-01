function Encounter(monsterList) {
  
}
Encounter.prototype = {
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
  if (options.msgDelay) {
    this._msgDelay = options.msgDelay;
  } else {
    this._msgDelay = 750;
  }
  if (options.metaCmdSet) {
    this._rootMenu = this.menuFromCmdSet("Party", options.metaCmdSet);
  } else {
    this._rootMenu = null;
  }

  this._effectHandlers = {};

  this._freelyExit = false;

  // TODO NOT hard code frame rate
  this._animator = new Animator(50,
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
  getAliveParty: function() {
    // TODO this duplicates some code in Player.marchInOrder...
    // BattleSystem and Player are both separately maintaining the
    // aliveParty list. Should probably just maintain it in Player
    // and query it from here.
    var aliveParty = [];
    for (var i =0 ; i< this._party.length; i++) {
      if (this._party[i].isAlive()) {
        aliveParty.push(this._party[i]);
      }
    }
    return aliveParty;
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

    // If that was the last party member, then hide the menus
    // and start the round!
    var aliveParty = this.getAliveParty(); // skip dead people

    var pcIndex = aliveParty.indexOf(pc);

    if (pcIndex == aliveParty.length - 1) {
      this.fightOneRound();
    } else {
      // Otherwise, show menu for next alive party member!
      var nextPC = aliveParty[ pcIndex +1 ];
      this.showMenuForPC(nextPC); 
   }
  },

  randomElementFromArray: function(arr) {
    // choose random PC
    // TODO allow registering a callback to override this function,
    // to implement aggro.
    var index = Math.floor( Math.random() * arr.length);
    return arr[index];
  },

  chooseRandomEnemy: function(team) {
    if (team == "monster") {
      return this.randomElementFromArray(this.monsters);
    } else {
      // monsters should only attack alive people:
      return this.randomElementFromArray(this.getAliveParty());
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
        // but if it's a "leaf node", then next step is to pick
        // a target...
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
            self.choosePCCommand(pc, cmd);
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
 
  onStartBattle: function(callback) {
    this._startBattleCallback = callback;
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
    this._theEndHasCome = false;
    this.deadMonsters = [];
    this.player = player;
    this._party = player.getParty();
    this._htmlElem.show();
    this.clearMsg();
    this.landType = landType;
    this._attackSFX = null;

    this.showPartyStats();

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
      // callback to userland to let menu be customized for this PC:
      var customCmds = this._party[i].customizeCmds(
        this.defaultCmdSet);
      this.pcMenus.push(this.makeMenuForPC(this._party[i],
                                           customCmds));
    }
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
      this._rootMenu.reset();
      this.pushMenu(this._rootMenu);
    } else {
      this.showFirstPCMenu();
    }
  },

  showFirstPCMenu: function() {
    this.showMenuForPC(this.getAliveParty()[0]);
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

  defaultMonsterAI: function(monster) {
    // TODO allow overriding this with custom AI
    // for now have them all fight random players
    var fight = this.defaultCmdSet.get("FIGHT");
    // TODO this assumes there's a "fight" in the players' default
    // command set!
    
    if (!fight || fight.isContainer) {
      fight = BASIC_FIGHT_CMD;
    }
    var target = "random_pc";
    return {
      cmd: fight,
      target: target
    };
  },

  fightOneRound: function() {
    var fighters = []; // will be an ORDERED array of who goes
    var i;

    // Choose actions for each monster
    for (i = 0; i < this.monsters.length; i++) {
      var name = this.monsters[i].name;
      var action = this.defaultMonsterAI(this.monsters[i]);
      this.monsters[i].lockInCmd(action.cmd, action.target);
    }

    var aliveParty = this.getAliveParty();
    if (this._initiativeCallback) {
      // if initiative callback is set, use it to determine
      // order of fighters.
      fighters = this._initiativeCallback(aliveParty,
                                          this.monsters);
    } else {
      // if not set, then everybody in party goes followed by
      // each monster:
      for (i = 0; i < aliveParty.length; i++) {
        fighters.push(aliveParty[i]);
      }
      for (i = 0; i < this.monsters.length; i++) {
        fighters.push(this.monsters[i]);
      }
    }
    
    // hide menus
    this.emptyMenuStack();
    this.showMsg("A round of battle is starting!");
    this.executeNextFighterAction(fighters);
  },

  executeNextFighterAction: function(fightQueue) {
    if (this._theEndHasCome) {
      console.log("ExecuteNextfighterAction called After The End.");
      return;
    }
    this.displayElem.empty();// clear the message
    // Skip any dead people (they may have died during the round)
    while (fightQueue.length > 0 && !fightQueue[0].isAlive()) {
      fightQueue.shift();
    }
    
    // If fight queue is empty, then round is done
    if (fightQueue.length == 0) {
      this.clearMsg();
      this.showStartRoundMenu();
      return;
    }
    var fighter = fightQueue.shift();
    var action = fighter.getLockedInCmd();
    var target = action.target;

    // choose random targets now, right before executing:
    if (target == "random_monster") {
      target = this.chooseRandomEnemy("monster");
    } else if (target == "random_pc") {
      target = this.chooseRandomEnemy("pc");
    }
        
    if (action) {
      action.cmd.effect(this, fighter, target);
    } else {
      this.showMsg(fighter.name + " has no idea what to do!");
    }
    // update stats display so we can see effects of action
    this.showPartyStats();

    // run animation for this action, then go on to execute next action.
    if (action.cmd.animate) {
      this._attackSFX = action.cmd.animate(this, fighter, target);
    } else {
      this._attackSFX = new Animation(10);
    }
    var self = this;
    this._attackSFX.onFinish(function() {
      self._attackSFX = null; // clear the attack sfx
      self.executeNextFighterAction(fightQueue);
    });
    this._animator.runAnimation(this._attackSFX);
    // TODO: If a fight ending condition is triggered, finish
    // the currently pending animation before exiting,
    // but don't start any more.
  },

  endBattle: function(winLoseRun) {
    // Trigger a ScrollingTextBox to come up
    // with end of battle messages; closing the ScrollingTextBox
    // closes the battle menu system.
    this._theEndHasCome = true;
    this._animator.cancelAllCallbacks();
    this.emptyMenuStack();
    this.pcMenus = [];
    this._attackSFX = null;
    this.clearMsg();

    // TODO another error:  topMenu.getPos is not a function
    // that appears to be the result of pushing a menu onto the
    // menu stack just as the menu stack is emptied.
  
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
    
    if (this._party.indexOf(target) > -1) {
      // if it's a player...
      // check for tpk:
      var tpk = true;
      for (var i = 0; i < this._party.length; i++) {
        if (this._party[i].isAlive()) {
          tpk = false;
        }
      }
      if (tpk) {
        this.endBattle("lose");
      }
    }

    var index = this.monsters.indexOf(target);
    if (index > -1) {
      // if it's a monster...
      this.monsters.splice(index, 1);
      // just remove it from the list.

      this.deadMonsters.push(target);
      // put it in the dead monsters list.

      if (this.monsters.length == 0) {
        // if all monsters die, you win!
        this.endBattle("win");
      } else {
        // redraw so we see what's gone missing:
        this.draw();
      }

    }
    
  },

  animate: function(animation) {
    this._animator.runAnimation(animation);
  }
};
MenuSystemMixin(BattleSystem.prototype);

function BatCmd(options) {
  if (options.canUse) {
    this.canUse = canUse;
  } else {
    this.canUse = function(user) {
      return true;
    };
  }
  if (options.animate) {
    console.log("SETTING ANIMATION FOR THIS BATCMD");
    this.animate = options.animate;
  }
  this.target = options.target;
  this.effect = options.effect;
}
BatCmd.prototype = {
  isContainer: false
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

function MonsterType(img, name, statBlock) {
  this.img = img;
  this.statBlock = statBlock;
  this.name = name;
  // TODO: monster type command list
  // TODO: monster AI callback
  // TODO: need a way to set some generic functions, like, default monster
  // AI, default monster on-die handler, etc. I guess we set those on
  // the battle system?

  this._effectHandlers = {};
}
MonsterType.prototype = {
  onEffect: function(effectName, callback) {
    this._effectHandlers[effectName] = callback;
  },

  instantiate: function() {
    // return a Monster instance
    var cloneStats = {};
    for (var name in this.statBlock) {
      cloneStats[name] = this.statBlock[name];
    }
    return new Monster(this.img, cloneStats, this._effectHandlers);
  }
};

var BattlerMixin = function() {
  /* Used for Monsters and PlayerCharacters - anybody who can take
   * part in a battle. Syntax for using mixin:
   * BattlerMixin.call(class.prototype);  */
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
  this.isAlive = function() {
    return !this._dead;
  };
  this.setStat = function(statName, value) {
    this._statBlock[statName] = value;
  };
  this.getStat = function(statName) {
    return this._statBlock[statName];
  };
  this.hasStat = function(statName) {
    return (this._statBlock[statName] != undefined);
  };
  this.modifyStat = function(statName, delta) {
    this._statBlock[statName] += delta;
  };
  this.onEffect = function(effectName, callback) {
    if (!this._effectHandlers) {
      this._effectHandlers = [];
    }
    this._effectHandlers[effectName] = callback;
  };
  this.takeEffect = function(effectName, data) {
    if (!this._effectHandlers) {
      this._effectHandlers = [];
    }
    if (this._effectHandlers[effectName]) {
      data = this._effectHandlers[effectName](this, data);
      // return null to prevent default
    }

    // otherwise, return (possibly modified) data to continue
    // with the default handler.
    return data;
  }
}


function Monster(img, statBlock, effectHandlers) {
  this.img = img;
  this._statBlock = statBlock;
  this.x = null;
  this.y = null;
  this.name = "A Monster";
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
  }
};
BattlerMixin.call(Monster.prototype);

BASIC_FIGHT_CMD = new BatCmd({
  target: "random_enemy",
  effect: function(battle, user, target) {
    battle.showMsg(user.name + " attacks " + target.name + "!");
    battle.sendEffect(target, "damage", {amount: rollDice(1, 6)});
  }
});
// so monsters have something to use if it's not defined elsewhere


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
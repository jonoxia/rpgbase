function CmdMenu(container) {
    this.cmdList = [];
    this.selectedIndex = 0;
    this.container = container;
    this.cursorHtml = "<blink>&#x25B6;</blink>";
    this.msg = null;
    this.afterChooseCallback = null;
}
CmdMenu.prototype = {
    clear: function() {
      this.cmdList = [];
    },

    setMsg: function(msg) {
      this.msg = msg;
    },

    onChoose: function(callback) {
      this.afterChooseCallback = callback;
    },

    addCommand: function(name, callback) {
	this.cmdList.push({name: name, execute: callback});
    },
    
    moveSelectionUp: function() {
	this.selectedIndex --;
	if (this.selectedIndex < 0) {
	    this.selectedIndex = this.cmdList.length - 1;
	}
	this.showArrowAtIndex(this.selectedIndex);
    },

    moveSelectionDown: function() {
	this.selectedIndex ++;
	if (this.selectedIndex >= this.cmdList.length) {
	    this.selectedIndex = 0;
	}
	this.showArrowAtIndex(this.selectedIndex);
    },

    chooseSelected: function() {
      var cmd = this.cmdList[this.selectedIndex];
      cmd.execute();
      if (this.afterChooseCallback) {
        this.afterChooseCallback();
      }
    },

    showArrowAtIndex: function(index) {
      var rows = this.parentTag.find("tr");
      for (var r = 0; r < rows.length; r++) {
	var cell = $(rows[r]).find("td")[0];
	if (r == index) {
	  $(cell).html(this.cursorHtml);
	} else {
	  $(cell).empty();
	}
      }
    },

    display: function() {
      if (this.msg) {
        this.msgTag = $("<span></span>");
        this.msgTag.html(this.msg);
        this.container.append(this.msgTag);
      }
      this.parentTag = $("<table></table>");
      this.parentTag.addClass("menu");
      this.container.append(this.parentTag);

	var self = this;

	for (var c in this.cmdList) {
	    var row = $("<tr></tr>");
	    var cell = $("<td></td>");
	    cell.html();
	    row.append(cell);
	    cell = $("<td></td>");
	    var name = this.cmdList[c].name;
	    cell.html(name);
	    row.append(cell);
	    /*(function(row, c) {
		row.on("mouseover", function(e) {
		    self.showArrowAtIndex(c);
		});
		row.on("click", function(e) {
		    self.selectedIndex = c;
		    self.chooseSelected();
		});
	    })(row, c);*/
	    this.parentTag.append(row);
	}
	this.showArrowAtIndex(0);
	this.parentTag.focus();
    },

  onKey: function(keyCode) {
    switch(keyCode) {
    case UP_ARROW:
      this.moveSelectionUp();
      break;
    case DOWN_ARROW:
      this.moveSelectionDown();
      break;
    case CONFIRM_BUTTON: // enter or space
      this.chooseSelected();
      break;
    }
  },

  close: function() {
    this.msgTag.remove();
    this.parentTag.remove();
  },

  reset: function() {
    this.selectedIndex = 0;
  }
};

function Encounter(monsterList) {
  
}
Encounter.prototype = {
};

function BattleSystem(htmlElem, options) {
  this.htmlElem = htmlElem;
  this.displayElem = this.htmlElem.find(".msg-display");

  this.menuStack = [];

  this.htmlElem.hide();
  this.endBattleCallbacks = [];

  this.battleModeOn = false;
  if (options.defaultMsg) {
    this.defaultMsg = options.defaultMsg;
  } else {
    this.defaultMsg = "Monsters appeared!";
  }

  if (options.defaultCmdSet) {
    this.defaultCmdSet = options.defaultCmdSet;
  }
}
BattleSystem.prototype = {
  showMsg: function(msg) {
    this.displayElem.html(msg);
    this.displayElem.show();
  },

  pushMenu: function(newMenu) {
    this.menuStack.push(newMenu);
    newMenu.display();
  },
  
  popMenu: function() {
    if (this.menuStack.length > 1) {
      this.menuStack[ this.menuStack.length - 1].close();
      this.menuStack.pop();
    }
  },

  emptyMenuStack: function() {
    for (var i = 0; i < this.menuStack.length; i++) {
      this.menuStack[i].close();
    }
    this.menuStack = [];
  },

  makeMenuForPC: function(pc, cmdSet) {
    var self = this;
    var cmdMenu = new CmdMenu(this.htmlElem);
    cmdMenu.setMsg("Choose command for " + pc.name);

    var addOneCmd = function(name, cmd) {
      console.log("In addOneCmd - name is " + name + " cmd is " + cmd);
      // if this command has a submenu, then choosing it
      // just opens the submenu:
      if (cmd.isContainer) {
        cmdMenu.addCommand(name, function() {
          self.pushMenu(self.makeMenuForPC(pc, cmd));
        });
        // TODO this won't work because the chainMenus callback will
        // trigger and open the next PC's main menu.
      } else {
          // but if it's a "leaf node" then choosing it
          // locks in the command for the PC.
        cmdMenu.addCommand(name, function() {
          self.lockedInCmds[pc.name] = cmd;
        });
      }
    };
    for (var name in cmdSet.cmds) {
      console.log("Adding cmd " + name + " to menu.");
      addOneCmd(name, cmdSet.cmds[name]);
    }
    return cmdMenu;
  },
  
  chainMenu: function(firstMenu, secondMenu) {
    // makes it so that choosing first menu results in pushing
    // second menu onto the menu stack.
    var self = this;
    firstMenu.onChoose(function() {
      self.pushMenu(secondMenu);
    });
  },

  startBattle: function(player, encounter) {
    console.log("Starting battle");
    this.htmlElem.show();
    this.player = player;
    this.encounter = encounter;
    this.showMsg(this.defaultMsg);
    this.battleModeOn = true;
    var self = this;

    this.pcMenus = [];
    this.lockedInCmds = {};
    var party = this.player.getParty();
    for (var i = 0; i < party.length; i++) {
      // TODO callback to userland to let menu be customized for this PC
      console.log("Will make main menu for " + party[i].name);
      this.pcMenus.push(this.makeMenuForPC(party[i],
                                           self.defaultCmdSet));
    }

    // Set up callback chain so selecting from each menu triggers
    // the next menu, but selecting from the last menu starts the
    // fight round:
    for (var i = 0; i < party.length; i++) {
      if (i + 1 < party.length) {
        this.chainMenu(this.pcMenus[i], this.pcMenus[i+1]);
      } else {
        this.pcMenus[i].onChoose(function() {
          self.emptyMenuStack();
          self.fightOneRound();
        });
      }
    }

    /*var cmdMenu = new CmdMenu(this.htmlElem);
    cmdMenu.addCommand("Win", function() {
      self.endBattle("win");
    });
    cmdMenu.addCommand("Lose", function() {
      self.endBattle("lose");
    });
    cmdMenu.addCommand("Run", function() {
      self.endBattle("run");
    });
    cmdMenu.display();*/
    
    this.showPCMenus();
  },

  showPCMenus: function() {
    for (var i = 0; i < this.pcMenus.length; i++) {
      this.pcMenus[i].reset();
    }
    this.pushMenu(this.pcMenus[0]);
  },

  fightOneRound: function() {
    var fighters = [];
    var self = this;
    // TODO callback to userland to find out order of actions
    for (var pcName in self.lockedInCmds) {
      fighters.push(pcName);
    }
    var fighterIndex = 0;
    self.showMsg("A round of battle is starting!");
    var timer = window.setInterval(function() {
      if (fighterIndex == fighters.length) {
        self.showMsg("Round complete! Next round starts.");
        window.clearInterval(timer);
        self.showPCMenus();
        return;
      }
      var fighter = fighters[fighterIndex];
      var action = self.lockedInCmds[fighter];
      action.effect(self, fighter);
      fighterIndex++;
    }, 750);
  },

  endBattle: function(winLoseRun) {
    var i;
    self.emptyMenuStack();
    this.pcMenus = [];
    switch (winLoseRun) {
    case "win":
      $("#debug").html("You won!");
      break;
    case "lose":
      $("#debug").html("You lost!");
      break;
    case "run":
      $("#debug").html("You ran away!");
      break;
    }
    this.battleModeOn = false;
    this.htmlElem.hide();
    for (i = 0; i < this.endBattleCallbacks.length; i++) {
      this.endBattleCallbacks[i](winLoseRun);
    }
  },

  handleKey: function(keyCode) {
    if (keyCode == CANCEL_BUTTON) {
      // cancel -> pop top menu off menu stack, go back to previous one
      if (this.menuStack.length > 1) {
        this.popMenu();
      }
    } else {
      // send keystroke to menu on top of stack
      if (this.menuStack.length > 0) {
        this.menuStack[ this.menuStack.length - 1].onKey(keyCode);
      }
    }
  },

  onEndBattle: function(callback) {
    this.endBattleCallbacks.push(callback);
  }
};


function BatCmd(options) {
  if (options.canUse) {
    this.canUse = canUse;
  } else {
    this.canUse = function(user) {
      return true;
    };
  }
  this.targetType = options.target;
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
  isContainer: true
};


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
*/
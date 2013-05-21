function CmdMenu(container) {
    this.cmdList = [];
    this.selectedIndex = 0;
    this.container = container;
    this.cursorHtml = "<blink>&#x25B6;</blink>";
    this.title = null;
}
CmdMenu.prototype = {
    clear: function() {
      this.cmdList = [];
    },

    setTitle: function(title) {
      this.title = title;
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
    },

    showArrowAtIndex: function(index) {
      var rows = this.table.find("tr");
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
      this.parentTag = $("<div></div>");
      this.parentTag.addClass("menu");
      if (this.title) {
        var titleSpan = $("<span></span>");
        titleSpan.addClass("menu");
        titleSpan.html(this.title);
        this.parentTag.append(titleSpan);
      }
      this.table = $("<table></table>");
      this.table.addClass("menu");
      this.parentTag.css("left", this.screenX);
      this.parentTag.css("top", this.screenY);
      this.parentTag.append(this.table);
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
	    this.table.append(row);
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
    this.parentTag.remove();
  },

  reset: function() {
    this.selectedIndex = 0;
  },

  setPos: function(x, y) {
    this.screenX = x;
    this.screenY = y;
    if (this.parentTag) {
      this.parentTag.css("left", x);
      this.parentTag.css("top", y);
    }
  }
};

/* TODO:  modify MenuSystemMixin to allow substituting a
 * canvas-based menu for a CSS-based menu. */

function MenuSystemMixin(subClassPrototype) {
  subClassPrototype._init = function(htmlElem) {
    this.menuStack = [];
    this._htmlElem = htmlElem;
    this.displayElem = this._htmlElem.find(".msg-display");
    this._rootMenu = null;
    this._party = null;
    this._closeCallbacks = [];
  };

  subClassPrototype.menuFromCmdSet = function (title, cmdSet) {
    var self = this;
    var subMenu = new CmdMenu(self._htmlElem);
    if (title && title != "") {
      subMenu.setTitle(title);
    }
    
    var addOneCmd = function(name, cmd) {
      // allow recursive submenus
      if (cmd.isContainer) {
        subMenu.addCommand(name, function() {
          self.pushMenu(self.menuFromCmdSet(name, cmd));
        });
      } else {
        subMenu.addCommand(name, function() {
          cmd.effect(self, self._party);
        });
      }
    };
    for (var name in cmdSet.cmds) {
      addOneCmd(name, cmdSet.cmds[name]);
    }
    return subMenu;
  };

  subClassPrototype.open = function(party) {
    this._party = party;
    this._htmlElem.show();
    this.pushMenu(this._rootMenu);
    this.clearMsg();
    this.hidePartyStats();
  };

  subClassPrototype.close = function() {
    if (this._rootMenu) {
      this._rootMenu.reset();
    }
    this.hide();
    for (var i = 0; i < this._closeCallbacks.length; i++) {
      this._closeCallbacks[i]();
    }
  };

  subClassPrototype.makeMenu = function() {
    return new CmdMenu(this._htmlElem);
  };

  subClassPrototype.pushMenu = function(newMenu) {
    var x = 25;
    for (var i = 0; i < this.menuStack.length; i++) {
      x += 80;
    }
    newMenu.setPos(x, 250);
    this.menuStack.push(newMenu);
    newMenu.display();
  };

  subClassPrototype.popMenu = function() {
    if (this.menuStack.length > 0) {
      this.menuStack[ this.menuStack.length - 1].close();
      this.menuStack.pop();
    }
  };

  subClassPrototype.returnToRoot = function() {
    while(this.menuStack.length > 1) {
      this.popMenu();
    }
  };

  subClassPrototype.emptyMenuStack = function() {
    for (var i = 0; i < this.menuStack.length; i++) {
      this.menuStack[i].close();
    }
    this.menuStack = [];
  };

  subClassPrototype.hide = function() {
    this._htmlElem.hide();
  };

  subClassPrototype.onClose = function(callback) {
    this._closeCallbacks.push(callback);
  },

  subClassPrototype.showMsg = function(msg) {
    this.displayElem.append($("<span></span>").html(msg));
    this.displayElem.append($("<br>"));
    this.displayElem.show();
  };

  subClassPrototype.clearMsg = function() {
    this.displayElem.hide();
    this.displayElem.empty();
  };

  subClassPrototype.chooseCharacter = function(title, callback) {
    var charMenu = this.makeMenu();
    charMenu.setTitle(title);
    var self = this;
    var addOneCmd = function(target) {
      charMenu.addCommand(target.name, function() {
        callback(target);
      });
    };
    for (var i = 0; i < this._party.length; i++) {
      addOneCmd(this._party[i]);
    }
    this.pushMenu(charMenu);
  };
  
  subClassPrototype.showPartyStats = function() {
    this._htmlElem.find(".stats").remove();
    for (var i = 0; i < this._party.length; i++) {
      var statHtml = this._party[i].getStatDisplay();
      var statBox = $("<div></div>").html(statHtml);
      statBox.addClass("stats");
      this._htmlElem.append(statBox);
    }
  };

  subClassPrototype.hidePartyStats = function() {
    this._htmlElem.find(".stats").remove();
  };
  
  subClassPrototype.handleKey = function(keyCode) {
    if (keyCode == CANCEL_BUTTON) {
      // cancel -> pop top menu off menu stack, go back to previous one
      if (!this._freelyExit) {
        if (this.menuStack.length == 1) {
          // But if freelyExit is false, then don't let us exit the
          // root menu!
          return;
        }
      }
      if (this.menuStack.length > 0) {
        this.popMenu();
      }
      if (this.menuStack.length == 0) {
        // If you just closed the root menu, close whole menu sysetm:
        this.close();
      }
    } else {
      // if it's not the cancel button, pass it on to the topmost
      // menu of the stack:
      if (this.menuStack.length > 0) {
        this.menuStack[ this.menuStack.length - 1].onKey(keyCode);
      }
    }
  };
}

function FieldMenu(htmlElem, commandSet) {
  this._init(htmlElem);
  this._rootMenu = this.menuFromCmdSet("", commandSet);
  this._freelyExit = true;
  // field menu can always be exited with cancel button,
  // unlike battle menu.
}
FieldMenu.prototype = {
  showItemSubMenu: function(item, character) {
    // do what with this item?
    var self = this;
    var subMenu = this.makeMenu();
    subMenu.setTitle("Do what?");
    subMenu.addCommand("Use", function() {
      if (item.target == "ally") {
        // If using it requires selecting a target...
        self.chooseCharacter("Use on?", function(target) {
          item.effect(self, character, target);
          self.returnToRoot();
        });
      } else {
        // TODO are there other target types?
        itemData.effect(self, character, null);
        self.returnToRoot();
      }
    });

    subMenu.addCommand("Equip", function() {
      self.showMsg("Equipping the " + item.name);
      // TODO implement equip command
      self.returnToRoot();
    });

    subMenu.addCommand("Give", function() {
      self.chooseCharacter("Give to?", function(target) {
        self.showMsg(character.name + " gives the " + item.name
                    + " to " + target.name);
        character.transferItem(item.reference, target);
        self.returnToRoot();
      });
    });

    subMenu.addCommand("Drop", function() {
      self.showMsg(character.name + " drops the " + item.name);
      character.loseItem(item.reference);
      self.returnToRoot();
    });

    this.pushMenu(subMenu);
  },

  showItemMenu: function(character) {
    // TODO will have a lot of parallel code for casting spells
    // outside of battle.
    // TODO what to show if inventory is empty?
    var self = this;
    var menu = this.makeMenu();
    menu.setTitle("Items:");

    // After selecting an item, give options of
    // Use, Equip, Give, or Drop.
    var itemCmds = character.getInventoryCmds(false); // isBattle=false
    for (var i = 0; i < itemCmds.length; i++) {
      (function(item) {
        menu.addCommand(item.name,
                      function() {
                        self.showItemSubMenu(item, character);
                      });
      })(itemCmds[i]);
    }
    this.pushMenu(menu);
  }
};
MenuSystemMixin(FieldMenu.prototype);



function Dialoglog(htmlElem) {
  this.menuStack = [];
  this._htmlElem = htmlElem;
  this._closeCallbacks = [];
  this._occupiedNPC = null;
  this.displayElem = this._htmlElem.find(".msg-display");
}
Dialoglog.prototype = {
  show: function(msg) {
    this._htmlElem.show();
    this.displayElem.empty();
    this.displayElem.append($("<span></span>").html(msg));
    this.displayElem.append($("<br>"));
    this.displayElem.show();
  },
  hide: function() {
    this.displayElem.hide();
    this._htmlElem.hide();
    this.displayElem.empty();
  },
  onClose: function(callback) {
    this._closeCallbacks.push(callback);
  },
  showMenu: function() {
    // e.g. showDialogMenu({"yes": function() {},
    //                      "no": function() {}
    //                    });
  },
  handleKey: function(keyCode) {
    // if there's a menu, pass key code along to menu
    // if end of the dialog is onscreen, hide it
    // if a screen before the end of long dialog is onscreen,
    // scroll to next screen of dialog.
    this.hide();
    for (var i = 0; i < this._closeCallbacks.length; i++) {
      this._closeCallbacks[i]();
    }
    if (this._occupiedNPC) {
      // release any NPC that this dialog was occupying
      this._occupiedNPC.wake();
      this._occupiedNPC = null;
    }
  },

  occupyNPC: function(npc) {
    // don't let this NPC wander away while player is talking to them:
    npc.sleep();
    this._occupiedNPC = npc;
  }
};

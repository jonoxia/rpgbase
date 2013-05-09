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


function MenuSystem(htmlElem, commandSet) {
  // a lot of this is copied from battle system
  this.menuStack = [];
  this._htmlElem = htmlElem;
  this.displayElem = this._htmlElem.find(".msg-display");
  var self = this;
  var menu = new CmdMenu(htmlElem);
  var addOneCmd = function(name, cmd) {
    menu.addCommand(name, function() {
      self.clearMsg();
      // pass menu system and party to the command
      cmd(self, self._party);
    });
  };
  for (var name in commandSet) {
    addOneCmd(name, commandSet[name]);
  }
  this._mainMenu = menu;
  this._party = null;
  this,_closeCallback = null;
}
MenuSystem.prototype = {
  open: function(party) {
    this._party = party;
    this._htmlElem.show();
    this.pushMenu(this._mainMenu);
    this.clearMsg();
  },

  pushMenu: function(newMenu) {
    // TODO duplicated code from battle system
    var x = 25;
    for (var i = 0; i < this.menuStack.length; i++) {
      x += 80;
    }
    newMenu.setPos(x, 250);
    this.menuStack.push(newMenu);
    newMenu.display();
  },

  popMenu: function() {
    // TODO duplicated code from battle system
    if (this.menuStack.length > 0) {
      console.log("Menu stack is a poppin");
      this.menuStack[ this.menuStack.length - 1].close();
      this.menuStack.pop();
    }
  },

  hide: function() {
    this._htmlElem.hide();
  },

  onClose: function(callback) {
    this._closeCallback = callback;
  },

  showMsg: function(msg) {
    // TODO copied from battle system
    this.displayElem.append($("<span></span>").html(msg));
    this.displayElem.append($("<br>"));
    this.displayElem.show();
  },

  clearMsg: function() {
    this.displayElem.hide();
    this.displayElem.empty();
  },

  displayPartyStats: function() {

  },

  handleKey: function(keyCode) {
    // TODO duplicates a lot of code from encounterClasses.js
    if (keyCode == CANCEL_BUTTON) {
      console.log("U hit cancel button in a menu");
      // cancel -> pop top menu off menu stack, go back to previous one
      if (this.menuStack.length > 0) {
        this.popMenu();
      }
      if (this.menuStack.length == 0) {
        this.hide();
        if (this._closeCallback) {
          this._closeCallback();
        }
      }
    } else {
      if (this.menuStack.length > 0) {
        this.menuStack[ this.menuStack.length - 1].onKey(keyCode);
      }
    }
  }
};

// maybe factor out a MenuStack class?

function Dialoglog(htmlElem) {
  this.menuStack = [];
  this._htmlElem = htmlElem;
  this.displayElem = this._htmlElem.find(".msg-display");
}
Dialoglog.prototype = {
  show: function(msg) {
    this._htmlElem.show();
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
    this._closeCallback = callback;
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
    if (this._closeCallback) {
      this._closeCallback();
    }
  }
};

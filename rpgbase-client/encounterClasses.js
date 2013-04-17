function CmdMenu(parentTag) {
    this.cmdList = [];
    this.selectedIndex = 0;
    this.parentTag = $("<table></table>");
    this.parentTag.addClass("menu");
    parentTag.append(this.parentTag);
    this.cursorHtml = "<blink>&#x25B6;</blink>";
}
CmdMenu.prototype = {
    clear: function() {
	this.cmdList = [];
	this.parentTag.empty();
    },

    addCommand: function(name, callback) {
	this.cmdList.push({name: name, execute: callback});
    },
    // remove command?
    
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
	this.parentTag.empty();
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
    this.parentTag.remove();
  }
};


function Encounter(monsterList) {
  
}
Encounter.prototype = {
};



function BattleSystem(htmlElem, options) {
  this.htmlElem = htmlElem;
  this.displayElem = this.htmlElem.find(".msg-display");
  this.focusedMenu = null;
  this.htmlElem.hide();
  this.endBattleCallbacks = [];

  this.battleModeOn = false;
  if (options.defaultMsg) {
    this.defaultMsg = options.defaultMsg;
  } else {
    this.defaultMsg = "Monsters appeared!";
  }
}
BattleSystem.prototype = {

  showMsg: function(msg) {
    this.displayElem.html(msg);
    this.displayElem.show();
  },

  startBattle: function(player, encounter) {
    this.htmlElem.show();
    this.player = player;
    this.encounter = encounter;
    this.showMsg(this.defaultMsg);
    this.battleModeOn = true;
    var self = this;

    var cmdMenu = new CmdMenu(this.htmlElem);
    cmdMenu.addCommand("Win", function() {
      self.endBattle("win");
    });
    cmdMenu.addCommand("Lose", function() {
      self.endBattle("lose");
    });
    cmdMenu.addCommand("Run", function() {
      self.endBattle("run");
    });
    cmdMenu.display();
    this.focusedMenu = cmdMenu;
  },

  endBattle: function(winLoseRun) {
    this.focusedMenu.close();
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
    for (var i = 0; i < this.endBattleCallbacks.length; i++) {
      this.endBattleCallbacks[i](winLoseRun);
    }
  },

  handleKey: function(keyCode) {
    if (this.focusedMenu) {
      this.focusedMenu.onKey(keyCode);
    }
  },

  onEndBattle: function(callback) {
    this.endBattleCallbacks.push(callback);
  }
};
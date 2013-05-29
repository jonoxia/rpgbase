function CmdMenuMixin(subClassProto) {
  subClassProto._init = function() {
    this.cmdList = [];
    this.selectedIndex = 0;
    this.title = null;
  };

  subClassProto.clear = function() {
    this.cmdList = [];
  };

  subClassProto.setTitle = function(title) {
    this.title = title;
  };

  subClassProto.addCommand = function(name, callback) {
    this.cmdList.push({name: name, execute: callback});
  };
    
  subClassProto.moveSelectionUp = function() {
    this.selectedIndex --;
    if (this.selectedIndex < 0) {
      this.selectedIndex = this.cmdList.length - 1;
    }
    this.showArrowAtIndex(this.selectedIndex);
  };
  
  subClassProto.moveSelectionDown = function() {
    this.selectedIndex ++;
    if (this.selectedIndex >= this.cmdList.length) {
      this.selectedIndex = 0;
    }
    this.showArrowAtIndex(this.selectedIndex);
  };

  subClassProto.chooseSelected =  function() {
    var cmd = this.cmdList[this.selectedIndex];
    cmd.execute();
  };

  subClassProto.onKey = function(keyCode) {
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
  };

  subClassProto.reset = function() {
    this.selectedIndex = 0;
  };
}

var CanvasTextUtils = {
  // singleton object
  drawTextBox: function(ctx, x, y, width, height, textLines) {
    var cornerRadius = this.styles.cornerRadius;
    ctx.beginPath();
    // top edge:
    var right = x + width;
    var bottom = y + height;
    ctx.moveTo( x + cornerRadius, y);
    ctx.lineTo( right - cornerRadius, y);
    // top-right curve
    ctx.arc( right - cornerRadius,
	     y + cornerRadius,
	     cornerRadius, 3 * Math.PI/2, 0, false);
    ctx.lineTo( right, bottom - cornerRadius);
    //bottom-right curve:
    ctx.arc( right - cornerRadius,
	     bottom - cornerRadius,
	     cornerRadius, 0, Math.PI/2, false);
    ctx.lineTo( x + cornerRadius, bottom);
    //bottom-left curve:
    ctx.arc( x + cornerRadius,
	     bottom - cornerRadius,
	     cornerRadius, Math.PI/2, Math.PI, false);
    ctx.lineTo( x, y + cornerRadius);
    //top-left curve:
    ctx.arc( x + cornerRadius,
	     y + cornerRadius,
	     cornerRadius, Math.PI, 3*Math.PI/2, false);

    // clear area
    ctx.fillStyle = this.styles.bgColor;
    ctx.strokeStyle = this.styles.borderColor;
    ctx.fill();
    ctx.stroke();

    if (textLines && textLines.length > 0) {
      ctx.font = this.styles.font;
      ctx.fillStyle = this.styles.fontColor;
      // draw each line:
      for (var i = 0; i < textLines.length; i++) {
        ctx.fillText(textLines[i], x + this.styles.leftMargin,
                     y + this.styles.topMargin + this.styles.lineHeight*(i + 0.8));
      }
    }

  },

  setStyles: function(options) {
    for (var prop in options) {
      this.styles[prop] = options[prop];
    }
  },

  getStyles: function() {
    return this.styles;
  },

  styles: {
    leftMargin: 10,
    rightMargin: 5,
    topMargin: 5,
    bottomMargin: 5,
    lineHeight: 12,
    fontSize: 6,
    cornerRadius: 3,
    maxLineLength: 32,
    font: "6pt monospace",
    fontColor: "white",
    bgColor: "black",
    borderColor: "white"
  }
};


function CanvasCmdMenu() {
  this._init();
  this.x = 0; 
  this.y = 0;
  this.width = 50;
  this.height = 150;
}
CanvasCmdMenu.prototype = {
  showArrowAtIndex: function(index) {
    // TODO  -- if display is getting called on
    // the animation loop, do I even need this?
  },
  display: function(ctx) {
    if (!ctx) {
      return;
    }
    var styles = CanvasTextUtils.getStyles();
    // calc width and height based on text size of
    // contents

    this.width = styles.leftMargin + styles.rightMargin;
    var longestCommand = 0;
    for (var i =0; i < this.cmdList.length; i++) {
      if (this.cmdList[i].name.length > longestCommand) {
        longestCommand = this.cmdList[i].name.length;
      }
    }
    // TODO use that method that calcs text size:
    this.width = styles.leftMargin + styles.rightMargin + styles.fontSize * longestCommand;
    this.height = this.cmdList.length * styles.lineHeight + styles.topMargin + styles.bottomMargin;

    var textLines = [];
    for (var i =0; i < this.cmdList.length; i++) {
      textLines.push(this.cmdList[i].name);
    }
    
    CanvasTextUtils.drawTextBox(ctx, this.x, this.y,
                                this.width, this.height, textLines);

    // Draw the triangular indicator:
    ctx.beginPath();
    var yBase = this.y + styles.lineHeight * this.selectedIndex;
    ctx.moveTo(this.x + 4, yBase + 8);
    ctx.lineTo(this.x + 8, yBase + 12);
    ctx.lineTo(this.x + 4, yBase + 16);
    ctx.lineTo(this.x + 4, yBase + 8);;
    ctx.fill();
  },
  close: function() {
    // TODO anything to do here? Just stop drawing it right?
  },
  setPos: function(x, y) {
    this.x = x;
    this.y = y;
  }
};
CmdMenuMixin(CanvasCmdMenu.prototype);

/* Canvas menus TODO: 
   (check) * - the showMsg must be drawn in this way too -- preferrably somewhere NOT overlapping default menu position the way it does now!

   (check) * - share the margins, corner radius, line height, etc etc
       with the cmd menus. Make some sort of style object owned by
       the MenuSystem

 * - dialoglog must be drawn in this way.
 * - dialoglog must be explicitly overlaid over map screen using an
     afterRender callback.
 * - Provide userland with an API for specifying font, font size, line height, margins, border radius, colors, border thickness, and positioning of menus.
     ** - share this style object - store it somewhere where everyone
          can refer to it. Owned by the MenuSystem?
     how do they specify position of menus?
     ** - first chara stats go here
     ** - each chara stats after that goes at +x +y from there
     ** - message window goes here
     ** - set width and height to a number OR 'auto' where auto means
           calculate based on size of text inside
     ** - main menu goes here
     ** - each submenu gets offset by +x +y from there

primary mediasitinal large B-cell lymphoma which is an aggressive non-hodgkins lymphoma


 * - don't let canvas menus go off the edge of the canvas -- if bottom is below bottom edge, bump it up. if right is past right edge, bump it left.
 * - during input of character combat actions, pop or hide some of the already-chosen submenus -- they don't need to take up space on the screen.
 * - bug: if i have multiple items with the same name, only one seems to show up on the item menu in combat!  (a useful, if accidental, space-saving feature?)

*/



function CssCmdMenu(container) {
  this._init();
  this.container = container;
  this.cursorHtml = "<blink>&#x25B6;</blink>";
}
CssCmdMenu.prototype = {
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

  close: function() {
    this.parentTag.remove();
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
CmdMenuMixin(CssCmdMenu.prototype);

/* TODO:  modify MenuSystemMixin to allow substituting a
 * canvas-based menu for a CSS-based menu. */

function MenuSystemMixin(subClassPrototype) {
  subClassPrototype._init = function(htmlElem) {

    // TODO make an interface for setting this to either "canvas" 
    // or "css" but for now we're testing canvas impl
    this.menuImpl = "canvas";

    this.menuStack = [];
    this._htmlElem = htmlElem;
    this.displayElem = this._htmlElem.find(".msg-display");
    this._rootMenu = null;
    this._party = null;
    this._closeCallbacks = [];

    this._positioning = {
      statsLeft: 0,
      statsTop: 0, // stats width and height?
      statsWidth: "auto",
      statsHeight: "auto",
      statsXOffset: 0,
      statsYOffset: 0,
      
      msgLeft: 25,
      msgTop: 125,
      msgWidth: "auto", // not yet used
      msgHeight: "auto", // not yet used
      
      menuLeft: 0,
      menuTop: 0,
      menuWidth: "auto", // not yet used
      menuHeight: "auto", // not yet used
      menuXOffset: 0,
      menuYOffset: 0
    };
  };

  subClassPrototype.menuFromCmdSet = function (title, cmdSet) {
    var self = this;
    var subMenu = this.makeMenu();
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
    if (this._rootMenu) {
      this.pushMenu(this._rootMenu);
    }
    this.clearMsg();
    this.hidePartyStats();
  };

  subClassPrototype.close = function() {
    this.emptyMenuStack();
    if (this._rootMenu) {
      this._rootMenu.reset();
    }
    this.canvasStyleMsgText = null;
    this.hide();
    for (var i = 0; i < this._closeCallbacks.length; i++) {
      this._closeCallbacks[i]();
    }
  };

  subClassPrototype.makeMenu = function() {
    if (this.menuImpl == "canvas") {
      return new CanvasCmdMenu();
    } else {
      return new CssCmdMenu(this._htmlElem);
    }
  };

  subClassPrototype.pushMenu = function(newMenu) {
    var x;
    if (this.menuImpl == "canvas") {
      x = this._positioning.menuLeft;
      y = this._positioning.menuTop;
      for (var i = 0; i < this.menuStack.length; i++) {
        x += this._positioning.menuXOffset;
        y += this._positioning.menuYOffset;
      }
      newMenu.setPos(x, y);
    } else {
      x = 25;
      for (var i = 0; i < this.menuStack.length; i++) {
        x += 80;
      }
      newMenu.setPos(x, 250);
    }
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
    if (this.menuImpl == "canvas") {
      this.canvasStyleMsgText = msg;
      var styles = CanvasTextUtils.getStyles();
      // split text up into lines:
      var words = msg.split(" ");
      var lines = [];
      var currLine = words.shift();
      while (words.length > 0) {
        var word = words.shift();
        if (currLine.length + word.length + 1 <= styles.maxLineLength) {
          currLine = currLine + " " + word;
        } else {
          lines.push(currLine);
          currLine = word;
        }
      }
      if (currLine.length > 0) {
        lines.push(currLine);
      }
      this.canvasStyleMsgLines = lines;
    } else {
      this.displayElem.append($("<span></span>").html(msg));
      this.displayElem.append($("<br>"));
      this.displayElem.show();
    }
  };

  subClassPrototype.clearMsg = function() {
    this.displayElem.hide();
    this.displayElem.empty();
    this.canvasStyleMsgText = null;
    this.canvasStyleMsgLines = [];
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
    // TODO if impl is canvas, draw these in canvas instead!!
    // use this._positioning.statsLeft, statsTop, statsXOffset etc.
    this._htmlElem.find(".stats").remove();
    if (this.menuImpl == "canvas") {
      this.canvasPartyStats = [];
      for (var i = 0; i < this._party.length; i++) {
        this.canvasPartyStats.push( this._party[i].getStatDisplay() );
      }
    } else {
      for (var i = 0; i < this._party.length; i++) {
        var statHtml = this._party[i].getStatDisplay();
        var statBox = $("<div></div>").html(statHtml);
        statBox.addClass("stats");
        this._htmlElem.append(statBox);
      }
    }
  };

  subClassPrototype.hidePartyStats = function() {
    if (this.menuImpl == "canvas") {
      this.canvasPartyStats = null;
    } else {
      this._htmlElem.find(".stats").remove();
    }
  };

  subClassPrototype.yesOrNo = function(callback) {
    var yesOrNoMenu = this.makeMenu();
    yesOrNoMenu.addCommand("Yes", function() {
      callback(true);
    });
    yesOrNoMenu.addCommand("No", function() {
      callback(false);
    });
    this.pushMenu(yesOrNoMenu);
  },

  subClassPrototype.drawCanvasMenus = function(ctx) {
    if (this.menuImpl == "canvas") {
      // do this next part only if using canvas menus and
      // only if they're open:
      for (var i = 0; i < this.menuStack.length; i++) {
        this.menuStack[i].display(ctx);
      }
      if (this.canvasStyleMsgText) {
        // Draw any open message set by showMsg
        this.drawCanvasMsgText(ctx, this.canvasStyleMsgText);
      }
      if (this.canvasPartyStats) {
        this.drawCanvasPartyStats(ctx, this.canvasPartyStats);
      }
    }
  };

  subClassPrototype.drawCanvasMsgText = function(ctx, text) {
    var styles = CanvasTextUtils.getStyles();

    var x = this._positioning.msgLeft;
    var y = this._positioning.msgTop;

    var lines = this.canvasStyleMsgLines;
    var width = styles.leftMargin + styles.rightMargin 
      + styles.maxLineLength * styles.fontSize;
    var numLines = lines.length;
    var height = styles.topMargin + styles.bottomMargin
      + numLines * styles.lineHeight;

    // TODO make a scrollable text box for when there are more lines
    // than will fit in the box at once.
    CanvasTextUtils.drawTextBox(ctx, x, y, width, height, lines);
   
  };

  subClassPrototype.drawCanvasPartyStats = function(ctx, stats) {
    var x = this._positioning.statsLeft;
    var y = this._positioning.statsTop;
    var width = this._positioning.statsWidth;
    var height = this._positioning.statsHeight;
    for (var i = 0; i < stats.length; i++) {
      var textLines = stats[i].split("<br>");
      CanvasTextUtils.drawTextBox(ctx, x, y, width, height,
                                 textLines);
      x += this._positioning.statsXOffset;
      y += this._positioning.statsYOffset;
    }
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

  subClassPrototype.setMenuPositions = function(options) {
    // TODO these are currently only applied to Canvas menus.
    // Apply them to CSS menus too?
    for (var prop in options) {
      this._positioning[prop] = options[prop];
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
        item.effect(self, character, null);
        self.returnToRoot();
      }
    });

    subMenu.addCommand("Equip", function() {
      if (character.canEquipItem(item.reference)) {
        self.showMsg(character.name + " equips "
                     + item.name);
        character.equipItem(item.reference);
      } else {
        self.showMsg(character.name + " can't equip "
                     + item.name);
      }
      self.returnToRoot();
    });

    subMenu.addCommand("Give", function() {
      self.chooseCharacter("Give to?", function(target) {
        self.showMsg(character.name + " gives the " + item.name
                    + " to " + target.name);
        target.receiveItemFrom(item.reference, character);
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

// TODO make DialogLog into a proper menu system mixin subclass.
// requirements: make it so the top of the stack can be a "menu"
// which is just a text window (that goes away when you hit a button)
// (this will have other uses too!). A "scrollable text message" that
// obeys the same interface as a menu, and responds to key events
// by scrolling.

// TODO make DialogLog work in canvas menu mode

function Dialoglog(htmlElem) {
  this.menuStack = [];
  this._htmlElem = htmlElem;
  this._closeCallbacks = [];
  this._occupiedNPC = null;
  this.displayElem = this._htmlElem.find(".msg-display");

  // weird hacky way of directly instantiating the mixin:
  this.dialogMenu = {};
  MenuSystemMixin(this.dialogMenu);
  this.dialogMenu._init(htmlElem);

  this._menuIsOpen = false;
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
  close: function() {
    if (this.dialogMenu.isOpen) {
      this.closeMenu();
    }
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
  onClose: function(callback) {
    this._closeCallbacks.push(callback);
  },
  openMenu: function(player) {
    this.dialogMenu.open(player);
    this._menuIsOpen = true;
    return this.dialogMenu;
  },
  closeMenu: function() {
    this.dialogMenu.close();
    this._menuIsOpen = false;
  },
  handleKey: function(keyCode) {
    // if there's a menu, pass key code along to menu
    // if end of the dialog is onscreen, hide it
    // TODO if a screen before the end of long dialog is onscreen,
    // scroll to next screen of dialog.
    if (this._menuIsOpen) {
      this.dialogMenu.handleKey(keyCode);
    } else {
      this.close();
    }
  },

  occupyNPC: function(npc) {
    // don't let this NPC wander away while player is talking to them:
    npc.sleep();
    this._occupiedNPC = npc;
  }
};

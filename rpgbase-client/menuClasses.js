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
    this.publishIndicatorChange();
  };

  subClassProto.moveSelectionDown = function() {
    this.selectedIndex ++;
    if (this.selectedIndex >= this.cmdList.length) {
      this.selectedIndex = 0;
    }
    this.showArrowAtIndex(this.selectedIndex);
    this.publishIndicatorChange();
  };

  subClassProto.publishIndicatorChange = function() {
    if (this.menuSystem.eventService) {
      var cmd = this.cmdList[this.selectedIndex];
      this.menuSystem.eventService.fireGameEvent("indication-changed", {cmd: cmd});
    }
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

  subClassProto.hasCmd = function(cmdName) {
    for (var i = 0; i < this.cmdList.length; i++) {
      if (this.cmdList[i].name == cmdName) {
        return true;
      }
    }
    return false;
  };

  subClassProto.listCmdNames = function() {
    var names = [];
    for (var i = 0; i < this.cmdList.length; i++) {
      names.push(this.cmdList[i].name);
    }
    return names;
  };

}

function MenuSystemMixin(subClassPrototype) {
  subClassPrototype._init = function(htmlElem, cursorImg, width, height) {
      
    this.menuStack = [];
    this._htmlElem = htmlElem;
    if (htmlElem) {
      this.displayElem = this._htmlElem.find(".msg-display");
      this.menuImpl = "css";
      this._calculatedScale = 1.0;
    } else {
      // If no html elem specified, use in-canvas menus:
      this.displayElem = null;
      this.menuImpl = "canvas";
    }
    this._screenWidth = width;
    this._screenHeight = height;
    this._rootMenu = null;
    this._party = null;
    this._closeCallbacks = [];
    this._openCallbacks = [];
    this._resourceVisible = false;
    this._statDisplayType = "short";
    this._fixedDisplayBoxes = []; // TODO canvas-only; merge with statusBoxes
    this._statusBoxes = []; // TODO css-only; merge with fixedDisplayBoxes
    this._savedStackDepth = 0;

    // cursor image is optional
    this._cursorImg = cursorImg;

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
      menuYOffset: 0,

      resourceLeft: 160, // todo will we still use these?
      resourceTop: 10,
      resourceWidth: 90,
      resourceHeight: 20,

      imgLeft: 100,
      imgTop: 520,
      imgWidth: 100,
      imgHeight: 100,

      cssFontSize: 18, // only applies to css menus 
      cssBorderWidth: 3, // same -- TODO merge with canvas text styles
      cssPadding: 20, // same

      maxMenuLength: 0 // if not zero, menus with more than x items become scrolling
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
    cmdSet.forEach(addOneCmd);
    return subMenu;
  };

  subClassPrototype.open = function(player) {
    this._player = player;
    this._party = player.getParty();
    if (this.menuImpl != "canvas") {
      this._htmlElem.show();
    }
    if (this._rootMenu) {
      this.pushMenu(this._rootMenu);
    }
    this.clearMsg();
    this.hidePartyStats();
    this.hidePartyResources();
    for (var i = 0; i < this._openCallbacks.length; i++) {
      this._openCallbacks[i]();
    }
  };

  subClassPrototype.close = function() {
    this.emptyMenuStack();
    if (this._rootMenu) {
      this._rootMenu.reset();
    }
    this.canvasStyleMsgText = null;
    this.hidePartyStats(); // TODO soon redundant with hideStatsuBoxes
    this.hidePartyResources(); // ditto
    this.hideStatusBoxes();
    this.hide();
    for (var i = 0; i < this._closeCallbacks.length; i++) {
      this._closeCallbacks[i]();
    }
  };

  subClassPrototype.makeMenu = function() {
    var maxLength = null;
    if (this._positioning.maxMenuLength) {
      maxLength = this._positioning.maxMenuLength;
    }
    if (this.menuImpl == "canvas") {
      // TODO the maxLength argument doesn't do anything for Canvas menus yet.
      return new CanvasCmdMenu(this._cursorImg, this, maxLength);
    } else {
      return new CssCmdMenu(this._htmlElem, this, maxLength);
    }
  };

  subClassPrototype.makeScrollingTextBox = function(dialogText) {
    if (this.menuImpl == "canvas") {
      return new CanvasScrollingTextBox(dialogText, this);
    } else {
      return new CssScrollingTextBox(dialogText, this);
    }
  };

  subClassPrototype.makeFixedTextBox = function(dialogText) {
    // TODO the actual 'dialogText' option is used rarely enough that
    // it might make more sense for the argument to be a generateHtml
    // callback.
    if (this.menuImpl == "canvas") {
      return new CanvasFixedTextBox(dialogText, this);
    } else {
      return new CssFixedTextBox(dialogText, this);
    }
  };

  subClassPrototype.getScaledMenuPos = function() {
    return this._scalePositions(this._positioning.menuLeft,
                                this._positioning.menuTop);
  };

  subClassPrototype.getScaledStatsPos = function() {
    return this._scalePositions(this._positioning.statsLeft,
                                this._positioning.statsTop);
  };

  subClassPrototype.getScaledStatsDimensions = function() {
    return this._scalePositions(this._positioning.statsWidth,
                                this._positioning.statsHeight);
  };
  
  subClassPrototype._scalePositions = function(x, y) {
    if (y > 0 && this.menuImpl == "css") {
      y *= this._calculatedScale;
    }
    if (x > 0 && this.menuImpl == "css") {
      x *= this._calculatedScale;
    }
    // TODO in the future we want to scale the position regardless of whether it's
    // positive, but for now that causes too many problems.

    if (y < 0) {
      // negative value means offset from bottom
      var offset = this._screenHeight - 20; // -20 is for margins/padding
      if (this.menuImpl == "css") {
        offset *= this._calculatedScale;
      }
      y += offset;
    }
    if (x < 0) {
      offset= this._screenwidth - 20;
      if (this.menuImpl == "css") {
        offset *= this._calculatedScale;
      }
      x += offset;
    }

    return {x: x, y: y};
  };

  subClassPrototype.getTopMenu = function() {
    if (this.menuStack.length == 0) {
      return null;
    }
    return this.menuStack[this.menuStack.length - 1];
  };

  subClassPrototype.pushMenu = function(newMenu) {
    var x, y;
    
    if (this.menuStack.length > 0) {
      var pos = this.getTopMenu().getPos();
      // if menuXOffset and menuYOffset are set, then we move each
      // new child menu that far right/down from its parent menu:
      //var offsets = this._scalePositions(this._positioning.menuXOffset,
      //                                   this._positioning.menuYOffset);
      x = pos.x + this._positioning.menuXOffset; //offsets.x;
      y = pos.y + this._positioning.menuYOffset; //offsets.y;
    } else {
      //var pos = this.getScaledMenuPos();
      x = this._positioning.menuLeft; //pos.x;
      y = this._positioning.menuTop; //pos.y;
    }

    newMenu.setPos(x, y);
    this.menuStack.push(newMenu);
    if (this.menuImpl != "canvas") {
      newMenu.display();
    }
  };

  subClassPrototype.popMenu = function() {
    if (this.menuStack.length > 0) {
      var topMenu = this.menuStack[ this.menuStack.length - 1];
      if (this.eventService) {
        this.eventService.fireGameEvent("menu-popped", {menu: topMenu});
      }
      topMenu.close();
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
    if (this.menuImpl == "css") {
      this._htmlElem.hide();
    }
  };

  subClassPrototype.onOpen = function(callback) {
    this._openCallbacks.push(callback);
  };

  subClassPrototype.onClose = function(callback) {
    this._closeCallbacks.push(callback);
  },

  subClassPrototype.showMsg = function(msg) {
    if (this.menuImpl == "canvas") {
      this.canvasStyleMsgText = msg;
      this.canvasStyleMsgLines = CanvasTextUtils.splitLines(msg);
    } else {
      this.displayElem.css("left", this._calculatedScale * this._positioning.msgLeft);
      this.displayElem.css("top", this._calculatedScale * this._positioning.msgTop);
      this.displayElem.css("font-size", this.getFontSize() + "pt");
      this.displayElem.append($("<span></span>").html(msg));
      this.displayElem.append($("<br>"));
      this.displayElem.show();
    }
    this._lastMsgShown = msg; // for debugging/unit testing
  };

  subClassPrototype.clearMsg = function() {
    if (this.menuImpl == "canvas" ) {
      this.canvasStyleMsgText = null;
      this.canvasStyleMsgLines = [];
    } else {
      this.displayElem.hide();
      this.displayElem.empty();
    }
  };

  subClassPrototype.scrollText = function(dialogText) {
    // Turn into a scrolling message box and push onto stack
    this.clearMsg();
    var textBox = this.makeScrollingTextBox(dialogText);
    this.pushMenu(textBox);
    textBox.setPos(this._positioning.msgLeft,
                   this._positioning.msgTop);
    return textBox;
  },

  subClassPrototype.chooseOne = function(title, set, callback) {
    var charMenu = this.makeMenu();
    charMenu.setTitle(title);
    var self = this;
    var addOneCmd = function(target) {
      charMenu.addCommand(target.name, function() {
        callback(target);
      });
    };
    for (var i = 0; i < set.length; i++) {
      addOneCmd(set[i]);
    }
    this.pushMenu(charMenu);
  };

  subClassPrototype.chooseCharacter = function(title, callback) {
    this.chooseOne(title, this._party, callback);
  };
  
  subClassPrototype.showPartyStats = function() {
    // If impl is canvas, draw these in canvas instead!!
    // use this._positioning.statsLeft, statsTop, statsXOffset etc.
    if (this.menuImpl == "canvas") {
        this.canvasPartyStats = true;
    } else {
      // TODO deprecate this in favor of showStatusBoxes()
      this._htmlElem.find(".stats").remove();
      var pos = this.getScaledStatsPos();
      var left = pos.x;
      var top = pos.y;

      // if we're doing the thing where each party member has a stat box all in
      // a row, calculate the offsets for each one:
      var offsets = this._scalePositions(this._positioning.statsXOffset,
                                         this._positioning.statsYOffset);

      for (var i = 0; i < this._party.length; i++) {
        var statHtml = this._party[i].getStatDisplay(this._statDisplayType);
        var statBox = $("<div></div>").html(statHtml);
        statBox.addClass("stats");
        statBox.css("left", left + "px");
        statBox.css("top", top + "px");
        statBox.css("font-size", this.getFontSize() + "pt");
        if (this._positioning.statsWidth !== "auto") {
          var dim = this.getScaledStatsDimensions();
          statBox.css("width", dim.x + "px");
          statBox.css("height", dim.y + "px");
        }
        this._htmlElem.append(statBox);
        left += offsets.x;
        top += offsets.y;
      }
    }
  };

  subClassPrototype.hidePartyStats = function() {
    // TODO deprecated in favor of hideStatusBoxes
    if (this.menuImpl == "canvas") {
      this.canvasPartyStats = null;
    } else {
      this._htmlElem.find(".stats").remove();
    }
  };

  subClassPrototype.yesOrNo = function(callback) {
    var yesOrNoMenu = this.makeMenu();
    yesOrNoMenu.addCommand("YES", function() {
      callback(true);
    });
    yesOrNoMenu.addCommand("NO", function() {
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
          this.drawCanvasPartyStats(ctx, this._party);
      }
      if (this._resourceVisible) {
        // TODO turn this into a special case of fixedDisplayBoxes?
        this.drawCanvasPartyResources(ctx);
      }
      for (var i = 0; i < this._fixedDisplayBoxes.length; i++) {
        this._fixedDisplayBoxes[i].display(ctx);
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

    CanvasTextUtils.drawTextBox(ctx, x, y, width, height, lines);
  };
 
  subClassPrototype.drawCanvasPartyStats = function(ctx, party) {
    var x = this._positioning.statsLeft;
    var y = this._positioning.statsTop;
    var width = this._positioning.statsWidth;
    var height = this._positioning.statsHeight;
    for (var i = 0; i < party.length; i++) {
      party[i].displayStats(ctx, x, y, width, height,
			    this._statDisplayType);
      x += this._positioning.statsXOffset;
      y += this._positioning.statsYOffset;
    }
  };
  
  subClassPrototype.handleKey = function(keyCode) {
    if (keyCode == CANCEL_BUTTON) {
      // cancel -> pop top menu off menu stack, go back to previous one
      if (!this._freelyExit) {
        // If this is not a freely-exitable menu system, then ignore
        // cancel buttons when we're on the root menu of the stack.
        if (this.menuStack.length <= 1) {
          // Yes, this can be zero -- e.g. when a battle is starting before
          // the menus appear
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
        this.getTopMenu().onKey(keyCode);
      }
    }
  };

  subClassPrototype.setMenuPositions = function(options) {
    for (var prop in options) {
      this._positioning[prop] = options[prop];
    }
  };

  subClassPrototype.saveStackDepth = function() {
    this._savedStackDepth = this.menuStack.length;
  };

  subClassPrototype.restoreStackDepth = function() {
    while (this.menuStack.length > this._savedStackDepth) {
      this.popMenu();
    }
  };

  subClassPrototype.showPartyResources = function() {
    if (this.menuImpl == "canvas") {
      this._resourceVisible = true;
    }
    // TODO deprecate this in favor of using a status box for resources
  };

  subClassPrototype.hidePartyResources = function() {
    if (this.menuImpl == "canvas") {
      this._resourceVisible = null;
    }
    // TODO deprecate this in favor of using a status box for resources
  },

  subClassPrototype.drawCanvasPartyResources = function(ctx) {
    // This duplicates a lot from stats windows... should basically
    // be considered part of the stats windows??
    var x = this._positioning.resourceLeft;
    var y = this._positioning.resourceTop;
    var width = this._positioning.resourceWidth;
    var height = this._positioning.resourceHeight;
    var textLines = [];
    var resources;
    if (this._resourceNames) {
        resources = this._resourceNames;
    } else {
        resources = this._player.listResources();
    }
    for (var i = 0; i < resources.length; i++) {
      textLines.push(this._player.getResource(resources[i])
		     + resources[i]);
    }
    CanvasTextUtils.drawTextBox(ctx, x, y, width, height,
                                textLines);
  };

  subClassPrototype.getHilitedCmd = function() {
    if (this.menuStack.length < 1) {
      return null;
    }
    var topMenu = this.getTopMenu();
    return topMenu.cmdList[topMenu.selectedIndex];
  };

  subClassPrototype.getFontSize = function() {
    // This is only relevant for CSS menus
    return Math.floor(this._positioning.cssFontSize * this._calculatedScale);
  };

  subClassPrototype.addStatusBox = function(statusBox, name) {
    // Give this a name so we can refer to it later
    this._statusBoxes.push({name: name, instance: statusBox});
  };

  subClassPrototype.removeStatusBox = function(name) {
    // removes any status boxes with given name
    this._statusBoxes = this._statusBoxes.filter(
      function(x) { return x.name !== name; }
    );
  };

  subClassPrototype.showStatusBoxes = function(name) {
    // if name is provided, only show the ones with "name"
    $.each(this._statusBoxes, function(i, entry) {
      if (!name || entry.name === name) {
        entry.instance.display();
      }
    });
    // TODO this is for CSS menus -- for canvas menus it needs to do what
    // canvas menus is currently doing with fixedDisplayBoxes.
  };

  subClassPrototype.hideStatusBoxes = function(name) {
    // if name is provided, only show the ones with "name"
    $.each(this._statusBoxes, function(i, entry) {
      if (!name || entry.name === name) {
        entry.instance.close(); // this removes its html, is that OK?
      }
    });
  };

  subClassPrototype.refreshStatusBoxes = function(name) {
    // if name is provided, only refresh the ones with "name"
    $.each(this._statusBoxes, function(i, entry) {
      if (!name || entry.name === name) {
        entry.instance.refresh();
      }
    });
  };
}

function FieldMenu(htmlElem, cursorImg, width, height, commandSet, uiText) {
  this._init(htmlElem, cursorImg, width, height);
  this._rootMenu = this.menuFromCmdSet("", commandSet);
  this._freelyExit = true;
  // field menu can always be exited with cancel button,
  // unlike battle menu.
  this._itemSubMenuCmds = ["USE", "EQUIP", "GIVE", "DROP"];
  this._resourceNames = [];

  if (uiText) {
    this._uiText = uiText;
  } else {
    this._uiText = {
      itemSubMenuTitle: "DO WHAT?",
      useCmdName: "USE",
      useTarget: "USE ON?",
      equipCmdName: "EQUIP",
      equipSuccess: "{1} EQUIPS {2}.",
      equipFail: "{1} CAN'T EQUIP {2}",
      giveCmdName: "GIVE",
      giveTarget: "GIVE TO?",
      giveSuccess: "{1} GIVES THE {2} TO {3}.",
      dropCmdName: "DROP",
      dropSuccess: "{1} DROPS THE {2}.",
      spellMenuTitle: "SPELLS:",
      spellMenuEmpty: "NO MAGIC",
      spellTarget: "ON WHO?",
      itemMenuTitle: "ITEMS:",
      itemMenuEmpty: "NO ITEMS"
    };
  }
}
FieldMenu.prototype = {
  customizeItemSubMenu: function(cmds) {
    this._itemSubMenuCmds = cmds;
  },

  customizeResourceDisplay: function(resources) {
    this._resourceNames = resources;
  },

  showItemSubMenu: function(item, character) {
    // do what with this item?
    var self = this;
    var subMenu = this.makeMenu();
    subMenu.setTitle(this._uiText.itemSubMenuTitle);

    for (var i = 0; i < self._itemSubMenuCmds.length; i++) {
      switch (self._itemSubMenuCmds[i]) {
      case "USE":
        subMenu.addCommand(self._uiText.useCmdName, function() {
          if (item.target == "ally") {
            // If using it requires selecting a target...
            self.chooseCharacter(self._uiText.useTarget, function(target) {
              self.returnToRoot();
              item.effect(self, character, target);
            });
          } else {
            // TODO are there other target types?
            // e.g. target type "environment" means that
            // item.effect should be passed the map/maze screen
            self.returnToRoot();
            item.effect(self, character, null);
          }
        });
	break;
      case "EQUIP":
        subMenu.addCommand(self._uiText.equipCmdName, function() {
          self.returnToRoot();
          if (character.canEquipItem(item.reference)) {
            var msg = self._uiText.equipSuccess.replace("{1}", character.name)
              .replace("{2}", item.name);
            self.showMsg(msg);
            character.equipItem(item.reference);
          } else {
            var msg = self._uiText.equipFail.replace("{1}", character.name)
              .replace("{2}", item.name);
            self.showMsg(msg);
          }
        });
	break;
      case "GIVE":
        subMenu.addCommand(self._uiText.giveCmdName, function() {
          self.chooseCharacter(self._uiText.giveTarget, function(target) {
            self.returnToRoot();
            var msg = self._uiText.giveSuccess.replace("{1}", character.name)
              .replace("{2}", item.name).replace("{3}", target.name);
            self.showMsg(msg);
            target.receiveItemFrom(item.reference, character);
          });
        });
	break;
      case "DROP":
        subMenu.addCommand(self._uiText.dropCmdName, function() {
          self.returnToRoot();
          var msg = self._uiText.dropSuccess.replace("{1}", character.name)
            .replace("{2}", item.name);
          self.showMsg(msg);
          character.loseItem(item.reference);
        });
	break;
      }
    }
    this.pushMenu(subMenu);
  },

  showItemMenu: function(character) {
    // TODO will have a lot of parallel code for casting spells
    // outside of battle.
    var self = this;
    var menu = this.makeMenu();
    menu.setTitle(this._uiText.itemMenuTitle);

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
    // if item menu is empty:
    if (itemCmds.length == 0) {
      menu.addCommand(this._uiText.itemMenuEmpty, function() {});
    }

    this.pushMenu(menu);
  },

  executeFieldSpell: function(character, spell) {
    var self = this;
    var result = spell.checkUsability(this, character);
    if (!result.usable) {
      // show reason why spell cannot be used:
      self.showMsg(result.reason);
    } else if (spell.target == "ally") {
      self.chooseCharacter(self._uiText.spellTarget, function(target) {
        self.popMenu();
        self.popMenu();
        spell.effect(self, character, target);
	// update stats display to show effect of heal:
	self.showPartyStats(); // TODO replace with refreshStatusBoxes
      });
    } else if (spell.target == "all_allies") {
      var party = self._player.getAliveParty();
      self.popMenu();
      spell.effect(self, character, party);
      self.showPartyStats();
    } else {
      // non-target spells:
      self.popMenu();
      spell.effect(self, character); // TODO pass party?
      // update stats display to show effect of heal:
      self.showPartyStats();
    }
  },

  showSpellMenu: function(character) {
    var self = this;
    var menu = this.makeMenu();
    menu.setTitle(this._uiText.spellMenuTitle);

    var fieldSpells = character._fieldSpells;
    $.each(fieldSpells, function(i, spell) {
      menu.addCommand(spell.name, function() {
        self.executeFieldSpell(character, spell);
      });
    });

    // if no spells:
    if (fieldSpells.length == 0) {
      menu.addCommand(this._uiText.spellMenuEmpty, function() {});
    }

    this.pushMenu(menu);
  }
};
MenuSystemMixin(FieldMenu.prototype);
FieldMenu.prototype.showMsg = function(text) {
  // field menu always uses scrolling text box for text, never the
  // stack-independent status display
  this.scrollText(text);
  // TODO this needs to respect this._menuImpl
};



function ScrollingTextBoxMixin(subclassPrototype) {
  subclassPrototype.onKey = function(key) {
    if (this.currLine + this.linesAtOnce < this.lines.length) { 
      // advance through scroll text, if large
      this.currLine ++;
      this.refresh();
    } else {
      // if done, treat any key as cancel button
      this.menuSystem.handleKey(CANCEL_BUTTON);
      for (var i = 0; i < this._closeCallbacks.length; i++) {
        this._closeCallbacks[i]();
      }
      this.close();
    }
  },

  subclassPrototype.onClose = function(callback) {
    this._closeCallbacks.push(callback);
  };

  subclassPrototype.splitLines = function(text, maxLineLength) {
    // split text up into lines:
    var words = text.split(" ");
    var lines = [];
    var currLine = words.shift();
    while (words.length > 0) {
      var word = words.shift();
      if (currLine.length + word.length + 1 <= maxLineLength) {
        currLine = currLine + " " + word;
      } else {
        lines.push(currLine);
        currLine = word;
      }
    }
    if (currLine.length > 0) {
      lines.push(currLine);
    }
    return lines;
  };

};






function BackgroundImgBox(width, height) {
  this.x = this.y = 0;
  this._img = null; // single background image, centered
  this._width = width;
  this._height = height;
  this._panels = []; // multiple manga panels, positioned
  // (you can use just _img, just _panels, or both)
}
BackgroundImgBox.prototype = {
  // Satisfies same interface as a CmdMenu, so it can go on
  // the menu stack, but takes up the whole screen and shows cutscene images.
  onKey: function(key) {
  },
  setPos: function(x, y) {
    this.x = x;
    this.y = y;
  },
  getPos: function() {
    return {x: this.x, y: this.y};
  },
  display: function(ctx) {
    if (!ctx) {
      return;
    } // TODO why i need this? why it get called with null ctx sometimes?
    if (this._black) {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, this._width, this._height);
    }
    if (this._img != null) {
      ctx.drawImage(this._img,
                    this._imgXOffset, this._imgYOffset);
    }
    $.each(this._panels, function(i, panel) {
      // Border around the panel (TODO make this customizable):
      ctx.strokeStyle = "black";
      ctx.strokeWidth = 1;
      ctx.strokeRect(panel.x - 4, panel.y - 4, panel.img.width+8, panel.img.height+8);
      ctx.strokeStyle = "white";
      ctx.strokeWidth = 2;
      ctx.strokeRect(panel.x - 2.5, panel.y - 2.5, panel.img.width+5, panel.img.height+5);
      ctx.strokeStyle = "black";
      ctx.strokeWidth = 1;
      ctx.strokeRect(panel.x - 1, panel.y - 1, panel.img.width+2, panel.img.height+2);
      ctx.drawImage(panel.img, panel.x, panel.y);
    });
  },
  close: function() {
    // serves as root menu for scripted events' menu system,
    // so it can't be closed.
  },
  reset: function() {
    this._black= false;
    this._img = null;
  },
  setImg: function(img, width, height) {
    // automatically centers the image, replaces any other image
    this._img = img;
    this._imgWidth = width;
    this._imgHeight = height;
    this._imgXOffset = (this._width - width)/2;
    this._imgYOffset = (this._height - height)/2;
  },
  stackPanel: function(img, x, y) {
    // draws the given panel at the given x, y on top of already present images, manga-panel
    this._panels.push({img: img, x: x, y: y});
  },
  clearPanelStack: function() {
    this._panels = [];
  },
  clearImg: function() {
    this._img = null;
  },
  blacken: function(val) {
    this._black = val;
  }  
};


function Dialoglog(htmlElem, cursorImg, width, height) {
  this._init(htmlElem, cursorImg, width, height);
  this._rootMenu = null;
  this._freelyExit = true;
  this._occupiedNPC = null;  

  var self = this;
  this.onClose(function() {
    self.releaseNPC();
  });
}
Dialoglog.prototype = {
  occupyNPC: function(npc) {
    // don't let this NPC wander away while player is talking to them:
    npc.sleep();
    this._occupiedNPC = npc;
  },

  releaseNPC: function() {
    if (this._occupiedNPC) {
      // release any NPC that this dialog was occupying
      this._occupiedNPC.wake();
      this._occupiedNPC = null;
    }
  },

  multipartTextDisplay: function(textSegments) {
    /* pass in a list of objects with .text and .img properties, like:
     * [{text: "bla bla bla", img: "hero.jpg"}]
     * scrolls each text segment while showing the corresponding image
     */
    if (textSegments.length == 0) { return; }
    var self = this;
    this._freelyExit = false; // lock us into the dialog until it's finished,
    // because otherwise the dialoglog will close as soon as the first scrolling
    // text box closes

    if (!this.portraitBox) {
      this.portraitBox = new CssFixedImgBox("", this); // TODO canvasImpl alternative
      this.addStatusBox(this.portraitBox, "portrait");
      this.portraitBox.setPos(this._positioning.imgLeft,
                              this._positioning.imgTop);
      // TODO setOutsideDimensions, maybe?
    }

    var segmentIndex = 0;
    var proceed = function() {
      var nextSegment = textSegments[segmentIndex];

      var textBox = self.makeScrollingTextBox(nextSegment.text);
      self.pushMenu(textBox);
      textBox.setPos(self._positioning.msgLeft,
                     self._positioning.msgTop);
      // TODO setOutsideDimensions, maybe?
      
      if (nextSegment.img == null) {
        self.hideStatusBoxes("portrait");
      } else {
        self.showStatusBoxes("portrait");
        var imgWidth = self._calculatedScale * self._positioning.imgWidth;
        var imgHeight = self._calculatedScale * self._positioning.imgHeight;
        self.portraitBox.setImg(nextSegment.img, imgWidth, imgHeight);
      }
      
      if (segmentIndex < textSegments.length - 1) {
        segmentIndex ++;
        textBox.onClose(proceed);
      } else {
        self._freelyExit = true;
        textBox.onClose(function() {
          self.close();
        });
      }
    };

    proceed();
  },
};
MenuSystemMixin(Dialoglog.prototype);

var CanvasTextUtils = {
  // singleton object
  _fontImg: null,

  setFontImg: function(img) {
    this._fontImg = img;
  },

  oldDrawTextBox: function(ctx, x, y, width, height, textLines) {
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
        var plotX = x + this.styles.leftMargin;
        var plotY = y + this.styles.topMargin + this.styles.lineHeight*i;
        this.customRenderText(ctx, textLines[i], plotX, plotY);
      }
    }
  },

  drawTextBox: function(ctx, x, y, width, height, textLines, options) {

    var W = 0;
    for (var i =0; i < textLines.length; i++) {
      if (textLines[i].length > W) {
        W = textLines[i].length;
      }
    }
    var L = textLines.length;

    W *= this.styles.fontSize;
    L *= this.styles.lineHeight;

    // opional overrides:
    // (HORRIBLE HACKERY here. If we're going to calc our own width/height for most
    // things, then we shouldn't take width and height as required arguments only to ignore
    // them! options should be the only optional argument. TODO refactor.
    // we could have that args are ctx, x, y, textLines, width, height, and width/height are
    // optional args. Or that passing "auto" to width and/or height lets this function calculate.
    if (options && options.width) {
        // Should calculate width/height correctly instead of adjusting it on the fly here.
        // TODO refactor
        W = options.width;
    }
    if (options && options.height) {
        L = options.height;
    }

    /*White pixels from 0,1 to 1,(8*L+2,)
      Characters placed from font.png starting at 2,2 with an 8 pixel offset.
      Black pixels from 2,(8*L+2) to (8*W+1),(8*L+2)
      Black pixels from (8*W+2),2 to (8*W+2),(8*L+1)
      White pixels from 1,(8*L+4) to (8*W+2),(8*L+5)
      While pixels from (8*W+4),1 to (8*W+5),(8*L+2,)*/
    ctx.fillStyle = this.styles.bgColor;
    ctx.fillRect(x+1.5, y+1.5, W+2.5, L+1.5);

      // Top side:
    ctx.strokeStyle = this.styles.borderColor;
    ctx.beginPath();
    ctx.moveTo(x+1, y + 0.5);
    ctx.lineTo(x + W + 4, y + 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x+1, y+1.5);
    ctx.lineTo(x + W + 4, y+1.5);
    ctx.stroke();

      // Left side:
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y+1);
    ctx.lineTo(x +0.5, y+L + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x+1.5, y+1);
    ctx.lineTo(x+1.5, y+L + 2);
    ctx.stroke();

      // Bottom side:
    ctx.beginPath();
    ctx.moveTo(x+1, y+ L + 1.5);
    ctx.lineTo(x+ W +4, y+ L + 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x+1, y+ L + 2.5);
    ctx.lineTo(x+ W +4, y+ L + 2.5);
    ctx.stroke();

      // Right side:
    ctx.beginPath();
    ctx.moveTo(x+ W + 3.5, y+ 1);
    ctx.lineTo(x+ W + 3.5, y + L+2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x+ W + 4.5, y+ 1);
    ctx.lineTo(x+ W + 4.5, y + L+2);
    ctx.stroke();

    
    if (textLines && textLines.length > 0) {
      ctx.font = this.styles.font;
      ctx.fillStyle = this.styles.fontColor;
      // draw each line:
      for (var i = 0; i < textLines.length; i++) {
        var plotX = x + 2; // + this.styles.leftMargin;
        var plotY = y + this.styles.lineHeight*i + 2; //+ this.styles.topMargin + this.styles.lineHeight*i;
        this.customRenderText(ctx, textLines[i], plotX, plotY);
      }
    }
  },

  customRenderText: function(ctx, text, x, y) {
    if (!this._fontImg) {
      ctx.fillText(text, x, y);
      return;
    }
    // using jake's font
    // they're 8 by 8
    var textSize = 8;
    for (var i = 0; i < text.length; i++) {
      var asciiCode = text.charCodeAt(i); 
      var slice;
      if (asciiCode >= 97 && asciiCode <= 122) {
        // lower case letters -- map to gibberish
          slice = asciiCode - 40; // was 87;
      }
      else if (asciiCode >= 65 && asciiCode <= 90) {
        // capital letters
        slice = asciiCode - 55;
      }
      else if (asciiCode >= 48 && asciiCode <= 57) {
        // numerals
        slice = asciiCode - 48;
      }
      else {
        var punctuation = ".,!?:&/'\"~ ";           // starts at pos 36
        var index = punctuation.indexOf(text[i]);
        if (index > -1) {
          slice = 36 + index;
        } else {
          continue;
        }
      } 
      ctx.drawImage(this._fontImg,
                    textSize*slice, 0,
                    textSize, textSize,
                    x + textSize*i, y,
                    textSize, textSize);
    }
    
  },

  splitLines: function(text) {
    // split text up into lines:
    var words = text.split(" ");
    var lines = [];
    var currLine = words.shift();
    var maxLineLength = this.styles.maxLineLength;
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
    leftMargin: 5,
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
    borderColor: "white",
    scrollBoxLines: 2
  }
};


function CanvasMixin(subclassPrototype) {
  subclassPrototype.display = subclassPrototype.parentDisplay = function(ctx) {
    if (!ctx) {
      return;
    }
    var styles = CanvasTextUtils.getStyles();
    // calc width and height based on text size of
    // contents

    this.width = styles.leftMargin + styles.rightMargin;
    var textLines = this.getTextLines();
    var longestCommand = 0;
    $.each(textLines, function(i, line) {
      if (line.length > longestCommand) {
        longestCommand = line.length;
      }
    });
    // TODO use that method that calcs text size:
    this.width = styles.leftMargin + styles.rightMargin + styles.fontSize * longestCommand;
    this.height = this.cmdList.length * styles.lineHeight + styles.topMargin + styles.bottomMargin;
    
    var x = this.x;
    var y = this.y;

    if (this.title) {
        //var titleHeight = styles.topMargin + styles.lineHeight + styles.bottomMargin;
      var titleHeight = styles.lineHeight + 3; // TODO this is moonserpent-specific!!
      CanvasTextUtils.drawTextBox(ctx, x, y, this.width, titleHeight,
                                 [this.title]);
      y += titleHeight;
    }
    
    CanvasTextUtils.drawTextBox(ctx, x, y,
                                this.width, this.height, textLines);
  };

  subclassPrototype.refresh = function() {
    // No need to do anything here, as it is redrawn on every cycle anyway
  };

  subclassPrototype.close = function() {
    // TODO anything to do here? Just stop drawing it right?
  };

  subclassPrototype.setPos = function(x, y) {
    this.x = x;
    this.y = y;
  };

  subclassPrototype.getPos = function() {
    return {x: this.x, y: this.y};
  };
}



function CanvasCmdMenu(cursorImg, menuSystem) {
  this._init();
  this.menuSystem = menuSystem;
  this.x = 0; 
  this.y = 0;
  this.width = 50;
  this.height = 150;
  this._cursorImg = cursorImg;
}
CanvasMixin(CanvasCmdMenu.prototype);
CmdMenuMixin(CanvasCmdMenu.prototype);
CanvasCmdMenu.prototype.getTextLines = function() {
  var textLines = [];
  // prepend space before each line of text, to give room for cursor
  for (var i =0; i < this.cmdList.length; i++) {
    textLines.push( " " + this.cmdList[i].name);
  }
  return textLines;
};
CanvasCmdMenu.prototype.display = function(ctx) {
  this.parentDisplay(ctx);
    // If cursorImg is defined, draw that; otherwise,
    // draw the triangular indicator:
    var yBase = this.y + styles.lineHeight * this.selectedIndex;
    if (this._cursorImg) {
      ctx.drawImage(this._cursorImg, this.x + 2, yBase + 2);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + 4, yBase + 5);
      ctx.lineTo(x + 8, yBase + 9);
      ctx.lineTo(x + 4, yBase + 13);
      ctx.lineTo(x + 4, yBase + 5);;
      ctx.fill();
    }
};
CanvasCmdMenu.prototype.showArrowAtIndex = function(index) {
  // TODO  -- if display is getting called on
  // the animation loop, do I even need this?
};


/* Canvas menus TODO: 
   (check) * - the showMsg must be drawn in this way too -- preferrably somewhere NOT overlapping default menu position the way it does now!

   (check) * - share the margins, corner radius, line height, etc etc
       with the cmd menus. Make some sort of style object owned by
       the MenuSystem

   (check) * - dialoglog must be drawn in this way.
   (check) * - dialoglog must be explicitly overlaid over map screen using an afterRender callback.
   (check) * - Provide userland with an API for specifying font, font size, line height, margins, border radius, colors, border thickness, and positioning of menus.
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


 * - don't let canvas menus go off the edge of the canvas -- if bottom is below bottom edge, bump it up. if right is past right edge, bump it left.
 (done) * - during input of character combat actions, pop or hide some of the already-chosen submenus -- they don't need to take up space on the screen.
 * - bug: if i have multiple items with the same name, only one seems to show up on the item menu in combat!  (a useful, if accidental, space-saving feature?)


 (check)  * - Show titles on canvas menus! (currently not shown)

 (check) * - Jake's battle system wants main menu for each character to appear
    - in same place, submenus to appear relative to it. So we can't
    - just have one xoffset/yoffset that's always applied. Easy enough
    - to hard code this in but think about how to do it more flexibly.
    - maybe one of the options to setMenuPositions could be
    - menus-per-character: reset or relative
*/

function CanvasScrollingTextBox(text, menuSystem) {
  this.lines = CanvasTextUtils.splitLines(text);
  // currently hard-coded to show 2 lines at a time
  this.currLine = 0;
  this.menuSystem = menuSystem;
  var styles = CanvasTextUtils.getStyles();
  this.linesAtOnce = styles.scrollBoxLines;
  this.width = styles.leftMargin + styles.rightMargin 
    + styles.maxLineLength * styles.fontSize;

  this.height = styles.topMargin + styles.bottomMargin
    + this.linesAtOnce * styles.lineHeight;
  this._closeCallbacks = [];
}
// Satisfies same interface as a CmdMenu, so it can go on
  // the menu stack.
ScrollingTextBoxMixin(CanvasScrollingTextBox.prototype);
CanvasMixin(CanvasScrollingTextBox.prototype);
CanvasScrollingTextBox.prototype.display = function(ctx) {
    if (!ctx) { return; }
    var lines = this.lines.slice(this.currLine,
                                 this.currLine + this.linesAtOnce);
    CanvasTextUtils.drawTextBox(ctx, this.x, this.y, 
                                this.width, this.height, lines);
};


function CanvasFixedTextBox(textLines, menuSystem) {
  // tries to open window big enough to show all lines of text
  // at once.
  this.menuSystem = menuSystem;
  var styles = CanvasTextUtils.getStyles();
  // TODO this duplicates code from CanvasCmdMenu
  var longestLine = 0;
  for (var i =0; i < textLines.length; i++) {
      if (textLines[i].length > longestLine) {
        longestLine = textLines[i].length;
      }
    }
  this.width = styles.leftMargin + styles.rightMargin 
    + longestLine * styles.fontSize;
  this.height = styles.topMargin + styles.bottomMargin
    + textLines.length * styles.lineHeight;
  this.textLines = textLines;
}
CanvasFixedTextBox.prototype = {
  // Satisfies same interface as a CmdMenu, so it can go on
  // the menu stack.
  onKey: function(key) {
    // do nothing
  },
  setPos: function(x, y) {
    this.x = x;
    this.y = y;
  },
  getPos: function() {
    return {x: this.x, y: this.y};
  },
  display: function(ctx) {
    if (!ctx) { return; }
    // TODO only works in Canvas world - make it work in CSS world
    CanvasTextUtils.drawTextBox(ctx, this.x, this.y, 
                                this.width, this.height,
                                this.textLines);
  },
  close: function() {
    // not used
  },
  setText: function(newTextLines) {
    this.textLines = newTextLines;
  },
  outsideWidth: function() {
    // TODO this is specific to the moonserepent implementation of
    // drawTextBox, which adds 4 columns of white pixels and 1 column of black pixels.
    return this.width + 5;
  }
};


// TODO: CanvasFixedImgBox

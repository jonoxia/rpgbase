

function CssMixin(subclassPrototype) {
  subclassPrototype.refresh = function() {
    this.parentTag.html(this._generateHtml());
  };
  
  subclassPrototype.display = subclassPrototype.parentDisplay = function() {
    if (this.parentTag) {
      this.parentTag.remove(); // so we won't get doubles if this is called again
    }
    this.parentTag = $("<div></div>");
    this.parentTag.css("left", this.screenX);
    this.parentTag.css("top", this.screenY);
    this.parentTag.css("font-size", this.menuSystem.getFontSize() + "pt");
    this.container.append(this.parentTag);
    this.refresh();
  };
  
  subclassPrototype.close = function() {
    if (this.parentTag) { // so this won't do anything if it's already closed
      this.parentTag.remove();
    }
  };

  subclassPrototype.setPos = function(x, y) {
    // x and y are given in logical coordinates; this does the scaling.
    this.logicalX = x;
    this.logicalY = y;
    this.screenX = Math.floor( x * this.menuSystem._calculatedScale );
    this.screenY = Math.floor( y * this.menuSystem._calculatedScale );
    if (this.parentTag) {
      this.parentTag.css("left", this.screenX);
      this.parentTag.css("top", this.screenY);
    }
  };

  subclassPrototype.setOuterDimensions = function(width, height) {
    // width and height are given in logical coordinates; this does the scaling.
    var scaleFactor = this.menuSystem._calculatedScale;
    var positioning = this.menuSystem._positioning;
    var padding = Math.ceil(positioning.cssPadding * scaleFactor);
    var borders = Math.ceil(positioning.cssBorderWidth * scaleFactor);
    this.parentTag.css("padding", padding + "px");
    this.parentTag.css("border-width", borders + "px");
    var dim = {x: width * scaleFactor,
               y: height * scaleFactor};
    // inset the width to make room for padding and borders
    dim.x -= (2*padding + 2*borders);
    dim.y -= (2*padding + 2*borders);
    this.parentTag.css("width", dim.x + "px");
    this.parentTag.css("height", dim.y + "px");
  };

  subclassPrototype.getPos = function() {
    // do we want the screen position at current scale, or the logical position
    // (out of 1024)?
    return {x: this.logicalX, y: this.logicalY};
  };

}


function CssCmdMenu(container, menuSystem) {
  this._init();
  this.container = container;
  this.menuSystem = menuSystem;
  this.cursorHtml = "<blink>&#x25B6;</blink>";
}
CssCmdMenu.prototype = {

  _generateHtml: function() {
    // TODO this works in a subtly different way from the other CssMixin
    // subclasses' generateHtml -- those return an HTML string, this one has
    // side effects of creating tags. Should make them all work the same way.
    this.parentTag.empty();
    if (this.title) {
      var titleSpan = $("<span></span>");
      titleSpan.addClass("menu");
      titleSpan.html(this.title);
      this.parentTag.append(titleSpan);
    }
    this.table = $("<table></table>");
    this.parentTag.append(this.table);
    
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
      this.table.append(row);
    }
    this.showArrowAtIndex(0);

    // TODO setting the font size here seems redundant with setting it in
    // CssMixin display function, but if I don't do it here it doesn't work.
    // for some reason.
    // Scale the body font:
    var fontSize = this.menuSystem.getFontSize();
    this.table.find("td").css("font-size", fontSize + "pt");
    // Scale the title font:
    this.parentTag.find("span").css("font-size", fontSize + "pt");
    // Scale the line height so that line heights don't change as you move
    // the cursor:
    this.table.find("td").css("line-height", Math.floor(1.1*fontSize) + "pt");

    // Give it the "menu" class (this brings it in front of other boxes)
    this.parentTag.addClass("menu");
    this.parentTag.focus();
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
  }
};
CmdMenuMixin(CssCmdMenu.prototype);
CssMixin(CssCmdMenu.prototype);



function CssScrollingTextBox(text, menuSystem) {
  // TODO rewrite this constructor -- how do we decide where to split lines?
  this.lines = CanvasTextUtils.splitLines(text);
  this.currLine = 0;
  this.menuSystem = menuSystem;
  this.container = menuSystem._htmlElem;
  this.linesAtOnce = 3; // TODO don't hardcode me
  this._closeCallbacks = []; // TODO isn't this in the base class?
};
ScrollingTextBoxMixin(CssScrollingTextBox.prototype);
CssMixin(CssScrollingTextBox.prototype);
// TODO add unit test for this
// had a parentTag.addClass("msg-display"), put that somewhere
CssScrollingTextBox.prototype._generateHtml = function() {
  // this was called "update"
  this.textLines = this.lines.slice(this.currLine,
                                    this.currLine + this.linesAtOnce).join("<br>");
  return this.textLines;
};



function CssFixedTextBox(textLines, menuSystem) {
  //this._init();
  this.menuSystem = menuSystem;
  this.container = menuSystem._htmlElem; //container;
  //this.cursorHtml = "<blink>&#x25B6;</blink>";
  this.textLines = textLines;
}
CssMixin(CssFixedTextBox.prototype);
CssFixedTextBox.prototype.onKey = function(key) {
  // do nothing
};
CssFixedTextBox.prototype.setText = function(newTextLines) {
  this.textLines = newTextLines;
  if (this.parentTag) {
    this.parentTag.html(this.textLines.join("<br>"));
  }
};
CssFixedTextBox.prototype._generateHtml = function() {
  // override this to make a fixed text box that displays something else
  return this.textLines.join("<br>");
};
CssFixedTextBox.prototype.outsideWidth = function() {
  return this.parentTag.outerWidth(); // TODO is this ever used?
};

function CssFixedImgBox(img, menuSystem) {
  this.container = menuSystem._htmlElem;
  this.menuSystem = menuSystem;
  this.imgUrl = img;
}
CssMixin(CssFixedImgBox.prototype);
CssFixedImgBox.prototype.onKey = function(key) {
  // do nothing
};
CssFixedImgBox.prototype.setImg = function(newImg, width, height) {
  this.imgUrl = newImg; // takes URL of image, not Image object... for now.
  this.imgTag.attr("src", newImg);
  this.imgTag.attr("width", width);
  this.imgTag.attr("height", height);
};
CssFixedImgBox.prototype._generateHtml = function() {
  this.imgTag = $("<img/>");
  this.imgTag.attr("src", this.imgUrl);
  this.parentTag.append(this.imgTag);
};
// TODO addClass("menu") and / or addClass("stats") ?
CssFixedImgBox.prototype.outsideWidth = function() {
    // TODO implement me
};


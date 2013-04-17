function Map(dimX, dimY, data, spritesheet) {
  // mapData must be array of dimensions equal to dimX and dimY.
  this._mapData = data;
  this._dimX = dimX;
  this._dimY = dimY;

  this._img = spritesheet;

  this._stepHandlers = [];
}
Map.prototype = {
  getTileForCode: function(mapCode) {
    return {x:mapCode, y:0};
  },

  onStep: function(trigger, result) {
    // Trigger can be:
    // {x:x, y:y}
    // {landType}
    this._stepHandlers.push({
      trigger: trigger,
      result: result});
  },

  processStep: function(x, y, player) {
    for (var i = 0; i < this._stepHandlers.length; i++) {

      var trigger = this._stepHandlers[i].trigger;
      var result = this._stepHandlers[i].result;

      var triggered = false;
      if (trigger.x == x &&
          trigger.y == y) {
        triggered = true;
      }

      if (trigger.landType == this._mapData[y][x]) {
        triggered = true;
      }

      if (trigger.chance > 0) {
        if (Math.random() <= trigger.chance) {
          triggered = true;
        }
      }
      
      if (triggered) {
        result(player, x, y);
      }
    }
  }
}

function MapScreen(htmlElem, numTilesX, numTilesY, tilePixelsX,
                  tilePixelsY){
  this._currentDomain = null;
  this._scrollX = 0;
  this._scrollY = 0;
  this._htmlElem = htmlElem;  // must be canvas
  this._ctx = this._htmlElem.getContext("2d");

  this.numTilesX = numTilesX;
  this.numTilesY = numTilesY;
  this.tilePixelsX = tilePixelsX;
  this.tilePixelsY = tilePixelsY;

  this.margins = {left: 3, top: 3, right: 3, bottom: 3};
  this.pixelOffset = {x: 0, y: 0};
  // TODO set width and height of canvas element to
  // numTilesX * tilePixelsX, etc.

  this.scrollAnimFrames = 0;
  this.scrollAnimTime = 0;
}
MapScreen.prototype = {
  setScrollMargins: function( newMargins ) {
    this.margins = newMargins;
  },
  
  setTileOffset: function( newOffset ) {
	this.pixelOffset = {x: newOffset.x * this.tilePixelsX,
			    y: newOffset.y * this.tilePixelsY};
  },

  setPlayer: function(player) {
    this.player = player;
  },

  setNewDomain: function( domain ) {
    this._currentDomain = domain;
    this._scrollX = 0;
    this._scrollY = 0;
  },

  getLandType: function( x, y ) {
    // x, y are world-coordinates, not screen-coordinates.
    return this._currentDomain._mapData[y][x];
  },
  _getTileElementAt: function( x, y ) {
    //convert to screen coordinates:
    x = x - this._scrollX;
    y = y - this._scrollY;
    var id = "tile_" + x + "_" + y;
    return document.getElementById(id);
  },
  transform: function( worldX, worldY ) {
    // transforms world coords to screen coords:
    var screenX = this.tilePixelsX * (worldX - this._scrollX);
    var screenY = this.tilePixelsY * (worldY - this._scrollY);
    return [screenX + this.pixelOffset.x,
	    screenY + this.pixelOffset.y];
  },
  isOnScreen: function( worldX, worldY ) {
    var screenX = worldX - this._scrollX;
    var screenY = worldY - this._scrollY;
    return (screenX > -1 && screenX < this.numTilesX &&
            screenY > -1 && screenY < this.numTilesY);
  },

  calcAutoScroll: function(x, y, delX, delY) {
    var screenX = (x + delX) - this._scrollX;
    var screenY = (y + delY) - this._scrollY;
    
    var topEdge = this.margins.top;
    var leftEdge = this.margins.left;
    var rightEdge = this.numTilesX - this.margins.right - 1;
    var bottomEdge = this.numTilesY - this.margins.bottom - 1;

    var scrollX = this._scrollX;
    var scrollY = this._scrollY;
    if (delX < 0 && screenX < leftEdge) {
      scrollX += (screenX - leftEdge);
    }
    if (delX > 0 && screenX > rightEdge) {
      scrollX += (screenX - rightEdge);
    }
    if (delY < 0 && screenY < topEdge) {
      scrollY += (screenY - topEdge);
    } 
    if (delY > 0 && screenY > bottomEdge) {
      scrollY += (screenY - bottomEdge);
    }

    // Stop at edges of map:
    if (scrollX < 0)
      scrollX = 0;
    if ( scrollX + this.numTilesX > this._currentDomain._dimX)
      scrollX = this._currentDomain._dimX - this.numTilesX;
    if (scrollY < 0)
      scrollY = 0;
    if (scrollY + this.numTilesY > this._currentDomain._dimY)
      scrollY = this._currentDomain._dimY - this.numTilesY;

    return {x: scrollX - this._scrollX,
            y: scrollY - this._scrollY};
  },

  render: function(pixelAdjustment) {
    // pixel adjustment is optional but if present it should have
    // a .x and .y
    for (var y = 0; y < this.numTilesY; y++) {
      for (var x = 0; x < this.numTilesX; x++) {
        var code = this.getLandType( x + this._scrollX,
                                     y + this._scrollY);
        var img = this._currentDomain._img;
        
        var tile = this._currentDomain.getTileForCode(code);
        var spriteOffsetX = tile.x * this.tilePixelsX;
        var spriteOffsetY = tile.y * this.tilePixelsY;

        var drawX = x * (this.tilePixelsX ) + this.pixelOffset.x;
        var drawY = y * (this.tilePixelsY ) + this.pixelOffset.y;
        if (pixelAdjustment) {
          drawX += pixelAdjustment.x;
          drawY += pixelAdjustment.y;
        }

        this._ctx.drawImage(img,
               spriteOffsetX,   // left of slice
               spriteOffsetY,  // top of slice
	       (this.tilePixelsX),  // width of slice
	       (this.tilePixelsY), // height of slice
               drawX,
               drawY,
               this.tilePixelsX,
               this.tilePixelsY);
      }
    }

    var party = this.player.getParty().slice();
    party.sort(function(a, b) {
      return (a._y - b._y);
    });
    for (var i = 0; i < party.length; i++) {
      party[i].plot(this);
    }
  },

  getScrollAnimator: function(delta, numFrames) {
    var self = this;
    var xFactor = delta.x / numFrames;
    var yFactor = delta.y / numFrames;
    
    var animator = function(frame) {
      var adj = {x:(-1) * (frame * xFactor* self.tilePixelsX),
                 y:(-1) * (frame * yFactor * self.tilePixelsY)
                };
      self.render(adj);
    };
    return animator;
  },

  scroll: function( deltaX, deltaY ) {
    var scrollX = this._scrollX + deltaX;
    var scrollY = this._scrollY + deltaY;
    if (scrollX < 0)
      scrollX = 0;
    if ( scrollX + this.numTilesX > this._currentDomain._dimX)
      scrollX = this._currentDomain._dimX - this.numTilesX;
    if (scrollY < 0)
      scrollY = 0;
    if (scrollY + this.numTilesY > this._currentDomain._dimY)
      scrollY = this._currentDomain._dimY - this.numTilesY;

    this._scrollX = scrollX;
    this._scrollY = scrollY;
  },

  pointInBounds: function( x, y ) {
    if ( x >= this._currentDomain._dimX || x < 0 )
      return false;
    if ( y >= this._currentDomain._dimY || y < 0 )
      return false;
    return true;
  },

  scrollToShow: function( x, y ) {
    var screenX = x - this._scrollX;
    var screenY = y - this._scrollY;
    this.scroll( x-4, y-4 );
  },

  processStep: function( player, x, y ) {
    this._currentDomain.processStep(x, y, player);
  },

  hide: function() {
    $(this._htmlElem).hide();
  },

  show: function() {
    $(this._htmlElem).show();
    this.render();
  }
};
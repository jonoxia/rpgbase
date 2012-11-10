function Domain() {
    this._record = new ServerBackedRecord( "domain" );
}
Domain.prototype = {
  init: function( dimX, dimY, name, data, canStartHere, startX, startY) {
    // mapData must be array of dimensions equal to dimX and dimY.
    this._mapData = data;
    this._record.setData( { width: dimX, 
                            height: dimY,
			    domain_name: name,
			    new_character_can_start_here: canStartHere,
			    start_position_x: startX,
			    start_position_y: startY,
			    data_grid: this.serializeToString() });
  },

  serializeToString: function() {
    var string = "";
    var x;
    var y;
    for ( y = 0; y < this._record.getField("height"); y++ ) {
      for (x = 0; x < this._record.getField("width"); x++ ) {
	string += this._mapData[y][x] + "|";
      }
    }
    return string;
  },
  loadFromString: function( string ) {
    var x;
    var y;
    this._mapData = [];
    var array = string.split("|");
    var arrayIndex = 0;
    for ( y = 0; y < this._record.getField("height"); y++ ) {
      this._mapData.push([]);
      for (x = 0; x < this._record.getField("width"); x++ ) {
	this._mapData[y][x] = array[arrayIndex];
	arrayIndex++;
      }
    }
  },

  saveChangesToServer: function( callback ) {
    this._record.setField("data_grid", this.serializeToString() );
    this._record.saveChangesToServer( callback );
  },

  saveNewToServer: function( callback ) {
    this._record.setField("data_grid", this.serializeToString() );
    this._record.saveNewToServer( callback );
  },

  downloadFromServer: function( id, onFinishLoading ) {
    var self = this;
    self._record._id = id;
    this._record.downloadFromServer(id, function() {
      self.loadFromString(self._record._tagText);
      if (onFinishLoading) {
	onFinishLoading();
      }
    });
  }
};

function MapManager(){
  this._currentDomain = null;
  this._scrollX = 0;
  this._scrollY = 0;
}
MapManager.prototype = {
  downloadDomain: function( id, onFinishLoading ) {
    this._scrollX = 0;
    this._scrollY = 0;
    this._currentDomain = new Domain();
    var self = this;
    this._currentDomain.downloadFromServer( id, function() {
        $("#world-table").html( self.createHtml() );
        if (onFinishLoading)
             onFinishLoading();
	});
  },

  setNewDomain: function( dimX, dimY, name, data, canStartHere, startX, startY ) {
    this._currentDomain = new Domain();
    this._currentDomain.init( dimX, dimY, name, data, canStartHere, startX, startY);
    this._scrollX = 0;
    this._scrollY = 0;
    // TODO is it bad encapsulation-breaking to grab an html object
    // from here?  it's definitely called world-table on every page
    // that uses it though...
    $("#world-table").html( this.createHtml() );
  },

  getDomainAttr: function( attrName ) {
    if (!this._currentDomain) {
        return null;
    }
    if (attrName == "id") {
	return this._currentDomain._record._id;
    }
    return this._currentDomain._record.getField(attrName);
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
    var screenX = 64 * (worldX - this._scrollX) + 9;
    var screenY = 64 * (worldY - this._scrollY) + 56;
    /* TODO there doesn't appear to be any easy way of getting the actual
       x, y of the table to adjust this offset...  the above hard-coded
       magic numbers are very brittle and will break if the layout of the
       page changes at all. */
    return [screenX, screenY];
  },
  isOnScreen: function( worldX, worldY ) {
    var screenX = worldX - this._scrollX;
    var screenY = worldY - this._scrollY;
    return (screenX > -1 && screenX <10 && screenY > -1 && screenY < 10);
  },
  autoScrollToPlayer: function( x, y ) {
    // plotAt, but also scrolls screen if this is too close to the edge and it's
    // possible to scroll.
    var screenX = x - this._scrollX;
    var screenY = y - this._scrollY;
    var scrollVal = 0;
    if (screenX < 3) {
      this.scroll( (screenX - 3), 0 );
    } else if (screenX > 7) {
      this.scroll( (screenX - 7), 0 );
    }
    if (screenY < 3) {
      this.scroll( 0, (screenY - 3) );
    } else if (screenY > 7) {
      this.scroll( 0, (screenY - 7 ) );
    }
  },

  // plotAt and resetImage work by REPLACING the image at a certain square
  // in the worldMap table.  This method is DEPRECATED, in favor of the
  // transparent div overlay method used by Player and OtherPeoplesCharacters.
  plotAt: function( x, y, icon ) {
    // x, y are world-coordinates, not screen-coordinates.
    var tile = this._getTileElementAt(x,y);
    if (tile)  // can be none, if (x,y) is off the screen
      tile.src = "/icons/" + icon;
  },

  resetImage: function( x, y ) {
    // x, y are world-coordinates, not screen-coordinates.
    var code = this.getLandType( x, y );
    var tile = this._getTileElementAt(x,y);
    if (tile)
      tile.src = "/icons/" + code;
  },
  createHtml: function(){
    var table = "<table cellpadding=\"0\" border=\"0\" cellspacing=\"0\">";
    for ( var y =0; y<10; y++ ) {
      table += "<tr>";
      for (var x=0; x<10; x++ ) {
	table += "<td width=\"64px\" height=\"64px\">";
	var code = this.getLandType( x, y );
	table += "<img id=\"tile_" + x + "_" + y + "\" src=\"/icons/";
        table += code + "\" width=\"64\" height=\"64\"/>";
	table += "</td>";
      }
      table += "</tr>";
    }
    table += "</table>";
    return table;
  },
  scroll: function( deltaX, deltaY ) {
    var scrollX = this._scrollX + deltaX;
    var scrollY = this._scrollY + deltaY;
    if (scrollX < 0)
      scrollX = 0;
    if ( scrollX + 10 > this._currentDomain._dimX)
      scrollX = this._currentDomain._dimX - 10;
    if (scrollY < 0)
      scrollY = 0;
    if (scrollY + 10 > this._currentDomain._dimY)
      scrollY = this._currentDomain._dimY - 10;

    this._scrollX = scrollX;
    this._scrollY = scrollY;

    this._refreshScreen();
  },
  _refreshScreen: function() {
    var scrollX = this._scrollX;
    var scrollY = this._scrollY;
    for (var y = scrollY; y<scrollY + 10; y++) {
      for (var x= scrollX; x<scrollX + 10; x++) {
	this.resetImage( x, y );
      }
    }
    // note: after calling this, re-plot the player and all encounters.
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

  // Following should be used only by GM / map-editor mode, not play mode.

  setTile: function( x, y, toolTile) {
    // x and y are screen coordinates in this case
    // TODO do the document stuff in world-editor.js instead?
    var id = "tile_" + x + "_" + y;
    var tile = document.getElementById(id);
    tile.src = "/icons/" + toolTile;
   // convert to world coodrinates:
    x = x + this._scrollX;
    y = y + this._scrollY;
    this._currentDomain._mapData[y][x] = toolTile;
  },

  saveDomain: function(callback) {
    this._currentDomain.saveChangesToServer(callback);
  },

  saveDomainAs: function(callback) {
    this._currentDomain.saveNewToServer(callback);
  }

}

// Global singleton instance:

var WorldMapManager = new MapManager();
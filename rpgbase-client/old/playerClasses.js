// Depends on having defined:
// EncounterManager, WorldMapManager


function Item(icon, name) {
  this._init( icon, name );
}
Item.prototype = {
  _init: function( icon, name) {
    this._icon = icon;
    this._name = name;
  },
  renderHtml: function() {
    var itemHtml = "<img src=\"/icons/" + this._icon + "\"/>" + this._name +
      "<button onclick=\"responseBtn('item:" + this._name + "');\">Use</button>";
    return itemHtml;
  },
  crossesLand: function( landType ) {
    return false;
  }
};

// TODO finish implementing Vehicle class!!
function Vehicle( x, y, icon, name ) {
  this._init( icon, name );
}
Vehicle.prototype = {
  _init: function( icon, name ) {
    this._icon = icon;
    this._name = name;
    this._x = x;
    this._y = y;
  },
  crossesLand: function( landType ) {

  },
  embark: function( player ) {
    // make it so that vehicle moves with player and represents player
    // How to do this?  Perhaps set up a callback?
    var vehicleMovement = function(deltaX, deltaY, player) {

    };
    //player.setMovementCallback(vehicleMovement);
  },
  disembark: function( player ) {
    // stop the embarkation; remember the location of vehicle.
    //player.unsetMovementCallback(vehicleMovement);
  },
  plot: function() {
    //WorldMapManager.plotWithAutoScroll( this._x, this._y, this._icon );
  },
  erase: function() {
    //WorldMapManager.resetImage( this._x, this._y );
  }
};

function SomeoneElsesCharacter(id, x, y, icon) {
  this._init(id, x, y, icon);
}
SomeoneElsesCharacter.prototype = {
  _init: function(id, x, y, icon) {
    this._id = id;
    this._x = x;
    this._y = y;
    this._icon = icon;
  },
  makeOverlayDiv: function() {
    if (WorldMapManager.isOnScreen(this._x, this._y)) {
      var screenCoords = WorldMapManager.transform(this._x, this._y);
      return "<div style=\"position: absolute; left: " + screenCoords[0] + "px;"
        + "top: " + screenCoords[1] + "px; height: 64px; width:64px; padding: 0em; z-index: 2;\">"
        + "<img src=\"/icons/" + this._icon + "\"/></div>";
    } else {
      return "";
    }
  }
};

function OtherCharactersList(domainId, myCharaId) {
  this._init( domainId, myCharaId );
}
OtherCharactersList.prototype = {
  _init: function( domainId, myCharaId ) {
    this._theList = [];
    this._domainId = domainId;
    this._exclude = myCharaId;
    this._getListFromServer();
  },

  _getListFromServer: function() {
    var self = this;
    self._theList = [];
    jQuery.get("/list/other-charas", {domain_id: self._domainId},
      function(xml, textStatus) {
	$(xml).find('chara').each(function() {
	  var id = $(this).attr('id');
          if (id != self._exclude) {
            var x = parseInt( $(this).attr('x') );
	    var y = parseInt( $(this).attr('y') );
	    var icon = $(this).attr('icon_id');
            var chara = new SomeoneElsesCharacter(id, x, y, icon);
            self._theList.push(chara);
	  }
	});
	self.plotAll();
      }, "xml" );
  },

  checkForUpdates: function() {
    this._getListFromServer();
  },

  plotAll: function() {
    var html = "";
    for each ( var chara in this._theList ) {
      html += chara.makeOverlayDiv();
    }
    $("#other-characters-layer").html(html);
  },

  changeDomain: function( newDomainId ) {
    this._domainId = newDomainId;
    this._getListFromServer();
  }
}


function Player(id, x, y, icon, domain) {
  this._init(id, x, y, icon, domain);
}
Player.prototype = {
  _init: function(id, x, y, icon, domain) {
    this._id = id;
    this._x = x;
    this._y = y;
    this._domainId = domain;
    this._realIcon = icon;
    this._icon = icon;
    this._stuckInEncounter = false;
    this._inventory = [];
  },
  // TODO possibly erase is no longer needed?
  erase: function() {
  },
  plot: function() {
    WorldMapManager.autoScrollToPlayer( this._x, this._y );
    var screenCoords = WorldMapManager.transform(this._x, this._y);
    var x = screenCoords[0];
    var y = screenCoords[1];
    $("#player-layer").css("left", x + "px");
    $("#player-layer").css("top", y + "px");
    $("#player-layer").html("<img src=\"/icons/" + this._icon + "\">");
  },

  getItem: function( item ) {
    this._inventory.push(item);
    $("#item-menu").html( this.makeItemMenu());
  },

  canCross: function( landType ) {
    // When we come up with items or skills that let you get past obstacles,
    // they will go in here.
    if ( landType == 3 || landType == 4 || landType == 42) {
      // can't cross mountains or oceans or brick walls.
      for each (var item in this._inventory) {
	// Unless I have an item that lets me do it.
	if (item.crossesLand( landType )) {
	  this._icon = item._icon;
	  return true;
	}
      }
      return false;
    }
    this._icon = this._realIcon;
    return true;
  },

  move: function( deltaX, deltaY ) {
    if (this._stuckInEncounter) {
      return false;
    }

    if (this._movementCallback) {
      var canMove = this._movementCallback(deltaX, deltaY);
    }
    var newX = this._x + deltaX;
    var newY = this._y + deltaY;
    if (!WorldMapManager.pointInBounds(newX, newY)) {
      return false;
    }
    var nextStepLandType = WorldMapManager.getLandType(newX, newY);
    if (!this.canCross(nextStepLandType)) {
      return false;
    }
    this.erase();
    var oldX = this._x;
    var oldY = this._y;
    this._x = newX;
    this._y = newY;
    this._updatePositionToServer();
    this.plot();
    gEncounterManager.checkForEncounters(this._x, this._y, this);
  },

  makeCommandMenu: function() {
    var cmdMenu =
      "<p><button onclick=\"responseBtn('friend');\">Make friends!</button></p>"
      + "<p><button onclick=\"responseBtn('sneak');\">Sneak past!</button></p>"
      + "<p><button onclick=\"responseBtn('fight');\">Fight!</button></p>"
      + "<p><button onclick=\"responseBtn('run');\">Run away!</button></p>";
    return cmdMenu;
  },

  makeItemMenu: function() {
    var itemMenu = "<ul>";
    for (var x in this._inventory) {
      var item = this._inventory[x];
      itemMenu += "<li>" + item.renderHtml() +"</li>";
    }
    itemMenu += "</ul>";
    return itemMenu;
  },

  enterEncounter: function() {
    this._stuckInEncounter = true;
  },

  exitEncounter: function() {
    this._stuckInEncounter = false;
  },

  setPos: function( x, y ) {
    this._x = x;
    this._y = y;
    this._updatePositionToServer();
  },

  setDomain: function( domainId ) {
    this._domainId = domainId;
  },

  _updatePositionToServer: function() {
    jQuery.post("/update/chara", {id: this._id,
				  x: this._x,
				  y: this._y,
				  domain_id: this._domainId});
  }

};

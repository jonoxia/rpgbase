// Depends on having defined:  WorldMapManager

const STANDARD_OK_BUTTON = "<p><button onclick=\"exitEncounter();\">OK</button></p>";

const YES_NO_BUTTONS = "<p><button onclick=\"responseBtn('yes');\">Yes</button>"
  + "<button onclick=\"exitEncounter();\">No</button>";

function EncounterManager() {
}
EncounterManager.prototype = {
  _active_encounter: null,
  _encounterList: [],
  registerEncounter: function( encounter ) {
    this._encounterList.push(encounter);
  },
  checkForEncounters: function( playerX, playerY, player ) {
    for (var x in this._encounterList) {
      var enc = this._encounterList[x];
      if (enc.isTriggered(playerX, playerY)){
	this._active_encounter = enc;
	player.enterEncounter();
	enc.trigger(player);
	return;
      }
    }
    this.resetActiveEncounter();
  },
  plotAllEncounters: function() {
    for (var x in this._encounterList) {
      this._encounterList[x].plot();
    }
  },
  getActiveEncounter: function() {
    return this._active_encounter;
  },
  resetActiveEncounter: function() {
    $("#encounter-screen").html( "" );
    this._active_encounter = null;
  },
  loadEncountersForDomain: function( domainId ) {
	// Reset the encounter list...
    this._encounterList = [];
    this._domainId = domainId;
    this._active_encounter = null;

    // Download doors from server.
    var self = this;
    var callback = function(xml, textStatus) {
      $(xml).find('door').each(function(){
	var doorServerId = $(this).attr('id');
	var twoWay = $(this).attr('two_way');
        var foo = $(this).find('foo');
	var bar = $(this).find('bar');
	var newDoor = new DoorEncounter($(foo).attr('x'),
					 $(foo).attr('y'),
					 $(foo).attr('domain_id'),
					 $(bar).attr('x'),
					 $(bar).attr('y'),
	                                 $(bar).attr('domain_id'),
                                         twoWay
				    );
        self._encounterList.push(newDoor);
	});
    };
    jQuery.get("/list/door", {domain_id: self._domainId}, callback, "xml");
  }
}

function BaseEncounter() {
}
BaseEncounter.prototype = {
  isTriggered: function( x, y ) {
    return false;
  },
  trigger: function(player) {
    // move to superclass
    $("#encounter-screen").html( this.makeText(player) );
  },
  plot: function() {
    return;
  },
  makeText: function(player) {
    // Must be overridden by instances.
    return "";
  },
  responseHandler: function(choice) {
    // Must be overridden by instances
    return;
  }
}


function PointEncounter(x, y, icon, domainId) {
  this._init(x, y, icon, domainId);
}
PointEncounter.prototype = {
  _init: function(x,y, icon, domainId) {
    this._x = x;
    this._y = y;
    this._icon = icon;
    this._domainId = domainId;
  },

  isTriggered: function(x,y) {
    // must be a less klugy way of binding encounters to a specific domain...
    if (!(WorldMapManager._domainId == this._domainId))
      return false;
    return ( ( x == this._x ) && ( y == this._y ));
  },

  plot: function() {
    if (!(WorldMapManager._currentDomain._name == this._domainName))
      return;
    WorldMapManager.plotAt( this._x, this._y, this._icon );
  }
}
PointEncounter.prototype.__proto__ = new BaseEncounter();

function RandomEncounter(landType, frequency, domainId) {
  this._init(landType, frequency, domainId);
}
RandomEncounter.prototype = {
  _init: function(landType, frequency, domainId) {
    this._landType = landType;
    this._frequency = frequency;
    this._domainId = domainId;
  },
  isTriggered: function(x,y) {
    if (!(WorldMapManager._domainId == this._domainId))
      return false;
    if ( WorldMapManager.getLandType(x, y) == this._landType ){
      if (Math.random() <= this._frequency){
	return true;
      }
    }
    return false;
  }
}
RandomEncounter.prototype.__proto__ = new BaseEncounter();

function DoorEncounter( x, y, domainId, toX, toY, toDomainId, twoWay) {
  this._x = x;
  this._y = y;
  this._domainId = domainId;
  this._toX = toX;
  this._toY = toY;
  this._toDomain = toDomainId;
  this._isTwoWay = twoWay;
}
DoorEncounter.prototype = {
    hereIsFloating: function() {
	return ( this._x == null || this._y == null || this._domainId == null);
    },

    thereIsFloating: function() {
	return ( this._toX == null || this._toY == null || this._toDomain == null );
    },

  isTriggered: function(x,y) {
	return ((x == this._x) && (y == this._y)) || (this._isTwoWay && (x == this._toX) && (y == this._toY));
  },

  trigger: function( player ) {
	// If two-way, need to know which direction we're going through it...
    var theDoor = this;
    WorldMapManager.downloadDomain( this._toDomain, function() {
      player.setDomain(theDoor._toDomain);
      player.setPos(theDoor._toX, theDoor._toY);
      gOtherCharactersList.changeDomain(theDoor._toDomain);
      gEncounterManager.loadEncountersForDomain(theDoor._toDomain);
      player.plot();
      player.exitEncounter();
    });
  }
}
DoorEncounter.prototype.__proto__ = new BaseEncounter();
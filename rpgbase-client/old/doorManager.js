function DoorEditor( domainId ) {
    this._doorList = [];
    this._selectedDoor = null;
    this._domainId = domainId;
    /* TODO make sure all functions are appropriately no-oppy when 
       this._domainId == null */
}
DoorEditor.prototype = {
    setDomainId: function( domainId ) {
	this._domainId = domainId;
	this.downloadDoorsFromServer();
	//this.updateTools();
	//this.drawAll();
    },

    newDoor: function() {
	var door = new DoorEncounter(null, null, this._domainId, null, null, null);
	door._isTwoWay = true; // encapsulation breaky...
	this._doorList.push(door);
	this._selectedDoor = door;
	this.updateTools();
    },

    selectDoorByNumber: function(number) {
	this._selectedDoor = this._doorList[number];
	$("#two-way-check").attr("checked", this._selectedDoor._isTwoWay);
	this.updateTools();
	this.drawAll();
    },

    deleteSelectedDoor: function() {
	if (this._selectedDoor) {
	    if (this._selectedDoor._serverId) {
		//If the server knows about the selected door, delete it on server too.
		jQuery.post("/delete/door", { id: this._selectedDoor._serverId },
			    function(xml, textStatus) { $("#debug").html($(xml).text()) }, "xml");
	    }
	    var i = this._doorList.indexOf( this._selectedDoor );
	    this._doorList.splice(i, 1);
	    if (this._doorList.length > 0) {
		this._selectedDoor = this._doorList[0];
	    } else {
		this._selectedDoor = null;
	    }
	    this.updateTools();
	    this.drawAll();
	}
    },

    detatchSelectedDoor: function() {
	if (!this._selectedDoor) {
	    return;
	}
	if (this._selectedDoor._domainId == this._domainId) {
	    this._selectedDoor._domainId = null;
	    this._selectedDoor._x = null;
	    this._selectedDoor._y = null;
	} else if (this._selectedDoor._toDomain == this._domainId) {
	    this._selectedDoor._toDomain = null;
	    this._selectedDoor._toX = null;
	    this._selectedDoor._toY = null;
	}
	this.updateTools();
	this.drawAll();
    },

    setSelectedDoorPosition: function(x, y) {
	if (!this._selectedDoor) {
	    return;
	}
	var door = this._selectedDoor;
	doorDomainId = this._selectedDoor._domainId;
	if (doorDomainId == this._domainId || doorDomainId == null) {
	    door._x = x;
	    door._y = y;
	    door._domainId = this._domainId;
	} else {
	    door._toX = x;
	    door._toY = y;
	    door._toDomain = this._domainId;
	}
	var self = this;
	if (door._serverId) {
	    // Update the door on the server!
	    jQuery.post("/update/door", {
		    id: door._serverId,
		    domain_foo_id: door._domainId,
		    foo_x: door._x,
		    foo_y: door._y,
		    domain_bar_id: door._toDomain,
		    bar_x: door._toX,
		    bar_y: door._toY }, null);
	} else if (!door.hereIsFloating() && !door.thereIsFloating()) {
	    // Server doesn't know about this door yet...
	    // Create it on the server, but only if both ends are set!
	    jQuery.post("/create/door", {
		    domain_foo_id: door._domainId,
		    foo_x: door._x,
		    foo_y: door._y,
		    domain_bar_id: door._toDomain,
		    bar_x: door._toX,
		    bar_y: door._toY,
		    two_way: door._isTwoWay},
		function(xml, textStatus) {
		    // Set serverId on door so that we'll know to update it
		    // next time instead of creating it again.
		    // For some reason the JQuery way of parsing the XML doesn't work here...
                    // door._serverId = $(xml).find('door').attr('id');
		    var item = xml.getElementsByTagName('door').item(0);
		    var id = item.getAttribute("id");
		    door._serverId = id;
		}, "xml");
	}
	self.updateTools();
	self.drawAll();
    },

    setTwoWayness: function() {
	if (!this._selectedDoor) {
	    return;
	}
	var door = this._selectedDoor;
	door._isTwoWay = $("#two-way-check").attr("checked");
	if (door._serverId) {
	    // Update the door on the server!
	    jQuery.post("/update/door", {id: door._serverId,
			two_way: door._isTwoWay}, null);
	}
	this.updateTools();
	this.drawAll();
    },

    downloadDoorsFromServer: function() {
	// currently /list/door just gets doors that start from the given domain ID...
	// We really want it to be doors that start *or end* in the given domain ID.
	// Which means a custom CRUD class on the server.
	var self = this;

	var callback = function(xml, textStatus) {
	    $(xml).find('door').each(function(){
		    var doorServerId = $(this).attr('id');
		    var twoWay = $(this).attr('two_way');
		    // First, let's check doorServerId against our current door list,
		    // and avoid inserting duplicates.
		    for each( var door in self._doorList) {
			    if ( door._serverId == doorServerId ) {
				return;
			    }
			}
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
		    newDoor._serverId = doorServerId;
		    // So a door that came from the server has a _serverId attribute on it
		    // that can be used to delete or update...
		    self._doorList.push(newDoor);
		});
	    self.updateTools();
	    self.drawAll();
	};
	jQuery.get("/list/door", {domain_id: self._domainId}, callback, "xml");
    },

    _describeDoor: function( door) {
	html = "Door from ";
	if (door.hereIsFloating())  {
	    html += "???";
	} else {
	    html += door._x + ", " + door._y;
	    if (door._domainId == this._domainId) {
		html += " here";
	    } else {
		html += " map id " + door._domainId;
	    }
	}
	html += " to ";
	if (door.thereIsFloating())  {
	    html += "???";
	} else {
	    html += door._toX + ", " + door._toY;
	    if (door._toDomain == this._domainId) {
		html += " here";
	    } else {
		html += " map id " + door._toDomain;
	    }
	}
	if (door._isTwoWay)
	    html += " (two-way)";
	else 
	    html += " (one-way)";
	if (door._serverId)
	    html += " (server-id: " + door._serverId + ")";
	else
	    html += " (no server id)";
	return html;
    },

    updateTools: function() {
	var floatingDoorHtml = "";
	var incomingDoorHtml = "";
	var outgoingDoorHtml = "";
	for (var i = 0; i < this._doorList.length; i++) {
	    var door = this._doorList[i];
	    html = "";
	    html += "<li onclick=\"g_door_editor.selectDoorByNumber(" + i + ");\">";
	    if (this._selectedDoor === door)
		html += "<strong>";
	    html += this._describeDoor( door);
	    if (this._selectedDoor === door)
		html += "</strong>";
	    html += "</li>";

	    if (door._toDomain == this._domainId) {
		incomingDoorHtml += html;
	    }
	    if (door._domainId == this._domainId) {
		outgoingDoorHtml += html;
	    }
	    if (door.hereIsFloating() || door.thereIsFloating()) {
		floatingDoorHtml += html;
	    }
	}
	$("#floating-doors-list").html( floatingDoorHtml );
	$("#outgoing-doors-list").html( outgoingDoorHtml );
	$("#incoming-doors-list").html( incomingDoorHtml );

	if (this._selectedDoor) {
	    html = this._describeDoor( this._selectedDoor );
	    $("#selected-door-info").html( html );
	} else {
	    $("#selected-door-info").html( "None" );
	}
    },

    drawAll: function() {
	var bigHtml = "";
	var renderDoor = function( x, y, id, icon, selected ) {
	    if (!WorldMapManager.isOnScreen(x, y))
		return "";
	    var screenCoords = WorldMapManager.transform(x, y);
	    x = screenCoords[0];
	    y = screenCoords[1];
	    var html = "<div style=\"position: absolute; left: " + x + "px;";
	    html += "top: " + y + "px; height: 64px; width:64px; padding: 0em; z-index: 2;";
	    if (selected)
		html += " border-style: solid;";
	    html +="\"><img src=\"/icons/" + icon + "\" onclick=\"g_door_editor.selectDoorByNumber(";
	    html += i + ");\"/></div>";
	    return html;
	}
	var iconId;
	for (var i = 0; i < this._doorList.length; i++) {
	    var door = this._doorList[i];
	    if (door._domainId == this._domainId) {
		if (!door.hereIsFloating() ) {
		    iconId = door._isTwoWay?153:151;
                    bigHtml += renderDoor(door._x, door._y, i, iconId, (door === this._selectedDoor) );
		}
	    }
	    if (door._toDomain == this._domainId) {
		if (!door.thereIsFloating()) {
		    iconId = door._isTwoWay?153:152;
                    bigHtml += renderDoor(door._toX, door._toY, i, iconId, (door === this._selectedDoor) );
		}
	    }
	}
	$("#overlay-area").html( bigHtml );
    }

};

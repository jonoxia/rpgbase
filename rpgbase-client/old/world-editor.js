const LAND_TILES = "land-tile-tools";;
const DOORS = "door-tools";
const TREASURES = "treasure-tools";
const SHOPS = "shop-tools";
const ENCOUNTERS = "encounter-tools";
const GEOLOGY = "geology-tools";
const STARTING = "game-starting-tools";

/* Global state variables for world editor.  Maybe roll these into an object.*/
var g_selected_tool = 0;
var g_tool_class = LAND_TILES;
var g_domain_menu_index = [];
var g_door_editor = new DoorEditor(null);

function getValueFromRadio( radioName ) {
  let elems = document.getElementsByTagName( "input" );
  for each ( let elem in elems ) {
    if (elem.name == radioName && elem.checked == true) {
      return elem.value;
    }
  }
  return 1.0;
}


/* TODO it would improve usability to be able to resize a domain (i.e. add or
 * subtract squares from the top, right, bottom, or left edges) after it is
 * created.
 *
 * Also, should be able to somehow specify default tileset (other than ocean) for
 * new domain...
 */
function newBlankDomain() {
  var dimX = parseInt($("#new-domain-width").attr("value"));
  if (!dimX || dimX < 10)
    dimX = 10;
  var dimY = parseInt($("#new-domain-height").attr("value"));
  if (!dimY || dimY < 10)
    dimY = 10;
  var name = $("#new-domain-name").attr( "value" );
  if (!name)
    name = "Untitled";

  var baseLandType = 4; //ocean
  var mapData = [];
  for (var y=0; y<dimY; y++) {
    var row = [];
    for (var x=0; x<dimX; x++) {
      row.push( baseLandType );
    }
    mapData.push( row );
  }
  WorldMapManager.setNewDomain(dimX, dimY, name, mapData, false, 0, 0);
  var title = name + "(" + dimX + "x" + dimY + ")";
  $("#title").html( title);
  setClickHandlersForEditableMap();
}

function newRandomDomain() {
    let width = 100;
    let height = 100;
    let noise = 1.0;
    let volcanic = 1.0;
    let erosion = 1.0;
    let sea = 1.0;
    let fault = 1.0;
    let name = $("#new-domain-name").attr( "value" );
    if (!name)
	name = "Random Land";
    let generator = new RandomLandmassGenerator(height, width, noise, volcanic, erosion, sea, fault);
    let rawData = generator.getArray();
    let x, y;
    let mapData = [];
    for (y=0; y<height; y++) {
	let row = [];
	for (x=0; x<width; x++) {
	    let z = rawData[y][x];
	    if (z > 0.2) {
		row.push( 158 ); // ice
	    } else if (z > 0.08) {
		row.push( 3 ); // mountain
	    } else if (z > 0.06) {
		row.push( 2 ); // upland
	    } else if (z > 0.04) {
		row.push( 1 ); // midland
	    } else if (z > 0) {
		row.push( 0 ); // lowland
	    } else if (z > -0.1) {
		row.push(4); // shallow water
	    } else {
		row.push(4); //deep water
	    }
	}
	mapData.push( row );
    } 
    WorldMapManager.setNewDomain( width, height, name, mapData, false, 0, 0);
    var title = name + "(" + width + "x" + height + ")";
    $("#title").html( title);
    setClickHandlersForEditableMap();
}

function setGameStartPos() {
    var domain = WorldMapManager._currentDomain;
    if ($("#start-game-here-check").attr("checked")) {
	domain._record.new_character_can_start_here = true;
    } else {
	domain._record.new_character_can_start_here = false;
    }
    // TODO super encapsulation breaky:
    domain._record.start_position_x = $("#start-position-x").attr("value");
    domain._record.start_position_y = $("#start-position-y").attr("value");
    doSaveDomain();
}

function doSaveDomain() {
  $("#debug").html( "Saving domain to server.  Do not close browser tab!" );
  if ( ! WorldMapManager.getDomainAttr("domain_name") ) {
    var name = prompt( "Please enter a name for your domain.", "" );
    if (!name) {
	return;
    } else {
	// TODO Super encapsulation breaky
	WorldMapManager._currentDomain._record.setField("domain_name", name);
    }
  }
  WorldMapManager.saveDomain( function() {
	  $("#debug").html("");
      });
}

function doSaveDomainAs() {
  // Prompt for a name (defaulting to existing name)

  var name = prompt( "Please enter a name for your domain.", 
		     WorldMapManager.getDomainAttr("domain_name"));
  if (!name) {
    return;
  } else {
    WorldMapManager._currentDomain._record.setField("domain_name", name);
    $("#debug").html( "Saving domain to server.  Do not close browser tab!" );
    WorldMapManager.saveDomainAs( function() {
	    $("#debug").html("");
        });
  }
}

function tileClickHandler(x, y) {
    if (g_tool_class == LAND_TILES && g_selected_tool != null) {
	WorldMapManager.setTile( x, y, g_selected_tool);
    } else if ( g_tool_class == DOORS ) {
	// TODO Super encapsulation breaky
	x = x + WorldMapManager._scrollX;
	y = y + WorldMapManager._scrollY;
        g_door_editor.setSelectedDoorPosition( x, y);
    }
}

function setClickHandlersForEditableMap() {
  for ( var y =0; y<10; y++ ) {
    for (var x=0; x<10; x++ ) {
      var id = "tile_" + x + "_" + y;
      var tile = document.getElementById(id);
      tile.setAttribute( "onclick", "tileClickHandler(" + x + "," + y + ");");
    }
  }
}

function selectLandTile( x ) {
    if (g_selected_tool != null) {
	$("#tile_tool_" + g_selected_tool).css("border-style", "none");
    }
    g_selected_tool= x;
    $("#tile_tool_" + x).css("border-style", "solid");
}


function makeTools( toolset_id ) {
  if (g_tool_class != null) {
      $("#" + g_tool_class).css("display", "none");
  }
  g_tool_class = toolset_id;
  $("#" + g_tool_class).css("display", "block");
  updateSelectedPanel();
}

function loadSelectedDomain() {
    var selection = $("select")[0].selectedIndex;
    if (selection > 0) {
        $("select")[0].blur();
	var domainId = g_domain_menu_index[selection - 1];
	loadDomain(domainId);
    }
}

function updateSelectedPanel() {
  switch(g_tool_class) {
  case LAND_TILES:
      /* TODO very important: this 43 is because 0..43 is the range of icon IDs
       * that represent land tiles.  This needs to get replaced with some kind of
       * query of the land_types table in the database.*/
      var html = "";
      for (var x = 0; x < 43; x++) {
	  html += "<img src=\"/icons/" + x + "\" id=\"tile_tool_" + x + "\"";
	  html += "onclick=\"selectLandTile(" + x + ");\"/>";
      }
      $("#" + LAND_TILES).html( html );
      break;
  case DOORS:
      var id =  WorldMapManager.getDomainAttr("id");
      g_door_editor.setDomainId(id);
      break;
  case TREASURES:
      break;
  case SHOPS:
      break;
  case ENCOUNTERS:
      break;
  case GEOLOGY:
      break;
  case STARTING:
      $("#start-position-x").attr( "value",WorldMapManager.getDomainAttr("start_position_x"));
      $("#start-position-y").attr( "value", WorldMapManager.getDomainAttr("start_position_y"));
      if (WorldMapManager.getDomainAttr("new_character_can_start_here")) {
          $("#start-game-here-check").attr( "checked", true );
      } else {
          $("#start-game-here-check").attr( "checked", false );
      }
      break;
  }
}

function loadDomain(domainId) { 
  WorldMapManager.downloadDomain( domainId, function() {
				    var name = WorldMapManager.getDomainAttr("domain_name");
				    var dimX = WorldMapManager.getDomainAttr("width");
				    var dimY = WorldMapManager.getDomainAttr("height");
				    var title =name + "(" + dimX + "x" + dimY + ")";
				    $("#title").html( title);
				    updateSelectedPanel();
                                    setClickHandlersForEditableMap();
				  });
}

function makeDomainMenu() {
  var url = "/list/domain";
  var domainSelectName = $("#domain-select").attr("name");
  $("#debug").html(domainSelectName);
  var callback = function(xml, textStatus) {
    $(xml).find('domain').each(function(){
      var name = $(this).attr('name');
      var newItem = document.createElement('option');
      newItem.text = name;
      $("select")[0].add(newItem, null);
      g_domain_menu_index.push( parseInt( $(this).attr('id') ) );
    });
  };
  jQuery.get(url, null, callback, "xml");
}

function updateOverlays() {
    switch( g_tool_class ) {
    case DOORS:
	g_door_editor.drawAll();
	break;
    }
}

keyMap[ARROW_DOWN] = function(evt) {
		       WorldMapManager.scroll(0,1);
		       updateOverlays();
			 cancelEvent(evt);
		       };

keyMap[ARROW_UP] = function(evt) {
		     WorldMapManager.scroll(0,-1);
		       updateOverlays();
		       cancelEvent(evt);
		     };

keyMap[ARROW_LEFT] = function(evt) {
		       WorldMapManager.scroll(-1,0);
		       updateOverlays();
		       cancelEvent(evt);
		       };

keyMap[ARROW_RIGHT] = function(evt) {
  		       WorldMapManager.scroll(1,0);
		       updateOverlays();
		       cancelEvent(evt);
		       };

$(document).ready( function() {
  newBlankDomain();
  makeDomainMenu();
  makeTools(LAND_TILES);
  bind(document, 'keydown', keyMap, handleKeystroke);
  setClickHandlersForEditableMap();
});

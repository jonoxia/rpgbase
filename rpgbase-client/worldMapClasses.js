function Map(id, data, spritesheet) {
  // mapData must be array of dimensions equal to dimX and dimY.
  this._mapData = data;
  this._dimX = data[0].length;
  this._dimY = data.length;

  this._img = spritesheet;

  this._stepHandlers = [];
  this._npcs = [];
  this._vehicles = [];
  this._id = id;
  this._loadHandlers = [];
  this._unloadHandlers = [];
}
Map.prototype = {
  getId: function() {
    return this._id;
  },

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
    // check if we're stepping into a vehicle:
    if (!player.inVehicle) {
      var vehicle = this.getVehicleAt(x, y);
      if (vehicle) {
        vehicle.embark(player);
      }
    }

    // check all the step handlers:
    for (var i = 0; i < this._stepHandlers.length; i++) {

      var trigger = this._stepHandlers[i].trigger;
      var result = this._stepHandlers[i].result;
      var landType = this._mapData[y][x];

      var triggered = true;
      if (trigger.x != undefined) {
        if (trigger.x != x ||
            trigger.y != y) {
          triggered = false;
        }
      }

      if (trigger.landType != undefined) {
        if (trigger.landType != landType) {
          triggered = false;
        }
      }

      if (trigger.chance != undefined) {
        if (Math.random() > trigger.chance) {
          triggered = false;
        }
      }

      if (trigger.edge != undefined) {
        if (trigger.edge == "any") {
          if (x != 0 && x != this._dimX-1 &&
              y != 0 && y != this._dimY-1) {
            triggered = false;
          }
              
        }
      }
      
      if (triggered) {
        result(player, x, y, landType);
      }
    }
  },

  addNPC: function(npc, x, y) {
    this._npcs.push(npc);
    npc.setPos(x, y);
  },

  removeNPC: function(npc) {
    var index = this._npcs.indexOf(npc);
    if (index > -1) {
      this._npcs.splice(index, 1);
    }
  },

  addVehicle: function(vehicle, x, y) {
    this._vehicles.push(vehicle);
    vehicle.setPos(x, y);
  },

  getNPCAt: function(x, y) {
    // returns npc object, or null if there is nobody
    for (var i = 0; i < this._npcs.length; i++) {
      var pos = this._npcs[i].getPos();
      if (pos.x == x && pos.y == y) {
        return this._npcs[i];
      }
    }
    return null;
  },

  getVehicleAt: function(x, y) {
    // returns vehicle object, or null if there is nobody
    for (var i = 0; i < this._vehicles.length; i++) {
      var pos = this._vehicles[i].getPos();
      if (pos.x == x && pos.y == y) {
        return this._vehicles[i];
      }
    }
    return null;
  },

  getAllNPCs: function() {
    return this._npcs;
  },

  getAllVehicles: function() {
    return this._vehicles;
  },

  load: function() {
    // called when player enters this map
    for (var i = 0; i < this._loadHandlers.length; i++) {
      this._loadHandlers[i]();
    }
    // wake up all npcs on this map:
    for (var i = 0; i < this._npcs.length; i++) {
      this._npcs[i].wake();
    }
  },

  unload: function() {
    // called when player leaves this map
    for (var i = 0; i < this._unloadHandlers.length; i++) {
      this._unloadHandlers[i]();
    }
    // sleep all npcs on this map:
    for (var i = 0; i < this._npcs.length; i++) {
      this._npcs[i].sleep();
    }
  },

  setMusicTrack: function(trackName) {
    this.musicTrack = trackName;
  },

  setEncounterTable: function(table) {
    this.encounterTable = table;
  },

  onLoad: function(callback) {
    this._loadHandlers.push(callback);
  },

  onUnload: function(callback) {
    this._unloadHandlers.push(callback);
  }
}

function MapScreen(htmlElem, numTilesX, numTilesY, tilePixelsX,
                   tilePixelsY, frameRate){
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
  this.scrollAdjustment = {x: 0, y: 0};
  // TODO set width and height of canvas element to
  // numTilesX * tilePixelsX, etc.

  var self = this;
  // mapscreen has an animator that renders map screen after
  // each frame.
  this._animator = new Animator(frameRate,
                                function() { self.render(); });
  this._audioPlayer = null;
}
MapScreen.prototype = {
  getCurrentMapId: function() {
    return this._currentDomain.getId();
  },

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

  useAudioPlayer: function(audio) {
    this._audioPlayer = audio;
  },

  setNewDomain: function( domain ) {
    if (this._currentDomain) {
      this._currentDomain.unload();
    }
    this._currentDomain = domain;
    this._scrollX = 0;
    this._scrollY = 0;
    this._currentDomain.load();
    if (this._audioPlayer && domain.musicTrack) {
      this._audioPlayer.changeTrack(domain.musicTrack, true);
    }
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

  render: function() {
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
        if (this.scrollAdjustment) {
          drawX += this.scrollAdjustment.x;
          drawY += this.scrollAdjustment.y;
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

    // make an array of all player and NPC sprites:
    var party = this.player.getAliveParty();
    var npcs = this._currentDomain.getAllNPCs();
    // TODO - only get the ones on the screen given current scroll?
    var mapSprites = party.concat(npcs);
    var vehicles = this._currentDomain.getAllVehicles();
    mapSprites = mapSprites.concat(vehicles);

    // sort them all so southernmost are drawn last:
    mapSprites.sort(function(a, b) {
      if (a._y != b._y) {
        return (a._y - b._y);
      }
      if (a._animationOffset.y != b._animationOffset.y) {
        return (a._animationOffset.y - b._animationOffset.y);
      }
      return (b._marchOrder - a._marchOrder);
    });
    for (var i = 0; i < mapSprites.length; i++) {
      mapSprites[i].plot(this, this.scrollAdjustment);
    }

    // TODO if a canvas-based fieldMenu or dialogMenu is open,
    // have to draw that here! Probably do it as yet another callback
    if (this._afterRenderCallback) {
      this._afterRenderCallback(this._ctx);
    }
  },

  getScrollAnimation: function(delta, numFrames) {
    var self = this;
    var xFactor = delta.x / numFrames;
    var yFactor = delta.y / numFrames;

    var halfwayPoint = Math.floor(numFrames/2);
    var frameCallback = function(frame) {
      // calculate pixel adjustment based on tile size, current
      // frame, and direction of movement:
      self.scrollAdjustment =
        {x:(-1) * (frame * xFactor* self.tilePixelsX),
         y:(-1) * (frame * yFactor * self.tilePixelsY)
        };
      if (frame == halfwayPoint) {
        // update the map's scroll position once,
        // halfway through the animation, so that
        // the next row of tiles will be loaded and ready to display:
        self.scroll(delta.x, delta.y);
      }
      if (frame >= halfwayPoint) {
        // after updating map's scroll position,
        // correct pixel adjustment by one tile size:
        self.scrollAdjustment.x += delta.x * self.tilePixelsX;
        self.scrollAdjustment.y += delta.y * self.tilePixelsY;
      }
    };
    var finishCallback = function() {
      // when animation done, reset scroll adjustment:
      self.scrollAdjustment = {x: 0,y: 0};
    };

    return new Animation(numFrames, frameCallback, finishCallback);
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
    this._scrollX = 0;
    this._scrollY = 0;
    this.scroll( x - this.margins.left, y - this.margins.top );
  },

  processStep: function( player, x, y ) {
    this._currentDomain.processStep(x, y, player);
  },

  getNPCAt: function(x, y) {
    return this._currentDomain.getNPCAt(x, y);
  },

  getVehicleAt: function(x, y) {
    return this._currentDomain.getVehicleAt(x, y);
  },

  getPCAt: function(x, y) {
    if (this.player) {
      var party = this.player.getAliveParty();
      for (var i = 0; i < party.length; i++) {
        var pos = party[i].getPos();
        if (pos.x == x && pos.y == y) {
          return party[i];
        }
      }
    }
    return null;
  },

  animate: function(animation) {
    this._animator.runAnimation(animation);
  },

  start: function() {
    this._animator.start();
    if (this._audioPlayer) {
      if (this._currentDomain.musicTrack) {
        this._audioPlayer.changeTrack(this._currentDomain.musicTrack,
                                      true);
      }
    }
    this.render();
  },

  stop: function() {
    this._animator.stop();
  },

  afterRender: function(callback) {
    this._afterRenderCallback = callback;
  },

  getEncounterTable: function() {
    if (this._currentDomain && this._currentDomain.encounterTable) {
      return this._currentDomain.encounterTable;
    }
    return null;
  }
};

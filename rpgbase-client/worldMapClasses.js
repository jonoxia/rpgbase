function Map(id, data, spritesheet, mapImplType) {
  // mapData must be 2d array of landtype codes.
  this._mapData = data;
  this._dimX = data[0].length;
  this._dimY = data.length;

  this._img = spritesheet;

  this._stepHandlers = [];
  this._npcs = [];
  this._vehicles = [];
  this._constructions = [];
  this._popupScenery = [];
  this._id = id;
  this._loadHandlers = [];
  this._unloadHandlers = [];

  this._switchStates = {}; // for puzzle switches

  if (mapImplType) {
    this._mapImpl = mapImplType;
    if (mapImplType === "singleImage") {
      this.backgroundImgs = [{offsetX: 0, offsetY: 0, img: spritesheet}];
      this.downsampleFactor = 1.0;
    }
  } else {
    this._mapImpl = "tilemap"; // default
  }
  this.foregroundImg = null;
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

    // if priority is not specified, the default is for
    // more specific triggers (specific x-y point) to take
    // priority over more general triggers.
    if (!trigger.hasOwnProperty('priority')) {
      if (trigger.hasOwnProperty('x') ||
        trigger.hasOwnProperty('edge')) {
        trigger.priority = 1;
        trigger.passThrough = false;
      } else {
        trigger.priority = 2;
        trigger.passThrough = true;
      }
    }
    // set default width and height to 1
    if (trigger.hasOwnProperty('x') && !trigger.hasOwnProperty('width')) {
      trigger.width = 1;
    }
    if (trigger.hasOwnProperty('y') && !trigger.hasOwnProperty('height')) {
      trigger.height = 1;
    }
    this._stepHandlers.push({
        trigger: trigger,
        result: result});
    // sort step handlers in increasing priority order
    // so the P1s come first
    this._stepHandlers.sort(function(a, b) {
      return a.trigger.priority - b.trigger.priority;
    });
    // this is sorting after every call to onStep, which is
    // not optimal - but the number of handlers is likely to be
    // small so it's probably not a problem (yet)
  },

  processStep: function(x, y, player) {
    // check if we're stepping into a vehicle:
    var vehicle = this.getVehicleAt(x, y);
    if (vehicle) {
        if (!player.inVehicle) {
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
        // TODO i don't think this is the recommended way to check if it exists...
        if ((x < trigger.x || x > trigger.x + trigger.width - 1 ) ||
            (y < trigger.y || y > trigger.y + trigger.height - 1 )) {
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
        switch (trigger.edge) {
        case "east":
          if (x != this._dimX-1) {
            triggered = false;
          }
          break;
        case "west":
          if (x != 0) {
            triggered = false;
          }
          break;
        case "north":
          if (y != 0) {
            triggered = false;
          }
          break;
        case "south":
          if (y != this._dimY-1) {
            triggered = false;
          }
          break;
        case "any":
          if (x != 0 && x != this._dimX-1 &&
              y != 0 && y != this._dimY-1) {
            triggered = false;
          }
        }
      }
      
      if (triggered) {
        result(player, x, y, landType);
        /* Handlers with passThrough = false (the default)
	 * end the handler chain when triggered. */ 
        if (!trigger.passThrough) {
	        break;
        }
      }
    }
  },

  addNPC: function(npc, x, y) {
    this._npcs.push(npc);
    npc.setPos(x, y);
  },

  addVehicle: function(vehicle, x, y) {
    this._vehicles.push(vehicle);
    if (x != undefined && y != undefined) {
        vehicle.setPos(x, y);
    }
  },

  addConstruction: function(construction, x, y) {
    this._constructions.push(construction);
    if (x != undefined && y != undefined) {
      construction.setPos(x, y);
    }
  },

  addPopupScenery: function(scenery, x, y) {
    this._popupScenery.push(scenery);
    if (x != undefined && y != undefined) {
      scenery.setPos(x, y);
    }
    // TODO move Popup class out of eagle princess and put it here?
  },

  removeNPC: function(npc) {
    var index = this._npcs.indexOf(npc);
    if (index > -1) {
      this._npcs.splice(index, 1);
    }
  },

  removeVehicle: function(vehicle) {
    var index = this._vehicles.indexOf(vehicle);
    if (index > -1) {
      this._vehicles.splice(index, 1);
    }
  },

  removePopupScenery: function(scenery) {
    var index = this._popupScenery.indexOf(scenery);
    if (index > -1) {
      this._popupScenery.splice(index, 1);
    }
  },

  removeAllNPCs: function() {
    this._npcs = [];
  },

  removeAllVehicles: function() {
    this._vehicles = [];
  },

  removeAllConstructions: function() {
    this._constructions = [];
  },

  removeAllPopupScenery: function() {
    this._popupScenery = [];
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

  getPopupSceneryAt: function(x, y) {
    // returns popup scenery object, or null if there is nobody
    for (var i = 0; i < this._popupScenery.length; i++) {
      var pos = this._popupScenery[i].getPos();
      if (pos.x == x && pos.y == y) {
        return this._popupScenery[i];
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

  getAllConstructedTiles: function() {
    return this._constructions;
  },
  
  getAllPopupScenery: function() {
    return this._popupScenery;
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
    // sleep all npcs on this map:
    for (var i = 0; i < this._npcs.length; i++) {
      this._npcs[i].sleep();
    }
    // called when player leaves this map
    for (var i = 0; i < this._unloadHandlers.length; i++) {
      this._unloadHandlers[i]();
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
  },

  getNeighbor: function(x, y, dx, dy) {
    // Gets square at x + dx, y + dy taking wrap into account
    // returns {x: x, y: y};
    var newX = x + dx;
    var newY = y + dy;
    if (newX < 0 && this.x_wrap) {
        newX += this._dimX;
    }
    if (newX >= this._dimX && this.x_wrap) {
        newX -= this._dimX;
    }
    if (newY < 0 && this.y_wrap) {
        newY += this._dimY;
    }
    if (newY >= this._dimY && this.y_wrap) {
        newY -= this._dimY;
    }
    return {x: newX, y: newY};
  },

  addBackgroundImg: function(newBackgroundImg) {
    // does nothing if this is not a singleImageMap
    this.backgroundImgs.push(newBackgroundImg);
  },

  addForegroundImg: function(newForegroundImg) {
    this.foregroundImg = newForegroundImg;
  },

  getSwitchState: function(code) {
    if (!this._switchStates[code]) {
      this._switchStates[code] = false;
      // so they all default to false without us having to explicitly set them up
    }
    return this._switchStates[code];
  },

  setSwitchState: function(code, value) {
    this._switchStates[code] = value;
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
  this.spriteScale = 1.0;
  this._screenWidth = numTilesX * tilePixelsX;
  this._screenHeight = numTilesY * tilePixelsY;
  // TODO set width and height of canvas element based on this?

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

  playMusicForCurrentMap: function() {
    var domain = this._currentDomain;
    if (this._audioPlayer && domain.musicTrack) {
      if (domain.musicTrack !== this._audioPlayer.getCurrentTrack()) {
        console.log("Changing music track to " + domain.musicTrack);
        this._audioPlayer.changeTrack(domain.musicTrack, true);
      }
    }
  },

  exitOldDomain: function() {
    if (this._currentDomain) {
      this._currentDomain.unload();
    }
  },

  setNewDomain: function( domain ) {
    // it used to call exitOldDomain here; does separating that cause any
    // problems?
    this._currentDomain = domain;
    this._scrollX = 0;
    this._scrollY = 0;
    this.playMusicForCurrentMap();
    // load comes last because it might trigger a cutscene that does who knows
    // what else, and we don't want to do anything like change the music after
    // the cutscene has already changed it.
    this._currentDomain.load();
  },

  getLandType: function( x, y ) {
    // x, y are world-coordinates, not screen-coordinates.
    if (!this._currentDomain._mapData[y]) {
      console.log("No match for y =" + y);
    }
    return this._currentDomain._mapData[y][x];
  },

  _getTileElementAt: function( x, y ) {
    // Deprecated. TODO: Delete.
    //convert to screen coordinates:
    x = x - this._scrollX;
    y = y - this._scrollY;
    var id = "tile_" + x + "_" + y;
    return document.getElementById(id);
  },

  _worldToScreen: function( worldX, worldY ) {
    // subtracts current scroll to turn a world position
    // into a screen position -- accounting for wrapping
    var scrolledX = worldX - this._scrollX;
    var scrolledY = worldY - this._scrollY;
    if (this._currentDomain.x_wrap) {
      if (scrolledX < 0) {
        scrolledX += this._currentDomain._dimX;
      }
      if (scrolledX >= this._currentDomain._dimX) {
        scrolledX -= this._currentDomain._dimX;
      }
    }
    if (this._currentDomain.y_wrap) {
      if (scrolledY < 0) {
        scrolledY += this._currentDomain._dimY;
      }
      if (scrolledY >= this._currentDomain._dimY) {
        scrolledY -= this._currentDomain._dimY;
      }
    }
    return {x: scrolledX, y: scrolledY};
  },

  _screenToWorld: function( screenX, screenY ) {
    // adds current scroll to turn a world position
    // into a screen position -- accounting for wrapping
    var scrolledX = screenX + this._scrollX;
    var scrolledY = screenY + this._scrollY;
    // TODO mostly duplicated from _worldToScreen
    if (this._currentDomain.x_wrap) {
      if (scrolledX < 0) {
        scrolledX += this._currentDomain._dimX;
      }
      if (scrolledX >= this._currentDomain._dimX) {
        scrolledX -= this._currentDomain._dimX;
      }
    }
    if (this._currentDomain.y_wrap) {
      if (scrolledY < 0) {
        scrolledY += this._currentDomain._dimY;
      }
      if (scrolledY >= this._currentDomain._dimY) {
        scrolledY -= this._currentDomain._dimY;
      }
    }
    return {x: scrolledX, y: scrolledY};
  },

  transform: function( worldX, worldY ) {
    // transforms world coords to screen coords:
    var worldXY = this._worldToScreen(worldX, worldY);
    var screenX = this.tilePixelsX * worldXY.x;
    var screenY = this.tilePixelsY * worldXY.y;
    return [screenX + this.pixelOffset.x,
	    screenY + this.pixelOffset.y];
  },

  isOnScreen: function( worldX, worldY ) {
    var worldXY = this._worldToScreen(worldX, worldY);
    var screenX = worldXY.x;
    var screenY = worldXY.y;
    return (screenX > -1 && screenX < this.numTilesX &&
            screenY > -1 && screenY < this.numTilesY);
  },

  clipScrollToEdges: function(scrollX, scrollY) {
    if (scrollX < 0) {
      if (this._currentDomain.x_wrap) {
          // wrap around left edge of wrapping map
          scrollX += this._currentDomain._dimX;
      } else {
          // stop scrolling at left edge of non-wrapping map
          scrollX = 0;
      }
    } else if ( scrollX + this.numTilesX > this._currentDomain._dimX) {
      if (this._currentDomain.x_wrap) {
        if (scrollX >= this._currentDomain._dimX) {
          // wrap around right edge of wrapping map
          scrollX -= this._currentDomain._dimX;
        }
      } else {
        // stop scrolling at right edge of non-wrapping map
        scrollX = this._currentDomain._dimX - this.numTilesX;
      }
    }
    if (scrollY < 0) {
      if (this._currentDomain.y_wrap) {
        // wrap around top edge of wrapping map
        scrollY += this._currentDomain._dimY;
      } else {
        // stop scrolling at top edge of non-wrapping map
        scrollY = 0;
      }
    } else if (scrollY + this.numTilesY > this._currentDomain._dimY) {
      if (this._currentDomain.y_wrap) {
        // wrap around bottom edge of wrapping map
        if (scrollY >= this._currentDomain._dimY) {
          scrollY -= this._currentDomain._dimY;
        }
      } else {
        // stop scrolling at bottom edge of non-wrapping map
        scrollY = this._currentDomain._dimY - this.numTilesY;
      }
    }
    return {x: scrollX, y: scrollY};
  },

  calcAutoScroll: function(x, y, delX, delY) {
    var screen = this._worldToScreen( x + delX, y + delY );
    var screenX = screen.x;
    var screenY = screen.y;
    
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
    // Stop at edges of map -- or wrap around to other side
    // depending on settings:
    var clippedScroll = this.clipScrollToEdges(scrollX, scrollY);

    return {x: clippedScroll.x - this._scrollX,
            y: clippedScroll.y - this._scrollY};
  },

  _renderTileMap: function() {
    // pixel adjustment is optional but if present it should have
    // a .x and .y
    for (var y = 0; y < this.numTilesY; y++) {
      for (var x = 0; x < this.numTilesX; x++) {

        var worldPt = this._screenToWorld(x, y);
        var code = this.getLandType( worldPt.x, worldPt.y );
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
  },
  
  _renderSingleImgMap: function() {
    /* it's called "single image" but it actually supports multiple images,
     * mainly to support appending a camp map to the side of a town map in
     * Eagle Princess, but also for any case where we want to composite maps*/
    var self = this;
    var ds = this._currentDomain.downsampleFactor || 1;
    $.each(this._currentDomain.backgroundImgs, function(i, background) {
      var drawX = self.tilePixelsX * (background.offsetX - ds*self._scrollX );
      var drawY = self.tilePixelsY * (background.offsetY - ds*self._scrollY );
      if (self.scrollAdjustment) {
        drawX += ds*self.scrollAdjustment.x;
        drawY += ds*self.scrollAdjustment.y;
      }
      self._ctx.save();
      self._ctx.scale(1.0/ds, 1.0/ds);
      self._ctx.drawImage(background.img, drawX, drawY);
      self._ctx.restore();
    });
  },

  _renderRoofLayer: function() {
    /* Could easily be expanded to allow any number of foreground images,
     * just like renderSingleImgMap above, but for now we only need one */
    var self = this;
    var ds = this._currentDomain.downsampleFactor || 1;
    var foreground = this._currentDomain.foregroundImg;
    
    var drawX = self.tilePixelsX * (foreground.offsetX - ds*self._scrollX );
    var drawY = self.tilePixelsY * (foreground.offsetY - ds*self._scrollY );
    if (self.scrollAdjustment) {
      drawX += ds*self.scrollAdjustment.x;
      drawY += ds*self.scrollAdjustment.y;
    }
    self._ctx.save();
    self._ctx.scale(1.0/ds, 1.0/ds);
    self._ctx.drawImage(foreground.img, drawX, drawY);
    self._ctx.restore();
  },

  render: function() {
    switch (this._currentDomain._mapImpl) {
    case "singleImage": this._renderSingleImgMap();
      break;
    case "tilemap": this._renderTileMap();
      break;
    }

    // If there are any constructed tiles on the map, render them now:
    var tiles = this._currentDomain.getAllConstructedTiles();
    for (var i = 0; i < tiles.length; i++) {
      tiles[i].plot(this, this.scrollAdjustment);
    }

    // make an array of all player and NPC sprites, along with any
    // scenery objects that need to be sorted into the Z-order for drawing:
    var party = this.player.getAliveParty();
    var npcs = this._currentDomain.getAllNPCs();
    // TODO - only get the ones on the screen given current scroll?
    var mapSprites = party.concat(npcs);
    var vehicles = this._currentDomain.getAllVehicles();
    mapSprites = mapSprites.concat(vehicles);
    var scenery = this._currentDomain.getAllPopupScenery();
    mapSprites = mapSprites.concat(scenery);

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

    // if there's a foreground/ "roof" layer, draw that last:
    if (this._currentDomain.foregroundImg) {
      this._renderRoofLayer();
    }

    // draw any special fx:
    if (this._animator.SFX) {
        this._animator.SFX.draw(this._ctx);
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

    var clippedScroll = this.clipScrollToEdges(scrollX, scrollY);
    this._scrollX = clippedScroll.x;
    this._scrollY = clippedScroll.y;
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
  },

  flash: function(color, holdFrames, fadeOutFrames, fadeInFrames) {
    // flashes the map screen the given color over the given number of frames
    var self = this;
    if (!fadeOutFrames) {
      fadeOutFrames = 0;
    }
    if (!fadeInFrames) {
      fadeInFrames = 0;
    }
    var numFrames = holdFrames + fadeOutFrames + fadeInFrames;
    var r, g, b;
    switch(color) {
    case "black":
      r = 0; g = 0; b= 0;
      break;
    case "white":
      r = 255; g = 255; b= 255;
      break;
    case "red":
      r = 255; g =0; b = 0;
      break;
    }

    this._animator.playSfx(numFrames, function(ctx, frame) {
      var alpha;
      if (frame < fadeOutFrames) {
        alpha = frame * (1.0 / fadeOutFrames);
      } else if (frame > fadeOutFrames + holdFrames) {
        alpha = 1.0 - ( (1.0 / fadeInFrames) * (frame - fadeOutFrames - holdFrames));
      }
      ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
      ctx.fillRect(0, 0, self._screenWidth,
                   self._screenHeight);
    });
  },

  getNeighbor: function(x, y, dx, dy) {
    return this._currentDomain.getNeighbor(x, y, dx, dy);
  }
};

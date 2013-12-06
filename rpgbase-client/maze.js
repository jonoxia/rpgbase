
function darkenColor(color, brightness) {
  return "rgb(" + 
    Math.floor(color.r * brightness)
    +","+ 
    Math.floor(color.g * brightness)
    +","+
    Math.floor(color.b * brightness)
    +")";
}

function fuzzyMatch(a, b) {
  return Math.abs(a - b) < 0.1;
}
  
function Vector(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
}

function Line(a, b) {
  // make a bunch of these and put them in decorations to make
  // pattern on a wall
  this.a = a;
  this.b = b;
  this._lineColor = {r: 0.3, g: 0.3, b: 0.3};
}
Line.prototype = {
  calc: function(camera) {
    this._screenA = camera.perspectiveProject(this.a);
    this._screenB = camera.perspectiveProject(this.b);
  },

  render: function(ctx, light) {
    var a = this._screenA;
    var b = this._screenB;

    // don't draw me if I'm behind the screen:
    if (a.z < 1e-9 && b.z < 1e-9) {
      return;
    }

    ctx.beginPath();
    var scale = 35;
    ctx.moveTo(scale * a.x, scale * a.y);
    ctx.lineTo(scale * b.x, scale * b.y);
    // Scale lineColor by distance
    var brightness = light * 24;
    var z = (a.z + b.z )/2;
    if (z < 1) {
      brightness = Math.round(brightness * 1.1);
    } else {
      brightness = Math.round(brightness/ z);
    }
    ctx.strokeStyle = darkenColor(this._lineColor, brightness);
    ctx.stroke();
  },

  setLineColor: function(color) {
    this._lineColor = color;
  }
};

function Face(a, b, c, d) {
  this.a = a;
  this.b = b;
  this.c = c;
  this.d = d;
  this._fillColor = {r: 1, g: 1, b: 1};
  this._lineColor = {r: 0.4, g: 0.4, b: 0.4};
  this._decorations = [];
}
Face.prototype = {
  calc: function(camera) {
    this._screenA = camera.perspectiveProject(this.a);
    this._screenB = camera.perspectiveProject(this.b);
    this._screenC = camera.perspectiveProject(this.c);
    this._screenD = camera.perspectiveProject(this.d);

    for (var i =0; i < this._decorations.length; i++) {
      this._decorations[i].calc(camera);
    }
  },

  getAvgZ: function() {
    return (this._screenA.z
            + this._screenB.z
            + this._screenC.z
            + this._screenD.z) / 4;
  },

  getMinZ: function() {
    return Math.min(this._screenA.z,
                    this._screenB.z,
                    this._screenC.z,
                    this._screenD.z);
  },

  getPos: function() {
        var x = (this.a.x + this.b.x + this.c.x + this.d.x) /4;
        var y = (this.a.y + this.b.y + this.c.y + this.d.y) /4;
        var z = (this.a.z + this.b.z + this.c.z + this.d.z) /4;
        return {x: x, y: y, z: z};
    },

  render: function(ctx, light) {
        if (this.hidden) {
            return;
        }
    var a = this._screenA;
    var b = this._screenB;
    var c = this._screenC;
    var d = this._screenD;

    // don't draw me if I'm at or behind the screen:
    if (a.z < 1e-9 && b.z < 1e-9 && c.z < 1e-9 && d.z < 1e-9) {
      return;
    }

    // TODO also don't render beyond max viewing distance!!

    ctx.beginPath();

    var scale = 35;
    ctx.moveTo(scale * a.x, scale * a.y);
    ctx.lineTo(scale * b.x, scale * b.y);
    ctx.lineTo(scale * c.x, scale * c.y);
    ctx.lineTo(scale * d.x, scale * d.y);
    ctx.lineTo(scale * a.x, scale * a.y);

    // Darken fill color when farther away
    var brightness = light * 40;
    var z = this.getAvgZ();
    if (z < 1) {
      brightness = Math.round(brightness * 1.1);
    } else {
      brightness = Math.round(brightness/ z);
    }
    ctx.fillStyle = darkenColor(this._fillColor, brightness);
    ctx.fill();

    if (this._lineColor != null) {
	// can call .setLineColor(null) to not draw edges
      var lineBrightness = Math.floor(0.5*brightness);
      ctx.strokeStyle = darkenColor(this._lineColor, brightness);
      ctx.stroke();
    }

    for (var i =0; i < this._decorations.length; i++) {
      this._decorations[i].render(ctx, light);
    }
  },

  setColor: function(color) {
    this._fillColor = color;
  },

  setLineColor: function(color) {
    this._lineColor = color;
  },

  addDecoration: function(decoration) {
    this._decorations.push(decoration);
  },

  addDecorations: function(decorations) {
    this._decorations = this._decorations.concat(decorations);
  },

  getScreenRect: function() {
    var a = this._screenA;
    var b = this._screenB;
    var c = this._screenC;
    var d = this._screenD;
    return { left: Math.min(a.x, b.x, c.x, d.x),
             top: Math.min(a.y, b.y, c.y, d.y),
             right: Math.max(a.x, b.x, c.x, d.x),
             bottom: Math.max(a.y, b.y, c.y, d.y) };
    },

  hide: function() {
        this.hidden = true;
  },

  show: function() {
        this.hidden = false;
  }
};

// Replace this with Map class.
// will be using the getLandType of map to decide if player can cross;
// since these are 0s and 1s the results will probably be wrong; need
// to make canCross deal with named land types and then give map 
// domain a mapping of codes to names, so we can just define the
// maze map codes as 0 = open 1 = wall and default canCross returns
// false for wall.
// hacky workaround for now: override getLandType to return some
// impassible land type code if data[y][x] == 1

/*
  isOpenSpace: function(x, z) {
    if (x < 0 || x >= this._dimX) {
      return false;
    }
    if (z < 0 || z >= this._dimY) {
      return false;
    }
    var terrainType = this._mapData[z][x];
    return (terrainType == 0);
  },
*/

function FirstPersonMaze(ctx, width, height, frameTime) {
  this.width = width;
  this.height = height;
  this._currentMap = null;
  this._afterRenderCallback = null;
  this.init(ctx, frameTime);
  this.bgColor = {r: 0.5, g: 0.5, b: 0.8}; // for ceiling and floor
  this.softLineColor = {r: 0.3, g: 0.3, b: 0.5}; // for texture
  this.hardLineColor = {r: 0, g: 0, b: 0}; // for edges
  this.wallColor = {r: 1.2, g: 1.2, b: 1.5};
  this.stairColor = {r: 1.0, g: 1.0, b: 1.0};
}
FirstPersonMaze.prototype = {
  init: function(ctx, frameTime) {
    this.ctx = ctx;
    this.faces = [];
    this.cameraOrientation = new Vector(0, 0, 0);
    this.cameraPoint = new Vector(0, -0.1, 0);
    this.viewerPos = new Vector(0, 0, -5); // determined by experiment
    var self = this;
    this.animator = new Animator(frameTime,
                                 function() { self.render(); });
  },
  
  loadMaze: function(mazeMap) {
    if (this._currentMap) {
      this._currentMap.unload();
    }
    this._currentMap = mazeMap;
    if (mazeMap.colorPalette) {
	// mazeMap is a Map instance, but it may have a colorPalette property
	// dynamically added to it, which is not used for MapScreen but can be
	// used by MazeScreen as follows:
	if (mazeMap.colorPalette.floor) {
	    this.bgColor = mazeMap.colorPalette.floor;
	}
	if (mazeMap.colorPalette.softLine) {
	    this.softLineColor = mazeMap.colorPalette.softLine;
	}
	if (mazeMap.colorPalette.hardLine) {
	    this.hardLineColor = mazeMap.colorPalette.hardLine;
	}
	if (mazeMap.colorPalette.wall) {
	    this.wallColor = mazeMap.colorPalette.wall;
	}
	if (mazeMap.colorPalette.stair) {
	    this.stairColor = mazeMap.colorPalette.stair;
	}
    }
    this.faces = [];
    this.setupScene();
    this._currentMap.load();
  },

  enterPlayer: function(player, startX, startZ, startDirection) {
    this.player = player;
    // TODO what do we do with player.mapScreen? Do we need to null
    // it out or set it to something?

    var theta;
    switch(startDirection) {
      case "e": theta = Math.PI/2;break;
      case "n": theta = Math.PI;break;
      case "w": theta = 3*Math.PI/2;break;
      case "s": theta = 0;break;
    }
    this.cameraOrientation = new Vector(0, theta, 0);
    
    var party = this.player.party;
    for (var i = 0; i < party.length; i++) {
      party[i].setPos(startX, startZ);
      party[i].clearLastMoved();
    }
  },

  playerPosVector: function() {
    var leadCharPos = this.player.party[0].getPos();
    return new Vector(leadCharPos.x, 0, leadCharPos.y);
    // TODO make cameraOrientation a function of character facing?
  },

  getTerrainTypeAt: function(x, z) {
    // TODO move this to Map class?
    if (x < 0 || x >= this._currentMap._dimX) {
      return null;
    }
    if (z < 0 || z >= this._currentMap._dimY) {
      return null;
    }
    return this._currentMap._mapData[z][x];
  },

  isOpenSpace: function(x, z) {
    return (this.getTerrainTypeAt(x, z) == 0);
  },

  start: function() {
    this.animator.start();
    this.render();
  },

  stop: function() {
    this.animator.stop();
  },

  animate: function(animation) {
    this.animator.runAnimation(animation);
  },

  canPass: function(dir) {
    // dir is +1 for forward, -1 for backward
    // This duplicates logic from mapscreen
    var theta = this.cameraOrientation.y;
    var playerPos = this.playerPosVector();
    var newZ = playerPos.z + dir * Math.cos(theta);
    var newX = playerPos.x + dir * Math.sin(theta);
    
    newX = Math.floor(newX + 0.5);
    newZ = Math.floor(newZ + 0.5);

    // This line assumes that newX and newZ are within bounds
    // which might be false if you had tunnels running off the
    // edge of the map, so... don't do that?
    return (this._currentMap._mapData[newZ][newX] != 1);
  },

  goForward: function() {
    var theta = this.cameraOrientation.y;
    var self = this;
    if (this.canPass(1)) {
      return new Animation(5, function() {
        self.movePlayer(0.2 * Math.sin(theta), 0.2 * Math.cos(theta));
      }, function() {
        self.roundPlayerPos();
        self.processStep();
      });
    } else {
      return new Animation(5); // and play bump noise!
    }
  },

  goBackward: function() {
    var theta = this.cameraOrientation.y;
    var self = this;
    if (this.canPass(-1)) {
      return new Animation(5, function() {
        self.movePlayer(-0.2 * Math.sin(theta), -0.2 * Math.cos(theta));
      }, function() {
        self.roundPlayerPos();
        self.processStep();
      });
    } else {
      return new Animation(5);
    }
  },

  movePlayer: function(deltaX, deltaZ) {
    var party = this.player.party;
    for (var i = 0; i < party.length; i++) {
      var oldPos = party[i].getPos();
      party[i].setPos(oldPos.x + deltaX, oldPos.y + deltaZ);
      // TODO do anything with lastMoved direction?
    }
  },

  roundPlayerPos: function() {
    // round 'em all off to whole numbers so that map indices make
    // sense
    var party = this.player.party;
    for (var i = 0; i < party.length; i++) {
      var oldPos = party[i].getPos();
      party[i].setPos(Math.round(oldPos.x), Math.round(oldPos.y));
    }
  },

  turnLeft: function() {
    var self = this;
    return new Animation(5, function() {
      self.cameraOrientation.y += Math.PI / 10;
      if (self.cameraOrientation.y > 2*Math.PI) {
        self.cameraOrientation.y -= Math.PI * 2;
      }
    });
    // TODO update player facing?
  },

  turnRight: function() {
    var self = this;
    return new Animation(5, function() {
      self.cameraOrientation.y -= Math.PI / 10;
      if (self.cameraOrientation.y < 0) {
        self.cameraOrientation.y += Math.PI * 2;
      }
    });
    // TODO update player facing?
  },

  render: function() {
    // Main drawing function - draw everything!
    var lightLevel = this.getLightLevel();
    var theta = this.cameraOrientation.y;
    var playerPos = this.playerPosVector();
    this.cameraPoint = new Vector(playerPos.x - 0.3*Math.sin(theta),
                                  -0.05,
                                  playerPos.z - 0.3*Math.cos(theta));

    var drawOutside = this.doorToOutsideInFrontOfMe();
    // causes all sorta special-cases
    var maxZ = lightLevel + 1;
    if (drawOutside && maxZ < 5) {
      maxZ = 5;
    }

    var visibleFaces = [];
    for (var i = 0; i < this.faces.length; i++) {
      this.faces[i].calc(this);
      var z = this.faces[i].getAvgZ();
      // z < 0 is behind me; z > maxZ is outside my light radius.
     if (z > 0 && z <= maxZ) {
        visibleFaces.push(this.faces[i]);
      }
    }
    // sort z-distance highest to lowest -- draw closest last
    visibleFaces.sort(function(a, b) {
      return b.getAvgZ() - a.getAvgZ();
    });

    // Very backest background -- goes behind all polygons, will show
    // through where polygons are missing. All black, usually:
    this.ctx.save();

    if (drawOutside) {
      this._drawOutside(this.ctx);
    } else {
      this.ctx.fillStyle = "black";
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // put origin at center of screen for drawing maze polygons:
    this.ctx.translate(this.width/2, this.height/2);

    // then after that render all wall faces
    for (var i = 0; i < visibleFaces.length; i++) {
      visibleFaces[i].render(this.ctx, lightLevel);
    }

    // draw NPCs/chests/ etc as sprites in maze:
    var record = this.npcInFrontOfMe();
    if (record != null) {
      this.drawNPC(record.npc, record.dist);
    }
    
    // any special fx (copied from map screen):
    if (this.animator.SFX) {
        this.animator.SFX.draw(this.ctx);
    }

    this.ctx.restore();

    // TODO this is another bit of code copied with map screen:
    if (this._afterRenderCallback) {
      this._afterRenderCallback(this.ctx);
    }
  },

  _getFacingRect: function() {
    var theta = this.cameraOrientation.y;    
    if (fuzzyMatch(theta, 2 * Math.PI) || fuzzyMatch(theta, 0)) {
        return {dx: 0, dz: 1};
    }
    else if (fuzzyMatch(theta, Math.PI)) {
        return {dx: 0, dz: -1};
    }
    else if (fuzzyMatch(theta, Math.PI/2)) {
        return {dx: 1, dz: 0};
    }
    else if (fuzzyMatch(theta, 3*Math.PI/2)) {
        return {dx: -1, dz: 0};
    } else {
        return null;
    }
  },

  openSpaceInFrontOfMe: function() {
    var myPos = this.playerPosVector();
    var x, z;

    var facing = this._getFacingRect();
    if (facing == null) {
        return false;
    }
    x = myPos.x + facing.dx;
    z = myPos.z + facing.dz;
    return this.isOpenSpace(x, z);
  },

  doorToOutsideInFrontOfMe: function() {
      // Looks very weird if the door is outside my torch radius because the occluding
      // polygons aren't getting drawn.
    // am I looking at a door? This loop could be combined with the loop in
    // npcInFrontOfMe().
    if (!this._drawOutside) {
      return false;
    }
    var myPos = this.playerPosVector();
    var dx, dz;

    var facing = this._getFacingRect();
    if (facing == null) {
      // for simplicity sake, you can't see NPCs when looking
      // diagonally (i.e. mid-turn)
      return null;
    }
    dx = facing.dx;
    dz = facing.dz;

    for (var i = 0; i < 5; i++) {
      // not light level - the outside door produces its own light
      var pos = {x: Math.floor(myPos.x + i * dx),
                 y: 0,
                 z: Math.floor(myPos.z + i * dz)};
      
      var terrainType = this.getTerrainTypeAt(pos.x, pos.z);
 
      if (terrainType == 4) { // 4 is the door code
        return true;
      } else if (terrainType != 0) {
        // anything else blocks our view:
        return false;
      }
    }
    return false;
  },

  npcInFrontOfMe: function() {
    // follow the line of the player's vision until
    // we hit a wall or run out of light; return any
    // NPC found in those squares and the distance to it.

    var myPos = this.playerPosVector();
    var dx, dz;

    var facing = this._getFacingRect();
    if (facing == null) {
        // for simplicity sake, you can't see NPCs when looking
        // diagonally (i.e. mid-turn)
        return null;
    }
    dx = facing.dx;
    dz = facing.dz;

    for (var i = 0; i <= this.getLightLevel(); i++) {
        // beyond lightLevel squares away, it's too dark to see
        var pos = {x: Math.floor(myPos.x + i * dx),
                   y: 0,
                   z: Math.floor(myPos.z + i * dz)};
        
        // If pos is blocked by solid wall, stop here -- can't see
        // through.
        if (!this.isOpenSpace(pos.x, pos.z)) {
            break;
        }
        
        var npc = this.getNPCAt(pos);
        if (npc) {
            if (i == 0) {
                boxFacing = npc.getFacing();
                // don't show chests in my space that i'm facing
                // away from
                if (boxFacing.x != -1 * dx ||
                    boxFacing.y != -1 * dz) {
                    continue;
                }
            }
            var dist = this.distanceToNPC(npc);
            return {npc: npc, dist: dist};
        }
    }
    return null;
  },

  getNPC: function() {
    // returns any NPC sharing the player's space
    return this.getNPCAt(this.playerPosVector());
  },
    
  distanceToNPC: function(npc) {
      var playerPos = this.playerPosVector();
      var npcPos = npc.getPos();
      return Math.sqrt( Math.pow( playerPos.x - npcPos.x, 2) + 
                        Math.pow( playerPos.z - npcPos.y, 2));
  },

  getNPCAt: function(pos) {
    //var theta = this.cameraOrientation.y;
    var npcs = this._currentMap.getAllNPCs();
    for (var i = 0; i < npcs.length; i++) {
      var npcPos = npcs[i].getPos();
      if (npcPos.x == pos.x &&
          npcPos.y == pos.z) {
          return npcs[i];
      }
    }
    return null;
  },
  
  drawNPC: function(npc, dist) {
    var pos = npc.getPos();
    var face = npc.getFacing();
    // TODO some of these numbers are treasure-chest specific,
    // will need refactoring to handle other maze sprites (like actual
    // NPCs)
    var npcPoly = new Face(new Vector(pos.x + face.y * 0.25,
                                      0,
                                      pos.y + face.x * 0.25),
                            new Vector(pos.x - face.y * 0.25 ,
                                      0,
                                      pos.y - face.x * 0.25),
                            new Vector(pos.x - face.y * 0.25 ,
                                      -0.25,
                                      pos.y - face.x * 0.25),
                           new Vector(pos.x + face.y * 0.25 ,
                                      -0.25,
                                      pos.y + face.x * 0.25)
                           );

    npcPoly.calc(this);
    var screenRect = npcPoly.getScreenRect();
    var scale = 35; // TODO this constant appears in several places
    scaleWidth = scale * (screenRect.right - screenRect.left)/2;
    
    var x = scale * screenRect.left/2;
    var y = scale * screenRect.top/2;

    npc.scalePlot(this.ctx, scaleWidth, scaleWidth, x, y);
  },

  perspectiveProject: function(a) {
    // from en.wikipedia.org/wiki/3D_projection
    // a is world point
    var theta = this.cameraOrientation;
    var c = this.cameraPoint;
    // camera pretending to be a little bit back. Factor this out
    // so it's not in the inner loop

    var e = this.viewerPos;
    // c is camera point
    // theta is camera orientation
    // e is the viewer's position relative to display surface
    // produce d which is the transformed point
    // and b which is the point projected onto the 2d x-y plane.
    var sin = Math.sin;
    var cos = Math.cos;
    var d = {};
    d.x = cos(theta.y) * (sin(theta.z) * (a.y - c.y) + cos(theta.z) * (a.x - c.x)) - sin(theta.y) * (a.z - c.z);
    d.y = sin(theta.x)*(cos(theta.y)*(a.z -c.z) + sin(theta.y) * (sin(theta.z)*(a.y - c.y) + cos(theta.z) *(a.x - c.x))) + cos(theta.x) * (cos(theta.z) *(a.y - c.y) - sin(theta.z) * (a.x - c.x));
    d.z = cos(theta.x) * (cos(theta.y) * (a.z - c.z) + sin(theta.y) * (sin(theta.z) * ( a.y - c.y) + cos(theta.z) * ( a.x - c.x))) - sin(theta.x)*(cos(theta.z) * (a.y - c.y ) - sin(theta.z)*(a.x-c.x));
    var b = {};
    // don't divide by d.z if it's 0 or very close to 0!!
    var dividend = (d.z < 0.01) ? 0.01 : d.z;
    b.x = (e.z * d.x / dividend) - e.x;
    b.y = (e.z * d.y / dividend) - e.y;
    b.z = d.z;
    return b;
  },

  processStep: function() {
    var playerPos = this.playerPosVector();
    var x = Math.round(playerPos.x);
    var y = Math.round(playerPos.z);
    this._currentMap.processStep(x, y, this.player);
  },

  afterRender: function(callback) {
    // Copied from map screen:
    this._afterRenderCallback = callback;
  },

  makeStairsUp: function(x, z, side) {

      // bounding box:
      var leftWall = this.relativeFace(x, z, side,
				       [new Vector(0.5, -0.25, -0.2),
					new Vector(0.5, 0.25, -0.2),
					new Vector(-1.5, 0.25, -0.2),
					new Vector(-1.5, -0.25, -0.2)]);
      // extends back into the square bheind the stairs.
      var rightWall = this.relativeFace(x, z, side,
					[new Vector(0.5, -0.25, 0.2),
					 new Vector(0.5, 0.25, 0.2),
					 new Vector(-1.5, 0.25, 0.2),
					 new Vector(-1.5, -0.25, 0.2)]);
      leftWall.setColor(this.bgColor);
      rightWall.setColor(this.bgColor);
      rightWall.setLineColor(this.softLineColor);
      leftWall.setLineColor(this.softLineColor);
      this.faces.push(leftWall);
      this.faces.push(rightWall);


      // steps and risers:
      var stepX = 0.5;
      var dX = -0.2;
      var stepY = -0.25;
      var dY = 0.1;
        for (var i = 0; i < 5; i++) {
            var step = this.relativeFace(x, z, side,
					 [new Vector(stepX, stepY, -0.2),
					  new Vector(stepX+dX, stepY, -0.2),
					  new Vector(stepX+dX, stepY, 0.2),
					  new Vector(stepX, stepY, 0.2)]);
            stepX += dX;
            var riser = this.relativeFace(x, z, side,
					  [new Vector(stepX, stepY, -0.2),
					   new Vector(stepX, stepY+dY, -0.2),
					   new Vector(stepX, stepY+dY, 0.2),
					   new Vector(stepX, stepY, 0.2)]);
	    step.setColor(this.stairColor);
	    riser.setColor(this.stairColor);
	    step.setLineColor(this.hardLineColor);
	    riser.setLineColor(this.hardLineColor);
            this.faces.push(step);
            this.faces.push(riser);
            stepY += dY;
        }
  },

  relativeFace: function(x, z, side, vertices) {
      // specify vectors with x+1 as the "forward" side, e.g. east-facing
      // is the default.

      var transformedVectors = [];

      for (var i = 0; i < vertices.length; i++) {
	  // note uses reflection, not rotation. doesn't matter if geometry
	  // is symmetrical.
	  var dx, dz;
	  switch (side) {
	  case "e":
	      dx = vertices[i].x;
	      dz = vertices[i].z;
	      break;
	  case "w":
	      dx = (-1) * vertices[i].x;
	      dz = (-1) * vertices[i].z;
	      break;
	  case "n":
	      dx = (-1) * vertices[i].z;
	      dz = (-1) * vertices[i].x;
	      break;
	  case "s":
	      dx = vertices[i].z;
	      dz = vertices[i].x;
	      break;
	  }
	  transformedVectors.push(new Vector(x + dx, vertices[i].y, z + dz));
      }
      return new Face(transformedVectors[0],
		      transformedVectors[1],
		      transformedVectors[2],
		      transformedVectors[3]);
  },

  makeStairsDown: function(x, z, side){
      // bounding box:
      // our first diagonal polygon. I'm so proud.

      var ceiling = this.relativeFace(x, z, side,
				      [new Vector(0.5,  0.25, 0.2),
				       new Vector(0.5, 0.25, -0.2),
				       new Vector(-1.5, -0.2, -0.2),
				       new Vector(-1.5, -0.2, 0.2)]);
      var leftWall = this.relativeFace(x, z, side,
				       [new Vector(0.5, 0.25, -0.2),
					new Vector(-1.5, -0.2, -0.2),
					new Vector(-1.5, -0.6, -0.2),
					new Vector(0.5, -0.25, -0.2)]);
      var rightWall = this.relativeFace(x, z, side,
					[new Vector(0.5, 0.25, 0.2),
					 new Vector(-1.5, -0.2, 0.2),
					 new Vector(-1.5, -0.6, 0.2),
					 new Vector(0.5, -0.25, 0.2)]);
      ceiling.setColor(this.bgColor);
      rightWall.setColor(this.bgColor);
      leftWall.setColor(this.bgColor);
      ceiling.setLineColor(this.softLineColor);
      rightWall.setLineColor(this.softLineColor);
      leftWall.setLineColor(this.softLineColor);
      this.faces.push(ceiling);
      this.faces.push(leftWall);
      this.faces.push(rightWall);

      // TODO copied from stairsUp, only difference is dY.
      var stepX = 0.5;
      var dX = -0.2;
      var stepY = -0.25;
      var dY = -0.1;
        for (var i = 0; i < 5; i++) {
            var step = this.relativeFace(x, z, side,
					 [new Vector(stepX, stepY, -0.2),
					  new Vector(stepX+dX, stepY, -0.2),
					  new Vector(stepX+dX, stepY, 0.2),
					  new Vector(stepX, stepY, 0.2)]);
            stepX += dX;
            var riser = this.relativeFace(x, z, side,
					  [new Vector(stepX, stepY, -0.2),
					   new Vector(stepX, stepY+dY, -0.2),
					   new Vector(stepX, stepY+dY, 0.2),
					   new Vector(stepX, stepY, 0.2)]);
	    step.setColor(this.stairColor);
	    riser.setColor(this.stairColor);
	    step.setLineColor(this.hardLineColor);
	    riser.setLineColor(this.hardLineColor);
            this.faces.push(step);
            this.faces.push(riser);
            stepY += dY;
        }
  },

  makeSpecialWall: function(x, z, side, terrainType) {
    // left side
      switch (terrainType) {
      case 3: // Stairs Up
	  console.log("Making stairs up");
      this.makeStairsUp(x, z, side);
      this.makeDoor(x, z, side);
	  break;
      case 2: // Stairs Down
      this.makeStairsDown(x, z, side);
      this.makeDoor(x, z, side);
	  break;
      case 4: // Open Door
	  this.makeDoor(x, z, side);
	  // through this door is visible the outside world; see
	  // doorToOutsideInFrontOfMe, onDrawOutside, and render().
	  break;
      }
  },

  makeACube: function(x, z, terrainType) {
    var corner1 = new Vector(x - 0.5, -0.25, z -0.5);
    var corner2 = new Vector(x - 0.5, -0.25, z + 0.5);
    var corner3 = new Vector(x + 0.5, -0.25, z + 0.5);
    var corner4 = new Vector(x + 0.5, -0.25, z - 0.5);
    var corner5 = new Vector(x - 0.5, 0.25, z - 0.5);
    var corner6 = new Vector(x - 0.5, 0.25, z + 0.5);
    var corner7 = new Vector(x + 0.5, 0.25, z + 0.5);
    var corner8 = new Vector(x + 0.5, 0.25, z - 0.5);
    // top (not needed)
    //this.faces.push(new Face(corner1, corner2, corner3, corner4));
    // bottom
    //this.faces.push(new Face(corner5, corner6, corner7, corner8));


    // Add ONLY the faces of cube touching open space - otherwise
    // it will never get drawn so no point!!
    if (this.isOpenSpace(x - 1, z)) {
	if (terrainType == 1) {
	    // normal wall
            var wFace = new Face(corner1, corner2, corner6, corner5);
            wFace.setColor(this.wallColor);
            wFace.setLineColor(this.hardLineColor);
            wFace.addDecorations(this.makeBricks(x, z, "w"));
            this.faces.push(wFace);
	} else {
	    this.makeSpecialWall(x, z, "w", terrainType);
	}
    }
    if (this.isOpenSpace(x + 1, z)) {
      // right side
      if (terrainType == 1) {
        var eFace = new Face(corner3, corner4, corner8, corner7);
        eFace.setColor(this.wallColor);
        eFace.setLineColor(this.hardLineColor);
        eFace.addDecorations(this.makeBricks(x, z, "e"));
        this.faces.push(eFace);
      } else {
        this.makeSpecialWall(x, z, "e", terrainType);
      }
    }
    if (this.isOpenSpace(x, z-1)) {
      // front
      if (terrainType == 1) {
        var nFace = new Face(corner1, corner4, corner8, corner5 );
        nFace.setColor(this.wallColor);
        nFace.addDecorations(this.makeBricks(x, z, "n"));
        nFace.setLineColor(this.hardLineColor);
        this.faces.push(nFace);
      } else {
	  this.makeSpecialWall(x, z, "n", terrainType);
      }
    }
    if (this.isOpenSpace(x, z +1)) {
      // back
      if (terrainType == 1) {
        var sFace = new Face(corner2, corner3, corner7, corner6 );
        sFace.setColor(this.wallColor);
        sFace.addDecorations(this.makeBricks(x, z, "s"));
        sFace.setLineColor(this.hardLineColor);
        this.faces.push(sFace);
      } else {
	  this.makeSpecialWall(x, z, "s", terrainType);
      }
    }
    /* TODO don't use hard line color on edges where it's continuous
       with another wall */
  },

  makeBricks: function(x, z, side) {
    var brickLines= [];
    switch (side) {
      case "e":
      var corner1 = new Vector(x + 0.5, -0.08, z+0.5);
      var corner2 = new Vector(x + 0.5, -0.08, z-0.5);
      brickLines.push(new Line(corner1, corner2));

      var corner3 = new Vector(x + 0.5, 0.08, z+0.5);
      var corner4 = new Vector(x + 0.5, 0.08, z-0.5);
      brickLines.push(new Line(corner3, corner4));

      var corner5 = new Vector(x + 0.5, -0.25, z);
      var corner6 = new Vector(x + 0.5, -0.08, z);
      brickLines.push(new Line(corner5, corner6));

      var corner7 = new Vector(x + 0.5, 0.08, z);
      var corner8 = new Vector(x + 0.5, 0.25, z);
      brickLines.push(new Line(corner7, corner8));

      var corner9 = new Vector(x + 0.5, -0.08, z+0.25);
      var corner10 = new Vector(x + 0.5, -0.08, z-0.25);
      var corner11 = new Vector(x + 0.5, 0.08, z-0.25);
      var corner12 = new Vector(x + 0.5, 0.08, z+0.25);
      brickLines.push(new Line(corner10, corner11));
      brickLines.push(new Line(corner9, corner12));

      break;
      case "w":
      var corner1 = new Vector(x - 0.5, -0.08, z+0.5);
      var corner2 = new Vector(x - 0.5, -0.08, z-0.5);
      brickLines.push(new Line(corner1, corner2));

      var corner3 = new Vector(x - 0.5, 0.08, z+0.5);
      var corner4 = new Vector(x - 0.5, 0.08, z-0.5);
      brickLines.push(new Line(corner3, corner4));

      var corner5 = new Vector(x - 0.5, -0.25, z);
      var corner6 = new Vector(x - 0.5, -0.08, z);
      brickLines.push(new Line(corner5, corner6));

      var corner7 = new Vector(x - 0.5, 0.08, z);
      var corner8 = new Vector(x - 0.5, 0.25, z);
      brickLines.push(new Line(corner7, corner8));

      var corner9 = new Vector(x - 0.5, -0.08, z+0.25);
      var corner10 = new Vector(x - 0.5, -0.08, z-0.25);
      var corner11 = new Vector(x - 0.5, 0.08, z-0.25);
      var corner12 = new Vector(x - 0.5, 0.08, z+0.25);
      brickLines.push(new Line(corner10, corner11));
      brickLines.push(new Line(corner9, corner12));
      break;

      case "n":
      var corner1 = new Vector(x + 0.5, -0.08, z-0.5);
      var corner2 = new Vector(x - 0.5, -0.08, z-0.5);
      brickLines.push(new Line(corner1, corner2));

      var corner3 = new Vector(x + 0.5, 0.08, z-0.5);
      var corner4 = new Vector(x - 0.5, 0.08, z-0.5);
      brickLines.push(new Line(corner3, corner4));

      var corner5 = new Vector(x , -0.25, z-0.5);
      var corner6 = new Vector(x, -0.08, z-0.5);
      brickLines.push(new Line(corner5, corner6));

      var corner7 = new Vector(x, 0.08, z-0.5);
      var corner8 = new Vector(x, 0.25, z-0.5);
      brickLines.push(new Line(corner7, corner8));

      var corner9 = new Vector(x + 0.25, -0.08, z - 0.5);
      var corner10 = new Vector(x - 0.25, -0.08, z - 0.5);
      var corner11 = new Vector(x - 0.25, 0.08, z - 0.5);
      var corner12 = new Vector(x + 0.25, 0.08, z - 0.5);
      brickLines.push(new Line(corner10, corner11));
      brickLines.push(new Line(corner9, corner12));

      break;
      case "s":
      var corner1 = new Vector(x + 0.5, -0.08, z+0.5);
      var corner2 = new Vector(x - 0.5, -0.08, z+0.5);
      brickLines.push(new Line(corner1, corner2));

      var corner3 = new Vector(x + 0.5, 0.08, z+0.5);
      var corner4 = new Vector(x - 0.5, 0.08, z+0.5);
      brickLines.push(new Line(corner3, corner4));

      var corner5 = new Vector(x , -0.25, z+0.5);
      var corner6 = new Vector(x, -0.08, z+0.5);
      brickLines.push(new Line(corner5, corner6));

      var corner7 = new Vector(x, 0.08, z+0.5);
      var corner8 = new Vector(x, 0.25, z+0.5);
      brickLines.push(new Line(corner7, corner8));

      var corner9 = new Vector(x + 0.25, -0.08, z + 0.5);
      var corner10 = new Vector(x - 0.25, -0.08, z + 0.5);
      var corner11 = new Vector(x - 0.25, 0.08, z + 0.5);
      var corner12 = new Vector(x + 0.25, 0.08, z + 0.5);
      brickLines.push(new Line(corner10, corner11));
      brickLines.push(new Line(corner9, corner12));
      break;

    }
    for (var i = 0; i < brickLines.length; i++) {
      brickLines[i].setLineColor(this.softLineColor);
    }
    return brickLines;
  },

  makeDoor: function(x, z, side) {
    // Put solid polygons everywhere the door isn't:
      
      var lintel = this.relativeFace(x, z, side, 
				     [new Vector(0.5, 0.25, 0.2),
				      new Vector(0.5, 0.15, 0.2),
				      new Vector(0.5, 0.15, -0.2),
				      new Vector(0.5, 0.25, -0.2)]);
      var leftFrame = this.relativeFace(x, z, side,
					[new Vector(0.5, -0.25, -0.5),
					 new Vector(0.5, 0.25, -0.5),
					 new Vector(0.5, 0.25, -0.2),
					 new Vector(0.5, -0.25, -0.2)]);
      var rightFrame = this.relativeFace(x, z, side,
					 [new Vector(0.5, -0.25, 0.5),
					  new Vector(0.5, 0.25, 0.5),
					  new Vector(0.5, 0.25, 0.2),
					  new Vector(0.5, -0.25, 0.2)]
					);
      lintel.setColor(this.wallColor);
      lintel.setLineColor(this.softLineColor);
      leftFrame.setColor(this.wallColor);
      leftFrame.setLineColor(this.softLineColor);
      rightFrame.setColor(this.wallColor);
      rightFrame.setLineColor(this.softLineColor);
      this.faces.push(lintel);
      this.faces.push(leftFrame);
      this.faces.push(rightFrame);
  },
  makeFloorAndCeiling: function(x, z) {
    // floor
    var floorTile = new Face(new Vector(x , -0.25, z),
                             new Vector(x + 0.5, -0.25, z),
                             new Vector(x + 0.5, -0.25, z +0.5),
                             new Vector(x, -0.25, z +0.5)
                            );
    floorTile.setColor(this.bgColor);
    floorTile.setLineColor(this.softLineColor);
    this.faces.push(floorTile); 
    
    // ceiling
    var ceilTile = new Face(new Vector(x , 0.25, z),
                            new Vector(x + 0.5, 0.25, z),
                            new Vector(x + 0.5, 0.25, z +0.5),
                            new Vector(x, 0.25, z +0.5)
                           );
    ceilTile.setColor(this.bgColor);
    ceilTile.setLineColor(this.softLineColor);
    this.faces.push(ceilTile);
  },

  setupScene: function(map) {
    var map = this._currentMap;
    for (var z = 0; z < map._dimY; z++) {
      for (var x = 0; x < map._dimX; x++) {
        if (!this.isOpenSpace(x, z)) {
          this.makeACube(x, z, map._mapData[z][x]);
        }
      }
    }

    // floor/ceiling grid = 2 lines per space so count by 0.5s
    for (var z = 0; z < map._dimY; z+= 0.5) {
      for (var x = 0; x < map._dimX; x+= 0.5) {
        // Only add these polygons if the space is 0
        // otherwise they're under a wall and there's no point
        if (this.isOpenSpace(Math.ceil(x),
                             Math.ceil(z))) {
          this.makeFloorAndCeiling(x, z);
        }
      }
    }
    },

  getCurrentMapId: function() {
    return this._currentMap.getId();
  },

  getLightLevel: function() {
    if (this._currentMap.lightLevel != undefined) {
      return this._currentMap.lightLevel;
    } else {
      // default
      return 5;
    }
  },

  setLightLevel: function(newLevel) {
    // TODO make this a method on MazeMap class or something?
    this._currentMap.lightLevel = newLevel;
  },

  flash: function(color, numFrames) {
    // flashes the maze screen the given color over the given number of frames
    var self = this;
    this.animator.playSfx(numFrames, function(ctx, frame) {
            ctx.fillStyle = color;
            ctx.fillRect((-0.5) * self.width,
                         (-0.5) * self.height,
                         self.width, self.height);

        });
  },

  showHole: function(x, y, z) {
    // remove tiles from ceiling or floor to make hole for pit trap
    for (var i = 0; i < this.faces.length; i++) {

        var pos = this.faces[i].getPos();
        if ((pos.z == z + 0.25 || pos.z == z - 0.25) &&
            pos.y == y &&
            (pos.x == x - 0.25 || pos.x == x + 0.25 )) {
            this.faces[i].hide();
        }
    }
  },

  onDrawOutside: function(callback) {
      this._drawOutside = callback;
  },

    
};

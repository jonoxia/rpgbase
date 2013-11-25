
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

  render: function(ctx, light, scale) {
    var a = this._screenA;
    var b = this._screenB;

    // don't draw me if I'm behind the screen:
    if (a.z < 1e-9 && b.z < 1e-9) {
      return;
    }

    ctx.beginPath();
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

  render: function(ctx, light, scale) {
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
      this._decorations[i].render(ctx, light, scale);
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
  },

  outline: function(ctx, scale, color) {
    var a = this._screenA;
    var b = this._screenB;
    var c = this._screenC;
    var d = this._screenD;

    ctx.beginPath();

    ctx.moveTo(scale * a.x, scale * a.y);
    ctx.lineTo(scale * b.x, scale * b.y);
    ctx.lineTo(scale * c.x, scale * c.y);
    ctx.lineTo(scale * d.x, scale * d.y);
    ctx.lineTo(scale * a.x, scale * a.y);

      ctx.lineWidth = 3.0;
    ctx.strokeStyle = color;
    ctx.stroke();
      ctx.lineWidth = 1.0;
  }

};



function ThreeDMapScreen(ctx, width, height, frameTime) {
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
ThreeDMapScreen.prototype = {
  init: function(ctx, frameTime) {
    this.ctx = ctx;
    this.faces = [];
    this.faceIndex = [];
    this.zoomLevel = -15;
    this.cameraOrientation = new Vector(Math.PI/2, Math.PI, 0); // looking down slighty
    this.cameraPoint = new Vector(4, 6, 4); // up above 4, 4
      this.viewerPos = new Vector(0, 0, this.zoomLevel);
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
    this.faceIndex = [];
    this.setupScene();
    this._currentMap.load();
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

  turnLeft: function() {
    var self = this;
    return new Animation(5, function() {
      self.cameraOrientation.y += Math.PI / 100;
      if (self.cameraOrientation.y > 2*Math.PI) {
        self.cameraOrientation.y -= Math.PI * 2;
      }
	// move camera point as well....
	/*self.cameraPoint = new Vector(4 - 6*Math.sin(self.cameraOrientation.y),
				      3,
				      4 - 6*Math.cos(self.cameraOrientation.y));*/
    });
  },

  turnRight: function() {
    var self = this;
    return new Animation(5, function() {
      self.cameraOrientation.y -= Math.PI / 100;
      if (self.cameraOrientation.y < 0) {
        self.cameraOrientation.y += Math.PI * 2;
      }
	// move camera point as well.... // close but not right. fix this.
	/*self.cameraPoint = new Vector(4 - 6*Math.sin(self.cameraOrientation.y),
				      3,
				      4 - 6*Math.cos(self.cameraOrientation.y));*/

    });
  },

  rotateUp: function() {
    var self = this;
    return new Animation(5, function() {
      self.cameraOrientation.x -= Math.PI / 100;
      if (self.cameraOrientation.x < 0) {
        self.cameraOrientation.x += Math.PI * 2;
      }
    });
	
  },
  rotateDown: function() {
    var self = this;
    return new Animation(5, function() {
      self.cameraOrientation.x += Math.PI / 100;
      if (self.cameraOrientation.x < 0) {
        self.cameraOrientation.x += Math.PI * 2;
      }
    });
	
  },

    zoomIn: function() {
	this.zoomLevel += 1;
	this.viewerPos = new Vector(0, 0, this.zoomLevel); // determined by experiment
    },

    zoomOut: function() {
	this.zoomLevel -= 1;
	this.viewerPos = new Vector(0, 0, this.zoomLevel);
    },

  panLeft: function() {
    var self = this;
    return new Animation(5, function() {
	self.cameraPoint.x -= 0.2;
    });
  },

  panRight: function() {
    var self = this;
    return new Animation(5, function() {
	self.cameraPoint.x += 0.2;
    });
  },

  panUp: function() {
    var self = this;
    return new Animation(5, function() {
	self.cameraPoint.z -= 0.2;
    });
  },

  panDown: function() {
    var self = this;
    return new Animation(5, function() {
	self.cameraPoint.z += 0.2;
    });
  },

  render: function() {
    // Main drawing function - draw everything!
    var lightLevel = this.getLightLevel();
    var theta = this.cameraOrientation.y;
    var scale = 35;

    /*var playerPos = {x: 2, y: 0, z: 3};
    this.cameraPoint = new Vector(playerPos.x - 0.3*Math.sin(theta),
                                  playerPos.z,
                                  playerPos.z - 0.3*Math.cos(theta));*/

    var drawOutside = false;
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
      //this.ctx.fillStyle = "black";
	this.ctx.fillStyle = "lightblue";
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // put origin at center of screen for drawing maze polygons:
    this.ctx.translate(this.width/2, this.height/2);


    if (this.selectedSquare) {
      var selectedFace = this.faceIndex[this.selectedSquare.z][this.selectedSquare.x];
    }

    // then after that render all wall faces
    for (var i = 0; i < visibleFaces.length; i++) {
      visibleFaces[i].render(this.ctx, lightLevel, scale);
      if (selectedFace && visibleFaces[i] === selectedFace) {
        visibleFaces[i].outline(this.ctx, 35, "yellow");
      }
    }

    // draw NPCs/chests/ etc as sprites in maze:
    /*var record = this.npcInFrontOfMe();
    if (record != null) {
      this.drawNPC(record.npc, record.dist);
    }*/

    
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

  afterRender: function(callback) {
    // Copied from map screen:
    this._afterRenderCallback = callback;
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
    
  getHeightAt: function(x, z) {
    if (x < 0 || x >= this._currentMap._dimX) {
      return 0;
    }
    if (z < 0 || z >= this._currentMap._dimY) {
      return 0;
    }
    return this._currentMap._mapData[z][x];
  },

  makeWalls: function(x, y, z) {
      var leftNeighbor = this.getHeightAt(x - 1, z);
      var rightNeighbor = this.getHeightAt(x + 1, z);
      var topNeighbor = this.getHeightAt(x, z - 1);
      var bottomNeighbor = this.getHeightAt(x, z + 1);

      if (leftNeighbor < y) {
	  var leftWall = new Face(new Vector(x - 0.5, y, z - 0.5),
				 new Vector(x - 0.5, y, z + 0.5),
				 new Vector(x - 0.5, leftNeighbor, z + 0.5),
				 new Vector(x - 0.5, leftNeighbor, z - 0.5));
	  leftWall.setColor(this.wallColor);
	  leftWall.setLineColor(this.hardLineColor);
	  this.faces.push(leftWall);
      }
      if (rightNeighbor < y) {
	  var rightWall = new Face(new Vector(x + 0.5, y, z - 0.5),
				 new Vector(x + 0.5, y, z + 0.5),
				 new Vector(x + 0.5, rightNeighbor, z + 0.5),
				 new Vector(x + 0.5, rightNeighbor, z - 0.5));
	  rightWall.setColor(this.wallColor);
	  rightWall.setLineColor(this.hardLineColor);
	  this.faces.push(rightWall);
      }
      if (topNeighbor < y) {
	  var topWall = new Face(new Vector(x + 0.5, y, z - 0.5),
				new Vector(x - 0.5, y, z - 0.5),
				new Vector(x - 0.5, topNeighbor, z - 0.5),
				new Vector(x + 0.5, topNeighbor, z - 0.5));
	  topWall.setColor(this.wallColor);
	  topWall.setLineColor(this.hardLineColor);
	  this.faces.push(topWall);
      }
      if (bottomNeighbor < y) {
	  var bottomWall = new Face(new Vector(x + 0.5, y, z + 0.5),
				new Vector(x - 0.5, y, z + 0.5),
				new Vector(x - 0.5, bottomNeighbor, z + 0.5),
				new Vector(x + 0.5, bottomNeighbor, z + 0.5));
	  bottomWall.setColor(this.wallColor);
	  bottomWall.setLineColor(this.hardLineColor);
	  this.faces.push(bottomWall);
      }
  },

  makeGround: function(x, y, z) {
    // floor
    var floorTile = new Face(new Vector(x-0.5 , y, z-0.5),
                             new Vector(x + 0.5, y, z-0.5),
                             new Vector(x + 0.5, y, z +0.5),
                             new Vector(x-0.5, y, z +0.5)
                            );
    floorTile.setColor(this.bgColor);
    floorTile.setLineColor(this.softLineColor);
    if (!this.faceIndex[z]) {
      this.faceIndex[z] = {};
    }
    this.faceIndex[z][x] = floorTile;
    this.faces.push(floorTile); 
  },

  setupScene: function(map) {
    var map = this._currentMap;
    for (var z = 0; z < map._dimY; z++) {
      for (var x = 0; x < map._dimX; x++) {
	  var y = this.getHeightAt(x, z);
          this.makeWalls(x, y, z);
          this.makeGround(x, y, z);
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

  reverseTransform: function(screenX, screenY) {
    var map = this._currentMap;
    for (var z = 0; z < map._dimY; z++) {
      for (var x = 0; x < map._dimX; x++) {
        var face = this.faceIndex[z][x];
	  // TODO duplicates some code from Face.getScreenRect
	  var minScreenX = Math.min(face._screenA.x, face._screenB.x,
				    face._screenC.x, face._screenD.x)*35 + this.width/2;
	  // TODO don't hardcode scale factor here
	  var maxScreenX = Math.max(face._screenA.x, face._screenB.x,
				    face._screenC.x, face._screenD.x)*35 + this.width/2;
	  var minScreenY = Math.min(face._screenA.y, face._screenB.y,
				    face._screenC.y, face._screenD.y)*35 + this.height/2;
	  var maxScreenY = Math.max(face._screenA.y, face._screenB.y,
				    face._screenC.y, face._screenD.y)*35 + this.height/2;
	  if (screenX > minScreenX && screenX < maxScreenX &&
	      screenY > minScreenY && screenY < maxScreenY) {
	      return {x: x, z: z};
	  }
      }
    }
    return null;
  },

  setSelectedSquare: function(selectedSquare) {
      this.selectedSquare = selectedSquare;
  }
};

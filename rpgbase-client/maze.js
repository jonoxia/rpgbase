
function Vector(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
}

function Face(a, b, c, d) {
  this.a = a;
  this.b = b;
  this.c = c;
  this.d = d;
}
Face.prototype = {
  calc: function(camera) {
    this._screenA = camera.perspectiveProject(this.a);
    this._screenB = camera.perspectiveProject(this.b);
    this._screenC = camera.perspectiveProject(this.c);
    this._screenD = camera.perspectiveProject(this.d);
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

  render: function(ctx) {
    var a = this._screenA;
    var b = this._screenB;
    var c = this._screenC;
    var d = this._screenD;


    // don't draw me if I'm behind the screen:
    if (a.z < 0 || b.z < 0 || c.z < 0 || d.z < 0) {
      return;
    }
    // also don't render beyond max viewing distnace!!

    ctx.beginPath();

    var scale = 40;
    ctx.moveTo(scale * a.x, scale * a.y);
    ctx.lineTo(scale * b.x, scale * b.y);
    ctx.lineTo(scale * c.x, scale * c.y);
    ctx.lineTo(scale * d.x, scale * d.y);
    ctx.lineTo(scale * a.x, scale * a.y);
    ctx.fillStyle = "grey";
    ctx.strokeStyle = "black";
    ctx.fill();
    ctx.stroke();
  }
};

function MazeMap(data) {
    // duplicates stuff from mapomain
    this._mapData = data;
    this._dimX = data[0].length;
    this._dimY = data.length;

    this._stepHandlers = [];
}
MazeMap.prototype = {
  canPass: function(x, y) {
    var terrainType = this._mapData[y][x];
    return (terrainType == 0);
  },

  onStep: function(filter, callback) {
    this._stepHandlers.push({trigger: filter, result: callback});
  },

  processStep: function(x, y) {
    // COPIED FROM MAPSCREEN no es bueno
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
        // TODO: This doesn't have a ref to the actua player
        // so it's passing bogus data to the first argument
        // of step handler
        result(null, x, y, landType);
      }
    }
  },

  getMapData: function() {
    return this._mapData;
  }
};

function FirstPersonMaze(ctx, width, height) {
  this.width = width;
  this.height = height;
  this._currentMap = null;
  this._afterRenderCallback = null;
  this.init(ctx);
}
FirstPersonMaze.prototype = {
  init: function(ctx) {
    this.ctx = ctx;
    this.faces = [];
    this.cameraOrientation = new Vector(0, 0, 0);
    this.playerPos = new Vector(0, 0, 0);
    this.cameraPoint = new Vector(0, -0.1, 0);
    this.viewerPos = new Vector(0, 0, -5); // determined by experiment
    var self = this;
    this.animator = new Animator(100,
                                 function() { self.render(); });
  },
  
  loadMaze: function(mazeMap, startX, startZ, startDirection) {
    this._currentMap = mazeMap;
    this.faces = [];
    var theta;
    switch(startDirection) {
      case "e": theta = Math.PI/2;break;
      case "n": theta = Math.PI;break;
      case "w": theta = 3*Math.PI/2;break;
      case "s": theta = 0;break;
    }
    this.cameraOrientation = new Vector(0, theta, 0);
    this.playerPos = new Vector(startX, 0, startZ);
    this.setupScene(this._currentMap.getMapData());
  },

  start: function() {
    this.animator.start();
    this.render();
  },

  stop: function() {
    this.animator.stop();
  },

  canPass: function(dir) {
    // dir is +1 for forward, -1 for backward
    // This duplicates logic from mapscreen
    var theta = this.cameraOrientation.y;
    var newZ = this.playerPos.z + dir * Math.cos(theta);
    var newX = this.playerPos.x + dir * Math.sin(theta);
    
    newX = Math.floor(newX + 0.5);
    newZ = Math.floor(newZ + 0.5);

    return this._currentMap.canPass(newX, newZ);
  },

  goForward: function() {
    var theta = this.cameraOrientation.y;
    var self = this;
    if (this.canPass(1)) {
      return new Animation(5, function() {
        self.playerPos.z += 0.2 * Math.cos(theta);
        self.playerPos.x += 0.2 * Math.sin(theta);
      }, function() {
        self.playerPos.z = Math.floor(self.playerPos.z + 0.5);
        self.playerPos.x = Math.floor(self.playerPos.x + 0.5);
	console.log("maze pos: " + self.playerPos.x + ", " +
		    self.playerPos.z);
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
        self.playerPos.z -= 0.2 * Math.cos(theta);
        self.playerPos.x -= 0.2 * Math.sin(theta);
      }, function() {
        self.playerPos.z = Math.floor(self.playerPos.z + 0.5);
        self.playerPos.x = Math.floor(self.playerPos.x + 0.5);
        self.processStep();
      });
    } else {
      return new Animation(5);
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
  },

  turnRight: function() {
    var self = this;
    return new Animation(5, function() {
      self.cameraOrientation.y -= Math.PI / 10;
      if (self.cameraOrientation.y < 0) {
        self.cameraOrientation.y += Math.PI * 2;
      }
    });
  },

  render: function() {
    // sort z-distance highest to lowest -- draw closest last
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.save();
    this.ctx.translate(this.width/2, this.height/2);
    var theta = this.cameraOrientation.y;

    this.cameraPoint = new Vector(this.playerPos.x - 0.3*Math.sin(theta),
                                  -0.05,
                                  this.playerPos.z - 0.3*Math.cos(theta));
      /*new Vector(this.playerPos.X - 0.4 * Math.sin(theta),
        -0.05,
        this.playerPos.z - 0.4 * Math.cos(theta));*/

    for (var i = 0; i < this.faces.length; i++) {
      this.faces[i].calc(this);
    }

    // maybe do some raycasting instead of painter algorithm
    this.faces.sort(function(a, b) {
      return b.getAvgZ() - a.getAvgZ();
    });

    for (var i = 0; i < this.faces.length; i++) {
      this.faces[i].render(this.ctx);
    }

    // TODO Special case the nearby walls (and floors) that were
    // clipped out of the scene
    this.ctx.restore();

    // TODO this is another bit of code copied with map screen:
    if (this._afterRenderCallback) {
      this._afterRenderCallback(this.ctx);
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
    b.x = (e.z / d.z) * d.x - e.x;
    b.y = (e.z / d.z) * d.y - e.y;
    b.z = d.z; // um I think?
    return b;
  },

  processStep: function() {
    var player = null;
    var x = Math.floor(this.playerPos.x + 0.5);
    var y = Math.floor(this.playerPos.z + 0.5);
    this._currentMap.processStep(x, y);
  },

  afterRender: function(callback) {
    // Copied from map screen:
    this._afterRenderCallback = callback;
  },

  makeACube: function(x, z) {
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
    // left side
    this.faces.push(new Face(corner1, corner2, corner6, corner5));
    // right side
    this.faces.push(new Face(corner3, corner4, corner8, corner7));
    // front
    this.faces.push(new Face(corner1, corner4, corner8, corner5 ));
    // back
    this.faces.push(new Face(corner2, corner3, corner7, corner6 ));
  },

  setupScene: function(map) {
    for (var z = 0; z < map.length; z++) {
      for (var x = 0; x < map[0].length; x++) {
        if (map[z][x] > 0) {
          this.makeACube(x, z);
        }
      }
    }
  }
};

/*
$(document).ready(function() {
  var canvas = $("#the-canvas")[0];
  var ctx = canvas.getContext("2d");
  var maze = new FirstPersonMaze(sampleMazeData, ctx);
  var keyHandler = new DPadStyleKeyHandler(50, function(key) {
    var anim;
    switch (key) {
      case 38: 
      anim = maze.goForward();
      break;
      case 37: 
      anim = maze.turnLeft();
      break;
      case 39:
      anim = maze.turnRight();
      break;
      case 40: 
      anim = maze.goBackward();
    }
    keyHandler.waitForAnimation(anim);
    maze.animator.runAnimation(anim);

  });
  keyHandler.startListening();

  maze.start();
});*/
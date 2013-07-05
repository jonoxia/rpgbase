var sampleMazeData = [ // 1  2  3  4  5  6  7  8  9
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1,], // 0
  [3, 0, 0, 0, 0, 0, 0, 1, 1, 1,], // 1
  [1, 1, 0, 0, 2, 0, 0, 0, 0, 1,], // 2
  [1, 0, 0, 0, 0, 2, 0, 0, 0, 1,], // 3
  [1, 0, 0, 2, 0, 0, 2, 0, 0, 1,], // 4
  [1, 0, 0, 0, 2, 0, 0, 0, 1, 1,], // 5
  [1, 1, 1, 0, 0, 0, 0, 1, 1, 1,], // 6
  [1, 1, 1, 0, 0, 1, 0, 0, 1, 1,], // 7
  [1, 1, 1, 1, 1, 1, 0, 0, 1, 1,], // 8
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1,], // 9
];

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

    ctx.beginPath();
    ctx.save();
    var scale = 50;
    ctx.translate(512/2, 384/2);
    ctx.moveTo(scale * a.x, scale * a.y);
    ctx.lineTo(scale * b.x, scale * b.y);
    ctx.lineTo(scale * c.x, scale * c.y);
    ctx.lineTo(scale * d.x, scale * d.y);
    ctx.lineTo(scale * a.x, scale * a.y);
    ctx.fillStyle = "grey";
    ctx.strokeStyle = "black";
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
};


function FirstPersonMaze(mapData, ctx) {
  this.scene = null;
  this.renderer = null;
  this.width = 512;
  this.height = 384;
  this.aspect = this.width/this.height;
  this.mapData = mapData;
  this.player = null;
  this._stepHandlers = [];
  this.init(mapData, ctx);
}
FirstPersonMaze.prototype = {
  init: function(mapData,ctx) {
    this.ctx = ctx;
    this.faces = [];
    this.setupScene(mapData);
    this.cameraPoint = new Vector(0, 0, -1);
    this.cameraOrientation = new Vector(0, 0, 0);
    this.viewerPos = new Vector(0, 0, -2);
  },

  start: function() {
  },

  stop: function() {
  },

  goForward: function() {
    var theta = this.cameraOrientation.y;
    this.cameraPoint.z += 0.1 * Math.cos(theta);
    this.cameraPoint.x += 0.1 * Math.sin(theta);
    $("#debug").html("x = " + this.cameraPoint.x + " z = " + this.cameraPoint.z + " theta = " + theta);

    this.render();
  },

  goBackward: function() {
    var theta = this.cameraOrientation.y;
    this.cameraPoint.z -= 0.1 * Math.cos(theta);
    this.cameraPoint.x -= 0.1 * Math.sin(theta);
    $("#debug").html("x = " + this.cameraPoint.x + " z = " + this.cameraPoint.z + " theta = " + theta);
    this.render();
  },

  turnLeft: function() {
    this.cameraOrientation.y += Math.PI / 60;
    if (this.cameraOrientation.y > 2*Math.PI) {
      this.cameraOrientation.y -= Math.PI * 2;
    }
    $("#debug").html("x = " + this.cameraPoint.x + " z = " + this.cameraPoint.z + " theta = " + this.cameraOrientation.y);

    this.render();
  },

  turnRight: function() {
    this.cameraOrientation.y -= Math.PI / 60;
    if (this.cameraOrientation.y < 0) {
      this.cameraOrientation.y += Math.PI * 2;
    }
    $("#debug").html("x = " + this.cameraPoint.x + " z = " + this.cameraPoint.z + " theta = " + this.cameraOrientation.y);
    this.render();
  },

  render: function() {
    // sort z-distance highest to lowest -- draw closest last
    this.ctx.clearRect(0, 0, 512, 384);

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
  },

  onStep: function(filter, callback) {
    this._stepHandlers.push({trigger: filter, result: callback});
  },

  perspectiveProject: function(a) {
    // from en.wikipedia.org/wiki/3D_projection
    // a is world point
    var c = this.cameraPoint;
    var theta = this.cameraOrientation;
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

  processStep: function(x, y, player) {
    // COPIED FROM MAPSCREEN no es bueno
    // check all the step handlers:
    console.log("Maze processStep called");
    for (var i = 0; i < this._stepHandlers.length; i++) {

      var trigger = this._stepHandlers[i].trigger;
      var result = this._stepHandlers[i].result;
      console.log("Trying to get map data for y = " + y + " and x = " + x);
      var landType = this.mapData[y][x];

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
        console.log("Maze step handler triggered");
        result(player, x, y, landType);
      }
    }
  },

  makeACube: function(x, z) {
    var corner1 = new Vector(x - 0.5, -0.5, z -0.5);
    var corner2 = new Vector(x - 0.5, -0.5, z + 0.5);
    var corner3 = new Vector(x + 0.5, -0.5, z + 0.5);
    var corner4 = new Vector(x + 0.5, -0.5, z - 0.5);
    var corner5 = new Vector(x - 0.5, 0.5, z - 0.5);
    var corner6 = new Vector(x - 0.5, 0.5, z + 0.5);
    var corner7 = new Vector(x + 0.5, 0.5, z + 0.5);
    var corner8 = new Vector(x + 0.5, 0.5, z - 0.5);

    // top
    this.faces.push(new Face(corner1, corner2, corner3, corner4));
    // bottom
    this.faces.push(new Face(corner5, corner6, corner7, corner8));
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
          this.makeACube(x - 5, z - 5);
        }
      }
    }
  }
};


$(document).ready(function() {
  var canvas = $("#the-canvas")[0];
  var ctx = canvas.getContext("2d");
  var maze = new FirstPersonMaze(sampleMazeData, ctx);

  $(document).keydown(function(e) {
    switch (e.which) {
      case 38: maze.goForward();
      break;
      case 37: maze.turnLeft();
      break;
      case 39: maze.turnRight();
      break;
      case 40: maze.goBackward();
      case 190: maze.viewerPos.z += 0.1;
      maze.render();
      $("#debug").html(maze.viewerPos.z);
      break;
      case 188: maze.viewerPos.z -= 0.1;
      maze.render();
      $("#debug").html(maze.viewerPos.z);
      break;
    }
    //    $("#debug").html(e.which);
  });

  maze.render();
});
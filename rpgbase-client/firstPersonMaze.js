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

var UNITSIZE = 250;
var WALLHEIGHT = UNITSIZE/2;

function FirstPersonPlayer(x, z, theta, aspect) {
  var t = THREE;
  this.cam = new t.PerspectiveCamera(60, aspect, 1, 10000);
  // Those arguments are: FOV, aspect ratio, near, far

  // Set up camera
  this.cam.position.y = WALLHEIGHT /2;
  
  this.target = new t.Vector3( 0, 0, 0 );

  this.x = x;
  this.z = z;

  this.cam.position.x = this.x * UNITSIZE;
  this.cam.position.z = this.z * UNITSIZE;

  this.theta = theta;
  this.phi = Math.PI/2;

  $("#debug").html("x, z, theta = " + this.cam.position.x + ", "
                   + this.cam.position.z +", " + this.theta);

  this.numFrames = 8;
  this.frameTime = 50;
  this.animationBusy = false;

  this.target = new t.Vector3( 0, 0, 0 );

  this.torch = new t.PointLight( 0xFFFFFF, 1.0, UNITSIZE * 10 );
  this.torch.position.set( this.x * UNITSIZE,
                           UNITSIZE * .2,
                           this.z * UNITSIZE);
}
FirstPersonPlayer.prototype = {

  move: function(dir) {
    // theta = 0 is the +x direction
    // theta = pi/2 is the +z direction
    // theta = pi is the -x direction
    this.x += dir * Math.cos(this.theta);
    this.z += dir * Math.sin(this.theta);

    // round x and z to whole numbers:
    this.x = Math.floor(this.x + 0.5);
    this.z = Math.floor(this.z + 0.5);

    this.cam.position.x = this.x * UNITSIZE;
    this.cam.position.z = this.z * UNITSIZE;

    this.torch.position.x = this.x * UNITSIZE;
    this.torch.position.z = this.z * UNITSIZE;
  },

  canPass: function(dir, map) {
    // dir is +1 for forward, -1 for backward

    var newX = this.x + dir * Math.cos(this.theta);
    var newZ = this.z + dir * Math.sin(this.theta);
    
    newX = Math.floor(newX + 0.5);
    newZ = Math.floor(newZ + 0.5);

    var terrainType = map[newZ][newX];
    return (terrainType == 0);
  },

  animate: function(callback, finishedCallback) {
    var frame = 0;
    var self = this;
    self.animationBusy = true;
    var timer = window.setInterval(function() {
      frame++;
      callback(frame);
      if (frame == self.numFrames) {
        $("#debug").html("x, z, theta = " + self.cam.position.x + ", "
                   + self.cam.position.z +", " + self.theta);

        self.animationBusy = false;
        window.clearInterval(timer);
        if (finishedCallback) {
          finishedCallback();
        }
      }
    }, this.frameTime);
  },
  
  goForward: function(mazeScreen) {
    if (this.animationBusy) {
      return;
    }
    if (!this.canPass(1, mazeScreen.mapData)) {
      return;
    }
    var self = this;
    var movePerFrame = UNITSIZE / this.numFrames;
    this.animate(function() {
      self.cam.translateZ( - ( movePerFrame ) );
      self.torch.translateZ( - ( movePerFrame ) );
      mazeScreen.render();
    }, function() {
      self.move(1);
    });
  },

  goBackward: function(mazeScreen) {
    if (this.animationBusy) {
      return;
    }
    if (!this.canPass(-1, mazeScreen.mapData)) {
      return;
    }
    var self = this;
    var movePerFrame = UNITSIZE / this.numFrames;
    this.animate(function() {
      self.cam.translateZ( ( movePerFrame ) );
      self.torch.translateZ( ( movePerFrame ) );
      mazeScreen.render();
    }, function() {
      self.move(-1);
    });
  },

  turnCamera: function(turn) {
    this.theta += turn;
    var targetPosition = this.target,
    position = this.cam.position;
         
    targetPosition.x = position.x + 100 * Math.sin( this.phi ) * Math.cos( this.theta );
    targetPosition.y = position.y + 100 * Math.cos( this.phi );
    targetPosition.z = position.z + 100 * Math.sin( this.phi ) * Math.sin( this.theta );
    
    this.cam.lookAt( targetPosition );
  },

  turnLeft: function(mazeScreen) {
    if (this.animationBusy) {
      return;
    }
    var self = this;
    var turnPerFrame = (-1)*(Math.PI/2) / this.numFrames;
    this.animate(function() {
      self.turnCamera(turnPerFrame);
      mazeScreen.render();
    });
  },

  turnRight: function(mazeScreen) {
    if (this.animationBusy) {
      return;
    }
    var self = this;
    var turnPerFrame = (Math.PI/2) / this.numFrames;
    this.animate(function() {
      self.turnCamera(turnPerFrame);
      mazeScreen.render();
    });
  }
};


function FirstPersonMaze(mapData) {
  this.scene = null;
  this.renderer = null;
  this.width = 512;
  this.height = 384;
  this.aspect = this.width/this.height;
  this.mapData = mapData;
  this.player = null;
  this._stepHandlers = [];
  this.init();
}
FirstPersonMaze.prototype = {
  init: function() {
    this.scene = this.setupScene(this.mapData);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.001); // color, density
  
    this.player = new FirstPersonPlayer(2, 2, 0, this.aspect);
    
    this.scene.add(this.player.cam);
    this.scene.add(this.player.torch);
    //scene.add(new t.AmbientLight(0x555555));
    
    // TODO figure out if browser has WebGL support, then decide
    // whether to instantiate WebGLRenderer or CanvasRenderer.
    this.renderer = new THREE.WebGLRenderer();
    //renderer = new t.CanvasRenderer();
    this.renderer.setSize(this.width, this.height);
    
    // Add the canvas to the document
    //renderer.domElement.style.backgroundColor = '#D6F1FF'; // easier to see
    document.body.appendChild(this.renderer.domElement);

    this.render();
  },

  goForward: function() {
    this.player.goForward(this);
    this.processStep(this.player.x, this.player.z, this.player);
    // yes z not y
  },

  goBackward: function() {
    this.player.goBackward(this);
    this.processStep(this.player.x, this.player.z, this.player);
  },

  turnLeft: function() {
    this.player.turnLeft(this);
  },

  turnRight: function() {
    this.player.turnRight(this);
  },

  render: function() {
    this.renderer.render(this.scene, this.player.cam);
  },

  // We're starting to re-implement the MapScreen interface here
  // do this and that need a common mixin class?
  onStep: function(filter, callback) {
    this._stepHandlers.push({trigger: filter, result: callback});
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

  setupScene: function(map) {
    var BRICKTHICK = 4;
    var BRICKLONG = UNITSIZE / 2;
    var BRICKTALL = WALLHEIGHT / 3;
    var BRICKMARGIN = 4;
    var t = THREE;

    var scene = new t.Scene(); // Holds all objects in the canvas
    
    // Geometry: floor
    var floorTexture = new t.MeshLambertMaterial({color: 0x555555});
    //new t.MeshNormalMaterial({overdraw: true});
    //new t.MeshLambertMaterial({map: t.ImageUtils.loadTexture('textures/grey-floor.png')});
    
    var ceilingTexture = new t.MeshNormalMaterial({color: 0x555555, overdraw: true});
    //t.MeshLambertMaterial({map: t.ImageUtils.loadTexture('textures/grey-ceiling.png')});
    
    // Geometry: walls
    var cube = new t.CubeGeometry(UNITSIZE, WALLHEIGHT, UNITSIZE);
    var smallcube = new t.CubeGeometry(UNITSIZE - BRICKTHICK, WALLHEIGHT, UNITSIZE- BRICKTHICK);
    /*var materials = [new t.MeshLambertMaterial({map: t.ImageUtils.loadTexture('textures/purple-wall-2.png')}),
      new t.MeshLambertMaterial({map: t.ImageUtils.loadTexture('textures/green-wall.png')}),
      new t.MeshLambertMaterial({map: t.ImageUtils.loadTexture('textures/purple-stairs-2.png')})
      ];*/
    /*var materials = [new t.MeshBasicMaterial({map: t.ImageUtils.loadTexture('textures/purple-wall-2.png')}),
      new t.MeshBasicMaterial({map: t.ImageUtils.loadTexture('textures/green-wall.png')}),
      new t.MeshBasicMaterial({map: t.ImageUtils.loadTexture('textures/purple-stairs-2.png')})
      ];*/
    var materials = [new t.MeshLambertMaterial({color: 0xcc00cc}),
                     new t.MeshLambertMaterial({color: 0x00cc00}),
                     new t.MeshLambertMaterial({color: 0x000000})
                    ];
    
    var zBrick = new t.CubeGeometry(BRICKTHICK, BRICKTALL - BRICKMARGIN, BRICKLONG - BRICKMARGIN);
    var xBrick = new t.CubeGeometry(BRICKLONG - BRICKMARGIN, BRICKTALL - BRICKMARGIN, BRICKTHICK);
    
    var zHalfBrick = new t.CubeGeometry(BRICKTHICK, BRICKTALL - BRICKMARGIN, BRICKLONG/2 - BRICKMARGIN);
    var xHalfBrick = new t.CubeGeometry(BRICKLONG/2 - BRICKMARGIN, BRICKTALL - BRICKMARGIN, BRICKTHICK);
    
    var yValues = [WALLHEIGHT * 1/6,
                   WALLHEIGHT * 3/6,
                   WALLHEIGHT * 5/6];
    var xValues = [[ UNITSIZE * (-1)/4,
                     UNITSIZE * 1/4],
                   [UNITSIZE * (-3)/8,
                  0, UNITSIZE * 3/8],
                   [UNITSIZE * (-1)/4,
                    UNITSIZE * 1/4]]
    
    var plane = new t.PlaneGeometry(UNITSIZE, UNITSIZE);
    /*var floor = new t.Mesh( plane, floorTexture);
      floor.position.x = (map[0].length/2) * UNITSIZE;
      floor.position.y = 0 - WALLHEIGHT/2;
      floor.position.z = (mapW/2) * UNITSIZE;
      floor.overdraw = true;
      scene.add(floor);*/
    
    function tileNSWall(i, j, wallMaterial) {
      
      for (var y = 0; y < 3; y++) {
        for (var x = 0; x < xValues[y].length; x++) {
          var geom;
          if (y == 1 && ( x == 0 || x == 2)) {
            geom = xHalfBrick;
          } else {
            geom = xBrick;
          }
          var bump = new t.Mesh(geom, wallMaterial);
          bump.position.x = j * UNITSIZE + xValues[y][x];
          bump.position.y = yValues[y];
          bump.position.z = i * UNITSIZE;
          scene.add(bump);
        }
      }
    }
    function tileEWWall(i, j, wallMaterial) {
      for (var y = 0; y < 3; y++) {
        for (var x = 0; x < xValues[y].length; x++) {
          var geom;
          if (y == 1 && ( x == 0 || x == 2)) {
            geom = zHalfBrick;
          } else {
            geom = zBrick;
          }
          var bump = new t.Mesh(geom, wallMaterial);
          bump.position.x = j * UNITSIZE;
          bump.position.y = yValues[y];
          bump.position.z = i * UNITSIZE + xValues[y][x];
          scene.add(bump);
        }
      }
    }
    
    var mapH = map[0].length;
    var mapW = map.length;
    for (var i = 0; i < mapW; i++) {
      for (var j = 0; j < mapH; j++) {
        
        var floor = new t.Mesh(plane, floorTexture);
        floor.position.x = j * UNITSIZE;
        floor.position.y = 0;
        floor.position.z = i * UNITSIZE;
        scene.add(floor);
        
        var ceiling = new t.Mesh(plane, floorTexture);
        ceiling.position.x = j * UNITSIZE;
        ceiling.position.y = WALLHEIGHT * 3/2;
        ceiling.position.z = i * UNITSIZE;
        scene.add(ceiling);// does not appear... why?
        
        if (map[i][j]) {
          var wallMaterial = materials[map[i][j]-1]
	  var wall = new t.Mesh(smallcube, floorTexture);
	  wall.position.x = j * UNITSIZE;
	  wall.position.y = WALLHEIGHT/2;
	  wall.position.z = i * UNITSIZE;
	  scene.add(wall);
          
          // add a bump to each exposed side of wall
          if (i > 0 && !map[i-1][j]) {
            tileNSWall(i - 0.5, j, wallMaterial);
          }
          if (i < (mapW - 1) && !map[i+1][j]) {
            tileNSWall(i + 0.5, j, wallMaterial);
          }
          if (j > 0 && !map[i][j-1]) {
            tileEWWall(i, j - 0.5, wallMaterial);
          }
          if (j < (mapH - 1) && !map[i][j+1]) {
            tileEWWall(i, j + 0.5, wallMaterial);
          }
          
        }
      }
    }  
    return scene;
  }
};


/* TODO: 
  * Factor the common code between this and MapScreen into a common
  * class (MainScreenMixin?)
  * Have a way of setting position when you go into the maze
  * Replace the canvas instead of having a separate canvas
  * Call the wait for animation method of the input dispatcher
  *  while the maze is animating.
  * 
/* Jake says: Move camera back by a half or third of a square */
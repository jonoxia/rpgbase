var map = [ // 1  2  3  4  5  6  7  8  9
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
           ], mapW = map.length, mapH = map[0].length;

// Semi-constants
var WIDTH = 512,
HEIGHT = 384,
ASPECT = WIDTH / HEIGHT,
UNITSIZE = 250,
WALLHEIGHT = UNITSIZE/2 ;
// Global vars
var t = THREE, scene, renderer, controls, clock;
var runAnim = true;

function bind( scope, fn ) {
  return function () {
    fn.apply( scope, arguments );
  };
};

function FirstPersonPlayer(x, z, theta) {
  this.cam = new t.PerspectiveCamera(60, ASPECT, 1, 10000); // FOV, aspect, near, far

  // Set up camera
  this.cam.position.y = WALLHEIGHT /2;
  
  this.target = new THREE.Vector3( 0, 0, 0 );

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

  this.target = new THREE.Vector3( 0, 0, 0 );

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
    this.cam.position.x = this.x * UNITSIZE;
    this.cam.position.z = this.z * UNITSIZE;

    this.torch.position.x = this.x * UNITSIZE;
    this.torch.position.z = this.z * UNITSIZE;
  },

  canPass: function(dir) {
    // +1 for forward, -1 for backward

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
  
  goForward: function() {
    if (this.animationBusy) {
      return;
    }
    if (!this.canPass(1)) {
      return;
    }
    var self = this;
    var movePerFrame = UNITSIZE / this.numFrames;
    this.animate(function() {
      self.cam.translateZ( - ( movePerFrame ) );
      self.torch.translateZ( - ( movePerFrame ) );
      render(self.cam);
    }, function() {
      self.move(1);
    });
  },

  goBackward: function() {
    if (this.animationBusy) {
      return;
    }
    if (!this.canPass(-1)) {
      return;
    }
    var self = this;
    var movePerFrame = UNITSIZE / this.numFrames;
    this.animate(function() {
      self.cam.translateZ( ( movePerFrame ) );
      self.torch.translateZ( ( movePerFrame ) );
      render(self.cam);
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

  turnLeft: function() {
    if (this.animationBusy) {
      return;
    }
    var self = this;
    var turnPerFrame = (-1)*(Math.PI/2) / this.numFrames;
    this.animate(function() {
      self.turnCamera(turnPerFrame);
      render(self.cam);
    });
  },

  turnRight: function() {
    if (this.animationBusy) {
      return;
    }
    var self = this;
    var turnPerFrame = (Math.PI/2) / this.numFrames;
    this.animate(function() {
      self.turnCamera(turnPerFrame);
      render(self.cam);
    });
  }
};


$(document).ready(function() {
	$('body').append('<div id="intro">Click to start</div>');
	$('#intro').css({width: WIDTH, height: HEIGHT}).one('click', function(e) {
		e.preventDefault();
		$(this).fadeOut();
		init();
	  //animate();
	});
});

// Setup
function init() {
  clock = new t.Clock(); // Used in render() for controls.update()
  scene = new t.Scene(); // Holds all objects in the canvas
  scene.fog = new t.FogExp2(0x000000, 0.001); // color, density
  
  var player = new FirstPersonPlayer(2, 2, 0);
  
  scene.add(player.cam);
  //scene.add(player.torch);
  //scene.add(new t.AmbientLight(0x555555));

  // World objects
  setupScene();
  
  // Handle drawing as WebGL (faster than Canvas but less supported)
  //renderer = new t.WebGLRenderer();
  renderer = new t.CanvasRenderer();
  renderer.setSize(WIDTH, HEIGHT);
  
  // Add the canvas to the document
  //renderer.domElement.style.backgroundColor = '#D6F1FF'; // easier to see
  document.body.appendChild(renderer.domElement);
  
  $(document).bind("keydown", function(evt) {
    switch(evt.which) {
    case 38: /*up*/
    case 87: /*W*/ player.goForward(); break;
      
    case 37: /*left*/
    case 65: /*A*/ player.turnLeft(); break;
      
    case 40: /*down*/
    case 83: /*S*/ player.goBackward();break;
      
    case 39: /*right*/
    case 68: /*D*/ player.turnRight(); break;
    }
  });

  render(player.cam);
}


// Update and display
function render(cam) {
  var delta = clock.getDelta();
  //controls.update(delta); // Move camera
  
  renderer.render(scene, cam); // Repaint
}


// Set up the objects in the world
function setupScene() {
  var UNITSIZE = 250;

  // Geometry: floor
  var floorTexture = new t.MeshNormalMaterial({overdraw: true});
    //new t.MeshLambertMaterial({map: t.ImageUtils.loadTexture('textures/grey-floor.png')});

  var ceilingTexture = new t.MeshNormalMaterial({overdraw: true});
  //t.MeshLambertMaterial({map: t.ImageUtils.loadTexture('textures/grey-ceiling.png')});

  // Geometry: walls
  var cube = new t.CubeGeometry(UNITSIZE, WALLHEIGHT, UNITSIZE);
  /*var materials = [new t.MeshLambertMaterial({map: t.ImageUtils.loadTexture('textures/purple-wall-2.png')}),
    new t.MeshLambertMaterial({map: t.ImageUtils.loadTexture('textures/green-wall.png')}),
    new t.MeshLambertMaterial({map: t.ImageUtils.loadTexture('textures/purple-stairs-2.png')})
  ];*/
  var materials = [new t.MeshBasicMaterial({map: t.ImageUtils.loadTexture('textures/purple-wall-2.png')}),
    new t.MeshBasicMaterial({map: t.ImageUtils.loadTexture('textures/green-wall.png')}),
    new t.MeshBasicMaterial({map: t.ImageUtils.loadTexture('textures/purple-stairs-2.png')})
    ];



  for (var i = 0; i < mapW; i++) {
    for (var j = 0, m = map[i].length; j < m; j++) {

      /*var floor = new t.Mesh(cube, floorTexture);
      floor.position.x = j * UNITSIZE;
      floor.position.y = 0 - WALLHEIGHT/2;
      floor.position.z = i * UNITSIZE;
      scene.add(floor);

      var ceiling = new t.Mesh(cube, ceilingTexture);
      ceiling.position.x = j * UNITSIZE;
      ceiling.position.y = 3 *WALLHEIGHT/2;
      ceiling.position.z = i * UNITSIZE;
      scene.add(ceiling);*/

      if (map[i][j]) {
	var wall = new t.Mesh(cube, materials[map[i][j]-1]);
	wall.position.x = j * UNITSIZE;
	wall.position.y = WALLHEIGHT/2;
	wall.position.z = i * UNITSIZE;
	scene.add(wall);
      }
    }
  }  
}


var mapData = [
[36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36],
[36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36,36],
[36,36,36,36,36, 4, 9, 6,36,36,36,36,36,36,36,36,36,36,36],
[36,36,36,36, 4, 1,37, 3, 6,36,36,36,36,36,36,36,36,36,36],
[36,36,36, 4, 1,37,39,37,10,36,36,36,36,36,36,36,36,36,36],
[ 4,17, 9, 1,37,39,39,37, 3, 6,36,36,36,36,36,36,36,36,36],
[ 1,40,37,37,39,39,39,37,37, 3, 6,36,36,36,36,36,36,36, 4],
[37,40,37,39,39,47,39,39,37,37, 3, 6,36,36,36,36,36, 4, 1],
[37,40,37,37,39,39,39,37,37,37,37, 3, 9, 6,36,36, 4, 1,37],
[37,40,37,37,39,39,37,37,37,37,37,37,37, 3, 6,36,11,37,37],
[37,40,37,37,39,37,37,37,37,37,32,32,37,37, 3, 9, 1,37,37],
[37,40,37,37,37,37,37,32,32,34,44,44,35,32,37,37,37,37,37],
[37,40,37,37,37,37,34,44,44,46,44,44,46,44,35,37,12,14,37],
[37,15,40,14,37,37,37,45,45,32,45,45,32,45,37,12,40,13,37],
[37,37,37,15,14,34,46,44,44,44,44,44,44,44,35,40,13,37,37],
[37,37,37,37,40,37,34,44,44,44,44,44,44,44,35,40,37,37,37],
[37,37,37,37,40,37,37,33,33,33,45,33,33,33,37,40,37,37,37],
[37,37,37,37,15,14,37,37,41,37,33,37,37,37,37,40,37,37,37],
[37,37,37,37,37,40,37,37,37,37,37,37,12,40,40,13,37,37,37],
[37,37,37,37,37,40,37,37,37,37,37,37,40,37,37,37,37,37,37],
[37,37,37,37,37,40,37,37,37,37,37,37,40,37,37,37,37,37,37],
[37,37,37,37,37,15,14,37,37,37,37,37,40,37,37,37,37,37,37],
[37,37,37,37,37,37,40,37,37,12,40,40,13,37,37,37,37,37,37],
[37,37,37,37,37,37,40,40,40,13,37,37,37,37,37,37,37,37,37],
[37,37,37,37,37,37,40,37,37,37,37,37,37,37,37,37,37,37,37]
];

$(document).ready( function() {
  var ctx = document.getElementById("mapscreen-canvas").getContext("2d");
  ctx.scale(2, 2);
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;

  var player = new Player();
  var hero = new PlayerCharacter("mapsprites.png", 16, 24, 0, -8);

  hero.canCross = function(landType) {
    if ( landType == 36 || landType == 12 || landType == 13 || landType == 14 || landType == 15 || landType == 17 || landType == 40) {
      return false;
    } else {
      return true;
    }
  };
  hero.setSprite(0, 1);

  var frameCount = 0;
  hero.walkAnimation(function(deltaX, deltaY, frame) {
    // "this" refers to hero
    frameCount += 1;
    walkFrame = (Math.floor(frameCount / 3) % 2);
    // switch sprite every 3 animation frames
    if (deltaX < 0) {
      this.setSprite(6+walkFrame, 1);
    }
    if (deltaX > 0) {
      this.setSprite(2 +walkFrame, 1);
    }
    if (deltaY < 0) {
      this.setSprite(4+walkFrame, 1);
    }
    if (deltaY > 0) {
      this.setSprite(0+walkFrame, 1);
    }
  });

  player.addCharacter(hero);
  player.useScrollAnimation(5, 50);

  var mapScreen = new MapScreen(document.getElementById("mapscreen-canvas"), 17, 13, 16, 16);
  mapScreen.setScrollMargins({left: 8, top: 6, right: 8, bottom: 6});
  mapScreen.setTileOffset({x: -0.5, y: -0.5});

  var walker = new SmoothWalker(5, 50, function(frame, direction) {
    var delX, delY;
    switch (direction) {
    case DOWN_ARROW:
      delX = 0; delY = 1;
      break;
    case LEFT_ARROW:
      delX = -1; delY = 0;
      break;
    case UP_ARROW:
      delX = 0; delY = -1;
      break;
    case RIGHT_ARROW:
      delX = 1; delY = 0;
      break;
    }

    if (!player.busyMoving) {
      player.move(delX, delY);
    }
  });
  walker.startListening();

  var map = new Map(19, 25, mapData, "terrain.png");
  map.getTileForCode = function(mapCode) {
    return {x:mapCode, y:0};
  };

  map.onStep({x: 8, y: 17}, function(player, x, y) {
    $("#debug").html("You stepped on a town.");
  });

  map.onStep({landType: 39}, function(player, x, y) {
    $("#debug").html("You stepped on a hill.");
  });

  mapScreen.setNewDomain(map);
  player.enterMapScreen(mapScreen, 4, 4);
  mapScreen.render();
});
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
  /*var ctx = document.getElementById("mapscreen-canvas").getContext("2d");
  ctx.scale(2, 2);
  var img = new Image();
  img.onload = function() {
    var spriteOffsetX = 37 * 16;// + 0.4;
    var spriteOffsetY = 0;//0.5;
    var tilePixelsX = 16;
    var tilePixelsY = 16;
    for (var x = 0; x < 5; x++) {
    for (var y = 0; y < 5; y++) {
      ctx.drawImage(img,
                    spriteOffsetX,
                    spriteOffsetY,
                    (tilePixelsX),// - 1),
                    (tilePixelsY),// - 1),
                    x * tilePixelsX,
                    y * tilePixelsY,
                    tilePixelsX,
                    tilePixelsY);
    }
    }
  };
  img.src = "terrain.png";*/

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

  var walkFrame = 0;
  hero.onMove(function(deltaX, deltaY, reallyMoved) {
    if (deltaX < 0) {
      this.setSprite(6+ walkFrame, 1);
    }
    if (deltaX > 0) {
      this.setSprite(2 + walkFrame, 1);
    }
    if (deltaY < 0) {
      this.setSprite(4+walkFrame, 1);
    }
    if (deltaY > 0) {
      this.setSprite(0+walkFrame, 1);
    }
    walkFrame = (walkFrame + 1) %2;
  });

  player.addCharacter(hero);
  var mapScreen = new MapScreen(document.getElementById("mapscreen-canvas"), 17, 13, 16, 16);
  mapScreen.setScrollMargins({left: 8, top: 6, right: 8, bottom: 6});
  mapScreen.setTileOffset({x: -0.5, y: -0.5});

  var map = new Map(19, 25, mapData, "terrain.png");
  map.getTileForCode = function(mapCode) {
    return {x:mapCode, y:0};
  };

  map.onStep({x: 8, y: 17}, function(player, x, y) {
    $("#debug").html("You stepped on a town.");
  });



  mapScreen.setNewDomain(map);
  player.enterMapScreen(mapScreen, 4, 4);
  player.plotAll();
});
var mapData = [[34,34,34,35,35,35,36,36,36,37,4,3,3,3,3,3,3,3,3,3],
[36,36,36,34,34,34,35,35,35,38,25,28,28,28,28,28,28,28,28,29],
[7,9,5,8,9,5,8,5,8,39,25,28,28,28,33,33,33,33,33,33],
[7,0,7,0,0,7,0,7,0,0,25,28,28,32,24,24,24,24,24,24],
[4,4,4,4,4,4,4,4,4,4,25,28,28,32,24,27,2,27,2,27],
[1,1,1,1,1,1,1,1,1,1,25,28,28,32,24,2,0,0,1,1],
[0,0,0,0,0,0,0,0,0,0,25,28,28,32,24,27,0,0,1,41],
[0,0,0,0,0,0,0,0,0,0,25,28,28,32,24,2,0,0,1,1],
[4,4,4,4,4,4,4,4,4,4,25,28,28,32,24,27,0,0,1,1],
[26,0,0,0,0,0,0,0,4,4,25,28,28,32,24,2,27,2,27,2],
[0,0,0,0,0,0,0,0,4,4,26,26,26,26,26,26,26,26,26,24],
[1,1,1,1,1,1,1,12,4,4,4,4,4,4,4,4,4,4,4,4],
[3,3,3,2,1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
[4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,2,27,27],
[4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,27,27,27],
[4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,27,27,27],
[4,4,4,0,1,1,1,1,1,4,4,4,4,4,4,4,4,27,27,27],
[4,4,4,1,1,1,1,1,1,4,4,27,27,27,27,27,4,27,27,27],
[4,4,4,1,1,1,1,1,1,4,4,27,1,1,1,36,28,28,27,27],
[4,4,4,1,1,1,1,1,1,28,28,27,1,1,1,1,4,27,27,27]
];

$(document).ready( function() {
  var player = new Player();
  var hero = new PlayerCharacter("mapsprites.png", 16, 24, 0, -8);

  hero.canCross = function(landType) {
    if ( landType == 3 || landType == 4 || landType == 42) {
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
  var mapScreen = new MapScreen(document.getElementById("mapscreen-canvas"), 10, 10, 16, 16);

  var map = new Map(20, 20, mapData, "terrain.png");
  map.getTileForCode = function(mapCode) {
    return {x:mapCode, y:2};
  };

  mapScreen.setNewDomain(map);
  player.enterMapScreen(mapScreen, 4, 4);
  player.plotAll();
});
// Depends on having defined:
// EncounterManager, const STANDARD_OK_BUTTON

var pandaEncounter = new PointEncounter(7, 7, 50, "Aleksa's Land");
pandaEncounter.makeText = function( player ) {
  var pandaText = "<p>Hello, Kitty!</p>"
  + "<h1>I am the Kung Fu Panda!</h1>"
  + "<p><img src=\"/client/pics/panda01.jpg\">"
  + "<p>Your first quest is to find the <b>seven missing scrolls</b>"
  + " of <b>kung-fu wisdom</b>.</p><p>Do that and bring them back to me,"
  + " and then I will teach you how to do <b>Kung Fu</b>!</p>"
  + STANDARD_OK_BUTTON;
  return pandaText;
}

var ninjaEncounter = new RandomEncounter(1, 0.2, "Aleksa's Land");
ninjaEncounter.makeText = function( player ) {
  ninjaEncounter._playerRef = player;
  var ninjaText = "<h1>Look Out!  Ninjas!</h1> <img src=\"/client/pics/ninjas.gif\">"
  + "<p>A bunch of ninjas just jumped out of nowhere all of"
  + " a sudden and now they're getting all in your face!  <i>What are"
    + " you gonna do about it?</i></p>" + player.makeCommandMenu();
  return ninjaText;
};
ninjaEncounter.goToHq = function() {
  WorldMapManager.flipDomainByName( "Secret Ninja HQ" );
  ninjaEncounter._playerRef.setPos(5, 5);
  ninjaEncounter._playerRef.plot();
}
ninjaEncounter.responseHandler = function( choice ) {
  switch( choice ) {
  case "friend":
    return "<p>You act all cute, and the ninjas are like &quot;Oh it's just a cute "
	   + "kitty cat, there's no reason to hurt it&quot; and then they sneak "
           + "away and leave you alone again.</p>" + STANDARD_OK_BUTTON;
  case "fight":
    ninjaEncounter.goToHq();
    return "<p>You try to scratch the ninjas with your claws, but you don't know "
	   + "any <b>Kung Fu</b> yet, so the ninjas are way better at fighting "
	   + "than you.  They catch you in a bag and bring you back to "
      + "<b>Secret Ninja HQ</b> (headquarters).  Oh no!</p>" + STANDARD_OK_BUTTON;
    break;
  case "run":
    return "<p>You try to run away.  Nice try.</p>" + STANDARD_OK_BUTTON;
    break;
  case "sneak":
    return "<p>You try to sneak away.  Nice try.</p>" + STANDARD_OK_BUTTON;
    break;
  }
};


var treasureChestEncounter = new PointEncounter(19, 6, 41, "Aleksa's Land");
treasureChestEncounter._gotten = false;
treasureChestEncounter.makeText = function( player ) {
  this._playerRef = player;
  if (this._gotten) {
    return "<p>You already got this treasure chest. There's nothing else here.</p>" + STANDARD_OK_BUTTON;
  } else {
    var treasureText = "<h1>WOW!</h1>  <p>You found a treasure chest!  Now take your key and put it"
      + "in and let's see what you found!</p>" + player.makeItemMenu();
    return treasureText;
   }
};
treasureChestEncounter.responseHandler = function( choice ) {
  switch( choice ) {
  case "item:Small Key":
    this._playerRef.getItem( new Item(47, "Neon Emerald"));
    this._gotten = true;
    return "<p>You use your small key to open the treasure chest.</p><p>You got...</p>"
      + "<h1>The Neon Green Emerald!!!</h1>" + STANDARD_OK_BUTTON;
  }
};


var dasBoat = new PointEncounter( 15, 17, 46, "Aleksa's Land");
dasBoat.makeText = function( player ) {
  var boatItem = new Item( "magenta_boat.png", "Boat");
  boatItem.crossesLand = function( landType ) {
    return (landType == 4);
  }
  player.getItem( boatItem );
  dasBoat._x = -1;
  dasBoat._y = -1; // just to get it off the map
  var boatText = "<h1>WOW!</h1><p>You found a boat!  Now you can cross oceans.</p>" + STANDARD_OK_BUTTON;
  return boatText;
};

var treasureCaveIn = new DoorEncounter(2, 8, 4, 5, 8, 5);
var treasureCaveOut = new DoorEncounter(5, 9, 5, 3, 8, 4);

for( var caveNum = 1; caveNum < 10; caveNum++) {
  var sameCaveIn = new DoorEncounter(10, caveNum, 3, 0, 3, 6);
  EncounterManager.registerEncounter( sameCaveIn );
}

var sameCaveOutLeft = new DoorEncounter(0, 3, 6, 9, 2, 3);
var sameCaveOutRight = new DoorEncounter(9, 6, 6, 11, 2, 3);

// make the name of the domain an arg to registerEncounter instead of an
// arg to the encounter constructor?
var reg = EncounterManager.registerEncounter;
reg( pandaEncounter );
reg( ninjaEncounter );
reg( treasureChestEncounter );

reg( treasureCaveIn );
reg( treasureCaveOut );

reg( sameCaveOutLeft );
reg( sameCaveOutRight );

reg( dasBoat );

//path out of ninja lair
reg( new DoorEncounter(0, 4, "Secret Ninja HQ", 15, 18, "Aleksa's Land"));

//volcano that leads to jono's land

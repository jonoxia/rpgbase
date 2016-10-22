describe("CSS Menu implementation", function() {

  function BareBonesMenuSystem(htmlElem, width, height) {
    this._init(htmlElem, null, width, height);
  };
  MenuSystemMixin(BareBonesMenuSystem.prototype);

  function StubPC(name, maxHP) {
    this.name = name;
    this.hp = maxHP;
  };
  StubPC.prototype = {
    getStatDisplay: function() {
      return "<p><b>" + this.name + "<br>" + this.hp + " / " + this.hp + "</b></p>";
    }
  };
  
  var menuSystem;
  
  beforeEach(function() {
    
    var htmlElem = $("#menusystem-base");
    menuSystem = new BareBonesMenuSystem(htmlElem, 1024, 768);

    var stubPlayer = {
      getParty: function() {
        return [ new StubPC("Alice", 45),
                 new StubPC("Bob", 50),
                 new StubPC("Carrie", 38)
               ];
      },
    };
    menuSystem.open(stubPlayer);
  });

  afterEach(function() {
    menuSystem.close();
  });

  it("Should scale down width/height/padding/borders correctly", function() {
    menuSystem.setMenuPositions({ cssBorderWidth: 4,
                                  cssPadding: 20 });
    menuSystem._calculatedScale = 0.5; // TODO there's no public interface for
    // setting _calculatedScale on a menu system. add one?

    var menu1 = menuSystem.makeMenu();
    menuSystem.pushMenu(menu1);
    $("#menusystem-base div").css("border-style", "solid");
    // if we don't set a border then the width is always 0, which throws off the math
    menu1.setOuterDimensions(400, 300);
    // Currently properties like border width and padding ONLY get set when we
    // explicitly call setOuterDimensions. Maybe make this automatic?

    // Also, currently setOuterDimensions can only be called AFTER pushMenu which
    // seems weird and wrong
    menu1.addCommand("Do the thing", function() {});

    expect(menu1.parentTag.css("border-width")).toEqual("2px");
    expect(menu1.parentTag.css("padding")).toEqual("10px");
    // the outer width and outer height should be what we set times the scale:
    expect(menu1.parentTag.outerWidth()).toEqual(200);
    expect(menu1.parentTag.outerHeight()).toEqual(150);
  });

  it("Should scale down font size correctly", function() {
    menuSystem.setMenuPositions({ cssFontSize: 26 });
    menuSystem._calculatedScale = 0.5;
    
    // check font size in menu:
    var menu1 = menuSystem.makeMenu();
    // put a command in the menu so we have some text:
    menu1.addCommand("Do the thing", function() {});
    menuSystem.pushMenu(menu1);
    expect(menu1.parentTag.find("td").css("font-size")).toEqual("13pt");

    // check font size in message:
    menuSystem.showMsg("Hey there everybody");
    expect($(".msg-display").css("font-size")).toEqual("13pt");

    // check font size in stats boxen:
    menuSystem.showPartyStats();
    $("div.stats").each(function() {
      expect($(this).css("font-size")).toEqual("13pt");
    });
    
  });

  it("Should offset each menu in the stack by pixels specified", function() {
    menuSystem.setMenuPositions({ menuLeft: 500,
                                  menuTop: 400,
                                  menuXOffset: 50,
                                  menuYOffset: 40});
    var menu1 = menuSystem.makeMenu();
    menuSystem.pushMenu(menu1);
    expect(menu1.getPos().x).toEqual(500);
    expect(menu1.getPos().y).toEqual(400);

    var menu2 = menuSystem.makeMenu();
    menuSystem.pushMenu(menu2);
    expect(menu2.getPos().x).toEqual(550);
    expect(menu2.getPos().y).toEqual(440);

    var menu3 = menuSystem.makeMenu();
    menuSystem.pushMenu(menu3);
    expect(menu3.getPos().x).toEqual(600);
    expect(menu3.getPos().y).toEqual(480);
  });

  it("Should scale down menu positions/offsets", function() {
    menuSystem.setMenuPositions({ menuLeft: 500,
                                  menuTop: 400,
                                  menuXOffset: 50,
                                  menuYOffset: 40});
    menuSystem._calculatedScale = 0.5;
    
    var menu1 = menuSystem.makeMenu();
    menuSystem.pushMenu(menu1);
    expect(menu1.getPos().x).toEqual(250);
    expect(menu1.getPos().y).toEqual(200);

    var menu2 = menuSystem.makeMenu();
    menuSystem.pushMenu(menu2);
    expect(menu2.getPos().x).toEqual(275);
    expect(menu2.getPos().y).toEqual(220);

    var menu3 = menuSystem.makeMenu();
    menuSystem.pushMenu(menu3);
    expect(menu3.getPos().x).toEqual(300);
    expect(menu3.getPos().y).toEqual(240);
  });

  it("Should offset each PC's stats window by pixels specified", function() {
    menuSystem.setMenuPositions({ statsLeft: 60,
                                  statsTop: 500,
                                  statsXOffset: 100,
                                  statsYOffset: 0});
    menuSystem.showPartyStats();
    var statsBoxes = $("div.stats");
    expect(statsBoxes.length).toEqual(3);
    expect($(statsBoxes[0]).html()).toContain("Alice");
    expect($(statsBoxes[0]).offset().left).toEqual(60);
    expect($(statsBoxes[0]).offset().top).toEqual(500);
    expect($(statsBoxes[1]).html()).toContain("Bob");
    expect($(statsBoxes[1]).offset().left).toEqual(160);
    expect($(statsBoxes[1]).offset().top).toEqual(500);
    expect($(statsBoxes[2]).html()).toContain("Carrie");
    expect($(statsBoxes[2]).offset().left).toEqual(260);
    expect($(statsBoxes[2]).offset().top).toEqual(500);

  });

  it("Should scale down stats window positions/offsets", function() {
    menuSystem.setMenuPositions({ statsLeft: 60,
                                  statsTop: 500,
                                  statsXOffset: 100,
                                  statsYOffset: 0});
    menuSystem._calculatedScale = 0.5;
    menuSystem.showPartyStats();
    var statsBoxes = $("div.stats");
    expect($(statsBoxes[0]).offset().left).toEqual(30);
    expect($(statsBoxes[0]).offset().top).toEqual(250);
    expect($(statsBoxes[1]).offset().left).toEqual(80);
    expect($(statsBoxes[1]).offset().top).toEqual(250);
    expect($(statsBoxes[2]).offset().left).toEqual(130);
    expect($(statsBoxes[2]).offset().top).toEqual(250);
  });


  it("Should display fixed text boxes in the passive window list", function() {
    // there's a this._fixedDisplayBoxes but it currently works only for canvas
    // menu impl.
  });

  it("Should set menus/stat boxes width/height if given", function() {

  });

});

// TODO a suite for input logic -- making sure the right menu or scrollingTextBox
// gets the keyboard input, make sure we can't exit if exitFreely is set to false,
// make sure open callbacks and close callbacks get called (or events fired) etc.

// if there is a root menu, it should open when you call menuSystem.open
// the resetPerPC being set to true/false and how that affects menu positioning

// test all methods of MenuSystemMixin:
// menuFromCmdSet
// open/close
// makeMenu
// makeScrollingTextBox
// makeFixedTextBox
// pushMenu
// popMenu
// returnToRoot
// emptyMenuStack
// hide
// onOpen, onClose
// showMsg / clearMsg
// scrollText
// chooseOne
// chooseCharacter
// showPartyStats / hidePartyStats
// yesOrNo
// handleKey
// setMenuPositions
// saveStackDepth
// restoreStackDepth
// showPartyResources / hidePartyResources
// getHilitedCmd
// getFontSize

// for canvas menus only:
// drawCanvasPartyResources
// drawCanvasPartyStats
// drawCanvasPartyResources
// drawCanvasMenus

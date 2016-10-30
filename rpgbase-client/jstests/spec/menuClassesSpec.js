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


describe("CSS Menu implementation", function() {

  var menuSystem;
  var stubPlayer = {
      getParty: function() {
        return [ new StubPC("Alice", 45),
                 new StubPC("Bob", 50),
                 new StubPC("Carrie", 38)
               ];
      },
  };
  
  beforeEach(function() {
    var htmlElem = $("#menusystem-base");
    menuSystem = new BareBonesMenuSystem(htmlElem, 1024, 768);

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


  it("Should display passive status boxes", function() {
    // there's a this._fixedDisplayBoxes but it currently works only for canvas
    // menu impl.

    var someStatus = menuSystem.makeFixedTextBox(["Status: single"]);
    menuSystem.addStatusBox(someStatus, "some");
    
    menuSystem.showStatusBoxes();

    var divs = $("#menusystem-base div");
    expect(divs.length).toEqual(2); // the first is msg-display
    var statusDiv = $(divs[1]);
    expect(statusDiv.html()).toEqual("Status: single");
    expect(statusDiv.css("display")).toEqual("block"); // is shown

    menuSystem.hideStatusBoxes();
    var divs = $("#menusystem-base div");
    expect(divs.length).toEqual(1); // the div should be gone

    menuSystem.showStatusBoxes(); // even if i show multiple times,
    menuSystem.showStatusBoxes(); // there should not be multiple divs
    var divs = $("#menusystem-base div");
    expect(divs.length).toEqual(2); // the first is msg-display
    statusDiv = $(divs[1]);
    expect(statusDiv.html()).toEqual("Status: single");
    expect(statusDiv.css("display")).toEqual("block");
    
    // close currently calls hidePartyStats and hidePartyResources
    // it's inconsistent -- some things remove the html tags, others just hide them
  });

  it("Should save status boxes across menu open/close sessions", function() {
    var someStatus = menuSystem.makeFixedTextBox(["Status: single"]);
    menuSystem.addStatusBox(someStatus, "some");
    
    menuSystem.showStatusBoxes();

    var divs = $("#menusystem-base div");
    expect(divs.length).toEqual(2); // the first is msg-display
    var statusDiv = $(divs[1]); // TODO a more convenient way to gain access?
    expect(statusDiv.html()).toEqual("Status: single");
    expect(statusDiv.css("display")).toEqual("block"); // is shown

    // If we open a DIFFERENT menu system, we don't want to
    // see this one's status boxes!!! that means we need to hideStatusBoxes on close:
    menuSystem.close();
    // after menu system is closed, all menu system divs should be hidden:
    expect( $("#menusystem-base").css("display") ).toEqual("none");
    expect($("#menusystem-base div").length).toEqual(1);

    menuSystem.open(stubPlayer);
    // Thing I'm not sure about: should it be open when we open the menu system
    // or do we need to call showStatusBoxes again?
    // maybe it should remember whether they were shown or hidden last time and
    // re-open with the same status?
    menuSystem.showStatusBoxes();
    var divs = $("#menusystem-base div");
    expect(divs.length).toEqual(2);
    statusDiv = $(divs[1]);
    expect(statusDiv.html()).toEqual("Status: single");
    expect(statusDiv.css("display")).toEqual("block");
  });
  
  it("Should update contents of status boxes when refresh is called", function() {
    // to refresh contents of all status boxes, if those boxes have a generate
    // contents method
    
    var customStatus = menuSystem.makeFixedTextBox();
    var externalVar = 3;
    
    customStatus._generateHtml = function() {
      return "<p>" + externalVar + "</p>";
    };
    menuSystem.addStatusBox(customStatus, "custom");
    menuSystem.showStatusBoxes();

    var divs = $("#menusystem-base div");
    customDiv = $(divs[1]);
    expect(customDiv.html()).toEqual("<p>3</p>");

    externalVar = 7;

    menuSystem.refreshStatusBoxes();
    divs = $("#menusystem-base div");
    customDiv = $(divs[1]);
    expect(customDiv.html()).toEqual("<p>7</p>");
    // assert that we can override the ._generateHtml() of our fixed text box
    // and it gets called both when we display and when we refresh.
  });

  it("Should never give keyboard focus to status boxes", function() {
    // make sure that status boxes never get keyboard focus; they don't
    // go on the menu stack.
  });

  it("Should set menus/stat boxes width/height if given", function() {

  });

  it("Should show/hide status boxes by name if given", function() {
    
    var statsBox = menuSystem.makeFixedTextBox();
    var resourcesBox = menuSystem.makeFixedTextBox();
    var portraitBox = menuSystem.makeFixedTextBox();
    
    statsBox._generateHtml = function() {
      return "<p>Stats</p>";
    };
    resourcesBox._generateHtml = function() {
      return "<p>Resources</p>";
        };
    portraitBox._generateHtml = function() {
      return "<p>Portrait</p>";
    };
    
    menuSystem.addStatusBox(statsBox, "stats");
    menuSystem.addStatusBox(resourcesBox, "resources");
    menuSystem.addStatusBox(portraitBox, "portrait");
    
    menuSystem.showStatusBoxes(); // should show all
    var divs = $("#menusystem-base div");
    expect(divs.length).toEqual(4);
    expect(divs.eq(1).html()).toEqual("<p>Stats</p>");
    expect(divs.eq(2).html()).toEqual("<p>Resources</p>");
    expect(divs.eq(3).html()).toEqual("<p>Portrait</p>");

    menuSystem.hideStatusBoxes(); // should hide all
    divs = $("#menusystem-base div");
    expect(divs.length).toEqual(1);

    menuSystem.showStatusBoxes("portrait");
    divs = $("#menusystem-base div");
    expect(divs.length).toEqual(2);
    expect(divs.eq(1).html()).toEqual("<p>Portrait</p>");

    menuSystem.showStatusBoxes("resources"); // should now see portrait and resources
    divs = $("#menusystem-base div");
    expect(divs.length).toEqual(3);
    expect(divs.eq(1).html()).toEqual("<p>Portrait</p>");
    expect(divs.eq(2).html()).toEqual("<p>Resources</p>");

    menuSystem.showStatusBoxes("stats"); // should now see all 3
    divs = $("#menusystem-base div");
    expect(divs.length).toEqual(4);
    expect(divs.eq(1).html()).toEqual("<p>Portrait</p>");
    expect(divs.eq(2).html()).toEqual("<p>Resources</p>");
    expect(divs.eq(3).html()).toEqual("<p>Stats</p>");

    menuSystem.hideStatusBoxes("stats");
    divs = $("#menusystem-base div");
    expect(divs.length).toEqual(3);
    expect(divs.eq(1).html()).toEqual("<p>Portrait</p>");
    expect(divs.eq(2).html()).toEqual("<p>Resources</p>");

    menuSystem.hideStatusBoxes("resources");
    divs = $("#menusystem-base div");
    expect(divs.length).toEqual(2);
    expect(divs.eq(1).html()).toEqual("<p>Portrait</p>");

    menuSystem.hideStatusBoxes("portrait");
    divs = $("#menusystem-base div");
    expect(divs.length).toEqual(1);

    // maybe have a convenience function which is like
    // menuSystem.addStatusBox(name, generateHtmlCallback)
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

// Interaction between two menu systems -- make sure one doesn't leave any junk
// lying around that shows up when we open the other one.

describe("Diagloglog", function() {
  var stubPlayer = {
    getParty: function() {
      return [ new StubPC("Alice", 45),
               new StubPC("Bob", 50),
               new StubPC("Carrie", 38)
             ];
    },
  };
  var dialoglog;
  
  beforeEach(function() {
    var htmlElem = $("#menusystem-base");
    dialoglog = new Dialoglog(htmlElem, null, 1024, 768);
    dialoglog.open(stubPlayer);
  });

  afterEach(function() {
    dialoglog.close();
  });

  it("Should advance multipartTextDisplay with each key press", function() {
    // set up a dialoglog with multiple text segments
    // process key presses repeatedly
    // assert that correct text is shown after each one
    
    dialoglog.multipartTextDisplay([{img: null, text: "Hello there im the king"},
                                    {img: null, text: "No image for this one"},
                                    {img: null, text: "Sure i'll accept your quest"}
                                   ]);
    // get html of message box...
    var topMenu = dialoglog.getTopMenu();
    expect(topMenu.parentTag.html()).toContain("Hello there im the king");
    dialoglog.handleKey(CONFIRM_BUTTON);
    topMenu = dialoglog.getTopMenu();
    expect(topMenu.parentTag.html()).toContain("No image for this one");
    dialoglog.handleKey(CONFIRM_BUTTON);
    topMenu = dialoglog.getTopMenu();
    expect(topMenu.parentTag.html()).toContain("Sure i'll accept your quest");
    dialoglog.handleKey(CONFIRM_BUTTON);
    // Expect dialoglog to be closed after that last button press:
    topMenu = dialoglog.getTopMenu();
    expect(topMenu).toBe(null);
  });

  it("Should display correct img alongside each line of dialog", function() {
    dialoglog.multipartTextDisplay([
      {img: "king.jpg", text: "Hello there im the king"},
      {img: null, text: "No image for this one"},
      {img: "hero.jpg", text: "Sure i'll accept your quest"}
    ]);
    
    var imgElem = $("#menusystem-base").find("img");
    expect(imgElem.attr("src")).toEqual("king.jpg");
    dialoglog.handleKey(CONFIRM_BUTTON);
    imgElem = $("#menusystem-base").find("img");
    expect(imgElem.length).toEqual(0); // no img should be displayed
    dialoglog.handleKey(CONFIRM_BUTTON);
    imgElem = $("#menusystem-base").find("img");
    expect(imgElem.attr("src")).toEqual("hero.jpg");
    dialoglog.handleKey(CONFIRM_BUTTON);
  });

  it("Should position img and msg correctly", function() {
    // dialoglog should take positioning arguments that set position
    // and size of the text box and the portrait box.
    dialoglog.setMenuPositions({ imgLeft: 60,
                                 imgTop: 500,
                                 imgWidth: 180,
                                 imgHeight: 180,
                                 msgLeft: 100,
                                 msgTop: 650 });
    dialoglog.multipartTextDisplay([
      {img: "king.jpg", text: "Hello there im the king"},
    ]);
    var topMenu = dialoglog.getTopMenu();
    expect(topMenu.parentTag.offset().left).toEqual(100);
    expect(topMenu.parentTag.offset().top).toEqual(650);
    
    var imgElem = $("#menusystem-base").find("img");
    expect(imgElem.parent().offset().left).toEqual(60);
    expect(imgElem.parent().offset().top).toEqual(500);
    expect(imgElem.outerWidth()).toEqual(180);
    expect(imgElem.outerHeight()).toEqual(180);
  });

  it("Should scale down img and msg correctly", function() {
    dialoglog.setMenuPositions({ imgLeft: 60,
                                 imgTop: 500,
                                 imgWidth: 180,
                                 imgHeight: 180,
                                 msgLeft: 100,
                                 msgTop: 650});
    dialoglog._calculatedScale = 0.5;
    dialoglog.multipartTextDisplay([
      {img: "king.jpg", text: "Hello there im the king"},
    ]);
    // Positioning should be half:
    var topMenu = dialoglog.getTopMenu();
    expect(topMenu.parentTag.offset().left).toEqual(50);
    expect(topMenu.parentTag.offset().top).toEqual(325);
    
    var imgElem = $("#menusystem-base").find("img");
    expect(imgElem.parent().offset().left).toEqual(30);
    expect(imgElem.parent().offset().top).toEqual(250);

    // dimensions should be half:
    expect(imgElem.outerWidth()).toEqual(90);
    expect(imgElem.outerWidth()).toEqual(90);
  });

  // bugs that tests did not catch:
  //  -- menu system exited before all conversation was done
  //  -- talking to same npc again resulted in empty conversation
  //  -- multiple copies of portrait window created
  //  -- messages from previous conversation hanging around
  //  -- extra keypress required after windows are all closed to actually exit

  it("Should scroll on keypress if line of dialog is very long", function() {
    var longText = "It's not like anything seen alive on Earth today: it's the size of large turkey, but with a face like a Jim Henson puppet. The head is a shoe-box with eyes, the Frankensteinian flatness on top accentuated by horns sticking out horizontally from each cheek.";

    dialoglog.multipartTextDisplay([
      {img: "king.jpg", text: longText},
      {img: null, text: "No image for this one"},
      {img: "hero.jpg", text: "Sure i'll accept your quest"}
    ]);

    var topMenu = dialoglog.getTopMenu();
    expect(topMenu.parentTag.html()).toEqual(
      "It's not like anything seen<br>alive on Earth today: it's the<br>size of large turkey, but with a");
    dialoglog.handleKey(CONFIRM_BUTTON);
    expect(topMenu.parentTag.html()).toEqual(
      "alive on Earth today: it's the<br>size of large turkey, but with a<br>face like a Jim Henson puppet.");
    dialoglog.handleKey(CONFIRM_BUTTON);
    expect(topMenu.parentTag.html()).toEqual(
      "size of large turkey, but with a<br>face like a Jim Henson puppet.<br>The head is a shoe-box with");
    dialoglog.handleKey(CONFIRM_BUTTON);
    expect(topMenu.parentTag.html()).toEqual(
      "face like a Jim Henson puppet.<br>The head is a shoe-box with<br>eyes, the Frankensteinian");
    dialoglog.handleKey(CONFIRM_BUTTON);
    expect(topMenu.parentTag.html()).toEqual(
      "The head is a shoe-box with<br>eyes, the Frankensteinian<br>flatness on top accentuated by");
    dialoglog.handleKey(CONFIRM_BUTTON);
    expect(topMenu.parentTag.html()).toEqual(
      "eyes, the Frankensteinian<br>flatness on top accentuated by<br>horns sticking out horizontally");
    dialoglog.handleKey(CONFIRM_BUTTON);
    expect(topMenu.parentTag.html()).toEqual(
      "flatness on top accentuated by<br>horns sticking out horizontally<br>from each cheek.");
    dialoglog.handleKey(CONFIRM_BUTTON);
    topMenu = dialoglog.getTopMenu();
    expect(topMenu.parentTag.html()).toEqual("No image for this one");
    dialoglog.handleKey(CONFIRM_BUTTON);
    topMenu = dialoglog.getTopMenu();
    expect(topMenu.parentTag.html()).toEqual("Sure i'll accept your quest");


  });
});

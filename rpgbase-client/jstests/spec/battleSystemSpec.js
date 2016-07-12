/* Stubs for battlesystem test:
 * Stub Animator / Animation object (which just finishes instantly)
 * Stub Player object */


function StubPC(name) {
  this.name = name;
  this.battlerInit();
  //this.gameEventSubscriberInit();
}
StubPC.prototype = {
  getStatDisplay: function() {
    return "";
  },
  customizeCmds: function(defaultCmdSet) {
    return defaultCmdSet;
  }
};
BattlerMixin.call(StubPC.prototype);
//GameEventSubscriberMixin(StubPC.prototype);


describe("Battle system", function() {
  var fight;
  var bs;
  var stubPlayer;
  var sworm;
  var eventLog;
  var g_eventService;

  beforeEach(function() {
    fight = new BatCmd(
      {target: "random_enemy", name: "Fight",
       effect: function(system, user, target) {
         target.setStat("hp", target.getStat("hp") - 1);
         eventLog.push(user.name + " fights " + target.name);
         if (target.getStat("hp") <= 0) {
           eventLog.push(target.name + " is slain.");
           system.removeFromBattle(target);
         }
       }
      });

    // TODO as battle system currently stands, defaultCmdSet is actually not optional!!
    var defaultCmdSet = new BattleCommandSet();
    defaultCmdSet.add("Fight", fight);

    g_eventService = new GameEventService();
    bs = new BattleSystem($("#test-menus"), $("#test-canvas")[0], g_eventService, {
      defaultCmdSet: defaultCmdSet,
      frameDelay: 10 // make it real fast
    });
    bs.onDrawBattle(function() {}); // don't draw anything

    var hero = new StubPC("Hero");
    hero.setStats({"hp": 10});
    stubPlayer = {
      getParty: function() {
        return [hero];
      },
      marchInOrder: function() {}
    };

    // we're using a null image -- override any function where it would try to draw it
    sworm = new MonsterType(null, "sworm", {"hp": 1}, [fight]);

    eventLog = [];


  });

  afterEach(function() {
    bs.close(); // mostly to stop the battle system animator if it's running
  });

  it("Should fire messages for start/end of battle/round", function() {

    bs.onStartBattle(function(eventData) {
      eventLog.push("Battle started.");
    });
    bs.onBeginRound(function(eventData) {
      eventLog.push("Round started.");
    });
    bs.onEndRound(function(eventData) {
      eventLog.push("Round ended.");
    });
    bs.onEndBattle(function(eventData) {
      eventLog.push("Hero won battle.");
    });

    bs.startBattle(stubPlayer, {number: 1, type: sworm}, 0); // 0 is land type, don't care

    expect(bs.monsters.length).toEqual(1);

    // pretend the player chose "fight" (Not that they have any other choice)
    bs.choosePCCommand(stubPlayer.getParty()[0], fight, "random_monster");
    // this will trigger "fightOneRound" which should trigger a beginRoundCallback

    expect(eventLog.length).toEqual(6);
    expect(eventLog[0]).toEqual("Battle started.");
    expect(eventLog[1]).toEqual("Round started.");
    expect(eventLog[2]).toEqual("Hero fights sworm A");
    expect(eventLog[3]).toEqual("sworm A is slain.");
    expect(eventLog[4]).toEqual("Hero won battle.");
    expect(eventLog[5]).toEqual("Round ended.");
    // interesting that roundEnded still gets called even if hero wins first...
  });

  it("Should order attacks according to initiative callback", function() {

    bs.onRollInitiative(function(party, monsters) {
      // have monsters act before party this time:
      return monsters.concat(party);
    });

    bs.startBattle(stubPlayer, {number: 1, type: sworm}, 0); // 0 is land type, don't care

    // pretend the player chose "fight" (Not that they have any other choice)
    bs.choosePCCommand(stubPlayer.getParty()[0], fight, "random_monster");
    // this will trigger "fightOneRound" which should trigger a beginRoundCallback

    expect(eventLog.length).toEqual(3);
    expect(eventLog[0]).toEqual("sworm A fights Hero");
    expect(eventLog[1]).toEqual("Hero fights sworm A");
    expect(eventLog[2]).toEqual("sworm A is slain.");

  });

  it("Should obey choice of targets by player", function() {
    // this also serves as a test of multi-round battle:

    bs.startBattle(stubPlayer, {number: 2, type: sworm}, 0); // 0 is land type, don't care

    var target = bs.monsters[1]; // non-random choice of monster
    bs.choosePCCommand(stubPlayer.getParty()[0], fight, target);
    // this will trigger "fightOneRound" which should trigger a beginRoundCallback

    expect(eventLog.length).toEqual(3);
    expect(eventLog[0]).toEqual("Hero fights sworm B");
    expect(eventLog[1]).toEqual("sworm B is slain.");
    expect(eventLog[2]).toEqual("sworm A fights Hero");
    // This also tests that we skip sworm B's attack since it was slain before
    // its turn came
    expect(stubPlayer.getParty()[0].getStat("hp")).toEqual(9); // i took 1 damage

    // now it's waiting for my next command
    target = bs.monsters[0]; // non-random choice of monster
    bs.choosePCCommand(stubPlayer.getParty()[0], fight, target);
    expect(eventLog.length).toEqual(5);
    expect(eventLog[3]).toEqual("Hero fights sworm A");
    expect(eventLog[4]).toEqual("sworm A is slain.");
  });

  it("Should retarget your attack if original target died before your turn", function() {
    var hero = new StubPC("Hero");
    hero.setStats({"hp": 10});
    var sidekick = new StubPC("Sidekick");
    sidekick.setStats({"hp": 10});
    stubPlayer.getParty = function() { return [hero, sidekick] };


    // watch who receives the "targeted" event:
    bs.subscribeEvent(bs.eventService, "attack-targeted", function(eventData) {
      eventLog.push(eventData.source.name + " targets " + eventData.target.name);
    });


    bs.startBattle(stubPlayer, {number: 2, type: sworm}, 0); // 0 is land type, don't care

    // both attack sworm A:
    bs.choosePCCommand(stubPlayer.getParty()[0], fight, bs.monsters[0]);
    bs.choosePCCommand(stubPlayer.getParty()[1], fight, bs.monsters[0]);
    
    // locking these both in should start a round...
    expect(eventLog.length).toEqual(6);

    expect(eventLog[0]).toEqual("Hero targets sworm A");
    expect(eventLog[1]).toEqual("Hero fights sworm A");
    expect(eventLog[2]).toEqual("sworm A is slain.");
    expect(eventLog[3]).toEqual("Sidekick targets sworm B"); // make target event is for B
    expect(eventLog[4]).toEqual("Sidekick fights sworm B");
    expect(eventLog[5]).toEqual("sworm B is slain.");

    // But if i turn off "autoRetarget" (on by default) then this won't happen:

    bs._autoRetarget = false;
    eventLog = [];
    bs.startBattle(stubPlayer, {number: 2, type: sworm}, 0); // 0 is land type, don't care

    // both attack sworm A:
    bs.choosePCCommand(stubPlayer.getParty()[0], fight, bs.monsters[0]);
    bs.choosePCCommand(stubPlayer.getParty()[1], fight, bs.monsters[0]);
    
    // the second attack, with its target already gone, whiffs, so Sidekick doens't act:
    expect(eventLog.length).toEqual(5);
    expect(eventLog[0]).toEqual("Hero targets sworm A");
    expect(eventLog[1]).toEqual("Hero fights sworm A");
    expect(eventLog[2]).toEqual("sworm A is slain.");
    expect(eventLog[3]).toContain("sworm B targets");
    expect(eventLog[4]).toContain("sworm B fights"); // don't care which of us he fights
  });


  it("Should play queued animation before processing next event", function() {
    // gonna have to use the async jasmine features for this one i think.
    
    // we want attack animation to show before effect of attack is applied
    runs(function() {
      var hero = stubPlayer.getParty()[0];

      hero.subscribeEvent(bs.eventService, "attack-targeted", function(eventData) {
        if (eventData.source === this) {
          // When i target an attack:
          var anim = new Animation(3);
          anim.onFrame(function(frameNo) {
            eventLog.push("Attack animation frame number " + frameNo);
          });
          console.log("I AM QUEUEING AN ANIMATION");
          bs.queueAnimation(anim);
        }
        return true;
      });

      bs.startBattle(stubPlayer, {number: 1, type: sworm}, 0); // 0 is land type, don't care

      bs.choosePCCommand(stubPlayer.getParty()[0], fight, bs.monsters[0]);
    });

    waits(1000);
    
    runs(function() {
      expect(eventLog.length).toEqual(5);
      //expect(eventLog[0]).toEqual("Hero targets sworm A");
      expect(eventLog[0]).toEqual("Attack animation frame number 1");
      expect(eventLog[1]).toEqual("Attack animation frame number 2");
      expect(eventLog[2]).toEqual("Attack animation frame number 3");
      expect(eventLog[3]).toEqual("Hero fights sworm A");
      expect(eventLog[4]).toEqual("sworm A is slain.");
    });
  });

  it("Should queue up multiple animations and play them all in order", function() {
    // gonna have to use the async jasmine features for this one i think.
    
    // we want attack animation to show before effect of attack is applied
    runs(function() {
      var hero = stubPlayer.getParty()[0];

      var animatedFight = new BatCmd({
        target: "random_enemy", name: "Animated Fight",
        effect: function(system, user, target) {
          var anim = new Animation(3);
          eventLog.push(user.name + " uses animated fight");
          anim.onFrame(function(frameNo) {
            eventLog.push("Attack animation frame number " + frameNo);
          });
          system.queueAnimation(anim);
          system.eventService.stackGameEvent("damage", {source: user, target: target,
                                                        amount: 1});
        }
      });
                                     
      bs.eventService.subscribeClass(Monster, "damage", function(eventData) {
        if (eventData.target === this) {
          this.setStat("hp", this.getStat("hp") - eventData.amount);
          eventLog.push(this.name + " takes " + eventData.amount + " damage");
          
          var anim = new Animation(3);
          anim.onFrame(function(frameNo) {
            eventLog.push("Damage animation frame number " + frameNo);
          });
          bs.queueAnimation(anim);

          if (this.getStat("hp") <= 0) {
            var deathAnim = new Animation(3);
            deathAnim.onFrame(function(frameNo) {
              eventLog.push("Death animation frame number " + frameNo);
            });
            bs.queueAnimation(deathAnim);

            bs.removeFromBattle(this);
          }
        }
      });

      bs.onEndRound(function(eventData) {
        eventLog.push("Round ended."); 
        // just to make sure this happens after all animations
      });
      
      bs.startBattle(stubPlayer, {number: 1, type: sworm}, 0); // 0 is land type, don't care

      bs.choosePCCommand(stubPlayer.getParty()[0], animatedFight, bs.monsters[0]);
    });

    waits(1000);
    
    runs(function() {
      expect(eventLog.length).toEqual(12);
      expect(eventLog[0]).toEqual("Hero uses animated fight");
      expect(eventLog[1]).toEqual("Attack animation frame number 1");
      expect(eventLog[2]).toEqual("Attack animation frame number 2");
      expect(eventLog[3]).toEqual("Attack animation frame number 3");
      expect(eventLog[4]).toEqual("sworm A takes 1 damage");
      expect(eventLog[5]).toEqual("Damage animation frame number 1");
      expect(eventLog[6]).toEqual("Damage animation frame number 2");
      expect(eventLog[7]).toEqual("Damage animation frame number 3");
      expect(eventLog[8]).toEqual("Death animation frame number 1");
      expect(eventLog[9]).toEqual("Death animation frame number 2");
      expect(eventLog[10]).toEqual("Death animation frame number 3");
      expect(eventLog[11]).toEqual("Round ended.");

      bs.eventService.unsubscribeClass(Monster);
    });
  });
  it("Should play any startBattle animation before starting the battle", function() {
    // use showMenuCallback

    runs(function() {
      bs.onStartBattle(function(eventData) {
        var anim = new Animation(3);
        anim.onFrame(function(frameNo) {
          eventLog.push("Start battle animation frame number " + frameNo);
        });
        this.queueAnimation(anim);
      });
      
      bs.onShowMenu(function(eventData) {
        eventLog.push("Menu shown for " + eventData.pc.name);
      });

      bs.startBattle(stubPlayer, {number: 1, type: sworm}, 0);
    });

    waits(1000);
    
    runs(function() {
      expect(eventLog.length).toEqual(4);
      expect(eventLog[0]).toEqual("Start battle animation frame number 1");
      expect(eventLog[1]).toEqual("Start battle animation frame number 2");
      expect(eventLog[2]).toEqual("Start battle animation frame number 3");
      expect(eventLog[3]).toEqual("Menu shown for Hero");
    });
  });

  it("Should scroll any end-of-battle text given by end-battle handlers", function() {

    bs.subscribeEvent(bs.eventService, "end-battle", function(eventData) {
      eventLog.push("Battle ended with result: " + eventData.resolution);
      if (eventData.resolution == "win") {
        eventData.battle.addEndBattleText("You got 1 EXP and 1 Gold!");
      }
    });

    bs.onClose(function() {
      // TODO the onClose handler doesn't use the event service yet -- rewrite it to
      // do so (?)
      eventLog.push("Battle UI closed.");
    });

    bs.startBattle(stubPlayer, {number: 1, type: sworm}, 0);
    bs.choosePCCommand(stubPlayer.getParty()[0], fight, "random_monster");

    expect(eventLog.length).toEqual(3);
    expect(eventLog[0]).toEqual("Hero fights sworm A");
    expect(eventLog[1]).toEqual("sworm A is slain.");
    expect(eventLog[2]).toEqual("Battle ended with result: win");

    // now check what's in the end-battle text:
    expect($(".msg-display").text()).toEqual("You got 1 EXP and 1 Gold!");

    // then process some button presses to scroll through the end text...
    // make sure we get the battle system onClose message when the text is done scrolling.
    bs.handleKey(CONFIRM_BUTTON);
    expect(eventLog.length).toEqual(4);
    expect(eventLog[0]).toEqual("Hero fights sworm A");
    expect(eventLog[1]).toEqual("sworm A is slain.");
    expect(eventLog[2]).toEqual("Battle ended with result: win");
    expect(eventLog[3]).toEqual("Battle UI closed.");
  });



  /* TODO test that whatever message text we tell the battle system to display gets
   * displayed. 
   * test that we can start an encounter with different versions of an encounter object.
   *
   * Test that we can't exit battle until end of battle text is done scrolling, then we can.
   * Test that target strings like "all_enemies" are processed correctly
   * Test that we skip turns of battlers who died or fled before their turn came up
   * Test that round ends after everybody goes once.
   * Test that round ends early if all remaining battlers have died or fled.
   * Test that everything that was pending gets canceled if round ends early
   * Test that we can't leave the battle system until all the end of battle text has
   *    run its course.
   * Test that the onStart/onWin/onLose callbacks of a SpecialEncounter get called
   * Test that "fled" status works correctly
   * Test that "peaceful resolution" works correctly
   * 

   * Timing should be like: fire "attack targeted" and start the animation.
   *                           wait until animation is done
   *                        fire "attack" and apply the effect (procd by battler?)
   *                        fire "attack resolved" and wait with text displayed
   *  Orrrrr.....
   *  make the event Service and the animator aware of each other
   *  so that the processGameEvent thing automatically waits until any active animation
   *  is done...

   * battle System has an animationQueue?
   * any handler can throw stuff into the animation queue
   * processNextEvent if there's nothing in the animation queue will proc next event
   * immedaitely
   * but if there's anything in the animation queue, waits until any animations complete
   *     and then procs next event.
   * messages could be thrown into this queue as well! treated as "show this msg and then
   * animate nothing for 12 frames"

   *
   * I think we can get rid of the battle system's "onEffect" and "sendEffect" functions,
   * replacing them with eventService calls.
   *
   */


  /* fightOneRound():
   *     fires "begin-round" then ticks down temporary stat mods (which could be a response
   *     to "begin-round")
   *     runs monster AIs
   *      start of round mods from chosen commands
   *      uses initiative callback to choose order of party/monsters
   *      builds up fight queue
   * 
   * finishRound could mostly become stuff that the battle system itself registers to
   * happen in response to the end-round event.
   * (except for "this.showStartRoundMenu()" -- and that could be part of the
   *  procNextEvent pump, that when we run out of events we show start round menu unless
   *  the battle is over.)

   * executeNextFighterAction() does three things after shifting fightQueue:
   * 1. it turns a vague target into a 
   *   specific target, 2. it sandwiches cmd.effect in between an attack animation and
   *   a wait animation,  3. it skips doing anything in certain circumstances
   *  (if battle over, if fighter already dead, whatever)
   *   calls executeNextFighterAction again when everything's done

   * this._whoseTurn can be deleted completely

   * ok the actual target is determined pretty late. so we have to put the "attack-targeted"
   * into the event queue once it gets to this fighter's turn. or don't queue it, just fire
   * it?

   * oh, useful fact: it's only the "autoretarget" thing that actually changes a target
   *  after selection. all other targeting work can be done up front.
   
   * idea 1:  at fightOneRound time we queue a bunch of "combat-action" events.
   *       in the handler for these events, we queue "attack-targeted", "attack", and
   *       "attack-resolved" at the front of the queue, then start processing again.
   *       (important: the eventData object for attack-targeted, attack, and attack-resolved
   *        needs to be the same object)
   
   * idea 2:  at fightOneRound time we queue attack-targeted, attack, and attack-resolved
   *       for each fighter. When we get to attack-targeted, then if the target is not a
   *       valid target we switch the target and fire another attack-targeted event.
   *       (this does mean we could trigger an "attack-targeted" callback twice...)

   * idea 3:  Keep fightQueue and executeNextFighterAction the way they are, just fire
   *       attack-targeted and attack-resolved from executeNextFighterAction. No
   *       event queueing.


   * instead of checkBattleEndConditions() in executeNextFighterAction, i could have a
   *   listener in the battle system for attack-resolved that checks if battle is over.
   */

});


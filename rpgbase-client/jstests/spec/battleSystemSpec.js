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
  var slime;
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
      frameDelay: 0 // to skip all animation
    });
    bs.onDrawBattle(function() {}); // don't draw anything

    bs.subscribeEvent(bs.eventService, "attack", bs.onAttackEvent);
    bs.subscribeEvent(bs.eventService, "attack-targeted", bs.onAttackTargetedEvent);
    bs.subscribeEvent(bs.eventService, "attack-resolved", bs.onAttackResolvedEvent);

    var hero = new StubPC("Hero");
    hero.setStats({"hp": 10});
    stubPlayer = {
      getParty: function() {
        return [hero];
      },
      marchInOrder: function() {}
    };

    // we're using a null image -- override any function where it would try to draw it
    slime = new MonsterType(null, "slime", {"hp": 1}, [fight]);

    eventLog = [];


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
    bs.onVictory(function(eventData) {
      eventLog.push("Hero won battle.");
      return "End battle text"; // this one MUST return something
      // which is a bit awkward; i'd rather be able to have any callback push
      // any text it wants onto some kind of battle system display queue.
    });

    bs.startBattle(stubPlayer, {number: 1, type: slime}, 0); // 0 is land type, don't care

    expect(bs.monsters.length).toEqual(1);

    // pretend the player chose "fight" (Not that they have any other choice)
    bs.choosePCCommand(stubPlayer.getParty()[0], fight, "random_monster");
    // this will trigger "fightOneRound" which should trigger a beginRoundCallback

    expect(eventLog.length).toEqual(6);
    expect(eventLog[0]).toEqual("Battle started.");
    expect(eventLog[1]).toEqual("Round started.");
    expect(eventLog[2]).toEqual("Hero fights slime A");
    expect(eventLog[3]).toEqual("slime A is slain.");
    expect(eventLog[4]).toEqual("Hero won battle."); // TODO is sayng this twice
    expect(eventLog[5]).toEqual("Round ended.");
    // interesting that roundEnded still gets called even if hero wins first...
  });

  it("Should order attacks according to initiative callback", function() {

    bs.onRollInitiative(function(party, monsters) {
      // have monsters act before party this time:
      return monsters.concat(party);
    });

    bs.startBattle(stubPlayer, {number: 1, type: slime}, 0); // 0 is land type, don't care

    // pretend the player chose "fight" (Not that they have any other choice)
    bs.choosePCCommand(stubPlayer.getParty()[0], fight, "random_monster");
    // this will trigger "fightOneRound" which should trigger a beginRoundCallback

    expect(eventLog.length).toEqual(3);
    expect(eventLog[0]).toEqual("slime A fights Hero");
    expect(eventLog[1]).toEqual("Hero fights slime A");
    expect(eventLog[2]).toEqual("slime A is slain.");

  });

  it("Should obey choice of targets by player", function() {
    // this also serves as a test of multi-round battle:

    bs.startBattle(stubPlayer, {number: 2, type: slime}, 0); // 0 is land type, don't care

    var target = bs.monsters[1]; // non-random choice of monster
    bs.choosePCCommand(stubPlayer.getParty()[0], fight, target);
    // this will trigger "fightOneRound" which should trigger a beginRoundCallback

    expect(eventLog.length).toEqual(3);
    expect(eventLog[0]).toEqual("Hero fights slime B");
    expect(eventLog[1]).toEqual("slime B is slain.");
    expect(eventLog[2]).toEqual("slime A fights Hero");
    // This also tests that we skip slime B's attack since it was slain before
    // its turn came
    expect(stubPlayer.getParty()[0].getStat("hp")).toEqual(9); // i took 1 damage

    // now it's waiting for my next command
    target = bs.monsters[0]; // non-random choice of monster
    bs.choosePCCommand(stubPlayer.getParty()[0], fight, target);
    expect(eventLog.length).toEqual(5);
    expect(eventLog[3]).toEqual("Hero fights slime A");
    expect(eventLog[4]).toEqual("slime A is slain.");
  });

  it("Should retarget your attack if original target died before your turn", function() {
    var hero = new StubPC("Hero");
    hero.setStats({"hp": 10});
    var sidekick = new StubPC("Sidekick");
    sidekick.setStats({"hp": 10});
    stubPlayer.getParty = function() { return [hero, sidekick] };

    bs.startBattle(stubPlayer, {number: 2, type: slime}, 0); // 0 is land type, don't care

    // both attack slime A:
    bs.choosePCCommand(stubPlayer.getParty()[0], fight, bs.monsters[0]);
    bs.choosePCCommand(stubPlayer.getParty()[1], fight, bs.monsters[0]);
    
    // locking these both in should start a round...
    expect(eventLog.length).toEqual(4);

    expect(eventLog[0]).toEqual("Hero fights slime A");
    expect(eventLog[1]).toEqual("slime A is slain.");
    expect(eventLog[2]).toEqual("Sidekick fights slime B");
    expect(eventLog[3]).toEqual("slime B is slain.");

    // But if i turn off "autoRetarget" (on by default) then this won't happen:

    bs._autoRetarget = false;
    eventLog = [];
    bs.startBattle(stubPlayer, {number: 2, type: slime}, 0); // 0 is land type, don't care

    // both attack slime A:
    bs.choosePCCommand(stubPlayer.getParty()[0], fight, bs.monsters[0]);
    bs.choosePCCommand(stubPlayer.getParty()[1], fight, bs.monsters[0]);
    
    // the second attack hits the already dead slime A, leaving slime B alive:
    expect(eventLog.length).toEqual(5);
    expect(eventLog[0]).toEqual("Hero fights slime A");
    expect(eventLog[1]).toEqual("slime A is slain.");
    expect(eventLog[2]).toEqual("Sidekick fights slime A");
    expect(eventLog[3]).toEqual("slime A is slain.");
    expect(eventLog[4]).toContain("slime B fights"); // don't care which of us he fights
  });


  /* TODO test that whatever message text we tell the battle system to display gets
   * displayed. 
   * test that we can start an encounter with different versions of an encounter object.
   *
   * Test that we can't exit battle until end of battle text is done scrolling, then we can.
   *
   * Test that we skip turns of battlers who died or fled before their turn came up
   * Test that round ends after everybody goes once.
   * Test that round ends early if all remaining battlers have died or fled.
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


/* Stubs for battlesystem test:
 * Stub Animator / Animation object (which just finishes instantly)
 * Stub Player object */


function StubPC(name) {
  this.name = name;
  this.battlerInit();
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


describe("Battle system", function() {
  var fight;
  var bs;
  var stubPlayer;
  var slime;
  var eventLog;

  beforeEach(function() {
    fight = new BatCmd(
      {target: "random_enemy", name: "Fight",
       effect: function(system, user, target) {
         target.setStat("hp", target.getStat("hp") - 1);
         eventLog.push(user.name + " fights " + target.name);
         if (target.getStat("hp") <= 0) {
           eventLog.push(target.name + " is slain.");
           target.die();
         }
       }
      });

    // TODO as battle system currently stands, defaultCmdSet is actually not optional!!
    var defaultCmdSet = new BattleCommandSet();
    defaultCmdSet.add("Fight", fight);

    bs = new BattleSystem($("#test-menus"), $("#test-canvas")[0], {
      defaultCmdSet: defaultCmdSet,
      frameDelay: 0 // to skip all animation
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
    slime = new MonsterType(null, "slime", {"hp": 1}, [fight]);

    eventLog = [];
  });

  it("Should fire messages for start/end of battle/round", function() {

    bs.onStartBattle(function() {
      eventLog.push("Battle started.");
    });
    bs.onBeginRound(function() {
      eventLog.push("Round started.");
    });
    bs.onEndRound(function() {
      eventLog.push("Round ended.");
    });
    bs.onVictory(function() {
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
    expect(eventLog[4]).toEqual("Hero won battle.");
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


  /* TODO test that whatever message text we tell the battle system to display gets
   * displayed. 
   * test that we can start an encounter with different versions of an encounter object.
   *
   * Test that we can't exit battle until end of battle text is done scrolling, then we can.
   *
   * Test that we skip turns of battlers who died or fled before their turn came up
   * Test that round ends after everybody goes once.
   * Test that round ends early if all remaining battlers hvae died or fled.
   * Test that if auto-retarget is true and my target dies before i go, i attack someone else
   * 

   * Timing should be like: fire "attack targeted" and start the animation.
   *                           wait until animation is done
   *                        fire "attack" and apply the effect (procd by battler?)
   *                        fire "attack resolved" and wait with text displayed
   

   */

});


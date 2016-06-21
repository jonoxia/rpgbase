describe("Event Service (PubSub)", function() {

  var pubSubHub = new GenericEventService();
  
  function BattleBot(name) {
    this.name = name;
    this.gameEventSubscriberInit();
  }
  BattleBot.prototype = {};
  GameEventSubscriberMixin(BattleBot.prototype);

  var eventLog = [];

  beforeEach(function() {
    pubSubHub.gameEventServiceInit();
    eventLog = [];
  });

  it("Should notify a subscriber about the events it subscribed to", function() {
    var bot1 = new BattleBot("Bot 1");

    bot1.subscribeEvent(pubSubHub, "punch", function(eventData) {
      if (eventData.target === this) {
        eventLog.push("Ow! " + this.name + " got punched.");
      }
    });

    pubSubHub.queueGameEvent("punch", {target: bot1});
    pubSubHub.procAllEvents();

    expect(eventLog.length).toEqual(1);
    expect(eventLog[0]).toEqual("Ow! Bot 1 got punched.");
  });

  it("Should not notify a subscriber about events it hasn't subscribed to", function() {
    var bot1 = new BattleBot("Bot 1");
    var bot2 = new BattleBot("Bot 2");

    var birdResponse = function(eventData) {
      eventLog.push(this.name + " saw a bird.");
    };
    var planeResponse = function(eventData) {
      eventLog.push(this.name + " saw a plane.");
    };
    bot1.onEvent("bird", birdResponse);
    bot2.onEvent("bird", birdResponse);
    bot1.onEvent("plane", planeResponse);
    bot2.onEvent("plane", planeResponse);

    pubSubHub.subscribe("bird", bot1);
    pubSubHub.subscribe("plane", bot2);

    pubSubHub.queueGameEvent("bird", {});
    pubSubHub.queueGameEvent("plane", {});
    pubSubHub.procAllEvents();

    expect(eventLog.length).toEqual(2);
    expect(eventLog[0]).toEqual("Bot 1 saw a bird.");
    expect(eventLog[1]).toEqual("Bot 2 saw a plane.");
  });


  it("Should notify multiple subscribers about an event", function() {
    var bot1 = new BattleBot("Bot 1");
    var bot2 = new BattleBot("Bot 2");

    var punchResponse = function(eventData) {
      if (eventData.source === this) {
        eventLog.push(this.name + " punches " + eventData.target.name);
      }
      if (eventData.target === this) {
        eventLog.push("Ow! " + this.name + " got punched.");
      }
    };
    bot1.subscribeEvent(pubSubHub, "punch", punchResponse);
    bot2.subscribeEvent(pubSubHub, "punch", punchResponse);

    pubSubHub.queueGameEvent("punch", {source: bot1, target: bot2});
    pubSubHub.procAllEvents();

    expect(eventLog.length).toEqual(2);
    expect(eventLog[0]).toEqual("Bot 1 punches Bot 2");
    expect(eventLog[1]).toEqual("Ow! Bot 2 got punched.");
  });


  it("Should proc multiple events in the queue", function() {
    var bot1 = new BattleBot("Bot 1");
    var bot2 = new BattleBot("Bot 2");

    var punchResponse = function(eventData) {
      if (eventData.source === this) {
        eventLog.push(this.name + " punches " + eventData.target.name);
      }
      if (eventData.target === this) {
        eventLog.push("Ow! " + this.name + " got punched.");
      }
    };
    bot1.subscribeEvent(pubSubHub, "punch", punchResponse);
    bot2.subscribeEvent(pubSubHub, "punch", punchResponse);

    pubSubHub.queueGameEvent("punch", {source: bot1, target: bot2});
    pubSubHub.queueGameEvent("punch", {source: bot2, target: bot1});
    pubSubHub.procAllEvents();

    expect(eventLog.length).toEqual(4);
    expect(eventLog[0]).toEqual("Bot 1 punches Bot 2");
    expect(eventLog[1]).toEqual("Ow! Bot 2 got punched.");
    expect(eventLog[2]).toEqual("Ow! Bot 1 got punched.");
    expect(eventLog[3]).toEqual("Bot 2 punches Bot 1");
    // The order here is because bot1 subscribed first, so it responds first.
  });

  it("Should trigger correct handler for each of multiple event types", function() {
    var bot1 = new BattleBot("Bot 1");
    var bot2 = new BattleBot("Bot 2");

    var punchTargetResponse = function(eventData) {
      if (eventData.source === this) {
        eventLog.push(this.name + " punches " + eventData.target.name);
      }
    };
     var punchResolveResponse = function(eventData) {
      if (eventData.target === this) {
        eventLog.push("Ow! " + this.name + " got punched.");
      }
    };
    bot1.subscribeEvent(pubSubHub, "punch-target", punchTargetResponse);
    bot2.subscribeEvent(pubSubHub, "punch-target", punchTargetResponse);
    bot1.subscribeEvent(pubSubHub, "punch-resolve", punchResolveResponse);
    bot2.subscribeEvent(pubSubHub, "punch-resolve", punchResolveResponse);

    pubSubHub.queueGameEvent("punch-target", {source: bot1, target: bot2});
    pubSubHub.queueGameEvent("punch-resolve", {source: bot1, target: bot2});
    pubSubHub.queueGameEvent("punch-target", {source: bot2, target: bot1});
    pubSubHub.queueGameEvent("punch-resolve", {source: bot2, target: bot1});
    pubSubHub.procAllEvents();

    expect(eventLog.length).toEqual(4);
    expect(eventLog[0]).toEqual("Bot 1 punches Bot 2");
    expect(eventLog[1]).toEqual("Ow! Bot 2 got punched.");
    expect(eventLog[2]).toEqual("Bot 2 punches Bot 1");
    expect(eventLog[3]).toEqual("Ow! Bot 1 got punched.");
  });

  it("Should not send you 2 copies of an event if you subscribed twice", function() {
    var bot1 = new BattleBot("Bot 1");

    bot1.onEvent("punch", function(eventData) {
      if (eventData.target === this) {
        eventLog.push("Ow! " + this.name + " got punched.");
      }
    });
    pubSubHub.subscribe("punch", bot1);
    pubSubHub.subscribe("punch", bot1);
    pubSubHub.subscribe("punch", bot1);

    pubSubHub.queueGameEvent("punch", {target: bot1});
    pubSubHub.procAllEvents();

    expect(eventLog.length).toEqual(1);
    expect(eventLog[0]).toEqual("Ow! Bot 1 got punched.");
  });

  it("Should trigger all onEvent handlers if you registered mroe than one", function() {
    var bot1 = new BattleBot("Bot 1");

    bot1.onEvent("punch", function(eventData) {
      if (eventData.target === this) {
        eventLog.push("Ow! " + this.name + " got punched.");
      }
    });
    bot1.onEvent("punch", function(eventData) {
      if (eventData.target === this) {
        eventLog.push("No sir I don't like it.");
      }
    });
    pubSubHub.subscribe("punch", bot1);

    pubSubHub.queueGameEvent("punch", {target: bot1});
    pubSubHub.procAllEvents();

    expect(eventLog.length).toEqual(2);
    expect(eventLog[0]).toEqual("Ow! Bot 1 got punched.");
    expect(eventLog[1]).toEqual("No sir I don't like it.");
  });

  it("Should not notify you once you unsubscribe", function() {
    var bot1 = new BattleBot("Bot 1");
    var bot2 = new BattleBot("Bot 2");

    var seeBird = function(eventData) {
      eventLog.push(this.name + " saw a " + eventData.species + ".");
    };
    bot1.onEvent("bird", seeBird);
    bot2.onEvent("bird", seeBird);
    pubSubHub.subscribe("bird", bot1);
    pubSubHub.subscribe("bird", bot2);
    pubSubHub.subscribe("bird", bot1); // multiple subscribes

    pubSubHub.queueGameEvent("bird", {species: "hawk"});
    pubSubHub.procAllEvents();

    pubSubHub.unsubscribe("bird", bot1);
    // 1 unsubscribe should be enough even if you subscribed multiple times
    // Bot 2 should still get notifications

    pubSubHub.queueGameEvent("bird", {species: "hummingbird"});
    pubSubHub.procAllEvents();

    expect(eventLog.length).toEqual(3);
    expect(eventLog[0]).toEqual("Bot 1 saw a hawk.");
    expect(eventLog[1]).toEqual("Bot 2 saw a hawk.");
    expect(eventLog[2]).toEqual("Bot 2 saw a hummingbird.");
  });

  it("Should handle new events queued during event processing", function() {
    var bot1 = new BattleBot("Bot 1");
    var bot2 = new BattleBot("Bot 2");

    var punchResponse = function(eventData) {
      if (eventData.source === this) {
        eventLog.push(this.name + " punches " + eventData.target.name);
      }
      if (eventData.target === this) {
        eventLog.push("Ow! " + this.name + " got punched.");
      }
    };
    bot1.subscribeEvent(pubSubHub, "punch", punchResponse);
    bot2.subscribeEvent(pubSubHub, "punch", punchResponse);

    bot1.subscribeEvent(pubSubHub, "buggy", function(eventData) {
      eventLog.push(this.name + " saw a punchbuggy.");
      pubSubHub.queueGameEvent("punch", {source: this, target: bot2});
    });
    bot2.subscribeEvent(pubSubHub, "buggy", function(eventData) {
      eventLog.push(this.name + " saw a punchbuggy.");
    });


    pubSubHub.queueGameEvent("buggy", {});
    pubSubHub.queueGameEvent("buggy", {});
    pubSubHub.procAllEvents();

    
    expect(eventLog.length).toEqual(8);
    expect(eventLog[0]).toEqual("Bot 1 saw a punchbuggy.");
    expect(eventLog[1]).toEqual("Bot 2 saw a punchbuggy.");
    expect(eventLog[2]).toEqual("Bot 1 saw a punchbuggy.");
    expect(eventLog[3]).toEqual("Bot 2 saw a punchbuggy.");
    expect(eventLog[4]).toEqual("Bot 1 punches Bot 2");
    expect(eventLog[5]).toEqual("Ow! Bot 2 got punched.");
    expect(eventLog[6]).toEqual("Bot 1 punches Bot 2");
    expect(eventLog[7]).toEqual("Ow! Bot 2 got punched.");
  });

  it("Should handle new events *stacked* during event processing", function() {
    var bot1 = new BattleBot("Bot 1");
    var bot2 = new BattleBot("Bot 2");

    var punchResponse = function(eventData) {
      if (eventData.source === this) {
        eventLog.push(this.name + " punches " + eventData.target.name);
      }
      if (eventData.target === this) {
        eventLog.push("Ow! " + this.name + " got punched.");
      }
    };
    bot1.subscribeEvent(pubSubHub, "punch", punchResponse);
    bot2.subscribeEvent(pubSubHub, "punch", punchResponse);

    bot1.subscribeEvent(pubSubHub, "buggy", function(eventData) {
      eventLog.push(this.name + " saw a punchbuggy.");
      pubSubHub.stackGameEvent("punch", {source: this, target: bot2});
    });
    bot2.subscribeEvent(pubSubHub, "buggy", function(eventData) {
      eventLog.push(this.name + " saw a punchbuggy.");
    });


    pubSubHub.queueGameEvent("buggy", {});
    pubSubHub.queueGameEvent("buggy", {});
    pubSubHub.procAllEvents();

    
    expect(eventLog.length).toEqual(8);
    expect(eventLog[0]).toEqual("Bot 1 saw a punchbuggy.");
    expect(eventLog[1]).toEqual("Bot 2 saw a punchbuggy.");
    expect(eventLog[2]).toEqual("Bot 1 punches Bot 2");
    expect(eventLog[3]).toEqual("Ow! Bot 2 got punched.");
    expect(eventLog[4]).toEqual("Bot 1 saw a punchbuggy.");
    expect(eventLog[5]).toEqual("Bot 2 saw a punchbuggy.");
    expect(eventLog[6]).toEqual("Bot 1 punches Bot 2");
    expect(eventLog[7]).toEqual("Ow! Bot 2 got punched.");
  });

  it("Should apply class event handlers to all instances of a class", function() {
    // OK how does this work

    pubSubHub.subscribeClass(BattleBot, "punch-target", function(eventData) {
      if (eventData.source === this) {
        eventLog.push(this.name + " punches " + eventData.target.name);
      }
    });
    pubSubHub.subscribeClass(BattleBot, "punch-resolve", function(eventData) {
      if (eventData.target === this) {
        eventLog.push("Ow! " + this.name + " got punched.");
      }
    });
    
    var bot1 = new BattleBot("Bot 1");
    var bot2 = new BattleBot("Bot 2");

    pubSubHub.queueGameEvent("punch-target", {source: bot1, target: bot2});
    pubSubHub.queueGameEvent("punch-resolve", {source: bot1, target: bot2});
    pubSubHub.queueGameEvent("punch-target", {source: bot2, target: bot1});
    pubSubHub.queueGameEvent("punch-resolve", {source: bot2, target: bot1});
    pubSubHub.procAllEvents();
    
    // events do not have to have "source" or "target", but only an EventSuscriber
    // tagged as source or target will receive events that were subscribed as a class.

    expect(eventLog.length).toEqual(4);
    expect(eventLog[0]).toEqual("Bot 1 punches Bot 2");
    expect(eventLog[1]).toEqual("Ow! Bot 2 got punched.");
    expect(eventLog[2]).toEqual("Bot 2 punches Bot 1");
    expect(eventLog[3]).toEqual("Ow! Bot 1 got punched.");
    
    // Unsubscribe the class handlers to have a clean start for next test:
    pubSubHub.unsubscribeClass(BattleBot, "punch-target");
    pubSubHub.unsubscribeClass(BattleBot, "punch-resolve");
    expect(BattleBot.prototype._classEventHandlers["punch-target"].length).toEqual(0);
    expect(BattleBot.prototype._classEventHandlers["punch-resolve"].length).toEqual(0);
  });

  it("Should allow overriding a class handler with an instance handler", function() {

    pubSubHub.subscribeClass(BattleBot, "punch-target", function(eventData) {
      if (eventData.source === this) {
        eventLog.push(this.name + " punches " + eventData.target.name);
      }
    });
    pubSubHub.subscribeClass(BattleBot, "punch-resolve", function(eventData) {
      if (eventData.target === this) {
        eventLog.push("Ow! " + this.name + " got punched.");
      }
    });
    
    var bot1 = new BattleBot("Bot 1");
    var bot2 = new BattleBot("Bot 2");

    bot2.subscribeEvent(pubSubHub, "punch-target", function(eventData) {
      if (eventData.source === this) {
        eventLog.push(this.name + " SHOURYUKENS " + eventData.target.name);
      }
    });

    pubSubHub.queueGameEvent("punch-target", {source: bot1, target: bot2});
    pubSubHub.queueGameEvent("punch-resolve", {source: bot1, target: bot2});
    pubSubHub.queueGameEvent("punch-target", {source: bot2, target: bot1});
    pubSubHub.queueGameEvent("punch-resolve", {source: bot2, target: bot1});
    pubSubHub.procAllEvents();
    
    // events do not have to have "source" or "target", but only an EventSuscriber
    // tagged as source or target will receive events that were subscribed as a class.

    expect(eventLog.length).toEqual(4);
    expect(eventLog[0]).toEqual("Bot 1 punches Bot 2");
    expect(eventLog[1]).toEqual("Ow! Bot 2 got punched.");
    expect(eventLog[2]).toEqual("Bot 2 SHOURYUKENS Bot 1");
    expect(eventLog[3]).toEqual("Ow! Bot 1 got punched.");

    // Unsubscribe the class handlers to have a clean start for next test:
    pubSubHub.unsubscribeClass(BattleBot, "punch-target");
    pubSubHub.unsubscribeClass(BattleBot, "punch-resolve");
    expect(BattleBot.prototype._classEventHandlers["punch-target"].length).toEqual(0);
    expect(BattleBot.prototype._classEventHandlers["punch-resolve"].length).toEqual(0);
  });

  it("Should let instance handler decide whether to also call class handler", function() {
    pubSubHub.subscribeClass(BattleBot, "punch-target", function(eventData) {
      if (eventData.source === this) {
        eventLog.push(this.name + " punches " + eventData.target.name);
      }
    });
    pubSubHub.subscribeClass(BattleBot, "punch-resolve", function(eventData) {
      if (eventData.target === this) {
        eventLog.push("Ow! " + this.name + " got punched.");
      }
    });
    
    var bot1 = new BattleBot("Bot 1");
    var bot2 = new BattleBot("Bot 2");

    bot1.subscribeEvent(pubSubHub, "punch-resolve", function(eventData) {
      if (eventData.target === this) {
        eventLog.push(this.name + " counterattacks!");
      }
      return true; // allow event to propagate to the class-level handler
      // so this will counterattack and then the original attack resolves.
    });

    pubSubHub.queueGameEvent("punch-target", {source: bot1, target: bot2});
    pubSubHub.queueGameEvent("punch-resolve", {source: bot1, target: bot2});
    pubSubHub.queueGameEvent("punch-target", {source: bot2, target: bot1});
    pubSubHub.queueGameEvent("punch-resolve", {source: bot2, target: bot1});
    pubSubHub.procAllEvents();
    
    // events do not have to have "source" or "target", but only an EventSuscriber
    // tagged as source or target will receive events that were subscribed as a class.

    expect(eventLog.length).toEqual(5);
    expect(eventLog[0]).toEqual("Bot 1 punches Bot 2");
    expect(eventLog[1]).toEqual("Ow! Bot 2 got punched.");
    expect(eventLog[2]).toEqual("Bot 2 punches Bot 1");
    expect(eventLog[3]).toEqual("Bot 1 counterattacks!");
    expect(eventLog[4]).toEqual("Ow! Bot 1 got punched.");

    // Unsubscribe the class handlers to have a clean start for next test:
    pubSubHub.unsubscribeClass(BattleBot, "punch-target");
    pubSubHub.unsubscribeClass(BattleBot, "punch-resolve");
    expect(BattleBot.prototype._classEventHandlers["punch-target"].length).toEqual(0);
    expect(BattleBot.prototype._classEventHandlers["punch-resolve"].length).toEqual(0);
  });
});

/* TODO a way to subscribe all instances of a "class" to an event
 * like... sign up the prototype, somehow?
 *
 * Do we need targeting of events built into the system or is it sufficient to
 * handle it with "if (eventData.target === this)"  ?
 * 
 * say we want all Battlers to have a default handler to respond to Damage.
 * (ignore the override case for now). say we had a proxy object with a list of
 * all Battlers, and we sign up that proxy object, and then when it gets an event
 * notification it calls the takeEffect() on all of its instances?
 * hmmm the members still have to have an onEffect handler, so that's not quite right
 * there's two parts: signing up all the instance objects to receive the notification
 * and setting the onEffect handler for all instance objects.
 * (Including instance objects created after this setup is done)

 * ok so suppose...
 * the event service has a list of 'classes' (assume classes are namable)
 * for each class it knows default event names and their default onEvent handlers
 * every time an instance of GameEventSubscriberMixin is created
 *  (this could happen in gameEventSubscriberInit) it could check the event service
 *  (if event service is global or is passed into gameEventSubscriberInit)
 *  it then subscribes that instance with all the right onEvent handlers.
 *
 *  OR
 *
 *  there is some kind of proxy object representing a class, that has list of instances
 *  (e.g. battler class knows all battler instances)
 *  battler class is an EventSubscriber
 *  it signs up for event notifications
 *  it has an onEvent handler
 *  the takeEvent, instead of doing handler.call(self, eventData)
 *  it does  handler.call(instance, eventData)  for each instance
 *  the handler has to compare instance with eventData.target
 *  I think that takes care of everything except overriding.
 */

/* TODO we must ensure that, like, dead enemies from past battles don't remain in memory
 * and subscribed to event listeners!!! Need to release references to them so they can
 * be garbage collected. */

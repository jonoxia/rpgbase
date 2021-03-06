describe("Game Entity Serializer", function() {

    function Pants(waist, length, color) {
      this.waist = waist;
      this.length = length;
      this.color = color;
    }
    Pants.prototype = {
      serializableClassName: "Pants",
      serializableFields: ["waist", "length", "color"]
    };
    SerializableMixin(Pants);

  
  function Shop(inventory) {
    this._inventory = {};
    this._prices = [];
    if (inventory) {
      for (var i = 0; i < inventory.length; i++) {
        this._prices.push(inventory[i].price);
        this._inventory[ inventory[i].name ] = inventory[i].price;
      }
    }
  }
  Shop.prototype = {
    serializableClassName: "Shop",
    serializableFields: ["_inventory", "_prices"]
  };
  SerializableMixin(Shop);


  function GuyWithPants(age, height) {
    this.pants = null
    this.age = age;
    this.height = height;
  }
  GuyWithPants.prototype = {
    serializableClassName: "GuyWithPants",
    serializableFields: ["pants", "age", "height"],
    
    setPants: function(pants) {
      this.pants = pants;
    }
  };
  SerializableMixin(GuyWithPants);

  function Closet() {
    this.pants = [];
  }
  Closet.prototype = {
    serializableClassName: "Closet",
    serializableFields: ["pants"],
    
    addPants: function(morePants) {
      this.pants.push(morePants);
    }
  };
  SerializableMixin(Closet);

  function PantsInspector(name, closet) {
    this.name = name;
    this.pants = [];
    // these are references to pants that belong to the closet
    this.closet = closet;
  }
  PantsInspector.prototype = {
    serializableClassName: "PantsInspector",
    serializableFields: ["name"],

    onSerialize: function(jsonobj) {
      jsonobj.pants = [];
      for (var i = 0; i < this.pants.length; i++) {
        var p = this.pants[i];
        var id = this.closet.pants.indexOf(p);
        jsonobj.pants.push(id);
      }
      // pants are external references, so
      // instead of storing pants directly, store their ids
    },

    onDeserialize: function(jsonobj) {
      // restore pants from their ids
      for (var i = 0; i < jsonobj.pants.length; i++) {
        var id = jsonobj.pants[i];
        var p = this.closet.pants[id];
        this.pants.push(p);
      }
    },
    
    addPants: function(pantsRef) {
      this.pants.push(pantsRef);
    }
  };
  SerializableMixin(PantsInspector);
  
  it("Should serialize and restore basic fields ", function() {

    var oldPants = new Pants(36, 29, "khaki");
    var pickle = oldPants.serialize();
    var restoredPants = new Pants();
    restoredPants.restore(pickle);

    expect(restoredPants.waist).toEqual(36);
    expect(restoredPants.length).toEqual(29);
    expect(restoredPants.color).toEqual("khaki");

  });

  it("Should serialize/restore arrays and dictionaries ", function() {

    var oldShop = new Shop([{price: 30,
                             name: "pants"},
                            {price: 40,
                             name: "shirt"}]);

    var pickle = oldShop.serialize();
    var newShop = new Shop();
    newShop.restore(pickle);

    expect(newShop._prices.length).toEqual(2);
    expect(newShop._prices[0]).toEqual(30);
    expect(newShop._prices[1]).toEqual(40);
    expect(newShop._inventory["pants"]).toEqual(30);
    expect(newShop._inventory["shirt"]).toEqual(40);

  });

  it("Should serialize/restore serializable subobjects", function() {
    var oldGuy = new GuyWithPants(27, "6foot1");
    var oldPants = new Pants(34, 40, "jeans");
    oldGuy.setPants(oldPants);

    var pickle = oldGuy.serialize();
    var newGuy = new GuyWithPants();
    newGuy.restore(pickle);

    expect(newGuy.age).toEqual(27);
    expect(newGuy.height).toEqual("6foot1");
    expect(newGuy.pants.waist).toEqual(34);
    expect(newGuy.pants.length).toEqual(40);
    expect(newGuy.pants.color).toEqual("jeans");
    expect(newGuy.pants.serializableClassName).toEqual("Pants");
  });

  it("Should handle arrays of serializable subobjects", function() {
    var oldCloset = new Closet();
    oldCloset.addPants(new Pants(34, 29, "jeans"));
    oldCloset.addPants(new Pants(34, 29, "khaki"));
    oldCloset.addPants(new Pants(34, 18, "shorts"));

    var pickle = oldCloset.serialize();
    var newCloset = new Closet();
    newCloset.restore(pickle);

    expect(newCloset.pants.length).toEqual(3);
    expect(newCloset.pants[0].serializableClassName).toEqual("Pants");
    expect(newCloset.pants[1].serializableClassName).toEqual("Pants");
    expect(newCloset.pants[2].serializableClassName).toEqual("Pants");
    expect(newCloset.pants[0].color).toEqual("jeans");
    expect(newCloset.pants[1].color).toEqual("khaki");
    expect(newCloset.pants[2].color).toEqual("shorts");
  });

  it("Should call pre-serialize/post-deserialize hooks", function() {
    var oldCloset = new Closet();
    oldCloset.addPants(new Pants(34, 29, "jeans"));
    oldCloset.addPants(new Pants(34, 29, "khaki"));
    oldCloset.addPants(new Pants(34, 18, "shorts"));

    var oldInspector = new PantsInspector("carl", oldCloset);
    oldInspector.addPants(oldCloset.pants[1]);
    oldInspector.addPants(oldCloset.pants[0]);
    var pickle = oldInspector.serialize();
    var newInspector = new PantsInspector(null, oldCloset);
    newInspector.restore(pickle);

    expect(newInspector.pants.length).toEqual(2);
    expect(newInspector.name).toEqual("carl");
    expect(newInspector.pants[0] === oldCloset.pants[1]).toEqual(true);
    expect(newInspector.pants[1] === oldCloset.pants[0]).toEqual(true);
  });

});


//pG&E account number 1522941853-6

//conf #2244345062933

// comcast account number  8155 1001 5096 0833

var Serializer = {
  _serializableConstructors: {},

  registerClass: function(constructor, className) {
    this._serializableConstructors[className] = constructor;
  },

  getConstructor: function(className) {
    return this._serializableConstructors[className];
  }
};

function SerializableMixin(subclassConstructor) {
    var subclassPrototype = subclassConstructor.prototype;
    var className = subclassPrototype.serializableClassName;

    Serializer.registerClass(subclassConstructor, className);

    // and now have method that turns constructor into string
    // or string back into constructor, and we'll be good to go...

    subclassPrototype.serializeInit = function(className) {
      // anything to do here???
    };

    subclassPrototype.serialize = function() {
      var jsonobj = {};
      var fields = this.serializableFields;
      for (var i = 0; i < fields.length; i++) {
	var fieldName = fields[i];
        var value = this[fieldName];

        if (!value) {
          console.log("No value for " + fieldName);
        }

	// actually look if the sub object is itself
	// serializable -- if so, then call serialize on it;
	// if not, just json.stringify it.
        if (value.serializableClassName) {
          // subobject is itself serializable
          var className = value.serializableClassName;
          var subObjectJson = value.serialize();
          jsonobj[fieldName] = {serializedClass: className,
                                json: subObjectJson};
        } else {
	  jsonobj[fieldName] = value;
        }
        
	// TODO what if fieldName is an array of serializable
	// subobjects? what if it's a dictionary?
      }
      return JSON.stringify(jsonobj);
    };
    
    subclassPrototype.restore = function(jsonstr) {
      var jsonobj = JSON.parse(jsonstr);
      var fields = this.serializableFields;
	for (var i = 0; i < fields.length; i++) {
	  var fieldName = fields[i];
	  var value = jsonobj[fieldName];
	  // TODO if any sub object is itself serializable, then
	  // restore its data recursively from the json

          if (value.serializedClass) {
            // look up constructor based on serialzied class name;
            // instantiate and restore.
            // (Any constructor used as a subobject must work when
            // called with no arguments).
            var cons = Serializer.getConstructor(
              value.serializedClass);
            var newSubObj = new cons();
            newSubObj.restore(value.json);
            this[fieldName] = newSubObj;
          } else {
            this[fieldName] = value;
          }
	    
	    // TODO if restoring serializable subobjects, we'll need
	    // to instantiate them here, which means we may need to
	    // store some metadata about which subclass to instantiate

	    // maybe a serialized subobject is stored as
	    // {serializr_type: "classname",
	    // data: "json.stringify of instance"}
	    // that would also let us instantly realize that something
	    // is a seralizable subobject

	    // we can have the mixin keep a list of all its subclasses
	    // and use that to figure out the class name to use
	    // for serializr_type -- and then get from the class name
	    // back to the constructor when we restore.

	    // (oh, but we mixin the prototype, not the constructor...
	    // is there a way to get from the prototype back to the
	    // constructor???)
	}
    };
}

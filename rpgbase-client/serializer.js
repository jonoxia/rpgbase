
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

      var serializeSubObj = function(subObj) {
        // subobject is itself serializable
          var className = subObj.serializableClassName;
          var subObjectJson = subObj.serialize();
          return {serializedClass: className,
                  json: subObjectJson};
      };

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
          jsonobj[fieldName] = serializeSubObj(value);
        } else if (value instanceof Array && 
                   value.length > 0 &&
                   value[0].serializableClassName) {
          // array of serializable subobjects
          // tricksy hobbitses
          // assume for now that if array contains one serializable,
          // all its contents are serializables.
          var serializedArray = [];
          for (var i =0; i < value.length; i++) {
            serializedArray.push(serializeSubObj(value[i]));
          }
          jsonobj[fieldName] = serializedArray;
        } else {
	  jsonobj[fieldName] = value;
        }
        // TODO what about dictionary of serializable subobjects?
        // what about a nest of arrays and dictionaries for many
        // levels and somewhere down in the bottom of it is a
        // serializable subobject?
      }
      return JSON.stringify(jsonobj);
    };
    
    subclassPrototype.restore = function(jsonstr) {
      var jsonobj = JSON.parse(jsonstr);
      var fields = this.serializableFields;

      var restoreSubObj = function(value) {
        var cons = Serializer.getConstructor(
          value.serializedClass);
        var newSubObj = new cons();
        newSubObj.restore(value.json);
        return newSubObj;
      };

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
            this[fieldName] = restoreSubObj(value);
          } else if (value instanceof Array && 
                     value.length > 0 &&
                     value[0].serializedClass) {
            var restoredArray = [];
            for (var i = 0; i < value.length; i++) {
              restoredArray.push(restoreSubObj(value[i]));
            }
            this[fieldName] = restoredArray;
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

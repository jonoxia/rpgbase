
function ServerBackedRecord( recordName ) {
    this._id = null;
    this.data = {};
    this._recordName = recordName;
    this._tagText = "";
}
ServerBackedRecord.prototype = {
  getField: function( fieldName ) {
    return this.data[fieldName];
  },
 
  setField: function( fieldName, value ) {
    this.data[fieldName] = value;
  },

  setData: function( dict ) {
    this.data = dict;
  },

  saveChangesToServer: function( callback ) {
    // Can't update it if it doesn't already exist on server... so if there is no self._id
    // set, then this should be treated as a SaveNew instead.
    if (! this._id ) {
        return this.saveNewToServer();
    }
    var url = "/update/" + this._recordName;
    var self = this;
    var args = { id: self._id };
    var field;
    for ( field in self.data ) {
      args[field] = self.data[field];
    }
    jQuery.post(url, args,
	        function(xml, textStatus) {
                  if (callback) {
		    callback( xml, textStatus );
		  }
	        });
  },

  saveNewToServer: function( callback ) {
    // Always creates a new record on the server.  To update exsiting record, call
    // saveChangesToServer.
    var url = "/create/" + this._recordName;
    var self = this;
    jQuery.post(url, this.data,
	        function(xml, textStatus) {
		  var item = $(xml).find(self._recordName);
                  // Save the ID of the newly created server record, so we know
		  // that we can update next time instead of recreating.
		  self._id = item.attr("id");
                  if (callback) {
		    callback( xml, textStatus );
		  }
	        });
  },

  downloadFromServer: function( id, callback ) {
    var url = "/get/" + this._recordName + "?id=" + id;
    var self = this;
    jQuery.get(url, null,
               function(xml, textStatus) {
		   var tag = xml.getElementsByTagName(self._recordName)[0];
                 self.data = {};
		 var attrs = tag.attributes;
		 for (var i = 0; i < attrs.length; i++) {
                   if (attrs[i].name == "id") {
		       $("#debug").html("I got an id: " + attrs[i].value );
		     self._id = attrs[i].value;
		   } else {
		     self.data[attrs[i].name] = attrs[i].value;
		   }
		 }
                 self._tagText = tag.textContent;
                 if (callback) {
                   callback(xml, textStatus);
                 }
               }, "xml");
  }
};

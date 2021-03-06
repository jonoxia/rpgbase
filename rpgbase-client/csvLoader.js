/* Class that reads and parses CSV files. Require Papaparse. */

function CSVLoader(basePath, fileList, allowDefaults) {
  // fileList is an array of filenames. It will look for these files in basePath.
  this.basePath = basePath
  this.offline = false;
  this.fileList = fileList;
  if (window.location.protocol == "file:") {
    // Use offlineData when running from a file URL
    // since AJAX will not be possible.
    this.offline = true;
  }
  this.offlineData = null;

  this.data = {};

  this.spreadsheets = {};

  this.allowDefaults = allowDefaults;
}
CSVLoader.prototype = {
  addFiles: function(newFiles) {
    this.fileList = this.fileList.concat(newFiles);
  },
  loadAll: function(callback) {
    // Loads all files that have been added, then calls callback
    var self = this;
    if (self.offline && self.offlineData != null) {
      $.each(self.fileList, function(i, filename) {
        self.data[filename] = self.offlineData[filename];
      });
      callback();
    } else {
      // TODO a lot of ajax loads, then call callback.
	var numFilesCollected = 0;
	$.each(self.fileList, function(i, filename) {
	    $.ajax({url: self.basePath + "/" + filename,
		    method: "GET",
		    success: function(data, textStatus, xhr) {
                      self.data[filename] = data;
                      numFilesCollected ++;
                      console.log("Got CSV file " + filename + " by AJAX");
                      if (numFilesCollected == self.fileList.length) {
                        callback();
                      }
		    },
		    error: function(xhr, textStatus, errorThrown) {
                      console.log(textStatus + ": " + errorThrown + " trying to get " + filename);
		    },
		    dataType: "text"
		   });
	});
    }
  },

  getDicts: function (filename) {
    if (this.data[filename]) {
      // offline case
      var rawCSV = this.data[filename];

      /* Skip blank lines: */
      var lines = rawCSV.split("\n");
      lines = lines.filter(function(x) { return x !== ""});
      rawCSV = lines.join("\n");

      var results = Papa.parse(rawCSV, {header: true});
      // TODO use dynamicParsing! then I don't have to parseInt everywhere
      return results.data;

    } else if (this.spreadsheets[filename]) {
      // normal online case:
      return this.spreadsheets[filename].getWorksheetAsDicts(filename);

      /* no exact match but filename has pattern "<mapname>_npcs.csv" or
       * <mapname>_scenery.csv" then that refers to a tab of the master
       * NPCs.csv or master scenery.csv document. Use just "npcs.csv" /
       * "scenery.csv" as the first key, and the full name as the second key
       * TODO this is eagle-princess specific and shouldn't be in RPGBase*/
    } else if (filename.indexOf("_scenery.csv") > -1) {
      console.log("Attempting to load " + filename + " as a tab of scenery.csv");
      return this.spreadsheets["scenery.csv"].getWorksheetAsDicts(filename);
    } else if (filename.indexOf("_npcs.csv") > -1) {
      console.log("Attempting to load " + filename + " as a tab of NPCs.csv");
      return this.spreadsheets["NPCs.csv"].getWorksheetAsDicts(filename);
    } else if (filename === "story_recaps.csv") {
      return this.spreadsheets["cutscenes.csv"].getWorksheetAsDicts(filename);
    } else if (filename === "encounter_dialog.csv") {
      return this.spreadsheets["encounter_cards.csv"].getWorksheetAsDicts(filename);
    } else if (filename === "party_battle_animation_timing.csv") {
      return this.spreadsheets["party_fixed_data.csv"].getWorksheetAsDicts(filename);
    }

    // No match found for filename:
    if (this.allowDefaults) {
      console.warn("WARNING: no CSV file named " + filename);
      return [];
    } else {
      throw "No CSV file named " + filename;
    }
  },

  getArrays: function (filename) {
    var results = null;
    if (this.data[filename]) {
      var rawCSV = this.data[filename];
      results = Papa.parse(rawCSV, {header: false});
      results = results.data;
    } else if (this.spreadsheets[filename]) {
      results = this.spreadsheets[filename].getWorksheetAsArrays(filename);
    }

    if (results) {
      // Strip out spaces from values:
      for (var row = 0; row < results.length; row++) {
        for (var col = 0; col < results[row].length; col++) {
          results[row][col] = results[row][col].replace(" ", "");
        }
      }

      return results;
    }

    // No match found for filename:
    if (this.allowDefaults) {
      console.warn("WARNING: no CSV file named " + filename);
      return [];
    } else {
      throw "No CSV file named " + filename;
    }
  },

  loadFromGoogleDocs: function(googleDocsData, callback) {
    // TODO instead of checking self.offline, use the offline
    // data fallback in the case where google docs cannot be
    // accessed -- try and catch the exception from Tabletop.
    var self = this;
    if (self.offline && self.offlineData != null) {
      for (var key in googleDocsData) {
        if (googleDocsData.hasOwnProperty(key)) {
          self.data[key] = self.offlineData[key];
        }
      }
      callback();
      return;
    }

    var numGoogleDocs = 0;
    var numGot = 0;

    for (var key in googleDocsData) {
      if (googleDocsData.hasOwnProperty(key)) {
        numGoogleDocs++;
      }
    }
    for (var key in googleDocsData) {
      if (googleDocsData.hasOwnProperty(key)) {
        var url = googleDocsData[key];
        console.log("Tryin to load google doc from " + url);

        this.spreadsheets[key] = new Spreadsheet.create(url, function() {
          numGot ++;
          if (numGot >= numGoogleDocs) {
            callback();
          }
        });
      }
    }
  }


};

/* Class that reads and parses CSV files. Require Papaparse. */

function CSVLoader(basePath, fileList) {
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
    var rawCSV = this.data[filename];
    var results = Papa.parse(rawCSV, {header: true});
    // TODO use dynamicParsing! then I don't have to parseInt everywhere
    return results.data;
  },

  getArrays: function (filename) {
    var rawCSV = this.data[filename];
    var results = Papa.parse(rawCSV, {header: false});
    return results.data;
  }
};

/* Class that reads and parses CSV files. Require Papaparse. */

function CSVLoader(fileList, offlineData) {
  this.offline = false;
  this.fileList = fileList;
  if (window.location.protocol == "file:") {
    // Use offlineData when running from a file URL
    // since AJAX will not be possible.
    this.offline = true;
  }
  this.offlineData = offlineData;

  this.data = {};

  this.spreadsheets = {};
}
CSVLoader.prototype = {
  loadAll: function(callback) {

    var self = this;
    if (self.offline) {
      $.each(self.fileList, function(i, filename) {
        self.data[filename] = self.offlineData[filename];
      });
      callback();
    } else {
      // TODO a lot of ajax loads, then call callback.
	var numFilesCollected = 0;
	$.each(self.fileList, function(i, filename) {
	    $.ajax({url: "datafiles/" + filename,
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

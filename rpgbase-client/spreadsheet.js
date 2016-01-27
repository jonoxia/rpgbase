var Spreadsheet = (function(Tabletop){
  if (!Tabletop) {
    throw new Error("Tabletop not found, please get it from " +
                    "https://github.com/jsoma/tabletop");
  }

  function Spreadsheet(urlOrKey, cb) {
    this.tabletopInfo = null;
    Tabletop.init({
      key: urlOrKey,
      callback: function(info) {
        this.tabletopInfo = info;
        cb(this);
      }.bind(this)
    });
  }

  Spreadsheet.prototype = {
    getWorksheetAsArrays: function(worksheetName) {
      var sheet = this.tabletopInfo[worksheetName];

      return [sheet.column_names].concat(sheet.toArray());
    },
    getWorksheetAsDicts: function(worksheetName) {
      return this.tabletopInfo[worksheetName].elements;
    }
  };

  return {
    create: function(urlOrKey, cb) {
      return new Spreadsheet(urlOrKey, cb);
    }
  };
})(window.Tabletop);

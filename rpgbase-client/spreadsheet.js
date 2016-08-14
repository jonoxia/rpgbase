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
      /* Unfortunately tabletop always reads as dictionaries with column titles as keys.
       * Which means that the top row of a map gets interpreted as a set of column names
       * even if we convert it toArray. I don't see an option to make Tabletop work
       * differently, so as a workaround, for now we need to add a row at the top of
       * each map consisting of unique columnn numbers. We'll then throw this row away
       * after parsing.
       */
	//return [sheet.column_names].concat(sheet.toArray());
       return sheet.toArray();
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

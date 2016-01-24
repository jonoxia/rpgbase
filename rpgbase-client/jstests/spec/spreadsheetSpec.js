describe("Spreadsheet", function() {
  it("should work", function() {
    // Note that the following URL is NOT the same as the 'edit' link for
    // the spreadsheet.
    //
    // For more details, see:
    //
    //   * http://labs.toolness.com/temp/gsheets_pub_to_web.png
    //   * https://support.google.com/docs/answer/37579

    var URL = document.getElementById('published-url').href;
    var sheet;
    var spreadsheetLoaded = false;

    runs(function() {
      sheet = Spreadsheet.create(URL, function() {
        spreadsheetLoaded = true;
      });
      expect(sheet.tabletopInfo).toBeNull();
    });

    waitsFor(function() {
      return spreadsheetLoaded;
    }, "The spreadsheet should load", 5000);

    runs(function() {
      expect(sheet.tabletopInfo).not.toBeNull();

      expect(sheet.getWorksheetAsDicts('Foods')).toEqual([
        {
          "Food Name": "Hamburger",
          "Energy": "3"
        },
        {
          "Food Name": "Salad",
          "Energy": "4"
        }
      ]);

      expect(sheet.getWorksheetAsArrays('Foods')).toEqual([
        // Note that we include the columns as the first row.
        ['Food Name', 'Energy'],
        ['Hamburger', '3'],
        ['Salad', '4']
      ]);
    });
  });
});

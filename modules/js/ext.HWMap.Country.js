/*
 * Setup big map at country article
 */
var setupCountryMap = function setupCountryMap() {
  mw.log('->HWMap->setupCountryMap');
  $("body").addClass("hwmap-page");
  console.log('yaaahiii');

  //Getting the current coordinate
  $.get( apiRoot + "/api.php?action=query&prop=coordinates&titles=" + mw.config.get("wgTitle") + "&format=json", function( data ) {
    for (var i in data.query.pages) {
      page = data.query.pages[i];
      break;
    }

    if(page.coordinates) {
      // Center map to city coordinates
      hwmap.setView([page.coordinates[0].lat, page.coordinates[0].lon], 5);
    }

  });
}


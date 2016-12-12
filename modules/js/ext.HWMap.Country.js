/*
 * Setup big map at country article
 */
var setupCountryMap = function setupCountryMap() {
  mw.log('->HWMap->setupCountryMap');
  $('body').addClass('hwmap-page');

  // Getting the current coordinate
  $.get( mw.util.wikiScript('api') + '?action=query&prop=coordinates&titles=' + mw.config.get('wgTitle') + '&format=json', function( data ) {
    for (var i in data.query.pages) {
      page = data.query.pages[i];
      break;
    }

    if(page.coordinates) {
      // Center map to city coordinates
      hwmap.setView([page.coordinates[0].lat, page.coordinates[0].lon], 5);
    }

    // Fire event to check when map move
    hwmap.on('moveend', function() {
      // mw.log(spotsLayer._topClusterLevel._childcount);
      // Get spots when zoom is bigger than 6
      var zoom = hwmap.getZoom();
      if(zoom > 4) {
        getBoxSpots('Cities', zoom);
      }
      // When zoom is smaller than 6 we clear the markers if not already cleared
      else if(spotsLayer._objectsOnMap.length > 0){
        // Clear the markers and last boundings
        spotsLayer.RemoveMarkers();
        lastBounds = {
          NElat: 0,
          NElng: 0,
          SWlat: 0,
          SWlng: 0
        };
      }

    });


    //Getting spots in bounding box
    hwmap.fireEvent('moveend');


  });
}

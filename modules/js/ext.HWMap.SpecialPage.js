/*
 * Return fragment identifier of the current URL
 */
$.fn.urlHash = function() {
  // unlike window.location.hash, this one's IE-friendly
  return document.URL.substr(document.URL.indexOf('#') + 1);
};

/*
 * Setup big map at Special:HWMap
 */
function setupSpecialPageMap() {
  mw.log('->HWMap->setupSpecialPageMap');

  //Set map view
  hwmap.setView(defaultCenter, defaultZoom);

  var updateURL = function() {
    var center = hwmap.getCenter(), zoom = hwmap.getZoom();
    var state = {
      "lat": center.lat,
      "lng": center.lng,
      "zoom": zoom
    };
    history.pushState(state, null, pageLocationUrl + '?' + $.param( state ));
  };

  //Fire event to check when map move
  hwmap.on('moveend', function() {
    //mw.log(spotsLayer._topClusterLevel._childcount);
    //Get spots when zoom is bigger than 6
    if(hwmap.getZoom() > 5) {
      getBoxSpots();
    }
    //When zoom is smaller than 6 we clear the markers if not already cleared
    else if(spotsLayer._objectsOnMap.length > 0){
      //Clear the markers and last boundings
      spotsLayer.RemoveMarkers();
      lastBounds = {
        NElat:'0',
        NElng:'0',
        SWlat:'0',
        SWlng:'0'
      };
    }

    updateURL();
  });

  hwmap.on('zoomend', function() {
    updateURL();
  });

  // Button for adding new spot (show only for logged in users)
  // wgUserId returns null when not logged in
  if(mw.config.get('wgUserId')) {
    $newSpotInit.show().click(function(e){
      e.preventDefault();
      setupNewSpot();
    });

    if ($(this).urlHash() == 'add') {
      setupNewSpot();
    }
  }

  //Getting spots in bounding box
  hwmap.fireEvent('moveend');
}

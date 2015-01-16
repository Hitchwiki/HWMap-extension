/*
 * Setup big map at Special:HWMap
 */
function setupSpecialPageMap() {
  mw.log('->HWMap->setupSpecialPageMap');

  //Set map view
  hwmap.setView(defaultCenter, defaultZoom);

  //Getting spots in bounding box
  getBoxSpots();

  $newSpotInit.click(function(e){
    e.preventDefault();
    $(this).hide();
    setupNewSpot();
  });

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
  });
}

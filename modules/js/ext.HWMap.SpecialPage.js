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
var setupSpecialPageMap = function () {
  mw.log('->HWMap->setupSpecialPageMap');

  //Set map view
  hwmap.setView(defaultCenter, defaultZoom);

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

  //Getting spots in bounding box
  hwmap.fireEvent('moveend');

  initSpecialPageTemplate();

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
}

var initSpecialPageTemplate = function () {
  console.log('youpi !');
  $.get( extensionRoot +'modules/templates/ext.HWMap.SpecialPageSpot.template.html' ).then( function ( template ) {
    ractive = new Ractive({
      el: 'hwspot',
      template: template,
      data: {}
    });
  });
};

window.closeSpecialPageSpot = function () {
  $('#hwspot').hide();
  $('#hwmap').css({'width': '100%'});
};

window.openSpecialPageSpot = function (id) {
  $.get( apiRoot + "/api.php?action=hwspotidapi&format=json&properties=Location,Country,CardinalDirection,CitiesDirection,RoadsDirection&pageid=" + id, function( data ) {
    console.log(data);
  });
  $('#hwspot').show();
  $('#hwmap').css({'width': '75%'});
};

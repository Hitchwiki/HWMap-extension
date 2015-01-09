/*
 * Hitchwiki Maps
 */

// Defaults
var defaultCenter = [48.6908333333, 9.14055555556], // Europe
    defaultZoom = 5;

// Mapbox settings
var mapboxUser = "trustroots",
    mapboxStyle = "ce8bb774",
    mapboxAccessToken = "pk.eyJ1IjoidHJ1c3Ryb290cyIsImEiOiJVWFFGa19BIn0.4e59q4-7e8yvgvcd1jzF4g";

// Setup variables
var hwmap,
    spotsLayer,
    newSpotMarker,
    newSpotLayer,
    icons = {},
    lastZoom = 0,
    lastBounds = { NElat:'0', NElng:'0', SWlat:'0', SWlng:'0' },
    apiRoot = mw.config.get("wgServer") + mw.config.get("wgScriptPath"),
    extensionRoot = mw.config.get("wgExtensionAssetsPath") + "/HWMap/";

/*
 * Initialize map
 */
function initHWMap() {
  mw.log('->HWMap->initHWMap');

  // Give up if no element on the page
  if(!document.getElementById("hwmap") || ($.inArray(mw.config.get("wgAction"), ["view", "purge", "submit"]) == -1) ) return;

  L.Icon.Default.imagePath = extensionRoot + 'modules/vendor/leaflet/dist/images';

  // Icons
  icons.country = L.icon({
    iconUrl:  extensionRoot + 'icons/city.png',
    iconRetinaUrl: extensionRoot + 'icons/city@2x.png'
  });
  icons.city = L.icon({
    iconUrl:  extensionRoot + 'icons/city.png',
    iconRetinaUrl: extensionRoot + 'icons/city@2x.png'
  });
  icons.unknown = L.icon({
    iconUrl:  extensionRoot + 'icons/0-none.png',
    iconRetinaUrl: extensionRoot + 'icons/0-none@2x.png'
  });
  icons.verygood = L.icon({
    iconUrl:  extensionRoot + 'icons/1-very-good.png',
    iconRetinaUrl: extensionRoot + 'icons/1-very-good@2x.png'
  });
  icons.good = L.icon({
    iconUrl:  extensionRoot + 'icons/2-good.png',
    iconRetinaUrl: extensionRoot + 'icons/2-good@2x.png'
  });
  icons.average = L.icon({
    iconUrl:  extensionRoot + 'icons/3-average.png',
    iconRetinaUrl: extensionRoot + 'icons/3-average@2x.png'
  });
  icons.bad = L.icon({
    iconUrl:  extensionRoot + 'icons/4-bad.png',
    iconRetinaUrl: extensionRoot + 'icons/4-bad@2x.png'
  });
  icons.senseless = L.icon({
    iconUrl:  extensionRoot + 'icons/5-senseless.png',
    iconRetinaUrl: extensionRoot + 'icons/5-senseless@2x.png'
  });
  icons.new = L.icon({
    iconUrl:  extensionRoot + 'icons/new.png',
    iconRetinaUrl: extensionRoot + 'icons/new@2x.png',
    shadowUrl: extensionRoot + 'icons/new-shadow.png',
    iconSize:     [25, 35], // size of the icon
    shadowSize:   [33, 33], // size of the shadow
    iconAnchor:   [12, 35], // point of the icon which will correspond to marker's location
    shadowAnchor: [5, 34],  // the same for the shadow
    popupAnchor:  [-3, -17] // point from which the popup should open relative to the iconAnchor
  });

  //Setting up the map
  hwmap = L.map('hwmap', {
    center: defaultCenter,
    zoom: defaultZoom
  });

  // Using a map tiles developed for Trustroots/Hitchwiki
  // https://github.com/Trustroots/Trustroots-map-styles/tree/master/Trustroots-Hitchmap.tm2
  // If we ever start using https, add this to the tiles url: &secure=1
  L.tileLayer('//{s}.tiles.mapbox.com/v4/'+mapboxUser+'.'+mapboxStyle+'/{z}/{x}/{y}.png?access_token=' + mapboxAccessToken, {
    attribution: '<a href="http://www.openstreetmap.org/" target="_blank">OSM</a>',
    maxZoom: 18,
    continuousWorld: true
  }).addTo(hwmap);

  // New spot marker
  newSpotMarker = L.marker(defaultCenter, {icon: icons.new}).bindPopup('Drag me!');

  // Layers
  newSpotLayer = new L.layerGroup([newSpotMarker]).addTo(hwmap);
  spotsLayer = new PruneClusterForLeaflet();
  hwmap.addLayer(spotsLayer);

  //Check if map is called from the special page
  if (mw.config.get("wgCanonicalSpecialPageName") == "HWMap") {
    setupSpecialPageMap();
  }
  //Check if map is called from a city page
  else if($.inArray("Cities", mw.config.get("wgCategories")) != -1 && mw.config.get("wgIsArticle")) {
    setupCityMap();
  }
  //Check if map is called from a country page
  else if($.inArray("Countries", mw.config.get("wgCategories")) != -1 && mw.config.get("wgIsArticle")) {
    setupCountryMap();
  }

  // Make sure map sits properly in its surrounding div
  hwmap.invalidateSize(false);

}

/*
 * Setup big map at Special:HWMap
 */
function setupSpecialPageMap() {
  mw.log('->HWMap->setupSpecialPageMap');
  //Set map view
  hwmap.setView([45, 10], 6);

  //Getting spots in bounding box
  getBoxSpots();

  //Fire event to check when map move
  hwmap.on('moveend', function() {
    mw.log(spotsLayer);
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

/*
 * Setup big map at city article
 */
function setupCityMap() {
  mw.log('->HWMap->setupCityMap');

  //Getting the current coordinate
  $.get( apiRoot + "/api.php?action=query&prop=coordinates&titles=" + mw.config.get("wgTitle") + "&format=json", function( data ) {
    for (var i in data.query.pages) {
      page = data.query.pages[i];
      break;
    }
    //Build city marker
    var marker = new PruneCluster.Marker(
      page.coordinates[0].lat,
      page.coordinates[0].lon
    );
    //Add icon
    marker.data.icon = icons.city;
    //Register marker
    spotsLayer.RegisterMarker(marker);

    //Set Map View
    hwmap.setView([page.coordinates[0].lat, page.coordinates[0].lon], 12);
    spotsLayer.ProcessView();
  });


  //Getting related spots
  $.get( apiRoot + "/api.php?action=hwmapcityapi&format=json&page_title=" + mw.config.get("wgTitle"), function( data ) {

    for (var i in data.query.spots) {
      //Build spot marker
      var marker = new PruneCluster.Marker(
        data.query.spots[i].location[0].lat,
        data.query.spots[i].location[0].lon
      );
      //Add icon
      marker.data.icon = iconSpot(data.query.spots[i].average);
      //Register marker
      spotsLayer.RegisterMarker(marker);
    }
    spotsLayer.ProcessView();
  });
}

/*
 * Setup big map at city article
 */
function setupCountryMap() {
  // @todo
}

/*
 * Spot icon builder
 *
 * @return L.marker
 */
var iconSpot = function (averageRating) {
  if(averageRating == 5) {
    return icons.verygood;
  }
  else if(averageRating == 4) {
    return icons.good;
  }
  else if(averageRating == 3) {
    return icons.average;
  }
  else if(averageRating == 2) {
    return icons.bad;
  }
  else if(averageRating == 1) {
    return icons.senseless;
  }
  else if(averageRating == null) {
    return icons.unknown;
  }
};


// Get markers in the current bbox
var getBoxSpots = function () {
  mw.log('->HWMap->getBoxSpots');
  bounds = hwmap.getBounds();
  console.log(bounds);
  if(bounds._northEast.lat > lastBounds.NElat || bounds._northEast.lng > lastBounds.NElng || bounds._southWest.lat < lastBounds.SWlat || bounds._southWest.lng < lastBounds.SWlng) {

    //Make the bounds a bit bigger
    lastBounds.NElat = parseInt(bounds._northEast.lat) + 1;
    lastBounds.NElng = parseInt(bounds._northEast.lng) + 1;
    lastBounds.SWlat = parseInt(bounds._southWest.lat) - 1;
    lastBounds.SWlng = parseInt(bounds._southWest.lng) - 1;

    // Query HWCoordinateAPI
    $.get( apiRoot + "/api.php?action=hwmapapi&SWlat=" + lastBounds.SWlat + "&SWlon=" + lastBounds.SWlng + "&NElat=" + lastBounds.NElat + "&NElon=" + lastBounds.NElng + "&format=json", function( data ) {

      if(data.error) {
        mw.log.warn(data.error);
      }
      else if(data.query) {
        //Clear the current markers
        spotsLayer.RemoveMarkers();

        //Add the new markers
        var spots = data.query.spots;
        for (var i in spots) {
          if(spots[i].category == 'Spots') {
            //Build marker
            var marker = new PruneCluster.Marker(
              spots[i].location[0],
              spots[i].location[1]
            );
            //Add icon
            marker.data.icon = iconSpot(spots[i].average_rating);

            //Register marker
            spotsLayer.RegisterMarker(marker);
          }
          else if(spots[i].category == 'Cities') {
            //Build marker
            var marker = new PruneCluster.Marker(
              spots[i].location[0],
              spots[i].location[1]
            );
            //Add icon
            marker.data.icon = icons.city;
            //Register marker
            spotsLayer.RegisterMarker(marker);
          }
        }
        spotsLayer.ProcessView();
      }

    });
  }
}

jQuery(document).ready(function($){
//jQuery( function( $ ) {

  // Let's roll!
  initHWMap();

});//jQuery

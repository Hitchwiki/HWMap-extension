/*
 * Hitchwiki Maps
 */

// Default location (can be overridden in the URL)
var defaultCenter = [48.6908333333, 9.14055555556], // Europe
    defaultZoom = 5;

// Mapbox settings
var mapboxUser = "trustroots",
    mapboxStyleStreets = "ce8bb774", //Trustroots maps
    mapboxStyleSatellite = 'kil7hee6', //Trustroots maps
    mapboxAccessToken = "pk.eyJ1IjoidHJ1c3Ryb290cyIsImEiOiJVWFFGa19BIn0.4e59q4-7e8yvgvcd1jzF4g";

// Geonames settings
var geonamesUsername = 'hitchwiki';
var spotCityDistance = 15; // in kilometers
var minPopulationNonCapital = 500000;

// Base URL of the page, without URL params
var pageLocation = window.history.location || window.location;
var pageLocationUrl = location.protocol + '//' + location.host + location.pathname;

// Setup variables
var hwmap,
    spotsLayer,
    newSpotMarker,
    newSpotLayer,
    icons = {},
    spotsData = {
      groupSpots: {},
    },
    $newSpotWrap = $("#hwmap-add-wrap"),
    $newSpotForm = $newSpotWrap.find("form"),
    $newSpotInit = $("#hwmap-add"),
    lastZoom = 0,
    lastBounds = { NElat:'0', NElng:'0', SWlat:'0', SWlng:'0' },
    apiRoot = mw.config.get("wgServer") + mw.config.get("wgScriptPath"),
    extensionRoot = mw.config.get("wgExtensionAssetsPath") + "/HWMap/",
    userId = mw.config.get("wgUserId"),
    token,
    ractive;



/*
 * Initialize map
 */
function initHWMap() {
  mw.log('->HWMap->initHWMap');

  // Give up if no element on the page
  if(!document.getElementById("hwmap") || ($.inArray(mw.config.get("wgAction"), ["view", "purge", "submit"]) == -1) ) return;

  var urlParamLat = mw.util.getParamValue('lat'),
    urlParamLng = mw.util.getParamValue('lng'),
    urlParamZoom = mw.util.getParamValue('zoom');

  if (urlParamLat && urlParamLng) {
    var urlParamLatValue = parseFloat(urlParamLat);
    var urlParamLngValue = parseFloat(urlParamLng);
    if (!isNaN(urlParamLatValue) && !isNaN(urlParamLngValue)) {
      defaultCenter = [urlParamLatValue, urlParamLngValue];
    }
  }

  if (urlParamZoom) {
    var urlParamZoomValue = parseInt(urlParamZoom);
    if (!isNaN(urlParamZoomValue)) {
      defaultZoom = urlParamZoomValue;
    }
  }

  L.Icon.Default.imagePath = extensionRoot + 'modules/vendor/leaflet/dist/images';

  // Icons
  icons.country = L.icon({
    iconUrl:  extensionRoot + 'icons/city.png',
    iconRetinaUrl: extensionRoot + 'icons/city@2x.png'
  });
  icons.city = L.icon({
    iconUrl:  extensionRoot + 'icons/city.png',
    iconRetinaUrl: extensionRoot + 'icons/city@2x.png',
    iconAnchor: [14, 14]
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

  // Using Mapbox tiles developed for Trustroots+Hitchwiki

  var mapBoxUrl = '//{s}.tiles.mapbox.com/v4/{user}.{map}/{z}/{x}/{y}.png' + L.Util.getParamString({
    //secure: 1, // Uncomment if we ever start using https
    access_token: mapboxAccessToken
  });
  var mapBoxAttribution = '<strong><a href="https://www.mapbox.com/map-feedback/#' + mapboxUser + '.' + mapboxStyleStreets + '/' + defaultCenter[1] + '/' + defaultCenter[0] + '/' + defaultZoom + '">Improve this map</a></strong>';
  var OSMAttribution = '<strong><a href="https://www.openstreetmap.org/login#map=' + defaultZoom + '/' + defaultCenter[0] + '/' + defaultCenter[1] + '">Improve this map</a></strong>';

  // https://github.com/Trustroots/Trustroots-map-styles/tree/master/Trustroots-Hitchmap.tm2
  var mapLayerStreets = L.tileLayer(mapBoxUrl, {
    attribution: mapBoxAttribution,
    maxZoom: 18,
    continuousWorld: true,
    user: mapboxUser,
    map: mapboxStyleStreets
  });
  // Satellite layer
  var mapLayerSatellite = L.tileLayer(mapBoxUrl, {
    attribution: mapBoxAttribution,
    maxZoom: 18,
    continuousWorld: true,
    user: mapboxUser,
    map: mapboxStyleSatellite
  });
  // OSM layer
  var mapLayerOSM = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: OSMAttribution,
    maxZoom: 18,
    continuousWorld: true
  });

  //Setting up the map
  hwmap = L.map('hwmap', {
    center: defaultCenter,
    zoom: defaultZoom,
    layers: [mapLayerStreets]
  });

  hwmap.whenReady(function(){
    setTimeout(function(){ hwmap.invalidateSize(); }, 500);
  });

  // Layers
  spotsLayer = new PruneClusterForLeaflet();
  spotsLayer.Cluster.Size = 10;

  //Check if map is called from the special page
  if (mw.config.get("wgCanonicalSpecialPageName") == "HWMap") {
    spotsLayer.PrepareLeafletMarker = function(leafletMarker, data) {
      leafletMarker.on('click', function(){
        openSpecialPageSpot(data.id);
      });
      leafletMarker.setIcon(data.icon);
    };
  }
  //Check if map is called from a city page
  else if($.inArray("Cities", mw.config.get("wgCategories")) != -1 && mw.config.get("wgIsArticle")) {
    spotsLayer.PrepareLeafletMarker = function(leafletMarker, data) {
      leafletMarker.on('click', function(){
        $('html, body').animate({
          scrollTop:$('#spot_'+data.id).offset().top -48
        }, 'fast');
      });
      leafletMarker.on('mouseover', function(){
        $('#spot_'+data.id).css('background-color', '#c4c4c4');
      });
      leafletMarker.on('mouseout', function(){
        $('#spot_'+data.id).css('background-color', 'transparent');
      });
      leafletMarker.setIcon(data.icon);
    };
  }
  //Check if map is called from a country page
  else if($.inArray("Countries", mw.config.get("wgCategories")) != -1 && mw.config.get("wgIsArticle")) {
    //@todo
  }

  hwmap.addLayer(spotsLayer);

  // Add layers
  var baseMaps = {
    "Streets": mapLayerStreets,
    "Satellite": mapLayerSatellite,
    "OpenStreetMap": mapLayerOSM
  };
  var overlayMaps = {
    "Spots": spotsLayer
  };
  L.control.layers(baseMaps, overlayMaps).addTo(hwmap);

  L.control.scale().addTo(hwmap);

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
 * Setup big map at city article
 */
function setupCountryMap() {
  $("body").addClass("hwmap-page");
  // @todo
}

// Get markers in the current bbox
var getBoxSpots = function () {
  bounds = hwmap.getBounds();

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
            marker.data.id = spots[i].id;

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

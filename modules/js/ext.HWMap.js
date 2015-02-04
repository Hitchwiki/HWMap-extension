/*
 * Hitchwiki Maps
 */

var hwConfig = mw.config.get( 'hwConfig' );

// Default location (can be overridden in the URL)
var defaultCenter = [48.6908333333, 9.14055555556], // Europe
    defaultZoom = 5;

// Mapbox settings
var mapboxUser = hwConfig.vendor.mapbox_username,
    mapboxStyleStreets = hwConfig.vendor.mapbox_mapkey_streets, //Trustroots maps
    mapboxStyleSatellite = hwConfig.vendor.mapbox_mapkey_satellite, //Trustroots maps
    mapboxAccessToken = hwConfig.vendor.mapbox_access_token;

// Geonames settings
var geonamesUsername = hwConfig.vendor.geonames_username;
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
    ractive,
    animatedSpot = false;



/*
 * Initialize map
 */
function initHWMap() {
  mw.log('->HWMap->initHWMap');

  // Give up if no element on the page
  if(!document.getElementById("hwmap") || ($.inArray(mw.config.get("wgAction"), ["view", "purge", "submit"]) == -1) ) return;

  // Define icons
  L.Icon.Default.imagePath = extensionRoot + 'modules/vendor/leaflet/dist/images';
  icons.country = L.icon({
    iconUrl:  extensionRoot + 'icons/city.svg',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
  icons.city = L.icon({
    iconUrl:  extensionRoot + 'icons/city.svg',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
  icons.unknown = L.icon({
    iconUrl:  extensionRoot + 'icons/0-none.svg',
    className: 'hw-spot-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
  icons.verygood = L.icon({
    iconUrl:  extensionRoot + 'icons/1-very-good.svg',
    className: 'hw-spot-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
  icons.good = L.icon({
    iconUrl:  extensionRoot + 'icons/2-good.svg',
    className: 'hw-spot-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
  icons.average = L.icon({
    iconUrl:  extensionRoot + 'icons/3-average.svg',
    className: 'hw-spot-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
  icons.bad = L.icon({
    iconUrl:  extensionRoot + 'icons/4-bad.svg',
    className: 'hw-spot-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
  icons.senseless = L.icon({
    iconUrl:  extensionRoot + 'icons/5-senseless.svg',
    className: 'hw-spot-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
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

  // OSM layer
  var mapLayerOSM = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: OSMAttribution,
    maxZoom: 18,
    continuousWorld: true
  });

  // defaultLayer is shown at map init
  var defaultLayer = mapLayerOSM;

  // Layers for Layer controller
  var baseMaps = {
    "OpenStreetMap": mapLayerOSM
  };

  // Streets layer
  // https://github.com/Trustroots/Trustroots-map-styles/tree/master/Trustroots-Hitchmap.tm2
  if(mapboxStyleStreets) {
    var mapLayerStreets = L.tileLayer(mapBoxUrl, {
      attribution: mapBoxAttribution,
      maxZoom: 18,
      continuousWorld: true,
      user: mapboxUser,
      map: mapboxStyleStreets
    });
    defaultLayer = mapLayerStreets;
    baseMaps["Streets"] = mapLayerStreets;
  }

  // Satellite layer
  if(mapboxStyleSatellite) {
    var mapLayerSatellite = L.tileLayer(mapBoxUrl, {
      attribution: mapBoxAttribution,
      maxZoom: 18,
      continuousWorld: true,
      user: mapboxUser,
      map: mapboxStyleSatellite
    });
    baseMaps["Satellite"] = mapLayerSatellite;
  }

  // Map init
  hwmap = L.map('hwmap', {
    center: defaultCenter,
    zoom: defaultZoom,
    layers: [defaultLayer],
    attributionControl: false
  });

  // Fixes map loading partially, probably some sort of a CSS issue but this fixes it...
  // Feel free to fix if you have spare time. ;-)
  hwmap.whenReady(function(){
    setTimeout(function(){ hwmap.invalidateSize(); }, 500);
  });

  // Layers
  spotsLayer = new PruneClusterForLeaflet(60, 60);
  //spotsLayer.Cluster.Size = 10;

  //Check if map is called from the special page
  if (mw.config.get("wgCanonicalSpecialPageName") == "HWMap") {


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

    hwmap.on('click', closeSpecialPageSpot);

    spotsLayer.PrepareLeafletMarker = function(leafletMarker, data) {
      leafletMarker.setIcon(data.icon, data.HWid);
      if(data.HWtype == 'spot') {
        if(animatedSpot == data.HWid) {
          animateSpot(data.HWid);
        }
        leafletMarker.on('click', function(){
          openSpecialPageSpot(data.HWid);
        });
      }
      if(data.HWtype == 'city') {
        $("#marker-" + data.HWid).tipsy({fallback: 'Open ' + data.title, gravity: $.fn.tipsy.autoNS});
        leafletMarker.on('click', function(){
          window.location = wgArticlePath.replace('$1', data.title);
        });
      }
    };
  }
  //Check if map is called from a city page
  else if($.inArray("Cities", mw.config.get("wgCategories")) != -1 && mw.config.get("wgIsArticle")) {

    hwmap.on('click', stopAnimateSpot);

    spotsLayer.PrepareLeafletMarker = function(leafletMarker, data) {
      leafletMarker.setIcon(data.icon, data.HWid);
      if(data.HWtype == 'spot') {
        leafletMarker.on('click', function() {
          $('html, body').animate({
            scrollTop: $('#spot_' + data.HWid).offset().top - 150
          }, 'fast');
          animateSpot(data.HWid);
        });
        leafletMarker.on('mouseover', function(){
          $('#spot_' + data.HWid).addClass('spot-hover');
        });
        leafletMarker.on('mouseout', function(){
          $('.spot-hover').removeClass('spot-hover');
        });
        if(animatedSpot == data.HWid) {
          animateSpot(data.HWid);
        }
      }
      else if(data.HWtype == 'city') {
        leafletMarker.on('click', function() {
          $('html, body').animate({
            scrollTop: $('body').offset().top
          }, 'fast');
        });
      }
    };
  }
  //Check if map is called from a country page
  else if($.inArray("Countries", mw.config.get("wgCategories")) != -1 && mw.config.get("wgIsArticle")) {
    //@todo
  }

  hwmap.addLayer(spotsLayer);

  // Layer control
  L.control.layers(
    // Tile layers:
    baseMaps,
    // Overlay maps:
    {}
  ).addTo(hwmap);

  // Add attribution layer again (was set false at map init)
  L.control.attribution({position: 'bottomleft', prefix: ''}).addTo(hwmap);

  // Scale control
  L.control.scale().addTo(hwmap);

  //Check if map is called from the special page
  if (mw.config.get("wgCanonicalSpecialPageName") == "HWMap") {
    setupSpecialPageMap(mw.util.getParamValue('spot'));
  }
  //Check if map is called from a city page
  else if($.inArray("Cities", mw.config.get("wgCategories")) != -1 && mw.config.get("wgIsArticle")) {
    setupCityMap();
  }
  //Check if map is called from a country page
  else if($.inArray("Countries", mw.config.get("wgCategories")) != -1 && mw.config.get("wgIsArticle")) {
    setupCountryMap();
    initCountryRatingsTemplate();
  }

  // Make sure map sits properly in its surrounding div
  hwmap.invalidateSize(false);

}

// Get markers in the current bbox
var getBoxSpots = function (category) {
  if(!category) {
    category = "";
  }

  bounds = hwmap.getBounds();

  if(bounds._northEast.lat > lastBounds.NElat || bounds._northEast.lng > lastBounds.NElng || bounds._southWest.lat < lastBounds.SWlat || bounds._southWest.lng < lastBounds.SWlng) {

    //Make the bounds a bit bigger
    lastBounds.NElat = bounds._northEast.lat +1;
    lastBounds.NElng = bounds._northEast.lng +1;
    lastBounds.SWlat = bounds._southWest.lat -1;
    lastBounds.SWlng = bounds._southWest.lng -1;

    // Query HWCoordinateAPI
    $.get( apiRoot + "/api.php?action=hwmapapi&SWlat=" + lastBounds.SWlat + "&SWlon=" + lastBounds.SWlng + "&NElat=" + lastBounds.NElat + "&NElon=" + lastBounds.NElng + "&category=" + category + "&format=json", function( data ) {

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
            marker.data.HWid = spots[i].id;
            marker.data.HWtype = 'spot';

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
            marker.data.HWid = spots[i].id;
            marker.data.HWtype = 'city';
            marker.data.title = spots[i].title;
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


//Let's hook into this leaflet so it let us add ID to spots
(function () {
  var original_initIcon = L.Marker.prototype._initIcon,
      originalsetIcon = L.Marker.prototype.setIcon;

  L.Marker.include({
    setIcon: function (icon, id) {
      this.options.id = id;
      originalsetIcon.call(this, icon);
    },
    _initIcon: function () {
      original_initIcon.call(this);
      this._icon.id = "marker-" + this.options.id;
    }
  });
})();

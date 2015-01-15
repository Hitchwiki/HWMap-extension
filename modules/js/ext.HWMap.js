/*
 * Hitchwiki Maps
 */

// Defaults
var defaultCenter = [48.6908333333, 9.14055555556], // Europe
    defaultZoom = 5;

// Mapbox settings
var mapboxUser = "trustroots",
    mapboxStyleStreets = "ce8bb774", //Trustroots maps
    mapboxStyleSatellite = 'kil7hee6', //Trustroots maps
    mapboxAccessToken = "pk.eyJ1IjoidHJ1c3Ryb290cyIsImEiOiJVWFFGa19BIn0.4e59q4-7e8yvgvcd1jzF4g";

// Geonames settings
var geonamesUsername = 'hitchwiki';

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

//Function to get edit token
var getToken = function (callback) {
  if(userId) {
    $.get( apiRoot + "/api.php?action=query&meta=tokens&format=json", function( data ) {
      callback(data.query.tokens.csrftoken);
    });
  }
  else {
    callback(null);
  }
};


//addRating
var addRatings = function(newRating, id) {
  //Get token
  getToken(function(token) {
    if(token) {
      //Post new rating
      $.post(  apiRoot + "/api.php?action=hwaddrating&format=json", { rating: newRating, pageid: id, token: token})
      .done(function( data ) {
        console.log(data);
        if(data.query.average) {
          //Update spot with new average
          for (var key in spotsData.groupSpots) {
            var spots = spotsData.groupSpots[key];
            for(var i = 0; i < spots.length && spots[i].id != id; i++) {}
            if(i < spots.length) {
              ractive.set('groupSpots.'+key+'.'+i+'.timestamp_user', parseTimestamp(data.query.timestamp) );
              ractive.set('groupSpots.'+key+'.'+i+'.rating_user', newRating);
              ractive.set('groupSpots.'+key+'.'+i+'.rating_user_label', getRatingLabel(newRating.toString()));
              ractive.set('groupSpots.'+key+'.'+i+'.rating_average', data.query.average );
              ractive.set('groupSpots.'+key+'.'+i+'.rating_count', data.query.count );
              ractive.set('groupSpots.'+key+'.'+i+'.average_label', getRatingLabel(data.query.average));
              break;
            }
          }
        }
      });
    }
    else {
      mw.log('Not logged in ');
    }
  });
}

//addRating
var deleteRating = function(id) {
  //Get token
  getToken(function(token) {
    if(token) {
      //Post new rating
      $.post(  apiRoot + "/api.php?action=hwdeleterating&format=json", {pageid: id, token: token})
      .done(function( data ) {
        console.log(data);
        if(data.query) {
          //Update spot with new average
          for (var key in spotsData.groupSpots) {
            var spots = spotsData.groupSpots[key];
            for(var i = 0; i < spots.length && spots[i].id != id; i++) {}
            if(i < spots.length) {
              ractive.set('groupSpots.'+key+'.'+i+'.timestamp_user', 0);
              ractive.set('groupSpots.'+key+'.'+i+'.rating_user', 0);
              ractive.set('groupSpots.'+key+'.'+i+'.rating_user_label', null);
              ractive.set('groupSpots.'+key+'.'+i+'.rating_average', data.query.average.toString() );
              ractive.set('groupSpots.'+key+'.'+i+'.rating_count', data.query.count );
              ractive.set('groupSpots.'+key+'.'+i+'.average_label', getRatingLabel(data.query.average.toString()));
              break;
            }
          }
        }
      });
    }
    else {
      mw.log('Not logged in ');
    }
  });
}

var parseTimestamp = function (timestamp) {
    return timestamp.slice(6, 8)+'.'+timestamp.slice(4, 6)+'.'+timestamp.slice(0, 4);
};

var getRatingLabel = function (rating) {
  var label;
  switch (rating) {
    case '1':
      label = "Senseless";
      break;
    case '2':
      label = "Bad";
      break;
    case '3':
      label = "Average";
      break;
    case '4':
      label = "Good";
      break;
    case '5':
      label = "Very good";
      break;
    default:
      label = "Unknown";
  }
  return label;
};

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
  var mapBoxAttribution = '<a href="https://www.mapbox.com/map-feedback/#' + mapboxUser + '.' + mapboxStyleStreets + '/' + defaultCenter[0] + '/' + defaultCenter[1] + '/' + defaultZoom + '">Improve this map</a></strong>';

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

  //Setting up the map
  hwmap = L.map('hwmap', {
    center: defaultCenter,
    zoom: defaultZoom,
    layers: [mapLayerStreets]
  });

  hwmap.whenReady(function(){

  });

  // Layers
  spotsLayer = new PruneClusterForLeaflet();

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

  hwmap.addLayer(spotsLayer);

  // Add layers
  var baseMaps = {
    "Streets": mapLayerStreets,
    "Satellite": mapLayerSatellite
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

function setupNewSpot() {
  mw.log('->setupNewSpot');

  // Craete new spot marker + layer
  newSpotMarker = L.marker(hwmap.getCenter(), {
    icon: icons.new,
    draggable: true,
    title: "Drag me!"
  });
  newSpotLayer = new L.layerGroup([newSpotMarker]).addTo(hwmap);

  // Dragged location of the new spot
  // Preset some values at the form
  newSpotMarker.on("dragend", function(event){
    newSpotReverseGeocode(event);
  });

  newSpotReverseGeocode();

  $newSpotWrap.find('#hwmap-cancel-adding').click(function(e){
    tearApartNewSpot();
  });

  $newSpotWrap.fadeIn('fast');

}

function tearApartNewSpot() {
  mw.log('->tearApartNewSpot');
  $newSpotWrap.fadeOut('fast');
  $newSpotInit.fadeIn('fast');
  hwmap.removeLayer(newSpotLayer);
  newSpotMarker = null;
  newSpotLayer = null;
}


function newSpotReverseGeocode(event) {

  $newSpotForm.find("input[type='submit']").attr('disabled', 'disabled');

  var newSpotLocation = (event) ? event.target.getLatLng() : hwmap.getCenter();

  // Spot coordinates
  $newSpotForm.find("input[name='Spot[Location]']").val( newSpotLocation.lat + ',' + newSpotLocation.lng );

  // Spot name
  $.ajax({
    url: 'http://api.geonames.org/findNearbyPlaceNameJSON',
    dataType: 'jsonp',
    data: {
      lat: newSpotLocation.lat,
      lng: newSpotLocation.lng,
      featureClass: 'P',
      style: 'full',
      maxRows: 1,
      lang: 'en',
      username: geonamesUsername
    },
    success: function( data ) {
      mw.log( data );

      // Mandatory name for the MW article
      var placeName = '';//'Hitchhiking spot in ';

      var municipality = (data.geonames[0].adminName2 && data.geonames[0].adminName2 != '') ? data.geonames[0].adminName2 : false;

      var country = (data.geonames[0].countryName && data.geonames[0].countryName !== '') ? data.geonames[0].countryName : false;

      if(municipality) {
        // Add municipality name to article name
        placeName += municipality;

        // Prefill city input at the form
        $newSpotForm.find("input[name='Spot[Cities]']").val( municipality );
      }

      // Divicer
      if(municipality && country) {
           placeName += ', ';
      }

      if(country) {
        // Add country name to article name
        placeName += country;

        // Prefill country input at the form
        $newSpotForm.find("input[name='Spot[Country]']").val( country );
      }

      // Name must be unique, add coordinates to article name
      placeName += ' (' + Number((newSpotLocation.lat).toFixed(6)) + ', ' + Number((newSpotLocation.lng).toFixed(6)) + ')';

      // Prefil name input at the form
      $newSpotForm.find("input[name='page_name']").val(placeName);

      // Enable the form again
      $newSpotForm.find("input[type='submit']").removeAttr('disabled');
    }
  });

}

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
  $.get( apiRoot + "/api.php?action=hwmapcityapi&format=json&properties=Location,Country,CardinalDirection,CitiesDirection,RoadsDirection&page_title=" + mw.config.get("wgTitle"), function( data ) {
    //Let's group the different spots by cardinal direction
    for(var i = 0; i < data.query.spots.length; i++) {
      data.query.spots[i].average_label = getRatingLabel(data.query.spots[i].rating_average);
      if(!data.query.spots[i].rating_average) {
        data.query.spots[i].rating_average = '0';
      }
      if(data.query.spots[i].timestamp_user){
        data.query.spots[i].timestamp_user = parseTimestamp(data.query.spots[i].timestamp_user);
      }
      if(data.query.spots[i].rating_user){
        data.query.spots[i].rating_user_label = getRatingLabel(data.query.spots[i].rating_user);
      }

      //data.query.spots[i].Description = $.parseHTML(data.query.spots[i].Description);
      if(data.query.spots[i].CardinalDirection == "") {
        if(!spotsData.groupSpots['Other directions']) {
          spotsData.groupSpots['Other directions'] = [];
        }
        spotsData.groupSpots['Other directions'].push(data.query.spots[i]);
      }
      else {
        var CardinalDirection = data.query.spots[i].CardinalDirection.join(', ');
        if(!spotsData.groupSpots[CardinalDirection]) {
          spotsData.groupSpots[CardinalDirection] = [];
        }
        spotsData.groupSpots[CardinalDirection].push(data.query.spots[i]);
      }

    }

    console.log(spotsData);

    //Init template from ext.HWMAP.CitySpots.js
    initTemplate();

    var citySpots = data.query.spots;

    for (var i in citySpots) {
      //Build spot marker
      var marker = new PruneCluster.Marker(
        citySpots[i].Location[0].lat,
        citySpots[i].Location[0].lon
      );
      //Add icon
      marker.data.icon = iconSpot(citySpots[i].average);
      //Add id
      marker.data.id = citySpots[i].id;
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
  else {
    return icons.unknown;
  }
};


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

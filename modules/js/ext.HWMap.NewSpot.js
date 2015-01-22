function setupNewSpot() {
  mw.log('->setupNewSpot');

  $newSpotInit.hide();

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

  // Stop clicking map trough this this area
  $newSpotWrap.click(function(e){
    console.log('daaa!');
    e.stopPropagation();
  });

  // Move marker to where user clicked on the map
  hwmap.on("click", setNewSpotMarkerLocation);

  newSpotReverseGeocode();

  $newSpotWrap.find('#hwmap-cancel-adding').click(function(e){
    tearApartNewSpot();
  });

  $newSpotWrap.fadeIn('fast');

}

function setNewSpotMarkerLocation(event){
  newSpotMarker.setLatLng(event.latlng);
}

/*
 * Clean out adding new spot form/buttons etc
 */
function tearApartNewSpot() {
  mw.log('->tearApartNewSpot');
  $newSpotWrap.fadeOut('fast');
  $newSpotInit.fadeIn('fast');
  hwmap.removeLayer(newSpotLayer);
  hwmap.off("click", setNewSpotMarkerLocation);
  newSpotMarker = null;
  newSpotLayer = null;
}


function newSpotReverseGeocode(event) {

  var city = '', country = '', isBigCity = false;

  function fillSpotForm() {
    var placeName = '';

    // Prefill city input at the form
    if (city != '') {
      placeName += city;
      if (isBigCity) {
        $newSpotForm.find("input[name='Spot[Cities]']").val( city );
      }
    }

    // Prefill country input at the form
    if (country != '') {
      if (placeName != '')
        placeName += ', ';
      placeName += country;
      $newSpotForm.find("input[name='Spot[Country]']").val( country );
    }

    // Add coordinates to the spot title to ensure its uniqueness
    if (placeName != '')
      placeName += ' ';
    placeName += '(' + Number((newSpotLocation.lat).toFixed(6)) + ', ' + Number((newSpotLocation.lng).toFixed(6)) + ')';

    // Prefill name input at the form
    $newSpotForm.find("input[name='page_name']").val(placeName);

    // Enable the form again
    $newSpotForm.find("input[type='submit']").removeAttr('disabled');
  }

  $newSpotForm.find("input[type='submit']").attr('disabled', 'disabled');

  var newSpotLocation = (event) ? event.target.getLatLng() : hwmap.getCenter();

  // Spot coordinates
  $newSpotForm.find("input[name='Spot[Location]']").val( newSpotLocation.lat + ',' + newSpotLocation.lng );

  var point = new GeoPoint(newSpotLocation.lat, newSpotLocation.lng);
  var bbox = point.boundingCoordinates(20, null, true);

  // Spot name
  $.ajax({
    url: 'http://api.geonames.org/citiesJSON',
    dataType: 'jsonp',
    data: {
      north: bbox[1].latitude(),
      east: bbox[1].longitude(),
      south: bbox[0].latitude(),
      west: bbox[0].longitude(),
      style: 'full',
      maxRows: 1,
      lang: 'en',
      username: geonamesUsername
    },
    success: function( data ) {
      if (data.geonames && data.geonames.length != 0) {
        place = data.geonames[0];

        isBigCity = (
          (place.fcode && $.inArray(place.fcode, ['PPLC', 'PPLA']) != -1) || // country capital (eg. Warsaw) or regional capital (eg. Lviv)
          (place.population && place.population >= minPopulationNonCapital) // populated city (eg. Rotterdam)
        );

        if(place.name) {
          city = place.name;
        }

        var countryCode = data.geonames[0].countrycode;
        if (countryCode && countryCode != '') {
          $.ajax({
            url: 'http://api.geonames.org/countryInfoJSON',
            dataType: 'jsonp',
            data: {
              country: countryCode,
              style: 'full',
              maxRows: 1,
              lang: 'en',
              username: geonamesUsername
            },
            success: function ( data ) {
              if (data.geonames && data.geonames.length != 0) {
                var countryInfo = data.geonames[0];
                if (countryInfo && countryInfo.countryName) {
                  country = countryInfo.countryName;
                }
              }
              fillSpotForm();
            },
            error: function () { // country info lookup request failed
              fillSpotForm();
            }
          });
        } else { // no country code in city search response
          fillSpotForm();
        }
      } else { // no closeby cities found
          fillSpotForm();
      }
    },
    error: function () { // city search request failed
      fillSpotForm();
    }
  });

}

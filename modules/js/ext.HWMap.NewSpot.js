function setupNewSpot() {
  mw.log('->HWMap->setupNewSpot');

  // Hide "add new spot" button
  $newSpotInit.hide();

  // Craete new spot marker + layer
  newSpotMarker = L.marker(hwmap.getCenter(), {
    icon: icons.new,
    draggable: true,
    title: 'Drag me!'
  });

  // Leaflet layer for adding the new spot
  newSpotLayer = new L.layerGroup([newSpotMarker]).addTo(hwmap);

  // Dragged location of the new spot
  // Preset some values at the form
  newSpotMarker.on('dragend', function(event) {
    newSpotReverseGeocode(event);
  });

  // Stop clicking map trough this this area
  $newSpotWrap.click(function(e){
    e.stopPropagation();
  });

  // Move marker to where user clicked on the map
  hwmap.on('click', setNewSpotMarkerLocation);

  newSpotReverseGeocode();

  $newSpotWrap.find('#hwmap-cancel-adding').click(function(e) {
    clearAddNewSpotUI();
  });

  $newSpotWrap.fadeIn('fast');


  /**
   * Modifying Mediawiki SemanticForms popup to please our needs
   */
  $newSpotWrap.find( 'form.popupforminput' ).submit(function(evt) {
    var iframeTimer,
        needsRender,
        $popup = $('.popupform-innerdocument'); // There's also `.popupform-wrapper`

    // `.popupform-innerdocument` was removed from DOM because successfully
    // adding new spot, cancelling or any other reason.
    $popup.on('remove', function() {
      clearAddNewSpotUI();
    });

    // store initial readystate
    var readystate = $popup.contents()[0].readyState;

    // set up iframeTimer for waiting on the document in the iframe to be dom-ready
    // this sucks, but there is no other way to catch that event
    // onload is already too late
    //
    // This code is from SemanticForms PF_popupform.js
    // https://github.com/wikimedia/mediawiki-extensions-PageForms/blob/REL1_28/libs/PF_popupform.js
    iframeTimer = setInterval(function() {
      // if the readystate changed
      if ( readystate !== $popup.contents()[0].readyState ) {
      	// store new readystate
      	readystate = $popup.contents()[0].readyState;
      	// if dom is built but document not yet displayed
      	if (readystate === 'interactive') {
      		needsRender = false; // flag that rendering is already done
          setupNewSpotFormContents(iframeTimer, $popup);
      	}
      }
    }, 100 );
    // fallback in case we did not catch the dom-ready state
    $popup.on('load', function( event ) {
      if (needsRender) { // rendering not already done?
        setupNewSpotFormContents(iframeTimer, $popup);
      }
      needsRender = true;
    });
  });

}

/**
 * After popup and iframe inside it has loaded,
 * tweak some contents to suit us better.
 */
function setupNewSpotFormContents(iframeTimer, $popup) {
  clearTimeout(iframeTimer);
  // Modify contents of that popup
  $popup
    .contents()

    // No title at this form
    .find('#firstHeading').hide().end()

    // For some odd reason, these Select2 inputs have fixed min-style:600px
    // That sucks. This removes them, and they're handled at
    // HitchwikiVector/resources/styles/forms.less instead.
    //
    // Removed: doesn't function right now — occurs perhaps before `select2()` ?
    // .find('.select2-container').attr('style', '').end()

    .contents();
}


function setNewSpotMarkerLocation(event) {
  newSpotMarker.setLatLng(event.latlng);
}

/**
 * Clean out adding new spot UI elements and event listeners
 */
function clearAddNewSpotUI() {
  mw.log('->HWMaps->clearAddNewSpotUI');
  $newSpotWrap.fadeOut('fast');
  $newSpotInit.fadeIn('fast');
  if (hwmap.hasLayer(newSpotLayer)) {
    hwmap.removeLayer(newSpotLayer);
  }
  hwmap.off('click', setNewSpotMarkerLocation);
  newSpotMarker = null;
  newSpotLayer = null;
}

/**
 * Reverse geocode (lat,lon => place name)
 */
function newSpotReverseGeocode(event) {

  var city = '', country = '', isBigCity = false;

  function fillSpotForm() {
    var placeName = '';

    // Prefill city input at the form
    if (city != '') {
      placeName += city;
      if (isBigCity) {
        $newSpotForm.find('input[name="Spot[Cities]"]').val(city);
      }
    }

    // Prefill country input at the form
    if (country != '') {
      if (placeName != '') {
        placeName += ', ';
      }
      placeName += country;
      $newSpotForm.find('input[name="Spot[Country]"]').val(country);
    }

    // Add coordinates to the spot title to ensure its uniqueness
    var titleCoordinates = Number((newSpotLocation.lat).toFixed(6)) + ', ' + Number((newSpotLocation.lng).toFixed(6));
    if (placeName != '') {
      // Append coordinates to title in brackets
      placeName += ' ';
      placeName += '(' + titleCoordinates + ')';
    } else {
      // If place name was empty, it'll be just coordinates without brackets
      placeName += titleCoordinates;
    }

    // Prefill name input at the form
    $newSpotForm.find('input[name="page_name"]').val(placeName);

    // Enable the form again
    $newSpotForm.find('input[type="submit"]').removeAttr('disabled');
  }

  $newSpotForm.find('input[type="submit"]').attr('disabled', 'disabled');

  var newSpotLocation = (event) ? event.target.getLatLng() : hwmap.getCenter();

  // Spot coordinates
  $newSpotForm.find('input[name="Spot[Location]"]').val(newSpotLocation.lat + ',' + newSpotLocation.lng);

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

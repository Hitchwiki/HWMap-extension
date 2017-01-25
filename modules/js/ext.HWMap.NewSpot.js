(function(mw, $) {

  mw.log('HWMaps::NewSpot');

  var newSpotMarker,
      $newSpotWrap,
      $newSpotForm,
      $newSpotInitButton,
      geonamesUsername = _.get(mw, 'HWMaps.config.vendor.geonames_username');

  /**
   * @class mw.HWMaps.NewSpot
   *
   * @constructor
   */
  function NewSpot() {
    mw.log('HWMaps::NewSpot::constructor');
  }

  /**
   * Initiate UI for adding a new spot.
   * Tear down everything this function does by calling `clearAddNewSpotUI()`
   */
  NewSpot.setupNewSpot = function() {
    mw.log('HWMaps::NewSpot::setupNewSpot');

    $newSpotWrap = $('#hwmap-add-wrap');
    $newSpotForm = $newSpotWrap.find('form');
    $newSpotInitButton = $('#hwmap-add');

    // Place marker to the middle of the map
    var newMarkerLocation = mw.HWMaps.leafletMap.getCenter();

    mw.log('hide $newSpotInitButton:');
    mw.log($newSpotInitButton);

    // Hide "add new spot" button
    $newSpotInitButton.hide();

    $newSpotWrap.fadeIn('fast');

    // Attach event to "cancel" button
    $newSpotWrap.find('#hwmap-cancel-adding').click(function(e) {
      clearAddNewSpotUI();
    });

    // Cancel adding new spot by hitting esc key
    $(document).on('keydown.escape', function(e) {
      var keycode = ((typeof e.keyCode !== 'undefined' && e.keyCode) ? e.keyCode : e.which);
      if (keycode === 27) { // escape key maps to keycode `27`
        mw.log('HWMaps::NewSpot::setupNewSpot: keydown.excape');
        // Clear UI
        clearAddNewSpotUI();
        // Clear out this event listener
        $(document).off('keydown.escape');
      };
    });

    // Stop clicking map trough this this area
    $newSpotWrap.click(function(e) {
      e.stopPropagation();
    });

    // Craete new spot marker + layer
    newSpotMarker = L.marker(newMarkerLocation, {
      icon: mw.HWMaps.icons.new,
      draggable: true,
      title: 'Drag me!'
    });

    // Dragged location of the new spot
    // Preset some values at the form
    newSpotMarker.on('dragend', function(event) {
      newSpotReverseGeocode(event.target.getLatLng());
    });

    // Move marker to where user clicked on the map
    mw.HWMaps.leafletMap.on('click', setNewSpotMarkerLocation);

    // Create a separate Leaflet layer for "new place" marker
    mw.HWMaps.leafletLayers.newSpot = new L.layerGroup([newSpotMarker]).addTo(mw.HWMaps.leafletMap);

    // Since marker is at the beginning placed in the middle
    newSpotReverseGeocode(newMarkerLocation);

    // Modifying Mediawiki SemanticForms popup to please our needs
    $newSpotWrap.find('form.popupforminput').submit(function(evt) {
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
        if (readystate !== $popup.contents()[0].readyState) {
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
      $popup.on('load', function(event) {
        if (needsRender) { // rendering not already done?
          setupNewSpotFormContents(iframeTimer, $popup);
        }
        needsRender = true;
      });
    });

  };

  /**
   * After popup and iframe inside it has loaded,
   * tweak some contents to suit us better.
   */
  function setupNewSpotFormContents(iframeTimer, $popup) {
    mw.log('HWMaps::NewSpot::setupNewSpotFormContents');
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

  /**
   * Clean out adding new spot UI elements and event listeners
   */
  function clearAddNewSpotUI() {
    mw.log('HWMaps::NewSpot::clearAddNewSpotUI');
    $newSpotWrap.fadeOut('fast');
    $newSpotInitButton.fadeIn('fast');
    if (mw.HWMaps.leafletMap.hasLayer(mw.HWMaps.leafletLayers.newSpot)) {
      mw.HWMaps.leafletMap.removeLayer(mw.HWMaps.leafletLayers.newSpot);
    }
    mw.HWMaps.leafletMap.off('click', setNewSpotMarkerLocation);
    // Clear out the marker object
    newSpotMarker = null;
    // Clear out layer where that marker was placed
    mw.HWMaps.leafletLayers.newSpot = null;
  }

  /**
   * Sets marker to a clicked spot on map
   */
  function setNewSpotMarkerLocation(event) {
    mw.log('HWMaps::NewSpot::setNewSpotMarkerLocation');
    mw.log(event);
    if (!event || !event.latlng) {
      mw.log.error('HWMaps::NewSpot::setNewSpotMarkerLocation: No click event! #fsadjk');
      return;
    }
    // Move marker to new location
    newSpotMarker.setLatLng(event.latlng);

    // Geocode new location
    newSpotReverseGeocode(event.latlng);
  }

  /**
   * Reverse geocode (lat,lon => place name)
   * @todo: needs refactoring. Move GeoCoder stuff to a separate class?
   * @param latLng Leaflet latLng object (http://leafletjs.com/reference-1.0.0.html#latlng)
   */
  function newSpotReverseGeocode(latLng) {
    mw.log('HWMaps::NewSpot::newSpotReverseGeocode');

    // No coordinates?
    if (!latLng) {
      mw.log.error('HWMaps::NewSpot::newSpotReverseGeocode: no coordinates #j9387u');
      return;
    }

    // No Geonames username?
    if (!geonamesUsername) {
      clearAddNewSpotUI();
      mw.log.error('HWMaps::NewSpot::newSpotReverseGeocode: No GeoNames username #j8h233');
      // Bubble notification
      // `mw.message` gets message translation, see `i18n/en.json`
      // `tag` replaces any previous bubbles by same tag
      // https://www.mediawiki.org/wiki/ResourceLoader/Modules#mediawiki.notify
      mw.notify(mw.message('hwmap-error-geocoder').text(), { tag: 'hwmap-error' });
      return;
    }

    var city = '',
        country = '',
        isBigCity = false,
        // Get this value from config, but default to 500K
        geonamesMinPopulationNonCapital = _.get(mw, 'HWMaps.config.geonamesMinPopulationNonCapital', 500000);

    // Cache jQuery elements
    var $inputCity = $newSpotForm.find('input[name="Spot[Cities]"]'),
        $inputCountry = $newSpotForm.find('input[name="Spot[Country]"]'),
        $inputPageName = $newSpotForm.find('input[name="page_name"]'),
        $inputLocation = $newSpotForm.find('input[name="Spot[Location]"]'),
        $submitButton = $newSpotForm.find('input[type="submit"]');

    // Empty previously set input values
    $inputCity.val('');
    $inputCountry.val('');
    $inputPageName.val('');

    function fillSpotForm() {
      var placeName = '';

      // Prefill city input at the form
      if (city !== '') {
        placeName += city;
        if (isBigCity) {
          $inputCity.val(city);
        }
      }

      // Prefill country input at the form
      if (country !== '') {
        if (placeName !== '') {
          placeName += ', ';
        }
        placeName += country;
        $inputCountry.val(country);
      }

      // Add coordinates to the spot title to ensure its uniqueness
      var titleCoordinates = Number((latLng.lat).toFixed(6)) + ', ' + Number((latLng.lng).toFixed(6));
      if (placeName !== '') {
        // Append coordinates to title in brackets
        placeName += ' ';
        placeName += '(' + titleCoordinates + ')';
      } else {
        // If place name was empty, it'll be just coordinates without brackets
        placeName += titleCoordinates;
      }

      // Prefill name input at the form
      $inputPageName.val(placeName);

      // Enable the form again
      $submitButton.removeAttr('disabled');
    }

    $submitButton.attr('disabled', 'disabled');

    // Spot coordinates
    $inputLocation.val(latLng.lat + ',' + latLng.lng);

    // See GeoPoint `ext.HWMap.GeoPoint.js` for `GeoPoint` class
    var point = new mw.HWMaps.GeoPoint(latLng.lat, latLng.lng);
    var bbox = point.boundingCoordinates(20, null, true);

    // Spot name
    // @TODO: HTTPS!
    $.ajax({
      url: 'http://api.geonames.org/citiesJSON',
      dataType: 'jsonp',
      data: {
        // `latitude()` and `longitude()` are `mw.HWMaps.GeoPoint` methods
        north: bbox[1].latitude(),
        east: bbox[1].longitude(),
        south: bbox[0].latitude(),
        west: bbox[0].longitude(),
        style: 'full',
        maxRows: 1,
        lang: 'en',
        username: geonamesUsername
      },
      success: function(data) {
        if (_.isArray(data.geonames) && data.geonames.length > 0) {
          place = data.geonames[0];

          isBigCity = (
            (place.fcode && $.inArray(place.fcode, ['PPLC', 'PPLA']) !== -1) || // country capital (eg. Warsaw) or regional capital (eg. Lviv)
            (place.population && place.population >= geonamesMinPopulationNonCapital) // populated city (eg. Rotterdam)
          );

          if (place.name) {
            city = place.name;
          }

          var countryCode = data.geonames[0].countrycode;
          if (countryCode && countryCode !== '') {
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
              success: function(data) {
                if (_.isArray(data.geonames) && data.geonames.length > 0) {
                  var countryInfo = data.geonames[0];
                  if (countryInfo && countryInfo.countryName) {
                    country = countryInfo.countryName;
                  }
                }
                fillSpotForm();
              },
              error: function() { // country info lookup request failed
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
      error: function() { // city search request failed
        fillSpotForm();
      }
    });
  }

  // Export class
  mw.HWMaps.NewSpot = NewSpot;

}(mediaWiki, jQuery));

/**
 * Special page `/Special:HWMap`
 */

(function(mw, $, L, Ractive) {
  mw.log('HWMaps::SpecialPage');

  // Variables with `$` are jQuery objects
  var animatedSpot,
      ractiveTemplate,
      $zoomInfoOverlay,
      $hwspot,
      $hwmap,
      // When in debug mode, cache bust templates
      cacheBust = mw.config.get('debug') ? new Date().getTime() : mw.config.get('wgVersion');

  /**
   * @class mw.HWMaps.SpecialPage
   *
   * @constructor
   */
  function SpecialPage() {
    mw.log('HWMaps::SpecialPage::constructor');
  }

  /**
   *
   */
  SpecialPage.initialize = function() {
    mw.log('HWMaps::SpecialPage::initialize');

    // Set DOM elements to variables for faster access
    $zoomInfoOverlay = $('#hw-zoom-info-overlay');
    $hwmap = $('#hwmap');
    $hwspot = $('#hw-specialpage-spot');

    var urlParamLat = parseFloat(mw.util.getParamValue('lat')),
        urlParamLng = parseFloat(mw.util.getParamValue('lng')),
        urlParamZoom = parseInt(mw.util.getParamValue('zoom'), 10); // 10=radix

    // If map location was defined at the URL, move to there
    // Otherwise map is kept at default location
    if (!isNaN(urlParamLat) && !isNaN(urlParamLng)) {

      // Because `0` is falsy, we have to check with `isNaN`
      var zoom = !isNaN(urlParamZoom) ? urlParamZoom : mw.HWMaps.config.defaultZoom;

      // http://leafletjs.com/reference-1.0.0.html#map-setview
      mw.HWMaps.leafletMap.setView(
        {
          lat: urlParamLat,
          lng: urlParamLng
        },
        zoom
      );
    }

    // If URL had '#hwmap-add' in it, it means we should initiate adding new spot
    // unlike `window.location.hash`, this one's IE-friendly
    if (document.URL.substr(document.URL.indexOf('#') + 1) === 'hwmap-add') {
      mw.HWMaps.NewSpot.setupNewSpot();
    }

    // Setup event listeners
    mw.HWMaps.leafletMap.on('click', SpecialPage.closeSpecialPageSpot);
    mw.HWMaps.leafletMap.on('moveend', loadMarkers);
    mw.HWMaps.leafletMap.on('zoomend', updateSpecialPageURL);
    mw.HWMaps.leafletLayers.spots.PrepareLeafletMarker = prepareSpotMarker;
    mw.HWMaps.leafletLayers.cities.PrepareLeafletMarker = prepareCityMarker;

    // Initialize loading markers in bounding box
    mw.HWMaps.leafletMap.fireEvent('moveend');

    initSpecialPageTemplate();
    initNewPlaceButton();
  };

  /**
   * Initializes "add new spot" button
   */
  function initNewPlaceButton() {
    mw.log('HWMaps::SpecialPage::initNewPlaceButton');

    // Proceed only for authenticated users
    // `wgUserId` returns `null` when not logged in
    if (!mw.config.get('wgUserId')) {
      return;
    }

    // Button for adding new spot
    $('#hwmap-add').show().click(function(e) {
      e.preventDefault();
      e.stopPropagation(); // Prevents clicks ending up to map layer
      mw.HWMaps.NewSpot.setupNewSpot();
    });

    // Attach event to the link at the sidebar,
    // so that we wouldn't have unessessary page-refresh
    $('#n-New-spot a').click(function(e) {
      e.preventDefault();
      mw.HWMaps.NewSpot.setupNewSpot();
    });
  }

  /**
   *
   */
  SpecialPage.animateSpot = function(HWid) {
    mw.log('HWMaps::SpecialPage::animateSpot');
  };

  /**
   *
   */
  SpecialPage.stopAnimateSpot = function() {
    mw.log('HWMaps::SpecialPage::stopAnimateSpot');
  };

  /**
   *
   * @param {Float} lat
   * @param {Float} lng
   * @param {Int} zoom
   * @param {Int} HWid
   */
  SpecialPage.setMapView = function(lat, lon, zoom, HWid) {
    mw.log('HWMaps::SpecialPage::setMapView');

    // Validate vars
    lat = parseFloat(lat);
    lon = parseFloat(lon);
    zoom = zoom ? parseInt(zoom, 10) : mw.HWMaps.leafletMap.getZoom();

    // Set the view
    mw.HWMaps.leafletMap.setView([lat, lon], zoom);

    // If marker ID was passed, animate it
    if (HWid) {
      SpecialPage.animateSpot(HWid);
    }
  };

  /**
   *
   */
  SpecialPage.addRating = function(newRating, pageId) {

    // Validate new rating
    newRating = parseInt(newRating, 10) || 0;

    mw.log('mw.HWMaps::SpecialPage::addRating: ' + pageId + ' (' + newRating + ')');

    mw.HWMaps.Ratings.addRating(newRating, pageId).done(function(response) {
      if (response) {
        ractiveSpots.set('spot.rating_user', newRating);
        ractiveSpots.set('spot.rating_user_label', mw.HWMaps.Spots.getRatingLabel(newRating));

        if (response && response.timestamp) {
          ractiveSpots.set('spot.timestamp_user', mw.HWMaps.Spots.parseTimestamp(response.timestamp));
        }

        if (response && response.average) {
          ractiveSpots.set('spot.rating_average', parseFloat(response.average));
          ractiveSpots.set('spot.average_label', mw.HWMaps.Spots.getRatingLabel(response.average));
        }

        if (response && response.count) {
          ractiveSpots.set('spot.rating_count', parseInt(response.count, 10));
        }
      }
    });
  };

  /**
   *
   */
  SpecialPage.openSpot = function(pageId, panTo) {
    mw.log('HWMaps::SpecialPage::openSpot');

    if (!pageId) {
      mw.log.error('HWMaps::SpecialPage::openSpot: No ID defined for loading a spot. #fj902j');
      return;
    }

    SpecialPage.animateSpot(pageId);

    // Wipe out any previously opened spot
    ractiveTemplate.set({ spot: null });

    // Loader animation
    $hwspot.addClass('hw-spot-loading');

    // Load data from the API
    var apiUri = new mw.Uri(mw.util.wikiScript('api'));

    // Add URL parameters, automatically handling ? and & as needed
    apiUri.extend({
      'action': 'hwspotidapi',
      'format': 'json',
      'properties': [
        'Location',
        'Country',
        'CardinalDirection',
        'CitiesDirection',
        'RoadsDirection'
      ].join(','),
      'page_id': pageId
    });

    mw.log('apiUri: ' + apiUri);

    $.get(apiUri, function(data) {
      mw.log('Response from the API:');
      mw.log(data);

      if (!data.error) {
        mw.log.error('HWMaps::SpecialPage::openSpot: Could not load spot details from the API. #39gy2g');
        return;
      }

      // Handle missing API response
      if (!data.query || !data.query.spot) {
        mw.log.error('HWMaps::SpecialPage::openSpot: Could not load spot details from the API. #iivbh2');
        return;
      }

      data.query.spot.id = pageId;

      // Visual toggles at the UI used by Ractive
      data.query.spot._isAddingWaitingTimeVisible = false;
      data.query.spot._isStatisticsVisible = false;

      if (_.has(data, 'data.query.spot.rating_average')) {
        data.query.spot.average_label = mw.HWMaps.Spots.getRatingLabel(data.query.spot.rating_average);
      }

      if (_.has(data, 'query.spot.timestamp_user')) {
        data.query.spot.timestamp_user = mw.HWMaps.Spots.parseTimestamp(data.query.spot.timestamp_user);
      }

      if (_.has(data, 'data.query.spot.rating_user')) {
        data.query.spot.rating_user_label = mw.HWMaps.Spots.getRatingLabel(data.query.spot.rating_user);
      }

      // Pass spot to template
      ractiveTemplate.set({ spot: data.query.spot });

      // Set map view if we should pan to this spot
      if (panTo && _.has(data, 'query.spot.Location')) {
        SpecialPage.setMapView(data.query.spot.Location.lat, data.query.spot.Location.lon, 15, id);
      }

      // Initialize rating widget
      mw.HWMaps.Ratings.initRatingWidgets();

      // Hides loading animation
      $hwspot.removeClass('hw-spot-loading');
    });

    $hwspot.addClass('hw-spot-open');
    $hwmap.addClass('hw-spot-open-map');
  };

  /**
   * Edit spot article by title
   * @param title
   */
  SpecialPage.editSpot = function(title) {
    mw.log('HWMaps::SpecialPage::editSpot: ' + title);
    var $formWrap = $('#hw-spot-edit-form-wrap');

    if (!$formWrap.length) {
      mw.log.error('HWMaps::SpecialPage::editSpot: Could not find form element! #j93812');
      return;
    }

    var $form = $formWrap.find('form');

    $form.find('input[name="page_name"]').val(title);
    $form.submit();

    // `.popupform-innerdocument` was removed from DOM because successfully
    // editing a spot, cancelling editing or any other reason.
    // There's also `.popupform-wrapper`
    $('.popupform-innerdocument').on('remove', function() {
      mw.log('HWMaps::SpecialPage::editSpot: DONE: ' + title);
      // Reset zoom,bound cache so any map movement will Always load new spots
      // This is so that if user moved the spot to a new location, we'll get it
      // again to the map doing this.
      mw.HWMaps.Map.resetMapState();
      loadMarkers();
    });
  };

  /**
   * Toggles adding waiting time UI on/off for a spot
   */
  SpecialPage.toggleAddingWaitingTime = function() {
    mw.log('mw.HWMaps::City::toggleAddingWaitingTime');
    // http://docs.ractivejs.org/latest/ractive-toggle
    ractiveTemplate.toggle('spot._isAddingWaitingTimeVisible');
  };

  /**
   *
   */
  SpecialPage.closeSpecialPageSpot = function() {
    mw.log('HWMaps::SpecialPage::closeSpecialPageSpot');
    $hwspot.removeClass('hw-spot-open');
    $hwmap.removeClass('hw-spot-open-map');
    SpecialPage.stopAnimateSpot();
  };

  /**
   * Shorthand for loading waiting times and ratings for the spot on city element
   */
  SpecialPage.loadSpotDetails = function(pageId) {
    mw.log('mw.HWMaps::SpecialPage::loadSpotDetails: ' + pageId);

    var $loadSpotDetailsSpinner = $.createSpinner({
      // ID used to refer this spinner when removing it
      id: 'hwLoadSpotDetailsSpinner',

      // Size: 'small' or 'large' for a 20-pixel or 32-pixel spinner.
      size: 'small',

      // Type: 'inline' or 'block'.
      // Inline creates an inline-block with width and height
      // equal to spinner size. Block is a block-level element
      // with width 100%, height equal to spinner size.
      type: 'block'
    });

    // Insert below where the spots are going to be loaded
    $hwspot.append($loadSpotDetailsSpinner);

    var waitingTimesPromise = mw.HWMaps.Waitingtimes.loadWaitingTimes(pageId);
    var ratingsPromise = mw.HWMaps.Ratings.loadRatings(pageId);

    $.when(waitingTimesPromise, ratingsPromise).done(function(waitingTimesData, ratingsData) {
      $.removeSpinner('hwLoadSpotDetailsSpinner');

      // Handle data from waiting times API endpoint
      if (waitingTimesData) {
        if (waitingTimesData.waiting_times) {
          ractiveTemplate.set('spot.waiting_times', waitingTimesData.waiting_times);
        }

        if (waitingTimesData.distribution) {
          ractiveTemplate.set('spot.waiting_times_distribution', waitingTimesData.distribution);
        }
      }

      // Handle data from ratings API endpoint
      ractiveSpots.set('spot.ratings', null);
      if (ratingsData) {
        if (ratingsData.ratings && ratingsData.ratings.length) {
          ractiveSpots.set('spot.ratings', ratingsData.ratings);
        }
        if (ratingsData.distribution) {
          ractiveSpots.set('spot.ratings_distribution', ratingsData.distribution);
        }
      }

      // Show stats html
      // http://docs.ractivejs.org/latest/ractive-toggle
      ractiveTemplate.set('spot._isStatisticsVisible', true);
    });

  };

  /**
   * Hides zoom info overlay
   */
  function hideZoomInfoOverlay() {
    mw.log('HWMaps::SpecialPage::hideZoomInfoOverlay');
    $zoomInfoOverlay.hide();
  }

  /**
   * Shows zoom info overlay
   */
  function showZoomInfoOverlay() {
    mw.log('HWMaps::SpecialPage::showZoomInfoOverlay');
    $zoomInfoOverlay.show();
  }

  /**
   *
   */
  function prepareSpotMarker(leafletMarker, data) {
    mw.log('HWMaps::SpecialPage::prepareSpotMarker');
    leafletMarker.setIcon(data.icon, data.HWid);

    if (animatedSpot === data.HWid) {
      SpecialPage.animateSpot(data.HWid);
    }

    leafletMarker.on('click', function() {
      SpecialPage.openSpot(data.HWid);
    });
  }

  /**
   *
   */
  function prepareCityMarker(leafletMarker, data) {
    mw.log('HWMaps::SpecialPage::prepareCityMarker');
    leafletMarker.setIcon(data.icon, data.HWid, data.title || '');
    if (data.title) {
      leafletMarker.on('click', function() {
        window.location = mw.config.get('wgArticlePath').replace('$1', data.title);
      });
    }
  }

  /**
   *
   */
  function loadMarkers() {
    mw.log('HWMaps::SpecialPage::loadMarkers');
    // `jQuery.tipsy` got deprecated in MW 1.28 and should
    // thus be replaced with something else, e.g. OOjs UI:
    // https://www.mediawiki.org/wiki/OOjs_UI
    if ($.fn.tipsy) {
      $('.tipsy').remove();
    }

    var zoom = mw.HWMaps.leafletMap.getZoom();

    // When zoom is between 6-8, get only cities (no spots)
    if (zoom > 6 && zoom < 8) {
      mw.HWMaps.Map.clearMarkers('Spots');
      mw.HWMaps.Spots.getMarkers('Cities', zoom);
      showZoomInfoOverlay();
    }
    // When zooming bigger than 8, show both Cities and Spots
    else if (zoom >= 8) {
      // '' = Spots AND Cities
      mw.HWMaps.Spots.getMarkers('', zoom);
      hideZoomInfoOverlay();
    }
    // When zoom is equal or smaller than 6, we clear all the markers
    else {
      mw.HWMaps.Map.clearMarkers();
      mw.HWMaps.Map.resetMapState();
      showZoomInfoOverlay();
    }

    updateSpecialPageURL();
  }

  /**
   * Stores current map state to URL, producing URLs such as:
   * `/Special:HWMap?lat=49.1170&lng=11.7004&zoom=6`
   */
  function updateSpecialPageURL() {
    mw.log('HWMaps::SpecialPage::updateSpecialPageURL');

    var center = mw.HWMaps.leafletMap.getCenter(),
        state = {
          'lat': center.lat,
          'lng': center.lng,
          'zoom': mw.HWMaps.leafletMap.getZoom()
        },
        // Instance for the location of the current window
        // https://www.mediawiki.org/wiki/ResourceLoader/Modules#mediawiki.Uri
        uri = new mw.Uri();

    // Add URL parameters, automatically handling ? and & as needed
    uri.extend(state);

    // Push to HTML5 URL history
    // Uses `modules/vendor/HTML5-History-API`
    history.pushState(state, null, uri.toString());
  }

  /**
   *
   */
  function initSpecialPageTemplate() {
    mw.log('HWMaps::SpecialPage::initSpecialPageTemplate');
    var spot = {};


    // Get HTML templates
    var getTemplateHtml = $.get(mw.config.get('wgExtensionAssetsPath') + '/HWMap/modules/templates/ext.HWMAP.SpecialPageSpot.template.html?v=' + cacheBust),
        getWaitingtimesTemplateHtml = $.get(mw.config.get('wgExtensionAssetsPath') + '/HWMap/modules/templates/ext.HWMAP.StatsWaitingTimes.template.html?v=' + cacheBust),
        getRatingsTemplateHtml = $.get(mw.config.get('wgExtensionAssetsPath') + '/HWMap/modules/templates/ext.HWMAP.StatsRatings.template.html?v=' + cacheBust),
        getCommentsTemplateHtml = $.get(mw.config.get('wgExtensionAssetsPath') + '/HWMap/modules/templates/ext.HWMAP.Comments.template.html?v=' + cacheBust),
        getRatingsTemplateHtml = $.get(mw.config.get('wgExtensionAssetsPath') + '/HWMap/modules/templates/ext.HWMAP.Ratings.template.html?v=' + cacheBust),
        getWaitingTimesTemplateHtml = $.get(mw.config.get('wgExtensionAssetsPath') + '/HWMap/modules/templates/ext.HWMAP.WaitingTimes.template.html?v=' + cacheBust);

    $.when(getTemplateHtml, getWaitingtimesTemplateHtml, getRatingsTemplateHtml, getCommentsTemplateHtml, getRatingsTemplateHtml, getWaitingTimesTemplateHtml)
      .done(function(templateHtml, waitingtimesTemplateHtml, ratingsTemplateHtml, commentsTemplateHtml, ratingsTemplateHtml, waitingTimesTemplateHtml) {

      // http://www.ractivejs.org/
      ractiveTemplate = new Ractive({
        el: 'hw-specialpage-spot',
        template: templateHtml[0],
        // Sub templates
        partials: {
          waitingtimesTemplate: waitingtimesTemplateHtml[0],
          ratingsTemplate: ratingsTemplateHtml[0],
          commentsTemplate: commentsTemplateHtml[0],
          ratingsTemplate: ratingsTemplateHtml[0],
          waitingTimesTemplate: waitingTimesTemplateHtml[0]
        },
        data: {
          userId: mw.config.get('wgUserId')
        }
      });

      // If URL had spot id defined, open that spot
      var urlParamSpot = mw.util.getParamValue('spot');
      if (urlParamSpot) {
        mw.log('HWMaps::SpecialPage::initSpecialPageTemplate: open spot by URL - ' + urlParamSpot);
        SpecialPage.openSpot(urlParamSpot, true);
      }
    });
  }

  // Export
  mw.HWMaps.SpecialPage = SpecialPage;

}(mediaWiki, jQuery, L, Ractive));


/*
@TODO:
if (mw.util.getParamValue('spot')) {
*/

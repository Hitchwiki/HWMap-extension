/**
 * City articles
 */

(function(mw, $, L, Ractive) {
  mw.log('mw.HWMaps::City');

  var animatedSpot = false,
      // Ractive template object
      $loadSpotsSpinner,
      // When in debug mode, cache bust templates
      cacheBust = mw.config.get('debug') ? new Date().getTime() : mw.config.get('wgVersion');

  /**
   * @class mw.HWMaps.Country
   *
   * @constructor
   */
  function City() {
    mw.log('mw.HWMaps::City::constructor');
  }

  City.test = function(foo) {
    mw.log('->TEST');
    mw.log(foo);
    mw.HWMaps.ractive.set(foo + '.waiting_time_count', 100);
  };

  City.initialize = function() {
    mw.log('HWMaps::City::initialize');

    // Show loading spinner
    showLoadSpotsSpinner();

    // Do the bulk of constructing this page
    $.when(
      initCityMapElement(),
      getSpots()
    ).done(function () {
      mw.log('HWMaps::City::initialize: Done');
      hideLoadSpotsSpinner();
    });

  };

  /**
   *
   * @return instance of jQuery.Promise
   */
  function initCityMapElement() {
    mw.log('mw.HWMaps::City::initCityMap');

    // https://api.jquery.com/deferred.promise/
    var dfd = $.Deferred();

    // Add spot marker events
    // Used to scroll spot-list to correct position when clicking markers on the city map
    mw.HWMaps.leafletLayers.spots.PrepareLeafletMarker = prepareCityViewMarkers;
    mw.HWMaps.leafletMap.on('click', clearScrollPageToSpot);

    // Getting the coordinates for current article
    mw.HWMaps.Map.getArticleCoordinates().done(function(articleCoordinates) {
      mw.log('mw.HWMaps::City::initCityMap: got article coordinates:');
      mw.log(articleCoordinates);

      // `articleCoordinates` is a Leaflet LatLng object
      // http://leafletjs.com/reference-1.0.2.html#latlng
      if (articleCoordinates) {
        // Center map to coordinates stored to article
        // (coordinates, zoomlevel)
        mw.HWMaps.leafletMap.setView(articleCoordinates, 12);

        // This adds a city marker in the middle of the map
        /*
        // Build city marker
        // Using PruneCluster's marker builder here instead of `L.marker`
        // so that we can re-use features of `mw.HWMaps.leafletLayers.cities`
        // layer.
        var cityMarker = new PruneCluster.Marker(
          articleCoordinates.lat,
          articleCoordinates.lng
        );

        // Add icon
        cityMarker.data.icon = mw.HWMaps.icons.citySmall;
        cityMarker.data.HWtype = 'city';

        // Register marker
        mw.HWMaps.leafletLayers.cities.RegisterMarker(cityMarker);
        mw.HWMaps.leafletLayers.cities.ProcessView();
        */
      } else {
        // Couldn't get coordinates, just zoom out to the whole world
        mw.HWMaps.leafletMap.fitWorld();
        mw.log.warn('HWMaps::City::initCityMap: could not find article coordinates. #3jf3ii');
      }

      // Resolve promise
      dfd.resolve();
    });

    // Return the Promise so caller can't change the Deferred
    // https://api.jquery.com/deferred.promise/
    return dfd.promise();
  }

  /**
   *
   * @return instance of jQuery.Promise
   */
  function getSpots() {
    mw.log('mw.HWMaps::City::getSpots');

    // https://api.jquery.com/deferred.promise/
    var dfd = $.Deferred();

    // Getting spots related to this (city) article
    $.getJSON(mw.util.wikiScript('api'), {
      action: 'hwmapcityapi',
      properties: [
        'Location',
        'Country',
        'CardinalDirection',
        'CitiesDirection',
        'RoadsDirection'
      ].join(','),
      // user_id: mw.config.get('wgUserId'),
      page_title: mw.config.get('wgTitle'),
      format: 'json'
    }).done(function(data) {
      mw.log('mw.HWMaps::City::getSpots: Got API response');
      mw.log(data);

      if (data.error) {
        mw.log.error('mw.HWMaps::City::getSpots: Spots API returned error. #3ijhgf');
        mw.log.error(data.error);
        // Bubble notification
        // `mw.message` gets message translation, see `i18n/en.json`
        // `tag` replaces any previous bubbles by same tag
        // https://www.mediawiki.org/wiki/ResourceLoader/Modules#mediawiki.notify
        mw.notify(
          mw.message('hwmap-error-getting-spots').text() + ' ' + mw.message('hwmap-please-reload').text(),
          { tag: 'hwmap-error' }
        );
        return dfd.reject();
      }

      // Process spots if we have any
      var spots = _.has(data, 'query.spots') ? data.query.spots : [];

      // Place spots to the Leaflet map
      initCityMapSpots(spots);

      // Initialize Spots listing inside the article using Ractive.js
      initCityTemplate(spots);

      dfd.resolve();
    })
    .fail(function() {
      mw.log.error('mw.HWMaps::City::getSpots: Spots API returned error. #ggi382');
      // Bubble notification
      // `mw.message` gets message translation, see `i18n/en.json`
      // `tag` replaces any previous bubbles by same tag
      // https://www.mediawiki.org/wiki/ResourceLoader/Modules#mediawiki.notify
      mw.notify(
        mw.message('hwmap-error-getting-spots').text() + ' ' + mw.message('hwmap-please-reload').text(),
        { tag: 'hwmap-error' }
      );
      dfd.reject();
    });

    // Return the Promise so caller can't change the Deferred
    // https://api.jquery.com/deferred.promise/
    return dfd.promise();
  }

  /**
   *
   */
  function initCityMapSpots(spots) {
    mw.log('mw.HWMaps::City::initCityMapSpots');

    for (var i in spots) {
      // Build spot marker
      var marker = new PruneCluster.Marker(
        spots[i].Location[0].lat,
        spots[i].Location[0].lon
      );

      // Add icon
      marker.data.icon = mw.HWMaps.Spots.getSpotIcon(spots[i].rating_average);

      // Add id and other meta
      marker.data.HWid = spots[i].id;
      marker.data.HWtype = 'spot';
      if (spots[i].rating_average) {
        marker.data.average = spots[i].rating_average;
      }

      // Register marker
      mw.HWMaps.leafletLayers.spots.RegisterMarker(marker);
    }

    mw.HWMaps.leafletLayers.spots.ProcessView();
  }

  /**
   *
   * @return instance of jQuery.Promise
   */
  function initCityTemplate(spots) {
    mw.log('mw.HWMaps::City::initCityTemplate');
    mw.log(spots);

    // https://api.jquery.com/deferred.promise/
    var dfd = $.Deferred();

    var spotsByDirections = {
      // Will hold directions like `North`
      groupSpots: {}
    };

    // Groups different spots by cardinal direction
    var otherDirections = [];
    for (var i = 0; i < spots.length; i++) {

      // Rating label
      spots[i].average_label = mw.HWMaps.Spots.getRatingLabel(spots[i].rating_average);

      // User's timestamp
      if (spots[i].timestamp_user) {
        spots[i].timestamp_user = mw.HWMaps.Spots.parseTimestamp(spots[i].timestamp_user);
      }

      // User's rating
      if (spots[i].rating_user) {
        spots[i].rating_user_label = mw.HWMaps.Spots.getRatingLabel(spots[i].rating_user);
      }

      // Cardinal direction
      if (spots[i].CardinalDirection[0]) {
        var cardinalDirection = spots[i].CardinalDirection.join(', ');
        if (!spotsByDirections.groupSpots[cardinalDirection]) {
          spotsByDirections.groupSpots[cardinalDirection] = [];
        }
        spotsByDirections.groupSpots[cardinalDirection].push(spots[i]);
      }
      // No cardinal direction, group to "other"
      else {
        otherDirections.push(spots[i])
      }

      // Visual toggles at the UI used by Ractive
      spots[i]._isBadSpotVisible = false;
      spots[i]._isAddingWaitingTimeVisible = false;
      spots[i]._isCommentsVisible = false;
      spots[i]._isStatisticsVisible = false;
      spots[i]._isLongDescriptionVisible = false;
      spots[i]._isAddingComment = false;
      spots[i]._new_comment = '';
      spots[i]._new_waiting_time_h = 0;
      spots[i]._new_waiting_time_m = 0;
    }

    // Spots without cardinal directions
    if (otherDirections.length) {
      spotsByDirections.groupSpots['Other directions'] = otherDirections;
    }

    mw.log('mw.HWMaps::City::initCityTemplate: grouped by directions:');
    mw.log(spotsByDirections);

    // Get HTML templates
    var getTemplateHtml = $.get(mw.config.get('wgExtensionAssetsPath') + '/HWMap/modules/templates/ext.HWMAP.CitySpots.template.html?v=' + cacheBust),
        getWaitingtimesTemplateHtml = $.get(mw.config.get('wgExtensionAssetsPath') + '/HWMap/modules/templates/ext.HWMAP.StatsWaitingTimes.template.html?v=' + cacheBust),
        getRatingsTemplateHtml = $.get(mw.config.get('wgExtensionAssetsPath') + '/HWMap/modules/templates/ext.HWMAP.StatsRatings.template.html?v=' + cacheBust),
        getCommentsTemplateHtml = $.get(mw.config.get('wgExtensionAssetsPath') + '/HWMap/modules/templates/ext.HWMAP.Comments.template.html?v=' + cacheBust),
        getRatingsTemplateHtml = $.get(mw.config.get('wgExtensionAssetsPath') + '/HWMap/modules/templates/ext.HWMAP.Ratings.template.html?v=' + cacheBust),
        getWaitingTimesTemplateHtml = $.get(mw.config.get('wgExtensionAssetsPath') + '/HWMap/modules/templates/ext.HWMAP.WaitingTimes.template.html?v=' + cacheBust);

    $.when(getTemplateHtml, getWaitingtimesTemplateHtml, getRatingsTemplateHtml, getCommentsTemplateHtml, getRatingsTemplateHtml, getWaitingTimesTemplateHtml)
      .done(function(templateHtml, waitingtimesTemplateHtml, ratingsTemplateHtml, commentsTemplateHtml, ratingsTemplateHtml, waitingTimesTemplateHtml) {

      mw.log('mw.HWMaps::City::initCityTemplate: got html templates');

      // URL for the big map
      var hwMapUrl = mw.config.get('wgArticlePath').replace('$1', 'Special:HWMap');

      // Construct ractive template for spots list
      // http://www.ractivejs.org/
      mw.HWMaps.ractive = new Ractive({
        el: 'hw-incity-spots',
        template: templateHtml[0],
        // Sub templates
        partials: {
          waitingtimesTemplate: waitingtimesTemplateHtml[0],
          ratingsTemplate: ratingsTemplateHtml[0],
          commentsTemplate: commentsTemplateHtml[0],
          ratingsTemplate: ratingsTemplateHtml[0],
          waitingTimesTemplate: waitingTimesTemplateHtml[0]
        },
        test2: function(foo) {
          mw.log('->TEST2');
          mw.log(foo);
          this.set(foo + '.waiting_time_count', 100);
        },
        data: {
          // Helper function to turn strings like `foo bar` to `foo_bar`
          // https://doc.wikimedia.org/mediawiki-core/master/js/#!/api/mw.util-method-wikiUrlencode
          slugify: mw.util.wikiUrlencode,

          // Data exposed to the template
          spots: spotsByDirections,
          userId: mw.config.get('wgUserId'),
          hwMapUrl: hwMapUrl,
          hwMapAddUrl: hwMapUrl + '#hwmap-add'
        }
      });

      // Initialize rating widgets on above template
      mw.HWMaps.Ratings.initRatingWidgets();

      dfd.resolve();
    })
    .fail(function() {
      dfd.reject();
    });

    // Return the Promise so caller can't change the Deferred
    // https://api.jquery.com/deferred.promise/
    return dfd.promise();
  }

  /**
   * Show spinner
   * https://doc.wikimedia.org/mediawiki-core/master/js/#!/api/jQuery.plugin.spinner
   */
  function showLoadSpotsSpinner() {
    $loadSpotsSpinner = $.createSpinner({
      // ID used to refer this spinner when removing it
      id: 'hwLoadSpotsSpinner',

      // Size: 'small' or 'large' for a 20-pixel or 32-pixel spinner.
      size: 'large',

      // Type: 'inline' or 'block'.
      // Inline creates an inline-block with width and height
      // equal to spinner size. Block is a block-level element
      // with width 100%, height equal to spinner size.
      type: 'block'
    });

    // Insert below where the spots are going to be loaded
    $('#hw-incity-spots').append($loadSpotsSpinner);
  }

  /**
   * Hide spinner
   * https://doc.wikimedia.org/mediawiki-core/master/js/#!/api/jQuery.plugin.spinner
   */
  function hideLoadSpotsSpinner() {
    $.removeSpinner('hwLoadSpotsSpinner');
  }

  /**
   *
   */
  function clearScrollPageToSpot() {
    animatedSpot = false;
    City.unHighlightMarker();
  }

  /**
   *
   */
  function prepareCityViewMarkers(leafletMarker, data) {

    // Add icon for the marker
    leafletMarker.setIcon(data.icon, data.HWid);

    // When clicking on spot marker
    if (data.HWtype === 'spot') {
      leafletMarker.on('click', function() {
        City.scrollPageToSpot(data.HWid);
      });
      // Highlight spot element on page
      leafletMarker.on('mouseover', function() {
        $('#hw-spot_' + data.HWid).addClass('hw-spot-hover');
      });
      // Un-highlight spot element on page
      leafletMarker.on('mouseout', function() {
        $('.hw-spot-hover').removeClass('hw-spot-hover');
      });
      if (animatedSpot === data.HWid) {
        City.scrollPageToSpot(data.HWid);
      }
    }
    // When clicking city marker, scroll on top of the current article
    else if (data.HWtype === 'city') {
      leafletMarker.on('click', function() {
        $('html, body').animate({
          scrollTop: $('body').offset().top
        }, 'fast');
      });
    }
  }

  /**
   *
   */
  City.scrollPageToSpot = function(id) {
    if (!id ) {
      return;
    }

    var $elementToScroll = $('#hw-spot_' + id);

    if (!$elementToScroll.length) {
      mw.log.warn('mw.HWMaps::City::prepareCityViewMarkers: No element to scroll to.');
      return;
    }

    // Scroll spot element on the page to the view
    // Has a slight offset so that top part would be little bit lower
    // than top part of the browser
    $('html, body').animate({
      scrollTop: $elementToScroll.offset().top - 100
    }, 'fast');

    animatedSpot = false;
    City.highlightMarker(id);
    animatedSpot = id;
  };

  /**
   * Add "highlight" graphic to marker on map
   */
  City.highlightMarker = function(id) {
    var $marker = $('#hw-marker-' + id);

    if (!id || !$marker.length) {
      return;
    }

    // Remove highlighting from any previously highlited spot
    $('.hw-highlight-spot').removeClass('hw-highlight-spot');
    $marker.addClass('hw-highlight-spot');
  };

  /**
   * Remove "highlight" graphic from a marker on map
   */
  City.unHighlightMarker = function() {
    $('.hw-highlight-spot').removeClass('hw-highlight-spot');
  };

  /**
   * Toggles visibility of long descriptions for a spot
   */
  City.toggleLongDescription = function(spotObjectPath) {
    mw.log('mw.HWMaps::City::toggleLongDescription');
    // http://docs.ractivejs.org/latest/ractive-toggle
    mw.HWMaps.ractive.toggle(spotObjectPath + '._isLongDescriptionVisible');
  };

  /**
   * Toggles comments UI on/off for a spot
   */
  City.toggleComments = function(spotObjectPath) {
    mw.log('mw.HWMaps::City::toggleComments');
    // http://docs.ractivejs.org/latest/ractive-toggle
    mw.HWMaps.ractive.toggle(spotObjectPath + '._isCommentsVisible');
  };

  /**
   * Toggles bad spot open/closed
   * By default we show only minimal info about bad spots
   */
  City.toggleBadSpot = function(spotObjectPath) {
    mw.log('mw.HWMaps::City::toggleBadSpot');
    // http://docs.ractivejs.org/latest/ractive-toggle
    mw.HWMaps.ractive.toggle(spotObjectPath + '._isBadSpotVisible');
  };

  /**
   *
   *
   * @return instance of jQuery.Promise
   */
  City.loadComments = function(pageId, spotObjectPath) {
    mw.log('mw.HWMaps::City::loadComments: ' + pageId);

    // https://api.jquery.com/deferred.promise/
    var dfd = $.Deferred();

    var $loadCommentsSpinner = $.createSpinner({
      // ID used to refer this spinner when removing it
      id: 'hwLoadCommentsSpinner',

      // Size: 'small' or 'large' for a 20-pixel or 32-pixel spinner.
      size: 'small',

      // Type: 'inline' or 'block'.
      // Inline creates an inline-block with width and height
      // equal to spinner size. Block is a block-level element
      // with width 100%, height equal to spinner size.
      type: 'block'
    });

    // Insert below where the spots are going to be loaded
    $('#hw-spot_' + pageId).append($loadCommentsSpinner);

    // Scroll comments element on the page to the view
    // Has a slight offset so that top part would be little bit lower
    // than top part of the browser
    /*
    $('html, body').animate({
      scrollTop: $('#hw-spot-comments-' + pageId).offset().top - 100
    }, 'fast');
    */

    mw.HWMaps.Comments.loadComments(pageId).always(function(data) {
      mw.log('mw.HWMaps::City::loadComments done:');
      mw.log(data);

      $.removeSpinner('hwLoadCommentsSpinner');

      if (_.has(data, 'comments')) {
        mw.HWMaps.ractive.set(spotObjectPath + '.comments', data.comments);
      }

      // Show comments section
      mw.HWMaps.ractive.set(spotObjectPath + '._isCommentsVisible', true);

      // Resolve promise
      dfd.resolve();
    });

    // Return the Promise so caller can't change the Deferred
    // https://api.jquery.com/deferred.promise/
    return dfd.promise();
  };

  /**
   * Pans Leaflet map to a spot by id
   */
  City.moveMapToSpot = function(lat, lon, id) {
    mw.log('mw.HWMaps::City::moveMapToSpot: ' + id);

    // Param types
    var lat = parseFloat(lat),
        lon = parseFloat(lon),
        id = parseInt(id, 10);

    // Validate params
    if (isNaN(lat) || isNaN(lon) || isNaN(id)) {
      mw.log.error('mw.HWMaps::City::moveMapToSpot: Params missing. #j93jjf');
      return;
    }

    // Center map to spot's coordinates, zoom level 15
    // http://leafletjs.com/reference-1.0.2.html#map-setview
    mw.HWMaps.leafletMap.setView([lat, lon], 15);

    // Highlight marker by the id
    City.highlightMarker(id);
  };

  /**
   * Edit spot by title
   */
  City.editSpot = function(title) {
    mw.log('mw.HWMaps::City::editSpot: ' + title);

    if (!title) {
      mw.log.error('mw.HWMaps::City::editSpot: No title defined. #qj29hh');
      return;
    }

    // This form should already by on the page (albait hidden), so just submit it
    var $form = $('#hw-spot-edit-form-wrap form');
    $form.find('input[name="page_name"]').val(title);
    $form.submit();

    // `.popupform-innerdocument` was removed from DOM because successfully
    // editing a spot, cancelling editing or any other reason.
    // There's also `.popupform-wrapper`
    /*
    $('.popupform-innerdocument').on('remove', function() {
      mw.log('mw.HWMaps::City::editSpot -> done');
      // @TODO: Better way to reload the spot rather than just update the whole page?
    });
    */
  };


  /**
   * Generic function to animate element at City page
   * @TODO: consider using Ractive for this?
   */
  City.animateElementToggle = function(element, direction) {
    var slideSpeed = 300; // ms

    // Missing params
    if (!element || !direction) {
      mw.log.error('mw.HWMaps::City::animateElementToggle: no element or direction defined. #3j2882');

    }

    var $element = $(element);

    // If no element
    if (!$element.length) {
      mw.log.error('mw.HWMaps::City::animateElementToggle: could not find element to animate. #g12124');
      return;
    }

    if (direction === 'down') {

      $element.css({ 'display': 'block' });

      var contentHeight = $element.css({ 'height': 'auto' }).height();

      $element.css({ 'height': '' });

      $element.animate({
        height: contentHeight
      }, slideSpeed, function() {
        $element.css({ 'height': 'auto' });
      });

    } else if (direction === 'up') {

      $element.animate({
        height: 0
      }, slideSpeed, function() {
        $element.css({ 'display': 'none' });
      });

    }
  };

  // Export
  mw.HWMaps.City = City;

}(mediaWiki, jQuery, L, Ractive));

/**
 * City articles
 */

(function(mw, $, L, Ractive) {
  mw.log('mw.HWMaps::City');

  var animatedSpot = false,
      // Ractive template object
      ractiveSpots,
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
    mw.HWMaps.leafletMap.on('click', stopScrollPageToSpot);

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
        // Bubble notification
        // `mw.message` gets message translation, see `i18n/en.json`
        // `tag` replaces any previous bubbles by same tag
        // https://www.mediawiki.org/wiki/ResourceLoader/Modules#mediawiki.notify
        mw.notify(
          mw.message('hwmap-error-getting-spots') + ' ' + mw.message('hwmap-please-reload'),
          { tag: 'hwmap-error' }
        );
        mw.log.error('mw.HWMaps::City::getSpots: Spots API returned error. #3ijhgf');
        mw.log.error(data.error);
        return dfd.reject();
      }

      // Process spots if we have any
      var spots = _.has(data, 'query.spots') ? data.query.spots : [];

      // Place spots to the Leaflet map
      initCityMapSpots(spots);

      // Initialize Spots listing inside the article using Ractive.js
      initCityTemplate(spots);

      dfd.resolve();
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
    }

    // Spots without cardinal directions
    if (otherDirections.length) {
      spotsByDirections.groupSpots['Other directions'] = otherDirections;
    }

    mw.log('mw.HWMaps::City::initCityTemplate: grouped by directions:');
    mw.log(spotsByDirections);

    // Get HTML template
    $.get(mw.config.get('wgExtensionAssetsPath') + '/HWMap/modules/templates/ext.HWMAP.CitySpots.template.html?v=' + cacheBust).then(function(template) {

      mw.log('mw.HWMaps::City::initCityTemplate: got template html');

      // URL for the big map
      var hwMapUrl = mw.config.get('wgArticlePath').replace('$1', 'Special:HWMap');

      // Construct ractive template for spots list
      // http://www.ractivejs.org/
      ractiveSpots = new Ractive({
        el: 'hw-incity-spots',
        template: template,
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
        //doToggleAddingWaitingTime: hwDoToggleAddingWaitingTime
      });

      // Initialize rating widgets on above template
      mw.HWMaps.Ratings.initRatingWidgets();

      dfd.resolve();
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
      id: 'hwLoadSpotsSpinner',
      size: 'large',
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
  function stopScrollPageToSpot() {
    animatedSpot = false;
    $('.hw-highlight-spot').removeClass('hw-highlight-spot');
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
        // Scroll spot element on the page to the view
        // Has a slight offset so that top part would be little bit lower
        // than top part of the browser
        $('html, body').animate({
          scrollTop: $('#hw-spot_' + data.HWid).offset().top - 100
        }, 'fast');
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
    var $marker = $('#marker-' + id);

    if (!id || !$marker.length) {
      return;
    }

    animatedSpot = false;
    // Remove highlighting from any previously highlited spot
    // @TODO: use Ractive for this
    $('.hw-highlight-spot').removeClass('hw-highlight-spot');
    $marker.addClass('hw-highlight-spot');
    animatedSpot = id;
  };

  /**
   *
   */
  City.rateSpot = function(newRating, id, spotObjectPath) {

    // Validate new rating
    newRating = parseInt(newRating || 0);

    mw.log('mw.HWMaps::City::rateSpot: ' + id + ' (' + newRating + ')');

    mw.HWMaps.Ratings.addRating(newRating, id).done(function(response) {
      if (response.average) {

        // Update spot with new average
        ractiveSpots.set(spotObjectPath + '.timestamp_user', mw.HWMaps.Spots.parseTimestamp(response.timestamp) );
        ractiveSpots.set(spotObjectPath + '.rating_user', newRating);
        ractiveSpots.set(spotObjectPath + '.rating_user_label', mw.HWMaps.Spots.getRatingLabel(newRating));
        ractiveSpots.set(spotObjectPath + '.rating_average', parseFloat(response.average) );
        ractiveSpots.set(spotObjectPath + '.rating_count', parseInt(response.count), 10);
        ractiveSpots.set(spotObjectPath + '.average_label', mw.HWMaps.Spots.getRatingLabel(response.average));

        // updateSpotMarker(id, response.average);

        /*
        if (typeof ratingsLoaded[id] !== 'undefined') {
          Ratings.load(id, true, spotObjectPath);
        }
        */
      }
    });

  };

  City.loadWaitingTimes = function(id, reload, spotObjectPath) {

  };


  /**
   *
   */
  City.moveMapToSpot = function(spotObjectPath, id) {

    var lat = ractiveSpots.get(spotObjectPath + '.Location.0.lat'),
        lon = ractiveSpots.get(spotObjectPath + '.Location.0.lon');

    // Center map to spot's coordinates
    if (lat && lon) {
      mw.HWMaps.leafletMap.setView([lat, lon], 15);
    }
  };

  /**
   * Edit spot by title
   */
  City.editSpot = function(title) {
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

  // Export
  mw.HWMaps.City = City;

}(mediaWiki, jQuery, L, Ractive));


/*
window.loadSpotDetails = function(id, reload, spotObjectPath) {
  mw.log('->HWMap->loadSpotDetails');
  mw.log(spotObjectPath);
  loadWaintingTimes(id, reload, spotObjectPath);
  loadRatings(id, reload, spotObjectPath);
};

// On toggling time rating visible
//ractiveSpots.on('toggleAddingWaitingTime', function(e) {
//  mw.log('on toggleAddingWaitingTime');
//  mw.log(e);
//  ractiveSpots.toggle('_isAddingWaitingTimeVisible');
//});

window.hwDoToggleAddingWaitingTime = function() {
  mw.log('on hwDoToggleAddingWaitingTime');
  ractiveSpots.toggle('_isAddingWaitingTimeVisible');
};
*/

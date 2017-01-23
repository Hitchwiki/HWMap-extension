/**
 * Hitchwiki Maps - basemap
 * Setups up basic Leaflet map
 */

(function(mw, $, L) {

  mw.log('HWMaps::Map');

  var apiToken;

  // Private variables
  /*
  var newSpotMarker,
      newSpotLayer,
      spotsData = {
        groupSpots: {}
      },
      spots,
      extensionRoot = mw.config.get('wgExtensionAssetsPath') + '/HWMap/',
      userId = mw.config.get('wgUserId'),
      token,
      ractive,
      animatedSpot = false;
  */

  /**
   * @class mw.HWMaps.Map
   *
   * @constructor
   */
  function Map() {
    mw.log('HWMaps::Map::constructor');
  }


  /**
   * Get edit token for MediaWiki API
   *
   * @todo turn this into a jQuery.promise:
   *   https://api.jquery.com/deferred.promise/
   * @static
   */
  Map.getToken = function(callback) {
    mw.log('HWMaps::Map::getToken: ' + apiToken);
    if (apiToken) {
      callback(apiToken);
    } else if (mw.config.get('wgUserId')) {
      // Retreive csrf token from MW API if user is logged in
      // (`mw.config.get('wgUserId')` returns `0` for non-authenticated users)
      $.getJSON(mw.util.wikiScript('api'), {
        action: 'query',
        meta: 'tokens',
        format: 'json'
      }).done(function(data) {
        if (_.has(data, 'query.tokens.csrftoken')) {
          apiToken = _.get(data, 'query.tokens.csrftoken');
          callback(apiToken);
        } else {
          mw.log.warn('HWMaps::Map::getToken: error receiving csrf token from MediaWiki API. #39ghhh');
          callback(null);
        }
      });
    } else {
      mw.log.warn('HWMaps::Map::getToken: User is not authenticated, cannot retreive csrf token from MediaWiki API. #j399ii');
      callback(null);
    }
  };

  /**
   * Fetches article's `coordinates` property trough the API
   * Could be e.g. city or country article.
   *
   * Resolves to Leaflet LatLng object
   * http://leafletjs.com/reference-1.0.2.html#latlng
   *
   * @static
   * @return instance of jQuery.Promise
   */
  Map.getArticleCoordinates = function() {
    mw.log('mw.HWMaps.Map::getArticleCoordinates');

    // https://api.jquery.com/deferred.promise/
    var dfd = $.Deferred();

    // Getting the current coordinates for current article
    $.getJSON(mw.util.wikiScript('api'), {
      action: 'query',
      prop: 'coordinates',
      titles: mw.config.get('wgTitle'),
      format: 'json'
    }).done(function(data) {

      mw.log('mw.HWMaps.Map::getArticleCoordinates - got coordinates:');
      mw.log(data);


      if (data.error) {
        mw.log.warn('mw.HWMaps::City::initCityMapSpots: Spots API returned error. #3ijhgf');
        mw.log.warn(data.error);
        return dfd.reject();
      }

      if (!_.has(data, 'query.pages')) {
        mw.log.warn('mw.HWMaps.Map::getArticleCoordinates: No such page. #zfhgh8');
        return dfd.reject();
      }

      // `pages` is an array with one page at this stage,
      // but key might be something random like `pages[34]`.
      // This just picks the first
      var page;
      for (var i in data.query.pages) {
        page = data.query.pages[i];
        break;
      }

      // Ensure we have coordinates
      if (!_.has(page, 'coordinates[0].lat') && !_.has(page, 'coordinates[0].lon')) {
        mw.log.warn('mw.HWMaps.Map::getArticleCoordinates: No coordinates. #yyfG39');
        return dfd.reject();
      }

      // Resolve promise with Leaflet LatLng object
      // http://leafletjs.com/reference-1.0.2.html#latlng
      var latlng = L.latLng(
        parseFloat(_.get(page, 'coordinates[0].lat')),
        parseFloat(_.get(page, 'coordinates[0].lon'))
      );

      dfd.resolve(latlng);
    });

    // Return the Promise so caller can't change the Deferred
    // https://api.jquery.com/deferred.promise/
    return dfd.promise();
  };

  /**
   * Reset previous bounds and zoom so that any movement on map will load fresh spots
   */
  Map.resetMapState = function() {
    mw.log('HWMaps::Map::resetMapState');
    mw.HWMaps.lastBounds = {
      NElat: 0,
      NElng: 0,
      SWlat: 0,
      SWlng: 0
    };
    mw.HWMaps.lastZoom = 0;
  };

  /**
   * Clear map from markers
   * @param category {String} Undefined (to clear both), `Spots` or `Cities`
   */
  Map.clearMarkers = function(category) {
    mw.log('HWMaps::Map::clearMarkers: ' + category);

    // Clear Spots layer
    if (!category || category === 'Spots') {
      mw.HWMaps.leafletLayers.spots.RemoveMarkers();
      mw.HWMaps.leafletLayers.spots.ProcessView();
    }

    // Clear Cities layer
    if (!category || category === 'Cities') {
      mw.HWMaps.leafletLayers.cities.RemoveMarkers();
      mw.HWMaps.leafletLayers.cities.ProcessView();
    }
  };

  /**
   * @static
   */
  function initialize() {
    mw.log('mw.HWMaps.Map.initialize');

    // Give up if no map element on the page
    if (!document.getElementById('hwmap') || ($.inArray(mw.config.get('wgAction'), ['view', 'purge', 'submit']) === -1)) {
      mw.log('mw.HWMaps.Map.initialize -> No map element, aborting.');
      return;
    }

    // Initializes global variables
    // `mw.HWMaps.lastBounds` and `mw.HWMaps.lastZoom`
    Map.resetMapState();

    configure().then(function() {
      mw.log('mw.HWMaps.Map::configure -> done');
      mw.log(mw.HWMaps.config);
      initializeLeafletIcons().then(function() {
        mw.log('mw.HWMaps.Map::initializeLeafletIcons -> done');
        initializeLeafletElement().then(function() {
          mw.log('mw.HWMaps.Map::initializeLeafletElement -> done');

          // Check if map is called from the special page (full page map)
          if (mw.config.get('wgCanonicalSpecialPageName') === 'HWMap') {
            mw.log('mw.HWMaps.Map::initialize -> Script initialized from the SpecialPage');
            mw.loader.using(['ext.HWMap.NewSpot', 'ext.HWMap.SpecialPage']).then( function () {
              mw.HWMaps.SpecialPage.initialize();
            });
          }
          // Check if map is called from a city article
          // `Cities` category is set by the template
          else if (mw.config.get('wgIsArticle') === true &&
                   mw.config.exists('wgCategories') &&
                   $.inArray('Cities', mw.config.get('wgCategories')) != -1) {
            mw.log('mw.HWMaps.Map::initialize -> Script initialized from a city article');
            // Loader first loads these scripts, and then executes function
            // https://www.mediawiki.org/wiki/ResourceLoader/Modules#mw.loader.using
            mw.loader.using(['ext.HWMap.City', 'ext.HWMap.Toolbar']).then(function() {
              // Initializes functionality required for the city page
              mw.HWMaps.City.initialize();
              // Adds button toolbar on top of the sidebar map:
              mw.HWMaps.Toolbar.initialize();
            });
          }
          // Check if map is called from a country article
          // `Countries` category is set by the template
          else if (mw.config.get('wgIsArticle') === true &&
                   mw.config.exists('wgCategories') &&
                   $.inArray('Countries', mw.config.get('wgCategories')) != -1) {
            mw.log('mw.HWMaps.Map::initialize -> Script initialized from a country article');
            mw.loader.using(['ext.HWMap.Country', 'ext.HWMap.CountryRating', 'ext.HWMap.Toolbar']).then(function() {
              // Initializes basic functionality required for the country page
              mw.HWMaps.Country.initialize();
              // Initializes country rating widget
              mw.HWMaps.CountryRating.initialize();
              // Adds button toolbar on top of the sidebar map:
              mw.HWMaps.Toolbar.initialize();
            });
          }
        });
      });
    });

  }

  /**
   * Fill `mw.HWMaps.config`
   * Refer configuration in this extension using:
   * `mw.HWMaps.config.vendor.defaultZoom` etc
   *
   * @return instance of jQuery.Promise
   */
  function configure() {
    mw.log('mw.HWMaps.Map::configure');

    // https://api.jquery.com/deferred.promise/
    var dfd = $.Deferred();

    if (!mw.HWMaps.config) {

      var config  = {
        // Default location (can be overridden in the URL)
        defaultCenter: [48.6908333333, 9.14055555556], // Europe
        defaultZoom: 5,

        // Geonames settings
        geonamesSpotCityDistance: 30, // in kilometers
        geonamesMinPopulationNonCapital: 500000,

        // Base URL of the page, without URL params
        pageLocation: window.history.location || window.location,
        pageLocationUrl: location.protocol + '//' + location.host + location.pathname
      };

      /*
       * Extends config with these:
       * ```
       * {
       *   vendor: {
       *     geonames_username: '',
       *     mapbox_username: '',
       *     mapbox_mapkey_streets: '',
       *     mapbox_mapkey_satellite: '',
       *     mapbox_access_token: ''
       *   }
       * }
       * ```
       * ...these are configured at the backend (see `mw.HWMaps.leafletMap.php`)
       * */
      mw.HWMaps.config = $.extend(config, mw.config.get('hwConfig') || {});

    }

    dfd.resolve(mw.HWMaps.config);

    // Return the Promise so caller can't change the Deferred
    // https://api.jquery.com/deferred.promise/
    return dfd.promise();
  }

  /**
   * @static
   *
   * @return instance of jQuery.Promise
   */
  function initializeLeafletIcons() {
    mw.log('mw.HWMaps.Map::initializeLeafletIcons');

    // https://api.jquery.com/deferred.promise/
    var dfd = $.Deferred();

    // Hook into Leaflet so it would let us add spot ids to markers
    var leafletOriginalInitIcon = L.Marker.prototype._initIcon,
        leafletOriginalSetIcon = L.Marker.prototype.setIcon;

    // Path for our images
    var extensionRoot = mw.config.get('wgExtensionAssetsPath') + '/HWMap/';

    L.Marker.include({
      setIcon: function(icon, id, title) {
        this.options.id = id;
        this.options.title = title;
        leafletOriginalSetIcon.call(this, icon);
      },
      _initIcon: function() {
        leafletOriginalInitIcon.call(this);
        this._icon.id = 'marker-' + this.options.id;
      }
    });

    // Define default path for Leaflet images
    L.Icon.Default.imagePath = extensionRoot + 'modules/vendor/leaflet/dist/images';

    // Define icons object and make it global
    mw.HWMaps.icons = {};

    mw.HWMaps.icons.country = L.icon({
      iconUrl: extensionRoot + 'modules/img/icons/city.svg',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    // Cities
    mw.HWMaps.icons.city = L.icon({
      iconUrl: extensionRoot + 'modules/img/icons/city.svg',
      className: 'hw-city-icon', // See `cluster.less`
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    mw.HWMaps.icons.citySmall = L.icon({
      iconUrl: extensionRoot + 'modules/img/icons/city.svg',
      className: 'hw-city-icon', // See `cluster.less`
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });


    // Hitching spot
    mw.HWMaps.icons.unknown = L.icon({
      iconUrl: extensionRoot + 'modules/img/icons/0-none.svg',
      className: 'hw-spot-icon', // See `cluster.less`
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    mw.HWMaps.icons.verygood = L.icon({
      iconUrl: extensionRoot + 'modules/img/icons/1-very-good.svg',
      className: 'hw-spot-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    mw.HWMaps.icons.good = L.icon({
      iconUrl: extensionRoot + 'modules/img/icons/2-good.svg',
      className: 'hw-spot-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    mw.HWMaps.icons.average = L.icon({
      iconUrl: extensionRoot + 'modules/img/icons/3-average.svg',
      className: 'hw-spot-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    mw.HWMaps.icons.bad = L.icon({
      iconUrl: extensionRoot + 'modules/img/icons/4-bad.svg',
      className: 'hw-spot-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    mw.HWMaps.icons.senseless = L.icon({
      iconUrl: extensionRoot + 'modules/img/icons/5-senseless.svg',
      className: 'hw-spot-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    mw.HWMaps.icons.new = L.icon({
      iconUrl:       extensionRoot + 'modules/img/icons/new.png',
      iconRetinaUrl: extensionRoot + 'modules/img/icons/new@2x.png',
      shadowUrl:     extensionRoot + 'modules/img/icons/new-shadow.png',
      iconSize:      [25, 35], // size of the icon
      shadowSize:    [33, 33], // size of the shadow
      iconAnchor:    [12, 35], // point of the icon which will correspond to marker's location
      shadowAnchor:  [5, 34],  // the same for the shadow
      popupAnchor:   [-3, -17] // point from which the popup should open relative to the iconAnchor
    });

    dfd.resolve();

    // Return the Promise so caller can't change the Deferred
    // https://api.jquery.com/deferred.promise/
    return dfd.promise();
  }

  /**
   * Initialize Leaflet element with basic Leaflet features
   * This is the same for all maps (Special:HWMap, map on city articles, etc...)
   *
   * @return instance of jQuery.Promise
   */
  function initializeLeafletElement() {
    mw.log('mw.HWMaps.Map::initializeLeafletElement');

    // https://api.jquery.com/deferred.promise/
    var dfd = $.Deferred();

    var mapbox_username = _.get(mw, 'HWMaps.config.vendor.mapbox_username', false),
        mapbox_access_token = _.get(mw, 'HWMaps.config.vendor.mapbox_access_token', false),
        mapbox_mapkey_streets = _.get(mw, 'HWMaps.config.vendor.mapbox_mapkey_streets', false),
        mapbox_mapkey_satellite = _.get(mw, 'HWMaps.config.vendor.mapbox_mapkey_satellite', false);

    // OSM layer
    var mapLayerOSM = L.tileLayer('//{s}.tile.osm.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/">OSM</a>. <strong><a href="https://www.openstreetmap.org/login#map=' + mw.HWMaps.config.defaultZoom + '/' + mw.HWMaps.config.defaultCenter[0] + '/' + mw.HWMaps.config.defaultCenter[1] + '">Improve this map</a></strong>',
      maxZoom: 18,
      continuousWorld: true
    });

    // `defaultLayer` is shown at map init.
    // This gets changed to MapBox below if it's configured
    var defaultLayer = mapLayerOSM;

    // Layers for Layer Leaflet controller
    var baseMaps = {
      'OpenStreetMap': mapLayerOSM
    };

    // Using Mapbox tiles developed for Trustroots+Hitchwiki
    var mapBoxUrl = (mapbox_username && mapbox_access_token) ?
      '//{s}.tiles.mapbox.com/v4/{user}.{map}/{z}/{x}/{y}.png' + L.Util.getParamString({
        secure: 1,
        access_token: mapbox_access_token
      }) : false;

    var mapBoxAttribution = '© <a href="https://www.openstreetmap.org/" target="_blank">OSM</a> &amp; <a href="https://www.mapbox.com/" target="_blank">MapBox</a>.';

    // Streets layer
    // https://github.com/Trustroots/Trustroots-map-styles/tree/master/Trustroots-Hitchmap.tm2
    if (mapBoxUrl && mapbox_mapkey_streets) {
      var mapLayerStreets = L.tileLayer(mapBoxUrl, {
        attribution: mapBoxAttribution + ' <strong><a href="https://www.mapbox.com/map-feedback/#' + mapbox_username + '.' + mapbox_mapkey_streets + '/' + mw.HWMaps.config.defaultCenter[1] + '/' + mw.HWMaps.config.defaultCenter[0] + '/' + mw.HWMaps.config.defaultZoom + '">Improve this map</a></strong>',
        maxZoom: 18,
        continuousWorld: true,
        user: mapbox_username,
        map: mapbox_mapkey_streets
      });
      defaultLayer = mapLayerStreets;
      baseMaps['Streets'] = mapLayerStreets;
    }

    // Satellite layer
    if (mapBoxUrl && mapbox_mapkey_satellite) {
      var mapLayerSatellite = L.tileLayer(mapBoxUrl, {
        attribution: mapBoxAttribution + ' <strong><a href="https://www.mapbox.com/map-feedback/#' + mapbox_username + '.' + mapbox_mapkey_satellite + '/' + mw.HWMaps.config.defaultCenter[1] + '/' + mw.HWMaps.config.defaultCenter[0] + '/' + mw.HWMaps.config.defaultZoom + '">Improve this map</a></strong>',
        maxZoom: 18,
        continuousWorld: true,
        user: mapbox_username,
        map: mapbox_mapkey_satellite
      });
      baseMaps['Satellite'] = mapLayerSatellite;
    }

    // Map init
    // `hwmap` is the element id in DOM (e.g. `<div id="hwmap"></div>`)
    mw.HWMaps.leafletMap = L.map('hwmap', {
      center: mw.HWMaps.config.defaultCenter,
      zoom: mw.HWMaps.config.defaultZoom,
      layers: [defaultLayer],
      zoomControl: false, // added separately
      attributionControl: false // Attribution is set per layer
    });

    // Add attribution control (a copyright text)
    // http://leafletjs.com/reference-1.0.0.html#control-attribution
    L.control.attribution({
      position: 'bottomleft',
      prefix: ''
    }).addTo(mw.HWMaps.leafletMap);

    // Add scale control
    L.control.scale({
      position: 'bottomleft'
    }).addTo(mw.HWMaps.leafletMap);

    // Layer control
    // http://leafletjs.com/reference-1.0.0.html#control-layers
    L.control.layers(
      // Tile layers:
      baseMaps,
      // Overlays:
      {},
      // Control options:
      {
        position: 'bottomleft',
        hideSingleBase: true // If true, the base layers in the control will be hidden when there is only one
      }
    ).addTo(mw.HWMaps.leafletMap);

    // Add zoom control
    // http://leafletjs.com/reference-1.0.0.html#control-zoom
    L.control.zoom({
      position: 'bottomright'
    }).addTo(mw.HWMaps.leafletMap);

    // Layers for markers
    mw.HWMaps.leafletLayers = {
      spots: new PruneClusterForLeaflet(120, 0),
      cities: new PruneClusterForLeaflet(5, 0)
    };
    mw.HWMaps.leafletMap.addLayer(mw.HWMaps.leafletLayers.spots);
    mw.HWMaps.leafletMap.addLayer(mw.HWMaps.leafletLayers.cities);

    // Fixes map loading partially, probably some sort
    // of a CSS issue but this fixes it...
    // Feel free to fix if you have spare time. ;-)
    mw.HWMaps.leafletMap.whenReady(function() {
      setTimeout(function() {
        mw.HWMaps.leafletMap.invalidateSize();
        // Make sure map sits properly in its surrounding div
        //mw.HWMaps.leafletMap.invalidateSize(false);
      }, 500);

      // Return promise once Leaflet is ready
      return dfd.resolve();
    });

    // Return the Promise so caller can't change the Deferred
    // https://api.jquery.com/deferred.promise/
    return dfd.promise();
  }

  // Export
  mw.HWMaps.Map = Map;

  // Wait for DOM to finish loading before initializing the extension
  $(document).ready(function() {
    mw.log('HWMaps::Map -> $document ready');
    initialize();
  });

}(mediaWiki, jQuery, L));

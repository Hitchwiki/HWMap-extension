<?php
if ( !defined( 'MEDIAWIKI' ) ) die();
/**
 * hitchwiki map extension
 * <hwmap></hwmap>
 */

/**
 * "Radius" of the square bounding box within which cities are deemed relevant
 * to the spot
 *
 * Reference: http://www.movable-type.co.uk/scripts/latlong-db.html
 *
 *  -------------NE
 * |              |
 * |        radius|
 * |       o------|
 * |              |
 * |              |
 * SW-------------
 *
 * Relevant for HWFindNearbyCity API call
 */

$wgHwMapCityRelevanceRadius = 15000; // in meters

/**
 * Difference between distances from the spot to the two closest cities
 * that is considered small enough to consider them both equally relevant
 *
 * If the difference is higher than this value, only one closest city will be
 * included in the result set
 *
 * Relevant for HWFindNearbyCity API call
 */

$wgHwMapCityCloseDistance = 2500; // in meters

/**
 * Minimum population of a place to be considered a "big city", when it's
 * neither a country capital, nor a regional capital (eg. Rotterdam)
 *
 * Relevant for HWFindNearbyCity API call
 */

$wgHwMapBigCityMinPopulation = 500000;

/* ------------------------------------------------------------------------ */

// Kudos
$wgExtensionCredits['HWMap'][] = array(
  'path' => __FILE__,
  'name' => 'HWMap',
  'descriptionmsg' => 'hwmaps-desc',
  'author' => array('Rémi Claude', 'Mikael Korpela', 'Olexandr Melnyk'),
  'url' => 'https://github.com/Hitchwiki/HWMap-extension',
  'version' => '2.1.0',
  'license-name' => 'MIT'
);

// Register hook
$wgHooks['ParserFirstCallInit'][] = 'onParserInit';
$wgHooks['ResourceLoaderGetConfigVars'][] = 'onResourceLoaderGetConfigVars';

// Extension & magic words i18n
$wgMessagesDirs['HWMap'] = __DIR__ . '/i18n';

// Register aliases
$wgExtensionMessagesFiles['HWMapAlias'] = __DIR__ . '/HWMap.alias.php';

// Register special pages
$wgAutoloadClasses['SpecialHWMap'] = $IP . '/extensions/HWMap/SpecialHWMap.php';
$wgSpecialPages['HWMap'] = 'SpecialHWMap';

//Register API
$wgAutoloadClasses['SphericalGeometry'] = __DIR__ . '/lib/SphericalGeometry/spherical-geometry.class.php';
$wgAutoloadClasses['HWMapApi'] = __DIR__ . '/api/HWMapApi.php';
$wgAutoloadClasses['HWMapCityApi'] = __DIR__ . '/api/HWMapCityApi.php';
$wgAutoloadClasses['HWSpotIdApi'] = __DIR__ . '/api/HWSpotIdApi.php';
$wgAutoloadClasses['HWFindNearbyCityApi'] = __DIR__ . '/api/HWFindNearbyCityApi.php';
$wgAPIModules['hwmapapi'] = 'HWMapApi';
$wgAPIModules['hwmapcityapi'] = 'HWMapCityApi';
$wgAPIModules['hwspotidapi'] = 'HWSpotIdApi';
$wgAPIModules['hwfindnearbycityapi'] = 'HWFindNearbyCityApi';

// Register assets
$wgHWMapResourceBoilerplate = array(
  'localBasePath' => __DIR__,
  'remoteExtPath' => 'HWMap',
);
$wgResourceModules = array_merge( $wgResourceModules, array(

  'leaflet' => $wgHWMapResourceBoilerplate + array(
    'scripts' => array(
      'modules/vendor/leaflet/dist/leaflet.js',
    )       ,
    'styles' => array(
      'modules/vendor/leaflet/dist/leaflet.css',
    ),
  ),
  'bootstrap-grid' => $wgHWMapResourceBoilerplate + array(
    'styles' => array(
      'modules/vendor/bootstrap-grid/dist/bootstrap-grid.css',
    ),
  ),

  'PruneCluster' => $wgHWMapResourceBoilerplate + array(
    'dependencies' => array(
      'leaflet',
    ),
    'scripts' => array(
      'modules/vendor/PruneCluster/dist/PruneCluster.js',
      'modules/js/ext.HWMap.PruneCluster.binding.js'
    ),
    'styles' => array(
      'modules/vendor/PruneCluster/dist/LeafletStyleSheet.css',
    ),
  ),

  'ractive' => $wgHWMapResourceBoilerplate + array(
    'scripts' => array(
      'modules/vendor/ractive/ractive.js',
    )
  ),

  'autogrow' => $wgHWMapResourceBoilerplate + array(
    'scripts' => array(
      'modules/vendor/autogrow/autogrow.js',
    )
  ),

  'ext.HWMap' => $wgHWMapResourceBoilerplate + array(
    'dependencies' => array(
      'mediawiki.page.startup',
      'mediawiki.util',
      'oojs-ui-core',
      'oojs-ui-widgets',
      'jquery.tipsy', // deprecated in MW 1.28
      'leaflet',
      'bootstrap-grid',
      'PruneCluster',
      'ractive',
      'autogrow'
    ),
    'scripts' => array(
      'modules/js/ext.HWMap.HwGeoPoint.js',
      'modules/js/ext.HWMap.Spots.js',
      'modules/js/ext.HWMap.NewSpot.js',
      'modules/js/ext.HWMap.SpecialPage.js',
      'modules/js/ext.HWMap.Country.js',
      'modules/js/ext.HWMap.City.js',
      'modules/js/ext.HWMap.Country.Rating.js',
      'modules/js/ext.HWMap.Toolbar.js',
      'modules/js/ext.HWMap.js'
    ),
    'styles' => array(
      'modules/less/ext.HWMap.less',
    ),
    // Other ensures this loads after the Vector skin styles
    'group' => 'other',
    'position' => 'bottom',
  )
) );

/**
 * The hook registration function.
 */

function onParserInit( Parser $parser ) {
  global $wgOut;
  $parser->setHook('hw-map', 'HWMapRender');
  $parser->setHook('hw-rate', 'HWRatingRender');
  $wgOut->addModules('ext.HWMap');
  return true;
}

function HWMapRender( $input, array $args, Parser $parser, PPFrame $frame ) {
  $result = file_get_contents(__DIR__ .'/modules/templates/ext.HWMap.City.template.html');
  return $result;
}

function HWRatingRender( $input, array $args, Parser $parser, PPFrame $frame ) {
  $result = file_get_contents(__DIR__ .'/modules/templates/ext.HWMap.Country.Rating.html');
  return $result;
}

function onResourceLoaderGetConfigVars( array &$vars ) {
  global $hwConfig;

  $varNames = array( // explicit list to avoid private tokens ending up in JS vars
      'geonames_username',
      'mapbox_username',
      'mapbox_access_token',
      'mapbox_mapkey_streets',
      'mapbox_mapkey_satellite'
  );

  foreach ($varNames as $varName) {
    if (!isset($hwConfig['vendor'][$varName])) { // doesn't look like there's a better way to handle this case
      throw new Exception('vendor.' . $hwConfig['vendor'][$varName] . ' config option missing');
    }
    $vars[$varName] = $hwConfig['vendor'][$varName];
  }

  $vars['hwConfig'] = array(
    'vendor' => $vars
  );

  return true;
}

<?php
if ( !defined( 'MEDIAWIKI' ) ) die();
/**
 * hitchwiki map extension
 * <hwmap></hwmap>
 */

// Kudos
$wgExtensionCredits['HWMap'][] = array(
  'path' => __FILE__,
  'name' => 'HWMap',
  'descriptionmsg' => 'hwmaps-desc',
  'author' => array('Rémi Claude', 'Mikael Korpela', 'Olexandr Melnyk'),
  'url' => 'https://github.com/Hitchwiki/HWMap-extension',
  'version' => '2.0.0',
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
$wgAutoloadClasses['HWMapApi'] = __DIR__ . '/api/HWMapApi.php';
$wgAutoloadClasses['HWMapCityApi'] = __DIR__ . '/api/HWMapCityApi.php';
$wgAutoloadClasses['HWSpotIdApi'] = __DIR__ . '/api/HWSpotIdApi.php';
$wgAPIModules['hwmapapi'] = 'HWMapApi';
$wgAPIModules['hwmapcityapi'] = 'HWMapCityApi';
$wgAPIModules['hwspotidapi'] = 'HWSpotIdApi';

// Register assets
$wgHWMapResourceBoilerplate = array(
  'localBasePath' =>  __DIR__,
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

  'ext.HWMap' => $wgHWMapResourceBoilerplate + array(
    'dependencies' => array(
      'jquery.tipsy',
      'leaflet',
      'bootstrap-grid',
      'PruneCluster',
      'ractive'
    ),
    'scripts' => array(
      'modules/vendor/geopoint/geopoint.js',
      'modules/js/ext.HWMap.Spots.js',
      'modules/js/ext.HWMap.NewSpot.js',
      'modules/js/ext.HWMap.SpecialPage.js',
      'modules/js/ext.HWMap.City.js',
      'modules/js/ext.HWMap.js'
    ),
    'styles' => array(
      'modules/less/ext.HWMap.less',
    ),
    // Other ensures this loads after the Vector skin styles
    'group' => 'other',
    'position' => 'bottom',
  ),

) );

/**
 * The hook registration function.
 */

function onParserInit( Parser $parser ) {
  global $wgOut;
  $parser->setHook( 'hwmap', 'HWMapRender');
  $wgOut->addModules( 'ext.HWMap' );
  return true;
}

function HWMapRender( $input, array $args, Parser $parser, PPFrame $frame ) {
  $result = file_get_contents(__DIR__ .'/modules/templates/ext.HWMap.City.template.html');
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

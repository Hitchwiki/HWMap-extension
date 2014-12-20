<?php
if ( !defined( 'MEDIAWIKI' ) ) die();
/**
 * hitchwiki map extension
 * <hwmap></hwmap>
 */

// Kudos
$wgExtensionCredits['hitchwikimap'][] = array(
  'path' => __FILE__,
  'name' => 'HWMap',
  'descriptionmsg' => 'hwmaps-desc',
  'author' => array('Rémi Claude', 'Mikael Korpela'),
  'url' => 'https://github.com/Hitchwiki/HWMap-extension',
  'version' => '2.0.0',
  'license-name' => 'MIT'
);

// Register hook
$wgHooks['ParserFirstCallInit'][] = 'onParserInit';

// Extension & magic words i18n
$wgMessagesDirs['HWMap'] = __DIR__ . '/i18n';

// Register aliases
$wgExtensionMessagesFiles['HWMapAlias'] = __DIR__ . '/HWMap.alias.php';

// Register special pages
$wgAutoloadClasses['SpecialHWMap'] = $IP . '/extensions/HWMap/SpecialHWMap.php';
$wgSpecialPages['HWMap'] = 'SpecialHWMap';

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

  'leaflet-markercluster' => $wgHWMapResourceBoilerplate + array(
    'dependencies' => array(
      'leaflet',
    ),
    'scripts' => array(
      'modules/vendor/leaflet.markercluster/dist/leaflet.markercluster.js',
    ),
    'styles' => array(
      'modules/vendor/leaflet.markercluster/dist/MarkerCluster.css',
      'modules/vendor/leaflet.markercluster/dist/MarkerCluster.Default.css',
    ),
  ),

  'ext.HWMap' => $wgHWMapResourceBoilerplate + array(
    'dependencies' => array(
    	'leaflet',
      'leaflet-markercluster'
    ),
    'scripts' => array(
      'modules/ext.HWMap.js',
    ),
    'styles' => array(
      'modules/ext.HWMap.less',
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
  return '<div id="hwmap-container"><div id="hwmap"></div></div>';
}

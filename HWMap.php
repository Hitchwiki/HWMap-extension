<?php
if ( !defined( 'MEDIAWIKI' ) ) die();
/**
 * hitchwikimap extension
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

// Register modules
$wgResourceModules['ext.HWMap'] = array(
	'scripts' => array(
<<<<<<< HEAD
<<<<<<< HEAD
        'modules/vendor/leaflet/dist/leaflet.js',
        'modules/vendor/leaflet.markercluster/dist/leaflet.markercluster.js',
        'modules/ext.HWMap.js'
	),
	'styles' => array(
        'modules/vendor/leaflet/dist/leaflet.css',
        'modules/vendor/leaflet.markercluster/dist/MarkerCluster.css',
        'modules/vendor/leaflet.markercluster/dist/MarkerCluster.Default.css',
=======
    'modules/vendor/leaflet/dist/leaflet.js',
    'modules/ext.HWMap.js'
	),
	'styles' => array(
    'modules/vendor/leaflet/dist/leaflet.css',
>>>>>>> df08210dca6071d80579806c324eeb7397ac67aa
=======
    'modules/vendor/leaflet/dist/leaflet.js',
    'modules/ext.HWMap.js'
	),
	'styles' => array(
    'modules/vendor/leaflet/dist/leaflet.css',
>>>>>>> df08210dca6071d80579806c324eeb7397ac67aa
		'modules/ext.HWMap.css'
	),
	'localBasePath' =>  __DIR__,
	'remoteExtPath' => 'HWMap'
);

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
  return '<div id="hwmap"></div>';
}

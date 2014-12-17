<?php
if ( !defined( 'MEDIAWIKI' ) ) die();
/**
 * hitchwikimap extension
 * <hitchmap></hitchmap>
 */

$wgExtensionCredits['hitchwikimap'][] = array(
	'path' => __FILE__,
	'name' => 'HWMap',
	'author' => 'Rémi Claude'
);

//Register hook
$wgHooks['ParserFirstCallInit'][] = 'onParserInit';


// Register special pages
$wgAutoloadClasses['SpecialHWMap'] = $IP . '/extensions/HWMap/SpecialHWMap.php';
$wgSpecialPages['HWMap'] = 'SpecialHWMap';

// Register modules
$wgResourceModules['ext.HWMap'] = array(
	'scripts' => array(
        'modules/vendor/leaflet/dist/leaflet.js',
        'modules/ext.HWMap.js'
	),
	'styles' => array(
        'modules/vendor/leaflet/dist/leaflet.css',
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
    $parser->setHook( 'hwmap','HWMapRender'); 
    $wgOut->addModules( 'ext.HWMap' );		
    return true;
}
function HWMapRender( $input, array $args, Parser $parser, PPFrame $frame ) {
    return '<div id="hwmap"></div>';
}


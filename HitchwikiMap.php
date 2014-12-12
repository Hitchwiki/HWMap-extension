<?php
if ( !defined( 'MEDIAWIKI' ) ) die();
/**
 * hitchwikimap extension
 * <hitchmap></hitchmap>
 */

$wgExtensionCredits['hitchwikimap'][] = array(
	'path' => __FILE__,
	'name' => 'Hitchwiki Map',
	'author' => 'Hitchwiki'
);

$wgAutoloadClasses['HitchwikiMap'] = $IP . '/extensions/HitchwikiMap/HitchwikiMap.php';
$wgHooks['ParserFirstCallInit'][] = 'onParserInit';

// Register modules
$wgResourceModules['ext.hitchwikimap'] = array(
	'scripts' => array(
        'modules/vendor/leaflet/dist/leaflet.js',
        'modules/ext.hitchwikimap.js'
	),
	'styles' => array(
        'modules/vendor/leaflet/dist/leaflet.css',
		'modules/ext.hitchwikimap.css'
	),
    'messages' => array( 'myextension-hello-world', 'myextension-goodbye-world' ),
	'localBasePath' =>  __DIR__,
	'remoteExtPath' => 'HitchwikiMap'
);

/**
 * The registration function.
 */
function onParserInit( Parser $parser ) {
    global $wgOut;
    $parser->setHook( 'hitchmap','hitchmapRender'); 
    $wgOut->addModules( 'ext.hitchwikimap' );		
    return true;
}
function hitchmapRender( $input, array $args, Parser $parser, PPFrame $frame ) {
    return '<div id="hitchmap"></div>';
}


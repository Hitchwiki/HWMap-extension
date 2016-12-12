/**
 * Add a simple toolbar with buttons like "Add new place" and "World map"
 * to "sidebar maps" at City/Area/Country articles.
 *
 * Relies to OOjs UI/Widgets
 * https://www.mediawiki.org/wiki/OOjs_UI/Widgets/Buttons_and_Switches
 */
var $hwmapToolbar;

var setupMapToolbar = function () {
  mw.log('->HWMap->setupMapToolbar');

  $hwmapToolbar = $('.hwmap-toolbar');

  // Add buttons inside the toolbar if it exists
  if ($hwmapToolbar.length) {
    setupNewSpotButton();
    setupWorldMapButton();
  }
};

/**
 * "Add new spot" button
 */
var setupNewSpotButton = function () {
  var newSpotButton = new OO.ui.ButtonWidget({
    label: 'Add new spot',
    // icon: 'MapPinAdd',
    // `#add` in the URL initializes adding a new spot at `HWMap` page
    href: mw.config.get('wgArticlePath').replace('$1', 'Special:HWMap#add')
  });
  $hwmapToolbar.append(newSpotButton.$element);
};

/**
 * "World map" button
 */
var setupWorldMapButton = function () {
  var worldMapButton = new OO.ui.ButtonWidget({
    label: 'World map',
    // icon: 'Map',
    href: mw.config.get('wgArticlePath').replace('$1', 'Special:HWMap')
  });
  $hwmapToolbar.append(worldMapButton.$element);
};

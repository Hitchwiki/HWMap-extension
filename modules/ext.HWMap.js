//Root locations
var api_root = mw.config.get("wgServer") + mw.config.get("wgScriptPath");
var extension_root = mw.config.get("wgExtensionAssetsPath") + "/HWMap/";

//Setting up the map
var hwmap = L.map('hwmap');
var markersLayer = new L.MarkerClusterGroup();

//Title of the current page
var pageTitle = mw.config.get("wgTitle");

//Icons
var icons = {};
icons.country = L.icon({
  iconUrl:  extension_root + 'icons/city.png',
  iconRetinaUrl: extension_root + 'icons/city.png@2x'
});
icons.city = L.icon({
    iconUrl:  extension_root + 'icons/city.png',
    iconRetinaUrl: extension_root + 'icons/city.png@2x'
});
icons.unknown = L.icon({
  iconUrl:  extension_root + 'icons/0-unknown.png',
  iconRetinaUrl: extension_root + 'icons/0-unknown.png@2x'
});
icons.verygood = L.icon({
  iconUrl:  extension_root + 'icons/1-very-good.png',
  iconRetinaUrl: extension_root + 'icons/1-very-good.png@2x'
});
icons.good = L.icon({
    iconUrl:  extension_root + 'icons/2-good.png',
    iconRetinaUrl: extension_root + 'icons/2-good.png@2x'
});
icons.average = L.icon({
  iconUrl:  extension_root + 'icons/3-average.png',
  iconRetinaUrl: extension_root + 'icons/3-average.png@2x'
});
icons.bad = L.icon({
  iconUrl:  extension_root + 'icons/4-bad.png',
  iconRetinaUrl: extension_root + 'icons/4-bad.png@2x'
});
icons.senseless = L.icon({
  iconUrl:  extension_root + 'icons/5-senseless.png',
  iconRetinaUrl: extension_root + 'icons/5-senseless.png@2x'
});

L.Icon.Default.imagePath = extension_root + 'modules/vendor/leaflet/dist/images';

// Using a map tiles developed for Trustroots/Hitchwiki
// https://github.com/Trustroots/Trustroots-map-styles/tree/master/Trustroots-Hitchmap.tm2
// If we ever start using https, add this to the tiles url: &secure=1
L.tileLayer('//{s}.tiles.mapbox.com/v4/trustroots.ce8bb774/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoidHJ1c3Ryb290cyIsImEiOiJVWFFGa19BIn0.4e59q4-7e8yvgvcd1jzF4g', {
    attribution: '<a href="http://www.openstreetmap.org/">OSM</a>',
    maxZoom: 18,
    continuousWorld: true
}).addTo(hwmap);

markersLayer.addTo(hwmap

//Initialize last bounds and last_zoom
var last_bounds = {
    NElat:'0',
    NElng:'0',
    SWlat:'0',
    SWlng:'0'
};
var last_zoom = 0;

//Function to get marker in the current boundings
var getBoxSpots = function () {
    bounds = hwmap.getBounds();
    if(bounds._northEast.lat > last_bounds.NElat || bounds._northEast.lng > last_bounds.NElng || bounds._southWest.lat < last_bounds.SWlat || bounds._southWest.lng < last_bounds.SWlng) {

        //Make the bounds a bit bigger
        last_bounds.NElat = parseInt(bounds._northEast.lat) + 1;
        last_bounds.NElng = parseInt(bounds._northEast.lng) + 1;
        last_bounds.SWlat = parseInt(bounds._southWest.lat) - 1;
        last_bounds.SWlng = parseInt(bounds._southWest.lng) - 1;

        //Query HWCoordinateAPI
        $.get( api_root + "/api.php?action=hwcoordapi&SWlat=" + last_bounds.SWlat + "&SWlon=" + last_bounds.SWlng + "&NElat=" + last_bounds.NElat + "&NElon=" + last_bounds.NElng + "&format=json", function( data ) {
            //Clear the current markers
            markersLayer.clearLayers();
            //Add the new markers
            for (var i in data.spots) {
                if(data.spots[i].category == 'Spots') {
                    var marker = L.marker([data.spots[i].location[0],data.spots[i].location[1]], {icon: icons.verygood});
                    markersLayer.addLayer(marker);
                }
                else if(data.spots[i].category == 'Cities') {
                    var marker = L.marker([data.spots[i].location[0],data.spots[i].location[1]], {icon: icons.city});
                    markersLayer.addLayer(marker);
                }
            }
        });
    }
}

//Check if map is called from the special page
if (mw.config.get('wgCanonicalSpecialPageName') == "HWMap") {
    //Set map view
    hwmap.setView([45, 10], 6);

    //Getting spots in bounding box
    getBoxSpots();

    //Fire event to check when map move
    hwmap.on('moveend', function() {
        console.log(markersLayer);
        console.log(markersLayer._topClusterLevel._childcount);
        //Get spots when zoom is bigger than 6
        if(hwmap.getZoom() > 5) {
            getBoxSpots();
        }
        //When zoom is smaller than 6 we clear the markers if not already cleared
        else if(markersLayer._topClusterLevel._childCount > 0){
            //Clear the markers and last boundings
            markersLayer.clearLayers();
            last_bounds = {
                NElat:'0',
                NElng:'0',
                SWlat:'0',
                SWlng:'0'
            };
        }
    });
}
//Check if map is called from a city page
else if($.inArray("Cities", mw.config.get('wgCategories')) != -1){

    //Getting the current coordinate
    $.get( api_root + "/api.php?action=query&prop=coordinates&titles=" + pageTitle + "&format=json", function( data ) {
        for (var i in data.query.pages) {
            page = data.query.pages[i];
            break;
        }
        //Add city marker
        L.marker([page.coordinates[0].lat, page.coordinates[0].lon], {icon: icons.city}).addTo(hwmap);
        //Set Map View
        hwmap.setView([page.coordinates[0].lat, page.coordinates[0].lon], 10);
    });


    //Getting related spots
    $.get( api_root + "/api.php?action=ask&query=[[Category:Spots]][[Cities::" + pageTitle + "]]|%3FLocation&format=json", function( data ) {
        //Add Markers to the map
        for (var i in data.query.results) {
            L.marker([data.query.results[i].printouts.Location[0].lat,data.query.results[i].printouts.Location[0].lon], {icon: icons.verygood}).addTo(hwmap);
        }
    });
}

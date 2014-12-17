//Root locations
var api_root = mw.config.get("wgServer") + mw.config.get("wgScriptPath");
var extension_root = mw.config.get("wgExtensionAssetsPath") + "/HWMap/";

//Setting up the map
var hwmap = L.map('hwmap');
var markersLayer = new L.LayerGroup();

//Title of the current page
var pageTitle = mw.config.get("wgTitle");

L.Icon.Default.imagePath = extension_root + 'modules/vendor/leaflet/dist/images';

L.tileLayer('http://{s}.tiles.mapbox.com/v3/remigr.jol982fa/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18
}).addTo(hwmap);
markersLayer.addTo(hwmap);

//Initialize last bounds and last_zoom
var last_bounds = {
    NElat:'0',
    NElng:'0',
    SWlat:'0',
    SWlng:'0'
};
var last_zoom = 0;

//Function to get marker in the current boundings
var getboxspot = function () {
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
                var marker = L.marker([data.spots[i].location[0],data.spots[i].location[1]]);
                markersLayer.addLayer(marker);
            }
        });
    }
}

//Check if map is called from the special page
if (mw.config.get('wgCanonicalSpecialPageName') == "HWMap") {
    //Set map view
    hwmap.setView([45, 10], 6);

    //Getting spots in bounding box
    getboxspot();

    //Fire event to check when map move
    hwmap.on('moveend', function() {
        //Get spots when zoom is bigger than 6
        if(hwmap.getZoom() > 5) {
            getboxspot();
        }
        //When zoom is smaller than 6 we clear the markers
        else {
            //Check if the markers were already cleared
            for (key in markersLayer._layers) {
                if (!markersLayer._layers.hasOwnProperty(key)) break;
                else {
                    //Clear the markers and last boundings
                    markersLayer.clearLayers();
                    last_bounds = {
                        NElat:'0',
                        NElng:'0',
                        SWlat:'0',
                        SWlng:'0'
                    };
                    break;
                }
            }
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
        L.marker([page.coordinates[0].lat, page.coordinates[0].lon]).addTo(hwmap);
        //Set Map View
        hwmap.setView([page.coordinates[0].lat, page.coordinates[0].lon], 10);
    });


    //Getting related spots
    $.get( api_root + "/api.php?action=ask&query=[[Category:Spots]][[Cities::" + pageTitle + "]]|%3FLocation&format=json", function( data ) {
        //Add Markers to the map
        for (var i in data.query.results) {
            L.marker([data.query.results[i].printouts.Location[0].lat,data.query.results[i].printouts.Location[0].lon]).addTo(hwmap);
        }
    });
}




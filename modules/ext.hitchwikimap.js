//Root locations
var api_root = mw.config.get("wgServer") + mw.config.get("wgScriptPath");
var extension_root = mw.config.get("wgExtensionAssetsPath") + "/HitchwikiMap/";

//Title of the current page
var pageTitle = mw.config.get("wgTitle");

//Setting up the map
var hitchmap = L.map('hitchmap');

L.Icon.Default.imagePath = extension_root + 'modules/vendor/leaflet/dist/images';

L.tileLayer('http://{s}.tiles.mapbox.com/v3/remigr.jol982fa/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18
}).addTo(hitchmap);

//Getting the current coordinate
$.get( api_root + "/api.php?action=query&prop=coordinates&titles=" + pageTitle + "&format=json", function( data ) {
    for (var i in data.query.pages) {
        page = data.query.pages[i];
        break;
    }
    L.marker([page.coordinates[0].lat, page.coordinates[0].lon]).addTo(hitchmap);
    hitchmap.setView([page.coordinates[0].lat, page.coordinates[0].lon], 10);
});

//Getting related spots
$.get( api_root + "/api.php?action=ask&query=[[Category:Spots]][[Cities::" + pageTitle + "]]|%3FLocation&format=json", function( data ) {
    console.log(data);
    for (var i in data.query.results) {
        L.marker([data.query.results[i].printouts.Location[0].lat,data.query.results[i].printouts.Location[0].lon]).addTo(hitchmap);
    }
});

hitchmap.on('moveend', function() {
    console.log(hitchmap.getBounds());
});
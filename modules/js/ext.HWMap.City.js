/*
 * Setup big map at city article
 */
var setupCityMap = function setupCityMap() {
  mw.log('->HWMap->setupCityMap');

  //Cluster size
  spotsLayer.Cluster.Size = parseInt(10);

  //Getting the current coordinate
  $.get( apiRoot + "/api.php?action=query&prop=coordinates&titles=" + mw.config.get("wgTitle") + "&format=json", function( data ) {
    for (var i in data.query.pages) {
      page = data.query.pages[i];
      break;
    }

    // If this city has coordinates set via SMW, add marker to the map
    if(page.coordinates) {

      //Build city marker
      var marker = new PruneCluster.Marker(
        page.coordinates[0].lat,
        page.coordinates[0].lon
      );

      //Add icon
      marker.data.icon = icons.city;
      marker.data.HWtype = 'city';

      //Register marker
      spotsLayer.RegisterMarker(marker);

      // Center map to city coordinates
      hwmap.setView([page.coordinates[0].lat, page.coordinates[0].lon], 12);
    }

    //Set Map View
    spotsLayer.ProcessView();
  });


  //Getting related spots
  $.get( apiRoot + "/api.php?action=hwmapcityapi&format=json&user_id="+userId+"&properties=Location,Country,CardinalDirection,CitiesDirection,RoadsDirection&page_title=" + mw.config.get("wgTitle"), function( data ) {

    // Proceed if we got spots
    if(!data.error && data.query && data.query.spots.length > 0) {

      //Let's group the different spots by cardinal direction
      var otherDirections = [];
      for(var i = 0; i < data.query.spots.length; i++) {
        data.query.spots[i].average_label = getRatingLabel(data.query.spots[i].rating_average);
        if(data.query.spots[i].timestamp_user){
          data.query.spots[i].timestamp_user = parseTimestamp(data.query.spots[i].timestamp_user);
        }
        if(data.query.spots[i].rating_user){
          data.query.spots[i].rating_user_label = getRatingLabel(data.query.spots[i].rating_user);
        }
        console.log(data.query.spots[i].CardinalDirection);
        if (data.query.spots[i].CardinalDirection[0]) {
          var CardinalDirection = data.query.spots[i].CardinalDirection.join(', ');
          if(!spotsData.groupSpots[CardinalDirection]) {
            spotsData.groupSpots[CardinalDirection] = [];
          }
          spotsData.groupSpots[CardinalDirection].push(data.query.spots[i]);
        }
        else {
          otherDirections.push(data.query.spots[i])
        }

      }
      if(otherDirections.length) {
        spotsData.groupSpots['Other directions'] = otherDirections;
      }

      console.log(spotsData);
      //Init template
      initTemplate();

      var citySpots = data.query.spots;

      for (var i in citySpots) {
        //Build spot marker
        var marker = new PruneCluster.Marker(
          citySpots[i].Location[0].lat,
          citySpots[i].Location[0].lon
        );
        //Add icon
        marker.data.icon = iconSpot(citySpots[i].rating_average);
        //Add id
        console.log(citySpots[i].id);
        marker.data.HWid = citySpots[i].id;
        marker.data.HWtype = 'spot';
        marker.data.average = citySpots[i].rating_average;
        //Register marker
        spotsLayer.RegisterMarker(marker);
      }
      spotsLayer.ProcessView();

    }

  });
}

var initTemplate = function () {

    $.get( extensionRoot +'modules/templates/ext.HWMAP.CitySpots.template.html' ).then( function ( template ) {
      ractive = new Ractive({
        el: 'incity-spots',
        template: template,
        data: {
          spots: spotsData,
          userId: userId
        }
      });

      $(".hw-spot-edit-button").click(function(evt) {
        evt.preventDefault();
        var $form = $('#spot-edit-form-wrap form');
        $form.find("input[name='page_name']").val($(this).data('title'));
        $form.submit();
      });

      $(".your-rate").hide();

      $(".rating-widget .rate").click(function(evt) {
        $(".your-rate").hide();
        $(".rate").show();
        evt.preventDefault();
        $(this).hide();
        var id = $(this).attr('id').replace(/rate_/, '');

        $("#your_rate_" + id).show();
      });

      $(document).mouseup(function (e) {
        var container = $(".rating-widget .rate");

        if (!container.is(e.target) // if the target of the click isn't the container...
            && container.has(e.target).length === 0) // ... nor a descendant of the container
        {
          $(".your-rate").hide();
          $(".rate").show();
        }
      });

    });

};

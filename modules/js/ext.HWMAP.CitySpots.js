
/*
 * Setup big map at city article
 */
var setupCityMap = function setupCityMap() {
  mw.log('->HWMap->setupCityMap');

  $("body").addClass("hwmap-page");

  //Getting the current coordinate
  $.get( apiRoot + "/api.php?action=query&prop=coordinates&titles=" + mw.config.get("wgTitle") + "&format=json", function( data ) {
    for (var i in data.query.pages) {
      page = data.query.pages[i];
      break;
    }

    //Build city marker
    var marker = new PruneCluster.Marker(
      page.coordinates[0].lat,
      page.coordinates[0].lon
    );

    //Add icon
    marker.data.icon = icons.city;

    //Register marker
    spotsLayer.RegisterMarker(marker);

    //Set Map View
    hwmap.setView([page.coordinates[0].lat, page.coordinates[0].lon], 12);
    spotsLayer.ProcessView();
  });


  //Getting related spots
  $.get( apiRoot + "/api.php?action=hwmapcityapi&format=json&properties=Location,Country,CardinalDirection,CitiesDirection,RoadsDirection&page_title=" + mw.config.get("wgTitle"), function( data ) {
    //Let's group the different spots by cardinal direction
    for(var i = 0; i < data.query.spots.length; i++) {
      data.query.spots[i].average_label = getRatingLabel(data.query.spots[i].rating_average);
      if(!data.query.spots[i].rating_average) {
        data.query.spots[i].rating_average = '0';
      }
      if(data.query.spots[i].timestamp_user){
        data.query.spots[i].timestamp_user = parseTimestamp(data.query.spots[i].timestamp_user);
      }
      if(data.query.spots[i].rating_user){
        data.query.spots[i].rating_user_label = getRatingLabel(data.query.spots[i].rating_user);
      }

      //data.query.spots[i].Description = $.parseHTML(data.query.spots[i].Description);
      if(data.query.spots[i].CardinalDirection == "") {
        if(!spotsData.groupSpots['Other directions']) {
          spotsData.groupSpots['Other directions'] = [];
        }
        spotsData.groupSpots['Other directions'].push(data.query.spots[i]);
      }
      else {
        var CardinalDirection = data.query.spots[i].CardinalDirection.join(', ');
        if(!spotsData.groupSpots[CardinalDirection]) {
          spotsData.groupSpots[CardinalDirection] = [];
        }
        spotsData.groupSpots[CardinalDirection].push(data.query.spots[i]);
      }

    }

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
      marker.data.id = citySpots[i].id;
      marker.data.average = citySpots[i].rating_average;
      //Register marker
      spotsLayer.RegisterMarker(marker);
    }
    spotsLayer.ProcessView();
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

      // hide all the events
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

var commentLoaded = [];
var loadComments = function (id, reload) {
  if(typeof commentLoaded[id] === 'undefined' || reload) {
    $.get( apiRoot + "/api.php?action=hwgetcomments&format=json&pageid="+id, function(data) {
      if(data.query) {
        $("#spot-comments-"+id).show();
        //Update spot with new average
        for (var key in spotsData.groupSpots) {
          var spots = spotsData.groupSpots[key];
          for(var i = 0; i < spots.length && spots[i].id != id; i++) {}
          if(i < spots.length) {
            for(var j = 0; j < data.query.comments.length ; j++) {
              data.query.comments[j].timestamp_label = parseTimestamp(data.query.comments[j].timestamp);
            }
            ractive.set('spots.groupSpots.'+key+'.'+i+'.comments', data.query.comments);
            ractive.set('spots.groupSpots.'+key+'.'+i+'.new_comment', '');
            commentLoaded[id] = true;
            break;
          }
        }
      }
    });
  }
  else if (commentLoaded[id] == true){
    $("#spot-comments-"+id).hide();
    commentLoaded[id] = false;
  }
  else {
    $("#spot-comments-"+id).show();
    commentLoaded[id] = true;
  }
}

var toggleComments = function (id) {
  if (commentLoaded[id] == true){
    $("#spot-comments-"+id).hide();
    commentLoaded[id] = false;
  }
  else {
    $("#spot-comments-"+id).show();
    commentLoaded[id] = true;
  }
}

//add Comment
var addComment = function (id, newComment) {
  //Get token
  getToken(function(token) {
    if(token) {
      //Post new rating
      $.post(  apiRoot + "/api.php?action=hwaddcomment&format=json", {commenttext: newComment, pageid: id, token: token})
      .done(function( data ) {
        if(data) {
          loadComments(id, true);
        }
      });
    }
    else {
      mw.log('Not logged in ');
    }
  });
}

//delete Comment
var deleteComment = function (commentId, id) {
  //Get token
  getToken(function(token) {
    if(token) {
      //Post new rating
      $.post(  apiRoot + "/api.php?action=hwdeletecomment&format=json", {comment_id: commentId, token: token})
      .done(function( data ) {
        if(data) {
          loadComments(id, true);
        }
      });
    }
    else {
      mw.log('Not logged in ');
    }
  });
}

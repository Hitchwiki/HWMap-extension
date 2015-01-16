//Here are functions used for operations on spots

/*
 * Spot icon builder
 *
 * @return L.marker
 */
var iconSpot = function (averageRating) {
  if(averageRating == 5) {
    return icons.verygood;
  }
  else if(averageRating == 4) {
    return icons.good;
  }
  else if(averageRating == 3) {
    return icons.average;
  }
  else if(averageRating == 2) {
    return icons.bad;
  }
  else if(averageRating == 1) {
    return icons.senseless;
  }
  else {
    return icons.unknown;
  }
};

//Get the rating label according to the rating average
var getRatingLabel = function (rating) {
  var label;
  switch (rating) {
    case '1':
      label = "Senseless";
      break;
    case '2':
      label = "Bad";
      break;
    case '3':
      label = "Average";
      break;
    case '4':
      label = "Good";
      break;
    case '5':
      label = "Very good";
      break;
    default:
      label = "Unknown";
  }
  return label;
};

//Update spot marker with new rating
var updateSpotMarker = function(id, newRating) {
  for(var i = 0; i < spotsLayer.Cluster._markers.length; i++) {
    if(spotsLayer.Cluster._markers[i].data.id == id) {
      if(spotsLayer.Cluster._markers[i].data.average != newRating) {
        spotsLayer.Cluster._markers[i].data.icon = iconSpot(newRating);
        spotsLayer.Cluster._markers[i].data.average = newRating;
        spotsLayer.RedrawIcons();
        spotsLayer.ProcessView();
      }
      break;
    }
  }
}

//Function to get edit token
var getToken = function (callback) {
  if(userId) {
    $.get( apiRoot + "/api.php?action=query&meta=tokens&format=json", function( data ) {
      callback(data.query.tokens.csrftoken);
    });
  }
  else {
    callback(null);
  }
};

//Function to parse timestamp in a human readable format
var parseTimestamp = function (timestamp) {
    return timestamp.slice(6, 8)+'.'+timestamp.slice(4, 6)+'.'+timestamp.slice(0, 4);
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


//Delete rating
var addRatings = function(newRating, id) {
  //Get token
  getToken(function(token) {
    if(token) {
      //Post new rating
      $.post(  apiRoot + "/api.php?action=hwaddrating&format=json", { rating: newRating, pageid: id, token: token})
      .done(function( data ) {
        if(data.query.average) {
          //Update spot with new average
          for (var key in spotsData.groupSpots) {
            var spots = spotsData.groupSpots[key];
            for(var i = 0; i < spots.length && spots[i].id != id; i++) {}
            if(i < spots.length) {
              ractive.set('spots.groupSpots.'+key+'.'+i+'.timestamp_user', parseTimestamp(data.query.timestamp) );
              ractive.set('spots.groupSpots.'+key+'.'+i+'.rating_user', newRating);
              ractive.set('spots.groupSpots.'+key+'.'+i+'.rating_user_label', getRatingLabel(newRating.toString()));
              ractive.set('spots.groupSpots.'+key+'.'+i+'.rating_average', data.query.average );
              ractive.set('spots.groupSpots.'+key+'.'+i+'.rating_count', data.query.count );
              ractive.set('spots.groupSpots.'+key+'.'+i+'.average_label', getRatingLabel(data.query.average));
              updateSpotMarker(id, data.query.average);
              break;
            }
          }
        }
      });
    }
    else {
      mw.log('Not logged in ');
    }
  });
}

//Delete rating
var deleteRating = function(id) {
  //Get token
  getToken(function(token) {
    if(token) {
      //Post new rating
      $.post(  apiRoot + "/api.php?action=hwdeleterating&format=json", {pageid: id, token: token})
      .done(function( data ) {
        if(data.query) {
          //Update spot with new average
          for (var key in spotsData.groupSpots) {
            var spots = spotsData.groupSpots[key];
            for(var i = 0; i < spots.length && spots[i].id != id; i++) {}
            if(i < spots.length) {
              ractive.set('spots.groupSpots.'+key+'.'+i+'.timestamp_user', 0);
              ractive.set('spots.groupSpots.'+key+'.'+i+'.rating_user', 0);
              ractive.set('spots.groupSpots.'+key+'.'+i+'.rating_user_label', null);
              ractive.set('spots.groupSpots.'+key+'.'+i+'.rating_average', data.query.average.toString() );
              ractive.set('spots.groupSpots.'+key+'.'+i+'.rating_count', data.query.count );
              ractive.set('spots.groupSpots.'+key+'.'+i+'.average_label', getRatingLabel(data.query.average.toString()));
              updateSpotMarker(id, data.query.average.toString());
              break;
            }
          }
        }
      });
    }
    else {
      mw.log('Not logged in ');
    }
  });
}

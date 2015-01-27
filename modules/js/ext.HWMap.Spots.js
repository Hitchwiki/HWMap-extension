//Here are functions used for operations on spots

/*
 * Spot icon builder
 *
 * @return L.marker
 */
var iconSpot = function (rating) {
  if(rating >= 4.5) {
    return icons.verygood;
  }
  else if(rating >= 3.5) {
    return icons.good;
  }
  else if(rating >= 2.5 ) {
    return icons.average;
  }
  else if(rating >= 1.5) {
    return icons.bad;
  }
  else if(rating >= 1) {
    return icons.senseless;
  }
  else {
    return icons.unknown;
  }
};

//Get the rating label according to the rating average
var getRatingLabel = function (rating) {
  if(rating >= 4.5) {
    return "Very good";
  }
  else if(rating >= 3.5) {
    return "Good";
  }
  else if(rating >= 2.5 ) {
    return "Average";
  }
  else if(rating >= 1.5) {
    return "Bad";
  }
  else if(rating >= 1) {
    return "Senseless";
  }
  else {
    return "Unknown";
  }
};

var animateMarker = function(id) {
}

//Update spot marker with new rating
window.updateSpotMarker = function(id, newRating) {
  for(var i = 0; i < spotsLayer.Cluster._markers.length; i++) {
    if(spotsLayer.Cluster._markers[i].data.HWid == id) {
      if(spotsLayer.Cluster._markers[i].data.average != newRating) {
        spotsLayer.Cluster._markers[i].data.icon = iconSpot(newRating);
        spotsLayer.Cluster._markers[i].data.average = newRating;
        spotsLayer.RedrawIcons();
        spotsLayer.ProcessView();
      }
      break;
    }
  }
};

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

var slideSpeed = 300;
var slideShow = function (id, state) {
  var content = $(id);
  if(state == 'down') {
    content.css({'display': 'block'});
    var contentHeight = content.css({'height': 'auto'}).height();
    content.css({'height': ''});
    content.animate({
      height: contentHeight
    }, slideSpeed, function() {
      content.css({'height': 'auto'});
    });
  }
  else if(state == 'up') {
    content.animate({
      height: 0
    }, slideSpeed, function() {
      content.css({'display': 'none'});
    });
  }
}

var commentLoaded = [];
window.loadComments = function (id, reload, spotObjectPath) {
  if(typeof commentLoaded[id] === 'undefined' || reload) {
    $('#comment-spinner-'+id).css({'visibility': 'visible'});
    $.get( apiRoot + "/api.php?action=hwgetcomments&format=json&pageid="+id, function(data) {
      if(data.query) {
        //Update spot with new average
        for(var j = 0; j < data.query.comments.length ; j++) {
          data.query.comments[j].timestamp_label = parseTimestamp(data.query.comments[j].timestamp);
        }
        ractive.set(spotObjectPath+'.comments', data.query.comments);
        ractive.set(spotObjectPath+'.new_comment', '');
        commentLoaded[id] = true;
        if(!reload) {
          slideShow("#spot-comments-"+id, 'down');
        }
      }
      $('#comment-spinner-'+id).css({'visibility': 'hidden'});
    });
  }
  else if (commentLoaded[id] == true){
    slideShow("#spot-comments-"+id, 'up');
    commentLoaded[id] = false;
  }
  else {
    slideShow("#spot-comments-"+id, 'down');
    commentLoaded[id] = true;
  }
};

window.toggleComments = function (id) {
  if (commentLoaded[id] == true){
    slideShow("#spot-comments-"+id, 'up');
    commentLoaded[id] = false;
  }
  else {
    slideShow("#spot-comments-"+id, 'down');
    commentLoaded[id] = true;
  }
};

//Add Comment
window.addComment = function (id, spotObjectPath) {
  //Get token
  getToken(function(token) {
    if(token) {
      newComment = ractive.get(spotObjectPath+'.new_comment').replace(/\n/g, '<br />');
      //Post new rating
      $.post(  apiRoot + "/api.php?action=hwaddcomment&format=json", {commenttext: newComment, pageid: id, token: token})
      .done(function( data ) {
        if(data) {
          loadComments(id, true, spotObjectPath);
          ractive.set(spotObjectPath+'.comment_count', data.query.count );
        }
      });
    }
    else {
      mw.log('Not logged in ');
    }
  });
};

//Delete Comment
window.deleteComment = function (commentId, id, spotObjectPath) {
  //Get token
  getToken(function(token) {
    if(token) {
      if(window.confirm("Delete comment ?")){
        //Post new rating
        $.post(  apiRoot + "/api.php?action=hwdeletecomment&format=json", {comment_id: commentId, token: token})
        .done(function( data ) {
          if(data) {
            loadComments(id, true, spotObjectPath);
            ractive.set(spotObjectPath+'.comment_count', data.query.count );
          }
        });
      }
    }
    else {
      mw.log('Not logged in ');
    }
  });
};

var ratingsLoaded = [];
window.loadRatings = function (id, reload, spotObjectPath) {
  if(typeof ratingsLoaded[id] === 'undefined' || reload) {
    $.get( apiRoot + "/api.php?action=hwgetratings&format=json&pageid="+id, function(data) {
      if(data.query.ratings.length) {
        slideShow("#spot-ratings-"+id, 'down');
        //Update spot with new average
        for(var j = 0; j < data.query.ratings.length ; j++) {
          data.query.ratings[j].rating_label = getRatingLabel(data.query.ratings[j].rating);
          data.query.ratings[j].timestamp_label = parseTimestamp(data.query.ratings[j].timestamp);
        }
        ractive.set(spotObjectPath+'.ratings', data.query.ratings)
        ractive.set(spotObjectPath+'.ratings_distribution', data.query.distribution);
        for (var key in data.query.distribution) {
          $('#spot-ratings-'+id+' .bar-'+key).css({'width': data.query.distribution[key].percentage+'%'});
        }
        ratingsLoaded[id] = true;
      }
    });
  }
  else if (ratingsLoaded[id] == true){
    slideShow("#spot-ratings-"+id, 'up');
    ratingsLoaded[id] = false;
  }
  else {
    slideShow("#spot-ratings-"+id, 'down');
    ratingsLoaded[id] = true;
  }
};

//Add rating
window.addRatings = function(newRating, id, spotObjectPath) {
  //Get token
  getToken(function(token) {
    if(token) {
      //Post new rating
      $.post(  apiRoot + "/api.php?action=hwaddrating&format=json", { rating: newRating, pageid: id, token: token})
      .done(function( data ) {
        if(data.query.average) {
          //Update spot with new average
          ractive.set(spotObjectPath+'.timestamp_user', parseTimestamp(data.query.timestamp) );
          ractive.set(spotObjectPath+'.rating_user', newRating);
          ractive.set(spotObjectPath+'.rating_user_label', getRatingLabel(newRating));
          ractive.set(spotObjectPath+'.rating_average', data.query.average );
          ractive.set(spotObjectPath+'.rating_count', data.query.count );
          ractive.set(spotObjectPath+'.average_label', getRatingLabel(data.query.average));
          updateSpotMarker(id, data.query.average);
          if(typeof ratingsLoaded[id] !== 'undefined') {
            loadRatings(id, true, spotObjectPath);
          }
        }
      });
    }
    else {
      mw.log('Not logged in ');
    }
  });
};

//Delete rating
window.deleteRating = function(id, spotObjectPath) {
  //Get token
  getToken(function(token) {
    if(token) {
      //Post new rating
      $.post(  apiRoot + "/api.php?action=hwdeleterating&format=json", {pageid: id, token: token})
      .done(function( data ) {
        if(data.query) {
          //Update spot with new average
          ractive.set(spotObjectPath+'.timestamp_user', 0);
          ractive.set(spotObjectPath+'.rating_user', 0);
          ractive.set(spotObjectPath+'.rating_user_label', null);
          ractive.set(spotObjectPath+'.rating_average', data.query.average );
          ractive.set(spotObjectPath+'.rating_count', data.query.count );
          ractive.set(spotObjectPath+'.average_label', getRatingLabel(data.query.average));
          updateSpotMarker(id, data.query.average);
          if(typeof ratingsLoaded[id] !== 'undefined') {
            loadRatings(id, true, spotObjectPath);
          }
        }
      });
    }
    else {
      mw.log('Not logged in ');
    }
  });
};

window.showAddWaitingTime = function(id) {
  $("#add_waiting_time_"+id).show();
  $("#waiting_time_button_"+id).hide();
}
window.hideAddWaitingTime = function(id) {
  $("#add_waiting_time_"+id).hide();
  $("#waiting_time_button_"+id).show();
}

var waitingTimesLoaded = [];
window.loadWaintingTimes = function (id, reload, spotObjectPath) {
  if(typeof waitingTimesLoaded[id] === 'undefined' || reload) {
    $.get( apiRoot + "/api.php?action=hwgetwaitingtimes&format=json&pageid="+id, function(data) {
      if(data.query.waiting_times.length) {
        slideShow("#spot-waitingtimes-"+id, 'down');
        //Update spot with new average
        for(var j = 0; j < data.query.waiting_times.length ; j++) {
          data.query.waiting_times[j].timestamp_label = parseTimestamp(data.query.waiting_times[j].timestamp);
        }
        ractive.set(spotObjectPath+'.waiting_times', data.query.waiting_times)
        ractive.set(spotObjectPath+'.waiting_times_distribution', data.query.distribution);
        for (var i = 0; i < data.query.distribution.length; i++) {
          var barkey = i + 1;
          $('#spot-waitingtimes-'+id+' .bar-'+barkey).css({'width': data.query.distribution[i].percentage+'%'});
        }
        waitingTimesLoaded[id] = true;
      }
    });
  }
  else if (waitingTimesLoaded[id] == true){
    slideShow("#spot-waitingtimes-"+id, 'up');
    waitingTimesLoaded[id] = false;
  }
  else {
    slideShow("#spot-waitingtimes-"+id, 'down');
    waitingTimesLoaded[id] = true;
  }
};

//Add waiting time
window.addWaitingTime = function(newWaitingTime, id, spotObjectPath) {
  hideAddWaitingTime(id);
  //Get token
  getToken(function(token) {
    if(token) {
      //Post new rating
      $.post(  apiRoot + "/api.php?action=hwaddwaitingtime&format=json", {waiting_time: newWaitingTime, pageid: id, token: token})
      .done(function( data ) {
        if(data.query) {
          //Update spot with new average
          ractive.set(spotObjectPath+'.waiting_time_average', data.query.average );
          ractive.set(spotObjectPath+'.waiting_time_count', data.query.count );
          ractive.set(spotObjectPath+'.new_waiting_time', null);
          if(typeof ratingsLoaded[id] !== 'undefined') {
            loadWaintingTimes(id, true, spotObjectPath);
          }
        }
      });
    }
    else {
      mw.log('Not logged in ');
    }
  });
};

window.deleteWaitingTime = function(waiting_time_id, id, spotObjectPath) {
  //Get token
  getToken(function(token) {
    if(token) {
      if(window.confirm("Delete waiting time ?")){
        //Post new rating
        $.post(  apiRoot + "/api.php?action=hwdeletewaitingtime&format=json", {waiting_time_id: waiting_time_id, token: token})
        .done(function( data ) {
          if(data.query) {
            //Update spot with new average
            ractive.set(spotObjectPath+'.waiting_time_average', data.query.average );
            ractive.set(spotObjectPath+'.waiting_time_count', data.query.count );
            if(typeof ratingsLoaded[id] !== 'undefined') {
              loadWaintingTimes(id, true, spotObjectPath);
            }
          }
        });
      }
    }
    else {
      mw.log('Not logged in ');
    }
  });
};

window.loadSpotDetails = function (id, reload, spotObjectPath) {
  console.log(spotObjectPath);
  loadWaintingTimes(id, reload, spotObjectPath);
  loadRatings(id, reload, spotObjectPath);
};

window.moveToSpot = function (spotObjectPath, id) {
  hwmap.setView([
    ractive.get(spotObjectPath+'.Location.0.lat'),
    ractive.get(spotObjectPath+'.Location.0.lon')
  ], 15);
  animateSpot(id);
};

var animateSpot = function (id) {
  animatedSpot = false;
  $(".hw-highlight-spot").removeClass("hw-highlight-spot");
  $("#marker-"+id).addClass("hw-highlight-spot");
  animatedSpot = id;
}


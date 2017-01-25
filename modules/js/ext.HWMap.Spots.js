/**
 * Functions used for operations on spots
 */

(function(mw, $, L, Ractive) {
  mw.log('mw.HWMaps::Spots');

  /**
   * @class mw.HWMaps.Spots
   *
   * @constructor
   */
  function Spots() {
    mw.log('HWMaps::Spots::constructor');
  }

  /**
   * Leaflet-icon builder for spot markers
   *
   * @param {number} rating
   * @return L.marker
   */
  Spots.getSpotIcon = function(rating) {
    mw.log('HWMaps::Spots::getSpotIcon');

    // Validate rating
    rating = Number(rating || 0);

    if (rating >= 4.5) {
      return mw.HWMaps.icons.verygood;
    }
    else if (rating >= 3.5) {
      return mw.HWMaps.icons.good;
    }
    else if (rating >= 2.5 ) {
      return mw.HWMaps.icons.average;
    }
    else if (rating >= 1.5) {
      return mw.HWMaps.icons.bad;
    }
    else if (rating >= 1) {
      return mw.HWMaps.icons.senseless;
    }

    return mw.HWMaps.icons.unknown;
  };

  /**
   * Clear markers from the map
   */
  Spots.clearMarkers = function(category) {
    mw.log('HWMaps::Spots::clearMarkers');
    if (!category || category === 'Spots') {
      mw.HWMaps.leafletLayers.spots.RemoveMarkers();
    }
    if (!category || category === 'Cities') {
      mw.HWMaps.leafletLayers.cities.RemoveMarkers();
    }
  };

  /**
   * Populate map with city or spot markers
   * @param {string} category, `Cities` or `Spots`
   */
  Spots.getMarkers = function(category, zoom) {
    mw.log('HWMaps::Spots::getMarkers');

    // Validate category && zoom
    category = String(category || '');
    zoom = parseInt(zoom, 10) || 0; // `parseInt` could return `NaN`

    // Get current bounding box from the map
    bounds = mw.HWMaps.leafletMap.getBounds();

    // Check if current bouding box is different
    // than previously saved bounding box
    if (bounds._northEast.lat > mw.HWMaps.lastBounds.NElat ||
       bounds._northEast.lng > mw.HWMaps.lastBounds.NElng ||
       bounds._southWest.lat < mw.HWMaps.lastBounds.SWlat ||
       bounds._southWest.lng < mw.HWMaps.lastBounds.SWlng ||
       zoom !== mw.HWMaps.lastZoom) {
      mw.log('HWMaps::Spots::getMarkers: Out of cached bounds, get fresh markers!');

      // mw.HWMaps.Map.clearMarkers();

      // Extends cached bounds so that we'll allow little bit of movement
      // without fetching new set of spots
      mw.HWMaps.lastBounds = {
        NElat: bounds._northEast.lat + 1,
        NElng: bounds._northEast.lng + 1,
        SWlat: bounds._southWest.lat - 1,
        SWlng: bounds._southWest.lng - 1
      };
    } else {
      mw.log('HWMaps::Spots::getMarkers: Inside previously cached bounds.');
      return;
    }

    // Build the API URL
    var queryUri = new mw.Uri(mw.util.wikiScript('api'));
    queryUri.extend({
      action: 'hwmapapi',
      category: category,
      SWlat: mw.HWMaps.lastBounds.SWlat,
      SWlon: mw.HWMaps.lastBounds.SWlng,
      NElat: mw.HWMaps.lastBounds.NElat,
      NElon: mw.HWMaps.lastBounds.NElng,
      format: 'json'
    });

    mw.log('HWMaps::Spots::getMarkers: API Query:');
    mw.log(queryUri.toString());

    // Query API
    $.get(queryUri.toString(), function(data) {

      mw.log('HWMaps::Spots::getMarkers: API response:');
      mw.log(data);

      // API returned error
      if (data.error) {
        // Bubble notification
        // `mw.message` gets message translation, see `i18n/en.json`
        // `tag` replaces any previous bubbles by same tag
        // https://www.mediawiki.org/wiki/ResourceLoader/Modules#mediawiki.notify
        mw.notify(
          mw.message('hwmap-error-loading-markers').text() + ' ' + mw.message('hwmap-please-reload').text(),
          { tag: 'hwmap-error' }
        );
        // Console log
        mw.log.error('HWMaps::Spots::initialize error getting data from the API #348fhj');
        mw.log.error(data.error);
        return;
      }

      // Clear out possibly previous markers from the map
      mw.HWMaps.Map.clearMarkers(category);

      // No data from the API
      if (!data.query) {
        mw.log('HWMaps::Spots::initialize API did not return any points. #g31128');
        return;
      }

      // Add the new markers
      var spots = data.query.spots;
      for (var i = -1, len = spots.length; ++i < len;) {

        // Build a marker
        var marker = new PruneCluster.Marker(
          spots[i].location[0],
          spots[i].location[1]
        );

        // Attach article ID to marker
        marker.data.HWid = spots[i].id;

        if (spots[i].category === 'Spots') {
          // Add icon
          marker.data.icon = Spots.getSpotIcon(spots[i].average_rating);
          marker.data.HWtype = 'spot';

          // Register marker
          mw.HWMaps.leafletLayers.spots.RegisterMarker(marker);
        }
        else if (spots[i].category === 'Cities') {
          // Add icon
          marker.data.icon = mw.HWMaps.icons.city;
          marker.data.title = spots[i].title;
          marker.data.HWtype = 'city';

          // Register marker
          mw.HWMaps.leafletLayers.cities.RegisterMarker(marker);
        }
      }

      // Change cluster area size depending on the zoom level
      // Higher number means more markers "merged".
      // https://github.com/SINTEF-9012/PruneCluster#set-the-clustering-size
      if (zoom !== mw.HWMaps.lastZoom) {
        mw.HWMaps.lastZoom = zoom;
        if (zoom < 8) {
          mw.HWMaps.leafletLayers.spots.Cluster.Size = 120;
        }
        else if (zoom < 11) {
          mw.HWMaps.leafletLayers.spots.Cluster.Size = 80;
        }
        else {
          mw.HWMaps.leafletLayers.spots.Cluster.Size = 10;
        }
      }

      // Ensure PruneCluster notices new markers
      if (!category || category === 'Spots') {
        mw.HWMaps.leafletLayers.spots.ProcessView();
      }
      if (!category || category === 'Cities') {
        mw.HWMaps.leafletLayers.cities.ProcessView();
      }

      // Tooltips for city markers
      // `jQuery.tipsy` got deprecated in MW 1.28 and should
      // thus be replaced with something else, e.g. OOjs UI:
      // https://www.mediawiki.org/wiki/OOjs_UI
      if ($.fn.tipsy) {
        $('.tipsy').remove();
        $('.hw-city-icon').tipsy({
          title: function() {
            var orginalTitle = this.getAttribute('original-title');
            return orginalTitle ? mw.message('hwmap-open-cityname', orginalTitle.replace(/_/g, ' ')).text() : mw.message('hwmap-open-city').text();
          },
          gravity: $.fn.tipsy.autoNS || false
        });
      } else {
        mw.log.warn('HWMaps::Spots: No jQuery Tipsy available. #fj93jh');
      }

    });

  };

  /**
   * Get string presentation of a numeric hitchability rating
   * @param {int} rating 0-5
   * @return {string}
   */
  Spots.getRatingLabel = function(rating) {
    mw.log('HWMaps::Spots::getRatingLabel');

    // Validate rating
    rating = Number(rating || 0);

    // See https://www.mediawiki.org/wiki/Manual:Messages_API
    // for details how to use `mw.message()`
    if (rating >= 4.5) {
      return mw.message('hwmap-hitchability-very-good').text();
    }

    if (rating >= 3.5) {
      return mw.message('hwmap-hitchability-good').text();
    }

    if (rating >= 2.5 ) {
      return mw.message('hwmap-hitchability-average').text();
    }

    if (rating >= 1.5) {
      return mw.message('hwmap-hitchability-bad').text();
    }

    if (rating >= 1) {
      return mw.message('hwmap-hitchability-senseless').text();
    }

    return mw.message('hwmap-hitchability-unknown').text();
  };

  /**
   * parse timestamp into a human readable format
   * @todo Use Moment.js here instead, it ships with MediaWiki.
   * @param {string} timestamp
   * @return {string}
   */
  Spots.parseTimestamp = function(timestamp) {
    mw.log('HWMaps::Spots::parseTimestamp: ' + timestamp);
    return timestamp ? timestamp.slice(6, 8) + '.' + timestamp.slice(4, 6) + '.' + timestamp.slice(0, 4) : '';
  };

  /**
   * Open Google Street View at coordinates
   *
   * @param {Float} lat
   * @param {Float} lng
   */
  Spots.openStreetView = function(lat, lng) {
    mw.log('HWMaps::Spots::openStreetView: ' + parseFloat(lat) + ', ' + parseFloat(lng));
    window.location = 'https://maps.google.com/maps?q=&layer=c&cbll=' + parseFloat(lat) + ',' + parseFloat(lng);
  };

  // Export
  mw.HWMaps.Spots = Spots;

}(mediaWiki, jQuery, L, Ractive));



/*


// Get the rating label according to the rating average


var animateMarker = function(id) {
}

// Update spot marker with new rating
window.updateSpotMarker = function(id, newRating) {
  for (var i = 0; i < spotsLayer.Cluster._markers.length; i++) {
    if (spotsLayer.Cluster._markers[i].data.HWid === id) {
      if (spotsLayer.Cluster._markers[i].data.average !== newRating) {
        spotsLayer.Cluster._markers[i].data.icon = iconSpot(newRating);
        spotsLayer.Cluster._markers[i].data.average = newRating;
        spotsLayer.RedrawIcons();
        spotsLayer.ProcessView();
      }
      break;
    }
  }
};

var slideSpeed = 300;
var slideShow = function(id, state) {
  var content = $(id);
  if (state == 'down') {
    content.css({ 'display': 'block' });
    var contentHeight = content.css({ 'height': 'auto' }).height();
    content.css({ 'height': '' });
    content.animate({
      height: contentHeight
    }, slideSpeed, function() {
      content.css({ 'height': 'auto' });
    });
  }
  else if (state == 'up') {
    content.animate({
      height: 0
    }, slideSpeed, function() {
      content.css({ 'display': 'none' });
    });
  }
}

var commentLoaded = [];
window.loadComments = function(id, reload, spotObjectPath, specialPageLoad) {
  if (typeof commentLoaded[id] === 'undefined' || reload || specialPageLoad) {
    $('#hw-comment-spinner-' + id).css({ 'visibility': 'visible' });
    $.get( mw.util.wikiScript('api') + '?action=hwgetcomments&format=json&pageid=' + id, function(data) {
      if (data.query) {
        //Update spot with new average
        for(var j = 0; j < data.query.comments.length ; j++) {
          data.query.comments[j].timestamp_label = Spots.parseTimestamp(data.query.comments[j].timestamp);
        }
        ractive.set(spotObjectPath + '.comments', data.query.comments);
        ractive.set(spotObjectPath + '.new_comment', '');
        commentLoaded[id] = true;
        if (!reload) {
          slideShow('#hw-spot-comments-' + id, 'down');
        }
      }
      mw.log('show comments')
      $('#hw-comment-spinner-' + id).css({ 'visibility': 'hidden' });
    });
  }
  else if (commentLoaded[id] == true) {
    slideShow('#hw-spot-comments-' + id, 'up');
    commentLoaded[id] = false;
  }
  else {
    slideShow('#hw-spot-comments-' + id, 'down');
    commentLoaded[id] = true;
  }
};

window.toggleComments = function(id) {
  if (commentLoaded[id] == true) {
    slideShow('#hw-spot-comments-' + id, 'up');
    commentLoaded[id] = false;
  }
  else {
    slideShow('#hw-spot-comments-' + id, 'down');
    commentLoaded[id] = true;
  }
};

//Add Comment
window.addComment = function(id, spotObjectPath) {
  //Get token
  mw.HWMaps.Map.getToken(function(token) {
    if (token) {
      newComment = ractive.get(spotObjectPath + '.hw-new_comment').replace(/\n/g, '<br />');
      //Post new rating
      $.post( mw.util.wikiScript('api') + '?action=hwaddcomment&format=json', {
        commenttext: newComment,
        pageid: id,
        token: token
      })
      .done(function( data ) {
        if (data) {
          loadComments(id, true, spotObjectPath);
          ractive.set(spotObjectPath + '.comment_count', data.query.count );
        }
      });
    }
    else {
      mw.log('Not logged in ');
    }
  });
};

// Delete Comment
window.deleteComment = function(commentId, id, spotObjectPath) {
  // Get token
  mw.HWMaps.Map.getToken(function(token) {
    if (!token) {
      mw.log.error('Not logged in, cannot delete comment. #2gj39F');
      return;
    }
    if (window.confirm('Are you sure you want to delete this comment?')) {
      // Post new rating
      $.post( mw.util.wikiScript('api') + '?action=hwdeletecomment&format=json', {comment_id: commentId, token: token})
      .done(function( data ) {
        if (data) {
          loadComments(id, true, spotObjectPath);
          ractive.set(spotObjectPath + '.comment_count', data.query.count );
        }
      });
    } else {
      mw.log('User cancelled deleting the comment. #gdsgj9');
    }
  });
};



*/

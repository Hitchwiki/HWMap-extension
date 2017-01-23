/**
 * Functions used for operations on spot ratings
 */

(function(mw, $) {
  mw.log('mw.HWMaps::Ratings');

  /**
   * @class mw.HWMaps.Ratings
   *
   * @constructor
   */
  function Ratings() {
    mw.log('HWMaps::Ratings::constructor');
  }

  /**
   * Add rating
   *
   * @static
   * @return instance of jQuery.Promise
   */
  Ratings.addRating = function(newRating, id) {

    // https://api.jquery.com/deferred.promise/
    var dfd = $.Deferred();

    // Get Mediawiki token
    mw.HWMaps.Map.getToken(function(token) {
      if (!token) {
        mw.log.error('HWMaps::Ratings::addRating: Not logged in, cannot add rating. #jgg8FF');
        return;
      }
      // Post new rating
      $.post( mw.util.wikiScript('api') + '?action=hwaddrating&format=json', {
        rating: newRating,
        pageid: id,
        token: token
      }).done(function(data) {
        if (data.error) {
          mw.log.error('mw.HWMaps.Ratings::addRating: Error while accessing rating API. #399ggd');
          // Bubble notification
          // `mw.message` gets message translation, see `i18n/en.json`
          // `tag` replaces any previous bubbles by same tag
          // https://www.mediawiki.org/wiki/ResourceLoader/Modules#mediawiki.notify
          mw.notify(
            mw.message('hwmap-error-rating-add') + ' ' +
              mw.message('hwmap-please-try-again'),
            { tag: 'hwmap-error' }
          );
          return dfd.reject();
        }

        dfd.resolve(data);
      });
    });

    // Return the Promise so caller can't change the Deferred
    // https://api.jquery.com/deferred.promise/
    return dfd.promise();
  };

  /**
   * Init rating widgets on current page
   */
  Ratings.initRatingWidgets = function() {
    mw.log('HWMaps::Ratings::initRatingWidgets');

    $('.hw-your-rate').hide();

    $('.hw-rating-widget .hw-rate').click(function(e) {
      e.preventDefault();
      $('.hw-your-rate').hide();
      //$('.hw-rate').show();
      //$(this).hide();
      var id = $(this).attr('id').replace(/hw-rate_/, '');

      $('#hw-your_rate_' + id).show();
    });

    $(document).mouseup(function(e) {
      var container = $('.hw-rating-widget .hw-rate');

      if (!container.is(e.target) // if the target of the click isn't the container...
          && container.has(e.target).length === 0) // ... nor a descendant of the container
      {
        $('.hw-your-rate').hide();
        //$('.hw-rate').show();
      }
    });
  };

  // Export
  mw.HWMaps.Ratings = Ratings;

}(mediaWiki, jQuery));


/*

var ratingsLoaded = [];
window.loadRatings = function(id, reload, spotObjectPath) {
  if (typeof ratingsLoaded[id] === 'undefined' || reload) {
    $.get( mw.util.wikiScript('api') + '?action=hwgetratings&format=json&pageid=' + id, function(data) {
      if (data.query.ratings.length) {
        // Update spot with new average
        for(var j = 0; j < data.query.ratings.length ; j++) {
          data.query.ratings[j].rating_label = Spots.getRatingLabel(data.query.ratings[j].rating);
          data.query.ratings[j].timestamp_label = Spots.parseTimestamp(data.query.ratings[j].timestamp);
        }
        ractive.set(spotObjectPath + '.ratings', data.query.ratings)
        ractive.set(spotObjectPath + '.ratings_distribution', data.query.distribution);
        for (var key in data.query.distribution) {
          $('#hw-spot-ratings-' + id+' .bar-'+key).css({ 'width': data.query.distribution[key].percentage+'%' });
        }
        if (!reload) {
          slideShow('#hw-spot-ratings-' + id, 'down');
        }
        ratingsLoaded[id] = true;
      }
      else {
        ractive.set(spotObjectPath + '.ratings', null);
      }
    });
  }
  else if (ratingsLoaded[id] == true) {
    slideShow('#hw-spot-ratings-' + id, 'up');
    ratingsLoaded[id] = false;
  }
  else {
    slideShow('#hw-spot-ratings-' + id, 'down');
    ratingsLoaded[id] = true;
  }
};

// Delete rating
window.deleteRating = function(id, spotObjectPath) {
  // Get token
  mw.HWMaps.Map.getToken(function(token) {
    if (!token) {
      mw.log.error('Not logged in, cannot delete rating. #i30Fff');
      return;
    }
    $.post( mw.util.wikiScript('api') + '?action=hwdeleterating&format=json', { pageid: id, token: token })
    .done(function( data ) {
      if (data.query) {
        // Update spot with new statistics
        ractive.set(spotObjectPath + '.timestamp_user', 0);
        ractive.set(spotObjectPath + '.rating_user', 0);
        ractive.set(spotObjectPath + '.rating_user_label', null);
        ractive.set(spotObjectPath + '.rating_average', data.query.average );
        ractive.set(spotObjectPath + '.rating_count', data.query.count );
        ractive.set(spotObjectPath + '.average_label', Spots.getRatingLabel(data.query.average));
        updateSpotMarker(id, data.query.average);
        if (typeof ratingsLoaded[id] !== 'undefined') {
          loadRatings(id, true, spotObjectPath);
        }
      }
    });

  });
};
*/

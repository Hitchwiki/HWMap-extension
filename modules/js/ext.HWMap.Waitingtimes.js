/**
 * Functions used for operations on spot Waitingtimes
 */

(function(mw, $) {
  mw.log('mw.HWMaps::Waitingtimes');

  var waitingTimesLoaded = [];

  /**
   * @class mw.HWMaps.Waitingtimes
   *
   * @constructor
   */
  function Waitingtimes() {
    mw.log('HWMaps::Waitingtimes::constructor');
  }

  /**
   * Load waiting times trough API
   * @return instance of jQuery.Promise
   */
  Waitingtimes.loadWaitingTimes = function(pageId, reload) {
    mw.log('HWMaps::Waitingtimes::loadWaitingTimes: ' + pageId);

    // https://api.jquery.com/deferred.promise/
    var dfd = $.Deferred();

    if (typeof waitingTimesLoaded[pageId] === 'undefined' || reload) {

      $.getJSON(mw.util.wikiScript('api'), {
        action: 'hwgetwaitingtimes',
        format: 'json',
        pageid: pageId
      }).done( function(data) {
        if (data.error) {
          mw.log.error('mw.HWMaps.Waitingtimes.loadWaitingTimes: Error while accessing API. #39g883');
          mw.log.error(data.error);
          // Bubble notification
          // `mw.message` gets message translation, see `i18n/en.json`
          // `tag` replaces any previous bubbles by same tag
          // https://www.mediawiki.org/wiki/ResourceLoader/Modules#mediawiki.notify
          mw.notify(
            mw.message('hwmap-error-waitingtimes-load').text() + ' ' +
              mw.message('hwmap-please-try-again').text(),
            { tag: 'hwmap-error' }
          );
          return dfd.reject();
        }

        if (!data.query || data.query.waiting_times || !data.query.waiting_times.length) {
          mw.log.error('mw.HWMaps.Waitingtimes.loadWaitingTimes: did not receive any data trough API. #30ghh3');
          return dfd.reject();
        }

        if (!reload) {
          mw.HWMaps.City.animateElementToggle('#hw-spot-waitingtimes-' + pageId, 'down');
        }

        // Update spot with new average
        for(var j = 0; j < data.query.waiting_times.length ; j++) {
          data.query.waiting_times[j].timestamp_label = Spots.parseTimestamp(data.query.waiting_times[j].timestamp);
        }

        for (var i = 0; i < data.query.distribution.length; i++) {
          var barKey = i + 1;
          $('#hw-spot-waitingtimes-' + pageId + ' .hw-bar-' + barKey).css({
            'width': data.query.distribution[i].percentage + '%'
          });
        }

        waitingTimesLoaded[pageId] = true;
        dfd.resolve(data.query);
      })
      // https://api.jquery.com/deferred.fail/
      .fail(function() {
        mw.log.error('mw.HWMaps.Waitingtimes.loadWaitingTimes: Error while accessing API. #9857jf');
        // Bubble notification
        // `mw.message` gets message translation, see `i18n/en.json`
        // `tag` replaces any previous bubbles by same tag
        // https://www.mediawiki.org/wiki/ResourceLoader/Modules#mediawiki.notify
        mw.notify(
          mw.message('hwmap-error-waitingtimes-load').text() + ' ' +
            mw.message('hwmap-please-try-again').text(),
          { tag: 'hwmap-error' }
        );
        dfd.reject();
      });

    } else if (waitingTimesLoaded[pageId] === true) {
      mw.HWMaps.City.animateElementToggle('#hw-spot-waitingtimes-' + pageId, 'up');
      waitingTimesLoaded[pageId] = false;
      dfd.resolve();
    } else {
      mw.HWMaps.City.animateElementToggle('#hw-spot-waitingtimes-' + pageId, 'down');
      waitingTimesLoaded[pageId] = true;
      dfd.resolve();
    }

    // Return the Promise so caller can't change the Deferred
    // https://api.jquery.com/deferred.promise/
    return dfd.promise();
  };

  /**
   * Delete waiting time
   * @return instance of jQuery.Promise
   */
  Waitingtimes.deleteWaitingTime = function(waitingTimeId, pageId) {
    mw.log('HWMaps::Waitingtimes::deleteWaitingTime: ' + pageId);

    // https://api.jquery.com/deferred.promise/
    var dfd = $.Deferred();

    // Get token
    mw.HWMaps.Map.getToken(function(token) {
      if (!token) {
        mw.log.error('mw.HWMaps.Waitingtimes.deleteWaitingTime: no token. #fj12hb');
        return dfd.reject();
      }

      // Get a string for "Confirm removing waiting time?"
      var confirmMessage = mw.message('hwmap-confirm-removing-waitingtime').text();

      // Ask user for confirmation if to really delete waiting time
      if (window.confirm(confirmMessage)) {
        // Post new waiting time
        $.post(mw.util.wikiScript('api') + '?action=hwdeletewaitingtime&format=json', {
          waiting_time_id: waitingTimeId,
          token: token
        })
        .done(function(data) {

          if (data.error) {
            mw.log.error('mw.HWMaps.Waitingtimes.deleteWaitingTime: error via API when removing waiting time. #ugyfeg');
            mw.log.error(data.error);
            // Bubble notification
            // `mw.message` gets message translation, see `i18n/en.json`
            // `tag` replaces any previous bubbles by same tag
            // https://www.mediawiki.org/wiki/ResourceLoader/Modules#mediawiki.notify
            mw.notify(
              mw.message('hwmap-error-waitingtimes-remove').text() + ' ' +
                mw.message('hwmap-please-try-again').text(),
              { tag: 'hwmap-error' }
            );
            return dfd.reject();
          }

          if (typeof waitingTimesLoaded[pageId] !== 'undefined') {
            Waitingtimes.loadWaitingTimes(pageId, true);
          }

          if (data.query) {
            return dfd.resolve(data.query);
          }

          dfd.resolve();
        })
        .fail(function() {
          mw.log.error('mw.HWMaps.Waitingtimes.deleteWaitingTime: error via API when removing waiting time. #g38hhe');
          // Bubble notification
          // `mw.message` gets message translation, see `i18n/en.json`
          // `tag` replaces any previous bubbles by same tag
          // https://www.mediawiki.org/wiki/ResourceLoader/Modules#mediawiki.notify
          mw.notify(
            mw.message('hwmap-error-waitingtimes-remove').text() + ' ' +
              mw.message('hwmap-please-try-again').text(),
            { tag: 'hwmap-error' }
          );
          dfd.reject();
        });
      }
    });

    // Return the Promise so caller can't change the Deferred
    // https://api.jquery.com/deferred.promise/
    return dfd.promise();
  };

  /**
   * Add waiting time
   * @return instance of jQuery.Promise
   */
  Waitingtimes.addWaitingTime = function(newWaitingTime, pageId) {
    mw.log('HWMaps::Waitingtimes::addWaitingTime: ' + pageId);

    // https://api.jquery.com/deferred.promise/
    var dfd = $.Deferred();

    // Get token
    mw.HWMaps.Map.getToken(function(token) {
      if (!token) {
        mw.log.error('mw.HWMaps.Waitingtimes.addWaitingTime: no token (not logged in), cannot add waiting time. #fj39fh');
        return dfd.reject();
      }

      // Post new waiting time
      $.post( mw.util.wikiScript('api') + '?action=hwaddwaitingtime&format=json', {
        waiting_time: newWaitingTime,
        pageid: pageId,
        token: token
      })
      .done(function(data) {

        if (!data.query) {
          mw.log.error('mw.HWMaps.Waitingtimes.addWaitingTime: did not receive any data trough API. #uudfgw');
          return dfd.reject();
        }

        if (data.error) {
          mw.log.error('mw.HWMaps.Waitingtimes.addWaitingTime: error via API when adding waiting time. #yetqtq');
          mw.log.error(data.error);
          // Bubble notification
          // `mw.message` gets message translation, see `i18n/en.json`
          // `tag` replaces any previous bubbles by same tag
          // https://www.mediawiki.org/wiki/ResourceLoader/Modules#mediawiki.notify
          mw.notify(
            mw.message('hwmap-error-waitingtimes-add').text() + ' ' +
              mw.message('hwmap-please-try-again').text(),
            { tag: 'hwmap-error' }
          );
          return dfd.reject();
        }

        // Resolve
        dfd.resolve(data.query);
        /*
        if (typeof ratingsLoaded[id] !== 'undefined') {
          loadWaintingTimes(id, true, spotObjectPath);
        }
        */
      });

    });

    // Return the Promise so caller can't change the Deferred
    // https://api.jquery.com/deferred.promise/
    return dfd.promise();
  };

  // Export
  mw.HWMaps.Waitingtimes = Waitingtimes;

}(mediaWiki, jQuery));


/*


// Add waiting time
window.addWaitingTime = function(newWaitingTime, id, spotObjectPath) {
  hideAddWaitingTime(id);
};

*/

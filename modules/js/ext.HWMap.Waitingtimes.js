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
   *
   */
  Waitingtimes.loadWaitingTimes = function(id, reload, spotObjectPath) {
    if (typeof waitingTimesLoaded[id] === 'undefined' || reload) {
      $.get( mw.util.wikiScript('api') + '?action=hwgetwaitingtimes&format=json&pageid=' + id, function(data) {
        if (data.query.waiting_times.length) {
          if (!reload) {
            slideShow('#hw-spot-waitingtimes-' + id, 'down');
          }
          //Update spot with new average
          for(var j = 0; j < data.query.waiting_times.length ; j++) {
            data.query.waiting_times[j].timestamp_label = Spots.parseTimestamp(data.query.waiting_times[j].timestamp);
          }
          ractive.set(spotObjectPath + '.waiting_times', data.query.waiting_times)
          ractive.set(spotObjectPath + '.waiting_times_distribution', data.query.distribution);
          for (var i = 0; i < data.query.distribution.length; i++) {
            var barkey = i + 1;
            $('#hw-spot-waitingtimes-' + id+' .bar-'+barkey).css({'width': data.query.distribution[i].percentage+'%'});
          }
          waitingTimesLoaded[id] = true;
        }
      });
    }
    else if (waitingTimesLoaded[id] == true) {
      slideShow('#hw-spot-waitingtimes-' + id, 'up');
      waitingTimesLoaded[id] = false;
    }
    else {
      slideShow('#hw-spot-waitingtimes-' + id, 'down');
      waitingTimesLoaded[id] = true;
    }
  };

  // Export
  mw.HWMaps.Waitingtimes = Waitingtimes;

}(mediaWiki, jQuery));


/*


// Add waiting time
window.addWaitingTime = function(newWaitingTime, id, spotObjectPath) {
  hideAddWaitingTime(id);
  // Get token
  mw.HWMaps.Map.getToken(function(token) {
    if (!token) {
      mw.log.error('Not logged in, cannot add waiting time. #fj39fh');
      return;
    }

    //Post new rating
    $.post( mw.util.wikiScript('api') + '?action=hwaddwaitingtime&format=json', {
      waiting_time: newWaitingTime,
      pageid: id,
      token: token
    })
    .done(function( data ) {
      if (data.query) {
        //Update spot with new average
        ractive.set(spotObjectPath + '.waiting_time_average', data.query.average );
        ractive.set(spotObjectPath + '.waiting_time_count', data.query.count );
        ractive.set(spotObjectPath + '.new_waiting_time', null);
        if (typeof ratingsLoaded[id] !== 'undefined') {
          loadWaintingTimes(id, true, spotObjectPath);
        }
      }
    });

  });
};

window.deleteWaitingTime = function(waiting_time_id, id, spotObjectPath) {
  // Get token
  mw.HWMaps.Map.getToken(function(token) {
    if (token) {
      if (window.confirm('Delete waiting time ?')) {
        //Post new rating
        $.post( mw.util.wikiScript('api') + '?action=hwdeletewaitingtime&format=json', {
          waiting_time_id: waiting_time_id,
          token: token
        })
        .done(function( data ) {
          if (data.query) {
            //Update spot with new average
            ractive.set(spotObjectPath + '.waiting_time_average', data.query.average );
            ractive.set(spotObjectPath + '.waiting_time_count', data.query.count );
            if (typeof ratingsLoaded[id] !== 'undefined') {
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

*/

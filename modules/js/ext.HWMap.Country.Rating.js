var countryRating = {};

var initCountryRatingsTemplate = function initCountryRatingsTemplate() {
  $.get( extensionRoot +'modules/templates/ext.HWMap.Country.Rating.Widget.html' ).then( function ( template ) {
    ractive = new Ractive({
      el: 'hw-country-rating',
      template: template,
      data: {
        userId: userId
      }
    });

    $.get( apiRoot + '/api.php?action=hwavgrating&format=json&pageid=' + mw.util.rawurlencode(mw.config.get('wgArticleId')) + '&user_id=' + userId, function( data ) {
      if(data.query.ratings[0]) {
        data.query.ratings[0].average_label = getRatingLabel(data.query.ratings[0].rating_average);
        if(data.query.ratings[0].timestamp_user) {
          data.query.ratings[0].timestamp_user = parseTimestamp(data.query.ratings[0].timestamp_user);
          data.query.ratings[0].rating_user_label = getRatingLabel(data.query.ratings[0].rating_user);
        }
      }
      else {
        data.query.ratings[0] = {'average_label': 'Unknown'};
      }
      data.query.ratings[0].id = mw.config.get('wgArticleId');

      ractive.set({countryRating: data.query.ratings[0]});

      $('.your-rate').hide();

      $('.rating-widget .rate').click(function(evt) {
        $('.your-rate').hide();
        $('.rate').show();
        evt.preventDefault();
        $(this).hide();
        var id = $(this).attr('id').replace(/rate_/, '');

        $('#your_rate_' + id).show();
      });

      $(document).mouseup(function (e) {
        var container = $('.rating-widget .rate');

        if (!container.is(e.target) // if the target of the click isn't the container...
            && container.has(e.target).length === 0) // ... nor a descendant of the container
        {
          $('.your-rate').hide();
          $('.rate').show();
        }
      });

    });

  });
};

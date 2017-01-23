/**
 * Country ratings
 */

(function(mw, $) {
  mw.log('mw.HWMaps::CountryRating');

  /**
   * @class mw.HWMaps.CountryRating
   *
   * @constructor
   */
  function CountryRating() {
    mw.log('mw.HWMaps::CountryRating::constructor');
  }

  CountryRating.initialize = function() {
    mw.log('HWMaps::CountryRating::initialize');

    // When in debug mode, cache bust templates
    var cacheBust = mw.config.get('debug') ? new Date().getTime() : mw.config.get('wgVersion');

    var templateUrl = mw.config.get('wgExtensionAssetsPath') + '/HWMap/modules/templates/ext.HWMap.Country.Rating.Widget.html?v=' + cacheBust;

    $.get(templateUrl).then(function(template) {
      ractiveCountryRating = new Ractive({
        el: 'hw-country-rating',
        template: template,
        data: {
          userId: mw.config.get('wgUserId') || false
        }
      });

      // Get average rating for the current article
      $.getJSON(mw.util.wikiScript('api'), {
        action: 'hwavgrating',
        format: 'json',
        pageid: mw.config.get('wgArticleId')
        // user_id: userId
      }).done( function(data) {

        // @TODO: Check for `data.error`

        if (data.query.ratings[0]) {
          data.query.ratings[0].average_label = mw.HWMaps.Spots.getRatingLabel(data.query.ratings[0].rating_average);
          if (data.query.ratings[0].timestamp_user) {
            data.query.ratings[0].timestamp_user = mw.HWMaps.Spots.parseTimestamp(data.query.ratings[0].timestamp_user);
            data.query.ratings[0].rating_user_label = mw.HWMaps.Spots.getRatingLabel(data.query.ratings[0].rating_user);
          }
        } else {
          data.query.ratings[0] = { 'average_label': 'Unknown' };
        }

        data.query.ratings[0].id = mw.config.get('wgArticleId');

        ractiveCountryRating.set({
          countryRating: data.query.ratings[0]
        });

        $('.hw-your-rate').hide();

        $('.hw-rating-widget .hw-rate').click(function(evt) {
          $('.hw-your-rate').hide();
          $('.hw-rate').show();
          evt.preventDefault();
          $(this).hide();
          var id = $(this).attr('id').replace(/hw-rate_/, '');

          $('#hw-your_rate_' + id).show();
        });

        $(document).mouseup(function(e) {
          var $container = $('.hw-rating-widget .hw-rate');

          if (!$container.is(e.target) // if the target of the click isn't the container...
              && $container.has(e.target).length === 0) // ... nor a descendant of the container
          {
            $('.hw-your-rate').hide();
            $('.hw-rate').show();
          }
        });
      });
    });
  };

  // Export
  mw.HWMaps.CountryRating = CountryRating;

}(mediaWiki, jQuery));


/*
var countryRating = {};

var initCountryRatingsTemplate = function initCountryRatingsTemplate() {

};
*/

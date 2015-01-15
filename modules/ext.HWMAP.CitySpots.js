var initTemplate = function () {

    $.get( extensionRoot +'modules/ext.HWMAP.CitySpots.template.html' ).then( function ( template ) {
      ractive = new Ractive({
        el: 'incity-spots',
        template: template,
        data: spotsData
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

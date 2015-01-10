<?php
class SpecialHWMap extends SpecialPage {
  function __construct() {
    parent::__construct( 'HWMap' );
  }

  function execute( $par ) {
    $output = $this->getOutput();
    $output->setPageTitle( 'Hitchwiki Map' );
    $output->addModules( 'ext.HWMap' );
    $output->addHTML('<div class="hwmap-container"><div id="hwmap"></div></div>');

    $output->addHTML('<a id="hwmap-add" href="#">Add new spot</a>');

    $output->addWikiText(
      '<div id="hwmap-add-wrap" style="display:none;">' .
        '<p>Drag marker to the hitchhiking spot. Zoom in closer to see better and use satellite maps to confirm location.</p>' .
        '{{#forminput:form=Spot|size=|default value=|button text=Continue|page name=|query string=Spot[Location]=51,23&Spot[Country]=|popup}}' .
      '</div>'
    );

  }
}

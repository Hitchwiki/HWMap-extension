<?php
class SpecialHWMap extends SpecialPage {
  function __construct() {
    parent::__construct( 'HWMap' );
  }

  function execute( $par ) {
    $output = $this->getOutput();
    $output->setPageTitle( 'Hitchwiki Map' );
    $output->isPrintable(false);
    $output->addModules( 'ext.HWMap' );

    // The Map
    $output->addHTML('<div class="hwmap-container"><div id="hwmap">');

    // Add new spot HTML
    $output->addHTML('<a href="#" id="hwmap-add" style="display:none;">Add new spot</a>');
    $output->addHTML('<div id="hwmap-add-wrap" style="display:none;">');
    $output->addHTML('<p>Drag marker to the hitchhiking spot. Zoom in closer to see better and use satellite maps to confirm location.</p>');

    // Semantic form for adding new spot
    $output->addWikiText('{{#forminput:form=Spot|size=|default value=|button text=Continue|page name=|query string=Spot[Location]=51,23&Spot[Country]=&Spot[Cities]=|popup}}');

    // More add new spot HTML...
    $output->addHTML('<a href="#" id="hwmap-cancel-adding">Cancel</a>');
    $output->addHTML('</div><!--#hwmap-add-wrap-->');
    $output->addHTML('</div></div>');


    // Semantic form for editing new spot
    $output->addWikiText('<div id="spot-edit-form-wrap">{{#forminput:form=Spot|size=|default value=|button text=Continue|page name=|query string=Spot[Location]=&Spot[Country]=&Spot[Cities]=|popup}}</div>');

    //The spot
    $output->addHTML('<div id="hwspot"></div>');

  }
}

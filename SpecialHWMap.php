<?php
/**
 * The main map special page
 * Can be accessed on [[Special:HWMap]]
 */
class SpecialHWMap extends SpecialPage {
  function __construct() {
    parent::__construct( 'HWMap' );
  }

  function execute( $parser ) {
    $output = $this->getOutput();
    $output->setPageTitle('Hitchwiki Map');
    $output->isPrintable(false);
    $output->addModules('ext.HWMap');

    // The Map
    $output->addHTML('<div class="hwmap-container"><div id="hwmap">');

    // Add new spot HTML
    // `class` variable is to fix bug caused by `ext.headertabs.core.js`:
    // `Uncaught TypeError: Cannot read property 'indexOf' of undefined at tabEditTabLink`
    $output->addHTML('<a href="#" id="hwmap-add" class="section-0" style="display:none;">Add new spot</a>');
    $output->addHTML('<div id="hwmap-add-wrap" style="display:none;">');
    $output->addHTML('<p>Drag marker to the hitchhiking spot. Zoom in closer to see better and use satellite maps to confirm location.</p>');

    // Semantic form for adding new spot
    // https://www.mediawiki.org/wiki/Extension:Page_Forms/Linking_to_forms#Using_.23forminput
    // This array is going to be joined into one string
    $formVars = array(
      'forminput:form=Spot', // the name of the SF form to be used
      'size=25', // the size of the text input
      'default value=', // the starting value of the input
      'button text=Continue', //  the text that will appear on the "submit" button
      'page name=',
      'query string=Spot[Location]=0,0&Spot[Country]=&Spot[Cities]=', //  you can use this option to pass information to the form
      'popup' // opens the form in a popup window
    );
    $output->addWikiText('{{#' . implode('|', $formVars) . '}}');

    // More add new spot HTML...
    $output->addHTML('<a href="#" id="hwmap-cancel-adding">Cancel</a>');
    $output->addHTML('</div><!--#hwmap-add-wrap-->');
    $output->addHTML('</div></div>');


    // Semantic form for editing new spot
    $output->addWikiText('<div id="hw-spot-edit-form-wrap">{{#forminput:form=Spot|size=|default value=|button text=Continue|page name=|query string=Spot[Location]=&Spot[Country]=&Spot[Cities]=|popup}}</div>');

    // The spot
    $output->addHTML('<div id="hw-specialpage-spot"></div>');

    // The zoom info overlay
    // Toggled visible on high zoom levels
    $output->addHTML('<div id="hw-zoom-info-overlay">Zoom closer to see hitchhiking spots.</div>');


  }
}

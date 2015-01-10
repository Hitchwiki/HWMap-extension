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
      str_replace('%username%', '', '{{#forminput:form=Spot|size=|default value=%username%|button text=Next step|page name=%username%|query string=Spot[Location]=51,23|popup}}') .
      '</div>'
    );

  }
}

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
  }
}

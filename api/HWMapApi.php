<?php
class HWMapApi extends ApiBase {
	public function execute() {
		// Get parameters
        $params = $this->extractRequestParams();

        //Send the query do the database
        $dbr = wfGetDB( DB_SLAVE );
        $res = $dbr->select(
            array( 'geo_tags', 'categorylinks'),
            array( 'gt_page_id', 'gt_lat', 'gt_lon', 'cl_to'),
            array(
                'gt_lat <'.$params['NElat'],
                'gt_lat >'.$params['SWlat'],
                'gt_lon >'.$params['SWlon'],
                'gt_lon <'.$params['NElon']
            ),
            __METHOD__,
            array(),
            array( 'categorylinks' => array( 'JOIN', array(
		'gt_page_id=cl_from' ) ) )
        );


        //Build the api result
        foreach( $res as $row ) {
            $vals = array(
                'id' => $row->gt_page_id,
                'location' => array(
                    $row->gt_lat,
                    $row->gt_lon
                ),
                'category' => $row->cl_to
            );
            $this->getResult()->addValue( array( 'query', 'spots' ), null, $vals );
        }

		return true;
	}

	// Description
	public function getDescription() {
		return 'Get pages located in a specified bounding box.';
	}

	// Parameters.
	public function getAllowedParams() {
		return array(
			'NElat' => array (
				ApiBase::PARAM_TYPE => 'string',
				ApiBase::PARAM_REQUIRED => true
			),
			'NElon' => array (
				ApiBase::PARAM_TYPE => 'string',
				ApiBase::PARAM_REQUIRED => true
			),
			'SWlat' => array (
				ApiBase::PARAM_TYPE => 'string',
				ApiBase::PARAM_REQUIRED => true
			),
			'SWlon' => array (
				ApiBase::PARAM_TYPE => 'string',
				ApiBase::PARAM_REQUIRED => true
			),
		);
	}

	// Describe the parameter
	public function getParamDescription() {
		return array_merge( parent::getParamDescription(), array(
			'NElat' => 'North East latitude of the bounding box',
			'NElon' => 'North East longitude of the bounding box',
			'SWlat' => 'South West latitude of the bounding box',
			'SWlon' => 'South West longitude of the bounding box'
		) );
	}
}

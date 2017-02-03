<?php
/**
 * This Api is made to query information
 * (average ratings and location) of the spot of given id
 */
class HWSpotIdApi extends ApiBase {
	public function execute() {
    global $wgUser;

    // Get parameters
    $params = $this->extractRequestParams();

    // Die if empty `properties` param
    if (empty($params['properties'])) {
      $this->dieUsage('HWMapCityApi: no properties defined. #09981f');
    }

    $page_id = $params['page_id'];

    // Make an array from properties param
    $properties = explode(',', $params['properties']);

    // Get title of the spot
    $get_title = new DerivativeRequest(
      $this->getRequest(),
      array(
        'action' => 'query',
        'pageids' => $page_id,
        'prop' => 'pageprops'
      ),
      true
    );
    $get_title_api = new ApiMain( $get_title );
    $get_title_api->execute();
    $get_title_data = $get_title_api->getResult()->getResultData( null, ['BC' => [], 'Types' => [], 'Strip' => 'all'] );
    $first_key = key($get_title_data['query']['pages']);
    $title = $get_title_data['query']['pages'][$first_key]['title'];
    $spot->title = $title;

    // Get data of the spot via Semantic-MediaWiki Ask API
    $get_spotdata = new DerivativeRequest(
      $this->getRequest(),
      array(
        'action' => 'ask',
        'query' => '[['.$title.']]' .
                   '|?' . join('|?', $properties)
      ),
      true
    );

    $get_spotdata_api = new ApiMain( $get_spotdata );
    $get_spotdata_api->execute();
    $get_spotdata_data = $get_spotdata_api->getResult()->getResultData( null, ['BC' => [], 'Types' => [], 'Strip' => 'all'] );
    $first_key = key($get_spotdata_data['query']['results']);
    $result = $get_spotdata_data['query']['results'][$first_key];

    // Get the properties
    foreach($properties_array as $propertie) {
      // Check if the propertie have multiple value
      if($result['printouts'][$propertie][0]['fulltext']) {
        $spot->$propertie = [];
        for($i = 0; $i < count($result['printouts'][$propertie]); ++$i) {
          array_push($spot->$propertie, $result['printouts'][$propertie][$i]['fulltext']);
        }
      }
      else{
        $spot->$propertie =  $result['printouts'][$propertie];
      }
    }

    // Get parsed description
    $spot_text = new DerivativeRequest(
      $this->getRequest(),
      array(
        'action' => 'parse',
        'page' => $title,
        'prop' => 'text',
        'disablepp' => ''
      ),
      true
    );
    $spot_text_api = new ApiMain( $spot_text );
    $spot_text_api->execute();
    $spot_text_data = $spot_text_api->getResult()->getResultData( null, ['BC' => [], 'Types' => [], 'Strip' => 'all'] );
    $spot->Description = $spot_text_data['parse']['text']['*'];

    // If the rating extension is set
    if ( class_exists( 'HWAvgRatingApi' ) ) {
      // Get the rating average and count
      $spot_average_rating = new DerivativeRequest(
        $this->getRequest(),
        array(
          'action' => 'hwavgrating',
          'pageid' => $page_id,
          // https://www.mediawiki.org/wiki/Manual:$wgUser
          'user_id' => $wgUser->getId()
        ),
        true
      );

      $spot_average_rating_api = new ApiMain( $spot_average_rating );
      $spot_average_rating_api->execute();
      $spot_average_rating_data = $spot_average_rating_api->getResult()->getResultData( null, ['BC' => [], 'Types' => [], 'Strip' => 'all'] );
      $spot->rating_average = floatval($spot_average_rating_data['query']['ratings'][0]['rating_average']);
      $spot->rating_count = intval($spot_average_rating_data['query']['ratings'][0]['rating_count'], 10) || 0;
      $spot->rating_user =  intval($spot_average_rating_data['query']['ratings'][0]['rating_user'], 10);
      $spot->timestamp_user =  $spot_average_rating_data['query']['ratings'][0]['timestamp_user'];

      // And get the average detail
      $spot_average_detail = new DerivativeRequest(
        $this->getRequest(),
        array(
          'action' => 'hwgetratings',
          'pageid' => $page_id
        ),
        true
      );
      $spot_average_detail_api = new ApiMain( $spot_average_detail );
      $spot_average_detail_api->execute();
      $spot_average_detail_data = $spot_average_detail_api->getResult()->getResultData( null, ['BC' => [], 'Types' => [], 'Strip' => 'all'] );
      $spot->ratings = $spot_average_detail_data['query']['ratings'];

    }

    // If the waiting time extension is set
    if ( class_exists( 'HWAvgWaitingTimeApi' ) ) {
      // Get the waiting time median and count
      $spot_waiting_times = new DerivativeRequest(
        $this->getRequest(),
        array(
          'action' => 'hwavgwaitingtime',
          'pageid' => $page_id
        ),
        true
      );
      $spot_waiting_times_api = new ApiMain( $spot_waiting_times );
      $spot_waiting_times_api->execute();
      $spot_waiting_times_data = $spot_waiting_times_api->getResult()->getResultData( null, ['BC' => [], 'Types' => [], 'Strip' => 'all'] );
      $spot->waiting_time_average = $spot_waiting_times_data['query']['waiting_times'][0]['waiting_time_average'];
      $spot->waiting_time_count = $spot_waiting_times_data['query']['waiting_times'][0]['waiting_time_count'];

    }


    // If the comment extension is set
    if ( class_exists( 'HWGetCommentsCountApi' ) ) {
      // Get the comments count
      $spot_comment_count = new DerivativeRequest(
        $this->getRequest(),
        array(
          'action' => 'hwgetcommentscount',
          'pageid' => $page_id
        ),
        true
      );
      $spot_comment_count_api = new ApiMain( $spot_comment_count );
      $spot_comment_count_api->execute();
      $spot_comment_count_data = $spot_comment_count_api->getResult()->getResultData( null, ['BC' => [], 'Types' => [], 'Strip' => 'all'] );
      $spot->comment_count = $spot_comment_count_data['query']['comment_counts'][0]['comment_count'];

      // And get the comments details
      $spot_comment_detail = new DerivativeRequest(
        $this->getRequest(),
        array(
          'action' => 'hwgetcomments',
          'pageid' => $page_id
        ),
        true
      );
      $spot_comment_detail_api = new ApiMain( $spot_comment_detail );
      $spot_comment_detail_api->execute();
      $spot_comment_detail_data = $spot_comment_detail_api->getResult()->getResultData( null, ['BC' => [], 'Types' => [], 'Strip' => 'all'] );
      $spot->comments = $spot_comment_detail_data['query']['comments'];
    }

    $this->getResult()->addValue('query', 'spot',  $spot);

    return true;
	}

	// API endpoint description
	public function getDescription() {
		return 'Get the linked spots of a page.';
	}

	// Parameters.
	public function getAllowedParams() {
		return array(
			'page_id' => array(
				ApiBase::PARAM_TYPE => 'integer',
				ApiBase::PARAM_REQUIRED => true
			),
			'properties' => array(
				ApiBase::PARAM_TYPE => 'string',
				ApiBase::PARAM_REQUIRED => true
			)
		);
	}

	// Describe the parameter
	public function getParamDescription() {
		return array_merge( parent::getParamDescription(), array(
			'page_title' => 'Page title',
			'properties' => 'Page propeties to query'
		) );
	}
}

<?php
/*
 * This Api is made to query the informations (average ratings and location) to show spots that are related to a city on a map.
 * To do this we need the get the linked spots by calling the semanytc wiki ask api.
 * It only returns the name of the spots, so we have to make a second api call to get the id.
 * And we can finally get the average ratings with the HWRatingAPi.
 * If you have a better idea on how to do this, go for it !
 */
class HWMapCityApi extends ApiBase {

  public function execute() {
    // Get parameters
    $params = $this->extractRequestParams();
    $page_title = $params['page_title'];
    $properties = $params['properties'];
    $user_id = $params['user_id'];
    $spots = array();

    // Make an array from the properties
    $properties_array = explode(',', $properties);

    // Prepare propeties for the query
    $properties_query = '|?'.str_replace(',', '|?', $properties);

    // Get Spots that are linked to the city
    //
    $linked_spots = new DerivativeRequest(
      $this->getRequest(),
      array(
        'action' => 'ask',
        'query' => '[[Category:Spots]][[Cities::' . $page_title . ']]' . $properties_query
      ),
      true
    );
    $linked_spots_api = new ApiMain( $linked_spots );
    $linked_spots_api->execute();
    $linked_spots_data = $linked_spots_api->getResult()->getResultData( null, ['BC' => [], 'Types' => [], 'Strip' => 'all'] );

    // Go through the result
    $titles = '';
    $index = 0;
    foreach ($linked_spots_data['query']['results'] as  $key => $result) {
      // Add the titles together to get Ids later
      if ($titles != '') {
        $titles = $titles.'|';
      }

      $titles = $titles . $key;

      // Get title
      $spots[$index]->title = $key;

      // Get the properties
      foreach ($properties_array as $property) {
        // Check if the property has multiple values
        if ($result['printouts'][$property][0]['fulltext']) {
          $spots[$index]->$property = [];
          for ($i = 0; $i < count($result['printouts'][$property]); ++$i) {
            array_push($spots[$index]->$property, $result['printouts'][$property][$i]['fulltext']);
          }
        } else {
          $spots[$index]->$property =  $result['printouts'][$property];
        }
      }

      // Get text of the article
      $spot_text = new DerivativeRequest(
        $this->getRequest(),
        array(
          'action' => 'parse',
          'page' => $key,
          'prop' => 'text',
          'disablepp' => ''
        ),
        true
      );
      $spot_text_api = new ApiMain($spot_text);
      $spot_text_api->execute();
      $spot_text_data = $spot_text_api->getResult()->getResultData(null, ['BC' => [], 'Types' => [], 'Strip' => 'all']);
      $spots[$index]->Description = $spot_text_data['parse']['text']['*'];

      $index++;
    }

    // Get Ids of the spots
    $title_id = new DerivativeRequest(
      $this->getRequest(),
      array(
        'action' => 'query',
        'titles' => $titles
      ),
      true
    );

    $title_id_api = new ApiMain( $title_id );
    $title_id_api->execute();
    $title_id_data = $title_id_api->getResult()->getResultData( null, ['BC' => [], 'Types' => [], 'Strip' => 'all'] );
    $ids = ''; $index = 0;

    foreach ($title_id_data['query']['pages'] as $key => $result) {
      if (!empty($ids)) {
        $ids .= '|';
      }
      $ids .= $key;
      $spots[$index]->id = $key;
      $index++;
    }

    // Create spot indices
    foreach ($spots as $index => $spot) {
      $spot_indices[$spot->id] = $index;
    }

    // If the rating extension is set, get the rating average
    if (class_exists( 'HWAvgRatingApi' )) {
      $spot_average_rating = new DerivativeRequest(
        $this->getRequest(),
        array(
          'action' => 'hwavgrating',
          'pageid' => $ids,
          'user_id' => $user_id
        ),
        true
      );
      $spot_average_rating_api = new ApiMain($spot_average_rating);
      $spot_average_rating_api->execute();
      $spot_average_rating_data = $spot_average_rating_api->getResult()->getResultData(null, ['BC' => [], 'Types' => [], 'Strip' => 'all']);

      foreach ($spot_average_rating_data['query']['ratings'] as $rating_res) {
        if (array_key_exists($rating_res['pageid'], $spot_indices)) {
          $index = $spot_indices[$rating_res['pageid']];
          $spots[$index]->rating_average = $rating_res['rating_average'];
          $spots[$index]->rating_count = $rating_res['rating_count'];
          $spots[$index]->rating_user = $rating_res['rating_user'];
          $spots[$index]->timestamp_user = $rating_res['timestamp_user'];
        }
      }
    }

    // If the waiting time extension is set, get the waiting count and median
    if (class_exists( 'HWAvgWaitingTimeApi' )) {
      $spot_waiting_times = new DerivativeRequest(
        $this->getRequest(),
        array(
          'action' => 'hwavgwaitingtime',
          'pageid' => $ids
        ),
        true
      );
      $spot_waiting_times_api = new ApiMain( $spot_waiting_times );
      $spot_waiting_times_api->execute();
      $spot_waiting_times_data = $spot_waiting_times_api->getResult()->getResultData( null, ['BC' => [], 'Types' => [], 'Strip' => 'all'] );

      foreach ($spot_waiting_times_data['query']['waiting_times'] as $waiting_times_res) {
        if (array_key_exists($waiting_times_res['pageid'], $spot_indices)) {
          $index = $spot_indices[$waiting_times_res['pageid']];
          $spots[$index]->waiting_time_average = $waiting_times_res['waiting_time_average'];
          $spots[$index]->waiting_time_count = $waiting_times_res['waiting_time_count'];
        }
      }
    }

    // If the comment extension is set, get the comments count
    if (class_exists( 'HWGetCommentsCountApi' )) {

      $spot_comment_count = new DerivativeRequest(
        $this->getRequest(),
        array(
          'action' => 'hwgetcommentscount',
          'pageid' => $ids
        ),
        true
      );

      $spot_comment_count_api = new ApiMain( $spot_comment_count );
      $spot_comment_count_api->execute();
      $spot_comment_count_data = $spot_comment_count_api->getResult()->getResultData( null, ['BC' => [], 'Types' => [], 'Strip' => 'all'] );

      foreach ($spot_comment_count_data['query']['comment_counts'] as $count_res) {
        /*
        for ($index = 0; $index < count($spots) && $spots[$index]->id != $count_res['pageid']; $index++) {
          // Looking for the spot ...
        }
        */
        if ($index < count($spots)) {
          $spots[$index]->comment_count = $count_res['comment_count'];
        }
      }
    }

    // Build the api result
    for ($index = 0; $index < count($spots); $index++) {
      $this->getResult()->addValue( array( 'query', 'spots' ), null, $spots[$index]);
    }

    return true;
  }

  // Description
  public function getDescription() {
    return 'Get the linked spots of a page.';
  }

  // Parameters.
  public function getAllowedParams() {
    return array(
      'page_title' => array (
        ApiBase::PARAM_TYPE => 'string',
        ApiBase::PARAM_REQUIRED => true
      ),
      'properties' => array (
        ApiBase::PARAM_TYPE => 'string',
        ApiBase::PARAM_REQUIRED => true
      ),
      'user_id' => array (
        ApiBase::PARAM_TYPE => 'integer',
        ApiBase::PARAM_REQUIRED => true
      )
    );
  }

  // Describe the parameter
  public function getParamDescription() {
    return array_merge( parent::getParamDescription(), array(
      'page_title' => 'Page title',
      'properties' => 'Page propeties to query',
      'user_id' => 'Current user id'
    ) );
  }
}

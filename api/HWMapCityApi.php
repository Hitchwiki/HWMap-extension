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

      $spots = array();

      //Get Spots that are linked to the city
      $linked_spots = new DerivativeRequest(
        $this->getRequest(),
        array(
          'action' => 'ask',
          'query' => '[[Category:Spots]][[Cities::'.$page_title.']]|?Location|?Country|?CardinalDirection|?CitiesDirection|?RoadsDirection'
        ),
        true
      );
      $linked_spots_api = new ApiMain( $linked_spots );
      $linked_spots_api->execute();
      $linked_spots_data = $linked_spots_api->getResultData();
      $titles = ''; $index = 0;
      foreach($linked_spots_data['query']['results'] as  $key => $result) {
        if($titles!='') $titles = $titles.'|';
        $titles = $titles.$key;
        $spots[$index]->title = $key;
        $spots[$index]->location = $result['printouts']['Location'];
        $spots[$index]->Country = $result['printouts']['Country'][0]['fulltext'];
        $spots[$index]->CardinalDirection = "";
        for($i = 0; $i < count($result['printouts']['CardinalDirection']); ++$i) {
            if($i > 0) {
                $spots[$index]->CardinalDirection = $spots[$index]->CardinalDirection.", ";
            }
            $spots[$index]->CardinalDirection = $spots[$index]->CardinalDirection.$result['printouts']['CardinalDirection'][$i]['fulltext'];
        }
        for($i = 0; $i < count($result['printouts']['CitiesDirection']); ++$i) {
            $spots[$index]->CitiesDirection[$i] = $result['printouts']['CitiesDirection'][$i]['fulltext'];
        }
        for($i = 0; $i < count($result['printouts']['RoadsDirection']); ++$i) {
            $spots[$index]->RoadsDirection[$i] = $result['printouts']['RoadsDirection'][$i]['fulltext'];
        }
        $index++;
      }

      //Get Ids of the spots
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
      $title_id_data = $title_id_api->getResultData();
      $ids = ''; $index = 0;
      foreach($title_id_data['query']['pages'] as  $key => $result) {
        if($ids!='') $ids = $ids.' OR ';
        $ids = $ids.'hw_page_id='.$key;
        $spots[$index]->id = $key;
        $index++;
      }

      //Get the averages of all the ids
      $dbr = wfGetDB( DB_SLAVE );
      $res = $dbr->select(
        'hw_ratings_avg',
        array('hw_average_rating', 'hw_page_id'),
        $ids
      );
      foreach( $res as $row ) {
        for($index = 0; $index < count($spots) && $spots[$index]->id != $row->hw_page_id; $index++) {
          //Looking for the spot ...
        }
        if($index < count($spots)) {
          $spots[$index]->average = $row->hw_average_rating;
        }
      }

      //Build the api result
      for($index = 0; $index < count($spots); $index++) {
        $this->getResult()->addValue( array( 'query', 'spots' ), null,  $spots[$index]);
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
			)
		);
	}

	// Describe the parameter
	public function getParamDescription() {
		return array_merge( parent::getParamDescription(), array(
			'page_title' => 'Page title'
		) );
	}
}

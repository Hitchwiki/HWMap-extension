<?php
class HWFindNearbyCityApi extends ApiBase {
    public function execute() {
        global $wgHwMapCityRelevanceRadius;
        global $wgHwMapCityCloseDistance;

        // Get parameters
        $params = $this->extractRequestParams();
        $lat = (double) $params['lat'];
        $lng = (double) $params['lng'];

        // @TODO: validate lat and lng ranges to avoid unnecessary queries

        /*
         * Compute a bounding rectangle (LatLngBounds instance) from a point and a given radius.
         * Reference: http://www.movable-type.co.uk/scripts/latlong-db.html
         *
         *  -------------NE
         * |              |
         * |        radius|
         * |       o------|
         * |              |
         * |              |
         * SW-------------
         */
        $bounds = SphericalGeometry::computeBounds(new LatLng($lat, $lng), $wgHwMapCityRelevanceRadius);
        $ne_bound = $bounds->getNorthEast();
        $sw_bound = $bounds->getSouthWest();
        $north = $ne_bound->getLat();
        $east = $ne_bound->getLng();
        $south = $sw_bound->getLat();
        $west = $sw_bound->getLng();

        // Query for cities within the bounding box
        $dbr = wfGetDB( DB_SLAVE );
        $res = $dbr->select(
            array( 'geo_tags', 'categorylinks' ),
            array( 'gt_page_id', 'gt_lat', 'gt_lon', 'cl_to' ),
            array(
                'gt_lat < ' . $north,
                'gt_lat > ' . $south,
                'gt_lon > ' . $west,
                'gt_lon < ' . $east,
                "cl_to = 'Cities'"
            ),
            __METHOD__,
            array(),
            array( 'categorylinks' => array( 'JOIN', array(
                'gt_page_id = cl_from'
            ) ) )
        );

        $cities = array();
        foreach( $res as $row ) {
            $cities[] = array(
                'page_id' => $row->gt_page_id,
                'location' => array(
                    $row->gt_lat,
                    $row->gt_lon
                ),
                'category' => $row->cl_to,
                'distance' => round(SphericalGeometry::computeDistanceBetween( // round for reliable comparison later on
                    new LatLng($row->gt_lat, $row->gt_lon),
                    new LatLng($lat, $lng) // (lat; lng) from $params
                ))
            );
        }

        // Sort cities by distance
        usort($cities, function($a, $b) {
                if ($a['distance'] == $b['distance'])
                    return 0;
                if ($a['distance'] < $b['distance'])
                    return -1;
                return 1;
            }
        );

        // Pick out the best city, or possibly two best cities
        $closest_cities = array();
        if (count($cities) > 0) {
            $closest_cities[] = $cities[0];
            if (count($cities) > 1) {
                if ($cities[1]['distance'] - $closest_cities[0]['distance'] < $wgHwMapCityCloseDistance) {
                    $closest_cities[] = $cities[1];
                }
            }
        }

        $this->getResult()->addValue( array(), 'cities', $closest_cities );

        return true;
    }

    // Description
    public function getDescription() {
        return 'Get the most relevant nearby cities.';
    }

    // Parameters
    public function getAllowedParams() {
        return array(
            'lat' => array (
                ApiBase::PARAM_TYPE => 'string',
                ApiBase::PARAM_REQUIRED => true
            ),
            'lng' => array (
                ApiBase::PARAM_TYPE => 'string',
                ApiBase::PARAM_REQUIRED => true
            )
        );
    }

    // Describe the parameter
    public function getParamDescription() {
        return array_merge( parent::getParamDescription(), array(
            'lat' => 'Latitude of the point',
            'lng' => 'Longitude of the point'
        ) );
    }
}

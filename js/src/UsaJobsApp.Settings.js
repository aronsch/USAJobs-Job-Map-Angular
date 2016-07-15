(function () {
    /**
     * @module UsaJobsMap App Settings Module
     */

        // Settings Declaration
    angular.module('UsaJobsApp').value('settings', appSettings());

    /**
     * Return App Settings object.
     */
    function appSettings() {
        return {
            // date format for date rendering
            dateDispFormat: 'M/D/YY',
            // UsaJobs.gov Data API settings
            usaJobs: {
                reqOptions: {
                    method: 'GET',
                    url: 'https://data.usajobs.gov/api/search',
                    headers: {
                        'Authorization-Key': '' // replace with your API Key
                        // Go to developer.usajobs.gov/Search-API/Request-API-Key to request an API key
                    },
                    transformResponse: function (data) {
                        // return results array as response
                        var results = JSON.parse(data).SearchResult.SearchResultItems.map(function (item) {
                            return item.MatchedObjectDescriptor;
                        });
                        results.data = data;
                        return results;
                    }
                },
                // URL of search results on USAJobs.gov
                searchBaseUrl: 'https://www.usajobs.gov/JobSearch/Search/GetResults?OrganizationID=',
                // date format for date parsing
                dateFormat: 'YYYY-MM-DD'
                // 2016-06-14T00:00:00Z
            },

            // Leaflet.js map settings
            map: {
                center: [40.8282, -98.5795], // map center - CONUS
                zoom: 4, // default map starting zoom
                attributionControl: true, // display map data attribution
                zoomControl: true, // display map zoom control
                scrollWheelZoom: false, // disable scrollwheel zoom
                maxZoom: 11, // max zoom limit
                minZoom: 1, // min zoom limit
                markerClustering: true, // joblocation marker clustering (recommended)
                jobCountOverlay: true // show overlay indicating job counts at locations
            },

            // Map marker settings
            assets: {
                jobLocation: {
                    iconUrl: 'http://cdn.leafletjs.com/leaflet-0.7.3/images/marker-icon.png',
                    iconRetinaUrl: 'http://cdn.leafletjs.com/leaflet-0.7.3/images/marker-icon-2x.png',
                    shadowUrl: 'http://cdn.leafletjs.com/leaflet-0.7.3/images/marker-shadow.png',
                    miniIconUrl: 'http://cdn.leafletjs.com/leaflet-0.7.3/images/marker-icon.png',
                    iconSize: [25, 41],
                    iconAnchor: [13, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41],
                    className: 'usajobs-job-location-icon',
                    riseOnHover: true
                }
            }
        }
    }
})();

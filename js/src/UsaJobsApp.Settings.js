(function () {
    /**
     * @module UsaJobsMap App Settings Module
     */

    // Settings Module Declarations
    angular.module('UsaJobsApp.Settings', []);
    angular.module('UsaJobsApp.Settings').value('settings', appSettings());

    /**
     * Return App Settings object.
     */
    function appSettings() {
        return {
            // UsaJobs.gov Data API settings
            usaJobs: {
                // base of job query URL
                baseUrl: 'https://data.usajobs.gov/api/jobs',
                // job query org attribute
                orgAttr: '&OrganizationID=',
                // job query result page attribute
                pageAttr: '&Page=',
                // URL of search results on USAJobs
                searchBaseUrl: 'https://www.usajobs.gov/JobSearch/Search/GetResults?OrganizationID=',
                // date format for date parsing
                dateFormat: 'M/D/YYYY'
            },

            // Leaflet.js map settings
            map: {
                center: [40.8282, -98.5795], // map center - CONUS
                zoom: 4, // default map starting zoom
                attributionControl: true, // display map data attribution
                zoomControl: true, // display map zoom control
                scrollWheelZoom: true, // allowing scrollwheel zoom
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
            },

            // Geocoding API service setting
            geocoding: {
                // geocoding service name for attribution
                name: 'Google',
                // geocoding service info page URL for attribution link
                infoURL: 'https://developers.google.com/maps/documentation/geocoding/',
                // delay in ms between geocoding calls
                rateLimit: 200,
                // function to generate valid geocoding query based on location name
                query: function (locationName) {
                    var query;
                    query = 'https://maps.googleapis.com/maps/api/geocode/json?address=';
                    query += locationName;
                    return encodeURI(query);
                },
                // function to normalize the geocoding service response into a
                // simple lat/lng object.
                normalizeResponse: function (response) {
                    if (response.results[0]) {
                        response = response.results[0].geometry.location;
                        return {
                            lat: response.lat,
                            lon: response.lng,
                            source: this.name,
                            date: new Date()
                        };
                    }
                }
            }
        }
    }
})();

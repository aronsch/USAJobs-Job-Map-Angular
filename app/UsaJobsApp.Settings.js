/**
 * @module UsaJobsMap Settings Module
 */
(function () {
	angular.module('UsaJobsApp.Settings', []);
	angular.module('UsaJobsApp.Settings').constant('settings', {
			usaJobs : { // UsaJobs.gov REST API Settings
				// base of job query URL
				baseUrl : 'https://data.usajobs.gov/api/jobs',
				// job query org attribute
				orgAttr : '&OrganizationID=',
				// job query result page attribute
				pageAttr : '&Page=',
				// URL of search results on USAJobs
				searchBaseUrl : 'https://www.usajobs.gov/JobSearch/Search/GetResults?OrganizationID='
				
			},
			map : { // Leaflet.js map settings
				center : [ 40.8282, -98.5795 ], // default map center - CONUS
				zoom : 4, // default map starting zoom
				attributionControl : true, // display map data attribution
				zoomControl : true, // display map zoom control
				scrollWheelZoom : true, // allowing scrollwheel zoom
				maxZoom : 8, // max zoom limit
				minZoom : 2, // min zoom limit
				markerClustering : true, // joblocation marker clustering (recommended)
			},
			assets : { // map asset settings
				jobLocation : {
					iconUrl : 'http://cdn.leafletjs.com/leaflet-0.7.3/images/marker-icon.png',
					iconRetinaUrl : 'http://cdn.leafletjs.com/leaflet-0.7.3/images/marker-icon-2x.png',
					iconShadowUrl : 'http://cdn.leafletjs.com/leaflet-0.7.3/images/marker-shadow.png',
					miniIconUrl : 'http://cdn.leafletjs.com/leaflet-0.7.3/images/marker-icon.png',
					iconSize : [ 25, 41 ],
					iconAnchor : [ 13, 41 ],
					popupAnchor : [ 1, -34 ],
					shadowSize : [ 41, 41 ],
					className : 'usajobs-job-location-icon'
				},
			}
		});
})();

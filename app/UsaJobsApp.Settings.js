/**
 * @module UsaJobsMap Settings Module
 */
(function () {
	angular.module('UsaJobsApp.Settings', []);
	angular.module('UsaJobsApp.Settings').value('settings', {
			usaJobs : { // UsaJobs.gov Settings
				// base of job query URL
				baseUrl : 'https://data.usajobs.gov/api/jobs',
				// job query org attribute
				orgAttr : '&OrganizationID=',
				// job query result page attribute
				pageAttr : '&Page=',
				// URL of search results on USAJobs
				searchBaseUrl : 'https://www.usajobs.gov/JobSearch/Search/GetResults?OrganizationID=',
				// date format for date parsing
				dateFormat : 'M/D/YYYY',
			},
			map : { // Leaflet.js map settings
				center : [ 40.8282, -98.5795 ], // map center - CONUS
				zoom : 4, // default map starting zoom
				attributionControl : true, // display map data attribution
				zoomControl : true, // display map zoom control
				scrollWheelZoom : true, // allowing scrollwheel zoom
				maxZoom : 9, // max zoom limit
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
			},
			geocoding : { // Geocoding Service Information
				// geocoding service name
				name : 'Google',
				// geocoding service info page for attribution link
				infoURL : 'https://developers.google.com/maps/documentation/geocoding/',
				// delay in ms between geocoding calls
				rateLimit : 200,
				// function to generate valid geocoding query based on location name
				query : function (locationName) {
						var query;
						query = 'https://maps.googleapis.com/maps/api/geocode/json?address=';
						query += locationName;
						return encodeURI(query);
				},
				// function to normalize the geocoding service response into a
				// simple lat/lng object.
				normalizeResponse : function (response) {
					if (response.results[0]) {
						response = response.results[0].geometry.location;
						return {
							lat : response.lat,
							lon : response.lng
						};
					}
				}
			},
			
		});
})();

/**
 * @module UsaJobsMap Settings Module
 */
(function () {
	angular.module('UsaJobsApp.Settings', []);
	
	angular.module('UsaJobsApp.Settings').constant('settings', {
		usaJobs : {
			baseUrl : 'https://data.usajobs.gov/api/jobs',
			orgAttr : '&OrganizationID=',
			pageAttr : '&Page=',
			searchBaseUrl : 'https://www.usajobs.gov/JobSearch/Search/GetResults?OrganizationID='
		},
		assets : {
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
	
	angular.module('UsaJobsApp.Settings').constant('templates', {

	});
	
})();

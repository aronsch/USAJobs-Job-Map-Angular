/**
 * @module UsaJobsMap Location module - Job Location management and location
 *         geocoding.
 *         TODO: GeoJobLocation object that inherits from JobLocation prototype.
 */
(function () {
	angular.module('UsaJobsApp.Location', []);
	
	angular.module('UsaJobsApp.Location').factory('JobLocation', JobLocation);
	angular.module('UsaJobsApp.Location').service('geocodeService', geocodeService);
	
	JobLocation.$inject = ['geocodeService', 'eventService' ];
	function JobLocation (geocodeService, events) {
		return function (jobLoc) {
			angular.extend(this, jobLoc);
			
			/*
			 * Function Definitions
			 */
			this.geodataAvailable = geodataAvailable;
			this.setGeodata = setGeodata;
			this.hasNoGeodata = hasNoGeodata;
			this.visible = visible;
			this.countVisible = countVisible;
			
			// finally, get geographic location of this location
			geocodeService.geocode(this);
			
			/*
			 * Functions
			 */

			// Broadcast notification that new geodata is available for plotting
			function geodataAvailable () {
				events.geodata.available(this);
			}
			
			// Broadcast notification that geodata could not be found
			function hasNoGeodata (errorMsg) {
				this.noGeodataReason = errorMsg;
				events.geodata.notAvailable(this);
			}
			
			// Set geographic location data for this Location and
			// broadcast notification
			function setGeodata (geodata) {
				this.geodata = geodata;
				this.geodataAvailable();
			}
			
			// Iterate through jobs at location.
			// Mark the location as visible if any of the jobs
			// associated with it are visible.
			function visible () {
				var i, visible = false;
				
				for (i = 0; i < this.jobs.length; i++) {
					if (this.jobs[i].visible === true) {
						visible = true;
						break;
					}
				}
				return visible;
			}
			
			function countVisible () {
				var c = 0;
				angular.forEach(this.jobs, function (job) {
					if (job.visible) c++;
				});
				return c;
			}
			
		};
	}
	
	geocodeService.$inject = [ '$http', '$timeout' ];
	function geocodeService ($http, $timeout) {
		// Standard query generation and data normalization
		// functions for geocoding services.
		// TODO: Extensible via user-provided query and normalization
		// functions.
		this.geocode = function geocode (location) {
			var geodata;
			// check if location data is cached
			if ((geodata = this.geodataCache.getLocation(location.name))) {
				// set geodata from cached location
				location.setGeodata(geodata);
			} else {
				// otherwise, queue for geocoding
				this.addToQueue(location);
			}
		};
		this.api = {
			/*
			 * Return the current geocoding service API. Checks for
			 * user-selected of built-in service, then user-provided API
			 * interface. Defaults to Google geocoding service.
			 */
			currentAPI : function currentAPI () {
				return this.custom || this[this.defaultAPI];
			},
			defaultAPI : "google",
			// Route query constructor call to current API.
			query : function query (location) {
				var api = this.currentAPI();
				this.attributionControl.attribute(api);
				return api.query(location.name);
			},
			// Route response normalization call to current API.
			normalizeResponse : function normalizeResponse (response) {
				return this.currentAPI().normalizeResponse(response);
			},
			// Get rate limit for geocoding requests, default to 125ms
			rateLimit : function rateLimit (response) {
				return this.currentAPI().rateLimit || 190;
			},
			attributionControl : {
				attributed : false,
				attribute : function (api) {
					// Add service attribution if geocoding request is made
					if (this.attributed) return;
					// TODO: angularize custom attribution
					// Map.leafletMap.attributionControl
					// .addAttribution('<a target="_blank" href="'
					// + api.infoURL + '"'
					// + ' title="Duty station locations geocoded by '+ api.name
					// + '">'
					// + api.name + '</a>');
					// this.attributed = true;
				}
			},
			geonames : {
				name : 'GeoNames',
				infoURL : 'http://www.geonames.org/export/geonames-search.html',
				query : function (locationName) {
					var query;
					query = 'http://api.geonames.org/search';
					query += "?q=" + locationName;
					query += "&maxRows=1";
					query += "&username=" + options.geocodeAPIKey;
					query += "&type=json";
					return encodeURI(query);
				},
				normalizeResponse : function (response) {
					if (response.geonames[0]) { return {
						lat : response.geonames[0].lat,
						lon : response.geonames[0].lng
					}; }
				}
			},
			google : {
				name : 'Google',
				infoURL : 'https://developers.google.com/maps/documentation/geocoding/',
				query : function (locationName) {
					var query;
					query = 'https://maps.googleapis.com/maps/api/geocode/json?address=';
					query += locationName;
					return encodeURI(query);
				},
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
			mapquest : {
				name : 'MapQuest',
				infoURL : 'http://www.mapquestapi.com/geocoding/',
				query : function (locationName) {
					var query;
					query = 'http://www.mapquestapi.com/geocoding/v1/address?';
					query += 'location=' + locationName;
					query += '&outFormat=json';
					query += '&thumbMaps=false';
					query += '&maxResults=1';
					query += '&key=' + options.geocodeAPIKey;
					return encodeURI(query);
				},
				normalizeResponse : function (response) {
					// TODO: validate response object.
					return {
						lat : response.latLng.lat,
						lon : response.latLng.lng
					};
				}
			},
			bing : {
				name : 'Bing',
				infoURL : '',
				query : function (locationName) {
					var query;
					query = 'http://dev.virtualearth.net/REST/v1/Locations';
					query += '?addressLine=' + locationName;
					query += 'maxResults=1';
					query += '&key=' + options.geocodeAPIKey;
					
					return encodeURI(query);
				},
				normalizeResponse : function (response) {
					// TODO: validate response object.
					return {
						lat : response.resources.point.coordinates[0],
						lon : response.resources.point.coordinates[1]
					};
				}
			}
		// ,
		// If a user-provided query and normalization function
		// object has been provided, place it here.
		// custom : (function () { return options.geocodingAPI; })()
		};
		// The geocoding queue
		this.queue = [];
		this.addToQueue = addToQueue;
		
		function addToQueue (loc) {
			this.queue.push(loc);
			this.status.requested();
			this.run();
		}
		
		// Process the geocoding queue. Queue processing allows us
		// to rate-limit our calls to comply with API guidelines
		this.run = run;
		this.isRunning = false;
		
		function run (advanceQueue) {
			var scope = this;
			// dispatch first geocode if queue processing has not started.
			// if the queue is progress, only dispatch next geocode if the
			// function is
			// called from the rate limiter with advanceQueue=true.
			if (!scope.isRunning || scope.isRunning && advanceQueue) {
				scope.isRunning = true;
				
				if (scope.queue.length > 0) {
					$timeout(function () {
						scope.geocodeRun();
						scope.run(true);
					}, scope.api.rateLimit());
				} else {
					scope.isRunning = false;
				}
			}
		}
		
		this.geocodeRun = geocodeRun;
		
		function geocodeRun () {
			var scope = this, location = scope.queue.shift(), geodata = {};
			geodata.$promise = $http.get(scope.api.query(location));
			geodata.$promise.success(function (data, status, q) {
				var geoLoc;
				
				if (data.error_message && data.status === "OVER_QUERY_LIMIT" ) {
					// Handle API rate limiting
					console.warn("Error Geocoding " + location.name 
							+ "\r\nStatus Message: " + data.status 
							+ "\r\nError Message: " + data.error_message);
					location.hasNoGeodata('Geolocation service over query limit');
					return
				} else if (data.results.length === 0) {
					// If there are no geocode results
					location.hasNoGeodata('Location not found');
					return;
				} else {
					// set the location's geodata if there are no errors
					geoLoc = scope.api.normalizeResponse(data);
					geoLoc.name = location.name;
					angular.extend(geodata, geoLoc);
					location.setGeodata(geodata);
					scope.geodataCache.addLocations(geoLoc);
				}
			});
			geodata.$promise.error(function (data) {
				console.error(data);
			});
			geodata.$promise.then(function () {
				scope.status.returned();
			});
		}
		
		// Geocoding queue status tracker
		// TODO: Timeout error handling
		this.status = {
			requested : function () {
				this.requestCount += 1;
				
			},
			returned : function () {
				this.returnedCount += 1;
				// TODO: Integrate this into data module
			},
			requestCount : 0,
			returnedCount : 0,
			percentage : function () {
				return Math.round((this.returnedCount / this.requestCount * 100));
			}
		};
		// Cache and retrieve Geodata from geocoding calls
		this.geodataCache = {
			// The geodata cache. Parsed into object array once on page load.
			geodata : (function () {
				if (angular.isUndefined(window.localStorage)) {
					// if browser does not support
					// HTML5 local storage, we return
					// empty array as placeholder
					return {};
				} else if (angular.isDefined(localStorage.geodataCache)) {
					// on startup, parse and return cached geodata
					return JSON.parse(localStorage.geodataCache);
				} else {
					// or instantiate
					localStorage.geodataCache = JSON.stringify({});
					return {};
				}
			})(),
			// Generate array of location names
			locNameArr : function () {
				var arr = [];
				angular.forEach(this.geodata, function (loc) {
					arr.push(loc.name);
				}, this);
				return arr;
			},
			// Return existing geodata object
			getLocation : function (locName) {
				return this.geodata[locName];
			},
			// Add any number of locations to cache
			addLocations : function () {
				var locs = [].slice.call(arguments, 0);
				
				this.queue.push(locs);
				this.runQueue();
			},
			queue : [],
			queueRunning : false,
			// queue additions to cache to prevent callback race
			// conditions
			runQueue : function () {
				var items, newItems = {}, locs;
				if (!this.queueRunning) {
					this.queueRunning = true;
					locs = this.geodata;
					while (this.queue.length > 0) {
						items = this.queue.shift();
						
						angular.forEach(items, function (loc) {
							if (!this.exists(loc)) {
								newItems[loc.name] = loc;
							}
						}, this);
						angular.extend(locs, newItems);
					}
					this.cacheLocations(locs);
					this.queueRunning = false;
				}
			},
			cacheLocations : function (locs) {
				this.geodata = locs;
				// Skip caching in non-HTML5 browsers
				if (!window.localStorage) {
					return;
				} else {
					
					localStorage.geodataCache = JSON.stringify(locs);
				}
			},
			exists : function (loc) {
				// check for location name in stringified storage
				if (window.localStorage) {
					return localStorage.geodataCache.indexOf(loc.name) !== -1;
				} else {
					return false;
				}
			}
		};
	}
})();

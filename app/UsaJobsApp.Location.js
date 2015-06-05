/**
 * @module UsaJobsMap Location module
 * 	   - Job Location object factory
 * 	   - Geocoding Service
 *         - Geodata Caching Service
 */
(function () {
	angular.module('UsaJobsApp.Location', []);
	
	/*
	 * Module Service Registration and Function Binding
	 */
	angular.module('UsaJobsApp.Location').factory('JobLocation', JobLocationFactory);
	angular.module('UsaJobsApp.Location').service('geocodeService', geocodeService);
	angular.module('UsaJobsApp.Location').service('geodataCache', geodataCache);
	
	
	/*
	 * Module Service Functions
	 */
	
	
	/**
	 * JobLocation Object Factory
	 * Job location object that automatically requests its geolocation
	 * when created. Emits a "location available" notification when geodata
	 * is available.
	 */
	JobLocationFactory.$inject = ['geocodeService', 'eventService' ];
	function JobLocationFactory (geocodeService, events) {
		/** @constructor */
		function JobLocation(jobLoc) {
			angular.extend(this, jobLoc);
			// request geocoding
			geocodeService.geocode(this);
		}
		
		/*
		* Prototype Function Bindings
		*/
		JobLocation.prototype.geodataAvailable = geodataAvailable;
		JobLocation.prototype.setGeodata = setGeodata;
		JobLocation.prototype.hasNoGeodata = hasNoGeodata;
		JobLocation.prototype.visible = visible;
		JobLocation.prototype.countVisible = countVisible;
		
		/*
		 * Prototype Functions
		 */

		/**
		 * Emit notification alerting app that geodata is available and include
		 * a reference to this object.
		 */
		function geodataAvailable () {
			events.geodata.available(this);
		}
		
		/**
		 * Broadcast notification to app that geodata could not be found and include
		 * a reference to this object.
		 */
		function hasNoGeodata (errorMsg) {
			this.noGeodataReason = errorMsg;
			events.geodata.notAvailable(this);
		}
		
		/**
		 * Set geographic location for this this object and broadcast notification
		 * of available geodata to app.
		 */
		function setGeodata (geodata) {
			this.geodata = geodata;
			this.geodataAvailable();
		}
		
		/**
		 * Indicate whether this location should be visible on a map. Mark the
		 * location as visible if any of the jobs associated with it are visible.
		 * @returns {Boolean}
		 */
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
		
		/**
		 * Count the number of jobs at this location that are marked as
		 * visible.
		 * @returns {Number}
		 */
		function countVisible () {
			var c = 0;
			angular.forEach(this.jobs, function (job) {
				if (job.visible) c++;
			});
			return c;
		}
		
		return JobLocation;
	}
	
	/**
	 * Geocoding Service
	 * Queues and processes geocoding requests. Designed to accomodate rate limits of geocoding services.
	 * Geodata is cached and used whenever possible.
	 */
	geocodeService.$inject = [ '$http', '$timeout', 'geodataCache' ];
	function geocodeService ($http, $timeout, geodataCache) {
		// Standard query generation and data normalization
		// functions for geocoding services.
		// TODO: Extensible via user-provided query and normalization
		// functions.
		this.geocode = function geocode (location) {
			var geodata;
			// check if location data is cached
			if ((geodata = geodataCache.getLocation(location.name))) {
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
					// TODO: angularize custom attribution
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

				} else if (data.results.length === 0) {
					// Handle no geocode results
					location.hasNoGeodata('Location not found');

				} else {
					// set the location's geodata if there are no errors
					geoLoc = scope.api.normalizeResponse(data);
					geoLoc.name = location.name;
					angular.extend(geodata, geoLoc);
					location.setGeodata(geodata);
					geodataCache.addLocations(geoLoc);
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
				// TODO: See if this status tool is still needed.
			},
			requestCount : 0,
			returnedCount : 0,
			percentage : function () {
				return Math.round((this.returnedCount / this.requestCount * 100));
			}
		};
	}
	
	/**
	 * Geodata Caching Service
	 * Cache and retrieve Geodata from geocoding calls
	 */
	geodataCache.$inject = [ '$timeout' ];
	function geodataCache ($timeout) {
		
		var queue = [], // Geodata cache addition queue
		queueRunning = false, // Status of geodata queue processing
		geodata; 
		
		// The geodata cache
		this.geodata = geodata = (function () {
			// The stringified cache is parsed and returned once at startup
			if (angular.isUndefined(window.localStorage)) {
				// if browser does not support HTML5 local storage, return
				// set empty object placeholder
				return {};
			} else if (angular.isDefined(localStorage.geodataCache)) {
				// on startup, parse and set cached geodata
				return JSON.parse(localStorage.geodataCache);
			} else {
				// or instantiate the cache if it doesn't exist
				localStorage.geodataCache = JSON.stringify({});
				return {};
			}
		})();
		
		/*
		 * Public Function Bindings
		 */
		this.locNameArr = locNameArr;
		this.getLocation = getLocation;
		this.addLocations = addLocations;
		
		/*
		 * Functions
		 */
		
		/**
		 * @public Returns an array of location names
		 * @returns { Array }
		 */
		function locNameArr () {
			var arr = [];
			angular.forEach(this.geodata, function (loc) {
				arr.push(loc.name);
			}, this);
			return arr;
		}
		
		/**
		 * @public Return a cached geolocation, if it exists
		 * @returns { * }
		 */
		function getLocation (locName) {
			return this.geodata[locName];
		};
		
		/**
		 * @public Add all geolocations provided to geodata caching queue
		 * and begin processing.
		 */ 
		function addLocations () {
			var locs = [].slice.call(arguments, 0);
			queue.push(locs);
			runQueue();
		}
		
		/**
		 * @private Add geodata in queue to the cache
		 */
		function runQueue () {
			var items, newItems = {};
			if (!queueRunning) {
				queueRunning = true;
				while (queue.length > 0) {
					items = queue.shift();
					angular.forEach(items, function (loc) {
						// if location doesn't exist in cache,
						// add it to collection of new items
						if (!exists(loc)) {
							newItems[loc.name] = loc;
						}
					}, this);
					// extend locations with new items
					angular.extend(geodata, newItems);
				}
				// Stringify and cache location data
				cacheLocations(geodata);
				queueRunning = false;
			}
		}
		
		/**
		 * @public Stringify and cache provided geodata
		 * @argument { Array } Array of all current geodata
		 */
		function cacheLocations (locs) {
			this.geodata = locs;
			// Cache in localstorage if supported
			if (angular.isDefined(window.localStorage)) {
				localStorage.geodataCache = JSON.stringify(locs);
			}
			// Skip caching in non-HTML5 browsers
		}
		
		/**
		 * @public Check for location name in stringified storage
		 * @argument { JobLocation }
		 * @returns { Boolean }
		 */
		function exists (loc) {
			if (window.localStorage) {
				return localStorage.geodataCache.indexOf(loc.name) !== -1;
			} else {
				return false;
			}
		}
	}
})();

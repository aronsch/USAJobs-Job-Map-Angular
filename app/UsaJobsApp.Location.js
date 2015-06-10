/**
 * @module UsaJobsMap Location module
 * 	   - Job Location Factory
 * 	   - Geocoding Service
 *         - Geodata Caching Service
 */
(function () {
	angular.module('UsaJobsApp.Location', ['UsaJobsApp.Settings']);
	
	/* Service Declaration */
	angular.module('UsaJobsApp.Location').factory('JobLocation', JobLocationFactory);
	angular.module('UsaJobsApp.Location').service('geocodeService', geocodeService);
	angular.module('UsaJobsApp.Location').service('geodataCache', geodataCache);
	
	/* Service Functions */
	
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
		
		/* Prototype Function Bindings */
		JobLocation.prototype.geodataAvailable = geodataAvailable;
		JobLocation.prototype.setGeodata = setGeodata;
		JobLocation.prototype.hasNoGeodata = hasNoGeodata;
		JobLocation.prototype.visible = visible;
		JobLocation.prototype.countVisible = countVisible;
		
		/* Prototype Functions */

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
	geocodeService.$inject = [ '$http', '$timeout', 'geodataCache', 'settings', 'eventService' ];
	function geocodeService ($http, $timeout, geodataCache, settings, events) {

		/* Public Properties */
		this.queue = []; // geocode processing queue
		this.isRunning = false; // current processing status
		this.attributionEmitted = false; // geocode service attribution status
		
		/* Public Function Bindings */
		this.geocode = geocode;
		this.addToQueue = addToQueue;
		this.run = run;
		this.geocodeRun = geocodeRun;
		
		/* Functions */
		
		function geocode (location) {
			var geodata;
			// check if location data is cached
			if ((geodata = geodataCache.getLocation(location.name))) {
				// set geodata from cached location
				location.setGeodata(geodata);
			} else {
				// otherwise, queue for geocoding
				this.addToQueue(location);
			}
			
			if (!this.attributionEmitted) {
				emitAttribution();
			}
		};
		
		function emitAttribution () {
			var str = '<a href="' + settings.geocoding.infoURL + '" ';
			str += 'title="Job locations plotted using ' + settings.geocoding.name + ' Geocoding API" ';
			str += 'target="_blank">' 
			str += settings.geocoding.name;
			str += '</a>';
			events.location.setAttribution(str);
			this.attributionEmitted = true;
		}
		
		function addToQueue (loc) {
			this.queue.push(loc);
			this.run();
		}
		
		// Process the geocoding queue. Calls are rate-limited
		// to comply with API guidelines
		function run (advanceQueue) {
			var scope = this;
			// Dispatch first geocode if queue processing has not started.
			// If the queue is processing, only dispatch next geocode if the
			// function is called from the rate limiter with advanceQueue=true.
			if (!scope.isRunning || scope.isRunning && advanceQueue) {
				scope.isRunning = true;

				if (scope.queue.length > 0) {
					$timeout(function () {
						scope.geocodeRun();
						scope.run(true);
					}, settings.geocoding.rateLimit);
				} else {
					scope.isRunning = false;
				}
			}
		}
		
		function geocodeRun () {
			var scope = this, // closure reference for callbacks
			    location = scope.queue.shift(),
			    geodata = {};
			
			// Request geocoding and store reference to promise object
			geodata.promise = $http.get(settings.geocoding.query(location.name));
			// Success
			geodata.promise.success(function (data, status, q) {
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
					geoLoc = settings.geocoding.normalizeResponse(data);
					geoLoc.name = location.name;
					angular.extend(geodata, geoLoc);
					location.setGeodata(geodata);
					geodataCache.addLocations(geoLoc);
				}
			});
			// Error
			geodata.promise.error(function (data) {
				console.error(data);
			});
		}
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

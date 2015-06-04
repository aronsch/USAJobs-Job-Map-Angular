/**
 * @name UsaJobsApp.Map
 * @module UsaJobsApp Leaflet Map Module - This module receives JobLocation
 *         objects created by the UsaJobsApp.Location module and plots them on a
 *         Leaflet.js map once they have been geocoded.
 *         - Job Map Directive that sets up Leaflet.js map element
 *         - Job Map controller to handle marker management and marker visibility
 *         - Alaska view map control - TODO: make this an external module
 *         - Map reset view map control - TODO: make this a button that doesn't require an asset
 *         - Map default options value 
 */
(function () {
	angular.module('UsaJobsApp.Map', [ 'LeafletModule', 'UsaJobsApp.Settings', 'UsaJobsApp.Utilities',
			'UsaJobsApp.Location', 'UsaJobsApp.Data' ]);
	
	/*
	 * Module Service Declarations and Function Bindings
	 */
	angular.module('UsaJobsApp.Map').directive('jobMap', jobMapDirective);
	angular.module('UsaJobsApp.Map').controller('JobMapController', JobMapController);
	angular.module('UsaJobsApp.Map').factory('akMapControl', akMapControl);
	angular.module('UsaJobsApp.Map').factory('mapResetControl', mapResetControl);
	
	/*
	 * Module Service Functions
	 */

	/**
	 * Job Map Controller
	 */
	JobMapController.$inject = [ '$scope', '$rootScope', 'eventService', 'leaflet', 'unique', 'JobLocation',
			'mapMarkerDefaults', 'Jobs' ];
	function JobMapController ($scope, $rootScope, events, leaflet, unique, JobLocation, markerDefaults, Jobs) {
		/*
		 * Scope variables
		 */
		$scope.jobs = Jobs;
		$scope.markers = []; // Marker tracking collection
		$scope.markerLookup = {}; // Marker lookup collection
		$scope.locations = []; // JobLocation tracking collection
		
		/*
		 * Event bindings
		 */
		events.jobs.onAvailable(onJobsResolved);
		events.jobs.onUpdateVisible(updateVisible);
		events.geodata.onAvailable(onGeodataAvailable);
		events.geodata.onNotAvailable(onGeodataNotAvailable);
		events.jobs.onQueryStarted(resetMarkers);
		/*
		 * Public Function bindings
		 */
		$scope.updateMarkers = updateMarkers;
		$scope.updateVisible = updateVisible;
		$scope.addMarker = addMarker;
		$scope.updatePopup = updatePopup;
		$scope.removeMarker = removeMarker;
		$scope.hideMarkers = hideMarkers;
		$scope.showMarkers = showMarkers;
		$scope.markerLayer = markerLayer;
		$scope.resetMarkers = resetMarkers;
		
		/*
		 * Functions
		 */

		/**
		 * @private Called when Job resources resolves
		 */
		function onJobsResolved () {
			
			// Create visual job count overlay layer
			prepareJobCountLayer();
			
			// Set up job location data
			angular.forEach($scope.jobs.JobData.locations, function (jobLoc, key) {
				// Indicate that a geolocation request is pending
				$scope.geodataStatus.addPending();
				// Create Job Location object
				$scope.jobs.JobData.locations[key] = new JobLocation(jobLoc);
				
			});
			$scope.locations = $scope.jobs.JobData.locations;
		}
		
		/**
		 * @private Add marker to map or update existing marker when new geodata
		 *          becomes available.
		 * @param {Event}
		 *            e Event Object
		 * @param {JobLocation}
		 *            L JobLocation Object
		 */
		function onGeodataAvailable (e, L) {
			addJobCountMarker(L);
			updateMarkerForLoc(L);
			$scope.geodataStatus.addResolved();
		}
		
		/**
		 * @private If a a JobLocation could not be geocoded, add to a list of
		 *          locations without geodata that will be displayed in the map
		 *          UI.
		 * @param {Event}
		 *            e Event Object
		 * @param {JobLocation}
		 *            L JobLocation Object
		 */
		function onGeodataNotAvailable (e, L) {
			$scope.locationsNoGeodata.push(L);
			$scope.locationsNoGeodata.updateJobCount();
			$scope.geodataStatus.addResolved();
			console.log(L);
		}
		
		/**
		 * @public Create a map marker representing a job location. If a marker
		 *         exists for the provided job location, remove and replace with
		 *         updated marker. If it doesn't exist, create it.
		 * @param {JobLocation}
		 *            location JobLocation Object
		 */
		function updateMarkerForLoc (location) {
			var marker;
			if ((marker = $scope.markerLookup[location.name])) {
				$scope.removeMarker(marker);
				delete marker;
				$scope.addMarker(location);
			} else {
				$scope.addMarker(location);
			}
		}
		
		/**
		 * @public Update all markers based on the state of their associated
		 *         `JobLocation`.
		 */
		function updateMarkers () {
			angular.forEach($scope.locations, function (location) {
				if (!location.geodata.$resolved) return;
				updateMarkerForLoc(location);
			});
		}
		
		/**
		 * @public Iterates through all `JobLocation`s and determines if the
		 *         location is visible or hidden based on the visibility of jobs
		 *         at that location. Markers are placed into the `show` and
		 *         `hide` collections based on their current state, then added
		 *         or removed from the map as a batch.
		 */
		function updateVisible () {
			var show = [], hide = [];
			
			angular.forEach($scope.locations, function (location) {
				var marker, visibleCount = location.countVisible(), visible = location.visible();
				
				// Look up marker based on location name. If marker exists,
				// perform visibility update.
				if ((marker = $scope.markerLookup[location.name])) {
					// Check to see if the marker's popup needs to be updated
					// with count of visible jobs
					if (visibleCount !== marker.jobCount && visibleCount > 0) {
						$scope.updatePopup(marker);
					}

					// If a marker has changed state, add it to the appropriate
					// batch operation collection.
					if (!visible && marker.visible) {
						// if location has become invisible, update marker
						// state and add to list of markers to be hidden.
						marker.visible = false;
						hide.push(marker);
					} else if (visible && !marker.visible) {
						// if location has become visible, update marker
						// state and add to list of markers to be shown.
						marker.visible = true;
						show.push(marker);
					}
				}
			}, this);
			
			// Perform batch marker updates.
			$scope.hideMarkers(hide);
			$scope.showMarkers(show);
		}
		
		/**
		 * @public Creates a leaflet marker representing a `JobLocation`. Sets
		 *         custom properties to the marker, adds it to the tracking and
		 *         lookup collections, then adds it to the leaflet map if it is
		 *         currently visible.
		 * @param {JobLocation}
		 *            location - JobLocation object
		 */
		function addMarker (location) {
			var marker;
			
			marker = leaflet.marker([ location.geodata.lat, location.geodata.lon ], {
				title : location.name,
				icon : markerDefaults.defaults.markerIcon()
			});
			marker.jobLocation = location;
			// An existing `JobLocation` may be invisible if job filters
			// are active when the marker is added. New markers inherit
			// visibility from their `JobLocation` or default to visible.
			marker.visible = marker.jobLocation.visible() || true;
			
			$scope.updatePopup(marker);
			
			// attach job count
			marker.jobCount = location.jobs.length;
			
			// add marker to tracking collections
			$scope.markerLookup[location.name] = marker; // lookup object
			$scope.markers.push(marker); // simple array
			
			// add to map only if currently visible
			if (marker.visible) {
				$scope.markerLayer().addLayer(marker);
			}
		}
		
		/**
		 * @public Update marker popup contents based on current `JobLocation`
		 *         state
		 * @param {L.marker}
		 *            marker
		 */
		function updatePopup (marker) {
			var popup = marker.getPopup();
			// add marker popup
			if (!popup) {
				popup = markerDefaults.defaults.popups.popupForLoc(marker.jobLocation);
				marker.bindPopup(popup).openPopup();
			} else {
				popup.setContent(markerDefaults.defaults.popups.contentForLoc(marker.jobLocation));
			}
		}
		
		/**
		 * @public Remove a marker from the map
		 * @param {L.marker}
		 *            marker
		 */
		function removeMarker (marker) {
			$scope.markerLayer().removeLayer(marker);
			$scope.markers.splice($scope.markers.indexOf(marker), 1);
		}
		
		/**
		 * @public Hide a collection of markers by removing them from the map.
		 * @param {Array}
		 *            marker Array of markers
		 */
		function hideMarkers (markers) {
			$scope.markerLayer().removeLayers(markers);

		}
		
		/**
		 * @public Show a collection of markers by adding them from the map.
		 * @param {Array}
		 *            marker Array of markers
		 */
		function showMarkers (markers) {
			$scope.markerLayer().addLayers(markers);
		}
		
		/**
		 * @public Returns the job location marker layer. If marker clustering
		 *         is enabled, the marker cluster layer is returned, rather than
		 *         the default marker layer.
		 * @returns {L.ILayer}
		 */
		function markerLayer () {
			var layer;
			if ($scope.map.markerClusterLayer) {
				layer = $scope.map.markerClusterLayer;
			} else {
				layer = $scope.map;
			}
			return layer;
		}
		
		/**
		 * @public Remove all markers from map and reset geodata tracking
		 *         status.
		 */
		
		function resetMarkers () {
			markerLayer().clearLayers();
			$scope.jobCountLayer.clearLayers();
			$scope.markers.length = 0;
			$scope.markerLookup = {};
			$scope.geodataStatus.reset();
			$scope.locationsNoGeodata.length = 0;
		}
		
		/**
		 * @private Create job count layer that will indicate visually the
		 *          number of jobs at a `JobLocation`.
		 */
		function prepareJobCountLayer () {
			if (angular.isUndefined($scope.jobCountLayer)) {
				// create job count marker layer if it doesn't exist
				$scope.jobCountLayer = leaflet.layerGroup();
				$scope.map.addLayer($scope.jobCountLayer);
			} else {
				// if it exists, remove all current job count marker sub-layers
				$scope.jobCountLayer.clearLayers();
			}
			
			$scope.map.on('zoomend', function (e) {
				var zoom = $scope.map.getZoom();
				if (zoom >= 4) {
					// adjust radius and opacity based on zoom
					angular.forEach($scope.jobCountLayer._layers,
						function (c) {
							// scale jobcount overlays up as we zoom in
							c.setRadius(c.startRadius
									* (zoom - $scope.mapOptions.zoom + 1));
							// reduce opacity as we zoom in so map detail is visible
							c.options.fillOpacity = c.startOpacity
									- ((c.startOpacity / ($scope.mapOptions.maxZoom - $scope.mapOptions.minZoom)) * (zoom - $scope.mapOptions.zoom));
							c.options.weight = countCircleWeight(c);
							// trigger overlay update
							c._updateStyle();
						});
				}
				if (zoom < 4) {
					angular.forEach($scope.jobCountLayer._layers, function (c) {
						// hide overlay when zoomed out to avoid clutter
						c.options.fillOpacity = 0;
						// trigger overlay update
						c._updateStyle();
					});
				}
				
				function countCircleWeight (c) {
					// increase circle stroke weight when zooming in past default zoom
					return c.startWeight * (zoom > $scope.mapOptions.zoom ? (zoom - $scope.mapOptions.zoom + 1) : 1);
				}
			});
		}
		
		/**
		 * @private Creates an additional marker layer where non-interactive
		 *          circles corresponding to the number of jobs at location are
		 *          drawn.
		 * @param location
		 *            {JobLocation}
		 */
		function addJobCountMarker (location) {
			var maxSize, minSize, maxOpacity, minOpacity, marker;
			
			maxSize = 20;
			minSize = 3;
			maxOpacity = 0.9;
			minOpacity = 0.3;
			
			marker = L.circleMarker([ location.geodata.lat, location.geodata.lon ], {
				title : location.name,
				zIndexOffset : -location.jobs.length,
				radius : Math.min(2 * location.jobs.length, 35),
				stroke : false,
				color : '#C4721F',
				weight : 0,
				opacity : 0.5,
				clickable : false,
				fill : true,
				fillColor : '#C4721F',
				fillOpacity : 0.5
			});
			marker.location = location;
			marker.startRadius = marker._radius.valueOf();
			marker.startOpacity = marker.options.fillOpacity.valueOf();
			marker.startWeight = marker.options.weight.valueOf();
			$scope.jobCountLayer.addLayer(marker);
		}
		
		function percentageOfRange (min, max, percentage) {
			return min + ((max - min) * percentage);
		}
		
		function percentageOfRangeInverted (min, max, percentage) {
			return max - ((max - min) * percentage);
		}
	}
	
	/**
	 * Job Map Directive
	 * 
	 * @scope
	 */
	jobMapDirective.$inject = [ '$compile', 'leaflet', 'akMapControl', 'mapResetControl',
			'mapMarkerDefaults', 'settings' ];
	function jobMapDirective ($compile, leaflet, akMapControl, mapResetControl, markerDefaults, settings) {
		return {
			restrict : 'E',
			controller : 'JobMapController',
			scope : {},
			link : function postLink (scope, element, attrs) {
				// Add 'usajob-map' class to target element that map will
				// be placed in
				element.addClass('usajobs-map');
				
				// Extend scope with map properties
				scope.mapOptions = settings.map;
				
				// Add geodata tracking object
				scope.geodataStatus = {
					loading : false,
					resolvedCount : 0,
					pendingCount : 0,
					addPending : function () {
						this.pendingCount += 1;
						this.loading = true;
					},
					addResolved : function () {
						this.resolvedCount += 1;
						if (this.resolvedCount === this.pendingCount) {
							this.loading = false;
						}
					},
					reset : function () {
						this.resolvedCount = 0;
						this.pendingCount = 0;
					}
				};
				
				// Add geodata tracking UI element
				addGeodataStatusEl();
				// No Geodata Found List
				addNoGeolocList();
				
				$compile(element.contents())(scope);
				// Set up Leaflet map
				scope.map = leafletMap();
				
				/*
				 * Functions
				 */
				function addGeodataStatusEl () {
					var el = angular
							.element('<div class="geodata-status center-block" ng-show="geodataStatus.loading"><i class="fa fa-fw fa-circle-o-notch fa-spin"></i> {{ geodataStatus.resolvedCount }} of {{ geodataStatus.pendingCount }} job locations mapped</div>');
					// $compile(el)(scope);
					element.append(el);
				}
				
				function addNoGeolocList () {
					var el = '';
					
					// Add collection for locations with no geodata found
					scope.locationsNoGeodata = [];
					scope.locationsNoGeodata.maximized = false; // start minimized
					scope.locationsNoGeodata.jobCount = 0;
					scope.locationsNoGeodata.updateJobCount = function () {
						var c = 0;
						angular.forEach(this, function (location) {
							c += location.jobs.length;
						});
						this.jobCount = c;
					};
					
					el += '<div class="loc-no-geodata-list" ng-show="locationsNoGeodata.length > 0">';
					el += '<h5>{{ locationsNoGeodata.jobCount }} Job<span ng-hide="locationsNoGeodata.jobCount === 1">s</span> Not on Map <small><a ng-click="locationsNoGeodata.maximized = !locationsNoGeodata.maximized">{{locationsNoGeodata.maximized ? \'Hide\' : \'Show\' }}</a></small></h5>';
					el += '<div ng-show="locationsNoGeodata.maximized" class="loc-no-geodata-list-container">';
					el += '<div ng-repeat="location in locationsNoGeodata">';
					el += '<h6 class="small bold">{{location.name}}</h6>';
					el += '<p class="alert alert-warning small">{{ location.noGeodataReason }}</p>';
					el += '<ul class="loc-popup-job-list list-unstyled">';
					el += '<li class="loc-popup-job-list-item clearfix" ng-repeat="job in location.jobs">';
					el += '<a class="loc-popup-job-list-item-link" ng-href="{{ job.ApplyOnlineURL }}" target="_blank" title="{{ job.JobTitle }}\r\nClick to go to USAJobs.gov and view this job announcement">{{ job.JobTitle }}</a>';
					el += '<span class="loc-popup-job-list-item-tag small" title="Grade">{{job.PayPlan + \'&#8209;\' + job.Grade}}</span>';
					el += '<span class="loc-popup-job-list-item-tag pull-right small" title="Salary">{{job.SalaryMin + \'&#8209;\' + job.SalaryMax | trailingzeroes}}</span>';
					el += '</li>';
					el += '</ul><hr>';
					el += '</div>';
					el += '</div>';
					el += '</div>';
					element.append(angular.element(el));
				}
				
				/**
				 * @private Create Leaflet.js map element
				 */
				function leafletMap () {
					var map, tileLayer;
					map = leaflet.map(element[0], {
						center : scope.mapOptions.center,
						zoom : scope.mapOptions.zoom,
						attributionControl : scope.mapOptions.attributionControl,
						zoomControl : false,
						scrollWheelZoom : scope.mapOptions.scrollWheelZoom,
						worldCopyJump : true
					});
					
					// map tile layer
					tileLayer = leaflet
							.tileLayer(
								'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
								{
									subdomains : 'abc',
									detectRetina : true,
									attribution : '<a target="_blank" href="http://www.openstreetmap.org/copyright" title="Map data &#169;OpenStreetMap contributors">&#169; OpenStreetMap contributors</a>',
									maxZoom : scope.mapOptions.maxZoom,
									minZoom : scope.mapOptions.minZoom
								});
					
					tileLayer.addTo(map);
					
					// map utility functions
					map.resetMapView = resetMapView;
					map.mapViewCentered = mapViewCentered;
					map.mapAtDefaultZoom = mapAtDefaultZoom;
					map.mapCenterInBounds = mapCenterInBounds;
					
					// Fit view to user-provided bounds, if present
					if (scope.bounds) map.fitBounds(scope.bounds);
					
					// marker clustering plugin and options, if enabled
					if (scope.mapOptions.markerClustering) {
						map.markerClusterLayer = new leaflet.markerClusterGroup({
							maxClusterRadius : 35,
							showCoverageOnHover : false,
							iconCreateFunction : function (cluster) {
								return new leaflet.DivIcon({
									className : 'clusterIcon',
									html : markerDefaults.defaults.cluster.clusterContent(cluster)
								});
							}
						});
						map.addLayer(map.markerClusterLayer);
					}
					
					// Map Zoom UI Control on desktop browser
					if (!leaflet.Browser.mobile && !leaflet.Browser.touch) {
						map.addControl(leaflet.control.zoom({
							position : 'bottomleft'
						}));
					}
					
					// Add nonstandard controls and user-provided controls
					angular.forEach([ mapResetControl, akMapControl ], function (control) {
						map.addControl(new control());
					});
					
					// Add Event Listeners
					map.on('zoomstart', handleZoomStart);
					
					/**
					 * @private Handler triggered on map `zoomStart` event
					 */
					function handleZoomStart () {
						map.closePopup();
					}
					
					/**
					 * @public reset map view to default state
					 */ 
					function resetMapView () {
						if (scope.bounds) {
							map.fitBounds(scope.bounds);
						} else {
							map.setView(scope.mapOptions.center, scope.mapOptions.zoom);
						}
					}
					
					/**
					 * @public Accounting for drift, determine if the map is at its
					 * starting position.
					 */ 
					function mapViewCentered () {
						// Determine if map ic centered. Allow for slight drift.
						return map.getCenter().distanceTo(scope.mapOptions.center) < 20000;
					}
					
					/**
					 * @public Determine whether the map is at the default zoom level
					 */ 
					function mapAtDefaultZoom () {
						return map.getZoom() === map.options.zoom;
					}
					
					function mapCenterInBounds (bounds) {
						bounds.contains(map.getCenter());
					}
					
					return map;
				}
			}
		};
	}
	
	/**
	 * Default Map Markers provider
	 */
	angular.module('UsaJobsApp.Map').service('mapMarkerDefaults', mapMarkerDefaults);
	mapMarkerDefaults.$inject = [ '$filter', 'unique', 'leaflet', 'settings' ];
	function mapMarkerDefaults ($filter, unique, leaflet, settings) {
		
		this.defaults = {
			/**
			 * @private Returns the default map marker icon.
			 * @returns {*}
			 */
			markerIcon : function () {
				return L.icon(settings.assets.jobLocation);
			},
			popups : {
				/**
				 * @private Generate popup for the default marker icon.
				 * @param {JobLocation}
				 *            aLoc
				 * @returns {*}
				 */
				popupForLoc : function (aLocation) {
					var thePopup;
					
					thePopup = leaflet.popup({
						maxWidth : 250,
						autoPanPaddingTopLeft : leaflet.point(12, 12),
						autoPanPaddingBottomRight : leaflet.point(12, 36)
					});
					
					thePopup.setContent(this.contentForLoc(aLocation));
					return thePopup;
				},
				/**
				 * @private Marker popup content for default map marker.
				 * @param {JobLocation}
				 *            theLoc
				 * @returns {String}
				 */
				contentForLoc : function (location) {
					var jobs, jobsVisible, jobCountStr, len, div, ul, li, a, spanSal, spanGrd;
					
					jobs = location.jobs;
					jobsVisible = location.countVisible();
					
					len = jobs.length;
					// pluralize job count description
					jobCountStr = len + ' vacanc' + (len === 1 ? 'y' : 'ies');
					if (len !== jobsVisible) {
						jobCountStr += ', ' + jobsVisible + ' matching filters';
					}
					div = angular.element("<div class='loc-popup' />");
					div.append(angular.element('<h5 class="loc-popup-title bold">').html(
							location.name + '<br>' + '<span class="small text-muted">' + jobCountStr + '</span>'));
					
					ul = angular.element('<ul class="loc-popup-job-list list-unstyled" />');
					angular
							.forEach(
									jobs,
									function (job) {
										if (!job.visible) return;
										li = angular.element('<li class="loc-popup-job-list-item clearfix"></li>');
										a = angular
												.element('<a class="loc-popup-job-list-item-link"></a>')
												.attr('href', job.ApplyOnlineURL)
												.attr('target', '_blank')
												.html(job.JobTitle.replace(/-/g, '&#8209;'))
												.attr(
														'title',
														job.JobTitle
																+ '\r\nClick to go to USAJobs.gov and view this job announcement');
										spanGrd = angular.element(
												'<span class="loc-popup-job-list-item-tag small"></span>').html(
												job.PayPlan + '&#8209;' + job.Grade).attr('title', 'Grade');
										spanSal = angular.element(
												'<span class="loc-popup-job-list-item-tag pull-right small"></span>')
												.html(
														$filter('trailingzeroes')(
																job.SalaryMin + '&#8209;' + job.SalaryMax)).attr(
														'title', 'Salary');
										
										li.append(a);
										li.append(spanGrd);
										li.append(spanSal);
										ul.append(li);
									}, this);
					
					div.append(ul);
					
					return div.html();
				}
			},
			cluster : {
				miniIconURL : settings.assets.jobLocation.miniIconUrl,
				clusterContent : function (cluster) {
					
					var i, len, rowItems, div, wrapper, img;
					
					// limit to 9 icons
					len = Math.min(cluster.getChildCount(), 9);
					rowItems = 3;
					// lower top margin every 3 icons so all the icons stay in
					// the div
					div = angular.element('<div/>');
					wrapper = angular.element('<div/>').addClass('markercluster-icon-img-wrapper').css('margin-top',
							this.contentTopMargin(len, rowItems));
					wrapper.attr('title', 'Click to zoom to these locations: \r\n\r\n'
							+ this.locationsInCluster(cluster).join('\r\n'));
					for (i = 0; i < len; i++) {
						img = angular.element('<img />').addClass('markercluster-icon-img').attr('src',
								this.miniIconURL);
						wrapper.append(img);
					}
					
					div.append(wrapper);
					return div.html();
				},
				
				locationsInCluster : function (aCluster) {
					var locsInCluster = [];
					
					function getLocsInCluster (bCluster) {
						// recurse through cluster tree and generate list of
						// location names and job counts
						var i, marker, desc, len;
						
						for (i = 0; i < bCluster._markers.length; ++i) {
							marker = bCluster._markers[i];
							len = marker.jobCount;
							// pluralize job description
							desc = marker.options.title + ' (' + len + ' vacanc' + (len === 1 ? 'y' : 'ies') + ')';
							locsInCluster.push(desc);
						}
						
						for (i = 0; i < bCluster._childClusters.length; i++) {
							getLocsInCluster(bCluster._childClusters[i]);
						}
					}
					
					getLocsInCluster(aCluster);
					
					return unique(locsInCluster).sort();
				},
				contentTopMargin : function (len, rowItems) {
					var constant, offset, m;
					constant = 12; // margin constant
					offset = 4; // offset increment
					m = constant;
					if (len > rowItems && len <= rowItems * 2) {
						m = constant - offset;
					} else if (len > rowItems * 2) {
						m = constant - (offset * 2);
					}
					return m.toString() + 'px';
				}
			}
		};
	}
	
	/**
	 * Alaska Control TODO: Replace with general purpose out-of-view indicator
	 */
	akMapControl.$inject = [ 'leaflet' ];
	function akMapControl (leaflet) {
		return leaflet.Control.extend({
			options : {
				position : 'topleft'
			},
			onAdd : function (map) {
				var container, img, imgURL, akBounds, isRetina = window.devicePixelRatio >= 1.5;
				
				imgURL = isRetina ? 'http://www.bia.gov/cs/groups/webteam/documents/document/vacmap_ak_icon_retina.png'
						: 'http://www.bia.gov/cs/groups/webteam/documents/document/vacmap_ak_icon.png';
				
				container = leaflet.DomUtil.create('div', 'alaska-view-control');
				akBounds = leaflet.latLngBounds([ [ 54.27, -129.31 ], [ 67.13, -165.94 ] ]);
				
				img = leaflet.DomUtil.create('img', 'alaska-view-control-img', container);
				$(img).attr('src', imgURL).css('width', '61px').css('height', '51px');
				
				// move map view to Alaska bounding box when clicked
				leaflet.DomEvent.addListener(container, 'click', leaflet.DomEvent.stopPropagation).addListener(
						container, 'click', leaflet.DomEvent.preventDefault).addListener(container, 'click',
						function () {
							map.closePopup();
							map.fitBounds(akBounds);
						});
				
				// hide when map view center is within AK bounds;
				// show when map view center is outide AK bounds;
				// do not show when not a default zoom level
				// not at default zoom level
				map.on('zoomend', function (e) {
					if (e.target.mapCenterInBounds(akBounds) && e.target.mapAtDefaultZoom()) {
						angular.element(container).show();
					} else {
						angular.element(container).hide();
					}
				});
				map.on('moveend', function (e) {
					if (!e.target.mapCenterInBounds(akBounds)) {
						angular.element(container).show();
					} else {
						angular.element(container).hide();
					}
				});
				return container;
			}
		});
	}
	
	/**
	 * Alaska View Control
	 */
	mapResetControl.$inject = [ 'leaflet' ];
	function mapResetControl (leaflet) {
		return leaflet.Control
				.extend({
					options : {
						position : 'topright'
					},
					onAdd : function (map) {
						var container, img, imgURL, isRetina = window.devicePixelRatio >= 1.5;
						
						imgURL = isRetina ? 'http://www.bia.gov/cs/groups/webteam/documents/document/vacmap_zoomreturn_icon_retina.png'
								: 'http://www.bia.gov/cs/groups/webteam/documents/document/vacmap_zoomreturn_icon.png';
						
						// container = leaflet.DomUtil.create('div',
						// 'map-viewreset-control');
						container = leaflet.DomUtil.create('div', 'map-viewreset-control');
						img = leaflet.DomUtil.create('img', 'map-viewreset-control-img', container);
						$(img).attr('src', imgURL).css('width', '100px').css('height', '73px');
						
						$(container).hide();
						// return map view to starting view when clicked
						// provides users an escape hatch while exploring the
						// map
						leaflet.DomEvent.addListener(container, 'click', leaflet.DomEvent.stopPropagation).addListener(
								container, 'click', leaflet.DomEvent.preventDefault).addListener(container, 'click',
								function () {
									map.closePopup();
									map.resetMapView();
								});
						
						// show when map view is not at starting zoom
						map.on('zoomend', function (e) {
							if (e.target.mapAtDefaultZoom()) {
								$(container).fadeIn(100);
							} else {
								$(container).fadeOut(100);
							}
						});
						
						// show when map view center moves from starting
						// position
						map.on('moveend', function (e) {
							if (!e.target.mapViewCentered()) {
								$(container).fadeIn(100);
							} else {
								$(container).fadeOut(100);
							}
						});
						
						return container;
					}
				});
	}
})();

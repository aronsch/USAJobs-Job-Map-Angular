(function () {
    /**
     * @module UsaJobsApp Leaflet Map Module - This module receives JobLocation
     *         objects created by the UsaJobsApp.Location module and plots them on a
     *         Leaflet.js map once they have been geocoded.
     *         - Job Map Directive that sets up Leaflet.js map element
     *         - Job Map controller to handle marker management and marker visibility
     *         - Map Control - Map view reset control generator
     *         - Map Control - Show all markers control generator
     *         - Map marker defaults provider
     */

        // Map Service Declarations
    angular.module('UsaJobsApp').controller('JobMapController', JobMapController);
    angular.module('UsaJobsApp').directive('jobMap', jobMapDirective);
    angular.module('UsaJobsApp').factory('mapResetControl', mapResetControl);
    angular.module('UsaJobsApp').factory('mapShowAllControl', mapShowAllControl);
    angular.module('UsaJobsApp').service('markers', markers);

    // Map Module Functions

    /**
     * Job Map Controller
     */
    JobMapController.$inject = ['$scope', 'eventService', 'leaflet',
        'markers', 'Jobs'];
    function JobMapController($scope, events, leaflet, markers, Jobs) {
        /* Scope variables */
        $scope.jobs = Jobs;
        $scope.markers = []; // Marker tracking collection
        $scope.markerLookup = {}; // Marker lookup collection
        $scope.locations = []; // JobLocation tracking collection

        /* Event bindings */
        events.jobs.onUpdateVisible(updateVisible);
        events.jobs.onQueryStarted(resetMarkers);
        events.jobs.onAvailable(onJobsResolved);

        /* Public Function bindings */
        $scope.updateMarkers = updateMarkers;
        $scope.updateVisible = updateVisible;
        $scope.addMarker = addMarker;
        $scope.updatePopup = updatePopup;
        $scope.removeMarker = removeMarker;
        $scope.hideMarkers = hideMarkers;
        $scope.showMarkers = showMarkers;
        $scope.resetMarkers = resetMarkers;

        /* Functions */

        /** @private
         * Called when Job query resolves
         */
        function onJobsResolved() {
            $scope.locations = $scope.jobs.JobData.locations;
            handleGeodata();
            updateMarkers();

        }

        function handleGeodata() {
            $scope.locationsNoGeodata = [];

            angular.forEach($scope.locations, function (location) {
                if (location.noGeodata)  {
                    $scope.locationsNoGeodata.push(location);
                } else {
                    events.geodata.available(location);
                }
            });
        }

        /**
         * @public
         * Create a map marker representing a job location. If a marker
         * exists for the provided job location, remove and replace with
         * updated marker. If it doesn't exist, create it.
         * @param {*} location JobLocation Object
         */
        function updateMarkerForLoc(location) {
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
         * @public
         * Update all markers based on the state of their associated `JobLocation`.
         */
        function updateMarkers() {
            angular.forEach($scope.locations, function (location) {
                if (!location.noGeodata) {
                    updateMarkerForLoc(location);
                }
            });
        }

        /**
         * @public
         * Iterates through all `JobLocation`s and determines if the
         * location is visible or hidden based on the visibility of jobs
         * at that location. Markers are placed into the `show` and
         * `hide` collections based on their current state, then added
         * or removed from the map as a batch.
         */
        function updateVisible() {

            var show = [], hide = [];
            angular.forEach($scope.locations, function (location) {
                var marker,
                    visibleCount = location.countVisible(),
                    visible = location.visible();

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
         * @public
         * Create a leaflet marker representing a `JobLocation`. Sets
         * custom properties to the marker, adds it to the tracking and
         * lookup collections, then adds it to the leaflet map if it is
         * currently visible.
         * @param {JobLocation} location
         */
        function addMarker(location) {
            var marker;

            marker = leaflet.marker([location.Latitude, location.Longitude], {
                title: location.LocationName,
                icon: markers.markerIcon
            });
            marker.jobLocation = location;
            // An existing `JobLocation` may be invisible if job filters
            // are active when the marker is added. New markers inherit
            // visibility from their `JobLocation` or default to visible.
            marker.visible = marker.jobLocation.visible() || true;

            // Update popup content to reflect current JobLocation state
            $scope.updatePopup(marker);

            // attach job count
            marker.jobCount = location.jobs.length;

            // add marker to tracking collections
            $scope.markerLookup[location.name] = marker; // lookup object
            $scope.markers.push(marker); // simple array

            // add to map only if currently visible
            if (marker.visible) {
                $scope.map.markerLayer.addLayer(marker);
            }
        }

        /**
         * @public
         * Update marker popup contents based on current {JobLocation} state
         * @param {L.marker} marker
         */
        function updatePopup(marker) {
            var popup = marker.getPopup();
            // add marker popup
            if (!popup) {
                popup = markers.popups.popupForLoc(marker.jobLocation);
                marker.bindPopup(popup).openPopup();
            } else {
                popup.setContent(markers.popups.contentForLoc(marker.jobLocation));
            }
        }

        /**
         * @public
         * Remove a marker from the map.
         * @param {L.marker} marker Leaflet marker
         */
        function removeMarker(marker) {
            $scope.map.markerLayer.removeLayer(marker);
            $scope.markers.splice($scope.markers.indexOf(marker), 1);
        }

        /**
         * @public
         * Hide a collection of markers by removing them from the map.
         * @param {Array.<L.marker>} markers Array of Leaflet markers
         */
        function hideMarkers(markers) {
            $scope.map.removeMarkers(markers);
        }

        /**
         * @public
         * Show a collection of markers by adding them from the map.
         * @param {Array} markers Array of Leaflet markers
         */
        function showMarkers(markers) {
            $scope.map.addMarkers(markers);
        }

        /**
         * @public
         * Remove all markers from map and reset geodata tracking status.
         */
        function resetMarkers() {
            $scope.map.resetAllMarkersBounds();
            $scope.map.markerLayer.clearLayers();
            $scope.jobCountLayer.clearLayers();
            $scope.markers.length = 0;
            $scope.markerLookup = {};
            $scope.locationsNoGeodata.length = 0;
        }
    }

    /**
     * Job Map Directive
     *
     * @scope
     */
    jobMapDirective.$inject = ['$compile', 'leaflet', 'mapResetControl', 'mapShowAllControl',
        'markers', 'settings', 'eventService', 'usStatesGeoJsonSetup'];
    function jobMapDirective($compile, leaflet, mapResetControl, mapShowAllControl,
                             markers, settings, events, geoJsonSetup) {
        return {
            restrict: 'E',
            controller: 'JobMapController',
            scope: {},
            link: function postLink(scope, element) {
                // Add 'usajob-map' class to target element that map will
                // be placed in
                element.addClass('usajobs-map');

                // Extend scope with map properties
                scope.mapOptions = settings.map;

                // Add No Geodata Available List
                addNoGeolocList();

                // compile any added ng templates
                $compile(element.contents())(scope);
                // Set up Leaflet map
                scope.map = leafletMap();

                /*
                 * Functions
                 */

                function addNoGeolocList() {
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

                    // TODO: implement as template in templateCache
                    el += '<div class="loc-no-geodata-list" ng-show="locationsNoGeodata.length > 0">';
                    el += '<h5>{{ locationsNoGeodata.jobCount }} Job<span ng-hide="locationsNoGeodata.jobCount === 1">s</span> Not Shown ';
                    el += '<small><span class="btn btn-xs btn-info" style="margin-bottom: 0;" ng-click="locationsNoGeodata.maximized = !locationsNoGeodata.maximized">{{locationsNoGeodata.maximized ? \'Hide\' : \'Show\' }}</span></small></h5>';
                    el += '<div ng-show="locationsNoGeodata.maximized" class="loc-no-geodata-list-container">';
                    el += '<div ng-repeat="location in locationsNoGeodata">';
                    el += '<h6 class="small bold">{{location.name}}</h6>';
                    el += '<ul class="loc-popup-job-list list-unstyled">';
                    el += '<li class="loc-popup-job-list-item clearfix" ng-repeat="job in location.jobs">';
                    el += '<a class="loc-popup-job-list-item-link" ng-href="{{ job.applyUrl() }}" target="_blank" title="{{ job.PositionTitle }}\r\nView this job announcement on USAJobs.gov">{{ job.PositionTitle }}</a>';
                    el += '<span class="loc-popup-job-list-item-tag small" title="Grade">{{ job | gradeRangeDesc }}</span>';
                    el += '<span class="loc-popup-job-list-item-tag small" title="Salary">{{job.salaryMinString + \'&#8209;\' + job.salaryMaxString}}</span>';
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
                function leafletMap() {
                    var map, tileLayer;
                    map = leaflet.map(element[0], {
                        center: scope.mapOptions.center,
                        zoom: scope.mapOptions.zoom,
                        attributionControl: false,
                        zoomControl: false,
                        scrollWheelZoom: scope.mapOptions.scrollWheelZoom,
                        worldCopyJump: true
                    });
                    // starting bounds
                    map.startBounds = map.getBounds();
                    // bounds containing all markers - modified on geoDataAvailable event
                    map.allMarkersBounds = map.getBounds();
                    // changed to true after user interacts with map
                    map.userHasTouchedMap = false;

                    // map tile layer
                    tileLayer = leaflet.tileLayer(
                        'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        {
                            subdomains: 'abc',
                            detectRetina: true,
                            attribution: '<a target="_blank" href="http://www.openstreetmap.org/copyright" title="Map data &#169;OpenStreetMap contributors">&#169; OpenStreetMap contributors</a>',
                            maxZoom: scope.mapOptions.maxZoom,
                            minZoom: scope.mapOptions.minZoom
                        });

                    tileLayer.addTo(map);

                    // map utility functions
                    map.addMarkers = addMarkers;
                    map.removeMarkers = removeMarkers;
                    map.resetMapView = resetMapView;
                    map.mapViewCentered = mapViewCentered;
                    map.mapAtDefaultZoom = mapAtDefaultZoom;
                    map.inBounds = inBounds;
                    map.inStartBounds = inStartBounds;
                    map.showAllMarkers = showAllMarkers;
                    map.resetAllMarkersBounds = resetAllMarkersBounds;
                    map.markersOutsideBounds = markersOutsideBounds;

                    // Fit view to user-provided bounds, if present
                    if (scope.bounds) map.fitBounds(scope.bounds);

                    // marker clustering plugin and options, if enabled
                    if (scope.mapOptions.markerClustering) {
                        map.markerLayer = new leaflet.markerClusterGroup({
                            maxClusterRadius: 35,
                            showCoverageOnHover: false,
                            iconCreateFunction: function (cluster) {
                                return new leaflet.DivIcon({
                                    className: 'clusterIcon',
                                    html: markers.cluster.clusterContent(cluster)
                                });
                            }
                        });
                    } else {
                        map.markerLayer = new leaflet.LayerGroup();
                    }
                    map.addLayer(map.markerLayer);

                    // job count markers, if enabled
                    if (scope.mapOptions.jobCountOverlay) {
                        // Set up over job count overlay layer
                        prepareJobCountLayer();
                        // Set event geodata event listener to trigger
                        // adding overlay
                        events.geodata.onAvailable(function (e, L) {
                            addJobCountOverlay(L);
                        });
                    }

                    // Map Zoom UI Control on desktop browser
                    if (!leaflet.Browser.mobile && !leaflet.Browser.touch) {
                        map.addControl(leaflet.control.zoom({
                            position: 'bottomleft'
                        }));
                    }

                    // Add nonstandard controls and user-provided controls
                    angular.forEach([mapResetControl, mapShowAllControl], function (control) {
                        map.addControl(new control());
                    });

                    // Add Event Listeners
                    map.on('zoomstart', handleZoomStart);
                    map.on('mousemove', handleInteractionStart);
                    map.on('mousedown', handleInteractionStart);

                    // add map feature geodata
                    geoJsonSetup(map);

                    /**
                     * @private
                     * Handler triggered on map `movestart` event
                     */
                    function handleInteractionStart() {
                        map.userHasTouchedMap = true;
                    }

                    /**
                     * @private
                     * Handler triggered on map `zoomStart` event
                     */
                    function handleZoomStart() {
                        map.closePopup();
                    }

                    /**
                     * @public
                     * Add all markers in array to map.
                     * @param {Array.<L.marker>} markers
                     */
                    function addMarkers(markers) {
                        var i;
                        if (scope.mapOptions.markerClustering) {
                            map.markerLayer.addLayers(markers);
                        } else {
                            for (i = 0; i < markers.length; i++) {
                                map.addLayer(markers[i]);
                            }
                        }
                    }

                    /**
                     * @public
                     * Remove all markers in array to map.
                     * @param {Array.<L.marker>} markers
                     */
                    function removeMarkers(markers) {
                        var i;
                        if (scope.mapOptions.markerClustering) {
                            map.markerLayer.removeLayers(markers);
                        } else {
                            for (i = 0; i < markers.length; i++) {
                                map.removeLayer(markers[i]);
                            }
                        }
                    }

                    /**
                     * @public
                     * Reset map view to starting state.
                     */
                    function resetMapView() {
                        if (scope.bounds) {
                            map.fitBounds(scope.bounds);
                        } else {
                            map.setView(scope.mapOptions.center, scope.mapOptions.zoom);
                        }
                    }

                    /**
                     * @public Adjust map to show all JobLocation markers
                     */
                    function showAllMarkers() {
                        map.fitBounds(map.allMarkersBounds, {paddingTopLeft: [55, 35]});
                    }

                    /**
                     * @public Reset bounds that shows all marker to original map state.
                     */
                    function resetAllMarkersBounds() {
                        map.allMarkersBounds = new leaflet.latLngBounds(map.startBounds.getSouthWest(),
                            map.startBounds.getNorthEast());
                    }

                    /**
                     * @public Test to see if any visible markers are outside the current view bounds
                     * @returns {Boolean}
                     */
                    function markersOutsideBounds() {
                        var outsideBounds = false;
                        map.markerLayer.eachLayer(function (m) {
                            if (!map.inBounds(m.jobLocation) && m.jobLocation.visible()) {
                                outsideBounds = true;
                            }
                        });
                        return outsideBounds;
                    }

                    /**
                     * @public Test to see if `location` is within current view bounds
                     * @param {JobLocation} loc
                     * @returns {Boolean}
                     */
                    function inBounds(loc) {
                        return map.getBounds().contains([loc.Latitude, loc.Longitude]);
                    }

                    /**
                     * @public
                     * Test to see if JobLocation is within map view starting bounds
                     * @param {JobLocation} loc
                     * @returns {Boolean}
                     */
                    function inStartBounds(loc) {
                        return map.startBounds.contains([loc.Latitude, loc.Longitude]);
                    }

                    /**
                     * @public
                     * Accounting for drift, test if the map is at its starting position.
                     * @returns {Boolean}
                     */
                    function mapViewCentered() {
                        // Determine if map is centered. Allow for slight drift.
                        return map.getCenter().distanceTo(scope.mapOptions.center) < 20000;
                    }

                    /**
                     * @public
                     * Test whether the map is at the default zoom level.
                     * @returns {Boolean}
                     */
                    function mapAtDefaultZoom() {
                        return map.getZoom() === map.options.zoom;
                    }

                    /**
                     * @private
                     * Create job count layer that will visually indicate the
                     * number of jobs at a `JobLocation`.
                     */
                    function prepareJobCountLayer() {
                        if (angular.isUndefined(scope.jobCountLayer)) {
                            // create job count marker layer if it doesn't exist
                            scope.jobCountLayer = leaflet.layerGroup();
                            map.addLayer(scope.jobCountLayer);
                        } else {
                            // if it exists, remove all current layers
                            scope.jobCountLayer.clearLayers();
                        }

                        // Map `zoomend` event listener
                        map.on('zoomend', handleZoomEnd);

                        /**
                         * On zoom level change, update job count circle size and transparency.
                         * Circles get larger as you zoom, but become increasingly transparent
                         * so that zoomed map details are not occluded.
                         */
                        function handleZoomEnd() {
                            var zoom = scope.map.getZoom();
                            if (zoom >= 4) {
                                // adjust radius and opacity based on zoom
                                angular.forEach(scope.jobCountLayer._layers,
                                    function (c) {
                                        // scale jobcount overlays up as we zoom in
                                        c.setRadius(c.startRadius * (zoom - scope.mapOptions.zoom));
                                        // reduce opacity as we zoom in so map detail is visible
                                        c.options.fillOpacity = c.startOpacity - ((c.startOpacity / (scope.mapOptions.maxZoom - scope.mapOptions.minZoom)) * (zoom - scope.mapOptions.zoom));
                                        // Dynamically adjust stroke weight based on zoom level
                                        c.options.weight = countCircleWeight(c);
                                        // trigger overlay update
                                        c._updateStyle();
                                    });
                            }
                            if (zoom < 4) {
                                angular.forEach(scope.jobCountLayer._layers, function (c) {
                                    // hide overlay when zoomed out to avoid clutter
                                    c.options.fillOpacity = 0;
                                    // trigger overlay update
                                    c._updateStyle();
                                });
                            }

                            /**
                             * Dynamically adjust job count circle stroke weight based on zoom level.
                             * TODO: Determine if this is still useful
                             * @param c
                             * @returns {number}
                             */
                            function countCircleWeight(c) {
                                // increase circle stroke weight when zooming in past default zoom
                                return c.startWeight * (zoom > scope.mapOptions.zoom ? (zoom - scope.mapOptions.zoom + 1) : 1);
                            }
                        }
                    }

                    /**
                     * @private
                     * Add a non-interactive overlay marker to map to indicate the number of jobs at
                     * a job location.
                     * @param {UsaJobsApp.JobLocation} location
                     */
                    function addJobCountOverlay(location) {
                        var marker;

                        marker = L.circleMarker([location.Latitude, location.Longitude], {
                            title: location.name,
                            zIndexOffset: -location.jobs.length,
                            radius: Math.round(scaledValue(location, 0, 22)),
                            stroke: false,
                            clickable: false,
                            fill: true,
                            fillColor: '#C4721F',
                            fillOpacity: scaledValue(location, 0.5, 0.15)
                        });
                        marker.location = location;
                        marker.startRadius = marker._radius.valueOf();
                        marker.startOpacity = marker.options.fillOpacity.valueOf();
                        marker.startWeight = marker.options.weight.valueOf();
                        scope.jobCountLayer.addLayer(marker);

                        function scaledValue(location, min, max) {
                            var maxJobs = scope.jobs.JobData.locMaxJobCount,
                                count = location.jobs.length,
                                range = max - min,
                                pcnt, size;

                            pcnt = count / maxJobs;
                            size = min + (range * pcnt);

                            return size;
                        }
                    }

                    return map;
                }
            }
        };
    }

    /**
     * Default Map Markers provider
     */
    markers.$inject = ['$filter', 'unique', 'leaflet', 'settings'];
    function markers($filter, unique, leaflet, settings) {

        // Default map marker icon.
        this.markerIcon = leaflet.icon(settings.assets.jobLocation);

        // Marker cluster content properties and functions.
        this.cluster = {
            // Properties
            miniIconURL: settings.assets.jobLocation.miniIconUrl,
            // Function Bindings
            clusterContent: clusterContent,
            locationsInCluster: locationsInCluster,
            contentTopMargin: contentTopMargin
        };
        // Marker popup functions.
        this.popups = {
            // Function Bindings
            popupForLoc: popupForLoc,
            contentForLoc: contentForLoc
        };

        /**
         * @public
         *
         * @param {L.MarkerClusterGroup} cluster
         */
        function clusterContent(cluster) {

            var i, len, rowItems, div, wrapper, img;

            // limit to 9 icons
            len = Math.min(cluster.getChildCount(), 9);
            rowItems = 3;
            // lower top margin every 3 icons so all the icons stay in
            // the div
            div = angular.element('<div/>');
            wrapper = angular.element('<div/>')
                .addClass('markercluster-icon-img-wrapper')
                .css('margin-top', this.contentTopMargin(len, rowItems))
                .attr('title', 'Zoom to these locations: \r\n\r\n'
                    + this.locationsInCluster(cluster).join('\r\n'));

            for (i = 0; i < len; i++) {
                img = angular.element('<img />')
                    .addClass('markercluster-icon-img')
                    .attr('src', this.miniIconURL);
                wrapper.append(img);
            }

            div.append(wrapper);
            return div.html();
        }

        function locationsInCluster(aCluster) {
            var locsInCluster = [];

            function getLocsInCluster(bCluster) {
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
        }

        function contentTopMargin(len, rowItems) {
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


        /**
         * @private
         * Generate popup for the default marker icon.
         * @param {JobLocation} aLocation
         * @returns {*}
         */
        function popupForLoc(aLocation) {
            var thePopup;

            thePopup = leaflet.popup({
                maxWidth: 250,
                autoPanPaddingTopLeft: leaflet.point(12, 78),
                autoPanPaddingBottomRight: leaflet.point(12, 36)
            });

            thePopup.setContent(this.contentForLoc(aLocation));
            return thePopup;
        }

        /**
         * @private
         * Marker popup content for default map marker.
         * @param {JobLocation} location
         * @returns {String}
         */
        function contentForLoc(location) {
            var jobs, jobsVisible, jobCountStr, len, div, title, jobCount, ul, li, a, spanSal, spanGrd;

            jobs = location.jobs;
            jobsVisible = location.countVisible();

            len = jobs.length;
            // pluralize job count description
            jobCountStr = len + ' vacanc' + (len === 1 ? 'y' : 'ies');
            if (len !== jobsVisible) {
                jobCountStr += ', ' + jobsVisible + ' matching filters';
            }
            div = angular.element("<div class='loc-popup' />");
            // Popup Title
            title = angular.element("<h5 class='loc-popup-title bold'/>").text(location.name);
            // Location Job Count
            jobCount = angular.element("<span class='loc-popup-job-count small'/>").text(jobCountStr);
            // Job List Element
            ul = angular.element('<ul class="loc-popup-job-list list-unstyled" />');
            // Add jobs
            angular.forEach(jobs, function (job) {
                if (!job.visible) return;
                li = angular.element('<li class="loc-popup-job-list-item clearfix"></li>');
                a = angular
                    .element('<a class="loc-popup-job-list-item-link"></a>')
                    .attr('href', job.applyUrl())
                    .attr('target', '_blank')
                    .html(job.title.replace(/-/g, '&#8209;'))
                    .attr('title', job.title +
                        '\r\nView this job announcement on USAJobs.gov');
                spanGrd = angular.element(
                    '<span class="loc-popup-job-list-item-tag small"></span>')
                    .html($filter('gradeRangeDesc')(job))
                    .attr('title', 'Grade');
                spanSal = angular.element(
                    '<span class="loc-popup-job-list-item-tag small"></span>')
                    .html(job.salaryMinString + '&#8209;' + job.salaryMaxString)
                    .attr('title', 'Salary');
                li.append(a);
                li.append(spanGrd);
                li.append(spanSal);
                ul.append(li);
            }, this);

            div.append(title)
                .append(jobCount)
                .append(ul);

            return div.html();
        }
    }

    /**
     * Map View Reset Control
     */
    mapResetControl.$inject = ['leaflet'];
    function mapResetControl(leaflet) {
        return leaflet.Control
            .extend({
                options: {
                    position: 'topright'
                },
                onAdd: function (map) {
                    var container, icon, i, labelSpan;

                    container = leaflet.DomUtil.create('div', 'usajobs-map-viewreset-control');
                    angular.element(container).attr('title', 'Reset map view');
                    icon = leaflet.DomUtil.create('div', 'usajobs-map-reset-icon', container);
                    i = leaflet.DomUtil.create('i', 'fa fa-4x fa-compass', icon);
                    labelSpan = leaflet.DomUtil.create('span', 'usajobs-icon-label', icon);
                    $(labelSpan).text('Reset');
                    $(container).hide();
                    exitRight(container);

                    // return map view to starting view when clicked
                    // provides users an escape hatch while exploring the
                    // map
                    leaflet.DomEvent.addListener(container, 'click', leaflet.DomEvent.stopPropagation).addListener(
                        container, 'click', leaflet.DomEvent.preventDefault).addListener(container, 'click',
                        function () {
                            map.closePopup();
                            map.resetMapView();
                        });

                    // show when map view center moves from starting
                    // position
                    map.on('moveend', function (e) {
                        if (!e.target.mapViewCentered()) {
                            enterRight(container);
                        } else {
                            //$(container).fadeOut(100);
                            exitRight(container);
                        }
                    });

                    function exitRight(el) {
                        $(el).animate({right: '-66'}, {
                            duration: 250, done: function (anim) {
                                $(anim.elem).hide()
                            }
                        });
                    }

                    function enterRight(el) {
                        $(el).show().animate({right: '0'}, 175);
                    }

                    return container;
                }
            });
    }

    /**
     * Show All Markers View Control
     */
    mapShowAllControl.$inject = ['leaflet', 'eventService'];
    function mapShowAllControl(leaflet, events) {
        return leaflet.Control
            .extend({
                options: {
                    position: 'topleft'
                },
                onAdd: function (map) {
                    var container, icon, labelSpan;

                    container = leaflet.DomUtil.create('div', 'usajobs-map-showall-control');
                    angular.element(container).attr('title', 'Zoom out to all job locations');
                    icon = leaflet.DomUtil.create('div', 'usajobs-map-showall-icon center-block', container);

                    // create icon with FontAwesome glyphs
                    leaflet.DomUtil.create('i', 'fa fa-fw', icon);
                    leaflet.DomUtil.create('i', 'fa fa-fw fa-1x fa-thumb-tack top-pin', icon);
                    leaflet.DomUtil.create('i', 'fa fa-fw', icon);
                    leaflet.DomUtil.create('br', '', icon);
                    leaflet.DomUtil.create('i', 'fa fa-fw fa-1x fa-thumb-tack left-pin', icon);
                    leaflet.DomUtil.create('i', 'fa fa-fw fa-arrows-alt center-arrows', icon);
                    leaflet.DomUtil.create('i', 'fa fa-fw fa-1x fa-thumb-tack right-pin', icon);
                    leaflet.DomUtil.create('br', '', icon);
                    leaflet.DomUtil.create('i', 'fa fa-fw', icon);
                    leaflet.DomUtil.create('i', 'fa fa-fw fa-1x fa-thumb-tack bottom-pin', icon);
                    leaflet.DomUtil.create('i', 'fa  fa-fw', icon);

                    labelSpan = leaflet.DomUtil.create('span', 'usajobs-icon-label', icon);
                    $(labelSpan).text('Show All');
                    // start hidden
                    $(container).hide();
                    exitLeft(container);

                    // If there are markers beyond starting view bounds,
                    // show control and set property on `map` and `location`.
                    events.geodata.onAvailable(onGeodataAvailable);
                    function onGeodataAvailable(e, location) {
                        if (!map.inStartBounds(location)) {
                            enterLeft(container);
                            map.markersOutsideStartView = true;
                            location.outsideMapStartBounds = true;
                        }
                    }

                    // Hide control when a new job query is started so
                    // that it will only be shown if new job markers are
                    // outside the map view.
                    events.jobs.onQueryStarted(onQueryStarted);
                    function onQueryStarted() {
                        exitLeft(container);
                    }

                    // show when map is at starting view or markers are not visible
                    // hide when all markers are visible
                    map.on('zoomend', function (e) {
                        if (e.target.mapAtDefaultZoom() && e.target.markersOutsideStartView) {
                            enterLeft(container);
                        } else if (e.target.markersOutsideBounds()) {
                            enterLeft(container);
                        } else {
                            exitLeft(container);
                        }
                    });

                    // show if any markers are outside view bounds
                    map.on('moveend', function (e) {
                        if (e.target.markersOutsideBounds()) {
                            enterLeft(container);
                        }
                    });

                    // return map view to starting view when clicked
                    // provides users an escape hatch while exploring the
                    // map
                    leaflet.DomEvent.addListener(container, 'click', leaflet.DomEvent.stopPropagation).addListener(
                        container, 'click', leaflet.DomEvent.preventDefault).addListener(container, 'click',
                        function () {
                            map.closePopup();
                            map.showAllMarkers();
                        });


                    function exitLeft(el) {
                        $(el).animate({left: '-66'}, {
                            duration: 250, done: function (anim) {
                                $(anim.elem).hide()
                            }
                        });
                    }

                    function enterLeft(el) {
                        $(el).show().animate({left: '0'}, 175);
                    }

                    return container;
                }
            });
    }


})();

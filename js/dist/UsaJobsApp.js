/*! 
* UsaJobsApp - v0.0.1 - 2016-01-08
* https://github.com/aronsch/USAJobs-Job-Map-Angular
* Copyright (c) 2016 Aron Schneider
* Licensed MIT
*/
(function () {
    /**
     * @module UsaJobsApp Main App Module
     * - Main app controller
     * - Org Code Directive to bind controller
     * - Centralized event emission and subscription service
     */
    angular.module('UsaJobsApp', ['UsaJobsApp.Data', 'UsaJobsApp.Filters', 'UsaJobsApp.Map', 'UsaJobsApp.JobTable',
        'UsaJobsApp.Location', 'UsaJobsApp.Utilities', 'MomentModule', 'LeafletModule',
        'ui-rangeSlider']);

    // App Module Service Declarations
    angular.module('UsaJobsApp').controller('UsaJobsAppController', AppController);
    angular.module('UsaJobsApp').directive('orgCode', orgCodeDirective);
    angular.module('UsaJobsApp').service('eventService', eventService);

    // App Service Functions

    /**
     * UsaJobsApp App Controller
     */
    AppController.$inject = ['$scope', 'Jobs', 'eventService', 'settings'];
    function AppController($scope, Jobs, Events, settings) {

        $scope.jobs = Jobs;

        // Set Job service properties
        $scope.jobs.orgCode = $scope.orgCode;
        $scope.jobs.orgName = $scope.orgName;
        $scope.orgSearchUrl = settings.usaJobs.searchBaseUrl + $scope.orgId;
        $scope.jobs.orgSearchUrl = $scope.orgSearchUrl;

        // Get jobs
        $scope.jobs.getJobs();

        /* Event handling */
        // Watch for filter update, then update job visibility
        Events.filters.onChanged(onFilterChange);
        function onFilterChange(e, predicate) {
            angular.forEach($scope.jobs.JobData, function (job) {
                // default to empty predicate if none provided
                job.setVisibleWithPredicate(predicate);
            });
            // broadcast notification that UI update is needed
            Events.jobs.updateVisible();
        }

        // Watch for filter clear, then set all jobs visible;
        Events.filters.onCleared(onFilterCleared);
        function onFilterCleared() {
            angular.forEach($scope.jobs.JobData, function (job) {
                job.visible = true;
            });
            // broadcast notification that UI update is needed
            Events.jobs.updateVisible();
        }
    }

    /**
     * OrgId Directive
     * Detects 'org-code' attribute and attaches the app
     * controller.
     */
    function orgCodeDirective() {
        return {
            restrict: 'A',
            scope: {
                orgCode: '@',
                orgName: '@'
            },
            controller: 'UsaJobsAppController'
        };
    }

    /**
     * Application-wide event broadcast and registration service
     */
    eventService.$inject = ['$rootScope'];
    function eventService($rootScope) {
        var names = this.names = {},
            jobs = this.jobs = {},
            geodata = this.geodata = {},
            location = this.location = {},
            filters = this.filters = {};

        /* Event Names */
        names.jobs = {
            available: 'usajobs.events.jobs-available',
            updateVisible: 'usajobs.events.job-visibility-updated-needed',
            queryStarted: 'usajobs.events.job-query-started'
        };
        names.geodata = {
            available: 'usajobs.events.geodata-available',
            notAvailable: 'usajobs.events.geodata-not-available'
        };
        names.location = {
            setAttribution: 'usajobs.events.location.set-geocoding-attribution'
        };
        names.filters = {
            changed: 'usajobs.events.filter-values-changed',
            cleared: 'usajobs.events.filter-values-cleared',
            clear: 'usajobs.events.filter-clear-filters'
        };
        names.focus = {
            job: 'usajobs.events.focus-set-job',
            location: 'usajobs.events.focus-set-location'
        };

        /* Job Data Events */
        jobs.available = function () {
            broadcast(names.jobs.available);
        };
        jobs.onAvailable = function (handlerFn) {
            on(names.jobs.available, handlerFn);
        };
        jobs.updateVisible = function () {
            broadcast(names.jobs.updateVisible);
        };
        jobs.onUpdateVisible = function (handlerFn) {
            on(names.jobs.updateVisible, handlerFn);
        };
        jobs.queryStarted = function () {
            broadcast(names.jobs.queryStarted);
        };
        jobs.onQueryStarted = function (handlerFn) {
            on(names.jobs.queryStarted, handlerFn);
        };

        /* Geodata Available Events */
        geodata.available = function (location) {
            broadcast(names.geodata.available, location);
        };
        geodata.notAvailable = function (location) {
            broadcast(names.geodata.notAvailable, location);
        };
        geodata.onAvailable = function (handlerFn) {
            on(names.geodata.available, handlerFn);
        };
        geodata.onNotAvailable = function (handlerFn) {
            on(names.geodata.notAvailable, handlerFn);
        };

        /* Location Module Events */
        location.setAttribution = function (str) {
            broadcast(names.location.setAttribution, str);
        };
        location.onSetAttribution = function (handlerFn) {
            on(names.location.setAttribution, handlerFn);
        };

        /* Job Data Filter Events */
        filters.changed = function (predicate) {
            broadcast(names.filters.changed, predicate);
        };
        filters.onChanged = function (handlerFn) {
            on(names.filters.changed, handlerFn);
        };
        filters.cleared = function (predicate) {
            broadcast(names.filters.cleared);
        };
        filters.onCleared = function (handlerFn) {
            on(names.filters.cleared, handlerFn);
        };
        filters.clear = function (predicate) {
            broadcast(names.filters.clear);
        };
        filters.onClear = function (handlerFn) {
            on(names.filters.clear, handlerFn);
        };

        // broadcast an event on rootScope
        function broadcast(eventName, obj) {
            $rootScope.$broadcast(eventName, obj);
        }

        // listen for an event on rootScope
        function on(eventName, handlerFn) {
            $rootScope.$on(eventName, handlerFn);
        }
    }
})();

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

(function () {
    /**
     * USAJobsApp HTML Templates
     * Adds programmatically generated HTML templates to Angular $templateCache
     */
    // Generate component templates and add to cache
    angular.module('UsaJobsApp').run(configTemplates);

    /**
     * Cache Angular Templates
     * @param $templateCache Angular template service
     */
    configTemplates.$inject = ['$templateCache'];
    function configTemplates($templateCache) {
        // $templateCache additions
        $templateCache.put('job-info.html', jobInfoTemplate());
        $templateCache.put('job-filter.html', jobFilterTemplate());
        $templateCache.put('job-table.html', jobTableTemplate());
        $templateCache.put('vacancy-count.html', vacancyCountTemplate());
        // Leaflet.js job map template generation is located in Maps module jobMapDirective


        // Template generation functions

        /**
         * Generate jobs data summary element with refresh button control
         * @returns {String}
         */
        function jobInfoTemplate() {
            return '<p>'
                + '<span ng-hide="jobs.resolved">'
                + '<i class="fa fa-spinner fa-pulse"></i> '
                + 'Getting <strong>{{jobs.orgName}}</strong> job openings from '
                + '</span>'
                + '<span ng-show="jobs.resolved">'
                + '<strong>{{ jobs.JobData.length }} {{ jobs.orgName }}</strong> job openings are currently listed on '
                + '</span>'
                + '<a ng-href="{{jobs.orgSearchUrl}}" target="_blank">USAJobs.gov<i class="fa fa-fw fa-external-link"></i></a>'
                + ' <span class="pull-right btn btn-xs btn-default usa-jobs-refresh-btn" ng-click="refresh()" ng-disabled="!jobs.resolved">'
                + '<i class="fa fa-refresh" ng-class="{ \'fa-spin\': !jobs.resolved }"></i> Refresh'
                + '</span>'
                + '</p>';
        }

        /**
         * Generate Job Filter form template
         * @returns {String}
         */
        function jobFilterTemplate() {
            return '<div class="row form job-filter">'
                + '<vacancy-count-desc></vacancy-count-desc>'
                    // Job salary slider
                + '<div class="form-group col-xs-12 col-sm-9 col-md-10 col-lg-10"><label for="salary-slider">Filter Salary</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.salaryFilter.isActive()" ng-click="filters.salaryFilter.reset(true)"><i class="fa fa-close"></i> <span class="hidden-xs">Clear</span></button>'
                + '<div range-slider show-values="true" filter="currency" id="salary-slider" min="filters.salaryFilter.lowest" max="filters.salaryFilter.highest" step="10000" model-min="filters.salaryFilter.min" model-max="filters.salaryFilter.max" ng-class="{ disabled : !jobs.resolved }"></div>'
                + '</div>'
                + '<div class="form-group col-xs-12 col-sm-3 col-md-2 col-lg-2 text-right"><label class="hidden-xs hidden-sm">&nbsp</label><button class="btn btn-default btn-xs usajobs-filters-advanced-btn " ng-disabled="!jobs.resolved"  ng-click="toggleAdvancedFilters()">{{ showAdvancedFilters ? "Hide" : "More"}} Filters</button></div>'
                    // Advanced filters
                + '<div ng-show="showAdvancedFilters">'
                    // Grade filter slider
                + '<div class="form-group col-xs-12 col-sm-12 col-md-6 col-lg-3 usajobs-grade-filter" ng-hide="filters.gradeFilter.isDisabled"><label for="grade-slider">Filter Grade</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.gradeFilter.isActive()" ng-click="filters.gradeFilter.reset(true)"><i class="fa fa-close"></i> <span class="hidden-xs">Clear</span></button>'
                + '<div range-slider show-values="true" filter="grade" id="grade-slider" min="filters.gradeFilter.lowest" max="filters.gradeFilter.highest" model-min="filters.gradeFilter.min" model-max="filters.gradeFilter.max" ng-class="{ disabled : !jobs.resolved }"></div></div>'
                    // Text filter
                + '<div class="form-group col-xs-12 col-sm-6 col-md-6 col-lg-3"><label for="filters.stringFilter.value" class="">Filter by Typing</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.stringFilter.isActive()" ng-click="filters.stringFilter.reset(true)"><i class="fa fa-close"></i> <span class="hidden-xs">Clear</span></button>'
                + '<input ng-disabled="!jobs.resolved" type="text" class="form-control" ng-model="filters.stringFilter.value" ng-change="filter()" placeholder="filter vacancies by typing here"></div>'
                    // State dropdown
                + '<div class="form-group col-xs-12 col-sm-6 col-md-6 col-lg-3"><label for="state-filter">State/Country&nbsp;</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.state.isActive()" ng-click="filters.state.reset(true)"><i class="fa fa-close"></i> <span class="hidden-xs">Clear</span></button>'
                + '<select class="form-control" id="state-filter" ng-model="filters.state.value" ng-change="filter()"  ng-options="state.name for state in jobs.JobData.states"><option value=""></option></select>'
                + '</div>'
                    // Pay plan radio buttons
                + '<div class="form-group col-xs-12 col-sm-6 col-md-6 col-lg-3"><label for="pay-plan-filter">Filter by Pay Basis</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.payFilter.isActive()" ng-click="filters.payFilter.reset(true)"><i class="fa fa-close"></i> <span class="hidden-xs">Clear</span></button>'
                + '<div id="pay-plan-filter" class="input-group">'
                + '<label class="radio-inline"><input id="allpb-radio" name="pay-radio" type="radio" ng-change="filter()" ng-model="filters.payFilter.selection" ng-value="filters.payFilter.all" ng-disabled="!jobs.resolved"> Any&nbsp</label>'
                + '<label class="radio-inline"><input id="salaried-radio" name="pay-radio" type="radio" ng-change="filter()" ng-model="filters.payFilter.selection" ng-value="filters.payFilter.salaried" ng-disabled="!jobs.resolved"> Salaried&nbsp</label>'
                + '<label class="radio-inline"><input id="hourly-radio" name="pay-radio" type="radio" ng-change="filter()" ng-model="filters.payFilter.selection" ng-value="filters.payFilter.hourly" ng-disabled="!jobs.resolved"> Hourly&nbsp</label>'
                + '</div></div>'
                + '</div>' // advanced filters div close
                + '</div>'; // form div close
        }


        /**
         * Generate Job Table template
         * @returns {String}
         */
        function jobTableTemplate() {
            var tmplt = '',
            // default sort icon FontAwesome classes
                defIcons = {
                    up: 'fa-sort-asc',
                    down: 'fa-sort-desc'
                };
            // alpha sort icon FontAwesome classes
            alphaIcons = {
                up: 'fa-sort-alpha-asc',
                down: 'fa-sort-alpha-desc'
            };
            // amount sort icon FontAwesome classes
            amntIcons = {
                up: 'fa-sort-amount-asc',
                down: 'fa-sort-amount-desc'
            };

            tmplt += '<div class="usajobs-jobs-table">';
            // Column Titles/Sorting
            tmplt += '<div class="clearfix usajobs-table-column-titles">';
            // Title
            tmplt += '<dl class="col-xs-6 col-sm-1 col-md-1 col-lg-1 small"><dt><a class="usajobs-sortbutton"' +
                activeClass('JobTitle') +
                ' title="Sort by Job Title" href="" ng-class="" ng-click="setPredicate(\'JobTitle\')">Title' +
                sortCaret('JobTitle', alphaIcons) + '</a></dt></dl>';
            // Locations
            tmplt += '<dl class="hidden-xs col-sm-2 col-md-1 col-lg-1 small"><dt><a class="usajobs-sortbutton"' +
                activeClass('Location') +
                ' title="Sort by Location" href="" ng-click="setPredicate(\'Locations\')">Location' +
                sortCaret('Locations', alphaIcons) + '</a></dt></dl>';
            // Salary
            tmplt += '<dl class="col-xs-6 col-sm-3 col-md-2 col-lg-2 small"><dt><a class="usajobs-sortbutton"' +
                activeSalaryClass() +
                ' title="Sort by Salary" href="" ng-click="setSalaryPredicate()">Salary' +
                sortSalaryCaret('salaryPredicate') + '</a></dt></dl>';
            // Grade
            tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt><a class="usajobs-sortbutton"' +
                activeClass('Grade') +
                ' title="Sort by Pay Grade" href="" ng-click="setPredicate(\'Grade\')">Grade' +
                sortCaret('Grade', amntIcons) + '</a></dt></dl>';
            // Job Close Date
            tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt><a class="usajobs-sortbutton"' +
                activeClass('daysRemaining') +
                ' title="Sort by Announcement Closing Date" href="" ng-click="setPredicate(\'daysRemaining\')">Closes' +
                sortCaret('daysRemaining', defIcons) + '</a></dt></dl>';
            // Job Open Date
            tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt><a class="usajobs-sortbutton"' +
                activeClass('daysOpen') +
                ' title="Sort by Announcement Opening Date" href="" ng-click="setPredicate(\'daysOpen\')">Opened' +
                sortCaret('daysOpen', defIcons) + '</a></dt></dl>';
            // Job Announcement Number
            tmplt += '<dl class="hidden-xs hidden-sm hidden-md col-lg-2 small"><dt><a class="usajobs-sortbutton"'
                + activeClass('AnnouncementNumber')
                + ' title="Sort by Job Announcement Number" '
                + 'href="" ng-click="setPredicate(\'AnnouncementNumber\')"><abbr title="Vacancy Announcment Number">Vac #</abbr>'
                + sortCaret('AnnouncementNumber', alphaIcons) + '</a></dt></dl>';
            tmplt += '</div>';

            /* Job List */
            tmplt += '<ul class="usajobs-jobs-table-list list-unstyled">';
            // Results loading alert
            tmplt += '<li class="alert alert-info" ng-click="clearFilters()" ng-hide="jobs.resolved">';
            tmplt += '<i class="fa fa-lg fa-circle-o-notch fa-spin"></i> ' +
                'Getting <strong>{{jobs.orgName}}</strong> job openings from <a ng-href="{{org.orgSearchUrl}}" target="_blank">USAJobs.gov</a>';
            tmplt += '</li>'
            // Zero jobs results alert
            tmplt += '<li class="alert alert-warning" ng-show="jobs.resolved && jobs.JobData.length === 0">';
            tmplt += '<p><i class="fa fa-lg fa-fw fa-times-circle"></i>  ' +
                'No <strong>{{jobs.orgName}}</strong> job openings were found.' +
                '</p>';
            tmplt += '<p>' +
                '<a ng-href="{{jobs.orgSearchUrl}}" target="_blank">' +
                '<i class="fa fa-lg fa-fw fa-external-link"></i>' +
                ' Go to USAJobs.gov to set up a saved search to alert you to new job openings.' +
                '</a>' +
                '</p>';
            tmplt += '</li>';
            // Zero jobs matching filters alert
            tmplt += '<li class="alert alert-danger" ' +
                'ng-click="clearFilters()" ' +
                'ng-show="jobs.JobData.visibleCount === 0 && jobs.JobData.filterStatus.active">';
            tmplt += '<i class="fa fa-lg fa-times-circle"></i> ' +
                'No jobs match your current filter criteria ' +
                '<span class="btn btn-danger"><i class="fa fa-close"></i> Clear filters</span>';
            tmplt += '</li>';

            /* Job Info Element */
            tmplt += '<li class="usajobs-jobs-table-list-item container-fluid" ' +
                'ng-repeat="job in jobs.JobData | orderBy:predicate:reverse" ' +
                'ng-show="job.visible">';
            tmplt += '<h5 class="usajobs-jobs-table-list-item-title">' +
                '<a ng-href="{{job.ApplyOnlineURL}}" ' +
                'target="_blank" title="Open this job announcement on USAJobs.gov">{{ job.title }}' +
                '<i class="fa fa-fw fa-external-link"></i>';
            tmplt += '</a>' +
                '</h5>';
            tmplt += '<div class="row usajobs-table-item-job-details">';
            // Locations
            tmplt += '<dl class="col-xs-12 col-sm-3 col-md-2 col-lg-2 small">' +
                '<dt>Location</dt>' +
                '<dd ng-repeat="loc in job.locationArrayCompact track by $index" title="{{ loc }}">{{ loc }}</dd>' +
                '</dl>';
            // Salary
            tmplt += '<dl class="col-xs-12 col-sm-3 col-md-2 col-lg-2 small">' +
                '<dt>Salary</dt>' +
                '<dd>{{ job.salaryRange }}<span ng-show="job.hourly()">/hour</span></dd>' +
                '</dl>';
            // Grade
            tmplt += '<dl class="col-xs-12 col-sm-2 col-md-2 col-lg-2 small">' +
                '<dt>Grade</dt>' +
                '<dd>{{ job.gradeRangeDesc() }}</dd>' +
                '</dl>';
            // Job Close Date
            tmplt += '<dl class="col-xs-12 col-sm-2 col-md-2 col-lg-2 small">' +
                '<dt>Closes</dt>' +
                '<dd title="{{ job.EndDate }}">{{ job.endDateDescription }}</dd>' +
                '</dl>';
            // Job Open Date
            tmplt += '<dl class="col-xs-12 col-sm-2 col-md-2 col-lg-2 small">' +
                '<dt>Opened</dt>' +
                '<dd>{{ job.StartDate }}</dd>' +
                '</dl>';
            // Job Announcement Number
            tmplt += '<dl class="hidden-xs hidden-sm hidden-md col-lg-2 small">' +
                '<dt><abbr title="Vacancy Announcment Number">Vac</abbr></dt>' +
                '<dd title="{{job.AnnouncementNumber}}">{{ job.AnnouncementNumber }}</dd>' +
                '</dl>';
            // Job Summary Toggle
            tmplt += '<div class="col-xs-12 col-sm-12 col-md-2 col-lg-2 clearfix">' +
                '<a class="hidden-print small text-muted" ng-click="job.toggleDescription()">' +
                '<i class="fa fa-fw" ng-class="{ \'fa-plus-square-o\': !job.showDescription, \'fa-minus-square-o\': job.showDescription }"></i>' +
                'Job Summary' +
                '</a>' +
                '</div>';
            tmplt += '<dl class="col-xs-12 col-sm-12 col-md-10 col-lg-10 small" ng-show="job.showDescription">' +
                '<dt class="sr-only visible-print-block">Job Summary</dt>' +
                '<dd><strong class="visible-xs-inline visible-sm-inline visible-md-inline">' +
                'Vacancy Number: {{job.AnnouncementNumber}}<br /></strong> {{ job.JobSummary }}</dd>' +
                '</dl>';
            tmplt += '</div>';
            tmplt += '</li></ul>';
            tmplt += '</div></div>';

            // Build dynamic sort direction caret element for column titles
            function sortCaret(predicate, icons) {
                return '<i class="fa fa-fw" ng-class="{\'' + icons.down + '\': (reverse && predicate===\'' + predicate
                    + '\'), \'' + icons.up + '\': (!reverse && predicate===\'' + predicate + '\')}"></i>';
            }

            // Specialized sort caret builder for Salary sorting
            function sortSalaryCaret(predicate) {
                return '<i class="fa fa-fw" ng-class="{\'' + amntIcons.down + '\': predicate===\'salaryMaxInt\', \''
                    + amntIcons.up + '\': predicate===\'salaryMinInt\'}"></i>';
            }

            // Generate ngClass attribute that adds active class to column title
            // if the table is being sorted by that column.
            function activeClass(predicate) {
                return ' ng-class="{ \'usajobs-active\': predicate===\'' + predicate + '\' }" ';
            }

            // Specialized version of the ngClass attribute generator to accomodate multiple predicates
            // needed to sort salary ranges.
            function activeSalaryClass() {
                return ' ng-class="{ \'usajobs-active\': predicate===\'salaryMaxInt\'||predicate===\'salaryMinInt\' }" ';
            }

            return tmplt;
        }

        /**
         * Generate vacancy count and filter match count template
         * @returns {String}
         */
        function vacancyCountTemplate() {
            return '<p class=\"usajobs-vac-count text-center\" ng-class=\"{\'bg-clear\': filterStatus.active, \'text-primary\': filterStatus.active, \'bg-danger\': jobs.JobData.visibleCount === 0 && filterStatus.active, \'text-danger\': jobs.JobData.visibleCount === 0 && filterStatus.active}\">'
                + '<span ng-show=\"filterStatus.active\"><strong>{{ jobs.JobData.visibleCount }}</strong> vacanc{{ jobs.JobData.visibleCount == 1 ? \"y\" : \"ies\"}} match{{ jobs.JobData.visibleCount == 1 ? \"es\" : \"\"}} your filter criteria</strong></span>'
                + '<span ng-hide=\"filterStatus.active\">&nbsp<i class="fa fa-fw fa-search" style="color: #ccc"></i>&nbsp</span>'
                + '</p>';
        }
    }
})();

(function () {
    /**
     * @module UsaJobsApp Data module
     * - Provides Service to retrieve jobs from USAJobs.gov.
     * - Provides Factory for creating `Job` objects, which extend the job results from USAJobs.gov
     * - Provides Directive and Controller for filtering job results
     * - Provides Directive and Controller for element displaying the number of jobs meeting filter criteria
     * - Provides Directive and Controller for element displaying total job results count and organization.
     */
    angular.module('UsaJobsApp.Data', ['UsaJobsApp.Settings', 'UsaJobsApp.Filters', 'UsaJobsApp.Utilities',
        'MomentModule', 'LeafletModule']);

    // Data Module Service Declarations

    angular.module('UsaJobsApp.Data').service('Jobs', Jobs);
    angular.module('UsaJobsApp.Data').factory('Job', JobFactory);

    angular.module('UsaJobsApp.Data').directive('jobFilter', jobDataFilterDirective);
    angular.module('UsaJobsApp.Data').controller('JobDataFilter', JobDataFilterController);

    angular.module('UsaJobsApp.Data').directive('vacancyCountDesc', vacancyCountDescDirective);
    angular.module('UsaJobsApp.Data').controller('vacancyCountDescController', vacancyCountDescController);

    angular.module('UsaJobsApp.Data').directive('jobInfo', jobInfoDirective);
    angular.module('UsaJobsApp.Data').controller('jobInfoController', jobInfoController);

    // Data Module Service Functions

    /**
     * USA Jobs Data Service
     */
    Jobs.$inject = ['$http', 'settings', 'unique', 'Job', 'eventService'];
    function Jobs($http, settings, unique, Job, Events) {

        var self = this; // closure reference to `this` for callbacks

        // Public Properties
        this.JobData = [];
        this.resolved = false;
        this.orgCode = '';
        this.orgName = '';
        this.orgSearchUrl = '';

        // Public Functions
        this.getJobs = getJobs;
        this.query = query;

        // Public Job data summary functions
        this.getMaxGrade = getMaxGrade;
        this.getMinGrade = getMinGrade;
        this.getMaxSalary = getMaxSalary;
        this.getMinSalary = getMinSalary;
        this.getPayPlans = getPayPlans;
        this.getSeriesList = getSeriesList

        /**
         * @public
         * Retrieve jobs from USA Jobs based on current `org` settings.
         */
        function getJobs() {
            // dispatch USAJobs query
            this.query({
                NumberOfJobs: 250,
                OrganizationID: this.orgCode
            });
        }

        /**
         * @public
         * Query USA Jobs with provided request parameters
         * @param {Object} params
         */
        function query(params) {
            this.resolved = false; // reset query status
            this.JobData.length = 0; // remove current results
            Events.jobs.queryStarted(); // emit query started event
            $http.get(settings.usaJobs.baseUrl, {
                params: params
            }).success(queryResolved);
        }

        /**
         * @private
         * Handle job query response
         * @param data {Object}
         */
        function queryResolved(data) {
            addJobResults(data);
            self.resolved = true; // set query status to resolved
            Events.jobs.available(); // emit jobs available event
        }

        /**
         * @private
         * Take job query results and add to `JobData` collection as `Job` objects.
         * @param data {Object}
         */
        function addJobResults(data) {
            angular.forEach(data.JobData, function (item, idx) {
                self.JobData.push(new Job(item));
            }, this);
            groupByLocation(self.JobData);
            hasAlphaGrades();

        }

        /**
         * @private
         * Set {hasAlphaGrades} property if any jobs contain alphabetic grade ranges.
         */
        function hasAlphaGrades() {
            var hasAlphas = false;
            angular.forEach(self.JobData, function (job) {
                if (job.hasAlphaGrades()) {
                    hasAlphas = true;
                }
            });
            self.hasAlphaGrades = hasAlphas;
        }

        /**
         * @private
         * Group jobs by location and set as {locations} property.
         * @param {Array.<Object>} jobs
         */
        function groupByLocation(jobs) {
            var placeNames = [],
                stateNames = [];
            jobs.locations = {};
            jobs.states = {};
            jobs.locMaxJobCount = 0;
            jobs.locMinJobCount = 0;

            angular.forEach(jobs, function (job) {
                // append any place names from the job
                Array.prototype.push.apply(placeNames, job.locationArray);
            });
            // remove duplicates
            placeNames = unique(placeNames);
            // create location keys and objects
            angular.forEach(placeNames, function (placeName) {

                // create location info object
                jobs.locations[placeName] = {
                    name: placeName,
                    jobs: []
                };

                stateNames.push(placeName.replace(/.*,\s/, ''));
            });

            // add jobs to location job collections
            angular.forEach(jobs, function (job) {
                angular.forEach(jobs.locations, function (location, key) {
                    // check if location name is contained in string list of
                    // job locations
                    if (job.Locations.indexOf(key) > -1) {
                        location.jobs.push(job);
                    }
                });
            });

            // Get a count of the most jobs and least jobs at a single location
            angular.forEach(jobs.locations, function (location, key) {
                if (location.jobs.length > jobs.locMaxJobCount) {
                    jobs.locMaxJobCount = location.jobs.length
                }

                if (location.jobs.length > 0 && location.jobs.length < jobs.locMinJobCount) {
                    jobs.locMinJobCount = location.jobs.length;
                }
            });

            // create state info object
            angular.forEach(stateNames, function (stateName) {
                jobs.states[stateName] = {
                    name: stateName,
                    jobs: []
                }
            });

            // add jobs to state job locations
            angular.forEach(jobs.states, function (state, key) {
                angular.forEach(jobs, function (job) {
                    // check if state name is contained in string list of
                    // job locations
                    if (job.Locations.indexOf(key) > -1) {
                        state.jobs.push(job);
                    }
                });
            });

        }

        // Utility Functions

        /**
         * @public
         * Return the maximum pay grade listed in the jobs results.
         * @return {Number}
         */
        function getMaxGrade() {
            var grades = [];

            // protect against returning divide-by-zero/infinty
            if (this.JobData.length === 0) return 0;

            angular.forEach(this.JobData, function (job) {
                grades.push(job.gradeHighest());
            }, this);
            // return max,
            // provide grades array as arguments to max function
            return Math.max.apply(this, grades);
        }

        /**
         * @public
         * Return the minimum pay grade listed in the jobs results.
         * @return {Number}
         */
        function getMinGrade() {
            var grades = [];

            // protect against returning divide-by-zero/infinty
            if (this.JobData.length === 0) return 0;

            angular.forEach(this.JobData, function (job) {
                grades.push(job.gradeLowest());
            }, this);
            // return min,
            // provide grades array as arguments to min function
            return Math.min.apply(this, grades);
        }

        /**
         * @public
         * Return the maximum salary listed in the jobs results.
         * @return {Number}
         */
        function getMaxSalary() {
            var salaries = [];

            if (this.JobData.length === 0) return 0;

            angular.forEach(this.JobData, function (job) {
                salaries.push(job.salaryHighest());
            }, this);
            return Math.max.apply(this, salaries);
        }

        /**
         * @public
         * Return the minimum salary listed in the jobs results.
         * @return {Number}
         */
        function getMinSalary() {
            var salaries = [];

            if (this.JobData.length === 0) return 0;

            angular.forEach(this.JobData, function (job) {
                salaries.push(job.salaryLowest());
            }, this);

            return Math.min.apply(this, salaries);
        }

        /**
         * @public
         * Return a list of all Pay Plans listed in the job results.
         * @return {Number}
         */
        function getPayPlans() {
            var payPlans = [];

            // protect against returning divide-by-zero/infinty
            if (jobs.length === 0) return 0;
            angular.forEach(jobs, function (job) {
                grades.push(job.PayPlan);
            });

            // remove duplicates and return
            return unique(payPlans);
        }

        /**
         * @public
         * Return an array of all Job Sereies listed in the job results.
         * @return {Array}
         */
        function getSeriesList() {
            var series = []

            // push all Series values to series array
            angular.forEach(this.JobData, function (job) {
                series.push(job.Series);
            });

            // remove duplicates and return
            return unique(series);
        }

    }

    /**
     * `Job` Object Factory - Extends job data from USA Jobs search results
     */
    JobFactory.$inject = ['$filter', 'moment', 'settings'];
    function JobFactory($filter, moment, settings) {
        /** @constructor */
        function Job(jobData) {
            var now = moment(),
                dateFm = settings.usaJobs.dateFormat;

            angular.extend(this, jobData); // attach USAJobs job properties

            // Statically rendered properties to speed up DOM rendering
            // when there are lots of elements being added or removed.
            this.daysRemaining = moment(this.EndDate, dateFm).diff(now, 'days');
            this.daysOpen = moment(now).diff(moment(this.StartDate, dateFm), 'days');
            this.endDateDescription = $filter('datedescription')(this.EndDate);
            this.salaryRange = $filter('trailingzeroes')(this.SalaryMin + " to " + this.SalaryMax);
            this.salaryMaxInt = parseInt(this.SalaryMax.replace('$', ''));
            this.salaryMinInt = parseInt(this.SalaryMin.replace('$', ''));
            this.title = this.JobTitle;
            this.locationArray = this.Locations.split(/;/g);
            this.locationArrayCompact = [];

            angular.forEach(this.locationArray, function (item) {
                this.locationArrayCompact.push($filter('stateAbbreviation')(item));
            }, this);

            // Concatenate all values as strings for search term matching.
            this.concatenatedValues = '';
            angular.forEach(jobData, function (v) {
                this.concatenatedValues += v + ' | ';
            }, this);
        }

        /* Prototype Properties */
        Job.prototype.visible = true;
        Job.prototype.showDescription = false;

        /* Prototype Function Bindings */
        Job.prototype.setVisibleWithPredicate = setVisibleWithPredicate;
        Job.prototype.hourly = hourly;
        Job.prototype.salaried = salaried;
        Job.prototype.gradeRangeDesc = gradeRangeDesc;
        Job.prototype.gradeLowest = gradeLowest;
        Job.prototype.gradeHighest = gradeHighest;
        Job.prototype.gradeLowestInt = gradeLowestInt;
        Job.prototype.gradeHighestInt = gradeHighestInt;
        Job.prototype.hasAlphaGrades = hasAlphaGrades;
        Job.prototype.salaryLowest = salaryLowest;
        Job.prototype.salaryHighest = salaryHighest;
        Job.prototype.salaryInRange = salaryInRange;
        Job.prototype.gradeInRange = gradeInRange;
        Job.prototype.toggleDescription = toggleDescription;

        /* Function Definitions */

        /**
         * @public
         * Toggle whether description should be displayed.
         */
        function toggleDescription() {
            this.showDescription = !this.showDescription;
        };

        /* Job Prototype Function Definitions */

        /**
         * @public
         * Set visibility property by evaluating provided predicate
         * function.
         * @param {Function} predicateFn
         */
        function setVisibleWithPredicate(predicateFn) {
            // set visibility based on predicate function result
            if (angular.isDefined(predicateFn)) {
                this.visible = predicateFn(this);
            } else {
                // otherwise, default to visible
                this.visible = true;
            }
        }

        /**
         * @public
         * Determine if the job is hourly.
         * @returns {Boolean}
         */
        function hourly() {
            return this.SalaryBasis === 'Per Hour';
        }

        /**
         * @public
         * Determine if the job is salaried.
         * @returns {Boolean}
         */
        function salaried() {
            return this.SalaryBasis === 'Per Year';
        }

        /**
         * @public
         * Render a text description of the job's pay grade range.
         * @returns {String}
         */
        function gradeRangeDesc() {
            var low = this.gradeLowest(),
                high = this.gradeHighest();
            if (!this.hasAlphaGrades()) {
                low = $filter('grade')(low);
                high = $filter('grade')(high);
            }
            // return single grade if high grade is the same: 'GS 07'
            // return range description if high grade is different: 'GS 07 to 09'
            return this.PayPlan + ' ' + low + (low !== high ? ' to ' + high : '');
        }

        /**
         * @public
         * Return the lowest pay grade listed for the job
         * @returns {String}
         */
        function gradeLowest() {
            return this.Grade.split('/')[0];
        }

        /**
         * @public
         * Return the highest pay grade listed for the job, if listed.
         * Returns lowest pay grade if no high grade is listed.
         * @returns {String}
         */
        function gradeHighest() {
            // if grade listing contains only one grade, return that grade
            var str = this.Grade.split('/')[1];
            if (str === this.gradeLowest()) {
                return this.gradeLowest();
            } else {
                return str;
            }
        }

        /**
         * @public
         * Return the lowest grade as an integer.
         * @returns {Number}
         */
        function gradeLowestInt() {
            return numVal(this.gradeLowest());
        }

        /**
         * @public
         * Return the highest grade as an integer
         * @returns {Number}
         */
        function gradeHighestInt() {
            return numVal(this.gradeHighest());
        }

        /**
         * @public
         * Test to see if this job listing uses alphabetic grade ranges
         * instead of numeric ones.
         * @returns {Boolean}
         */
        function hasAlphaGrades() {
            return /[a-z]/ig.test(this.Grade);
        }

        /**
         * @public
         * Return the lowest salary listed for the job.
         * @returns {Number}
         */
        function salaryLowest() {
            return parseSalary(this.SalaryMin);
        }

        /**
         * @public
         * Return the highest salary listed for the job.
         * @returns {Number}
         */
        function salaryHighest() {
            return parseSalary(this.SalaryMax);
        }

        /**
         * @public
         * Test if the provided salary is within job salary range.
         * @param min {Number}
         * @param max {Number}
         * @returns {Boolean}
         */
        function salaryInRange(min, max) {
            var low = this.salaryLowest(),
                high = this.salaryHighest();
            return (low >= min || high >= min) && (high <= max || low <= max);
        }

        /**
         * @public
         * Test if the provided grade is within job grade range.
         * @param min {Number}
         * @param max {Number}
         * @returns {Boolean}
         */
        function gradeInRange(min, max) {
            var low = this.gradeLowestInt(),
                high = this.gradeHighestInt();
            return (low >= min || high >= min) && (high <= max || low <= max);
        }

        /**
         * @private
         * Clean salary string and return parsed number.
         * @param str {String}
         * @returns {String}
         */
        function parseSalary(str) {
            // remove currency symbol and letters, then parse to number
            return parseFloat(str.replace(/[$,a-z]/gi, ''));
        }

        /**
         * @private
         * Parse number into string, guarding against infinite or NaN values.
         * @param str {String}
         * @returns {String}
         */
        function numVal(str) {
            var parsed = parseInt(str);
            if (isFinite(parsed)) {
                return parsed
            } else {
                return 0;
            }
        }

        /* Return */
        return Job;
    }


    /*
     * Job Data Filter Directive
     *
     * Directive that provides a filter form for filtering USA Jobs search results.
     */
    function jobDataFilterDirective() {
        return {
            restrict: 'E',
            scope: {},
            controller: 'JobDataFilter',
            templateUrl: 'job-filter.html'
        };
    }

    /*
     * Job Data Filter Controller
     *
     * Controller for USA Jobs search result data filtering. On filter change, it emits an
     * event with a predicate function for `Job` objects attached.
     *
     */
    JobDataFilterController.$inject = ['$scope', '$filter', 'eventService', 'Jobs'];
    function JobDataFilterController($scope, $filter, events, Jobs) {

        $scope.jobs = Jobs;
        $scope.showAdvancedFilters = false;
        $scope.filters = {};
        $scope.filters.filterStatus = $scope.jobs.JobData.filterStatus = {
            active: false
        };

        /*
         * Filter Objects
         */

        // String Filter
        $scope.filters.stringFilter = {
            value: '',
            predicate: function (job) {
                if (this.value === '') {
                    return true;
                } else {
                    // return true if string is found in concatenated values
                    return job.concatenatedValues.indexOf(this.value) > -1;
                }
            },
            reset: function (triggerUpdate) {
                this.value = '';
                if (triggerUpdate) $scope.filter();
            },
            isActive: function () {
                return this.value.length > 0;
            }
        };

        // Grade Filter
        $scope.filters.gradeFilter = {
            min: 0,
            max: 15,
            lowest: 0,
            highest: 15,
            isDisabled: false,
            predicate: function (job) {
                if (this.isDisabled) {
                    return true; // predicate test passes when filter disabled
                } else {
                    return job.gradeInRange(this.min, this.max);
                }
            },
            reset: function (triggerUpdate) {
                this.min = this.lowest;
                this.max = this.highest;
            },
            isActive: function () {
                return !angular.equals(this.min, this.lowest) || !angular.equals(this.max, this.highest);
            },
            setGradeRange: function (minGrade, maxGrade) {
                if ($scope.jobs.hasAlphaGrades) {
                    // disable grade filter if job listings have alpha grades
                    this.isDisabled = true;
                    this.lowest = 0;
                    this.highest = 0;
                } else {
                    this.lowest = minGrade;
                    this.highest = maxGrade;
                }
            }
        };

        // Salary Filter
        $scope.filters.salaryFilter = {
            min: 0,
            max: 100000,
            lowest: 0,
            highest: 100000,
            predicate: function (job) {
                return job.salaryInRange(this.min, this.max);
            },
            reset: function (triggerUpdate) {
                this.min = this.lowest;
                this.max = this.highest;
                if (triggerUpdate) $scope.filter();
            },
            isActive: function () {
                return this.min >= this.lowest + 1 || this.max !== this.highest;
            },
            setSalaryRange: function (minSalary, maxSalary) {
                this.highest = maxSalary;
                this.lowest = minSalary;
                this.max = maxSalary > 100000 ? Math.ceil((maxSalary / 100000)) * 100000 : maxSalary;
                this.min = Math.floor(minSalary);
            }
        };

        // Pay Type Filter
        $scope.filters.payFilter = {
            hourly: "hourly",
            salaried: "salaried",
            all: "all",
            selection: "all",
            predicate: function (job) {
                if (this.selection === this.all) {
                    return true;
                } else if (this.selection === this.hourly) {
                    return job.hourly();
                } else if (this.selection === this.salaried) {
                    return job.salaried();
                } else {
                    return true;
                }
            },
            reset: function (triggerUpdate) {
                this.selection = this.all;
                if (triggerUpdate) $scope.filter();
            },
            isActive: function () {
                return !angular.equals(this.selection, this.all);
            }
        };

        // State filter
        $scope.filters.state = {
            value: null,
            predicate: function (job) {
                if (this.value === null) {
                    return true;
                } else if (job.Locations.indexOf(this.value.name) > -1) {
                    return true;
                } else {
                    return false;
                }
            },
            reset: function (triggerUpdate) {
                this.value = null;
                if (triggerUpdate) $scope.filter();
            },
            isActive: function () {
                return this.value !== null;
            }
        }

        /* Public Function Bindings */
        $scope.update = update;
        $scope.reset = reset;
        $scope.predicate = predicate;
        $scope.filter = filter;
        $scope.toggleAdvancedFilters = toggleAdvancedFilters;
        $scope.filters.setFiltersActive = setFiltersActive;

        /* Event Handling Setup*/
        setWatches();

        /* Functions */

        /**
         * @public
         * Update filter ranges based on current job results.
         */
        function update() {
            // don't attempt to update filter settings if there is no job
            // data
            if ($scope.jobs.JobData.length === 0) return;

            var maxGrade = $scope.jobs.getMaxGrade(),
                minGrade = $scope.jobs.getMinGrade(),
            // set max salary in range to near higher integer
                maxSalary = Math.ceil($scope.jobs.getMaxSalary()),
            // set min salary in range to near lower integer
                minSalary = Math.floor($scope.jobs.getMinSalary());

            // Set salary slider ranges
            $scope.filters.salaryFilter.setSalaryRange(minSalary, maxSalary);
            // Set grade slider ranges
            $scope.filters.gradeFilter.setGradeRange(minGrade, maxGrade);
        }

        /**
         * @public
         * Reset all filter objects states and notify app that filters have been reset.
         */
        function reset() {
            // reset all filters
            $scope.filters.gradeFilter.reset();
            $scope.filters.salaryFilter.reset();
            $scope.filters.payFilter.reset();
            $scope.filters.stringFilter.reset();
            $scope.filters.state.reset();
            events.filters.cleared(); // emit filter cleared event
            $scope.filter(); // explicitly trigger filter event
        }

        /**
         * @public
         * A predicate function for use in determining if a {Job} meets the current filter criteria.
         * @param {Object.<UsaJobsApp.Job>} job Job listing object for comparison
         * @returns {Boolean} Boolean indicating whether the job listing met the predicate criteria.
         *
         */
        function predicate(job) {
            return $scope.filters.gradeFilter.predicate(job)
                && $scope.filters.salaryFilter.predicate(job)
                && $scope.filters.payFilter.predicate(job)
                && $scope.filters.stringFilter.predicate(job)
                && $scope.filters.state.predicate(job);
        }

        /**
         * @public
         * Filter job results. Update the current filter status, emit an event containing the current
         * job predicate function and update the count of jobs currently meeting predicate criteria.
         */
        function filter() {
            $scope.filters.setFiltersActive();
            // broadcast notification with predicate function
            events.filters.changed(predicate);
            // $scope.updateVisibleFn(predicate);
            $scope.jobs.JobData.visibleCount = countVisible();
        }

        /**
         * @public
         * Toggle visibility of advanced filtering UI.
         */
        function toggleAdvancedFilters() {
            $scope.showAdvancedFilters = !$scope.showAdvancedFilters;
        }

        /**
         * @private
         * If any filters are active, set overall filter status to active.
         */
        function setFiltersActive() {
            // test all filters to see if they are active;
            this.filterStatus.active = this.gradeFilter.isActive()
                || this.salaryFilter.isActive()
                || this.payFilter.isActive()
                || this.stringFilter.isActive()
                || this.state.isActive();

            // if filters are zer
            if (this.filterStatus.active) {
                events.filters.cleared();
            }
        }

        /**
         * @private
         * Return a count of jobs that currently meet the filter criteria.
         */
        function countVisible() {
            var c = 0;
            angular.forEach($scope.jobs.JobData, function (job) {
                if (job.visible) c++;
            });
            return c;
        }

        /**
         * @private
         * Set scope event $watch-es and set global event listeners.
         */
        function setWatches() {
            // Watch for changes in the slider control objects
            // Normally this would be event-driven, but current slider UI
            // doesn't support triggered events.
            $scope.$watch('filters.salaryFilter.min', handleFilterChange);
            $scope.$watch('filters.salaryFilter.max', handleFilterChange);
            $scope.$watch('filters.gradeFilter.min', handleFilterChange);
            $scope.$watch('filters.gradeFilter.max', handleFilterChange);
            // Watch for new jobs and trigger update on change
            events.jobs.onAvailable(handleJobsChange);
            // Watch for clear filters request
            events.filters.onClear(reset);
            // watch for `Esc` keypress
            angular.element(document).keyup(handleKeyPress);
        }

        /**
         * @private
         * Handle keypress events
         * @param {Event}
         */
        function handleKeyPress(e) {
            // Check for `Esc` keypress
            if (e.keyCode == 27) {
                // reset filter
                $scope.reset();
                $scope.$apply();
            }
        }

        /**
         * @private
         * Handler function for filter object $watches
         */
        function handleFilterChange() {
            $scope.filter();
        }

        /**
         * @private
         * Handler function for new job data event.
         */
        function handleJobsChange() {
            $scope.update();
            $scope.reset();
            $scope.filter();
        }
    }

    /**
     * Directive displaying the number of jobs that meet current filter criteria.
     */
    function vacancyCountDescDirective() {

        return {
            restrict: 'E',
            scope: {},
            controller: 'vacancyCountDescController',
            templateUrl: 'vacancy-count.html'
        };
    }

    /**
     * Controller for directive displaying the number of jobs that meet current filter criteria.
     */
    vacancyCountDescController.$inject = ['$scope', 'Jobs'];
    function vacancyCountDescController($scope, Jobs) {
        $scope.jobs = Jobs;
        $scope.filterStatus = $scope.jobs.JobData.filterStatus;
        $scope.visibleCount = $scope.jobs.JobData.visibleCount;
    }

    /**
     * Directive displaying the total number of job results as well the name of the organization whose jobs
     * are being displayed.
     */
    function jobInfoDirective() {
        return {
            restrict: 'E',
            scope: {},
            controller: 'jobInfoController',
            templateUrl: 'job-info.html'
        };
    }

    /**
     * Controller for jobInfoDirective.
     */
    jobInfoController.$inject = ['$scope', 'Jobs'];
    function jobInfoController($scope, Jobs) {
        $scope.jobs = Jobs;
        $scope.refresh = refresh;

        function refresh() {
            $scope.jobs.getJobs();
        }
    }

})();

(function () {
    /**
     * @module UsaJobsMap Location module
     * - Job Location Factory
     * - Geocoding Service
     * - Geodata Caching Service
     */
    angular.module('UsaJobsApp.Location', ['UsaJobsApp.Settings', 'MomentModule', 'LeafletModule']);

    // Location Module Service Declarations

    angular.module('UsaJobsApp.Location').factory('JobLocation', JobLocationFactory);
    angular.module('UsaJobsApp.Location').service('geocodeService', geocodeService);
    angular.module('UsaJobsApp.Location').service('geodataCache', geodataCache);

    // Location Module Service Functions

    /**
     * JobLocation Object Factory
     * Job location object that automatically requests its geolocation
     * when created. Emits a "location available" notification when geodata
     * is available.
     */
    JobLocationFactory.$inject = ['geocodeService', 'eventService'];
    function JobLocationFactory(geocodeService, events) {
        /**
         * JobLocation Constructor
         * @param jobLoc
         * @constructor
         */
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
         * @public Emit notification alerting app that geodata is available and include
         *       a reference to this object.
         */
        function geodataAvailable() {
            events.geodata.available(this);
        }

        /**
         * @public Broadcast notification to app that geodata could not be found and include
         *       a reference to this object.
         *
         * @param {String} errorMsg String describing the reason for geocoding failure.
         */
        function hasNoGeodata(errorMsg) {
            this.noGeodataReason = errorMsg;
            events.geodata.notAvailable(this);
        }

        /**
         * @public Set geographic location for this this object and broadcast notification
         *       of available geodata to app.
         *
         * @param {*} geodata Object containing lat and lng data.
         */
        function setGeodata(geodata) {
            this.geodata = geodata;
            this.geodataAvailable();
        }

        /**
         * @public Indicate whether this location should be visible on a map. Mark the
         *       location as visible if any of the jobs associated with it are visible.
         *
         * @returns {Boolean}
         */
        function visible() {
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
         * @public Count the number of jobs at this location that are marked as
         *       visible.
         *
         * @returns {Number}
         */
        function countVisible() {
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
    geocodeService.$inject = ['$http', '$timeout', 'geodataCache', 'settings', 'eventService'];
    function geocodeService($http, $timeout, geodataCache, settings, events) {

        var attributionEmitted = false;

        /* Public Properties */
        this.queue = []; // geocode processing queue
        this.isRunning = false; // current processing status

        /* Public Functions */
        this.geocode = geocode;

        /* Private Functions */
        this._run = run;
        this._geocodeRun = geocodeRun;
        this._addToQueue = addToQueue;

        /* Functions */

        /**
         * @public Set geodata for the provided `JobLocation`. If no cached
         *       geodata exists, request geocoding using the geocoding service
         *       specified in the Settings module.
         *
         * @param {JobLocation} location `JobLocation` to be geocoded
         */
        function geocode(location) {
            var geodata;
            // check if location data is cached
            if ((geodata = geodataCache.getLocation(location.name))) {
                // set geodata from cached location
                location.setGeodata(geodata);
            } else {
                // otherwise, queue for geocoding
                this._addToQueue(location);
            }

            // If geocoding is requested by the app, emit
            //  a notification that a data source attribution
            // needs to be displayed.
            if (!attributionEmitted) {
                emitAttribution();
            }
        }

        /**
         * @private Emit  a notification that a data source attribution
         needs to be displayed.
         */
        function emitAttribution() {
            var str = '<a href="' + settings.geocoding.infoURL + '" ';
            str += 'title="Job locations plotted using ' + settings.geocoding.name + ' Geocoding API" ';
            str += 'target="_blank">';
            str += settings.geocoding.name;
            str += '</a>';
            events.location.setAttribution(str);
            attributionEmitted = true;
        }

        /**
         * @private Add a `JobLocation` to the geocode processing queue.
         * @param {JobLocation} location
         */
        function addToQueue(location) {
            this.queue.push(location);
            this._run();
        }

        /**
         * @private Begin processing the geocoding queue or advance the currently
         *        running queue. Calls are rate-limited to comply with API guidelines.
         *
         * @param {Boolean} advanceQueue Boolean indicating whether the currently running queue
         *                     should advance.
         */
        function run(advanceQueue) {
            var scope = this;
            // Dispatch first geocode if queue processing has not started.
            // If the queue is processing, only dispatch next geocode if the
            // function is called from the rate limiter with advanceQueue=true.
            if (!scope.isRunning || scope.isRunning && advanceQueue) {
                scope.isRunning = true;

                if (scope.queue.length > 0) {
                    $timeout(function () {
                        scope._geocodeRun();
                        scope._run(true);
                    }, settings.geocoding.rateLimit);
                } else {
                    scope.isRunning = false;
                }
            }
        }

        /**
         * @private Pop a JobLocation off of the geocoding queue and
         *        dispatch a geocoding request.
         */
        function geocodeRun() {
            var scope = this, // closure reference for callbacks
                location = scope.queue.shift(),
                geodata = {};

            // Request geocoding and store reference to promise object
            geodata.promise = $http.get(settings.geocoding.query(location.name));
            // Success
            geodata.promise.success(function (data, status, q) {
                var geoLoc;

                if (data.error_message && data.status === "OVER_QUERY_LIMIT") {
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
    geodataCache.$inject = ['$timeout', 'moment'];
    function geodataCache($timeout) {
        var queue = [], // Geodata cache addition queue
            queueRunning = false, // Status of geodata queue processing
            geodata;

        // The geodata cache
        this.geodata = geodata = (function () {
            // The stringified cache is parsed and returned once at startup
            if (angular.isUndefined(window.localStorage)) {
                // if browser does not support local storage, return
                // an empty placeholder object
                return {};
            } else if (angular.isDefined(localStorage.geodataCache)) {
                // on startup, parse and set cached geodata
                return parseAndCleanCache(localStorage.geodataCache);
            } else {
                // or instantiate the cache if it doesn't exist
                localStorage.geodataCache = JSON.stringify({});
                return {};
            }
        })();

        /* Public Function Bindings */
        this.locNameArr = locNameArr;
        this.getLocation = getLocation;
        this.addLocations = addLocations;

        /* Functions */

        /**
         * @private
         * Remove stale geodata from cache when first parsed.
         * @returns {*}
         */
        function parseAndCleanCache(json) {
            var geodata = JSON.parse(json),
                cleaned = {},
                cutoff = moment().subtract(90, 'days');

            // Add key to `cleaned` only if it was geocoded
            // in the last 60 days
            angular.forEach(geodata, function (item, key) {
                if (item.date && moment(item.date).isAfter(cutoff))
                    cleaned[key] = item;
            });

            return cleaned;
        }

        /**
         * @public Returns an array of location names
         * @returns { Array }
         */
        function locNameArr() {
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
        function getLocation(locName) {
            return this.geodata[locName];
        };

        /**
         * @public Add all geolocations provided to geodata caching queue
         * and begin processing.
         */
        function addLocations() {
            var locs = [].slice.call(arguments, 0);
            queue.push(locs);
            runQueue();
        }

        /**
         * @private Add geodata in queue to the cache
         */
        function runQueue() {
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
        function cacheLocations(locs) {
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
        function exists(loc) {
            if (window.localStorage) {
                return localStorage.geodataCache.indexOf(loc.name) !== -1;
            } else {
                return false;
            }
        }
    }

})();

(function () {
    /**
     * @module UsaJobsApp Job Table Module
     * - Directive and controller for displaying job listings in a table.
     */
    angular.module('UsaJobsApp.JobTable', ['UsaJobsApp.Data']);

    // Job Table Module Service Declarations

    angular.module('UsaJobsApp.JobTable').controller('jobTableCtrl', jobTableController);
    angular.module('UsaJobsApp.JobTable').directive('jobTable', jobTableDirective);

    // Job Table Module Service Functions

    /**
     * Job Table Controller
     */
    jobTableController.$inject = ['$scope', '$filter', 'Jobs', 'eventService'];
    function jobTableController($scope, $filter, Jobs, Events) {
        $scope.jobs = Jobs;
        $scope.filterStatus = $scope.jobs.JobData.filterStatus;
        $scope.predicate = 'daysRemaining'; // "sort by" predicate
        $scope.reverse = false; // reverse sorting
        $scope.setPredicate = setPredicate; // set "sort by" predicate
        $scope.setSalaryPredicate = setSalaryPredicate;
        $scope.clearFilters = clearFilters;

        /**
         * @public Manage transition between different sorting predicates by reverting
         * to default sort direction when the predicate changes.
         * @param {String} newP
         */
        function setPredicate(newP) {
            if (newP !== $scope.predicate) {
                // if the sorting predicate has changed,
                // return the sort direction to the default state.
                $scope.predicate = newP;
                $scope.reverse = false;
            } else {
                // otherwise toggle the sort direction
                $scope.reverse = !$scope.reverse;
            }
        }

        /*
         * Specialized sort predicate generator for Salary. Salary data is a
         * range, so lowest amount is used for ascending sort and highest amount
         * is used for descending sort.
         */
        function setSalaryPredicate() {
            if ($scope.predicate === 'salaryMinInt') {
                $scope.predicate = 'salaryMaxInt';
                $scope.reverse = true;
            } else if ($scope.predicate === 'salaryMaxInt') {
                $scope.predicate = 'salaryMinInt';
                $scope.reverse = false;
            } else {
                $scope.predicate = 'salaryMaxInt';
                $scope.reverse = true;
            }
        }

        /**
         * Emit request to clear all job data filters
         */
        function clearFilters() {
            Events.filters.clear();
        }
    }

    /**
     * Job Table Directive function
     */
    function jobTableDirective() {
        return {
            restrict: 'E',
            controller: 'jobTableCtrl',
            scope: {},
            templateUrl: 'job-table.html'
        };
    }

})();

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
    angular.module('UsaJobsApp.Map', ['LeafletModule', 'UsaJobsApp.Settings', 'UsaJobsApp.Utilities',
        'UsaJobsApp.Location', 'UsaJobsApp.Data']);

    // Map Module Service Declarations
    angular.module('UsaJobsApp.Map').controller('JobMapController', JobMapController);
    angular.module('UsaJobsApp.Map').directive('jobMap', jobMapDirective);
    angular.module('UsaJobsApp.Map').factory('mapResetControl', mapResetControl);
    angular.module('UsaJobsApp.Map').factory('mapShowAllControl', mapShowAllControl);
    angular.module('UsaJobsApp.Map').service('markers', markers);

    // Map Module Functions

    /**
     * Job Map Controller
     */
    JobMapController.$inject = ['$scope', 'eventService', 'leaflet', 'JobLocation',
        'markers', 'Jobs'];
    function JobMapController($scope, events, leaflet, JobLocation, markers, Jobs) {
        /* Scope variables */
        $scope.jobs = Jobs;
        $scope.markers = []; // Marker tracking collection
        $scope.markerLookup = {}; // Marker lookup collection
        $scope.locations = []; // JobLocation tracking collection

        /* Event bindings */
        events.jobs.onAvailable(onJobsResolved);
        events.jobs.onUpdateVisible(updateVisible);
        events.jobs.onQueryStarted(resetMarkers);
        events.geodata.onAvailable(onGeodataAvailable);
        events.geodata.onNotAvailable(onGeodataNotAvailable);
        events.location.onSetAttribution(addGeocodeAttribution);

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
         * Called when Job resources resolves
         */
        function onJobsResolved() {
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
         * @private
         * Add marker to map or update existing marker when new geodata becomes available.
         * @param {Event} e
         * @param {JobLocation} L
         */
        function onGeodataAvailable(e, L) {
            updateMarkerForLoc(L);
            $scope.geodataStatus.addResolved();
            $scope.map.allMarkersBounds.extend([L.geodata.lat, L.geodata.lon]);

            // TODO: If the user hasn't touched the map, Show all markers
            // by extending map view bounds intelligently as markers are added.
        }

        /**
         * @private
         * If a a JobLocation could not be geocoded, add to a list of
         * locations without geodata that will be displayed in the map UI.
         * @param {Event} e
         * @param {JobLocation} L
         */
        function onGeodataNotAvailable(e, L) {
            $scope.locationsNoGeodata.push(L);
            $scope.locationsNoGeodata.updateJobCount();
            $scope.geodataStatus.addResolved();
        }

        function addGeocodeAttribution(e, str) {
            if (angular.isDefined($scope.map.attributionControl)) {
                $scope.map.attributionControl.addAttribution(str);
            }
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
                if (!location.geodata.$resolved) return;
                updateMarkerForLoc(location);
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

            marker = leaflet.marker([location.geodata.lat, location.geodata.lon], {
                title: location.name,
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
            $scope.geodataStatus.reset();
            $scope.locationsNoGeodata.length = 0;
        }
    }

    /**
     * Job Map Directive
     *
     * @scope
     */
    jobMapDirective.$inject = ['$compile', 'leaflet', 'mapResetControl', 'mapShowAllControl',
        'markers', 'settings', 'eventService'];
    function jobMapDirective($compile, leaflet, mapResetControl, mapShowAllControl, markers, settings, events) {
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

                // Add geodata tracking object
                scope.geodataStatus = {
                    loading: false,
                    resolvedCount: 0,
                    pendingCount: 0,
                    addPending: function () {
                        this.pendingCount += 1;
                        this.loading = true;
                    },
                    addResolved: function () {
                        this.resolvedCount += 1;
                        if (this.resolvedCount === this.pendingCount) {
                            this.loading = false;
                        }
                    },
                    reset: function () {
                        this.resolvedCount = 0;
                        this.pendingCount = 0;
                    }
                };

                // Add geodata tracking UI element
                addGeodataStatusEl();
                // Add No Geodata Available List
                addNoGeolocList();

                $compile(element.contents())(scope);
                // Set up Leaflet map
                scope.map = leafletMap();

                /*
                 * Functions
                 */

                function addGeodataStatusEl() {
                    elStr = '';
                    elStr += '<div class="geodata-status center-block" ng-show="geodataStatus.loading">';
                    elStr += '<i class="fa fa-fw fa-circle-o-notch fa-spin"></i> {{ geodataStatus.resolvedCount }} of {{ geodataStatus.pendingCount }} job locations mapped';
                    elStr += '</div>';
                    var el = angular.element(elStr);

                    element.append(el);
                }

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
                    el += '<h5>{{ locationsNoGeodata.jobCount }} Job<span ng-hide="locationsNoGeodata.jobCount === 1">s</span> Not on Map <small><a ng-click="locationsNoGeodata.maximized = !locationsNoGeodata.maximized">{{locationsNoGeodata.maximized ? \'Hide\' : \'Show\' }}</a></small></h5>';
                    el += '<div ng-show="locationsNoGeodata.maximized" class="loc-no-geodata-list-container">';
                    el += '<div ng-repeat="location in locationsNoGeodata">';
                    el += '<h6 class="small bold">{{location.name}}</h6>';
                    el += '<p class="alert alert-warning small">{{ location.noGeodataReason }}</p>';
                    el += '<ul class="loc-popup-job-list list-unstyled">';
                    el += '<li class="loc-popup-job-list-item clearfix" ng-repeat="job in location.jobs">';
                    el += '<a class="loc-popup-job-list-item-link" ng-href="{{ job.ApplyOnlineURL }}" target="_blank" title="{{ job.JobTitle }}\r\nView this job announcement on USAJobs.gov">{{ job.JobTitle }}</a>';
                    el += '<span class="loc-popup-job-list-item-tag small" title="Grade">{{job.PayPlan + \'&#8209;\' + job.Grade}}</span>';
                    el += '<span class="loc-popup-job-list-item-tag small" title="Salary">{{job.SalaryMin + \'&#8209;\' + job.SalaryMax | trailingzeroes}}</span>';
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
                        return map.getBounds().contains([loc.geodata.lat, loc.geodata.lon]);
                    }

                    /**
                     * @public
                     * Test to see if JobLocation is within map view starting bounds
                     * @param {JobLocation} loc
                     * @returns {Boolean}
                     */
                    function inStartBounds(loc) {
                        return map.startBounds.contains([loc.geodata.lat, loc.geodata.lon]);
                    }

                    /**
                     * @public
                     * Accounting for drift, test if the map is at its starting position.
                     * @returns {Boolean}
                     */
                    function mapViewCentered() {
                        // Determine if map ic centered. Allow for slight drift.
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
                         * @param {Event} e
                         */
                        function handleZoomEnd(e) {
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

                        marker = L.circleMarker([location.geodata.lat, location.geodata.lon], {
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
        }
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
                autoPanPaddingBottomRight: leaflet.point(12, 36),

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
                    .attr('href', job.ApplyOnlineURL)
                    .attr('target', '_blank')
                    .html(job.JobTitle.replace(/-/g, '&#8209;'))
                    .attr('title', job.JobTitle +
                        '\r\nView this job announcement on USAJobs.gov');
                spanGrd = angular.element(
                    '<span class="loc-popup-job-list-item-tag small"></span>').html(
                    job.PayPlan + '&#8209;' + job.Grade).attr('title', 'Grade');
                spanSal = angular.element(
                    '<span class="loc-popup-job-list-item-tag small"></span>')
                    .html($filter('trailingzeroes')(
                        job.SalaryMin + '&#8209;' + job.SalaryMax)).attr(
                        'title', 'Salary');
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

(function () {
    /**
     * @module UsaJobsMap Custom Filters Module
     */
    angular.module('UsaJobsApp.Filters', ['MomentModule']);
    // Filter Declarations

    angular.module('UsaJobsApp.Filters').filter('grade', usaJobsGradeFilter);
    angular.module('UsaJobsApp.Filters').filter('trailingzeroes', trailingZeroesFilter);
    angular.module('UsaJobsApp.Filters').filter('datedescription', dateDescriptionFilter);
    angular.module('UsaJobsApp.Filters').filter('stateAbbreviation', statePostalAbbreviationFilter);
    angular.module('UsaJobsApp.Filters').constant('stateAbbreviationValues', stateAbbrevValues());

    // Filter Functions

    /**
     * Pay Grade Format Filter
     * Pads Pay Grade number with a leading 0. (Ex: input `5` returns `05`)
     * @returns {Function} returns filter function.
     */
    function usaJobsGradeFilter() {
        return function (input) {
            var output = input.toString();
            if (output.length < 2) {
                output = '0' + output;
            }
            return output;
        };
    }

    /**
     * Trailing Zeroes Filter
     * Remove trailing cents from Salary amount.
     * @returns {Function} returns filter function.
     */
    function trailingZeroesFilter() {
        return function (input) {
            return input.replace(/\.0+/g, "");
        };
    }

    /**
     * Date Format Filter
     * Return date in date format specified in Settings module.
     * Since this intended to be used to display Job closing dates,
     * it returns a description, "today" if the Job closing date
     * matches the current date.
     * @returns {Function} returns filter function.
     */
    dateDescriptionFilter.$inject = ['moment', 'settings'];
    function dateDescriptionFilter(moment, settings) {
        return function (input) {
            var d = moment(input, settings.usaJobs.dateFormat),
                today = moment().diff(d, 'days') === 0;

            if (today) {
                return 'today';
            } else {
                return d.fromNow();
            }
        };
    }

    /**
     * State Name Abbreviation Filter
     * Converts full state names to abbreviations to save space.
     * @returns {Function} returns filter function.
     */
    statePostalAbbreviationFilter.$inject = ['stateAbbreviationValues'];
    function statePostalAbbreviationFilter(stateAbbr) { // inject State abbreviation data
        return function filter(input, style) {
            var state, re;
            // iterate through state names
            for (state in stateAbbr) {
                // construct regex matching state name after comma
                re = new RegExp(',.*' + state, 'i');
                // test for state name in input
                if (input.indexOf(state) !== -1) {
                    // exit and return modified input string if found
                    if (style === 'AP') {
                        return input.replace(re, ', ' + stateAbbr[state].apStyle);
                    } else {
                        return input.replace(re, ', ' + stateAbbr[state].postal);
                    }
                }
            }
            // return unchanged input if there is no match
            return input;
        }
    }

    /**
     * stateAbbreviationValues Constant Data
     * Return data for use in stateAbbreviationValues constant.
     * @returns {Object}
     */
    function stateAbbrevValues() {
        return {
            "Alabama": {
                postal: "AL",
                apStyle: "Ala."
            },
            "Alaska": {
                postal: "AK",
                apStyle: "Alaska"
            },
            "Arizona": {
                postal: "AZ",
                apStyle: "Ariz."
            },
            "Arkansas": {
                postal: "AR",
                apStyle: "Ark."
            },
            "California": {
                postal: "CA",
                apStyle: "Calif."
            },
            "Colorado": {
                postal: "CO",
                apStyle: "Colo."
            },
            "Connecticut": {
                postal: "CT",
                apStyle: "Conn."
            },
            "Delaware": {
                postal: "DE",
                apStyle: "Del."
            },
            "District of Columbia": {
                postal: "DC",
                apStyle: "D.C."
            },
            "Florida": {
                postal: "FL",
                apStyle: "Fla."
            },
            "Georgia": {
                postal: "GA",
                apStyle: "Ga."
            },
            "Hawaii": {
                postal: "HI",
                apStyle: "Hawaii"
            },
            "Idaho": {
                postal: "ID",
                apStyle: "Idaho"
            },
            "Illinois": {
                postal: "IL",
                apStyle: "Ill."
            },
            "Indiana": {
                postal: "IN",
                apStyle: "Ind."
            },
            "Iowa": {
                postal: "IA",
                apStyle: "Iowa"
            },
            "Kansas": {
                postal: "KS",
                apStyle: "Kan."
            },
            "Kentucky": {
                postal: "KY",
                apStyle: "Ky."
            },
            "Louisiana": {
                postal: "LA",
                apStyle: "La."
            },
            "Maine": {
                postal: "ME",
                apStyle: "Maine"
            },
            "Maryland": {
                postal: "MD",
                apStyle: "Md."
            },
            "Massachusetts": {
                postal: "MA",
                apStyle: "Mass."
            },
            "Michigan": {
                postal: "MI",
                apStyle: "Mich."
            },
            "Minnesota": {
                postal: "MN",
                apStyle: "Minn."
            },
            "Mississippi": {
                postal: "MS",
                apStyle: "Miss."
            },
            "Missouri": {
                postal: "MO",
                apStyle: "Mo."
            },
            "Montana": {
                postal: "MT",
                apStyle: "Mont."
            },
            "Nebraska": {
                postal: "NE",
                apStyle: "Neb."
            },
            "Nevada": {
                postal: "NV",
                apStyle: "Nev."
            },
            "New Hampshire": {
                postal: "NH",
                apStyle: "N.H."
            },
            "New Jersey": {
                postal: "NJ",
                apStyle: "N.J."
            },
            "New Mexico": {
                postal: "NM",
                apStyle: "N.M."
            },
            "New York": {
                postal: "NY",
                apStyle: "N.Y."
            },
            "North Carolina": {
                postal: "NC",
                apStyle: "N.C."
            },
            "North Dakota": {
                postal: "ND",
                apStyle: "N.D."
            },
            "Ohio": {
                postal: "OH",
                apStyle: "Ohio"
            },
            "Oklahoma": {
                postal: "OK",
                apStyle: "Okla."
            },
            "Oregon": {
                postal: "OR",
                apStyle: "Ore."
            },
            "Pennsylvania": {
                postal: "PA",
                apStyle: "Pa."
            },
            "Rhode Island": {
                postal: "RI",
                apStyle: "R.I."
            },
            "South Carolina": {
                postal: "SC",
                apStyle: "S.C."
            },
            "South Dakota": {
                postal: "SD",
                apStyle: "S.D."
            },
            "Tennessee": {
                postal: "TN",
                apStyle: "Tenn."
            },
            "Texas": {
                postal: "TX",
                apStyle: "Texas"
            },
            "Utah": {
                postal: "UT",
                apStyle: "Utah"
            },
            "Vermont": {
                postal: "VT",
                apStyle: "Vt."
            },
            "Virginia": {
                postal: "VA",
                apStyle: "Va."
            },
            "Washington": {
                postal: "WA",
                apStyle: "Wash."
            },
            "West Virginia": {
                postal: "WV",
                apStyle: "W.Va."
            },
            "Wisconsin": {
                postal: "WI",
                apStyle: "Wis."
            },
            "Wyoming": {
                postal: "WY",
                apStyle: "Wyo."
            },
        }
    }

})();

(function () {
    /**
     * UsaJobsMap External Dependencies - Encapsulates external dependencies as
     * modules so that they can be called with direct injection.
     */
    /**
     * @module MomentJS Module - Wrap Moment.js time/date library so it can be
     *         injected using dependency injection.
     */
    angular.module('MomentModule', []).factory('moment', ['$window', function ($window) {
        return $window.moment;
    }]);

    /**
     * @module LeafletJS Module - Wrap LeafletJS map library so it can be
     *         injected using dependency injection.
     */
    angular.module('LeafletModule', []).factory('leaflet', ['$window', function ($window) {
        return $window.L;
    }]);
})();

/**
 * App Global Utility Functions Module
 */

(function () {
    /*
     * @module Utilities
     */
    angular.module('UsaJobsApp.Utilities', []);
    angular.module('UsaJobsApp.Utilities').constant('unique', function (array) {
        var i, j, a = array.concat();
        for (i = 0; i < a.length; ++i) {
            for (j = i + 1; j < a.length; ++j) {
                if (a[i] === a[j]) {
                    a.splice(j--, 1);
                }
            }
        }
        return a;
    });

    angular.module('UsaJobsApp.Utilities').constant('pluralize', function (count, root, singular, plural) {
        return (count != 1) ? (root + plural) : (root + singular);
    });
})();


/*
 * Rangeslide UI Module
 */
(function () {
    /*
     * Angular RangeSlider Directive Version: 0.0.13 Author: Daniel Crisp,
     * danielcrisp.com The rangeSlider has been styled to match the default
     * styling of form elements styled using Twitter's Bootstrap Originally
     * forked from https://github.com/leongersen/noUiSlider This code is
     * released under the MIT Licence - http://opensource.org/licenses/MIT
     * Copyright (c) 2013 Daniel Crisp Permission is hereby granted, free of
     * charge, to any person obtaining a copy of this software and associated
     * documentation files (the "Software"), to deal in the Software without
     * restriction, including without limitation the rights to use, copy,
     * modify, merge, publish, distribute, sublicense, and/or sell copies of the
     * Software, and to permit persons to whom the Software is furnished to do
     * so, subject to the following conditions: The above copyright notice and
     * this permission notice shall be included in all copies or substantial
     * portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT
     * WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
     * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
     * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
     * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
     * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH
     * THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
     */
    // check if we need to support legacy angular
    var legacySupport = (angular.version.major === 1 && angular.version.minor === 0);

    /**
     * RangeSlider, allows user to define a range of values using a slider Touch
     * friendly.
     *
     * @directive
     */
    angular.module('ui-rangeSlider', []).directive('rangeSlider',
        ['$document',
            '$filter',
            '$log',
            function ($document, $filter, $log) {

                // test for mouse, pointer or touch
                var eventNamespace = '.rangeSlider',

                    defaults = {
                        disabled: false,
                        orientation: 'horizontal',
                        step: 0,
                        decimalPlaces: 0,
                        showValues: true,
                        preventEqualMinMax: false,
                        attachHandleValues: false
                    },

                // Determine the events to bind. IE11 implements
                // pointerEvents without
                // a prefix, which breaks compatibility with the
                // IE10 implementation.
                    /** @const */
                    actions = window.navigator.pointerEnabled ? {
                        start: 'pointerdown',
                        move: 'pointermove',
                        end: 'pointerup',
                        over: 'pointerdown',
                        out: 'mouseout'
                    } : window.navigator.msPointerEnabled ? {
                        start: 'MSPointerDown',
                        move: 'MSPointerMove',
                        end: 'MSPointerUp',
                        over: 'MSPointerDown',
                        out: 'mouseout'
                    } : {
                        start: 'mousedown touchstart',
                        move: 'mousemove touchmove',
                        end: 'mouseup touchend',
                        over: 'mouseover touchstart',
                        out: 'mouseout'
                    },

                    onEvent = actions.start + eventNamespace, moveEvent = actions.move + eventNamespace, offEvent = actions.end
                        + eventNamespace, overEvent = actions.over + eventNamespace, outEvent = actions.out
                        + eventNamespace,

                // get standarised clientX and clientY
                    client = function (f) {
                        try {
                            return [
                                (f.clientX || f.originalEvent.clientX || f.originalEvent.touches[0].clientX),
                                (f.clientY || f.originalEvent.clientY || f.originalEvent.touches[0].clientY)];
                        } catch (e) {
                            return ['x', 'y'];
                        }
                    },

                    restrict = function (value) {

                        // normalize so it can't move out of bounds
                        return (value < 0 ? 0 : (value > 100 ? 100 : value));

                    },

                    isNumber = function (n) {
                        // console.log(n);
                        return !isNaN(parseFloat(n)) && isFinite(n);
                    },

                    scopeOptions = {
                        disabled: '=?',
                        min: '=',
                        max: '=',
                        modelMin: '=?',
                        modelMax: '=?',
                        onHandleDown: '&', // calls optional
                        // function when handle
                        // is grabbed
                        onHandleUp: '&', // calls optional
                        // function when handle
                        // is released
                        orientation: '@', // options: horizontal |
                        // vertical | vertical
                        // left | vertical right
                        step: '@',
                        decimalPlaces: '@',
                        filter: '@',
                        filterOptions: '@',
                        showValues: '@',
                        pinHandle: '@',
                        preventEqualMinMax: '@',
                        attachHandleValues: '@'
                    };

                if (legacySupport) {
                    // make optional properties required
                    scopeOptions.disabled = '=';
                    scopeOptions.modelMin = '=';
                    scopeOptions.modelMax = '=';
                }

                // if (EVENT < 4) {
                // // some sort of touch has been detected
                // angular.element('html').addClass('ngrs-touch');
                // } else {
                // angular.element('html').addClass('ngrs-no-touch');
                // }

                return {
                    restrict: 'A',
                    replace: true,
                    template: [
                        '<div class="ngrs-range-slider">',
                        '<div class="ngrs-runner">',
                        '<div class="ngrs-handle ngrs-handle-min"><i></i></div>',
                        '<div class="ngrs-handle ngrs-handle-max"><i></i></div>',
                        '<div class="ngrs-join"></div>',
                        '</div>',
                        '<div class="ngrs-value-runner">',
                        '<div class="ngrs-value ngrs-value-min" ng-show="showValues"><div>{{filteredModelMin}}</div></div>',
                        '<div class="ngrs-value ngrs-value-max" ng-show="showValues"><div>{{filteredModelMax}}</div></div>',
                        '</div>', '</div>'].join(''),
                    scope: scopeOptions,
                    link: function (scope, element, attrs, controller) {

                        /**
                         * FIND ELEMENTS
                         */

                        var $slider = angular.element(element), handles = [
                            element.find('.ngrs-handle-min'), element.find('.ngrs-handle-max')], values = [
                            element.find('.ngrs-value-min'), element.find('.ngrs-value-max')], join = element
                            .find('.ngrs-join'), pos = 'left', posOpp = 'right', orientation = 0, allowedRange = [
                            0, 0], range = 0, down = false;

                        // filtered
                        scope.filteredModelMin = scope.modelMin;
                        scope.filteredModelMax = scope.modelMax;

                        /**
                         * FALL BACK TO DEFAULTS FOR SOME
                         * ATTRIBUTES
                         */

                        attrs.$observe('disabled', function (val) {
                            if (!angular.isDefined(val)) {
                                scope.disabled = defaults.disabled;
                            }

                            scope.$watch('disabled', setDisabledStatus);
                        });

                        attrs.$observe('orientation', function (val) {
                            if (!angular.isDefined(val)) {
                                scope.orientation = defaults.orientation;
                            }

                            var classNames = scope.orientation.split(' '), useClass;

                            for (var i = 0, l = classNames.length; i < l; i++) {
                                classNames[i] = 'ngrs-' + classNames[i];
                            }

                            useClass = classNames.join(' ');

                            // add class to element
                            $slider.addClass(useClass);

                            // update pos
                            if (scope.orientation === 'vertical'
                                || scope.orientation === 'vertical left'
                                || scope.orientation === 'vertical right') {
                                pos = 'top';
                                posOpp = 'bottom';
                                orientation = 1;
                            }
                        });

                        attrs.$observe('step', function (val) {
                            if (!angular.isDefined(val)) {
                                scope.step = defaults.step;
                            }
                        });

                        attrs.$observe('decimalPlaces', function (val) {
                            if (!angular.isDefined(val)) {
                                scope.decimalPlaces = defaults.decimalPlaces;
                            }
                        });

                        attrs.$observe('showValues', function (val) {
                            if (!angular.isDefined(val)) {
                                scope.showValues = defaults.showValues;
                            } else {
                                if (val === 'false') {
                                    scope.showValues = false;
                                } else {
                                    scope.showValues = true;
                                }
                            }
                        });

                        attrs.$observe('pinHandle', function (val) {
                            if (!angular.isDefined(val)) {
                                scope.pinHandle = null;
                            } else {
                                if (val === 'min' || val === 'max') {
                                    scope.pinHandle = val;
                                } else {
                                    scope.pinHandle = null;
                                }
                            }

                            scope.$watch('pinHandle', setPinHandle);
                        });

                        attrs.$observe('preventEqualMinMax', function (val) {
                            if (!angular.isDefined(val)) {
                                scope.preventEqualMinMax = defaults.preventEqualMinMax;
                            } else {
                                if (val === 'false') {
                                    scope.preventEqualMinMax = false;
                                } else {
                                    scope.preventEqualMinMax = true;
                                }
                            }
                        });

                        attrs.$observe('attachHandleValues', function (val) {
                            if (!angular.isDefined(val)) {
                                scope.attachHandleValues = defaults.attachHandleValues;
                            } else {
                                if (val === 'true' || val === '') {
                                    // flag as true
                                    scope.attachHandleValues = true;
                                    // add class to runner
                                    element.find('.ngrs-value-runner')
                                        .addClass('ngrs-attached-handles');
                                } else {
                                    scope.attachHandleValues = false;
                                }
                            }
                        });

                        // listen for changes to values
                        scope.$watch('min', setMinMax);
                        scope.$watch('max', setMinMax);

                        scope.$watch('modelMin', setModelMinMax);
                        scope.$watch('modelMax', setModelMinMax);

                        /**
                         * HANDLE CHANGES
                         */

                        function setPinHandle(status) {
                            if (status === "min") {
                                angular.element(handles[0]).css('display', 'none');
                                angular.element(handles[1]).css('display', 'block');
                            } else if (status === "max") {
                                angular.element(handles[0]).css('display', 'block');
                                angular.element(handles[1]).css('display', 'none');
                            } else {
                                angular.element(handles[0]).css('display', 'block');
                                angular.element(handles[1]).css('display', 'block');
                            }
                        }

                        function setDisabledStatus(status) {
                            if (status) {
                                $slider.addClass('ngrs-disabled');
                            } else {
                                $slider.removeClass('ngrs-disabled');
                            }
                        }

                        function setMinMax() {

                            if (scope.min > scope.max) {
                                throwError('min must be less than or equal to max');
                            }

                            // only do stuff when both values
                            // are ready
                            if (angular.isDefined(scope.min) && angular.isDefined(scope.max)) {

                                // make sure they are numbers
                                if (!isNumber(scope.min)) {
                                    throwError('min must be a number');
                                }

                                if (!isNumber(scope.max)) {
                                    throwError('max must be a number');
                                }

                                range = scope.max - scope.min;
                                allowedRange = [scope.min, scope.max];

                                // update models too
                                setModelMinMax();

                            }
                        }

                        function setModelMinMax() {

                            if (scope.modelMin > scope.modelMax) {
                                throwWarning('modelMin must be less than or equal to modelMax');
                                // reset values to correct
                                scope.modelMin = scope.modelMax;
                            }

                            // only do stuff when both values
                            // are ready
                            if ((angular.isDefined(scope.modelMin) || scope.pinHandle === 'min')
                                && (angular.isDefined(scope.modelMax) || scope.pinHandle === 'max')) {

                                // make sure they are numbers
                                if (!isNumber(scope.modelMin)) {
                                    if (scope.pinHandle !== 'min') {
                                        throwWarning('modelMin must be a number');
                                    }
                                    scope.modelMin = scope.min;
                                }

                                if (!isNumber(scope.modelMax)) {
                                    if (scope.pinHandle !== 'max') {
                                        throwWarning('modelMax must be a number');
                                    }
                                    scope.modelMax = scope.max;
                                }

                                var handle1pos = restrict(((scope.modelMin - scope.min) / range) * 100), handle2pos = restrict(((scope.modelMax - scope.min) / range) * 100), value1pos, value2pos;

                                if (scope.attachHandleValues) {
                                    value1pos = handle1pos;
                                    value2pos = handle2pos;
                                }

                                // make sure the model values
                                // are within the allowed range
                                scope.modelMin = Math.max(scope.min, scope.modelMin);
                                scope.modelMax = Math.min(scope.max, scope.modelMax);

                                if (scope.filter && scope.filterOptions) {
                                    scope.filteredModelMin = $filter(scope.filter)(scope.modelMin,
                                        scope.filterOptions);
                                    scope.filteredModelMax = $filter(scope.filter)(scope.modelMax,
                                        scope.filterOptions);
                                } else if (scope.filter) {

                                    var filterTokens = scope.filter.split(':'), filterName = scope.filter
                                        .split(':')[0], filterOptions = filterTokens.slice().slice(
                                        1), modelMinOptions, modelMaxOptions;

                                    // properly parse string and
                                    // number args
                                    filterOptions = filterOptions
                                        .map(function (arg) {
                                            if (isNumber(arg)) {
                                                return +arg;
                                            } else if ((arg[0] == "\"" && arg[arg.length - 1] == "\"")
                                                || (arg[0] == "\'" && arg[arg.length - 1] == "\'")) {
                                                return arg
                                                    .slice(1, -1);
                                            }
                                        });

                                    modelMinOptions = filterOptions.slice();
                                    modelMaxOptions = filterOptions.slice();
                                    modelMinOptions.unshift(scope.modelMin);
                                    modelMaxOptions.unshift(scope.modelMax);

                                    scope.filteredModelMin = $filter(filterName).apply(null,
                                        modelMinOptions);
                                    scope.filteredModelMax = $filter(filterName).apply(null,
                                        modelMaxOptions);
                                } else {
                                    scope.filteredModelMin = scope.modelMin;
                                    scope.filteredModelMax = scope.modelMax;
                                }

                                // check for no range
                                if (scope.min === scope.max && scope.modelMin == scope.modelMax) {

                                    // reposition handles
                                    angular.element(handles[0]).css(pos, '0%');
                                    angular.element(handles[1]).css(pos, '100%');

                                    if (scope.attachHandleValues) {
                                        // reposition values
                                        angular.element(values[0]).css(pos, '0%');
                                        angular.element(values[1]).css(pos, '100%');
                                    }

                                    // reposition join
                                    angular.element(join).css(pos, '0%').css(posOpp, '0%');

                                } else {

                                    // reposition handles
                                    angular.element(handles[0]).css(pos, handle1pos + '%');
                                    angular.element(handles[1]).css(pos, handle2pos + '%');

                                    if (scope.attachHandleValues) {
                                        // reposition values
                                        angular.element(values[0]).css(pos, value1pos + '%');
                                        angular.element(values[1]).css(pos, value2pos + '%');
                                        angular.element(values[1]).css(posOpp, 'auto');
                                    }

                                    // reposition join
                                    angular.element(join).css(pos, handle1pos + '%').css(posOpp,
                                        (100 - handle2pos) + '%');

                                    // ensure min handle can't
                                    // be hidden behind max
                                    // handle
                                    if (handle1pos > 95) {
                                        angular.element(handles[0]).css('z-index', 3);
                                    }
                                }

                            }

                        }

                        function handleMove(index) {

                            var $handle = handles[index];

                            // on mousedown / touchstart
                            $handle
                                .bind(
                                    onEvent + 'X',
                                    function (event) {

                                        var handleDownClass = (index === 0 ? 'ngrs-handle-min'
                                                    : 'ngrs-handle-max')
                                                + '-down',
                                        // unbind =
                                        // $handle.add($document).add('body'),
                                            modelValue = (index === 0 ? scope.modelMin
                                                    : scope.modelMax)
                                                - scope.min, originalPosition = (modelValue / range) * 100, originalClick = client(event), previousClick = originalClick, previousProposal = false;

                                        if (angular.isFunction(scope.onHandleDown)) {
                                            scope.onHandleDown();
                                        }

                                        // stop user
                                        // accidentally
                                        // selecting
                                        // stuff
                                        angular.element('body').bind(
                                            'selectstart' + eventNamespace, function () {
                                                return false;
                                            });

                                        // only do stuff
                                        // if we are
                                        // disabled
                                        if (!scope.disabled) {

                                            // flag as
                                            // down
                                            down = true;

                                            // add down
                                            // class
                                            $handle.addClass('ngrs-down');

                                            $slider.addClass('ngrs-focus ' + handleDownClass);

                                            // add touch
                                            // class for
                                            // MS
                                            // styling
                                            angular.element('body').addClass('ngrs-touching');

                                            // listen
                                            // for
                                            // mousemove
                                            // /
                                            // touchmove
                                            // document
                                            // events
                                            $document
                                                .bind(
                                                    moveEvent,
                                                    function (e) {
                                                        // prevent
                                                        // default
                                                        e.preventDefault();

                                                        var currentClick = client(e), movement, proposal, other, per = (scope.step / range) * 100, otherModelPosition = (((index === 0 ? scope.modelMax
                                                                : scope.modelMin) - scope.min) / range) * 100;

                                                        if (currentClick[0] === "x") {
                                                            return;
                                                        }

                                                        // calculate
                                                        // deltas
                                                        currentClick[0] -= originalClick[0];
                                                        currentClick[1] -= originalClick[1];

                                                        // has
                                                        // movement
                                                        // occurred
                                                        // on
                                                        // either
                                                        // axis?
                                                        movement = [
                                                            (previousClick[0] !== currentClick[0]),
                                                            (previousClick[1] !== currentClick[1])];

                                                        // propose
                                                        // a
                                                        // movement
                                                        proposal = originalPosition
                                                            + ((currentClick[orientation] * 100) / (orientation ? $slider
                                                                .height()
                                                                : $slider
                                                                .width()));

                                                        // normalize
                                                        // so
                                                        // it
                                                        // can't
                                                        // move
                                                        // out
                                                        // of
                                                        // bounds
                                                        proposal = restrict(proposal);

                                                        if (scope.preventEqualMinMax) {

                                                            if (per === 0) {
                                                                per = (1 / range) * 100; // restrict
                                                                // to 1
                                                            }

                                                            if (index === 0) {
                                                                otherModelPosition = otherModelPosition
                                                                    - per;
                                                            } else if (index === 1) {
                                                                otherModelPosition = otherModelPosition
                                                                    + per;
                                                            }
                                                        }

                                                        // check
                                                        // which
                                                        // handle
                                                        // is
                                                        // being
                                                        // moved
                                                        // and
                                                        // add
                                                        // /
                                                        // remove
                                                        // margin
                                                        if (index === 0) {
                                                            proposal = proposal > otherModelPosition ? otherModelPosition
                                                                : proposal;
                                                        } else if (index === 1) {
                                                            proposal = proposal < otherModelPosition ? otherModelPosition
                                                                : proposal;
                                                        }

                                                        if (scope.step > 0) {
                                                            // only
                                                            // change
                                                            // if
                                                            // we
                                                            // are
                                                            // within
                                                            // the
                                                            // extremes,
                                                            // otherwise
                                                            // we
                                                            // get
                                                            // strange
                                                            // rounding
                                                            if (proposal < 100
                                                                && proposal > 0) {
                                                                proposal = Math
                                                                        .round(proposal
                                                                            / per)
                                                                    * per;
                                                            }
                                                        }

                                                        if (proposal > 95
                                                            && index === 0) {
                                                            $handle.css('z-index', 3);
                                                        } else {
                                                            $handle.css('z-index', '');
                                                        }

                                                        if (movement[orientation]
                                                            && proposal != previousProposal) {

                                                            if (index === 0) {

                                                                // update
                                                                // model
                                                                // as
                                                                // we
                                                                // slide
                                                                scope.modelMin = parseFloat(parseFloat(
                                                                    (((proposal * range) / 100) + scope.min))
                                                                    .toFixed(
                                                                        scope.decimalPlaces));

                                                            } else if (index === 1) {

                                                                scope.modelMax = parseFloat(parseFloat(
                                                                    (((proposal * range) / 100) + scope.min))
                                                                    .toFixed(
                                                                        scope.decimalPlaces));
                                                            }

                                                            // update
                                                            // angular
                                                            scope.$apply();

                                                            previousProposal = proposal;

                                                        }

                                                        previousClick = currentClick;

                                                    })
                                                .bind(
                                                    offEvent,
                                                    function () {

                                                        if (angular
                                                                .isFunction(scope.onHandleUp)) {
                                                            scope.onHandleUp();
                                                        }

                                                        // unbind
                                                        // listeners
                                                        $document.off(moveEvent);
                                                        $document.off(offEvent);

                                                        angular
                                                            .element('body')
                                                            .removeClass(
                                                                'ngrs-touching');

                                                        // cancel
                                                        // down
                                                        // flag
                                                        down = false;

                                                        // remove
                                                        // down
                                                        // and
                                                        // over
                                                        // class
                                                        $handle
                                                            .removeClass('ngrs-down');
                                                        $handle
                                                            .removeClass('ngrs-over');

                                                        // remove
                                                        // active
                                                        // class
                                                        $slider
                                                            .removeClass('ngrs-focus '
                                                                + handleDownClass);

                                                    });
                                        }

                                    }).on(overEvent, function () {
                                $handle.addClass('ngrs-over');
                            }).on(outEvent, function () {
                                if (!down) {
                                    $handle.removeClass('ngrs-over');
                                }
                            });
                        }

                        function throwError(message) {
                            scope.disabled = true;
                            throw new Error('RangeSlider: ' + message);
                        }

                        function throwWarning(message) {
                            $log.warn(message);
                        }

                        /**
                         * DESTROY
                         */

                        scope.$on('$destroy', function () {

                            // unbind event from slider
                            $slider.off(eventNamespace);

                            // unbind from body
                            angular.element('body').off(eventNamespace);

                            // unbind from document
                            $document.off(eventNamespace);

                            // unbind from handles
                            for (var i = 0, l = handles.length; i < l; i++) {
                                handles[i].off(eventNamespace);
                                handles[i].off(eventNamespace + 'X');
                            }

                        });

                        /**
                         * INIT
                         */

                        $slider
                        // disable selection
                            .bind('selectstart' + eventNamespace, function (event) {
                                return false;
                            })
                            // stop propagation
                            .bind('click', function (event) {
                                event.stopPropagation();
                            });

                        // bind events to each handle
                        handleMove(0);
                        handleMove(1);

                    }
                };
            }]);

    // requestAnimationFramePolyFill
    // http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
    // shim layer with setTimeout fallback
    window.requestAnimFrame = (function () {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame
            || function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };
    })();
})();

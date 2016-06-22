/*! 
* UsaJobsApp - v0.0.1 - 2016-06-22
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
    angular.module('UsaJobsApp', ['MomentModule', 'LeafletModule', 'ui-rangeSlider']);

    // App Module Service Declarations
    angular.module('UsaJobsApp').controller('UsaJobsAppController', AppController);
    angular.module('UsaJobsApp').directive('orgCode', orgCodeDirective);
    angular.module('UsaJobsApp').service('eventService', eventService);

    // App Service Functions

    /**
     * UsaJobsApp App Controller
     */
    AppController.$inject = ['$scope', 'Jobs', 'eventService', 'settings', '$rootScope'];
    function AppController($scope, Jobs, Events, settings, $rootScope) {

        $rootScope.isOldIE = isOldIE();
        $rootScope.orgName = $scope.orgName;
        $rootScope.orgSearchUrl = settings.usaJobs.searchBaseUrl + $scope.orgCode;

        $scope.jobs = Jobs;
        $scope.scope = $scope;

        // Set Job service properties
        $scope.jobs.orgCode = $scope.orgCode;
        $scope.jobs.orgName = $scope.orgName;
        $scope.jobs.vacNumFilter = $scope.vacNumFilter;
        $scope.orgSearchUrl = $rootScope.orgSearchUrl;
        $scope.jobs.orgSearchUrl = $scope.orgSearchUrl;

        //if ($scope.isOldIE) return; // end setup if not compatible
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

        function isOldIE() {
            var div = document.createElement("div");
            div.innerHTML = "<!--[if lte IE 9]><i></i><![endif]-->";
            return (div.getElementsByTagName("i").length == 1);
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
                orgName: '@',
                vacNumFilter: '@'
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
            map = this.map = {};
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
        names.map = {
            available: 'usajobs.events.map.available'
        };
        names.filters = {
            changed: 'usajobs.events.filter-values-changed',
            cleared: 'usajobs.events.filter-values-cleared',
            clear: 'usajobs.events.filter-clear-filters',
            setStateFilter: 'usajobs.events.filter-set-state',
            stateSelectionChange: 'usajobs.events.filter-select-state'
        };
        names.focus = {
            job: 'usajobs.events.focus-set-job',
            location: 'usajobs.events.focus-set-location'
        };

        /* Job Data Events */
        jobs.available = function (data) {
            broadcast(names.jobs.available, data);
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
        geodata.onAvailable = function (handlerFn) {
            on(names.geodata.available, handlerFn);
        };

        /* Location Events */
        location.setAttribution = function (str) {
            broadcast(names.location.setAttribution, str);
        };
        location.onSetAttribution = function (handlerFn) {
            on(names.location.setAttribution, handlerFn);
        };

        /* Map Events */
        map.available = function (map) {
            broadcast(names.map.available, map);
        };
        map.onAvailable = function (handlerFn) {
            on(names.map.available, handlerFn);
        };

        /* Job Data Filter Events */
        filters.changed = function (predicate) {
            broadcast(names.filters.changed, predicate);
        };
        filters.onChanged = function (handlerFn) {
            on(names.filters.changed, handlerFn);
        };
        filters.cleared = function () {
            broadcast(names.filters.cleared);
        };
        filters.onCleared = function (handlerFn) {
            on(names.filters.cleared, handlerFn);
        };
        filters.clear = function () {
            broadcast(names.filters.clear);
        };
        filters.onClear = function (handlerFn) {
            on(names.filters.clear, handlerFn);
        };
        filters.setStateFilter = function (stateName) {
            broadcast(names.filters.setStateFilter, stateName);
        };
        filters.stateSelectionFromDropdown = function (stateName) {
            broadcast(names.filters.stateSelectionChange, stateName);
        };
        filters.onStateFilter = function (handlerFn) {
            on(names.filters.setStateFilter, handlerFn);
        };
        filters.onStateSelectionFromDropdown = function (handlerFn) {
            on(names.filters.stateSelectionChange, handlerFn);
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

        // Settings Declaration
    angular.module('UsaJobsApp').value('settings', appSettings());

    /**
     * Return App Settings object.
     */
    function appSettings() {
        return {
            // date format for date rendering
            dateDispFormat: 'M/D/YY',
            // UsaJobs.gov Data API settings
            usaJobs: {
                reqOptions: {
                    method: 'GET',
                    url: 'https://data.usajobs.gov/api/search',
                    headers: {
                        'Authorization-Key': 'M05yaoU7zXr5lFyMnBQZoCLNfdKQZ8Js3F31ywwnOk8='
                    },
                    transformResponse: function (data) {
                        // return results array as response
                        var results = JSON.parse(data).SearchResult.SearchResultItems.map(function (item) {
                            return item.MatchedObjectDescriptor;
                        });
                        results.data = data;
                        return results;
                    }
                },
                // URL of search results on USAJobs.gov
                searchBaseUrl: 'https://www.usajobs.gov/JobSearch/Search/GetResults?OrganizationID=',
                // date format for date parsing
                dateFormat: 'YYYY-MM-DD'
                // 2016-06-14T00:00:00Z
            },

            // Leaflet.js map settings
            map: {
                center: [40.8282, -98.5795], // map center - CONUS
                zoom: 4, // default map starting zoom
                attributionControl: true, // display map data attribution
                zoomControl: true, // display map zoom control
                scrollWheelZoom: false, // disable scrollwheel zoom
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
            }
        }
    }
})();

(function () {
    /**
     * USAJobsApp HTML Templates
     * Adds programmatically generated HTML templates to Angular $templateCache
     *
     * TODO: turn this into a Grunt task using HTML-to-$templateCache plugin
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
                + ' <span class="pull-right btn-xs btn-default usa-jobs-refresh-btn" ng-click="refresh()" ng-disabled="!jobs.resolved">'
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
                    // State dropdown
                + '<div class="form-group col-xs-12 col-sm-6"><label for="state-filter">State&nbsp;</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.state.isActive()" ng-click="filters.state.reset(true);"><i class="fa fa-close"></i> <span class="">Clear</span></button>'
                + '<select class="form-control" id="state-filter" ng-model="filters.state.value" ng-change="filter(); stateSelectionFromDropdown()"  ng-options="state.name for state in jobs.JobData.states | orderBy:\'name\'"><option value=""></option></select>'
                + '</div>'
                    // Text filter
                + '<div class="form-group col-xs-12 col-sm-6"><label for="filters.stringFilter.value" class="">City and Job Title Search</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.stringFilter.isActive()" ng-click="filters.stringFilter.reset(true)"><i class="fa fa-close"></i> <span class="">Clear</span></button>'
                + '<input ng-disabled="!jobs.resolved" type="text" class="form-control" ng-model="filters.stringFilter.value" ng-change="filter()" placeholder="search by city or job title"></div>'
                    // Show/hide filter button
                + '<div class="form-group hidden-xs col-sm-12"><label class="hidden-xs hidden-sm">&nbsp</label><button class="btn btn-default btn-xs usajobs-filters-advanced-btn " ng-disabled="!jobs.resolved"  ng-click="toggleAdvancedFilters()">{{ showAdvancedFilters ? "Hide" : "More"}} Filters</button></div>'
                    // Advanced filters
                + '<div class="hidden-xs" ng-show="showAdvancedFilters">'
                    // Grade filter slider
                + '<div class="form-group col-xs-6 usajobs-grade-filter" ng-hide="filters.gradeFilter.isDisabled"><label for="grade-slider">Filter Grade</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.gradeFilter.isActive()" ng-click="filters.gradeFilter.reset(true)"><i class="fa fa-close"></i> <span class="">Clear</span></button>'
                + '<div range-slider show-values="true" filter="grade" id="grade-slider" min="filters.gradeFilter.lowest" max="filters.gradeFilter.highest" model-min="filters.gradeFilter.min" model-max="filters.gradeFilter.max" ng-class="{ disabled : !jobs.resolved }"></div></div>'
                    // Job salary slider
                + '<div class="form-group col-xs-6"><label for="salary-slider">Salary</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.salaryFilter.isActive()" ng-click="filters.salaryFilter.reset(true)"><i class="fa fa-close"></i> <span class="">Clear</span></button>'
                + '<div range-slider show-values="true" filter="currency" id="salary-slider" min="filters.salaryFilter.lowest" max="filters.salaryFilter.highest" step="10000" model-min="filters.salaryFilter.min" model-max="filters.salaryFilter.max" ng-class="{ disabled : !jobs.resolved }"></div>'
                + '</div>'
                    // Pay plan radio buttons
                + '<div class="form-group col-xs-6"><label for="pay-plan-filter">Pay Basis</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.payFilter.isActive()" ng-click="filters.payFilter.reset(true)"><i class="fa fa-close"></i> <span class="">Clear</span></button>'
                + '<div id="pay-plan-filter" class="input-group">'
                + '<div class="btn-group btn-group-default">'
                + '<span class="btn" ng-click="filters.payFilter.selection = filters.payFilter.all; filter();" ng-class="filters.payFilter.selection === filters.payFilter.all ? \'btn-info\' : \'btn-default\'">Any</span>'
                + '<span class="btn" ng-click="filters.payFilter.selection = filters.payFilter.salaried; filter();" ng-class="filters.payFilter.selection === filters.payFilter.salaried ? \'btn-info\' : \'btn-default\'">Salaried</span>'
                + '<span class="btn" ng-click="filters.payFilter.selection = filters.payFilter.hourly; filter();" ng-class="filters.payFilter.selection === filters.payFilter.hourly ? \'btn-info\' : \'btn-default\'">Hourly</span>'
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
            tmplt += '<dl class="col-xs-6 col-sm-1 small"><dt><a class="usajobs-sortbutton"' +
                activeClass('JobTitle') +
                ' title="Sort by Job Title" href="" ng-class="" ng-click="setPredicate(\'JobTitle\')">Title' +
                sortCaret('JobTitle', alphaIcons) + '</a></dt></dl>';
            // Locations
            tmplt += '<dl class="col-xs-6 col-sm-2 small"><dt><a class="usajobs-sortbutton"' +
                activeClass('Location') +
                ' title="Sort by Location" href="" ng-click="setPredicate(\'locations.sortValue\')">Location' +
                sortCaret('locations.sortValue', alphaIcons) + '</a></dt></dl>';
            // Salary
            tmplt += '<dl class="col-xs-6 col-sm-3 small"><dt><a class="usajobs-sortbutton"' +
                activeSalaryClass() +
                ' title="Sort by Salary" href="" ng-click="setSalaryPredicate()">Salary' +
                sortSalaryCaret('salaryPredicate') + '</a></dt></dl>';
            // Grade
            tmplt += '<dl class="col-xs-6 col-sm-2 small"><dt><a class="usajobs-sortbutton"' +
                activeClass('Grade') +
                ' title="Sort by Pay Grade" href="" ng-click="setPredicate(\'Grade\')">Grade' +
                sortCaret('Grade', amntIcons) + '</a></dt></dl>';
            // Job Close Date
            tmplt += '<dl class="col-xs-6 col-sm-2 small"><dt><a class="usajobs-sortbutton"' +
                activeClass('daysRemaining') +
                ' title="Sort by Announcement Closing Date" href="" ng-click="setPredicate(\'daysRemaining\')">Closes' +
                sortCaret('daysRemaining', defIcons) + '</a></dt></dl>';
            // Job Open Date
            tmplt += '<dl class="col-xs-6 col-sm-2 small"><dt><a class="usajobs-sortbutton"' +
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
                '<a ng-href="{{ job.applyUrl() }}" ' +
                'target="_blank" title="Open this job announcement on USAJobs.gov">{{ job.PositionTitle }}' +
                '<i class="fa fa-fw fa-external-link"></i>';
            tmplt += '</a>' +
                '</h5>';
            tmplt += '<div class="row usajobs-table-item-job-details">';
            // Locations
            tmplt += '<dl class="col-xs-3 small">' +
                '<dt>Location</dt>' +
                '<dd ng-repeat="loc in job.locationArrayCompact track by $index" title="{{ loc }}">{{ loc }}</dd>' +
                '</dl>';
            // Salary
            tmplt += '<dl class="col-xs-3 small">' +
                '<dt>Salary</dt>' +
                '<dd>{{ job.salaryRange }}</dd>' +
                '</dl>';
            // Grade
            tmplt += '<dl class="col-xs-2 small">' +
                '<dt>Grade</dt>' +
                '<dd>{{ job.gradeRangeDesc() }}</dd>' +
                '</dl>';
            // Job Close Date
            tmplt += '<dl class="col-xs-2 small">' +
                '<dt>Closes</dt>' +
                '<dd title="{{ job.EndDate }}">{{ job.endDateDescription }}</dd>' +
                '</dl>';
            // Job Open Date
            tmplt += '<dl class="col-xs-2 small">' +
                '<dt>Opened</dt>' +
                '<dd>{{ job.startDate }}</dd>' +
                '</dl>';
            // Job Announcement Number
            tmplt += '<dl class="hidden-xs hidden-sm hidden-md col-lg-2 small">' +
                '<dt><abbr title="Vacancy Announcment Number">Vac</abbr></dt>' +
                '<dd title="{{job.AnnouncementNumber}}">{{ job.PositionID }}</dd>' +
                '</dl>';
            // Job Summary Toggle
            tmplt += '<div class="col-xs-12 clearfix">' +
                '<a class="hidden-print small text-muted" ng-click="job.toggleDescription()">' +
                '<i class="fa fa-fw" ng-class="{ \'fa-plus-square-o\': !job.showDescription, \'fa-minus-square-o\': job.showDescription }"></i>' +
                'Job Summary' +
                '</a>' +
                '</div>';
            tmplt += '<dl class="col-xs-12 small" ng-show="job.showDescription">' +
                '<dt class="sr-only visible-print-block">Job Summary</dt>' +
                '<dd><strong class="visible-xs-inline visible-sm-inline visible-md-inline">' +
                'Vacancy Number: {{ job.PositionID }}<br /></strong> {{ job.UserArea.Details.JobSummary }}</dd>' +
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
                + '<span ng-show=\"filterStatus.active\"><strong>{{ jobs.JobData.visibleCount }}</strong> vacanc{{ jobs.JobData.visibleCount == 1 ? \"y\" : \"ies\"}} match{{ jobs.JobData.visibleCount == 1 ? \"es\" : \"\"}} your filters</strong>' +
                ' <span class="text-danger pointer" ng-click="reset()" title="Show hidden jobs">({{ jobs.JobData.length - jobs.JobData.visibleCount }} hidden)</span></span>'
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

        // Data Service Declarations

    angular.module('UsaJobsApp').service('Jobs', Jobs);
    angular.module('UsaJobsApp').factory('Job', JobFactory);

    angular.module('UsaJobsApp').directive('jobFilter', jobDataFilterDirective);
    angular.module('UsaJobsApp').controller('JobDataFilter', JobDataFilterController);

    angular.module('UsaJobsApp').directive('vacancyCountDesc', vacancyCountDescDirective);
    angular.module('UsaJobsApp').controller('vacancyCountDescController', vacancyCountDescController);

    angular.module('UsaJobsApp').directive('jobInfo', jobInfoDirective);
    angular.module('UsaJobsApp').controller('jobInfoController', jobInfoController);

    // Data Module Service Functions

    /**
     * USA Jobs Data Service
     */
    Jobs.$inject = ['$http', 'settings', 'unique', 'Job', 'JobLocation', 'eventService'];
    function Jobs($http, settings, unique, Job, JobLocation, Events) {

        var self = this; // closure reference to `this` for callbacks

        // Public Properties
        this.JobData = [];
        this.resolved = false;
        this.orgCode = '';
        this.orgName = '';
        this.orgSearchUrl = '';
        this.vacNumFilter = '';

        // Public Functions
        this.getJobs = getJobs;
        this.query = query;

        // Public Job data summary functions
        this.getMaxGrade = getMaxGrade;
        this.getMinGrade = getMinGrade;
        this.getMaxSalary = getMaxSalary;
        this.getMinSalary = getMinSalary;
        this.getPayPlans = getPayPlans;
        this.getSeriesList = getSeriesList;
        this.getPayTypeList = getPayTypeList;

        /**
         * @public
         * Retrieve jobs from USA Jobs based on current `org` settings.
         */
        function getJobs() {
            // dispatch USAJobs query
            self.query({
                ResultsPerPage: 500,
                Organization: self.orgCode
            });
        }

        /**
         * @public
         * Query USA Jobs with provided request parameters
         * @param {Object} params
         */
        function query(params) {
            var options = angular.copy(settings.usaJobs.reqOptions);
            options.params = params;

            self.resolved = false; // reset query status
            self.JobData.length = 0; // remove current results
            Events.jobs.queryStarted(); // emit query started event

            $http(options).success(queryResolved);
        }

        /**
         * @private
         * Handle job query response
         * @param data {Object}
         */
        function queryResolved(data) {
            addJobResults(data);
            self.resolved = true; // set query status to resolved
            Events.jobs.available(self.JobData); // emit jobs available event

            console.log(self.getPayTypeList());
        }

        /**
         * @private
         * Take job query results and add to `JobData` collection as `Job` objects.
         * @param data {Object}
         */
        function addJobResults(data) {
            data = filterResultsByVac(data);
            // extend job objects
            angular.forEach(data, function (item) {
                self.JobData.push(new Job(item));
            });
            groupByLocation(self.JobData);
            hasAlphaGrades();

        }

        /**
         * @private
         * Filter results by vacancy prefix, if set
         * @param data
         */
        function filterResultsByVac(data) {
            if (angular.isDefined(self.vacNumFilter) && self.vacNumFilter.length) {
                var vacancyRe = new RegExp('^' + self.vacNumFilter, 'i'), // prefix RegEx
                    filtered = []; // filtered results collection

                angular.forEach(data, function (job) {
                    if (vacancyRe.test(job.PositionID)) {
                        filtered.push(job);
                    }
                });
                return filtered;
            } else {
                return data;
            }
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
            var locationsArr = [],
                stateNames = [];
            jobs.locations = {};
            jobs.states = {};
            jobs.locMaxJobCount = 0;
            jobs.locMinJobCount = 0;

            angular.forEach(jobs, function (job) {
                // append any locations from the job
                Array.prototype.push.apply(locationsArr, job.locations);
            });
            // remove duplicate locations
            locationsArr = unique(locationsArr);

            // create location keys and objects
            angular.forEach(locationsArr, function (location) {
                // trim location name (some results seem to have location names with extra whitespace)
                location.LocationName = location.LocationName.trim();
                // create location info object
                jobs.locations[location.LocationName] = new JobLocation(location);

                stateNames.push(location.CountrySubDivisionCode);
            });

            // add jobs to location job collections
            angular.forEach(jobs, function (job) {
                angular.forEach(jobs.locations, function (location, key) {
                    // check if location name is contained in string list of
                    // job locations
                    if (job.locationNames().indexOf(location.LocationName) > -1) {
                        location.jobs.push(job);
                    }
                });
            });

            // Get a count of the most jobs and least jobs at a single location
            angular.forEach(jobs.locations, function (location) {
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
                    if (job.locations.indexOf(key) > -1) {
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
            if (self.JobData.length === 0) return 0;

            angular.forEach(self.JobData, function (job) {
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
            if (self.JobData.length === 0) return 0;

            angular.forEach(self.JobData, function (job) {
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

            if (self.JobData.length === 0) return 0;

            angular.forEach(self.JobData, function (job) {
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

            if (self.JobData.length === 0) return 0;

            angular.forEach(self.JobData, function (job) {
                salaries.push(job.salaryLowest());
            }, self);

            return Math.min.apply(self, salaries);
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
                grades.push(job.payPlan());
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
            var series = [];

            // push all Series objects to series array
            angular.forEach(self.JobData, function (job) {
                Array.prototype.push.apply(series, job.JobCategory);
            });

            // remove duplicates and return
            return unique(series);
        }

        /**
         * @public
         * Return an array of all Job Sereies listed in the job results.
         * @return {Array}
         */
        function getPayTypeList() {
            var payTypes = [];

            // push all Series objects to series array
            angular.forEach(self.JobData, function (job) {
                Array.prototype.push.apply(payTypes, job.PositionRemuneration);
            });

            payTypes = payTypes.map(function (obj) {
                return obj.RateIntervalCode;
            });

            // remove duplicates and return
            return unique(payTypes);
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
                dateFm = settings.usaJobs.dateFormat,
                self = this;

            angular.extend(this, jobData); // attach USAJobs job properties

            this.title = this.PositionTitle;
            this.locations = this.PositionLocation;

            // Static rendered properties to speed up DOM rendering

            // date strings and descriptions
            this.startDate = moment(this.PositionStartDate, dateFm).format(settings.dateDispFormat);
            this.daysRemaining = moment(this.PositionEndDate, dateFm).diff(now, 'days');
            this.daysOpen = moment(now).diff(moment(this.PositionStartDate, dateFm), 'days');
            this.endDateDescription = $filter('datedescription')(this.PositionEndDate);

            // array of state names
            this.locations.states = this.locations.map(function (location) {
                return location.CountrySubDivisionCode;
            });
            this.locations.sortValue = this.locations.map(function (location) {
                return location.CountrySubDivisionCode + location.LocationName;
            }).join(';');

            // array of location names with postal abbreviations for states
            this.locationArrayCompact = this.locations.map(function (location) {
                return location.CityName.replace(/,.*/, '') + ', '
                    + $filter('stateAbbreviation')(location.CountrySubDivisionCode);
            });

            // salary as int values for filtering
            this.salaryMinInt = parseInt(this.PositionRemuneration[0].MinimumRange);
            this.salaryMaxInt = parseInt(this.PositionRemuneration[0].MaximumRange);

            // salary values rendered as currency string
            this.salaryMinString = currencyFormat(this.PositionRemuneration[0].MinimumRange);
            this.salaryMaxString = currencyFormat(this.PositionRemuneration[0].MaximumRange);

            // description of salary range
            this.salaryRange = this.salaryMinString + " to " + this.salaryMaxString
                + (isHourly() ? '/hour' : '');


            // Concatenate all values as strings for search term matching.
            this.concatenatedValues = '';
            angular.forEach(jobData, function (v) {
                this.concatenatedValues += v + ' | ';
            }, this);


            // util function to render currency string
            function currencyFormat(input) {
                // Include cents for hourly positions.
                return $filter('currency')(input, '$', isHourly() ? 2 : 0);
            }

            function isHourly() {
                return self.PositionRemuneration[0].RateIntervalCode === 'Per Hour';
            }
        }

        /* Prototype Properties */
        Job.prototype.visible = true;
        Job.prototype.showDescription = false;

        /* Prototype Function Bindings */
        Job.prototype.setVisibleWithPredicate = setVisibleWithPredicate;
        Job.prototype.locationNames = jobLocationNames;
        Job.prototype.hourly = hourly;
        Job.prototype.salaried = salaried;
        Job.prototype.gradeRangeDesc = gradeRangeDesc;
        Job.prototype.payPlan = payPlan;
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
        Job.prototype.applyUrl = function () {
            return this.ApplyURI[0];
        };

        /* Function Definitions */

        /**
         * @public
         * Toggle whether description should be displayed.
         */
        function toggleDescription() {
            this.showDescription = !this.showDescription;
        }

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

        function jobLocationNames() {
            return this.locations.map(function (loc) {
                return loc.LocationName;
            });
        }

        /**
         * @public
         * Determine if the job is hourly.
         * @returns {Boolean}
         */
        function hourly() {
            return this.PositionRemuneration[0].RateIntervalCode === 'Per Hour';
        }

        /**
         * @public
         * Determine if the job is salaried.
         * @returns {Boolean}
         */
        function salaried() {
            return this.PositionRemuneration[0].RateIntervalCode === 'Per Year';
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
            return this.payPlan() + ' ' + low + (low !== high ? ' to ' + high : '');
        }

        function payPlan() {
            return this.JobGrade[0].Code;
        }

        /**
         * @public
         * Return the lowest pay grade listed for the job
         * @returns {String}
         */
        function gradeLowest() {
            return this.UserArea.Details.LowGrade;
        }

        /**
         * @public
         * Return the highest pay grade listed for the job, if listed.
         * Returns lowest pay grade if no high grade is listed.
         * @returns {String}
         */
        function gradeHighest() {
            return this.UserArea.Details.HighGrade;
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
        function salaryHighest() {
            return this.PositionRemuneration[0].MaximumRange;
        }

        /**
         * @public
         * Return the lowest salary listed for the job.
         * @returns {Number}
         */
        function salaryLowest() {
            return this.PositionRemuneration[0].MinimumRange;
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
            active: false,
            reset: reset
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
                    // Test for string in concatenated values
                    return new RegExp(this.value, 'gi').test(job.concatenatedValues);
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
                } else if (job.locations.states.indexOf(this.value.name) > -1) {
                    return true;
                } else {
                    return false;
                }
            },
            reset: function (triggerUpdate) {
                this.value = null;
                stateSelectionFromDropdown({name: ''});
                if (triggerUpdate) $scope.filter();
            },
            isActive: function () {
                return this.value !== null;
            },
            setState: function (e, stateName) {
                $scope.filters.state.value = $scope.jobs.JobData.states[stateName] || null;
                filter();
                $scope.$apply();
            }
        };

        /* Public Function Bindings */
        $scope.update = update;
        $scope.reset = reset;
        $scope.predicate = predicate;
        $scope.filter = filter;
        $scope.toggleAdvancedFilters = toggleAdvancedFilters;
        $scope.filters.setFiltersActive = setFiltersActive;
        $scope.stateSelectionFromDropdown = stateSelectionFromDropdown;

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
            // set max salary in range to nearest higher integer
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
            events.filters.onStateFilter($scope.filters.state.setState);
        }

        /**
         * @private
         * Handle keypress events
         * @param {Event} e
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

        /**
         * @private
         * Emit "state" selection event
         * @param state
         */
        function stateSelectionFromDropdown(state) {
            events.filters.stateSelectionFromDropdown(state || $scope.filters.state.value)
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
        $scope.reset = $scope.jobs.JobData.filterStatus.reset;
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

    // Location Module Service Declarations

    angular.module('UsaJobsApp').factory('JobLocation', JobLocationFactory);

    // Location Module Service Functions

    /**
     * JobLocation Object Factory
     * Job location object that automatically requests its geolocation
     * when created. Emits a "location available" notification when geodata
     * is available.
     */
    JobLocationFactory.$inject = ['eventService'];
    function JobLocationFactory(events) {
        /**
         * JobLocation Constructor
         * @param jobLoc
         * @constructor
         */
        function JobLocation(jobLoc) {
            angular.extend(this, jobLoc);
            this.name = jobLoc.LocationName;
            this.jobs = [];
            // indicate whether geodata is invalid
            this.noGeodata = (this.Latitude === 0 && this.Longitude === 0);

        }

        /* Prototype Function Bindings */
        JobLocation.prototype.visible = visible;
        JobLocation.prototype.countVisible = countVisible;

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

})();

(function () {
    /**
     * @module UsaJobsApp Job Table Module
     * - Directive and controller for displaying job listings in a table.
     */

    // Job Table Module Service Declarations

    angular.module('UsaJobsApp').controller('jobTableCtrl', jobTableController);
    angular.module('UsaJobsApp').directive('jobTable', jobTableDirective);

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

(function () {
    /**
     * @module UsaJobsMap Custom Filters Module
     */


        // Filter Declarations
    angular.module('UsaJobsApp').filter('grade', usaJobsGradeFilter);
    angular.module('UsaJobsApp').filter('gradeRangeDesc', usaJobsGradeRangeDesc);
    angular.module('UsaJobsApp').filter('trailingzeroes', trailingZeroesFilter);
    angular.module('UsaJobsApp').filter('datedescription', dateDescriptionFilter);
    angular.module('UsaJobsApp').filter('stateAbbreviation', statePostalAbbreviationFilter);
    angular.module('UsaJobsApp').constant('stateAbbreviationValues', stateAbbrevValues());

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
     * Pay Grade Description Filter
     * @returns {Function} returns filter function.
     */
    function usaJobsGradeRangeDesc() {
        return function (job) {
            // Return description of grade range. If lowest & highest grades are the same, return only that grade
            return job.payPlan() + ' '
                + job.gradeLowest() + (job.gradeLowest() !== job.gradeHighest() ? ' to ' + job.gradeHighest() : '');
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
        return function filter(state, style) {
            // iterate through state names
            if(stateAbbr[state]) {
                if (style === 'AP') {
                    return stateAbbr[state].apStyle;
                } else {
                    return stateAbbr[state].postal;
                }
            } else {
                return state;
            }
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
    angular.module('UsaJobsApp').constant('unique', function (array) {
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

    angular.module('UsaJobsApp').constant('pluralize', function (count, root, singular, plural) {
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

(function () {

    angular.module('UsaJobsApp').constant('usStatesGeoJson', usStatesGeoJson());

    function usStatesGeoJson() {
        return {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": {
                    "GEO_ID": "0400000US01",
                    "STATE": "01",
                    "NAME": "Alabama",
                    "LSAD": "",
                    "CENSUSAREA": 50645.326
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[-85.605165, 34.984678], [-85.47045, 34.328239], [-85.357402, 33.750104], [-85.236509, 33.129562], [-85.168644, 32.814246], [-85.132186, 32.778897], [-85.067535, 32.579546], [-84.971831, 32.442843], [-85.001874, 32.322015], [-84.893959, 32.265846], [-85.06206, 32.132486], [-85.055075, 32.010714], [-85.140131, 31.858761], [-85.12553, 31.694965], [-85.041305, 31.540987], [-85.113261, 31.264343], [-85.100207, 31.16549], [-85.035615, 31.108192], [-85.002368, 31.000682], [-85.893543, 30.993467], [-86.519938, 30.993245], [-87.598928, 30.997457], [-87.634938, 30.865886], [-87.532607, 30.743489], [-87.406958, 30.675165], [-87.446586, 30.527068], [-87.429578, 30.406498], [-87.518324, 30.280435], [-87.656888, 30.249709], [-87.755516, 30.291217], [-87.906343, 30.40938], [-87.901711, 30.550879], [-87.936717, 30.657432], [-88.008396, 30.684956], [-88.100874, 30.50975], [-88.107274, 30.377246], [-88.395023, 30.369425], [-88.43898, 31.246896], [-88.473227, 31.893856], [-88.403789, 32.44977], [-88.330934, 33.073125], [-88.210741, 34.029199], [-88.097888, 34.892202], [-88.200064, 34.995634], [-88.202959, 35.008028], [-86.862147, 34.991956], [-85.605165, 34.984678]]]
                }
            },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US02",
                        "STATE": "02",
                        "NAME": "Alaska",
                        "LSAD": "",
                        "CENSUSAREA": 570640.95
                    },
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [[[[-162.255031, 54.978353], [-162.232962, 54.890984], [-162.349315, 54.836049], [-162.437501, 54.927627], [-162.255031, 54.978353]]], [[[-160.0179, 55.15613], [-159.86858, 55.094888], [-160.132168, 55.013743], [-160.187261, 55.118376], [-160.0179, 55.15613]]], [[[-160.506927, 55.32773], [-160.486174, 55.193617], [-160.841917, 55.20444], [-160.856621, 55.318488], [-160.710298, 55.403075], [-160.506927, 55.32773]]], [[[-165.790523, 54.171758], [-165.671477, 54.096235], [-166.046438, 54.044186], [-166.112242, 54.122528], [-165.9832, 54.221175], [-165.790523, 54.171758]]], [[[-165.523466, 54.299895], [-165.47619, 54.182701], [-165.629725, 54.132558], [-165.675447, 54.264639], [-165.523466, 54.299895]]], [[[-162.801865, 54.48944], [-162.588883, 54.450064], [-162.611891, 54.368077], [-162.86005, 54.425452], [-162.801865, 54.48944]]], [[[-176.762478, 51.867878], [-176.810433, 51.927089], [-176.63051, 51.970352], [-176.576381, 51.842275], [-176.290728, 51.872136], [-176.289921, 51.741678], [-176.51933, 51.758482], [-176.582933, 51.691822], [-176.863062, 51.684921], [-176.904302, 51.811772], [-176.762478, 51.867878]]], [[[-177.800647, 51.778294], [-177.962426, 51.719772], [-178.215124, 51.857801], [-178.124786, 51.920093], [-177.952094, 51.915348], [-177.800647, 51.778294]]], [[[-177.360408, 51.727533], [-177.21193, 51.812331], [-177.199764, 51.924816], [-177.04509, 51.898605], [-177.136977, 51.814493], [-177.122808, 51.729355], [-177.261631, 51.680846], [-177.360408, 51.727533]]], [[[177.601645, 52.016377], [177.560513, 51.916364], [177.409536, 51.930821], [177.293424, 51.84561], [177.200423, 51.894746], [177.345577, 51.963005], [177.601645, 52.016377]]], [[[179.758993, 51.946595], [179.614364, 51.871772], [179.482464, 51.982834], [179.663327, 52.022941], [179.758993, 51.946595]]], [[[-176.018089, 52.020099], [-176.180356, 52.000426], [-176.211855, 52.065533], [-176.058103, 52.106467], [-176.018089, 52.020099]]], [[[-174.301818, 52.278949], [-174.324935, 52.378095], [-174.185347, 52.417788], [-174.068248, 52.390331], [-173.987917, 52.295345], [-174.142262, 52.125452], [-174.334424, 52.115198], [-174.45276, 52.061047], [-174.736592, 52.007308], [-174.839715, 52.091338], [-174.656294, 52.107962], [-174.527081, 52.17472], [-174.405464, 52.18356], [-174.301818, 52.278949]]], [[[-173.602446, 52.153773], [-173.514171, 52.108348], [-173.124504, 52.10942], [-173.107933, 52.078828], [-173.548385, 52.029308], [-173.802339, 52.10639], [-173.602446, 52.153773]]], [[[-172.633153, 52.266215], [-172.568051, 52.34942], [-172.448182, 52.391439], [-172.301445, 52.329951], [-172.528095, 52.254336], [-172.633153, 52.266215]]], [[[-170.841936, 52.558171], [-170.817943, 52.636275], [-170.633753, 52.697469], [-170.562734, 52.674785], [-170.788495, 52.54024], [-170.841936, 52.558171]]], [[[172.763366, 52.823656], [172.640372, 52.925441], [172.629077, 53.001324], [173.107249, 52.993228], [173.295399, 52.926987], [173.421682, 52.845477], [172.903628, 52.761667], [172.763366, 52.823656]]], [[[-168.211705, 53.256184], [-168.49749, 53.035403], [-168.958983, 52.886048], [-168.759691, 53.081461], [-168.763331, 53.182812], [-168.617143, 53.260985], [-168.361758, 53.252253], [-168.406531, 53.346393], [-168.342127, 53.475992], [-168.200443, 53.534079], [-168.004624, 53.566053], [-167.784099, 53.501048], [-167.842328, 53.386489], [-168.211705, 53.256184]]], [[[-166.728918, 54.003111], [-166.560546, 53.878775], [-166.437083, 53.955644], [-166.279407, 53.982532], [-166.210964, 53.933557], [-166.420471, 53.762088], [-166.119922, 53.855048], [-166.111317, 53.776856], [-166.283267, 53.684219], [-166.553983, 53.623448], [-166.581011, 53.530449], [-166.735039, 53.50664], [-166.878087, 53.429884], [-167.134134, 53.426448], [-167.644179, 53.250842], [-167.852333, 53.315599], [-167.694484, 53.388034], [-167.457366, 53.442793], [-167.355624, 53.424498], [-167.102305, 53.515077], [-167.057695, 53.698864], [-166.787318, 53.734577], [-167.141966, 53.826932], [-167.031252, 53.945204], [-166.728918, 54.003111]]], [[[-165.721389, 60.16962], [-165.575815, 59.904672], [-165.751851, 59.899947], [-166.203293, 59.791676], [-166.439746, 59.857816], [-166.616849, 59.850711], [-166.995748, 59.993495], [-167.133258, 59.994695], [-167.342885, 60.074979], [-167.423053, 60.195072], [-167.312616, 60.238454], [-166.93797, 60.20587], [-166.762522, 60.309837], [-166.578305, 60.32185], [-166.174906, 60.401003], [-166.084791, 60.325288], [-165.883458, 60.343902], [-165.71451, 60.310496], [-165.721389, 60.16962]]], [[[-173.052751, 60.515252], [-172.903321, 60.534288], [-172.784348, 60.458145], [-172.366515, 60.334413], [-172.595895, 60.318233], [-173.052751, 60.515252]]], [[[-160.918586, 58.746935], [-160.684447, 58.815464], [-160.880515, 58.581325], [-161.07563, 58.549916], [-161.056595, 58.702202], [-160.918586, 58.746935]]], [[[-131.246018, 54.989555], [-131.266049, 54.859369], [-131.353233, 54.859009], [-131.482676, 54.952659], [-131.246018, 54.989555]]], [[[-131.759896, 55.381845], [-131.647236, 55.30614], [-131.748334, 55.128588], [-131.862162, 55.289284], [-131.759896, 55.381845]]], [[[-131.56956, 55.284114], [-131.39769, 55.210916], [-131.350575, 55.067042], [-131.388569, 55.012222], [-131.646276, 55.035579], [-131.548093, 55.143138], [-131.56956, 55.284114]]], [[[-133.344847, 55.569327], [-133.305747, 55.484115], [-133.419384, 55.386105], [-133.576808, 55.324795], [-133.636291, 55.428423], [-133.739077, 55.472323], [-133.733029, 55.558757], [-133.480965, 55.512738], [-133.344847, 55.569327]]], [[[-133.104304, 55.426907], [-133.17676, 55.586722], [-133.263042, 55.568793], [-133.700557, 55.778617], [-133.384089, 55.87677], [-133.541041, 55.977322], [-133.718805, 55.893236], [-133.799931, 55.925349], [-133.693765, 56.070562], [-133.548802, 56.14284], [-133.639282, 56.198813], [-133.664218, 56.310504], [-133.582116, 56.352506], [-133.163212, 56.317445], [-133.071435, 56.238484], [-133.05552, 56.125258], [-132.635291, 55.921766], [-132.470697, 55.782162], [-132.461281, 55.6834], [-132.358558, 55.648759], [-132.247327, 55.492951], [-132.31857, 55.469208], [-132.126398, 55.288418], [-131.995908, 55.259054], [-132.016932, 55.120971], [-131.957914, 54.791239], [-132.029747, 54.701189], [-132.142277, 54.691674], [-132.609786, 54.965728], [-132.916414, 55.044465], [-132.889474, 54.896619], [-132.730931, 54.939483], [-132.628612, 54.883316], [-132.614851, 54.77717], [-132.676226, 54.680865], [-132.866355, 54.700386], [-133.123941, 54.940065], [-133.239695, 55.092415], [-133.223791, 55.229317], [-133.441074, 55.211654], [-133.452818, 55.31998], [-133.116203, 55.377211], [-133.104304, 55.426907]]], [[[-147.217704, 60.293504], [-147.002067, 60.232453], [-147.202416, 60.151128], [-147.493235, 59.955388], [-147.443678, 59.913543], [-147.874097, 59.78326], [-147.895411, 59.869145], [-147.804252, 59.936497], [-147.433254, 60.096159], [-147.217704, 60.293504]]], [[[-147.562801, 60.579821], [-147.618906, 60.368848], [-147.760681, 60.156396], [-147.956228, 60.228667], [-147.792822, 60.476193], [-147.562801, 60.579821]]], [[[-132.977163, 56.439673], [-132.734466, 56.458515], [-132.620608, 56.3912], [-132.662081, 56.274795], [-132.877582, 56.240322], [-133.067556, 56.333573], [-132.977163, 56.439673]]], [[[-134.713987, 58.220748], [-134.371445, 58.148966], [-134.215981, 58.162128], [-133.904874, 57.807406], [-134.146342, 57.760258], [-133.935976, 57.614414], [-133.857368, 57.463964], [-133.870657, 57.358287], [-134.034563, 57.327638], [-134.15539, 57.208003], [-134.497718, 57.031194], [-134.601407, 57.033812], [-134.646773, 57.226327], [-134.464032, 57.392184], [-134.607557, 57.513042], [-134.731798, 57.721921], [-134.705869, 57.828929], [-134.796804, 58.058855], [-134.914857, 58.214932], [-134.969189, 58.367542], [-134.724463, 58.268277], [-134.713987, 58.220748]]], [[[-152.24289, 58.241192], [-152.265111, 58.135732], [-152.482674, 58.129813], [-152.656801, 58.061049], [-152.99734, 58.134341], [-153.075746, 58.099571], [-152.947547, 57.983519], [-153.412933, 58.069811], [-153.223709, 58.16212], [-153.044316, 58.306336], [-152.839234, 58.372477], [-152.653673, 58.506572], [-152.665999, 58.564493], [-152.337212, 58.589095], [-152.512483, 58.427349], [-152.493991, 58.354684], [-151.986171, 58.350413], [-151.986127, 58.213774], [-152.081083, 58.154275], [-152.24289, 58.241192]]], [[[-154.404015, 56.572287], [-154.633586, 56.471817], [-154.70614, 56.521273], [-154.534726, 56.60054], [-154.404015, 56.572287]]], [[[-153.940505, 56.558317], [-153.952958, 56.507174], [-154.232464, 56.491052], [-154.29002, 56.595376], [-154.095833, 56.617786], [-153.940505, 56.558317]]], [[[-152.417424, 57.815464], [-152.497314, 57.738596], [-152.461018, 57.606311], [-152.265346, 57.62643], [-152.163996, 57.584607], [-152.361592, 57.427761], [-152.600375, 57.468833], [-152.601148, 57.382165], [-152.695698, 57.281318], [-152.944201, 57.259083], [-152.911371, 57.126813], [-153.320929, 57.036838], [-153.48652, 57.085915], [-153.688713, 56.871975], [-153.854196, 56.836412], [-153.924041, 56.767216], [-154.072878, 56.841099], [-153.850464, 56.957278], [-154.076623, 56.970589], [-154.226494, 56.876257], [-154.524695, 56.991623], [-154.539552, 57.196351], [-154.74309, 57.31477], [-154.629678, 57.510197], [-154.22566, 57.661366], [-153.982581, 57.648251], [-153.813136, 57.588581], [-153.93522, 57.813047], [-153.721176, 57.890615], [-153.571362, 57.832101], [-153.452645, 57.963509], [-153.273676, 57.890408], [-153.129494, 57.946551], [-152.876197, 57.932446], [-152.725302, 57.8354], [-152.549661, 57.900137], [-152.417424, 57.815464]]], [[[-134.121514, 56.069847], [-134.230449, 56.068341], [-134.246307, 56.267768], [-134.292353, 56.352644], [-134.040938, 56.42153], [-134.281093, 56.585555], [-134.401407, 56.725419], [-134.419791, 56.838385], [-134.286818, 56.906534], [-134.171675, 56.851218], [-134.083291, 56.931579], [-133.880781, 56.721396], [-133.75965, 56.675913], [-133.848207, 56.573057], [-133.933512, 56.375428], [-133.834671, 56.322382], [-133.937349, 56.166129], [-134.105098, 56.180941], [-134.121514, 56.069847]]], [[[-132.546463, 56.606563], [-132.818043, 56.494934], [-133.089215, 56.523916], [-133.203584, 56.447657], [-133.417795, 56.494147], [-133.512684, 56.437015], [-133.663094, 56.448073], [-133.709576, 56.683424], [-133.679352, 56.810764], [-133.86904, 56.845938], [-133.921451, 56.961511], [-134.049218, 57.029203], [-133.887957, 57.097744], [-133.334272, 57.002442], [-133.104611, 57.005701], [-132.99743, 56.942201], [-132.935258, 56.822941], [-132.546463, 56.606563]]], [[[-134.666587, 56.169947], [-134.806163, 56.235533], [-135.175826, 56.677876], [-135.412989, 56.810079], [-135.332356, 56.913951], [-135.31278, 57.044984], [-135.422746, 57.167724], [-135.552574, 57.233194], [-135.687696, 57.367477], [-135.554548, 57.426636], [-135.419205, 57.564159], [-135.06505, 57.418972], [-134.849477, 57.40967], [-134.841774, 57.248588], [-134.633997, 56.728722], [-134.671047, 56.5412], [-134.634668, 56.265832], [-134.666587, 56.169947]]], [[[-135.587961, 57.89732], [-135.328887, 57.74842], [-134.921604, 57.742376], [-134.824891, 57.500067], [-135.084338, 57.464671], [-135.571606, 57.674397], [-135.549627, 57.482016], [-135.6924, 57.375267], [-135.892131, 57.408048], [-136.130611, 57.624607], [-136.207876, 57.638107], [-136.365052, 57.828561], [-136.573288, 57.926844], [-136.556247, 58.077019], [-136.365544, 58.148854], [-136.400046, 58.271991], [-135.976386, 58.202029], [-135.78338, 58.286709], [-135.451444, 58.134348], [-135.108896, 58.08827], [-134.912854, 57.979287], [-135.004952, 57.884338], [-135.02337, 57.780537], [-135.19896, 57.775092], [-135.587961, 57.89732]]], [[[-135.703464, 57.32204], [-135.574693, 57.094339], [-135.635347, 57.022411], [-135.857028, 56.997287], [-135.838568, 57.338756], [-135.703464, 57.32204]]], [[[-162.587754, 63.275727], [-162.271089, 63.487711], [-162.025552, 63.447539], [-161.583772, 63.447857], [-161.136758, 63.504525], [-160.76556, 63.773552], [-160.766291, 63.835189], [-160.951641, 64.090067], [-160.976038, 64.235761], [-161.263519, 64.398166], [-161.504903, 64.423074], [-161.388621, 64.532783], [-161.024185, 64.499719], [-160.802048, 64.610352], [-160.783398, 64.71716], [-160.935974, 64.82237], [-161.213756, 64.883324], [-161.376985, 64.773036], [-161.667261, 64.788981], [-161.878363, 64.709476], [-162.168516, 64.68029], [-162.234477, 64.619336], [-162.539996, 64.530931], [-162.632242, 64.385734], [-162.810004, 64.352647], [-162.857562, 64.49978], [-163.217757, 64.632062], [-163.311983, 64.58828], [-163.253027, 64.469501], [-163.597834, 64.563356], [-163.829739, 64.574965], [-164.421871, 64.545256], [-164.807747, 64.449432], [-165.016519, 64.434392], [-165.413443, 64.497939], [-166.236939, 64.583558], [-166.392403, 64.638161], [-166.483801, 64.733419], [-166.415624, 64.871928], [-166.690814, 64.985372], [-166.638411, 65.113586], [-166.464192, 65.177086], [-166.347189, 65.276341], [-166.485968, 65.3309], [-166.796001, 65.337184], [-167.026782, 65.381967], [-167.474024, 65.412744], [-167.710888, 65.498524], [-168.0752, 65.576355], [-168.103708, 65.685552], [-167.539643, 65.820836], [-166.827684, 66.051277], [-165.80503, 66.33331], [-165.407204, 66.420441], [-164.711009, 66.542541], [-164.400727, 66.58111], [-163.979581, 66.593953], [-163.754171, 66.551284], [-163.873106, 66.389015], [-163.830077, 66.272], [-163.916551, 66.190494], [-163.76751, 66.060803], [-163.495845, 66.085388], [-163.168568, 66.05929], [-162.750705, 66.09016], [-162.391892, 66.028724], [-162.121788, 66.067391], [-161.838018, 66.022582], [-161.548429, 66.239912], [-161.341189, 66.2551], [-161.198971, 66.210949], [-160.99854, 66.254935], [-161.129512, 66.336248], [-161.525554, 66.397046], [-161.916309, 66.349481], [-161.87488, 66.511446], [-162.175398, 66.687789], [-162.501415, 66.742503], [-162.601052, 66.898455], [-162.346352, 66.934792], [-162.011455, 66.759063], [-162.069068, 66.6457], [-161.915856, 66.551339], [-161.574129, 66.438566], [-161.326349, 66.478371], [-161.881671, 66.716796], [-161.86154, 66.797076], [-161.674359, 66.961965], [-161.810256, 67.050281], [-162.23923, 66.993814], [-162.901348, 67.006833], [-163.57701, 67.092491], [-163.741345, 67.129123], [-163.758588, 67.256439], [-163.878781, 67.416125], [-164.079514, 67.585856], [-164.533937, 67.725606], [-165.49355, 68.059283], [-165.792146, 68.080867], [-166.368546, 68.28177], [-166.706139, 68.371783], [-166.377564, 68.422406], [-166.23378, 68.564263], [-166.214433, 68.879524], [-165.327043, 68.858111], [-164.253157, 68.930938], [-163.973678, 68.985044], [-163.535314, 69.141656], [-163.110318, 69.375343], [-162.916958, 69.692512], [-163.012595, 69.757462], [-162.481016, 69.975242], [-162.312491, 70.109281], [-161.922949, 70.291599], [-161.633888, 70.240693], [-161.254723, 70.256612], [-160.732703, 70.374382], [-160.214828, 70.559087], [-159.648383, 70.794368], [-159.209082, 70.870067], [-159.160836, 70.81796], [-158.656101, 70.787955], [-158.032397, 70.832263], [-157.502459, 70.948659], [-157.249083, 71.052537], [-156.809653, 71.286886], [-156.531124, 71.296338], [-156.074411, 71.242489], [-155.957961, 71.186211], [-155.587702, 71.17256], [-155.548283, 71.060685], [-156.013512, 70.895983], [-155.875096, 70.828895], [-155.504202, 70.860303], [-155.47594, 70.943547], [-155.25686, 71.081119], [-155.03174, 71.146473], [-154.567593, 70.989929], [-154.645793, 70.869167], [-154.352604, 70.834828], [-154.181863, 70.768325], [-153.89048, 70.885719], [-153.426265, 70.890131], [-153.23848, 70.922467], [-152.590148, 70.886933], [-152.259966, 70.84282], [-152.420775, 70.608983], [-151.816701, 70.545698], [-151.554647, 70.435895], [-151.180436, 70.430401], [-150.762035, 70.497219], [-150.357384, 70.493738], [-150.112899, 70.431372], [-149.866698, 70.510769], [-149.179148, 70.4857], [-148.789577, 70.402746], [-148.610566, 70.422588], [-148.351437, 70.304453], [-148.203477, 70.348188], [-147.817637, 70.276938], [-147.681722, 70.199954], [-146.991109, 70.14761], [-146.885771, 70.185917], [-146.272965, 70.176944], [-145.790386, 70.148569], [-145.623306, 70.084375], [-145.197331, 69.994954], [-144.618671, 69.969315], [-144.463286, 70.025735], [-144.079634, 70.058961], [-143.911494, 70.129837], [-143.498058, 70.1401], [-142.746807, 70.042531], [-142.404366, 69.916511], [-142.075612, 69.853319], [-142.009321, 69.800726], [-141.713369, 69.789497], [-141.43084, 69.695144], [-141.002672, 69.645609], [-141.002694, 68.498391], [-141.002465, 65.839421], [-141.002133, 62.124686], [-141.002052, 61.678696], [-141.00184, 60.306105], [-140.53509, 60.224224], [-140.472292, 60.31059], [-139.989142, 60.18524], [-139.698361, 60.340421], [-139.086669, 60.357654], [-139.200346, 60.090701], [-139.031643, 59.9937], [-138.702053, 59.910245], [-138.620931, 59.770559], [-137.604277, 59.243057], [-137.447383, 58.909513], [-137.264752, 59.002352], [-136.826633, 59.158389], [-136.581521, 59.164909], [-136.466815, 59.284252], [-136.474326, 59.464194], [-136.301846, 59.464128], [-136.256889, 59.623646], [-135.945905, 59.663802], [-135.477436, 59.799626], [-135.254125, 59.701339], [-135.027456, 59.563692], [-135.067356, 59.421855], [-134.961972, 59.280376], [-134.702383, 59.247836], [-134.681924, 59.190843], [-134.481241, 59.128071], [-134.401042, 58.976221], [-134.250526, 58.858046], [-133.840392, 58.727991], [-133.699835, 58.60729], [-133.379908, 58.427909], [-133.461475, 58.385526], [-133.176444, 58.150151], [-133.076421, 57.999762], [-132.869318, 57.842941], [-132.559178, 57.503927], [-132.367984, 57.348685], [-132.252187, 57.215655], [-132.371312, 57.095229], [-132.051044, 57.051155], [-132.125934, 56.874698], [-131.9301, 56.835211], [-131.835133, 56.601849], [-131.581221, 56.613275], [-131.461806, 56.547904], [-131.085704, 56.40654], [-130.782231, 56.367511], [-130.622482, 56.267939], [-130.466874, 56.239789], [-130.425575, 56.140676], [-130.24554, 56.096876], [-130.102761, 56.116696], [-130.016874, 56.017323], [-130.025929, 55.915995], [-130.150595, 55.767031], [-130.126743, 55.581282], [-129.980058, 55.28423], [-130.096546, 55.197953], [-130.187541, 55.064665], [-130.339504, 54.921376], [-130.695817, 54.719346], [-130.742316, 54.801914], [-130.915936, 54.789617], [-131.012061, 54.996238], [-130.98373, 55.068946], [-131.092605, 55.192711], [-130.882146, 55.358831], [-130.987103, 55.539872], [-131.031357, 55.284785], [-131.160492, 55.197481], [-131.428234, 55.239416], [-131.698743, 55.354873], [-131.844157, 55.456742], [-131.845542, 55.522119], [-131.664629, 55.581525], [-131.726615, 55.641], [-131.705259, 55.789939], [-131.986493, 55.500619], [-132.183207, 55.588128], [-132.224167, 55.701766], [-132.183163, 55.80083], [-132.08605, 55.832436], [-132.159064, 55.92256], [-132.401192, 55.950467], [-132.522076, 56.077035], [-132.708697, 56.112124], [-132.718342, 56.217704], [-132.601495, 56.240065], [-132.52936, 56.338555], [-132.340678, 56.341754], [-132.394268, 56.485579], [-132.298664, 56.677977], [-132.452081, 56.672473], [-132.556758, 56.757242], [-132.770404, 56.837486], [-132.87034, 56.925682], [-132.916487, 57.040086], [-133.322359, 57.112727], [-133.517197, 57.177776], [-133.544817, 57.24257], [-133.453783, 57.35624], [-133.52514, 57.490344], [-133.505982, 57.578459], [-133.676449, 57.625192], [-133.65453, 57.713689], [-133.848776, 57.93544], [-134.049603, 58.062027], [-134.087674, 58.181952], [-134.506876, 58.216513], [-134.631203, 58.247446], [-134.77635, 58.397352], [-134.792411, 58.491936], [-134.941722, 58.612099], [-135.151115, 58.845881], [-135.208585, 59.076824], [-135.37641, 59.089], [-135.393117, 58.971493], [-135.142322, 58.61637], [-135.189368, 58.576244], [-135.049062, 58.309295], [-135.087872, 58.200073], [-135.277198, 58.233634], [-135.39826, 58.327689], [-135.630425, 58.42858], [-135.90731, 58.380839], [-135.912187, 58.6188], [-136.089603, 58.815729], [-136.247343, 58.752935], [-136.630497, 58.890256], [-136.100293, 58.514636], [-136.041818, 58.380161], [-136.389964, 58.29707], [-136.544776, 58.316665], [-136.591924, 58.217886], [-136.70125, 58.219416], [-136.946663, 58.393185], [-137.111802, 58.392594], [-137.680811, 58.621835], [-137.687627, 58.664989], [-137.928156, 58.780533], [-137.932593, 58.868494], [-138.118853, 59.021307], [-138.636702, 59.130585], [-138.919749, 59.248531], [-139.420168, 59.37976], [-139.855565, 59.53666], [-139.725834, 59.638536], [-139.585789, 59.642765], [-139.582114, 59.774642], [-139.705328, 59.934826], [-139.811185, 59.829332], [-140.285557, 59.698717], [-140.72198, 59.718563], [-140.92722, 59.745709], [-141.423134, 59.877329], [-141.299609, 59.937397], [-141.285332, 60.015443], [-141.595376, 59.961905], [-142.537534, 60.083953], [-142.908859, 60.090328], [-143.69899, 60.027761], [-143.897029, 59.985938], [-144.035037, 60.020202], [-144.439546, 59.940252], [-144.1103, 60.098939], [-144.654899, 60.204882], [-144.782521, 60.291972], [-144.942134, 60.289728], [-144.834059, 60.443751], [-145.085842, 60.435893], [-145.041549, 60.357134], [-145.254749, 60.311448], [-145.594158, 60.45183], [-145.914403, 60.49235], [-146.133957, 60.431523], [-146.199077, 60.359928], [-146.490804, 60.294939], [-146.693546, 60.284593], [-146.721479, 60.396416], [-146.637783, 60.467178], [-146.455444, 60.465318], [-145.800808, 60.593996], [-146.168456, 60.72535], [-146.500246, 60.680134], [-146.703994, 60.741903], [-146.556361, 60.810066], [-146.757401, 60.878454], [-146.74594, 60.957582], [-146.973469, 60.934835], [-147.137281, 60.980968], [-147.378483, 60.877845], [-147.76124, 60.913227], [-147.729818, 60.818252], [-148.148695, 60.828701], [-147.951016, 61.029211], [-148.178046, 60.999608], [-148.350857, 60.803991], [-148.107384, 60.73977], [-148.086775, 60.595518], [-147.942106, 60.444029], [-148.025994, 60.279029], [-148.150628, 60.324182], [-148.325969, 60.261824], [-148.090635, 60.215863], [-147.815635, 60.058562], [-148.037173, 59.956664], [-148.253266, 59.955614], [-148.401601, 59.9976], [-148.635842, 59.939661], [-148.872181, 59.950321], [-149.204853, 60.009212], [-149.507429, 59.964519], [-149.584254, 59.866905], [-149.746364, 59.860881], [-149.728136, 59.692788], [-149.933721, 59.668994], [-150.296351, 59.455794], [-150.516317, 59.462326], [-150.739958, 59.425211], [-150.911598, 59.311614], [-150.942212, 59.233136], [-151.305724, 59.209544], [-151.437695, 59.253989], [-151.590729, 59.161725], [-151.748451, 59.158601], [-151.978748, 59.253779], [-151.886513, 59.421033], [-151.634472, 59.482443], [-151.470992, 59.47225], [-151.272459, 59.555823], [-151.113845, 59.777231], [-151.503822, 59.633662], [-151.829137, 59.720151], [-151.867713, 59.778411], [-151.702898, 60.032253], [-151.421702, 60.212931], [-151.381604, 60.358728], [-151.299782, 60.385481], [-151.264461, 60.543263], [-151.40927, 60.720558], [-151.062558, 60.787429], [-150.705812, 60.937792], [-150.377171, 61.039144], [-150.262096, 60.947839], [-150.039866, 60.920777], [-149.770264, 60.967607], [-149.739692, 61.016961], [-150.075451, 61.156269], [-149.924441, 61.211122], [-149.701724, 61.385299], [-149.876852, 61.384347], [-149.919682, 61.26347], [-150.468812, 61.244627], [-150.711291, 61.251089], [-151.024905, 61.178391], [-151.166606, 61.046404], [-151.4803, 61.010902], [-151.800264, 60.853672], [-151.848614, 60.733976], [-152.021936, 60.673364], [-152.099983, 60.594366], [-152.309221, 60.506384], [-152.234199, 60.393888], [-152.556752, 60.224217], [-152.734251, 60.174801], [-152.569121, 60.071748], [-152.706431, 59.915284], [-153.002521, 59.886726], [-153.051559, 59.691562], [-153.214156, 59.634271], [-153.476098, 59.64273], [-153.585406, 59.551475], [-153.76148, 59.543411], [-153.727546, 59.435346], [-154.044563, 59.388295], [-154.130585, 59.210503], [-154.214818, 59.151562], [-154.063489, 59.07214], [-153.695664, 59.073994], [-153.616066, 59.006737], [-153.398479, 58.966056], [-153.294726, 58.865432], [-153.402472, 58.742607], [-153.677597, 58.611603], [-153.897155, 58.606237], [-153.999323, 58.376372], [-154.177161, 58.32147], [-154.145277, 58.210931], [-154.340449, 58.090921], [-154.581547, 58.019285], [-154.990431, 58.013424], [-155.118648, 57.953925], [-155.097095, 57.865356], [-155.326369, 57.830545], [-155.37861, 57.710766], [-155.568437, 57.789511], [-155.732779, 57.549732], [-155.96789, 57.544429], [-156.339425, 57.417641], [-156.334404, 57.1823], [-156.535587, 57.047905], [-156.555077, 56.98355], [-156.753642, 56.991225], [-157.00595, 56.90422], [-157.201724, 56.767511], [-157.378771, 56.861696], [-157.472407, 56.833356], [-157.563802, 56.703426], [-157.466497, 56.623266], [-157.674587, 56.609507], [-157.736799, 56.675616], [-157.933988, 56.654571], [-157.83842, 56.56076], [-158.12744, 56.460805], [-158.328798, 56.484208], [-158.489546, 56.341865], [-158.207387, 56.294354], [-158.424451, 56.068899], [-158.854132, 56.003343], [-158.909396, 55.934887], [-159.374842, 55.871522], [-159.494404, 55.765798], [-159.530117, 55.665394], [-159.679201, 55.655895], [-159.643739, 55.830424], [-160.010322, 55.797087], [-160.058443, 55.721734], [-160.392587, 55.602771], [-160.462745, 55.506654], [-160.580083, 55.564385], [-160.666917, 55.459776], [-160.781401, 55.45178], [-160.86538, 55.526968], [-161.013662, 55.431002], [-161.231535, 55.357452], [-161.507657, 55.362786], [-161.469271, 55.49683], [-161.355686, 55.606378], [-161.587047, 55.62006], [-161.69886, 55.5194], [-161.686495, 55.408041], [-161.875606, 55.249921], [-162.046242, 55.225605], [-161.960866, 55.106734], [-162.219326, 55.028975], [-162.471364, 55.051932], [-162.510435, 55.250177], [-162.66196, 55.294295], [-162.718077, 55.219911], [-162.579765, 55.136939], [-162.569292, 55.015874], [-162.770983, 54.932736], [-162.913684, 54.950273], [-163.00155, 55.080043], [-163.079006, 55.111652], [-163.226313, 55.042694], [-163.036062, 54.942544], [-163.214398, 54.847487], [-163.057228, 54.688101], [-163.423067, 54.720426], [-163.439361, 54.655928], [-163.585967, 54.611644], [-163.747316, 54.635011], [-164.084894, 54.620131], [-164.331404, 54.530431], [-164.352704, 54.465023], [-164.640457, 54.391166], [-164.844931, 54.417583], [-164.949781, 54.575697], [-164.709465, 54.661518], [-164.550256, 54.888785], [-164.343534, 54.894139], [-164.030708, 54.969818], [-163.894695, 55.039115], [-163.532962, 55.048881], [-163.442854, 54.969875], [-163.293205, 55.006865], [-163.314652, 55.126312], [-163.105011, 55.183979], [-162.957182, 55.171271], [-162.881779, 55.273776], [-162.704747, 55.320296], [-162.246972, 55.680013], [-161.816225, 55.888993], [-161.290777, 55.98313], [-161.076383, 55.942079], [-160.898682, 55.999014], [-160.930591, 55.814358], [-160.769155, 55.858268], [-160.494678, 55.864193], [-160.438735, 55.789608], [-160.273176, 55.856881], [-160.535759, 55.939617], [-160.568356, 56.004062], [-160.357156, 56.279582], [-160.146252, 56.400176], [-159.828049, 56.543935], [-159.324421, 56.670356], [-159.263113, 56.723321], [-158.957471, 56.851184], [-158.853294, 56.79262], [-158.660298, 56.789015], [-158.699788, 56.927362], [-158.637364, 57.061364], [-158.376249, 57.265542], [-158.010538, 57.401456], [-157.931624, 57.476208], [-157.703852, 57.563455], [-157.703782, 57.721768], [-157.583636, 58.124307], [-157.39735, 58.173383], [-157.547209, 58.277535], [-157.536176, 58.391597], [-157.451918, 58.505618], [-157.077914, 58.708103], [-157.012392, 58.875889], [-157.275451, 58.836136], [-157.550603, 58.754514], [-158.140307, 58.61502], [-158.332093, 58.665313], [-158.351481, 58.727693], [-158.564833, 58.802715], [-158.619684, 58.911048], [-158.767748, 58.864264], [-158.771246, 58.765109], [-158.861207, 58.69558], [-158.704052, 58.482759], [-158.896067, 58.390065], [-159.063346, 58.423139], [-159.390664, 58.762362], [-159.586966, 58.900314], [-159.732932, 58.930739], [-159.806305, 58.805595], [-159.908386, 58.779903], [-160.054047, 58.887001], [-160.150528, 58.866062], [-160.286346, 58.945007], [-160.31778, 59.070477], [-160.753067, 58.910431], [-161.337982, 58.742912], [-161.372314, 58.666172], [-161.682907, 58.564671], [-161.939163, 58.655613], [-161.769501, 58.774937], [-161.828171, 59.062702], [-161.981964, 59.150997], [-161.956528, 59.361771], [-161.70253, 59.490906], [-161.911163, 59.741741], [-162.092361, 59.881104], [-162.100708, 59.944675], [-162.453176, 60.197639], [-162.503647, 59.99923], [-162.760007, 59.958013], [-163.172633, 59.845058], [-163.559148, 59.801391], [-163.930798, 59.803853], [-164.115117, 59.836688], [-164.208306, 59.949046], [-164.1916, 60.024496], [-164.385471, 60.07719], [-164.517647, 60.199493], [-164.698889, 60.296298], [-164.962678, 60.33966], [-165.129403, 60.433707], [-164.961439, 60.508391], [-165.362975, 60.506866], [-165.063148, 60.688645], [-165.030183, 60.83805], [-165.177531, 60.858865], [-165.194945, 60.9739], [-165.119781, 61.07864], [-165.2897, 61.181714], [-165.403007, 61.06706], [-165.590682, 61.111169], [-165.623317, 61.278431], [-165.879599, 61.335044], [-165.918612, 61.419087], [-165.754317, 61.498704], [-165.912496, 61.5562], [-166.075524, 61.532672], [-166.139409, 61.632315], [-166.006693, 61.729879], [-166.092081, 61.800733], [-165.758413, 61.825444], [-165.612337, 61.871907], [-165.756806, 62.006337], [-165.672037, 62.13989], [-165.096155, 62.522452], [-165.013179, 62.640096], [-164.837703, 62.685267], [-164.8773, 62.78432], [-164.783858, 62.946154], [-164.583735, 63.058457], [-164.633943, 63.09782], [-164.423449, 63.211977], [-164.140096, 63.259336], [-163.73265, 63.213257], [-163.616272, 63.141213], [-163.316203, 63.037763], [-163.0405, 63.062151], [-162.821122, 63.205596], [-162.587754, 63.275727]]], [[[-169.267598, 63.343995], [-168.999241, 63.341249], [-168.686675, 63.293022], [-168.85875, 63.146958], [-169.042674, 63.176511], [-169.375667, 63.151269], [-169.534984, 63.074355], [-169.568016, 62.976879], [-169.734938, 62.976617], [-169.829912, 63.07855], [-170.124354, 63.183665], [-170.263032, 63.179147], [-170.364806, 63.285596], [-170.55895, 63.354989], [-170.865412, 63.414229], [-171.100855, 63.42342], [-171.464455, 63.306915], [-171.739321, 63.366114], [-171.849984, 63.485039], [-171.742338, 63.665494], [-171.609439, 63.679832], [-171.381677, 63.630646], [-170.907197, 63.572107], [-170.488192, 63.696723], [-170.281988, 63.68502], [-170.095833, 63.612701], [-170.047114, 63.490135], [-169.643167, 63.427802], [-169.546934, 63.372792], [-169.267598, 63.343995]]], [[[-162.614621, 63.621832], [-162.374243, 63.626425], [-162.345179, 63.551785], [-162.614949, 63.540601], [-162.614621, 63.621832]]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US04",
                        "STATE": "04",
                        "NAME": "Arizona",
                        "LSAD": "",
                        "CENSUSAREA": 113594.084
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-109.045223, 36.999084], [-109.046183, 36.181751], [-109.046024, 35.175499], [-109.046182, 34.522393], [-109.046662, 33.625055], [-109.04748, 33.06842], [-109.048286, 32.089114], [-109.050044, 31.332502], [-109.829689, 31.334067], [-111.074825, 31.332239], [-112.39942, 31.751757], [-113.125961, 31.97278], [-113.78168, 32.179034], [-114.813613, 32.494277], [-114.809393, 32.617119], [-114.719633, 32.718763], [-114.526856, 32.757094], [-114.468971, 32.845155], [-114.50613, 33.01701], [-114.670803, 33.037984], [-114.707896, 33.097432], [-114.677032, 33.27017], [-114.722872, 33.398779], [-114.62964, 33.428138], [-114.558898, 33.531819], [-114.496489, 33.696901], [-114.533679, 33.926072], [-114.460264, 33.996649], [-114.415908, 34.107636], [-114.254141, 34.173831], [-114.138282, 34.30323], [-114.342615, 34.451442], [-114.47162, 34.712966], [-114.630682, 34.866352], [-114.633013, 35.002085], [-114.572747, 35.138725], [-114.595931, 35.325234], [-114.677643, 35.489742], [-114.653406, 35.610789], [-114.71211, 35.806185], [-114.68112, 35.885364], [-114.731159, 35.943916], [-114.736165, 36.104367], [-114.572031, 36.15161], [-114.372106, 36.143114], [-114.238799, 36.014561], [-114.15413, 36.023862], [-114.046838, 36.194069], [-114.0506, 37.000396], [-112.966471, 37.000219], [-112.35769, 37.001025], [-111.412784, 37.001478], [-110.50069, 37.00426], [-110.47019, 36.997997], [-109.625668, 36.998308], [-109.045223, 36.999084]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US05",
                        "STATE": "05",
                        "NAME": "Arkansas",
                        "LSAD": "",
                        "CENSUSAREA": 52035.477
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-94.042964, 33.019219], [-94.04345, 33.552253], [-94.162266, 33.588906], [-94.399144, 33.555498], [-94.485875, 33.637867], [-94.45753, 34.642961], [-94.431215, 35.39429], [-94.617919, 36.499414], [-94.111473, 36.498597], [-93.125969, 36.497851], [-92.350277, 36.497787], [-91.404915, 36.49712], [-90.154409, 36.496832], [-90.064514, 36.382085], [-90.083731, 36.272332], [-90.220425, 36.184764], [-90.37789, 35.995683], [-89.733095, 36.000608], [-89.656147, 35.92581], [-89.765689, 35.891299], [-89.814456, 35.759941], [-89.950278, 35.738493], [-89.910687, 35.617536], [-90.129448, 35.441931], [-90.074992, 35.384152], [-90.158865, 35.262577], [-90.066591, 35.13599], [-90.173603, 35.118073], [-90.209397, 35.026546], [-90.309297, 34.995694], [-90.250095, 34.90732], [-90.414864, 34.831846], [-90.517168, 34.630928], [-90.613944, 34.390723], [-90.756197, 34.367256], [-90.740889, 34.306538], [-90.946323, 34.109374], [-90.888956, 34.029788], [-91.087921, 33.975335], [-91.053886, 33.778701], [-91.084126, 33.657322], [-91.219048, 33.661503], [-91.228489, 33.564667], [-91.082878, 33.221621], [-91.087589, 33.145177], [-91.166073, 33.004106], [-91.951958, 33.007428], [-92.796533, 33.014836], [-94.042964, 33.019219]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US06",
                        "STATE": "06",
                        "NAME": "California",
                        "LSAD": "",
                        "CENSUSAREA": 155779.22
                    },
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [[[[-120.248484, 33.999329], [-120.073609, 34.024477], [-119.973691, 33.942481], [-120.121817, 33.895712], [-120.248484, 33.999329]]], [[[-118.500212, 33.449592], [-118.368301, 33.40711], [-118.465368, 33.326056], [-118.500212, 33.449592]]], [[[-119.999168, 41.99454], [-119.999866, 41.183974], [-119.995926, 40.499901], [-119.997634, 39.956505], [-120.005746, 39.22521], [-120.001014, 38.999574], [-119.587679, 38.714734], [-118.771867, 38.141871], [-117.875927, 37.497267], [-117.375905, 37.126843], [-116.541983, 36.499952], [-115.750844, 35.889287], [-115.271342, 35.51266], [-114.633013, 35.002085], [-114.630682, 34.866352], [-114.47162, 34.712966], [-114.342615, 34.451442], [-114.138282, 34.30323], [-114.254141, 34.173831], [-114.415908, 34.107636], [-114.460264, 33.996649], [-114.533679, 33.926072], [-114.496489, 33.696901], [-114.558898, 33.531819], [-114.62964, 33.428138], [-114.722872, 33.398779], [-114.677032, 33.27017], [-114.707896, 33.097432], [-114.670803, 33.037984], [-114.50613, 33.01701], [-114.468971, 32.845155], [-114.526856, 32.757094], [-114.719633, 32.718763], [-116.04662, 32.623353], [-117.124862, 32.534156], [-117.139464, 32.627054], [-117.246069, 32.669352], [-117.25167, 32.874346], [-117.328359, 33.121842], [-117.50565, 33.334063], [-117.784888, 33.541525], [-117.927091, 33.605521], [-118.088896, 33.729817], [-118.258687, 33.703741], [-118.411211, 33.741985], [-118.392107, 33.840915], [-118.519514, 34.027509], [-118.744952, 34.032103], [-118.805114, 34.001239], [-119.216441, 34.146105], [-119.270144, 34.252903], [-119.559459, 34.413395], [-119.873971, 34.408795], [-120.008077, 34.460447], [-120.141165, 34.473405], [-120.471376, 34.447846], [-120.511421, 34.522953], [-120.645739, 34.581035], [-120.60197, 34.692095], [-120.609898, 34.842751], [-120.670835, 34.904115], [-120.629931, 35.061515], [-120.698906, 35.171192], [-120.786076, 35.177666], [-120.89679, 35.247877], [-120.869209, 35.403276], [-121.003359, 35.46071], [-121.166712, 35.635399], [-121.284973, 35.674109], [-121.332449, 35.783106], [-121.462264, 35.885618], [-121.503112, 36.000299], [-121.574602, 36.025156], [-121.717176, 36.195146], [-121.894714, 36.317806], [-121.9416, 36.485602], [-121.923866, 36.634559], [-121.825052, 36.657207], [-121.788278, 36.803994], [-121.862266, 36.931552], [-122.105976, 36.955951], [-122.20618, 37.013949], [-122.405073, 37.195791], [-122.40085, 37.359225], [-122.452087, 37.48054], [-122.516689, 37.52134], [-122.514483, 37.780829], [-122.407452, 37.811441], [-122.360219, 37.592501], [-122.111344, 37.50758], [-122.163049, 37.667933], [-122.33079, 37.78383], [-122.309986, 37.892755], [-122.413725, 37.937262], [-122.262861, 38.0446], [-122.40358, 38.15063], [-122.491283, 38.108087], [-122.472303, 37.902573], [-122.505383, 37.822128], [-122.70264, 37.89382], [-122.821383, 37.996735], [-122.939711, 38.031908], [-122.968569, 38.242879], [-123.128825, 38.450418], [-123.331899, 38.565542], [-123.441774, 38.699744], [-123.725367, 38.917438], [-123.693969, 39.057363], [-123.826306, 39.36871], [-123.766475, 39.552803], [-123.851714, 39.832041], [-124.110549, 40.103765], [-124.187874, 40.130542], [-124.363414, 40.260974], [-124.409591, 40.438076], [-124.329404, 40.61643], [-124.158322, 40.876069], [-124.112165, 41.028173], [-124.153622, 41.05355], [-124.063076, 41.439579], [-124.143479, 41.709284], [-124.255994, 41.783014], [-124.211605, 41.99846], [-123.347562, 41.999108], [-122.378193, 42.009518], [-121.035195, 41.993323], [-119.999168, 41.99454]]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US08",
                        "STATE": "08",
                        "NAME": "Colorado",
                        "LSAD": "",
                        "CENSUSAREA": 103641.888
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-104.053249, 41.001406], [-102.865784, 41.001988], [-102.051614, 41.002377], [-102.051744, 40.003078], [-102.045388, 38.813392], [-102.044644, 38.045532], [-102.04224, 36.993083], [-103.002199, 37.000104], [-104.338833, 36.993535], [-105.000554, 36.993264], [-106.201469, 36.994122], [-106.869796, 36.992426], [-107.420913, 37.000005], [-108.249358, 36.999015], [-109.045223, 36.999084], [-109.041762, 38.16469], [-109.060062, 38.275489], [-109.051512, 39.126095], [-109.050615, 39.87497], [-109.050076, 41.000659], [-108.250649, 41.000114], [-107.625624, 41.002124], [-106.217573, 40.997734], [-104.855273, 40.998048], [-104.053249, 41.001406]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US09",
                        "STATE": "09",
                        "NAME": "Connecticut",
                        "LSAD": "",
                        "CENSUSAREA": 4842.355
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-71.799242, 42.008065], [-71.786994, 41.655992], [-71.797683, 41.416709], [-71.860513, 41.320248], [-71.945652, 41.337799], [-72.386629, 41.261798], [-72.451925, 41.278885], [-72.754444, 41.266913], [-72.9082, 41.282932], [-73.130253, 41.146797], [-73.372296, 41.10402], [-73.657336, 40.985171], [-73.727775, 41.100696], [-73.482709, 41.21276], [-73.550961, 41.295422], [-73.487314, 42.049638], [-72.999549, 42.038653], [-71.80065, 42.023569], [-71.799242, 42.008065]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US10",
                        "STATE": "10",
                        "NAME": "Delaware",
                        "LSAD": "",
                        "CENSUSAREA": 1948.543
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-75.415041, 39.801786], [-75.509742, 39.686113], [-75.587147, 39.651012], [-75.589439, 39.460812], [-75.439027, 39.313384], [-75.393015, 39.204512], [-75.396277, 39.057884], [-75.312282, 38.924594], [-75.190552, 38.806861], [-75.082153, 38.772157], [-75.048939, 38.451263], [-75.693521, 38.460128], [-75.755953, 39.245958], [-75.788359, 39.721811], [-75.617251, 39.833999], [-75.415041, 39.801786]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US11",
                        "STATE": "11",
                        "NAME": "District of Columbia",
                        "LSAD": "",
                        "CENSUSAREA": 61.048
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-77.038598, 38.791513], [-77.031698, 38.850512], [-77.1199, 38.934311], [-77.040999, 38.99511], [-76.909395, 38.892812], [-77.038598, 38.791513]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US12",
                        "STATE": "12",
                        "NAME": "Florida",
                        "LSAD": "",
                        "CENSUSAREA": 53624.759
                    },
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [[[[-81.582923, 24.658732], [-81.392947, 24.743371], [-81.303113, 24.651665], [-81.395096, 24.621062], [-81.582923, 24.658732]]], [[[-81.444124, 30.709714], [-81.385505, 30.273841], [-81.256711, 29.784693], [-81.163581, 29.55529], [-80.966176, 29.14796], [-80.709725, 28.756692], [-80.574868, 28.585166], [-80.525094, 28.459454], [-80.587813, 28.410856], [-80.604214, 28.257733], [-80.566432, 28.09563], [-80.383695, 27.740045], [-80.253665, 27.37979], [-80.093909, 27.018587], [-80.031362, 26.796339], [-80.038863, 26.569347], [-80.109566, 26.087165], [-80.127987, 25.772245], [-80.244528, 25.717089], [-80.339421, 25.499427], [-80.335269, 25.338701], [-80.418872, 25.235532], [-80.669236, 25.137837], [-80.900577, 25.139669], [-81.079859, 25.118797], [-81.172044, 25.222276], [-81.117265, 25.354953], [-81.208201, 25.504937], [-81.240677, 25.613629], [-81.424295, 25.867737], [-81.644553, 25.897953], [-81.68954, 25.85271], [-81.801663, 26.088227], [-81.833142, 26.294518], [-81.91171, 26.427158], [-82.043577, 26.519577], [-82.105672, 26.48393], [-82.137869, 26.637441], [-82.066575, 26.742657], [-82.076349, 26.958263], [-82.175241, 26.916867], [-82.147068, 26.789803], [-82.269499, 26.784674], [-82.445718, 27.060634], [-82.569248, 27.298588], [-82.691004, 27.444331], [-82.686421, 27.497215], [-82.584629, 27.596021], [-82.393383, 27.837519], [-82.413915, 27.901401], [-82.62959, 27.998474], [-82.586519, 27.816703], [-82.63362, 27.710607], [-82.713629, 27.698661], [-82.828561, 27.822254], [-82.762643, 28.219013], [-82.674787, 28.441956], [-82.654138, 28.590837], [-82.730245, 28.850155], [-82.688864, 28.905609], [-82.760551, 28.993087], [-82.827073, 29.158425], [-82.996144, 29.178074], [-83.169576, 29.290355], [-83.218075, 29.420492], [-83.400252, 29.517242], [-83.412768, 29.668485], [-83.537645, 29.72306], [-83.63798, 29.886073], [-84.024274, 30.103271], [-84.157278, 30.072714], [-84.269363, 30.09766], [-84.358923, 30.058224], [-84.333746, 29.923721], [-84.535873, 29.910092], [-84.824197, 29.758288], [-84.91511, 29.783303], [-84.993264, 29.714961], [-85.101682, 29.718748], [-85.259719, 29.681296], [-85.301331, 29.797117], [-85.405052, 29.938487], [-85.487764, 29.961227], [-85.588242, 30.055543], [-85.69681, 30.09689], [-85.878138, 30.215619], [-86.089963, 30.303569], [-86.2987, 30.363049], [-86.632953, 30.396299], [-86.909679, 30.372423], [-87.155392, 30.327748], [-87.295422, 30.323503], [-87.518324, 30.280435], [-87.429578, 30.406498], [-87.446586, 30.527068], [-87.406958, 30.675165], [-87.532607, 30.743489], [-87.634938, 30.865886], [-87.598928, 30.997457], [-86.519938, 30.993245], [-85.893543, 30.993467], [-85.002368, 31.000682], [-84.936828, 30.884683], [-84.914322, 30.753591], [-84.864693, 30.711542], [-84.057228, 30.674705], [-83.13137, 30.623583], [-82.214839, 30.568591], [-82.210291, 30.42459], [-82.170054, 30.358929], [-82.047917, 30.363265], [-82.012109, 30.593773], [-82.039634, 30.747727], [-81.949787, 30.827493], [-81.694778, 30.748414], [-81.444124, 30.709714]]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US13",
                        "STATE": "13",
                        "NAME": "Georgia",
                        "LSAD": "",
                        "CENSUSAREA": 57513.485
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-84.321869, 34.988408], [-83.619985, 34.986592], [-83.108535, 35.000771], [-83.121112, 34.939129], [-83.323866, 34.789712], [-83.33869, 34.682002], [-83.168278, 34.590998], [-83.002924, 34.472132], [-82.902665, 34.485902], [-82.746656, 34.266407], [-82.717507, 34.150504], [-82.596155, 34.030517], [-82.556835, 33.945353], [-82.346933, 33.834298], [-82.255267, 33.75969], [-82.196583, 33.630582], [-82.046335, 33.56383], [-81.913532, 33.441274], [-81.944737, 33.364041], [-81.847296, 33.306783], [-81.827936, 33.228746], [-81.704634, 33.116451], [-81.617779, 33.095277], [-81.491419, 33.008078], [-81.502716, 32.938688], [-81.421614, 32.835178], [-81.411906, 32.61841], [-81.281324, 32.556464], [-81.119633, 32.287596], [-81.155995, 32.241478], [-81.117234, 32.117605], [-81.006745, 32.101152], [-80.885517, 32.0346], [-80.840549, 32.011306], [-81.130634, 31.722692], [-81.177254, 31.517074], [-81.278798, 31.367214], [-81.274688, 31.289454], [-81.420474, 31.016703], [-81.405153, 30.908203], [-81.444124, 30.709714], [-81.694778, 30.748414], [-81.949787, 30.827493], [-82.039634, 30.747727], [-82.012109, 30.593773], [-82.047917, 30.363265], [-82.170054, 30.358929], [-82.210291, 30.42459], [-82.214839, 30.568591], [-83.13137, 30.623583], [-84.057228, 30.674705], [-84.864693, 30.711542], [-84.914322, 30.753591], [-84.936828, 30.884683], [-85.002368, 31.000682], [-85.035615, 31.108192], [-85.100207, 31.16549], [-85.113261, 31.264343], [-85.041305, 31.540987], [-85.12553, 31.694965], [-85.140131, 31.858761], [-85.055075, 32.010714], [-85.06206, 32.132486], [-84.893959, 32.265846], [-85.001874, 32.322015], [-84.971831, 32.442843], [-85.067535, 32.579546], [-85.132186, 32.778897], [-85.168644, 32.814246], [-85.236509, 33.129562], [-85.357402, 33.750104], [-85.47045, 34.328239], [-85.605165, 34.984678], [-84.321869, 34.988408]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US15",
                        "STATE": "15",
                        "NAME": "Hawaii",
                        "LSAD": "",
                        "CENSUSAREA": 6422.628
                    },
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [[[[-155.778234, 20.245743], [-155.58168, 20.123617], [-155.405459, 20.078772], [-155.270316, 20.014525], [-155.084357, 19.849736], [-155.093387, 19.737751], [-155.006423, 19.739286], [-154.983778, 19.641647], [-154.814417, 19.53009], [-154.822968, 19.48129], [-154.980861, 19.349291], [-155.1337, 19.276099], [-155.296761, 19.266289], [-155.505281, 19.137908], [-155.596521, 18.980654], [-155.672005, 18.917466], [-155.726043, 18.969437], [-155.88155, 19.036644], [-155.921389, 19.121183], [-155.887356, 19.337101], [-155.970969, 19.586328], [-156.064364, 19.730766], [-155.940311, 19.852305], [-155.828182, 20.035424], [-155.899149, 20.145728], [-155.901452, 20.235787], [-155.778234, 20.245743]]], [[[-159.431707, 22.220015], [-159.353795, 22.217669], [-159.297143, 22.113815], [-159.334714, 21.961099], [-159.446599, 21.871647], [-159.610241, 21.898356], [-159.758218, 21.980694], [-159.786543, 22.06369], [-159.733457, 22.142756], [-159.583965, 22.22668], [-159.431707, 22.220015]]], [[[-157.014553, 21.185503], [-156.867944, 21.16452], [-156.771495, 21.180053], [-156.794136, 21.075796], [-156.877137, 21.0493], [-157.079696, 21.105835], [-157.254061, 21.090601], [-157.25026, 21.207739], [-157.014553, 21.185503]]], [[[-156.612012, 21.02477], [-156.546291, 21.005082], [-156.474796, 20.894546], [-156.324578, 20.950184], [-156.230159, 20.931936], [-156.115735, 20.827301], [-156.003532, 20.795545], [-155.987216, 20.722717], [-156.053385, 20.65432], [-156.377633, 20.578427], [-156.442884, 20.613842], [-156.464043, 20.781667], [-156.631794, 20.82124], [-156.69989, 20.920629], [-156.612012, 21.02477]]], [[[-157.010001, 20.929757], [-156.897169, 20.915395], [-156.809463, 20.809169], [-156.838321, 20.764575], [-156.96789, 20.73508], [-157.010001, 20.929757]]], [[[-158.044485, 21.306011], [-158.1127, 21.3019], [-158.233, 21.4876], [-158.254425, 21.582684], [-158.12561, 21.586739], [-157.968628, 21.712704], [-157.6537, 21.302], [-157.8211, 21.2606], [-157.967971, 21.327986], [-158.044485, 21.306011]]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US16",
                        "STATE": "16",
                        "NAME": "Idaho",
                        "LSAD": "",
                        "CENSUSAREA": 82643.117
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-111.046689, 42.001567], [-112.173352, 41.996568], [-113.249159, 41.996203], [-114.041723, 41.99372], [-115.031783, 41.996008], [-116.368478, 41.996281], [-117.026222, 42.000252], [-117.026652, 43.025128], [-117.026871, 43.832479], [-116.934485, 44.021249], [-116.977351, 44.085364], [-116.895931, 44.154295], [-117.05651, 44.230874], [-117.242675, 44.396548], [-117.044217, 44.74514], [-116.9347, 44.783881], [-116.83199, 44.933007], [-116.847944, 45.022602], [-116.731216, 45.139934], [-116.673793, 45.321511], [-116.463504, 45.615785], [-116.593004, 45.778541], [-116.782676, 45.825376], [-116.915989, 45.995413], [-116.959548, 46.099058], [-116.923958, 46.17092], [-117.055983, 46.345531], [-117.039813, 46.425425], [-117.039821, 47.127265], [-117.04247, 47.839009], [-117.035178, 48.370878], [-117.032351, 48.999188], [-116.049193, 49.000912], [-116.04885, 47.977186], [-115.824597, 47.752154], [-115.72377, 47.696671], [-115.689404, 47.595402], [-115.746945, 47.555293], [-115.526751, 47.303219], [-115.326903, 47.255912], [-115.001274, 46.971901], [-114.927837, 46.83599], [-114.649388, 46.73289], [-114.615036, 46.639733], [-114.322519, 46.611066], [-114.451912, 46.241253], [-114.492153, 46.04729], [-114.388243, 45.88234], [-114.498809, 45.850676], [-114.566172, 45.773864], [-114.504869, 45.722176], [-114.558253, 45.585104], [-114.460542, 45.561283], [-114.333218, 45.459316], [-114.135249, 45.557465], [-113.986656, 45.704564], [-113.806729, 45.602146], [-113.834555, 45.520729], [-113.734402, 45.392353], [-113.735601, 45.325265], [-113.57467, 45.128411], [-113.45197, 45.059247], [-113.455071, 44.865424], [-113.131453, 44.772837], [-113.003544, 44.450814], [-112.886041, 44.395874], [-112.781294, 44.484888], [-112.473207, 44.480027], [-112.286187, 44.568472], [-112.106755, 44.520829], [-111.870504, 44.564033], [-111.821488, 44.509286], [-111.585763, 44.562843], [-111.473178, 44.665479], [-111.323669, 44.724474], [-111.225208, 44.581006], [-111.048974, 44.474072], [-111.045205, 43.501136], [-111.043564, 42.722624], [-111.046689, 42.001567]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US17",
                        "STATE": "17",
                        "NAME": "Illinois",
                        "LSAD": "",
                        "CENSUSAREA": 55518.93
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-87.800477, 42.49192], [-87.834769, 42.301522], [-87.800066, 42.208024], [-87.682359, 42.075729], [-87.600549, 41.826833], [-87.524044, 41.708335], [-87.526711, 41.121485], [-87.526809, 40.46217], [-87.533227, 39.883127], [-87.531646, 39.347888], [-87.61005, 39.282232], [-87.640435, 39.166727], [-87.512187, 38.954417], [-87.550515, 38.85956], [-87.496537, 38.778571], [-87.519609, 38.697198], [-87.62012, 38.639489], [-87.654166, 38.511911], [-87.745254, 38.408996], [-87.984234, 38.20996], [-87.928858, 38.168594], [-88.02979, 38.025046], [-88.058499, 37.865349], [-88.02803, 37.799224], [-88.158207, 37.664542], [-88.087664, 37.471059], [-88.281667, 37.452596], [-88.476592, 37.386875], [-88.515939, 37.284043], [-88.424403, 37.152428], [-88.458948, 37.073796], [-88.545403, 37.070003], [-88.916934, 37.224291], [-89.029981, 37.211144], [-89.182509, 37.037275], [-89.132685, 36.9822], [-89.29213, 36.992189], [-89.51834, 37.285497], [-89.422465, 37.397132], [-89.516447, 37.535558], [-89.512009, 37.685525], [-89.583316, 37.713261], [-89.844786, 37.905572], [-89.901832, 37.869822], [-90.130788, 38.062341], [-90.243116, 38.112669], [-90.353902, 38.213855], [-90.349743, 38.377609], [-90.191811, 38.598951], [-90.21201, 38.71175], [-90.113327, 38.849306], [-90.250248, 38.919344], [-90.450792, 38.967764], [-90.54403, 38.87505], [-90.6614, 38.924989], [-90.726981, 39.251173], [-91.059439, 39.46886], [-91.100307, 39.538695], [-91.370009, 39.732524], [-91.429519, 39.837801], [-91.420878, 39.914865], [-91.494878, 40.036453], [-91.506501, 40.236304], [-91.419422, 40.378264], [-91.375746, 40.391879], [-91.348733, 40.609695], [-91.123928, 40.669152], [-91.096846, 40.811617], [-90.962916, 40.924957], [-90.946627, 41.096632], [-91.113648, 41.241401], [-91.047819, 41.4109], [-90.857554, 41.452751], [-90.655839, 41.462132], [-90.595237, 41.511032], [-90.461432, 41.523533], [-90.343228, 41.587833], [-90.31522, 41.734264], [-90.187969, 41.803163], [-90.140061, 42.003252], [-90.162895, 42.116718], [-90.391108, 42.225473], [-90.477279, 42.383794], [-90.640927, 42.508302], [-90.07367, 42.508275], [-88.786681, 42.491983], [-87.800477, 42.49192]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US18",
                        "STATE": "18",
                        "NAME": "Indiana",
                        "LSAD": "",
                        "CENSUSAREA": 35826.109
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-84.820157, 39.10548], [-84.897171, 39.052407], [-84.83712, 38.988059], [-84.811645, 38.792766], [-84.978723, 38.77928], [-85.190507, 38.68795], [-85.258846, 38.737754], [-85.452114, 38.709348], [-85.433136, 38.523914], [-85.620521, 38.423105], [-85.653641, 38.327108], [-85.791563, 38.288569], [-85.908764, 38.161169], [-85.951467, 38.005608], [-86.178983, 38.011308], [-86.375324, 38.130629], [-86.517289, 38.042634], [-86.534156, 37.917007], [-86.598108, 37.867382], [-86.75099, 37.912893], [-86.794985, 37.988982], [-87.033444, 37.906593], [-87.070732, 37.801937], [-87.220944, 37.849134], [-87.380247, 37.935596], [-87.591582, 37.887194], [-87.830578, 37.876516], [-87.90681, 37.807624], [-88.02803, 37.799224], [-88.058499, 37.865349], [-88.02979, 38.025046], [-87.928858, 38.168594], [-87.984234, 38.20996], [-87.745254, 38.408996], [-87.654166, 38.511911], [-87.62012, 38.639489], [-87.519609, 38.697198], [-87.496537, 38.778571], [-87.550515, 38.85956], [-87.512187, 38.954417], [-87.640435, 39.166727], [-87.61005, 39.282232], [-87.531646, 39.347888], [-87.533227, 39.883127], [-87.526809, 40.46217], [-87.526711, 41.121485], [-87.524044, 41.708335], [-87.42344, 41.642835], [-87.278437, 41.619736], [-87.120322, 41.645701], [-86.824828, 41.76024], [-85.791363, 41.759051], [-84.805883, 41.760216], [-84.806082, 41.696089], [-84.80217, 40.800601], [-84.814179, 39.814212], [-84.820157, 39.10548]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US19",
                        "STATE": "19",
                        "NAME": "Iowa",
                        "LSAD": "",
                        "CENSUSAREA": 55857.13
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-91.217706, 43.50055], [-91.201847, 43.349103], [-91.05791, 43.253968], [-91.177932, 43.128875], [-91.146177, 42.90985], [-91.051275, 42.737001], [-90.952415, 42.686778], [-90.720209, 42.640758], [-90.640927, 42.508302], [-90.477279, 42.383794], [-90.391108, 42.225473], [-90.162895, 42.116718], [-90.140061, 42.003252], [-90.187969, 41.803163], [-90.31522, 41.734264], [-90.343228, 41.587833], [-90.461432, 41.523533], [-90.595237, 41.511032], [-90.655839, 41.462132], [-90.857554, 41.452751], [-91.047819, 41.4109], [-91.113648, 41.241401], [-90.946627, 41.096632], [-90.962916, 40.924957], [-91.096846, 40.811617], [-91.123928, 40.669152], [-91.348733, 40.609695], [-91.375746, 40.391879], [-91.419422, 40.378264], [-91.524612, 40.410765], [-91.729115, 40.61364], [-92.096387, 40.60183], [-93.260612, 40.580797], [-94.48928, 40.570707], [-95.765645, 40.585208], [-95.789485, 40.659388], [-95.888907, 40.731855], [-95.812083, 40.884239], [-95.862587, 41.088399], [-95.92599, 41.195698], [-95.932921, 41.463798], [-96.089714, 41.531778], [-96.117751, 41.694221], [-96.069662, 41.803509], [-96.161756, 41.90182], [-96.323723, 42.229887], [-96.407998, 42.337408], [-96.386007, 42.474495], [-96.443408, 42.489495], [-96.516338, 42.630435], [-96.639704, 42.737071], [-96.52774, 42.890588], [-96.510995, 43.024701], [-96.439335, 43.113916], [-96.485264, 43.224183], [-96.554937, 43.226775], [-96.524044, 43.394762], [-96.598928, 43.500457], [-96.453049, 43.500415], [-95.740813, 43.499894], [-94.47042, 43.50034], [-93.795793, 43.49952], [-92.790317, 43.499567], [-91.949879, 43.500485], [-91.217706, 43.50055]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US20",
                        "STATE": "20",
                        "NAME": "Kansas",
                        "LSAD": "",
                        "CENSUSAREA": 81758.717
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-102.04224, 36.993083], [-102.044644, 38.045532], [-102.045388, 38.813392], [-102.051744, 40.003078], [-101.409953, 40.002354], [-100.468773, 40.001724], [-99.813401, 40.0014], [-98.934792, 40.002205], [-98.099659, 40.002227], [-97.049663, 40.001323], [-96.154365, 40.000495], [-95.30829, 39.999998], [-95.205733, 39.908275], [-95.081534, 39.861718], [-94.959276, 39.901671], [-94.886933, 39.833098], [-94.968981, 39.692954], [-95.027644, 39.665454], [-95.102888, 39.533347], [-94.92311, 39.384492], [-94.823791, 39.209874], [-94.607034, 39.119404], [-94.611858, 38.620485], [-94.617721, 37.77297], [-94.61808, 36.998135], [-95.407572, 36.999241], [-96.500288, 36.998643], [-97.46228, 36.998685], [-98.354073, 36.997961], [-99.648652, 36.999604], [-100.734517, 36.999059], [-102.04224, 36.993083]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US21",
                        "STATE": "21",
                        "NAME": "Kentucky",
                        "LSAD": "",
                        "CENSUSAREA": 39486.338
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-81.968297, 37.537798], [-82.350948, 37.267077], [-82.498858, 37.227044], [-82.722097, 37.120168], [-82.722254, 37.057948], [-82.822684, 37.004128], [-82.879492, 36.889085], [-83.07259, 36.854589], [-83.194597, 36.739487], [-83.423707, 36.667385], [-83.531912, 36.664984], [-83.675413, 36.600814], [-83.690714, 36.582581], [-84.543138, 36.596277], [-85.195372, 36.625498], [-85.488353, 36.614994], [-85.832172, 36.622046], [-86.333051, 36.648778], [-87.114976, 36.642414], [-87.853204, 36.633247], [-88.070532, 36.678118], [-88.053205, 36.497129], [-89.117537, 36.503603], [-89.417293, 36.499033], [-89.375453, 36.615719], [-89.227319, 36.569375], [-89.15908, 36.666352], [-89.19948, 36.716045], [-89.117567, 36.887356], [-89.132685, 36.9822], [-89.182509, 37.037275], [-89.029981, 37.211144], [-88.916934, 37.224291], [-88.545403, 37.070003], [-88.458948, 37.073796], [-88.424403, 37.152428], [-88.515939, 37.284043], [-88.476592, 37.386875], [-88.281667, 37.452596], [-88.087664, 37.471059], [-88.158207, 37.664542], [-88.02803, 37.799224], [-87.90681, 37.807624], [-87.830578, 37.876516], [-87.591582, 37.887194], [-87.380247, 37.935596], [-87.220944, 37.849134], [-87.070732, 37.801937], [-87.033444, 37.906593], [-86.794985, 37.988982], [-86.75099, 37.912893], [-86.598108, 37.867382], [-86.534156, 37.917007], [-86.517289, 38.042634], [-86.375324, 38.130629], [-86.178983, 38.011308], [-85.951467, 38.005608], [-85.908764, 38.161169], [-85.791563, 38.288569], [-85.653641, 38.327108], [-85.620521, 38.423105], [-85.433136, 38.523914], [-85.452114, 38.709348], [-85.258846, 38.737754], [-85.190507, 38.68795], [-84.978723, 38.77928], [-84.811645, 38.792766], [-84.83712, 38.988059], [-84.897171, 39.052407], [-84.820157, 39.10548], [-84.754449, 39.146658], [-84.632446, 39.07676], [-84.509743, 39.09366], [-84.304698, 39.006455], [-84.212904, 38.805707], [-84.071491, 38.770475], [-83.859028, 38.756793], [-83.77216, 38.65815], [-83.668111, 38.628068], [-83.520953, 38.703045], [-83.366661, 38.658537], [-83.294193, 38.596588], [-83.142836, 38.625076], [-83.033014, 38.723805], [-82.894193, 38.756576], [-82.847186, 38.595166], [-82.724846, 38.5576], [-82.593673, 38.421809], [-82.574656, 38.263873], [-82.637306, 38.13905], [-82.551259, 38.070799], [-82.501862, 37.9332], [-82.421484, 37.885652], [-82.296118, 37.686174], [-82.121985, 37.552763], [-81.968297, 37.537798]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US22",
                        "STATE": "22",
                        "NAME": "Louisiana",
                        "LSAD": "",
                        "CENSUSAREA": 43203.905
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-93.837971, 29.690619], [-93.922744, 29.818808], [-93.85514, 29.864099], [-93.720805, 30.053043], [-93.697748, 30.152944], [-93.714319, 30.294282], [-93.758554, 30.387077], [-93.697828, 30.443838], [-93.727844, 30.57407], [-93.621093, 30.695159], [-93.554057, 30.824941], [-93.567788, 30.888302], [-93.516943, 31.023662], [-93.600308, 31.176158], [-93.620343, 31.271025], [-93.725925, 31.504092], [-93.818582, 31.554826], [-93.822598, 31.773559], [-93.909557, 31.893144], [-94.04272, 31.999265], [-94.042964, 33.019219], [-92.796533, 33.014836], [-91.951958, 33.007428], [-91.166073, 33.004106], [-91.212837, 32.922104], [-91.145002, 32.84287], [-91.165328, 32.751301], [-91.063946, 32.702926], [-91.152699, 32.640757], [-91.093741, 32.549128], [-91.095308, 32.458741], [-90.966457, 32.433868], [-91.004506, 32.368144], [-90.916157, 32.303582], [-91.164171, 32.196888], [-91.053175, 32.124237], [-91.075908, 32.016828], [-91.20101, 31.909159], [-91.338414, 31.851261], [-91.395715, 31.644165], [-91.51581, 31.530894], [-91.518578, 31.275283], [-91.625994, 31.116896], [-91.625118, 30.999167], [-90.380536, 30.999872], [-89.752642, 31.001853], [-89.847201, 30.670038], [-89.768133, 30.51502], [-89.68341, 30.451793], [-89.629727, 30.339287], [-89.617056, 30.227495], [-89.524504, 30.180753], [-89.617542, 30.156422], [-89.683712, 30.076018], [-89.857558, 30.004439], [-89.692004, 29.868722], [-89.598129, 29.881409], [-89.58136, 29.994722], [-89.494064, 30.040972], [-89.315453, 29.923208], [-89.44812, 29.703316], [-89.651237, 29.749479], [-89.621109, 29.657101], [-89.693877, 29.508559], [-89.508551, 29.386168], [-89.380001, 29.391785], [-89.200599, 29.347672], [-89.000674, 29.180091], [-89.062335, 29.070234], [-89.334735, 29.040335], [-89.482844, 29.215053], [-89.726162, 29.304026], [-89.816916, 29.384385], [-89.849642, 29.477996], [-90.032298, 29.427005], [-90.034275, 29.322661], [-90.096038, 29.240673], [-90.104162, 29.150407], [-90.223587, 29.085075], [-90.332796, 29.276956], [-90.565436, 29.285111], [-90.645612, 29.175867], [-90.844593, 29.06728], [-90.961278, 29.180817], [-91.094015, 29.187711], [-91.278792, 29.247776], [-91.265649, 29.472362], [-91.517274, 29.52974], [-91.621512, 29.735429], [-91.737253, 29.74937], [-91.85864, 29.703121], [-91.889118, 29.836023], [-92.107486, 29.744429], [-92.111787, 29.62177], [-91.841294, 29.62962], [-91.711654, 29.55427], [-91.821576, 29.473925], [-92.046316, 29.584362], [-92.158624, 29.581616], [-92.309357, 29.533026], [-92.653651, 29.588065], [-92.974305, 29.71398], [-93.226934, 29.777519], [-93.475252, 29.769242], [-93.741948, 29.736343], [-93.837971, 29.690619]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US23",
                        "STATE": "23",
                        "NAME": "Maine",
                        "LSAD": "",
                        "CENSUSAREA": 30842.923
                    },
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [[[[-68.785601, 44.053503], [-68.889717, 44.032516], [-68.943105, 44.10973], [-68.825067, 44.186338], [-68.785601, 44.053503]]], [[[-70.704696, 43.070989], [-70.8268, 43.127086], [-70.817865, 43.237911], [-70.967229, 43.343777], [-70.989067, 43.79244], [-71.031039, 44.655455], [-71.084334, 45.305293], [-70.950824, 45.33453], [-70.885029, 45.234873], [-70.712286, 45.390611], [-70.721611, 45.515058], [-70.644687, 45.607083], [-70.383552, 45.734869], [-70.416922, 45.795279], [-70.259117, 45.890755], [-70.310609, 46.064544], [-70.292736, 46.191599], [-70.208733, 46.328961], [-70.056433, 46.41659], [-69.997086, 46.69523], [-69.22442, 47.459686], [-69.036882, 47.407977], [-69.0402, 47.2451], [-68.895685, 47.182883], [-68.578551, 47.287551], [-68.432555, 47.28193], [-68.336236, 47.359795], [-68.222893, 47.344526], [-67.952269, 47.196142], [-67.790515, 47.067921], [-67.781095, 45.943032], [-67.803313, 45.677886], [-67.64581, 45.613597], [-67.425452, 45.579086], [-67.503088, 45.489688], [-67.418747, 45.37726], [-67.466479, 45.293817], [-67.404629, 45.159926], [-67.271076, 45.191081], [-67.112414, 45.112323], [-66.979708, 44.80736], [-67.189427, 44.645533], [-67.309627, 44.659316], [-67.568159, 44.531117], [-67.856684, 44.523934], [-67.868875, 44.456881], [-68.049334, 44.33073], [-68.123203, 44.478815], [-68.298223, 44.449225], [-68.173608, 44.328397], [-68.401268, 44.252244], [-68.429648, 44.439136], [-68.534522, 44.397811], [-68.603385, 44.27471], [-68.814811, 44.362194], [-68.829153, 44.462242], [-68.990767, 44.415033], [-68.958889, 44.314353], [-69.040193, 44.233673], [-69.100863, 44.104529], [-69.064299, 44.069911], [-69.203668, 43.941806], [-69.398455, 43.971804], [-69.423324, 43.915507], [-69.653337, 43.79103], [-69.835323, 43.721125], [-69.869732, 43.775656], [-70.053594, 43.828417], [-70.190014, 43.771866], [-70.251812, 43.683251], [-70.196911, 43.565146], [-70.361214, 43.52919], [-70.370514, 43.434133], [-70.535244, 43.336771], [-70.575787, 43.221859], [-70.704696, 43.070989]]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US24",
                        "STATE": "24",
                        "NAME": "Maryland",
                        "LSAD": "",
                        "CENSUSAREA": 9707.241
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-77.038598, 38.791513], [-76.909395, 38.892812], [-77.040999, 38.99511], [-77.1199, 38.934311], [-77.340287, 39.062991], [-77.462617, 39.076248], [-77.527282, 39.146236], [-77.45768, 39.22502], [-77.566596, 39.306121], [-77.719029, 39.321125], [-77.75309, 39.423262], [-77.878451, 39.563493], [-78.011343, 39.604083], [-78.171361, 39.695612], [-78.266833, 39.618818], [-78.420549, 39.624021], [-78.462899, 39.52084], [-78.689455, 39.54577], [-78.795857, 39.606934], [-78.953333, 39.463645], [-79.095428, 39.462548], [-79.253891, 39.337222], [-79.486873, 39.205961], [-79.476662, 39.721078], [-78.537702, 39.72249], [-77.534758, 39.720134], [-76.990903, 39.7198], [-75.788359, 39.721811], [-75.755953, 39.245958], [-75.693521, 38.460128], [-75.048939, 38.451263], [-75.193796, 38.096013], [-75.242266, 38.027209], [-75.624341, 37.994211], [-75.669711, 37.950796], [-75.875297, 38.011965], [-75.837563, 38.113753], [-76.111296, 38.286946], [-76.258189, 38.318373], [-76.33636, 38.492235], [-76.290043, 38.569158], [-76.147158, 38.63684], [-76.334619, 38.772911], [-76.163988, 38.999542], [-76.278527, 39.145764], [-76.170422, 39.332094], [-76.049846, 39.370644], [-75.976601, 39.447808], [-75.970337, 39.557637], [-76.276078, 39.322908], [-76.36439, 39.31184], [-76.442482, 39.195408], [-76.438928, 39.052788], [-76.39408, 39.011311], [-76.519442, 38.863135], [-76.515706, 38.528988], [-76.388348, 38.387781], [-76.385244, 38.217751], [-76.320136, 38.138339], [-76.361237, 38.059542], [-76.481036, 38.115873], [-76.590637, 38.214212], [-76.797452, 38.236918], [-76.920932, 38.291568], [-77.016371, 38.445572], [-77.207312, 38.359867], [-77.27422, 38.48177], [-77.1302, 38.635017], [-77.042298, 38.718515], [-77.038598, 38.791513]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US25",
                        "STATE": "25",
                        "NAME": "Massachusetts",
                        "LSAD": "",
                        "CENSUSAREA": 7800.058
                    },
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [[[[-70.59628, 41.471905], [-70.451084, 41.348161], [-70.709826, 41.341723], [-70.686881, 41.441334], [-70.59628, 41.471905]]], [[[-72.458519, 42.726853], [-71.294205, 42.69699], [-71.132503, 42.821389], [-70.930799, 42.884589], [-70.817296, 42.87229], [-70.770453, 42.704824], [-70.61842, 42.62864], [-70.654727, 42.582234], [-70.871382, 42.546404], [-70.857791, 42.490296], [-70.982994, 42.423996], [-70.98909, 42.267449], [-70.770964, 42.249197], [-70.640169, 42.088633], [-70.662476, 41.960592], [-70.552941, 41.929641], [-70.54103, 41.815754], [-70.471552, 41.761563], [-70.259205, 41.713954], [-70.189254, 41.751982], [-69.935952, 41.809422], [-69.928261, 41.6917], [-70.245867, 41.628479], [-70.360352, 41.631069], [-70.493244, 41.552044], [-70.658659, 41.543385], [-70.626529, 41.712995], [-70.718739, 41.73574], [-70.810279, 41.624873], [-70.929722, 41.609479], [-70.931545, 41.540169], [-71.12057, 41.497448], [-71.132888, 41.660102], [-71.19564, 41.67509], [-71.224798, 41.710498], [-71.327896, 41.780501], [-71.3817, 41.893199], [-71.381401, 42.018798], [-71.799242, 42.008065], [-71.80065, 42.023569], [-72.999549, 42.038653], [-73.487314, 42.049638], [-73.508142, 42.086257], [-73.264957, 42.74594], [-72.458519, 42.726853]]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US26",
                        "STATE": "26",
                        "NAME": "Michigan",
                        "LSAD": "",
                        "CENSUSAREA": 56538.901
                    },
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [[[[-88.684434, 48.115785], [-88.547033, 48.174891], [-88.449502, 48.163312], [-88.670073, 48.011446], [-88.899184, 47.9533], [-88.911665, 47.891344], [-89.124134, 47.828616], [-89.179154, 47.93503], [-88.684434, 48.115785]]], [[[-85.566441, 45.760222], [-85.498777, 45.726291], [-85.487026, 45.621211], [-85.618049, 45.582647], [-85.566441, 45.760222]]], [[[-84.806082, 41.696089], [-84.805883, 41.760216], [-85.791363, 41.759051], [-86.824828, 41.76024], [-86.619442, 41.893827], [-86.485223, 42.118239], [-86.356218, 42.254166], [-86.24971, 42.480212], [-86.206834, 42.719424], [-86.226305, 42.988284], [-86.254646, 43.083409], [-86.39575, 43.316225], [-86.538497, 43.617501], [-86.431043, 43.815975], [-86.514702, 44.058119], [-86.429871, 44.119782], [-86.26871, 44.345324], [-86.220697, 44.566742], [-86.232482, 44.70605], [-86.073506, 44.769803], [-86.066745, 44.905685], [-85.9316, 44.968788], [-85.807403, 44.949814], [-85.746444, 45.051229], [-85.614319, 45.127562], [-85.56613, 45.043633], [-85.648932, 44.87401], [-85.627982, 44.767508], [-85.527216, 44.748235], [-85.3958, 44.931018], [-85.371593, 45.270834], [-85.209673, 45.356937], [-85.032813, 45.361251], [-85.119737, 45.569026], [-84.910398, 45.75001], [-84.772765, 45.789301], [-84.46168, 45.652404], [-84.215268, 45.634767], [-84.109238, 45.505171], [-83.909472, 45.485784], [-83.806622, 45.419159], [-83.599273, 45.352561], [-83.496704, 45.357536], [-83.422389, 45.290775], [-83.271506, 45.023417], [-83.399255, 45.070364], [-83.443718, 44.952247], [-83.320503, 44.880571], [-83.273393, 44.713901], [-83.314517, 44.608725], [-83.332533, 44.340464], [-83.549096, 44.227282], [-83.58409, 44.056748], [-83.680108, 43.994196], [-83.829077, 43.989095], [-83.916815, 43.89905], [-83.909479, 43.672622], [-83.669795, 43.59079], [-83.26153, 43.973525], [-83.046577, 44.01571], [-82.915976, 44.070503], [-82.738992, 43.989506], [-82.633641, 43.831224], [-82.6005, 43.602935], [-82.539517, 43.437539], [-82.523086, 43.225361], [-82.412965, 42.977041], [-82.455027, 42.926866], [-82.467483, 42.76191], [-82.523337, 42.607486], [-82.680758, 42.557909], [-82.700964, 42.689548], [-82.797318, 42.654032], [-82.874416, 42.523535], [-82.888413, 42.398237], [-83.064121, 42.317738], [-83.128022, 42.238839], [-83.133511, 42.088143], [-83.187246, 42.007573], [-83.326029, 41.924948], [-83.453832, 41.732647], [-84.806082, 41.696089]]], [[[-90.418136, 46.566094], [-90.327626, 46.607744], [-90.028392, 46.67439], [-89.848652, 46.795711], [-89.673375, 46.833229], [-89.437047, 46.839512], [-89.249143, 46.903326], [-89.142595, 46.984859], [-88.998417, 46.995314], [-88.88914, 47.100575], [-88.573997, 47.245989], [-88.418673, 47.371188], [-88.18182, 47.457657], [-87.801184, 47.473301], [-87.815371, 47.38479], [-88.054849, 47.29824], [-88.212361, 47.209423], [-88.367624, 47.019213], [-88.443901, 46.972251], [-88.483748, 46.831727], [-88.438427, 46.786714], [-88.244437, 46.929612], [-87.900339, 46.909686], [-87.6333, 46.812107], [-87.38929, 46.524472], [-87.258732, 46.488255], [-87.017136, 46.53355], [-86.875151, 46.43728], [-86.683819, 46.498079], [-86.586168, 46.463324], [-86.495054, 46.524874], [-86.138295, 46.672935], [-85.877908, 46.690914], [-85.482096, 46.680432], [-85.25686, 46.75338], [-84.95158, 46.769488], [-85.027513, 46.697451], [-85.056133, 46.52652], [-85.015211, 46.479712], [-84.800101, 46.446219], [-84.63102, 46.484868], [-84.551496, 46.418522], [-84.420274, 46.501077], [-84.111225, 46.504119], [-84.146172, 46.41852], [-84.118175, 46.233968], [-84.026536, 46.131648], [-84.071741, 46.092441], [-83.900535, 45.998918], [-83.703861, 46.103366], [-83.581315, 46.089613], [-83.510623, 45.929324], [-83.78611, 45.933375], [-83.881055, 45.968185], [-84.111174, 45.978675], [-84.376429, 45.931962], [-84.656567, 46.052654], [-84.746985, 45.835597], [-85.003597, 46.00613], [-85.335911, 46.092595], [-85.52157, 46.091257], [-85.663966, 45.967013], [-85.810442, 45.980087], [-85.926017, 45.932104], [-86.196618, 45.963185], [-86.324232, 45.90608], [-86.363808, 45.790057], [-86.51457, 45.752337], [-86.648439, 45.615992], [-86.715781, 45.683949], [-86.555547, 45.813499], [-86.78208, 45.860195], [-86.838746, 45.722307], [-87.070442, 45.718779], [-87.172241, 45.661788], [-87.465201, 45.273351], [-87.612019, 45.123377], [-87.590208, 45.095264], [-87.741805, 45.197051], [-87.648126, 45.339396], [-87.871485, 45.371546], [-87.812976, 45.464159], [-87.781623, 45.67328], [-87.879812, 45.754843], [-88.094047, 45.785658], [-88.102908, 45.921869], [-88.416914, 45.975323], [-88.776187, 46.015931], [-89.09163, 46.138505], [-90.120489, 46.336852], [-90.216594, 46.501759], [-90.418136, 46.566094]]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US27",
                        "STATE": "27",
                        "NAME": "Minnesota",
                        "LSAD": "",
                        "CENSUSAREA": 79626.743
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-91.217706, 43.50055], [-91.949879, 43.500485], [-92.790317, 43.499567], [-93.795793, 43.49952], [-94.47042, 43.50034], [-95.740813, 43.499894], [-96.453049, 43.500415], [-96.451816, 44.460402], [-96.453067, 45.298115], [-96.489065, 45.357071], [-96.680454, 45.410499], [-96.857751, 45.605962], [-96.652226, 45.746809], [-96.57974, 45.82582], [-96.56328, 45.935238], [-96.554507, 46.083978], [-96.599761, 46.330386], [-96.735123, 46.478897], [-96.798357, 46.665314], [-96.776558, 46.895663], [-96.819558, 46.967453], [-96.851293, 47.589264], [-97.054554, 47.946279], [-97.146672, 48.171484], [-97.11657, 48.279661], [-97.163105, 48.543855], [-97.098697, 48.687534], [-97.136083, 48.727763], [-97.229039, 49.000687], [-96.405408, 48.999984], [-95.153711, 48.998903], [-95.153314, 49.384358], [-94.957465, 49.370186], [-94.82516, 49.294283], [-94.683069, 48.883929], [-94.690889, 48.778066], [-94.58715, 48.717599], [-94.264473, 48.698919], [-94.244394, 48.653442], [-93.844008, 48.629395], [-93.794454, 48.516021], [-93.467504, 48.545664], [-93.347528, 48.62662], [-92.984963, 48.623731], [-92.728046, 48.53929], [-92.656027, 48.436709], [-92.507285, 48.447875], [-92.369174, 48.220268], [-92.280727, 48.244269], [-92.288994, 48.342991], [-92.162161, 48.363279], [-92.000133, 48.321355], [-92.006577, 48.265421], [-91.864382, 48.207031], [-91.714931, 48.19913], [-91.711986, 48.114713], [-91.429642, 48.048608], [-91.250112, 48.084087], [-90.976955, 48.219452], [-90.839176, 48.239511], [-90.761625, 48.098283], [-90.374542, 48.090942], [-90.132645, 48.111768], [-90.023595, 48.084708], [-89.871245, 47.985945], [-89.749314, 48.023325], [-89.58823, 47.9662], [-89.974296, 47.830514], [-90.537105, 47.703055], [-90.735927, 47.624343], [-91.170037, 47.366266], [-91.477351, 47.125667], [-92.094089, 46.787839], [-92.01529, 46.706469], [-92.08949, 46.74924], [-92.212392, 46.649941], [-92.292192, 46.666042], [-92.294033, 46.074377], [-92.362141, 46.013103], [-92.707702, 45.894901], [-92.784621, 45.764196], [-92.869193, 45.717568], [-92.883749, 45.575483], [-92.770223, 45.566939], [-92.646602, 45.441635], [-92.75871, 45.290965], [-92.744938, 45.108309], [-92.791528, 45.079647], [-92.750645, 44.937299], [-92.807988, 44.75147], [-92.518358, 44.575183], [-92.347567, 44.557149], [-92.215163, 44.438503], [-92.053549, 44.401375], [-91.92559, 44.333548], [-91.875158, 44.200575], [-91.582604, 44.027381], [-91.440536, 44.001501], [-91.244135, 43.774667], [-91.268748, 43.615348], [-91.217706, 43.50055]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US28",
                        "STATE": "28",
                        "NAME": "Mississippi",
                        "LSAD": "",
                        "CENSUSAREA": 46923.274
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-90.309297, 34.995694], [-89.434954, 34.993754], [-88.200064, 34.995634], [-88.097888, 34.892202], [-88.210741, 34.029199], [-88.330934, 33.073125], [-88.403789, 32.44977], [-88.473227, 31.893856], [-88.43898, 31.246896], [-88.395023, 30.369425], [-88.45381, 30.329626], [-88.596349, 30.358365], [-88.746945, 30.347622], [-88.857828, 30.392898], [-89.016334, 30.383898], [-89.419348, 30.25432], [-89.524504, 30.180753], [-89.617056, 30.227495], [-89.629727, 30.339287], [-89.68341, 30.451793], [-89.768133, 30.51502], [-89.847201, 30.670038], [-89.752642, 31.001853], [-90.380536, 30.999872], [-91.625118, 30.999167], [-91.625994, 31.116896], [-91.518578, 31.275283], [-91.51581, 31.530894], [-91.395715, 31.644165], [-91.338414, 31.851261], [-91.20101, 31.909159], [-91.075908, 32.016828], [-91.053175, 32.124237], [-91.164171, 32.196888], [-90.916157, 32.303582], [-91.004506, 32.368144], [-90.966457, 32.433868], [-91.095308, 32.458741], [-91.093741, 32.549128], [-91.152699, 32.640757], [-91.063946, 32.702926], [-91.165328, 32.751301], [-91.145002, 32.84287], [-91.212837, 32.922104], [-91.166073, 33.004106], [-91.087589, 33.145177], [-91.082878, 33.221621], [-91.228489, 33.564667], [-91.219048, 33.661503], [-91.084126, 33.657322], [-91.053886, 33.778701], [-91.087921, 33.975335], [-90.888956, 34.029788], [-90.946323, 34.109374], [-90.740889, 34.306538], [-90.756197, 34.367256], [-90.613944, 34.390723], [-90.517168, 34.630928], [-90.414864, 34.831846], [-90.250095, 34.90732], [-90.309297, 34.995694]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US29",
                        "STATE": "29",
                        "NAME": "Missouri",
                        "LSAD": "",
                        "CENSUSAREA": 68741.522
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-89.733095, 36.000608], [-90.37789, 35.995683], [-90.220425, 36.184764], [-90.083731, 36.272332], [-90.064514, 36.382085], [-90.154409, 36.496832], [-91.404915, 36.49712], [-92.350277, 36.497787], [-93.125969, 36.497851], [-94.111473, 36.498597], [-94.617919, 36.499414], [-94.61808, 36.998135], [-94.617721, 37.77297], [-94.611858, 38.620485], [-94.607034, 39.119404], [-94.823791, 39.209874], [-94.92311, 39.384492], [-95.102888, 39.533347], [-95.027644, 39.665454], [-94.968981, 39.692954], [-94.886933, 39.833098], [-94.959276, 39.901671], [-95.081534, 39.861718], [-95.205733, 39.908275], [-95.30829, 39.999998], [-95.42164, 40.058952], [-95.398667, 40.126419], [-95.469718, 40.227908], [-95.610439, 40.31397], [-95.765645, 40.585208], [-94.48928, 40.570707], [-93.260612, 40.580797], [-92.096387, 40.60183], [-91.729115, 40.61364], [-91.524612, 40.410765], [-91.419422, 40.378264], [-91.506501, 40.236304], [-91.494878, 40.036453], [-91.420878, 39.914865], [-91.429519, 39.837801], [-91.370009, 39.732524], [-91.100307, 39.538695], [-91.059439, 39.46886], [-90.726981, 39.251173], [-90.6614, 38.924989], [-90.54403, 38.87505], [-90.450792, 38.967764], [-90.250248, 38.919344], [-90.113327, 38.849306], [-90.21201, 38.71175], [-90.191811, 38.598951], [-90.349743, 38.377609], [-90.353902, 38.213855], [-90.243116, 38.112669], [-90.130788, 38.062341], [-89.901832, 37.869822], [-89.844786, 37.905572], [-89.583316, 37.713261], [-89.512009, 37.685525], [-89.516447, 37.535558], [-89.422465, 37.397132], [-89.51834, 37.285497], [-89.29213, 36.992189], [-89.132685, 36.9822], [-89.117567, 36.887356], [-89.19948, 36.716045], [-89.15908, 36.666352], [-89.227319, 36.569375], [-89.375453, 36.615719], [-89.417293, 36.499033], [-89.485106, 36.497692], [-89.5391, 36.498201], [-89.531822, 36.339246], [-89.611819, 36.309088], [-89.594, 36.12719], [-89.733095, 36.000608]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US30",
                        "STATE": "30",
                        "NAME": "Montana",
                        "LSAD": "",
                        "CENSUSAREA": 145545.801
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-111.048974, 44.474072], [-111.225208, 44.581006], [-111.323669, 44.724474], [-111.473178, 44.665479], [-111.585763, 44.562843], [-111.821488, 44.509286], [-111.870504, 44.564033], [-112.106755, 44.520829], [-112.286187, 44.568472], [-112.473207, 44.480027], [-112.781294, 44.484888], [-112.886041, 44.395874], [-113.003544, 44.450814], [-113.131453, 44.772837], [-113.455071, 44.865424], [-113.45197, 45.059247], [-113.57467, 45.128411], [-113.735601, 45.325265], [-113.734402, 45.392353], [-113.834555, 45.520729], [-113.806729, 45.602146], [-113.986656, 45.704564], [-114.135249, 45.557465], [-114.333218, 45.459316], [-114.460542, 45.561283], [-114.558253, 45.585104], [-114.504869, 45.722176], [-114.566172, 45.773864], [-114.498809, 45.850676], [-114.388243, 45.88234], [-114.492153, 46.04729], [-114.451912, 46.241253], [-114.322519, 46.611066], [-114.615036, 46.639733], [-114.649388, 46.73289], [-114.927837, 46.83599], [-115.001274, 46.971901], [-115.326903, 47.255912], [-115.526751, 47.303219], [-115.746945, 47.555293], [-115.689404, 47.595402], [-115.72377, 47.696671], [-115.824597, 47.752154], [-116.04885, 47.977186], [-116.049193, 49.000912], [-115.207912, 48.999228], [-113.692982, 48.997632], [-113.009895, 48.998619], [-111.500812, 48.996963], [-110.171595, 48.999262], [-108.994722, 48.999237], [-107.441017, 48.999363], [-106.050543, 48.999207], [-104.875527, 48.998991], [-104.048736, 48.999877], [-104.043933, 47.971515], [-104.045333, 47.343452], [-104.045045, 46.509788], [-104.045443, 45.94531], [-104.040128, 44.999987], [-104.057698, 44.997431], [-105.076607, 45.000347], [-106.263586, 44.993788], [-107.13418, 45.000109], [-108.271201, 45.000251], [-109.103445, 45.005904], [-110.199503, 44.996188], [-110.705272, 44.992324], [-111.055199, 45.001321], [-111.048974, 44.474072]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US31",
                        "STATE": "31",
                        "NAME": "Nebraska",
                        "LSAD": "",
                        "CENSUSAREA": 76824.171
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-104.053249, 41.001406], [-104.053026, 41.885464], [-104.053127, 43.000585], [-103.132955, 43.000784], [-101.625424, 42.996238], [-100.631728, 42.998092], [-99.471353, 42.997967], [-98.49855, 42.99856], [-98.467356, 42.947556], [-98.129038, 42.821228], [-97.950147, 42.769619], [-97.84527, 42.867734], [-97.686506, 42.842435], [-97.306677, 42.867604], [-97.131331, 42.771929], [-96.982197, 42.760554], [-96.687669, 42.653126], [-96.710995, 42.608128], [-96.501321, 42.482749], [-96.443408, 42.489495], [-96.386007, 42.474495], [-96.407998, 42.337408], [-96.323723, 42.229887], [-96.161756, 41.90182], [-96.069662, 41.803509], [-96.117751, 41.694221], [-96.089714, 41.531778], [-95.932921, 41.463798], [-95.92599, 41.195698], [-95.862587, 41.088399], [-95.812083, 40.884239], [-95.888907, 40.731855], [-95.789485, 40.659388], [-95.765645, 40.585208], [-95.610439, 40.31397], [-95.469718, 40.227908], [-95.398667, 40.126419], [-95.42164, 40.058952], [-95.30829, 39.999998], [-96.154365, 40.000495], [-97.049663, 40.001323], [-98.099659, 40.002227], [-98.934792, 40.002205], [-99.813401, 40.0014], [-100.468773, 40.001724], [-101.409953, 40.002354], [-102.051744, 40.003078], [-102.051614, 41.002377], [-102.865784, 41.001988], [-104.053249, 41.001406]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US32",
                        "STATE": "32",
                        "NAME": "Nevada",
                        "LSAD": "",
                        "CENSUSAREA": 109781.18
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-114.0506, 37.000396], [-114.046838, 36.194069], [-114.15413, 36.023862], [-114.238799, 36.014561], [-114.372106, 36.143114], [-114.572031, 36.15161], [-114.736165, 36.104367], [-114.731159, 35.943916], [-114.68112, 35.885364], [-114.71211, 35.806185], [-114.653406, 35.610789], [-114.677643, 35.489742], [-114.595931, 35.325234], [-114.572747, 35.138725], [-114.633013, 35.002085], [-115.271342, 35.51266], [-115.750844, 35.889287], [-116.541983, 36.499952], [-117.375905, 37.126843], [-117.875927, 37.497267], [-118.771867, 38.141871], [-119.587679, 38.714734], [-120.001014, 38.999574], [-120.005746, 39.22521], [-119.997634, 39.956505], [-119.995926, 40.499901], [-119.999866, 41.183974], [-119.999168, 41.99454], [-118.696409, 41.991794], [-117.625973, 41.998102], [-117.026222, 42.000252], [-116.368478, 41.996281], [-115.031783, 41.996008], [-114.041723, 41.99372], [-114.041396, 41.219958], [-114.046555, 39.996899], [-114.047079, 39.499943], [-114.050485, 38.499955], [-114.049677, 37.823645], [-114.0506, 37.000396]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US33",
                        "STATE": "33",
                        "NAME": "New Hampshire",
                        "LSAD": "",
                        "CENSUSAREA": 8952.651
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-71.502487, 45.013367], [-71.403267, 45.215348], [-71.284396, 45.302434], [-71.133994, 45.244167], [-71.084334, 45.305293], [-71.031039, 44.655455], [-70.989067, 43.79244], [-70.967229, 43.343777], [-70.817865, 43.237911], [-70.8268, 43.127086], [-70.704696, 43.070989], [-70.817296, 42.87229], [-70.930799, 42.884589], [-71.132503, 42.821389], [-71.294205, 42.69699], [-72.458519, 42.726853], [-72.542784, 42.808482], [-72.534554, 42.949894], [-72.444635, 43.010566], [-72.45689, 43.146558], [-72.373126, 43.579419], [-72.302867, 43.702718], [-72.184847, 43.804698], [-72.116985, 43.99448], [-72.033739, 44.07883], [-72.067774, 44.270976], [-72.033136, 44.320365], [-71.812473, 44.358477], [-71.59948, 44.486455], [-71.551722, 44.627598], [-71.62518, 44.743978], [-71.49392, 44.910923], [-71.502487, 45.013367]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US34",
                        "STATE": "34",
                        "NAME": "New Jersey",
                        "LSAD": "",
                        "CENSUSAREA": 7354.22
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-74.694914, 41.357423], [-74.301994, 41.172594], [-73.90268, 40.997297], [-73.929006, 40.889578], [-74.024543, 40.709436], [-74.181083, 40.646484], [-74.261889, 40.464706], [-73.998505, 40.410911], [-73.977442, 40.299373], [-74.030181, 40.122814], [-74.096906, 39.76303], [-74.304343, 39.471445], [-74.412692, 39.360816], [-74.614481, 39.244659], [-74.792723, 38.991991], [-74.971995, 38.94037], [-74.887167, 39.158825], [-75.177506, 39.242746], [-75.365016, 39.341388], [-75.536431, 39.460559], [-75.55587, 39.605824], [-75.559446, 39.629812], [-75.509742, 39.686113], [-75.415041, 39.801786], [-75.330433, 39.849012], [-75.150721, 39.882713], [-75.13012, 39.958712], [-74.816307, 40.12761], [-74.770406, 40.214508], [-75.056102, 40.416066], [-75.068615, 40.542223], [-75.194046, 40.576256], [-75.171587, 40.777745], [-75.053664, 40.87366], [-75.130575, 40.991093], [-75.025777, 41.039806], [-74.882139, 41.180836], [-74.838366, 41.277286], [-74.694914, 41.357423]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US35",
                        "STATE": "35",
                        "NAME": "New Mexico",
                        "LSAD": "",
                        "CENSUSAREA": 121298.148
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-106.528543, 31.783907], [-107.422495, 31.783599], [-108.208394, 31.783599], [-108.208573, 31.333395], [-109.050044, 31.332502], [-109.048286, 32.089114], [-109.04748, 33.06842], [-109.046662, 33.625055], [-109.046182, 34.522393], [-109.046024, 35.175499], [-109.046183, 36.181751], [-109.045223, 36.999084], [-108.249358, 36.999015], [-107.420913, 37.000005], [-106.869796, 36.992426], [-106.201469, 36.994122], [-105.000554, 36.993264], [-104.338833, 36.993535], [-103.002199, 37.000104], [-103.002434, 36.500397], [-103.041924, 36.500439], [-103.041554, 35.622487], [-103.042781, 34.850243], [-103.043617, 34.003633], [-103.064625, 32.999899], [-103.064423, 32.000518], [-103.722853, 32.000208], [-104.531756, 32.000117], [-105.429281, 32.000577], [-106.618486, 32.000495], [-106.635926, 31.866235], [-106.528543, 31.783907]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US36",
                        "STATE": "36",
                        "NAME": "New York",
                        "LSAD": "",
                        "CENSUSAREA": 47126.399
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-73.343124, 45.01084], [-73.381359, 44.845021], [-73.335443, 44.804602], [-73.38982, 44.61721], [-73.299885, 44.476652], [-73.333575, 44.372288], [-73.311025, 44.27424], [-73.390805, 44.189072], [-73.43774, 44.045006], [-73.350593, 43.771939], [-73.42791, 43.634428], [-73.302076, 43.624364], [-73.246821, 43.52578], [-73.278673, 42.83341], [-73.264957, 42.74594], [-73.508142, 42.086257], [-73.487314, 42.049638], [-73.550961, 41.295422], [-73.482709, 41.21276], [-73.727775, 41.100696], [-73.657336, 40.985171], [-73.713674, 40.870099], [-73.400862, 40.953997], [-73.229285, 40.905121], [-73.140785, 40.966178], [-72.774104, 40.965314], [-72.585327, 40.997587], [-72.356087, 41.133635], [-72.260515, 41.042065], [-72.162898, 41.053187], [-72.095456, 40.991349], [-71.919385, 41.080517], [-71.87391, 41.052278], [-72.39585, 40.86666], [-73.20844, 40.630884], [-73.319257, 40.635795], [-73.562372, 40.583703], [-73.774928, 40.590759], [-73.934512, 40.545175], [-74.042412, 40.624847], [-74.024543, 40.709436], [-73.929006, 40.889578], [-73.90268, 40.997297], [-74.301994, 41.172594], [-74.694914, 41.357423], [-74.758587, 41.423287], [-74.888691, 41.438259], [-74.984372, 41.506611], [-75.044224, 41.617978], [-75.053431, 41.752538], [-75.114399, 41.843583], [-75.263815, 41.870757], [-75.359579, 41.999445], [-76.343722, 41.998346], [-77.83203, 41.998524], [-78.874759, 41.997559], [-79.761374, 41.999067], [-79.761951, 42.26986], [-79.429119, 42.42838], [-79.351989, 42.48892], [-79.148723, 42.553672], [-79.04886, 42.689158], [-78.853455, 42.783958], [-79.01053, 43.064389], [-79.070469, 43.262454], [-78.634346, 43.357624], [-78.488857, 43.374763], [-77.976438, 43.369159], [-77.756931, 43.337361], [-77.577223, 43.243263], [-77.391015, 43.276363], [-77.111866, 43.287945], [-76.952174, 43.270692], [-76.69836, 43.344436], [-76.630774, 43.413356], [-76.410636, 43.523159], [-76.297103, 43.51287], [-76.203473, 43.574978], [-76.229268, 43.804135], [-76.127285, 43.897889], [-76.134296, 43.954726], [-76.266733, 43.995578], [-76.366972, 44.100409], [-76.312647, 44.199044], [-76.161833, 44.280777], [-75.912985, 44.368084], [-75.76623, 44.515851], [-75.505903, 44.705081], [-75.241303, 44.866958], [-74.972463, 44.983402], [-74.826578, 45.01585], [-74.683973, 44.99969], [-74.146814, 44.9915], [-73.343124, 45.01084]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US37",
                        "STATE": "37",
                        "NAME": "North Carolina",
                        "LSAD": "",
                        "CENSUSAREA": 48617.905
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-75.867044, 36.550754], [-75.899908, 36.482124], [-76.003912, 36.441864], [-75.923511, 36.367796], [-75.910658, 36.212157], [-76.071672, 36.140183], [-76.410878, 36.078034], [-76.362966, 35.942197], [-76.176585, 35.993267], [-76.062071, 35.993004], [-75.97783, 35.897181], [-75.899382, 35.977209], [-75.782498, 35.935615], [-75.726689, 35.811361], [-75.729802, 35.625985], [-75.895045, 35.573152], [-76.01139, 35.423084], [-76.14291, 35.32866], [-76.606041, 35.387113], [-76.467776, 35.261213], [-76.60042, 35.067867], [-76.801426, 34.964369], [-76.762931, 34.920374], [-76.635072, 34.989116], [-76.502623, 35.007166], [-76.277698, 34.940014], [-76.400242, 34.855476], [-76.524712, 34.681964], [-76.616567, 34.714059], [-77.031105, 34.661184], [-77.209161, 34.605032], [-77.582323, 34.400506], [-77.740136, 34.272546], [-77.829209, 34.162618], [-77.946568, 33.912261], [-78.018689, 33.888289], [-78.17772, 33.914272], [-78.383964, 33.901946], [-78.541087, 33.851112], [-79.249763, 34.449774], [-79.675299, 34.804744], [-80.797543, 34.819786], [-80.782042, 34.935782], [-80.93495, 35.107409], [-81.043625, 35.149877], [-82.27492, 35.200071], [-82.460092, 35.178143], [-83.108535, 35.000771], [-83.619985, 34.986592], [-84.321869, 34.988408], [-84.29024, 35.225572], [-84.097508, 35.247382], [-84.02141, 35.301383], [-84.021507, 35.404183], [-83.882563, 35.517182], [-83.771736, 35.562118], [-83.498335, 35.562981], [-83.312757, 35.654809], [-83.240669, 35.72676], [-83.078732, 35.789472], [-82.992053, 35.773948], [-82.785267, 35.987927], [-82.632265, 36.065705], [-82.549682, 35.964275], [-82.409458, 36.083409], [-82.289455, 36.13571], [-82.147948, 36.149516], [-82.033141, 36.120422], [-81.908137, 36.302013], [-81.795269, 36.357849], [-81.695311, 36.467912], [-81.677535, 36.588117], [-80.837641, 36.559118], [-80.295243, 36.543973], [-79.510647, 36.540738], [-78.509965, 36.541065], [-77.749706, 36.54552], [-76.916048, 36.543815], [-76.807078, 36.550606], [-75.867044, 36.550754]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US38",
                        "STATE": "38",
                        "NAME": "North Dakota",
                        "LSAD": "",
                        "CENSUSAREA": 69000.798
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-104.045443, 45.94531], [-104.045045, 46.509788], [-104.045333, 47.343452], [-104.043933, 47.971515], [-104.048736, 48.999877], [-103.375467, 48.998951], [-102.216993, 48.998553], [-101.125434, 48.999078], [-99.91378, 48.999049], [-98.869037, 49.000205], [-97.950205, 49.000515], [-97.229039, 49.000687], [-97.136083, 48.727763], [-97.098697, 48.687534], [-97.163105, 48.543855], [-97.11657, 48.279661], [-97.146672, 48.171484], [-97.054554, 47.946279], [-96.851293, 47.589264], [-96.819558, 46.967453], [-96.776558, 46.895663], [-96.798357, 46.665314], [-96.735123, 46.478897], [-96.599761, 46.330386], [-96.554507, 46.083978], [-96.56328, 45.935238], [-97.784575, 45.935327], [-98.414518, 45.936504], [-99.257745, 45.94006], [-100.170826, 45.942514], [-101.41989, 45.943763], [-102.920482, 45.945038], [-104.045443, 45.94531]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US39",
                        "STATE": "39",
                        "NAME": "Ohio",
                        "LSAD": "",
                        "CENSUSAREA": 40860.694
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-82.593673, 38.421809], [-82.724846, 38.5576], [-82.847186, 38.595166], [-82.894193, 38.756576], [-83.033014, 38.723805], [-83.142836, 38.625076], [-83.294193, 38.596588], [-83.366661, 38.658537], [-83.520953, 38.703045], [-83.668111, 38.628068], [-83.77216, 38.65815], [-83.859028, 38.756793], [-84.071491, 38.770475], [-84.212904, 38.805707], [-84.304698, 39.006455], [-84.509743, 39.09366], [-84.632446, 39.07676], [-84.754449, 39.146658], [-84.820157, 39.10548], [-84.814179, 39.814212], [-84.80217, 40.800601], [-84.806082, 41.696089], [-83.453832, 41.732647], [-83.066593, 41.59534], [-82.934369, 41.514353], [-82.85677, 41.548262], [-82.721914, 41.516677], [-82.616952, 41.428425], [-82.481214, 41.381342], [-82.254678, 41.434441], [-82.011966, 41.515639], [-81.744755, 41.48715], [-81.442645, 41.673255], [-81.01049, 41.853962], [-80.900342, 41.868912], [-80.519425, 41.977523], [-80.518693, 41.248855], [-80.518991, 40.638801], [-80.666917, 40.573664], [-80.599194, 40.482566], [-80.599895, 40.317669], [-80.704602, 40.154823], [-80.740126, 39.970793], [-80.865339, 39.753251], [-80.88036, 39.620706], [-81.0239, 39.552313], [-81.223581, 39.386062], [-81.347567, 39.34577], [-81.456143, 39.409274], [-81.678331, 39.273755], [-81.756254, 39.177276], [-81.78182, 38.964935], [-81.844486, 38.928746], [-82.035963, 39.025478], [-82.217269, 38.79568], [-82.188767, 38.594984], [-82.291271, 38.578983], [-82.323999, 38.449268], [-82.529579, 38.405182], [-82.593673, 38.421809]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US40",
                        "STATE": "40",
                        "NAME": "Oklahoma",
                        "LSAD": "",
                        "CENSUSAREA": 68594.921
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-103.002434, 36.500397], [-103.002199, 37.000104], [-102.04224, 36.993083], [-100.734517, 36.999059], [-99.648652, 36.999604], [-98.354073, 36.997961], [-97.46228, 36.998685], [-96.500288, 36.998643], [-95.407572, 36.999241], [-94.61808, 36.998135], [-94.617919, 36.499414], [-94.431215, 35.39429], [-94.45753, 34.642961], [-94.485875, 33.637867], [-94.775064, 33.755038], [-94.830804, 33.740068], [-95.131056, 33.936925], [-95.230491, 33.960764], [-95.294789, 33.875388], [-95.533283, 33.881162], [-95.563424, 33.932193], [-95.828245, 33.836054], [-95.941267, 33.861619], [-96.14807, 33.837799], [-96.169452, 33.770131], [-96.277269, 33.769735], [-96.342665, 33.686975], [-96.422643, 33.776041], [-96.673449, 33.912278], [-96.690708, 33.849959], [-96.866438, 33.853149], [-96.922114, 33.959579], [-97.172192, 33.737545], [-97.166629, 33.847311], [-97.210921, 33.916064], [-97.372941, 33.819454], [-97.462857, 33.841772], [-97.671772, 33.99137], [-97.834333, 33.857671], [-97.967777, 33.88243], [-97.94595, 33.988396], [-98.082839, 34.002412], [-98.16912, 34.114171], [-98.364023, 34.157109], [-98.486328, 34.062598], [-98.577136, 34.148962], [-98.76557, 34.136376], [-98.909349, 34.177499], [-99.189511, 34.214312], [-99.261321, 34.403499], [-99.397253, 34.377871], [-99.58006, 34.416653], [-99.696462, 34.381036], [-99.887147, 34.549047], [-100.000381, 34.560509], [-100.000392, 35.619115], [-100.000406, 36.499702], [-101.085156, 36.499244], [-102.250453, 36.500369], [-103.002434, 36.500397]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US41",
                        "STATE": "41",
                        "NAME": "Oregon",
                        "LSAD": "",
                        "CENSUSAREA": 95988.013
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-116.915989, 45.995413], [-116.782676, 45.825376], [-116.593004, 45.778541], [-116.463504, 45.615785], [-116.673793, 45.321511], [-116.731216, 45.139934], [-116.847944, 45.022602], [-116.83199, 44.933007], [-116.9347, 44.783881], [-117.044217, 44.74514], [-117.242675, 44.396548], [-117.05651, 44.230874], [-116.895931, 44.154295], [-116.977351, 44.085364], [-116.934485, 44.021249], [-117.026871, 43.832479], [-117.026652, 43.025128], [-117.026222, 42.000252], [-117.625973, 41.998102], [-118.696409, 41.991794], [-119.999168, 41.99454], [-121.035195, 41.993323], [-122.378193, 42.009518], [-123.347562, 41.999108], [-124.211605, 41.99846], [-124.356229, 42.114952], [-124.410982, 42.250547], [-124.435105, 42.440163], [-124.389977, 42.574758], [-124.416774, 42.661594], [-124.514669, 42.736806], [-124.552441, 42.840568], [-124.456918, 43.000315], [-124.38246, 43.270167], [-124.233534, 43.55713], [-124.168392, 43.808903], [-124.122406, 44.104442], [-124.058281, 44.658866], [-124.066746, 44.831191], [-123.975425, 45.145476], [-123.939005, 45.661923], [-123.96763, 45.907807], [-123.933366, 46.071672], [-123.854801, 46.157342], [-123.547659, 46.259109], [-123.430847, 46.181827], [-123.280166, 46.144843], [-123.115904, 46.185268], [-122.904119, 46.083734], [-122.813998, 45.960984], [-122.76381, 45.657138], [-122.675008, 45.618039], [-122.248993, 45.547745], [-122.101675, 45.583516], [-121.811304, 45.706761], [-121.533106, 45.726541], [-121.084933, 45.647893], [-120.855674, 45.671545], [-120.634968, 45.745847], [-120.505863, 45.700048], [-120.210754, 45.725951], [-119.965744, 45.824365], [-119.669877, 45.856867], [-119.623393, 45.905639], [-119.25715, 45.939926], [-119.12612, 45.932859], [-118.987129, 45.999855], [-118.126197, 46.000282], [-116.915989, 45.995413]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US42",
                        "STATE": "42",
                        "NAME": "Pennsylvania",
                        "LSAD": "",
                        "CENSUSAREA": 44742.703
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-80.518991, 40.638801], [-80.518693, 41.248855], [-80.519425, 41.977523], [-80.188085, 42.094257], [-79.761951, 42.26986], [-79.761374, 41.999067], [-78.874759, 41.997559], [-77.83203, 41.998524], [-76.343722, 41.998346], [-75.359579, 41.999445], [-75.263815, 41.870757], [-75.114399, 41.843583], [-75.053431, 41.752538], [-75.044224, 41.617978], [-74.984372, 41.506611], [-74.888691, 41.438259], [-74.758587, 41.423287], [-74.694914, 41.357423], [-74.838366, 41.277286], [-74.882139, 41.180836], [-75.025777, 41.039806], [-75.130575, 40.991093], [-75.053664, 40.87366], [-75.171587, 40.777745], [-75.194046, 40.576256], [-75.068615, 40.542223], [-75.056102, 40.416066], [-74.770406, 40.214508], [-74.816307, 40.12761], [-75.13012, 39.958712], [-75.150721, 39.882713], [-75.330433, 39.849012], [-75.415041, 39.801786], [-75.617251, 39.833999], [-75.788359, 39.721811], [-76.990903, 39.7198], [-77.534758, 39.720134], [-78.537702, 39.72249], [-79.476662, 39.721078], [-80.519342, 39.721403], [-80.518991, 40.638801]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US44",
                        "STATE": "44",
                        "NAME": "Rhode Island",
                        "LSAD": "",
                        "CENSUSAREA": 1033.814
                    },
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [[[[-71.12057, 41.497448], [-71.330831, 41.518364], [-71.19564, 41.67509], [-71.132888, 41.660102], [-71.12057, 41.497448]]], [[[-71.799242, 42.008065], [-71.381401, 42.018798], [-71.3817, 41.893199], [-71.327896, 41.780501], [-71.224798, 41.710498], [-71.350057, 41.727835], [-71.409302, 41.662643], [-71.418404, 41.472652], [-71.483295, 41.371722], [-71.860513, 41.320248], [-71.797683, 41.416709], [-71.786994, 41.655992], [-71.799242, 42.008065]]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US45",
                        "STATE": "45",
                        "NAME": "South Carolina",
                        "LSAD": "",
                        "CENSUSAREA": 30060.696
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-80.885517, 32.0346], [-81.006745, 32.101152], [-81.117234, 32.117605], [-81.155995, 32.241478], [-81.119633, 32.287596], [-81.281324, 32.556464], [-81.411906, 32.61841], [-81.421614, 32.835178], [-81.502716, 32.938688], [-81.491419, 33.008078], [-81.617779, 33.095277], [-81.704634, 33.116451], [-81.827936, 33.228746], [-81.847296, 33.306783], [-81.944737, 33.364041], [-81.913532, 33.441274], [-82.046335, 33.56383], [-82.196583, 33.630582], [-82.255267, 33.75969], [-82.346933, 33.834298], [-82.556835, 33.945353], [-82.596155, 34.030517], [-82.717507, 34.150504], [-82.746656, 34.266407], [-82.902665, 34.485902], [-83.002924, 34.472132], [-83.168278, 34.590998], [-83.33869, 34.682002], [-83.323866, 34.789712], [-83.121112, 34.939129], [-83.108535, 35.000771], [-82.460092, 35.178143], [-82.27492, 35.200071], [-81.043625, 35.149877], [-80.93495, 35.107409], [-80.782042, 34.935782], [-80.797543, 34.819786], [-79.675299, 34.804744], [-79.249763, 34.449774], [-78.541087, 33.851112], [-78.714116, 33.800138], [-78.938076, 33.639826], [-79.084588, 33.483669], [-79.147496, 33.378243], [-79.18787, 33.173712], [-79.329909, 33.089986], [-79.359961, 33.006672], [-79.483499, 33.001265], [-79.576006, 32.906235], [-79.726389, 32.805996], [-79.866742, 32.757422], [-79.884961, 32.684402], [-79.99175, 32.616389], [-80.20523, 32.555547], [-80.332438, 32.478104], [-80.472068, 32.496964], [-80.429291, 32.389667], [-80.466342, 32.31917], [-80.658634, 32.248638], [-80.721463, 32.160427], [-80.844431, 32.109709], [-80.885517, 32.0346]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US46",
                        "STATE": "46",
                        "NAME": "South Dakota",
                        "LSAD": "",
                        "CENSUSAREA": 75811
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-104.057698, 44.997431], [-104.040128, 44.999987], [-104.045443, 45.94531], [-102.920482, 45.945038], [-101.41989, 45.943763], [-100.170826, 45.942514], [-99.257745, 45.94006], [-98.414518, 45.936504], [-97.784575, 45.935327], [-96.56328, 45.935238], [-96.57974, 45.82582], [-96.652226, 45.746809], [-96.857751, 45.605962], [-96.680454, 45.410499], [-96.489065, 45.357071], [-96.453067, 45.298115], [-96.451816, 44.460402], [-96.453049, 43.500415], [-96.598928, 43.500457], [-96.524044, 43.394762], [-96.554937, 43.226775], [-96.485264, 43.224183], [-96.439335, 43.113916], [-96.510995, 43.024701], [-96.52774, 42.890588], [-96.639704, 42.737071], [-96.516338, 42.630435], [-96.443408, 42.489495], [-96.501321, 42.482749], [-96.710995, 42.608128], [-96.687669, 42.653126], [-96.982197, 42.760554], [-97.131331, 42.771929], [-97.306677, 42.867604], [-97.686506, 42.842435], [-97.84527, 42.867734], [-97.950147, 42.769619], [-98.129038, 42.821228], [-98.467356, 42.947556], [-98.49855, 42.99856], [-99.471353, 42.997967], [-100.631728, 42.998092], [-101.625424, 42.996238], [-103.132955, 43.000784], [-104.053127, 43.000585], [-104.055488, 43.853477], [-104.057698, 44.997431]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US47",
                        "STATE": "47",
                        "NAME": "Tennessee",
                        "LSAD": "",
                        "CENSUSAREA": 41234.896
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-81.677535, 36.588117], [-81.695311, 36.467912], [-81.795269, 36.357849], [-81.908137, 36.302013], [-82.033141, 36.120422], [-82.147948, 36.149516], [-82.289455, 36.13571], [-82.409458, 36.083409], [-82.549682, 35.964275], [-82.632265, 36.065705], [-82.785267, 35.987927], [-82.992053, 35.773948], [-83.078732, 35.789472], [-83.240669, 35.72676], [-83.312757, 35.654809], [-83.498335, 35.562981], [-83.771736, 35.562118], [-83.882563, 35.517182], [-84.021507, 35.404183], [-84.02141, 35.301383], [-84.097508, 35.247382], [-84.29024, 35.225572], [-84.321869, 34.988408], [-85.605165, 34.984678], [-86.862147, 34.991956], [-88.202959, 35.008028], [-88.200064, 34.995634], [-89.434954, 34.993754], [-90.309297, 34.995694], [-90.209397, 35.026546], [-90.173603, 35.118073], [-90.066591, 35.13599], [-90.158865, 35.262577], [-90.074992, 35.384152], [-90.129448, 35.441931], [-89.910687, 35.617536], [-89.950278, 35.738493], [-89.814456, 35.759941], [-89.765689, 35.891299], [-89.656147, 35.92581], [-89.733095, 36.000608], [-89.594, 36.12719], [-89.611819, 36.309088], [-89.531822, 36.339246], [-89.5391, 36.498201], [-89.485106, 36.497692], [-89.417293, 36.499033], [-89.117537, 36.503603], [-88.053205, 36.497129], [-88.070532, 36.678118], [-87.853204, 36.633247], [-87.114976, 36.642414], [-86.333051, 36.648778], [-85.832172, 36.622046], [-85.488353, 36.614994], [-85.195372, 36.625498], [-84.543138, 36.596277], [-83.690714, 36.582581], [-83.675413, 36.600814], [-82.888013, 36.593461], [-81.934144, 36.594213], [-81.677535, 36.588117]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US48",
                        "STATE": "48",
                        "NAME": "Texas",
                        "LSAD": "",
                        "CENSUSAREA": 261231.711
                    },
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [[[[-97.240849, 26.411504], [-97.338489, 26.647429], [-97.387459, 26.820789], [-97.390078, 27.156512], [-97.361796, 27.359988], [-97.166176, 27.732372], [-97.056713, 27.842294], [-96.986661, 27.980759], [-96.816443, 28.174808], [-96.703838, 28.198246], [-97.001441, 27.911442], [-97.166682, 27.676583], [-97.326523, 27.347612], [-97.377001, 27.101021], [-97.370731, 26.909706], [-97.333028, 26.736479], [-97.229844, 26.433569], [-97.240849, 26.411504]]], [[[-106.528543, 31.783907], [-106.635926, 31.866235], [-106.618486, 32.000495], [-105.429281, 32.000577], [-104.531756, 32.000117], [-103.722853, 32.000208], [-103.064423, 32.000518], [-103.064625, 32.999899], [-103.043617, 34.003633], [-103.042781, 34.850243], [-103.041554, 35.622487], [-103.041924, 36.500439], [-103.002434, 36.500397], [-102.250453, 36.500369], [-101.085156, 36.499244], [-100.000406, 36.499702], [-100.000392, 35.619115], [-100.000381, 34.560509], [-99.887147, 34.549047], [-99.696462, 34.381036], [-99.58006, 34.416653], [-99.397253, 34.377871], [-99.261321, 34.403499], [-99.189511, 34.214312], [-98.909349, 34.177499], [-98.76557, 34.136376], [-98.577136, 34.148962], [-98.486328, 34.062598], [-98.364023, 34.157109], [-98.16912, 34.114171], [-98.082839, 34.002412], [-97.94595, 33.988396], [-97.967777, 33.88243], [-97.834333, 33.857671], [-97.671772, 33.99137], [-97.462857, 33.841772], [-97.372941, 33.819454], [-97.210921, 33.916064], [-97.166629, 33.847311], [-97.172192, 33.737545], [-96.922114, 33.959579], [-96.866438, 33.853149], [-96.690708, 33.849959], [-96.673449, 33.912278], [-96.422643, 33.776041], [-96.342665, 33.686975], [-96.277269, 33.769735], [-96.169452, 33.770131], [-96.14807, 33.837799], [-95.941267, 33.861619], [-95.828245, 33.836054], [-95.563424, 33.932193], [-95.533283, 33.881162], [-95.294789, 33.875388], [-95.230491, 33.960764], [-95.131056, 33.936925], [-94.830804, 33.740068], [-94.775064, 33.755038], [-94.485875, 33.637867], [-94.399144, 33.555498], [-94.162266, 33.588906], [-94.04345, 33.552253], [-94.042964, 33.019219], [-94.04272, 31.999265], [-93.909557, 31.893144], [-93.822598, 31.773559], [-93.818582, 31.554826], [-93.725925, 31.504092], [-93.620343, 31.271025], [-93.600308, 31.176158], [-93.516943, 31.023662], [-93.567788, 30.888302], [-93.554057, 30.824941], [-93.621093, 30.695159], [-93.727844, 30.57407], [-93.697828, 30.443838], [-93.758554, 30.387077], [-93.714319, 30.294282], [-93.697748, 30.152944], [-93.720805, 30.053043], [-93.85514, 29.864099], [-93.922744, 29.818808], [-93.837971, 29.690619], [-94.001406, 29.681486], [-94.132577, 29.646217], [-94.594853, 29.467903], [-94.546385, 29.572048], [-94.740699, 29.525858], [-94.695317, 29.723052], [-94.816085, 29.75671], [-94.872551, 29.67125], [-95.005398, 29.659366], [-94.981916, 29.511141], [-94.909465, 29.496838], [-94.893994, 29.30817], [-95.099101, 29.173529], [-95.026219, 29.148064], [-95.353451, 28.898145], [-95.812504, 28.664942], [-95.98616, 28.606319], [-96.033488, 28.652629], [-96.198374, 28.58698], [-96.303718, 28.644996], [-96.473694, 28.57324], [-96.403973, 28.44245], [-96.672677, 28.335579], [-96.794815, 28.364587], [-96.800413, 28.224128], [-96.934765, 28.123873], [-97.037008, 28.185528], [-97.214039, 28.087494], [-97.04876, 28.022092], [-97.187183, 27.824126], [-97.250797, 27.876035], [-97.379042, 27.837867], [-97.368355, 27.741683], [-97.253955, 27.696696], [-97.321535, 27.571199], [-97.404996, 27.329977], [-97.514411, 27.361529], [-97.609068, 27.285193], [-97.54291, 27.229213], [-97.422299, 27.257712], [-97.478533, 26.999186], [-97.555378, 26.99028], [-97.563266, 26.842188], [-97.471663, 26.758727], [-97.411612, 26.447275], [-97.330441, 26.350582], [-97.343927, 26.267376], [-97.270898, 26.086459], [-97.199651, 26.077044], [-97.146294, 25.955606], [-97.367642, 25.91568], [-97.372864, 25.840117], [-97.521762, 25.886458], [-97.649176, 26.021499], [-97.88653, 26.066339], [-98.039239, 26.041275], [-98.248806, 26.073101], [-98.465077, 26.222335], [-98.585184, 26.254429], [-98.669397, 26.23632], [-98.824571, 26.370715], [-99.110855, 26.426278], [-99.166742, 26.536079], [-99.208907, 26.724761], [-99.268613, 26.843213], [-99.446524, 27.023008], [-99.426348, 27.176262], [-99.504837, 27.338289], [-99.480219, 27.485796], [-99.511119, 27.564494], [-99.603533, 27.641992], [-99.704601, 27.654954], [-99.813086, 27.773952], [-99.877677, 27.799427], [-99.893456, 27.899208], [-99.991447, 27.99456], [-100.083393, 28.144035], [-100.208059, 28.190383], [-100.294296, 28.284381], [-100.336186, 28.430181], [-100.500354, 28.66196], [-100.507613, 28.740599], [-100.651512, 28.943432], [-100.674656, 29.099777], [-100.775905, 29.173344], [-100.797671, 29.246943], [-101.010614, 29.368669], [-101.060151, 29.458661], [-101.261175, 29.536777], [-101.397009, 29.733963], [-101.475269, 29.780663], [-101.714224, 29.76766], [-101.974548, 29.810276], [-102.115682, 29.79239], [-102.181894, 29.846034], [-102.341033, 29.869305], [-102.386678, 29.76688], [-102.490331, 29.783948], [-102.677192, 29.738261], [-102.693466, 29.676507], [-102.808692, 29.522319], [-102.843021, 29.357988], [-102.953475, 29.176308], [-103.100266, 29.0577], [-103.115328, 28.98527], [-103.28119, 28.982138], [-103.427754, 29.042334], [-103.558679, 29.154962], [-103.724743, 29.19147], [-103.838303, 29.278304], [-104.038282, 29.320156], [-104.18007, 29.412764], [-104.264155, 29.514001], [-104.338113, 29.519967], [-104.507568, 29.639624], [-104.565688, 29.770462], [-104.679772, 29.924659], [-104.706874, 30.050685], [-104.687296, 30.179464], [-104.761634, 30.301148], [-104.859521, 30.390413], [-104.899001, 30.5704], [-104.9863, 30.661059], [-105.195144, 30.792138], [-105.39669, 30.855427], [-105.55743, 30.990229], [-105.60333, 31.082625], [-105.773257, 31.166897], [-105.953943, 31.364749], [-106.205827, 31.465976], [-106.381039, 31.73211], [-106.528543, 31.783907]]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US49",
                        "STATE": "49",
                        "NAME": "Utah",
                        "LSAD": "",
                        "CENSUSAREA": 82169.62
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-109.050076, 41.000659], [-109.050615, 39.87497], [-109.051512, 39.126095], [-109.060062, 38.275489], [-109.041762, 38.16469], [-109.045223, 36.999084], [-109.625668, 36.998308], [-110.47019, 36.997997], [-110.50069, 37.00426], [-111.412784, 37.001478], [-112.35769, 37.001025], [-112.966471, 37.000219], [-114.0506, 37.000396], [-114.049677, 37.823645], [-114.050485, 38.499955], [-114.047079, 39.499943], [-114.046555, 39.996899], [-114.041396, 41.219958], [-114.041723, 41.99372], [-113.249159, 41.996203], [-112.173352, 41.996568], [-111.046689, 42.001567], [-111.046723, 40.997959], [-110.500718, 40.994746], [-109.050076, 41.000659]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US50",
                        "STATE": "50",
                        "NAME": "Vermont",
                        "LSAD": "",
                        "CENSUSAREA": 9216.657
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-72.458519, 42.726853], [-73.264957, 42.74594], [-73.278673, 42.83341], [-73.246821, 43.52578], [-73.302076, 43.624364], [-73.42791, 43.634428], [-73.350593, 43.771939], [-73.43774, 44.045006], [-73.390805, 44.189072], [-73.311025, 44.27424], [-73.333575, 44.372288], [-73.299885, 44.476652], [-73.38982, 44.61721], [-73.335443, 44.804602], [-73.381359, 44.845021], [-73.343124, 45.01084], [-72.845633, 45.016659], [-72.310073, 45.003822], [-71.502487, 45.013367], [-71.49392, 44.910923], [-71.62518, 44.743978], [-71.551722, 44.627598], [-71.59948, 44.486455], [-71.812473, 44.358477], [-72.033136, 44.320365], [-72.067774, 44.270976], [-72.033739, 44.07883], [-72.116985, 43.99448], [-72.184847, 43.804698], [-72.302867, 43.702718], [-72.373126, 43.579419], [-72.45689, 43.146558], [-72.444635, 43.010566], [-72.534554, 42.949894], [-72.542784, 42.808482], [-72.458519, 42.726853]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US51",
                        "STATE": "51",
                        "NAME": "Virginia",
                        "LSAD": "",
                        "CENSUSAREA": 39490.086
                    },
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [[[[-75.242266, 38.027209], [-75.349338, 37.873143], [-75.452681, 37.86351], [-75.514921, 37.799149], [-75.610808, 37.605909], [-75.594044, 37.569698], [-75.765401, 37.305596], [-75.800755, 37.197297], [-75.906734, 37.114193], [-75.97043, 37.118608], [-76.025753, 37.257407], [-75.909586, 37.622671], [-75.803041, 37.762464], [-75.689837, 37.861817], [-75.669711, 37.950796], [-75.624341, 37.994211], [-75.242266, 38.027209]]], [[[-77.1302, 38.635017], [-77.247003, 38.590618], [-77.32544, 38.44885], [-77.240072, 38.331598], [-77.011827, 38.374554], [-77.030683, 38.311623], [-76.962311, 38.214075], [-76.838795, 38.163476], [-76.613939, 38.148587], [-76.516547, 38.026566], [-76.236725, 37.889174], [-76.307482, 37.81235], [-76.302545, 37.689], [-76.36232, 37.610368], [-76.300144, 37.561734], [-76.245283, 37.386839], [-76.387112, 37.385061], [-76.399659, 37.160272], [-76.271262, 37.084544], [-76.428869, 36.969947], [-76.464471, 37.027547], [-76.618252, 37.119347], [-76.649869, 37.220914], [-76.757765, 37.191658], [-76.487559, 36.952372], [-76.327365, 36.959447], [-76.095508, 36.908817], [-75.996252, 36.922047], [-75.867044, 36.550754], [-76.807078, 36.550606], [-76.916048, 36.543815], [-77.749706, 36.54552], [-78.509965, 36.541065], [-79.510647, 36.540738], [-80.295243, 36.543973], [-80.837641, 36.559118], [-81.677535, 36.588117], [-81.934144, 36.594213], [-82.888013, 36.593461], [-83.675413, 36.600814], [-83.531912, 36.664984], [-83.423707, 36.667385], [-83.194597, 36.739487], [-83.07259, 36.854589], [-82.879492, 36.889085], [-82.822684, 37.004128], [-82.722254, 37.057948], [-82.722097, 37.120168], [-82.498858, 37.227044], [-82.350948, 37.267077], [-81.968297, 37.537798], [-81.928497, 37.360645], [-81.761752, 37.275713], [-81.67821, 37.201483], [-81.560625, 37.206663], [-81.362156, 37.337687], [-81.225104, 37.234874], [-81.112596, 37.278497], [-80.947896, 37.295872], [-80.784188, 37.394587], [-80.705203, 37.394618], [-80.552036, 37.473563], [-80.475601, 37.422949], [-80.299789, 37.508271], [-80.258919, 37.595499], [-80.296138, 37.691783], [-80.162202, 37.875122], [-80.002507, 37.992767], [-79.898426, 38.193045], [-79.787542, 38.273298], [-79.689675, 38.431439], [-79.649075, 38.591515], [-79.53687, 38.550917], [-79.476638, 38.457228], [-79.312276, 38.411876], [-79.210591, 38.492913], [-79.129757, 38.655017], [-78.993997, 38.850102], [-78.869276, 38.762991], [-78.788031, 38.885123], [-78.601655, 38.964603], [-78.571901, 39.031995], [-78.403697, 39.167451], [-78.419422, 39.257476], [-78.34048, 39.353492], [-78.347087, 39.466012], [-77.828157, 39.132329], [-77.719029, 39.321125], [-77.566596, 39.306121], [-77.45768, 39.22502], [-77.527282, 39.146236], [-77.462617, 39.076248], [-77.340287, 39.062991], [-77.1199, 38.934311], [-77.031698, 38.850512], [-77.038598, 38.791513], [-77.042298, 38.718515], [-77.1302, 38.635017]]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US53",
                        "STATE": "53",
                        "NAME": "Washington",
                        "LSAD": "",
                        "CENSUSAREA": 66455.521
                    },
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [[[[-122.519535, 48.288314], [-122.618466, 48.294159], [-122.558205, 48.119579], [-122.376259, 48.034457], [-122.431035, 47.914732], [-122.607342, 48.030992], [-122.609568, 48.15186], [-122.769939, 48.227548], [-122.673731, 48.354683], [-122.519535, 48.288314]]], [[[-122.474684, 47.511068], [-122.401767, 47.381325], [-122.528128, 47.345542], [-122.474684, 47.511068]]], [[[-122.800217, 48.60169], [-122.771206, 48.562426], [-122.874135, 48.418196], [-123.039156, 48.460003], [-123.163234, 48.529544], [-123.178425, 48.622115], [-123.048652, 48.621002], [-122.918252, 48.713505], [-122.743049, 48.661991], [-122.800217, 48.60169]]], [[[-117.032351, 48.999188], [-117.035178, 48.370878], [-117.04247, 47.839009], [-117.039821, 47.127265], [-117.039813, 46.425425], [-117.055983, 46.345531], [-116.923958, 46.17092], [-116.959548, 46.099058], [-116.915989, 45.995413], [-118.126197, 46.000282], [-118.987129, 45.999855], [-119.12612, 45.932859], [-119.25715, 45.939926], [-119.623393, 45.905639], [-119.669877, 45.856867], [-119.965744, 45.824365], [-120.210754, 45.725951], [-120.505863, 45.700048], [-120.634968, 45.745847], [-120.855674, 45.671545], [-121.084933, 45.647893], [-121.533106, 45.726541], [-121.811304, 45.706761], [-122.101675, 45.583516], [-122.248993, 45.547745], [-122.675008, 45.618039], [-122.76381, 45.657138], [-122.813998, 45.960984], [-122.904119, 46.083734], [-123.115904, 46.185268], [-123.280166, 46.144843], [-123.430847, 46.181827], [-123.547659, 46.259109], [-123.724273, 46.301161], [-123.909306, 46.245491], [-124.064624, 46.326899], [-124.026032, 46.462978], [-123.894254, 46.537028], [-124.022413, 46.708973], [-124.096515, 46.746202], [-124.089286, 46.867716], [-123.991612, 46.980215], [-124.176745, 47.092999], [-124.236349, 47.287287], [-124.319379, 47.355559], [-124.355955, 47.545698], [-124.430546, 47.746249], [-124.625512, 47.887963], [-124.672427, 47.964414], [-124.704153, 48.184422], [-124.65894, 48.331057], [-124.597331, 48.381882], [-124.380874, 48.284699], [-124.238582, 48.262471], [-123.981032, 48.164761], [-123.702743, 48.166783], [-123.590839, 48.134949], [-123.248615, 48.115745], [-123.1644, 48.165894], [-122.877641, 48.047025], [-122.770559, 48.053432], [-122.63636, 47.866186], [-122.513986, 47.880807], [-122.488491, 47.743605], [-122.518277, 47.65132], [-122.494882, 47.510265], [-122.573739, 47.318419], [-122.4442, 47.266723], [-122.325734, 47.391521], [-122.429841, 47.658919], [-122.392044, 47.807718], [-122.231761, 48.029876], [-122.365078, 48.125822], [-122.408718, 48.326413], [-122.581607, 48.429244], [-122.425271, 48.599522], [-122.500308, 48.656163], [-122.535803, 48.776128], [-122.647443, 48.773998], [-122.785659, 48.885066], [-122.75802, 49.002357], [-121.751252, 48.997399], [-120.001199, 48.999418], [-118.836898, 49.000308], [-118.196824, 49.000407], [-117.032351, 48.999188]]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US54",
                        "STATE": "54",
                        "NAME": "West Virginia",
                        "LSAD": "",
                        "CENSUSAREA": 24038.21
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-79.476662, 39.721078], [-79.486873, 39.205961], [-79.253891, 39.337222], [-79.095428, 39.462548], [-78.953333, 39.463645], [-78.795857, 39.606934], [-78.689455, 39.54577], [-78.462899, 39.52084], [-78.420549, 39.624021], [-78.266833, 39.618818], [-78.171361, 39.695612], [-78.011343, 39.604083], [-77.878451, 39.563493], [-77.75309, 39.423262], [-77.719029, 39.321125], [-77.828157, 39.132329], [-78.347087, 39.466012], [-78.34048, 39.353492], [-78.419422, 39.257476], [-78.403697, 39.167451], [-78.571901, 39.031995], [-78.601655, 38.964603], [-78.788031, 38.885123], [-78.869276, 38.762991], [-78.993997, 38.850102], [-79.129757, 38.655017], [-79.210591, 38.492913], [-79.312276, 38.411876], [-79.476638, 38.457228], [-79.53687, 38.550917], [-79.649075, 38.591515], [-79.689675, 38.431439], [-79.787542, 38.273298], [-79.898426, 38.193045], [-80.002507, 37.992767], [-80.162202, 37.875122], [-80.296138, 37.691783], [-80.258919, 37.595499], [-80.299789, 37.508271], [-80.475601, 37.422949], [-80.552036, 37.473563], [-80.705203, 37.394618], [-80.784188, 37.394587], [-80.947896, 37.295872], [-81.112596, 37.278497], [-81.225104, 37.234874], [-81.362156, 37.337687], [-81.560625, 37.206663], [-81.67821, 37.201483], [-81.761752, 37.275713], [-81.928497, 37.360645], [-81.968297, 37.537798], [-82.121985, 37.552763], [-82.296118, 37.686174], [-82.421484, 37.885652], [-82.501862, 37.9332], [-82.551259, 38.070799], [-82.637306, 38.13905], [-82.574656, 38.263873], [-82.593673, 38.421809], [-82.529579, 38.405182], [-82.323999, 38.449268], [-82.291271, 38.578983], [-82.188767, 38.594984], [-82.217269, 38.79568], [-82.035963, 39.025478], [-81.844486, 38.928746], [-81.78182, 38.964935], [-81.756254, 39.177276], [-81.678331, 39.273755], [-81.456143, 39.409274], [-81.347567, 39.34577], [-81.223581, 39.386062], [-81.0239, 39.552313], [-80.88036, 39.620706], [-80.865339, 39.753251], [-80.740126, 39.970793], [-80.704602, 40.154823], [-80.599895, 40.317669], [-80.599194, 40.482566], [-80.666917, 40.573664], [-80.518991, 40.638801], [-80.519342, 39.721403], [-79.476662, 39.721078]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US55",
                        "STATE": "55",
                        "NAME": "Wisconsin",
                        "LSAD": "",
                        "CENSUSAREA": 54157.805
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-87.800477, 42.49192], [-88.786681, 42.491983], [-90.07367, 42.508275], [-90.640927, 42.508302], [-90.720209, 42.640758], [-90.952415, 42.686778], [-91.051275, 42.737001], [-91.146177, 42.90985], [-91.177932, 43.128875], [-91.05791, 43.253968], [-91.201847, 43.349103], [-91.217706, 43.50055], [-91.268748, 43.615348], [-91.244135, 43.774667], [-91.440536, 44.001501], [-91.582604, 44.027381], [-91.875158, 44.200575], [-91.92559, 44.333548], [-92.053549, 44.401375], [-92.215163, 44.438503], [-92.347567, 44.557149], [-92.518358, 44.575183], [-92.807988, 44.75147], [-92.750645, 44.937299], [-92.791528, 45.079647], [-92.744938, 45.108309], [-92.75871, 45.290965], [-92.646602, 45.441635], [-92.770223, 45.566939], [-92.883749, 45.575483], [-92.869193, 45.717568], [-92.784621, 45.764196], [-92.707702, 45.894901], [-92.362141, 46.013103], [-92.294033, 46.074377], [-92.292192, 46.666042], [-92.212392, 46.649941], [-92.08949, 46.74924], [-92.01529, 46.706469], [-91.820027, 46.690176], [-91.511077, 46.757453], [-91.226796, 46.86361], [-91.096565, 46.86153], [-90.837716, 46.957438], [-90.754552, 46.89827], [-90.885021, 46.756341], [-90.905572, 46.583524], [-90.755287, 46.646289], [-90.418136, 46.566094], [-90.216594, 46.501759], [-90.120489, 46.336852], [-89.09163, 46.138505], [-88.776187, 46.015931], [-88.416914, 45.975323], [-88.102908, 45.921869], [-88.094047, 45.785658], [-87.879812, 45.754843], [-87.781623, 45.67328], [-87.812976, 45.464159], [-87.871485, 45.371546], [-87.648126, 45.339396], [-87.741805, 45.197051], [-87.590208, 45.095264], [-87.630298, 44.976865], [-87.819525, 44.951109], [-87.827751, 44.891229], [-87.983494, 44.720196], [-88.005518, 44.539216], [-87.765774, 44.642023], [-87.610063, 44.838384], [-87.406199, 44.90449], [-87.264877, 45.081361], [-87.23822, 45.167262], [-87.032521, 45.222274], [-87.048213, 45.089124], [-87.189407, 44.968632], [-87.204545, 44.875593], [-87.304824, 44.804603], [-87.483696, 44.511354], [-87.545382, 44.321385], [-87.51966, 44.17987], [-87.646583, 44.104694], [-87.736178, 43.880421], [-87.706204, 43.679542], [-87.790135, 43.563054], [-87.911787, 43.250406], [-87.866484, 43.074412], [-87.887683, 43.000514], [-87.823278, 42.835318], [-87.766675, 42.784896], [-87.814674, 42.64402], [-87.800477, 42.49192]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US56",
                        "STATE": "56",
                        "NAME": "Wyoming",
                        "LSAD": "",
                        "CENSUSAREA": 97093.141
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-111.046689, 42.001567], [-111.043564, 42.722624], [-111.045205, 43.501136], [-111.048974, 44.474072], [-111.055199, 45.001321], [-110.705272, 44.992324], [-110.199503, 44.996188], [-109.103445, 45.005904], [-108.271201, 45.000251], [-107.13418, 45.000109], [-106.263586, 44.993788], [-105.076607, 45.000347], [-104.057698, 44.997431], [-104.055488, 43.853477], [-104.053127, 43.000585], [-104.053026, 41.885464], [-104.053249, 41.001406], [-104.855273, 40.998048], [-106.217573, 40.997734], [-107.625624, 41.002124], [-108.250649, 41.000114], [-109.050076, 41.000659], [-110.500718, 40.994746], [-111.046723, 40.997959], [-111.046689, 42.001567]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "GEO_ID": "0400000US72",
                        "STATE": "72",
                        "NAME": "Puerto Rico",
                        "LSAD": "",
                        "CENSUSAREA": 3423.775
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-66.438813, 18.485713], [-65.904988, 18.450926], [-65.668845, 18.361939], [-65.615981, 18.227389], [-65.766919, 18.148424], [-65.832429, 18.014916], [-66.017308, 17.979583], [-66.155387, 17.929406], [-66.31695, 17.976683], [-66.385059, 17.939004], [-66.461342, 17.990273], [-66.583233, 17.961229], [-66.770307, 18.005955], [-66.930313, 17.943389], [-67.062478, 17.973819], [-67.21433, 17.962436], [-67.158001, 18.216719], [-67.267484, 18.353149], [-67.159608, 18.415915], [-67.14283, 18.505485], [-66.957733, 18.489129], [-66.438813, 18.485713]]]
                    }
                }]
        }
    }

})();


(function () {

    angular.module('UsaJobsApp').service('usStatesGeoJsonSetup', usStatesGeoJsonSetup);
    angular.module('UsaJobsApp').constant('stateSelectStyles', stateSelectStyles());

    usStatesGeoJsonSetup.$inject = ['leaflet', 'eventService', 'usStatesGeoJson', 'stateSelectStyles'];
    function usStatesGeoJsonSetup(leaflet, events, usStates, stateSelectStyles) {
        return function (mapRef) {
            // closure reference for iterators and callbacks
            var map = mapRef,
                statesGeoJson = this.states = leaflet.geoJson(usStates, {
                    style: stateSelectStyles.default,
                    onEachFeature: featureConfig
                });
            statesGeoJson.addTo(map);
            statesGeoJson.bringToBack();

            statesGeoJson.selectedState = '';

            // Remove state features where there are no job results
            events.jobs.onAvailable(function (e, data) {
                var states = [];
                angular.forEach(data.states, function (state) {
                    states.push(state.name);
                });
                removeOtherStates(states);
            });

            // Clear state selection when filter is cleared
            events.filters.onClear(function () {
                statesGeoJson.selectedState = '';
                stateSelectStyles.onClearFn(statesGeoJson._layers);
            });

            // focus on state when selected from dropdown list
            events.filters.onStateSelectionFromDropdown(function (e, state) {
                if (state === null) {
                    statesGeoJson.selectedState = '';
                    stateSelectStyles.onClearFn(statesGeoJson._layers);
                    map.resetMapView();
                } else {
                    statesGeoJson.selectedState = state.name;
                    stateSelectStyles.clickFn(statesGeoJson._layers,
                        statesGeoJson.selectedState);
                    angular.forEach(statesGeoJson._layers, function (layer) {
                        if (layer.name === statesGeoJson.selectedState) {
                            map.fitBounds(layer.getBounds());
                        }
                    });
                }
            });

            // remove state features after zooming out past level 3
            // intended to reduce visual clutter and difficult-to-select features
            map.on('zoomend', function (e) {
                if (e.target.getZoom() < 3) {
                    map.removeLayer(statesGeoJson);
                } else if (!map.hasLayer(statesGeoJson)) {
                    statesGeoJson.addTo(map);
                }
            });

            /**
             * Set initial State feature settings and style, set interaction
             * events.
             * @param feature
             * @param layer
             */
            function featureConfig(feature, layer) {
                // scope reference for iterator Fns
                var self = layer;
                // attach state name to feature layer
                layer.name = feature.properties.NAME;

                layer.feature = feature;

                // set default style
                layer.setStyle(stateSelectStyles.default);

                // set layer click event
                layer.on('click', function (evt) {
                    // trigger `State` filter change
                    events.filters.setStateFilter(evt.target.name);
                    // set selected state
                    statesGeoJson.selectedState = evt.target.name;
                    // run `Click` styling function
                    stateSelectStyles.clickFn(statesGeoJson._layers,
                        statesGeoJson.selectedState);
                    // move state into view
                    map.fitBounds(self.getBounds());

                });

                // set layer hover event
                layer.on('mouseover', function (evt) {
                    stateSelectStyles.mouseOverFn(evt.target, statesGeoJson.selectedState);
                });
                layer.on('mouseout', function (evt) {
                    stateSelectStyles.mouseOutFn(evt.target, statesGeoJson.selectedState);
                });
            }

            /**
             * @public
             * Remove any state whose name is NOT in the provided array.
             * Intended to remove states with no job results.
             * @param stateNameArr
             */
            function removeOtherStates(stateNameArr) {
                angular.forEach(statesGeoJson._layers, function (layer) {
                    if (stateNameArr.indexOf(layer.name) === -1) {
                        statesGeoJson.removeLayer(layer);
                    }
                });


            }
        }
    }

    /**
     * Return feature style info and behavior to Constant service
     * @returns {{default: {color: string, weight: number, opacity: number, fillOpacity: number, fillColor: string}, selected: {color: string, weight: number, opacity: number, fillColor: string, fillOpacity: number}, hover: {color: string, weight: number, opacity: number, fillOpacity: number, fillColor: string}, clickFn: clickFn, mouseOverFn: mouseOverFn, mouseOutFn: mouseOutFn, onClearFn: onClearFn}}
     */
    function stateSelectStyles() {
        return {
            default: {
                color: "#C4721F",
                weight: 0.25,
                opacity: 0.25,
                fillOpacity: 0.1,
                fillColor: '#C4721F'
            },
            selected: {
                color: "#267FCA",
                weight: 4,
                opacity: 1,
                fillColor: "#267FCA",
                fillOpacity: 0.07
            },
            hover: {
                color: "#C4721F",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.1,
                fillColor: '#C4721F'
            },
            clickFn: function (layers, selectedName) {
                var self = this;
                angular.forEach(layers, function (layer) {
                    if (layer.name !== selectedName) {
                        layer.setStyle(self.default)
                    } else if (layer.name === selectedName) {
                        layer.setStyle(self.selected)
                    }
                });
            },
            mouseOverFn: function (layer, selectedName) {
                if (layer.name !== selectedName) layer.setStyle(this.hover);
            },
            mouseOutFn: function (layer, selectedName) {
                if (layer.name !== selectedName) layer.setStyle(this.default);
            },
            onClearFn: function (layers) {
                var self = this;
                angular.forEach(layers, function (layer) {
                    layer.setStyle(self.default)
                });
            }
        }
    }

})();


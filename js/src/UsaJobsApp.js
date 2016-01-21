(function () {
    /**
     * @module UsaJobsApp Main App Module
     * - Main app controller
     * - Org Code Directive to bind controller
     * - Centralized event emission and subscription service
     */
    angular.module('UsaJobsApp', [ 'MomentModule', 'LeafletModule', 'ui-rangeSlider']);

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

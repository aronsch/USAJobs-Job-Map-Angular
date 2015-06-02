/**
 * @module UsaJobsApp App Module - Main UsaJobsMap app module containing app
 *         controller and centralized event service.
 */
(function () {
	
	angular.module('UsaJobsApp', [ 'UsaJobsApp.Data', 'UsaJobsApp.Filters', 'UsaJobsApp.Map', 'UsaJobsApp.JobTable',
			'UsaJobsApp.Location', 'UsaJobsApp.Utilities', 'MomentModule', 'LeafletModule', 'PolyfillModule',
			'ui-rangeSlider' ]);
	
	/*
	 * Module Services Declarations
	 */
	angular.module('UsaJobsApp').controller('UsaJobsAppController', AppController);
	angular.module('UsaJobsApp').directive('orgCode', orgCodeDirective);
	angular.module('UsaJobsApp').service('eventService', eventService);
	
	/*
	 * Module Services Definition
	 */

	/**
	 * UsaJobsApp App Controller
	 */
	AppController.$inject = [ '$scope', 'Jobs', 'eventService', 'settings' ];
	function AppController ($scope, Jobs, events, settings) {
		
		$scope.jobs = Jobs;
		$scope.jobs.orgCode = $scope.orgCode;
		$scope.jobs.orgName = $scope.orgName;
		$scope.orgSearchUrl = settings.usaJobs.searchBaseUrl + $scope.orgId;
		$scope.jobs.orgSearchUrl = $scope.orgSearchUrl;
		
		$scope.jobs.getJobs();
		
		// Watch for filter update, then update job visibility
		events.filters.onChanged(onFilterChange);
		function onFilterChange (e, predicate) {
			angular.forEach($scope.jobs.JobData, function (job) {
				// default to empty predicate if none provided
				job.setVisibleWithPredicate(predicate);
			});
			// broadcast notification that UI update is needed
			events.jobs.updateVisible();
		}
		// Watch for filter clear, then set all jobs visible;
		events.filters.onCleared(onFilterCleared);
		function onFilterCleared () {
			angular.forEach($scope.jobs.JobData, function (job) {
				job.visible = true;
			});
			// broadcast notification that UI update is needed
			events.jobs.updateVisible();
		}
	}
	
	/**
	 * OrgId Directive detects the 'org-id' attribute and attaches the app
	 * controller.
	 * 
	 * @return { Object }
	 */
	function orgCodeDirective () {
		return {
			restrict : 'A',
			scope : {
				orgCode : '@',
				orgName : '@',
			
			},
			controller : 'UsaJobsAppController',
		};
	}
	
	/**
	 * Application-wide event broadcast and registration service
	 */
	eventService.$inject = [ '$rootScope' ];
	function eventService ($rootScope) {
		var names = this.names = {}, jobs = this.jobs = {}, geodata = this.geodata = {}, filters = this.filters = {};
		
		// Event Names
		names.jobs = {
			available : 'usajobs.events.jobs-available',
			updateVisible : 'usajobs.events.job-visibility-updated-needed',
			queryStarted : 'usajobs.events.job-query-started'
		};
		names.geodata = {
			available : 'usajobs.events.geodata-available',
			notAvailable : 'usajobs.events.geodata-not-available'
		};
		names.filters = {
			changed : 'usajobs.events.filter-values-changed',
			cleared : 'usajobs.events.filter-values-cleared'
		};
		names.focus = {
			job : 'usajobs.events.focus-set-job',
			location : 'usajobs.events.focus-set-location'
		};
		
		// Job Data events
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
		
		// Geodata events
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
		
		// Job Data Filter events
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
		
		// Shared broadcast and registration functions
		function broadcast (eventName, obj) {
			$rootScope.$broadcast(eventName, obj);
		}
		
		function on (eventName, handlerFn) {
			$rootScope.$on(eventName, handlerFn);
		}
	}
})();

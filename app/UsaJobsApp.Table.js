/**
 * @module UsaJobsMap Job Table Module - Directive and controller for displaying
 *         job listings in a table.
 */
(function () {
	/**
	 * Module Registration
	 */
	angular.module('UsaJobsApp.JobTable', [ 'UsaJobsApp.Data' ]);
	
	/**
	 * Declarations
	 */
	angular.module('UsaJobsApp.JobTable').controller('jobTableCtrl', jobTableController);
	angular.module('UsaJobsApp.JobTable').directive('jobTable', jobTableDirective);
	
	/**
	 * Functions
	 */
	
	jobTableController.$inject = [ '$scope', '$filter', 'Jobs' ];
	function jobTableController ($scope, $filter, Jobs) {
		$scope.jobs = Jobs;
		$scope.filterStatus = $scope.jobs.JobData.filterStatus;
		$scope.predicate = 'daysRemaining';
		$scope.reverse = false;
		$scope.setPredicate = setPredicate;
		$scope.setSalaryPredicate = setSalaryPredicate;
		
		/*
		 * Manages transition between different sorting predicates by reverting
		 * to default sort direction when the predicate changes.
		 */
		function setPredicate (newP) {
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
		function setSalaryPredicate () {
			if ($scope.predicate === 'SalaryMin') {
				$scope.predicate = 'SalaryMax';
				$scope.reverse = false;
			} else if ($scope.predicate === 'SalaryMax') {
				$scope.predicate = 'SalaryMin';
				$scope.reverse = false;
			} else {
				$scope.predicate = 'SalaryMax';
				$scope.reverse = false;
			}
			
		}
	}
	
	function jobTableDirective () {
		var tmplt = '', alphaIcons = {
			up : 'fa-sort-alpha-asc',
			down : 'fa-sort-alpha-desc'
		};
		amntIcons = {
			up : 'fa-sort-amount-asc',
			down : 'fa-sort-amount-desc'
		};
		defIcons = {
			up : 'fa-sort-asc',
			down : 'fa-sort-desc'
		};
		tmplt += '<div class="usajobs-jobs-table">';
		// Column Titles/Sorting
		tmplt += '<div class="clearfix">';
		// Title
		tmplt += '<dl class="col-xs6 col-sm-1 col-md-1 col-lg-1 small"><dt><a title="Click to sort by Job Title" href="" ng-click="setPredicate(\'JobTitle\')">Title'
				+ sortCaret('JobTitle', alphaIcons) + '</a></dt></dl>';
		// Locations
		tmplt += '<dl class="col-xs-6 col-sm-1 col-md-1 col-lg-1 small"><dt><a title="Click to sort by Location" href="" ng-click="setPredicate(\'Locations\')">Loc'
				+ sortCaret('Locations', alphaIcons) + '</a></dt></dl>';
		// Salary
		tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt><a title="Click to sort by Salary" href="" ng-click="setSalaryPredicate()">Salary'
				+ sortSalaryCaret('salaryPredicate') + '</a></dt></dl>';
		// Grade
		tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt><a title="Click to sort by Pay Grade" href="" ng-click="setPredicate(\'Grade\')">Grade'
				+ sortCaret('Grade', amntIcons) + '</a></dt></dl>';
		// Job Close Date
		tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt><a title="Click to sort by Announcement Closing Date" href="" ng-click="setPredicate(\'daysRemaining\')">Closes'
				+ sortCaret('daysRemaining', defIcons) + '</a></dt></dl>';
		// Job Open Date
		tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt><a title="Click to sort by Announcement Opening Date" href="" ng-click="setPredicate(\'daysOpen\')">Opened'
				+ sortCaret('daysOpen', defIcons) + '</a></dt></dl>';
		// Job Announcement Number
		tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt><a title="Click to sort by Job Announcement Number" href="" ng-click="setPredicate(\'AnnouncementNumber\')"><abbr title="Vacancy Announcment Number">Vac #</abbr>'
				+ sortCaret('AnnouncementNumber', alphaIcons) + '</a></dt></dl>';
		
		tmplt += '</div>';
		// Job Listings
		tmplt += '<ul class="usajobs-jobs-table-list list-unstyled">';
		tmplt += '<li class="usajobs-jobs-table-list-item container-fluid" ng-repeat="job in jobs.JobData | orderBy:predicate:reverse" ng-show="job.visible">';
		tmplt += '<h5 class="usajobs-jobs-table-list-item-title"><a ng-href="{{job.ApplyOnlineURL}}" target="_blank" title="Click to open this job announcement on USAJobs.gov">{{ job.title }}</a></h5>';
		tmplt += '<div class="row usajobs-table-item-job-details">';
		tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt>Location</dt><dd ng-repeat="loc in job.locationArray() track by $index">{{ loc }}</dd></dl>';
		tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt>Salary</dt><dd>{{ job.salaryRange }}<span ng-show="job.hourly()">/hour</span></dd></dl>';
		tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt>Grade</dt><dd>{{ job.gradeRangeDesc() }}</dd></dl>';
		tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt>Closes</dt><dd title="{{ job.EndDate }}">{{ job.endDateDescription }}</dd></dl>';
		tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt>Opened</dt><dd>{{ job.StartDate }}</dd></dl>';
		tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt><abbr title="Vacancy Announcment Number">Vac</abbr></dt><dd>{{ job.AnnouncementNumber }}</dd></dl>';
		tmplt += '<div class="col-xs-12 small"><span class="btn btn-default btn-xs" ng-click="job.toggleDescription()">{{ job.showDescription ? "Hide" : "Show" }} Job Summary</span></div>';
		tmplt += '<dl class="col-xs-12 small" ng-show="job.showDescription"><dt class="sr-only">Job Summary</dt><dd>{{ job.JobSummary }}</dd></dl>';
		tmplt += '</div>';
		tmplt += '</li></ul>';
		tmplt += '</div></div>';
		
		// Build dynamic sort direction caret element for column titles
		function sortCaret (predicate, icons) {
			return '<i class="fa fa-fw" ng-class="{\'' + icons.down + '\': (reverse && predicate===\'' + predicate
					+ '\'), \'' + icons.up + '\': (!reverse && predicate===\'' + predicate + '\')}"></i>';
		}
		
		// Specialized caret builder for Salary sorting
		function sortSalaryCaret (predicate) {
			return '<i class="fa fa-fw" ng-class="{\'' + amntIcons.down + '\': predicate===\'SalaryMax\', \''
					+ amntIcons.up + '\': predicate===\'SalaryMin\'}"></i>';
		}
		
		return {
			restrict : 'E',
			controller : 'jobTableCtrl',
			scope : {},
			template : tmplt
		};
	}
})();

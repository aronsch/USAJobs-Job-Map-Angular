/**
 * @module UsaJobsApp Data module
 * - Provides Service to retrieve jobs from USAJobs.gov.
 * - Provides Factory for creating `Job` objects, which extend the job results from USAJobs.gov
 * - Provides Directive and Controller for filtering job results
 * - Provides Directive and Controller for element displaying the number of jobs meeting filter criteria
 * - Provides Directive and Controller for element displaying total job results count and organization.
 * 
 */

(function () {
	/*
	 * Module Registration
	 */
	angular.module('UsaJobsApp.Data', [ 'UsaJobsApp.Settings', 'UsaJobsApp.Filters', 'UsaJobsApp.Utilities',
			'MomentModule', 'LeafletModule']);
	
	/* Service Declarations */
	angular.module('UsaJobsApp.Data').service('Jobs', Jobs);
	angular.module('UsaJobsApp.Data').factory('Job', JobFactory);
	angular.module('UsaJobsApp.Data').directive('jobFilter', jobFilterDirective);
	angular.module('UsaJobsApp.Data').directive('vacancyCountDesc', vacancyCountDescDirective);
	angular.module('UsaJobsApp.Data').directive('jobInfo', jobInfoDirective);
	angular.module('UsaJobsApp.Data').controller('JobDataFilter', JobDataFilterController);
	angular.module('UsaJobsApp.Data').controller('vacancyCountDescController', vacancyCountDescController);
	angular.module('UsaJobsApp.Data').controller('jobInfoController', jobInfoController);
	
	/* Service Functions */
	
	/**
	 * USA Jobs Data Service
	 */
	Jobs.$inject = [ '$http', 'settings', 'unique', 'Job', 'eventService' ];
	function Jobs ($http, settings, unique, Job, Events) {
		
		var self = this; // closure reference to `this` for callbacks
		
		/*
		 * Public Properties
		 */
		this.JobData = [];
		this.resolved = false;
		this.orgCode = '';
		this.orgName = '';
		this.orgSearchUrl = '';
		
		/*
		 * Public Functions
		 */
		this.getJobs = getJobs;
		this.query = query;
		
		// Job data summary functions
		this.getMaxGrade = getMaxGrade;
		this.getMinGrade = getMinGrade;
		this.getMaxSalary = getMaxSalary;
		this.getMinSalary = getMinSalary;
		this.getPayPlans = getPayPlans;
		this.getSeriesList = getSeriesList
		
		/**
		 * @public Retrieve jobs from USA Jobs based on current `org` settings.
		 */
		function getJobs () {
			// dispatch USAJobs query
			this.query({
				NumberOfJobs : 250,
				OrganizationID : this.orgCode
			});
		}
		
		/**
		 * @public Query USA Jobs with provided request parameters
		 * @param { * } params
		 */
		function query (params) {
			this.resolved = false; // reset query status
			this.JobData.length = 0; // remove current results
			Events.jobs.queryStarted(); // emit query started event
			$http.get(settings.usaJobs.baseUrl, {
				params : params
			}).success(queryResolved);
		}

		/**
		 * @private Process job query response
		 * @param data
		 */
		function queryResolved (data) {
			addJobResults(data);
			self.resolved = true; // set query status to resolved
			Events.jobs.available(); // emit jobs available event
		}

		/**
		 * @private Take job query results and add to `JobData` collection as `Job` objects.
		 * @param data
		 */
		function addJobResults (data) {
			angular.forEach(data.JobData, function (item, idx) {
				self.JobData.push(new Job(item));
			}, this);
			groupByLocation(self.JobData);
		}

		/**
		 * Set up `locations` property and group jobs by location
		 * @param jobs
		 */
		function groupByLocation (jobs) {
			var placeNames = [];
			jobs.locations = {};
			angular.forEach(jobs, function (job) {
				// append any place names from the job
				Array.prototype.push.apply(placeNames, job.locationArray());
			});
			// remove duplicates
			placeNames = unique(placeNames);
			
			// create location keys and objects
			angular.forEach(placeNames, function (placeName) {
				jobs.locations[placeName] = {
					name : placeName,
					jobs : []
				};
			});
			
			angular.forEach(jobs, function (job) {
				angular.forEach(jobs.locations, function (location, key) {
					// check if location name is contained in string list of
					// job locations
					if (job.Locations.indexOf(key) > -1) {
						location.jobs.push(job);
					}
				});
			});
		}
		
		/*
		 * Utility Functions
		 */

		/**
		 * @public Returns the maximum pay grade listed in the jobs results.
		 * @return {Number}
		 */
		function getMaxGrade () {
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
		 * @public Returns the minimum pay grade listed in the jobs results.
		 * @return {Number}
		 */
		function getMinGrade () {
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
		 * @public Returns the maximum salary listed in the jobs results.
		 * @return {Number}
		 */
		function getMaxSalary () {
			var salaries = [];
			
			if (this.JobData.length === 0) return 0;
			
			angular.forEach(this.JobData, function (job) {
				salaries.push(job.salaryHighest());
			}, this);
			return Math.max.apply(this, salaries);
		}
		
		/**
		 * @public Returns the minimum salary listed in the jobs results.
		 * @return {Number}
		 */
		function getMinSalary () {
			var salaries = [];
			
			if (this.JobData.length === 0) return 0;
			
			angular.forEach(this.JobData, function (job) {
				salaries.push(job.salaryLowest());
			}, this);
			
			return Math.min.apply(this, salaries);
		}
		
		/**
		 * @public Returns a list of all Pay Plans listed in the job results.
		 * @return {Number}
		 */
		function getPayPlans () {
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
		 * @public Returns an array of all Job Sereies listed in the job results.
		 * @return {Array}
		 */
		function getSeriesList () {
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
	JobFactory.$inject = [ '$filter', 'moment', 'settings'];
	function JobFactory ($filter, moment, settings) {
		/** @constructor */
		function Job (jobData) {
			var now = moment(),
			dateFm = settings.usaJobs.dateFormat;
			
			angular.extend(this, jobData); // attach USAJobs job properties
			
			/* Set static properties */
			this.daysRemaining = moment(this.EndDate, dateFm).diff(now, 'days');
			this.daysOpen = moment(now).diff(moment(this.StartDate, dateFm), 'days');
			this.endDateDescription = $filter('datedescription')(this.EndDate);
			this.salaryRange = $filter('trailingzeroes')(this.SalaryMin + " to " + this.SalaryMax);
			this.title = this.JobTitle;
			this.showDescription = false;
			this.toggleDescription = function () {
				this.showDescription = !this.showDescription;
			};
			// Concatenate all values as strings for search term matching.
			this.concatenatedValues = '';
			angular.forEach(jobData, function (v) {
				this.concatenatedValues += v + ' | ';
			}, this);
		}
		Job.prototype.visible = true; 
		
		/*
		 * Prototype Function Bindings
		 */
		Job.prototype.setVisibleWithPredicate = setVisibleWithPredicate;
		Job.prototype.locationArray = locationArray;
		Job.prototype.hourly = hourly;
		Job.prototype.salaried = salaried;
		Job.prototype.gradeRangeDesc = gradeRangeDesc;
		Job.prototype.gradeLowest = gradeLowest;
		Job.prototype.gradeHighest = gradeHighest;
		Job.prototype.salaryLowest = salaryLowest;
		Job.prototype.salaryHighest = salaryHighest;
		
		/*
		 * Prototype Function Definitions
		 */
		
		/**
		 * @public Set visibility property evaluating provided
		 * predicate function.
		 * @param {Function}
		 */
		function setVisibleWithPredicate (predicateFn) {
			// set visibility based on predicate function result
			if (angular.isDefined(predicateFn)) {
				this.visible = predicateFn(this);
			} else {
				// otherwise, default to visible
				this.visible = true;
			}
		}
		
		/**
		 * @public Split locations string in array
		 * @returns {Array}
		 */
		function locationArray () {
			// Split text list of locations into array
			return this.Locations.split(/;/g);
		}
		
		/**
		 * @public Determine if the job is hourly
		 * @returns {Boolean}
		 */
		function hourly () {
			return this.SalaryBasis === "Per Hour";
		}
		
		/**
		 * @public Determine if the job is salaried
		 * @returns {Boolean}
		 */
		function salaried () {
			return this.SalaryBasis === "Per Year";
		}
		
		/**
		 * @public Render a text description of the job's pay grade range
		 * @returns {String}
		 */
		function gradeRangeDesc () {
			var low = this.gradeLowest(),
			high = this.gradeHighest();
			// return single grade if high grade is the same - "GS 7"
			// return range description if high grade is different - "GS 7 to 9"
			return this.PayPlan + " " + low + (low !== high ? " to " + high : "");
		}
		
		/**
		 * @public Return the lowest pay grade listed for the job
		 * @returns {String}
		 */
		function gradeLowest () {
			var str = this.Grade.split("/")[0];
			return numVal(str) ? numVal(str) : str;
		}
		
		/**
		 * @public Return the highest pay grade listed for the job, if listed.
		 * 	   Otherwise default lowest pay grade.
		 * @returns {String}
		 */
		function gradeHighest () {
			// if grade listing contains only one grade, return that grade
			var str = this.Grade.split("/")[1];
			var highGrade = str ? numVal(str) : this.gradeLowest()
			return highGrade;
		}
		
		/**
		 * @public Return the lowest salary listed for the job
		 * @returns {Number}
		 */
		function salaryLowest () {
			
			return parseSalary(this.SalaryMin);
		}
		
		/**
		 * @public Return the lowest salary listed for the job
		 * @returns {Number}
		 */
		function salaryHighest() {
			return parseSalary(this.SalaryMax);
		}
		

		function parseSalary(str) {
			// remove currency symbol and letters, then parse to number
			return parseInt(str.replace(/[$,a-z]/gi, ""));
		}
		
		function numVal (str) {
			var parsed = parseInt(str);
			if (isFinite(parsed)) {
				return parsed
			} else {
				return false;
			}
		}
		
		return Job;
	}
	
	/*
	 * Job Data Filter Directive
	 * Directive that provides a filter form for filtering USA Jobs search results.
	 */
	function jobFilterDirective () {
		var tmplt = '';
		// Text filter
		tmplt += '<div class="form row job-filter">';
		tmplt += '<vacancy-count-desc></vacancy-count-desc>';
		tmplt += '<div class="form-group col-xs-8 col-sm-9"><label for="filters.stringFilter.value" class="sr-only">Filter Vacancies</label>';
		tmplt += '<input ng-disabled="!jobs.resolved" type="text" class="form-control" ng-model="filters.stringFilter.value" ng-change="filter()" placeholder="filter vacancies by typing here"><button type="button" class="btn btn-xs btn-danger pull-right" style="position: absolute; right: 22px; top: 6px;" ng-show="filters.filterStatus.active" ng-click="reset()"><i class="fa fa-fw fa-close"></i>Clear Filters</button></div>';
		tmplt += '<p class="col-xs-4 col-sm-3 text-right"><a class="btn btn-default usajobs-filters-advanced-btn" ng-disabled="!jobs.resolved"  ng-click="toggleAdvancedFilters()">{{ showAdvancedFilters ? "Hide" : "Show"}} Advanced Filters</a></p>';
		// Advanced filters
		// Grade filter slider
		tmplt += '<div ng-show="showAdvancedFilters">';
		tmplt += '<div class="form-group col-xs-6 col-sm-6"><label for="grade-slider">Grade Filter</label>';
		tmplt += '<div range-slider show-values="true" filter="grade" id="grade-slider" min="filters.gradeFilter.lowest" max="filters.gradeFilter.highest" model-min="filters.gradeFilter.min" model-max="filters.gradeFilter.max"></div></div>';
		// Job salary slider
		tmplt += '<div class="form-group col-xs-6 col-sm-6"><label for="salary-slider">Salary Filter</label>';
		tmplt += '<div range-slider show-values="true" filter="currency" id="salary-slider" min="filters.salaryFilter.lowest" max="filters.salaryFilter.highest" step="10000" model-min="filters.salaryFilter.min" model-max="filters.salaryFilter.max"></div>';
		tmplt += '</div>';
		// Pay plan radio buttons
		tmplt += '<div class="form-group col-xs-12 col-sm-6"><label for="pay-plan-filter">Pay Basis &nbsp;</label>';
		tmplt += '<div id="pay-plan-filter" class="">';
		tmplt += '<label for="allpb-radio"><input name="allpb-radio" type="radio" ng-change="filter()" ng-model="filters.payFilter.selection" ng-value="filters.payFilter.all" ng-disabled="!jobs.resolved"> Any&nbsp;</label>';
		tmplt += '<label for="salaried-radio"><input name="salaried-radio" type="radio" ng-change="filter()" ng-model="filters.payFilter.selection" ng-value="filters.payFilter.salaried" ng-disabled="!jobs.resolved"> Salaried&nbsp;</label>';
		tmplt += '<label for="hourly-radio"><input name="hourly-radio" type="radio" ng-change="filter()" ng-model="filters.payFilter.selection" ng-value="filters.payFilter.hourly" ng-disabled="!jobs.resolved"> Hourly&nbsp;</label>';
		tmplt += '</div></div>';
		tmplt += '</div>';
		tmplt += '</div>';
		
		return {
			restrict : 'E',
			scope : {},
			controller : 'JobDataFilter',
			template : tmplt
		};
	}
	
	/*
	 * Job Data Filter Controller
	 *
	 * Controller for USA Jobs search result data filtering. On filter change, it emits an
	 * event with a predicate function for `Job` objects attached.
	 *
	 */
	JobDataFilterController.$inject = [ '$scope', '$filter', 'eventService', 'Jobs' ];
	function JobDataFilterController ($scope, $filter, events, Jobs) {
		
		$scope.jobs = Jobs;
		$scope.showAdvancedFilters = false;
		$scope.filters = {};
		$scope.filters.filterStatus = $scope.jobs.JobData.filterStatus = {
			active : false
		};
		
		/*
		 * Filter Objects
		 */
		
		// String Filter
		$scope.filters.stringFilter = {
			value : '',
			predicate : function (job) {
				// return true if string is found in concatenated values
				return job.concatenatedValues.indexOf(this.value) > -1;
			},
			reset : function () {
				this.value = '';
			},
			isActive : function () {
				return this.value.length > 0;
			}
		};
		
		// Grade Filter
		$scope.filters.gradeFilter = {
			min : 0,
			max : 15,
			lowest : 0,
			highest : 15,
			predicate : function (job) {
				return (job.gradeHighest() <= this.max || job.gradeLowest() <= this.max)
						&& (job.gradeLowest() >= this.min || job.gradeHighest() >= this.min);
			},
			reset : function () {
				this.min = this.lowest;
				this.max = this.highest;
			},
			isActive : function () {
				return !angular.equals(this.min, this.lowest) || !angular.equals(this.max, this.highest);
			}
		};
		
		// Salary Filter
		$scope.filters.salaryFilter = {
			min : 0,
			max : 100000,
			lowest : 0,
			highest : 100000,
			predicate : function (job) {
				return (job.salaryHighest() <= this.max) && (job.salaryLowest() >= this.min);
			},
			reset : function () {
				this.min = this.lowest;
				this.max = this.highest;
			},
			isActive : function () {
				return this.min !== this.lowest || this.max !== this.highest;
			}
		};
		
		// Pay Type Filter
		$scope.filters.payFilter = {
			hourly : "hourly",
			salaried : "salaried",
			all : "all",
			selection : "all",
			predicate : function (job) {
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
			reset : function () {
				this.selection = this.all;
			},
			isActive : function () {
				return !angular.equals(this.selection, this.all);
			}
		};
		
		/*
		 * Public Function Bindings
		 */
		$scope.update = update;
		$scope.reset = reset;
		$scope.predicate = predicate;
		$scope.filter = filter;
		$scope.toggleAdvancedFilters = toggleAdvancedFilters;
		$scope.filters.setFiltersActive = setFiltersActive;
		
		/*
		 * Event Handling
		 */
		
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
		
		/*
		 * Functions
		 */
		
		/**
		 * @public Update filter ranges based on current job results.
		 * 
		 * This is needed to update the max and min ranges in the filtering UI after
		 * a set of job data has been returned from USA jobs.
		 */
		function update () {
			// don't attempt to update filter settings if there is no job
			// data
			if ($scope.jobs.JobData.length === 0) return;
			
			var maxGrade = $scope.jobs.getMaxGrade(), minGrade = $scope.jobs.getMinGrade(), maxSalary = $scope.jobs
					.getMaxSalary(), minSalary = $scope.jobs.getMinSalary();
			
			$scope.filters.salaryFilter.highest = maxSalary;
			$scope.filters.salaryFilter.max = maxSalary;
			$scope.filters.salaryFilter.lowest = minSalary;
			$scope.filters.salaryFilter.min = minSalary;
			
			$scope.filters.gradeFilter.lowest = minGrade;
			$scope.filters.gradeFilter.highest = maxGrade;
		}
		
		/**
		 * @public Reset all filter objects states and notify app that filters have been reset.
		 */
		function reset () {
			// reset all filters
			$scope.filters.gradeFilter.reset();
			$scope.filters.salaryFilter.reset();
			$scope.filters.payFilter.reset();
			$scope.filters.stringFilter.reset();
			events.filters.cleared(); // emit filter cleared event
			$scope.filter(); // explicitly trigger filter event
		}
		
		/**
		 * @public Returns a predicate function for use in determining if a `Job` meets the current filter criteria.
		 * @param { Job } job `Job` object for comparison
		 * @returns { Boolean } Boolean indicating whether the `Job` met the predicate criteria.
		 *
		 */
		function predicate (job) {
			return $scope.filters.gradeFilter.predicate(job) && $scope.filters.salaryFilter.predicate(job)
					&& $scope.filters.payFilter.predicate(job) && $scope.filters.stringFilter.predicate(job);
		}
		
		/**
		 * @public Triggers filter event. Updates the current filter status, emits an event containing the current
		 * job predicate function and updates the count of jobs currently meeting predicate criteria.
		 *
		 */
		function filter () {
			$scope.filters.setFiltersActive();
			// broadcast notification with predicate function
			events.filters.changed(predicate);
			// $scope.updateVisibleFn(predicate);
			$scope.jobs.JobData.visibleCount = countVisible();
		}
		
		/**
		 * @public Toggle visibility boolean for advanced filtering UI.
		 */
		function toggleAdvancedFilters () {
			$scope.showAdvancedFilters = !$scope.showAdvancedFilters;
		}
		
		/**
		 * @private If any filters are active, set overall filter status to active.
		 */
		function setFiltersActive () {
			// test all filters to see if they are active;
			this.filterStatus.active = this.gradeFilter.isActive() || this.salaryFilter.isActive()
					|| this.payFilter.isActive() || this.stringFilter.isActive();
			
			// if filters are zer
			if (this.filterStatus.active) {
				events.filters.cleared();
			}
		}
		
		/**
		 * @private Count the number of jobs that currently meet the filter criteria.
		 */
		function countVisible () {
			var c = 0;
			angular.forEach($scope.jobs.JobData, function (job) {
				if (job.visible) c++;
			});
			return c;
		}
		
		/**
		 * @private Handler function for filter $watches
		 */
		function handleFilterChange () {
			$scope.filter();
		}
		
		/**
		 * @private Handler function for new job data event
		 */
		function handleJobsChange () {
			$scope.update();
			$scope.reset();
			$scope.filter();
		}	
	}
	
	/**
	 * Directive displaying the number of jobs that meet current filter criteria.
	 */
	function vacancyCountDescDirective () {
		var tmplt = '';
		tmplt += '<p class=\"usajobs-vac-count text-center\" ng-class=\"{\'bg-clear\': filterStatus.active, \'text-primary\': filterStatus.active, \'bg-danger\': jobs.JobData.visibleCount === 0 && filterStatus.active, \'text-danger\': jobs.JobData.visibleCount === 0 && filterStatus.active}\">';
		tmplt += '<span ng-show=\"filterStatus.active\"><strong>{{ jobs.JobData.visibleCount }}</strong> vacanc{{ jobs.JobData.visibleCount == 1 ? \"y\" : \"ies\"}} match{{ jobs.JobData.visibleCount == 1 ? \"es\" : \"\"}} your filter criteria</strong></span>';
		tmplt += '<span ng-hide=\"filterStatus.active\">&nbsp;</span>';
		tmplt += '</p>';
		
		return {
			restrict : 'E',
			scope : {},
			controller : 'vacancyCountDescController',
			template : tmplt
		};
	}
	
	/**
	 * Controller for directive displaying the number of jobs that meet current filter criteria.
	 */
	vacancyCountDescController.$inject = [ '$scope', 'Jobs' ];
	function vacancyCountDescController ($scope, Jobs) {
		$scope.jobs = Jobs;
		$scope.filterStatus = $scope.jobs.JobData.filterStatus;
		$scope.visibleCount = $scope.jobs.JobData.visibleCount;
	}
	
	/**
	 * Directive displaying the total number of job results as well the name of the organization whose jobs
	 * are being displayed.
	 */
	function jobInfoDirective () {
		var tmplt = '';
		tmplt += '<p>';
		tmplt += '<span ng-hide="jobs.resolved">';
		tmplt += '<i class="fa fa-spinner fa-pulse"></i> ';
		tmplt += 'Getting <strong>{{jobs.orgName}}</strong> job openings from ';
		tmplt += '</span>';
		tmplt += '<span ng-show="jobs.resolved">';
		tmplt += '<strong>{{ jobs.JobData.length }} {{ jobs.orgName }}</strong> job openings are currently listed on ';
		tmplt += '</span>';
		tmplt += ' <a ng-href="{{jobs.orgSearchUrl}}" target="_blank">USAJobs.gov</a></p>';
		
		return {
			restrict : 'E',
			scope : {},
			controller : 'jobInfoController',
			template : tmplt
		};
	}
	
	/**
	 * Controller for jobInfoDirective.
	 */
	jobInfoController.$inject = [ '$scope', 'Jobs' ];
	function jobInfoController ($scope, Jobs) {
		$scope.jobs = Jobs;
	}
})();

/**
 * @module UsaJobsApp Data module - Retrieves jobs from DOI Learn, includes
 *         directive for result filtering UI.
 */
(function () {
	/*
	 * Module Registration
	 */
	angular.module('UsaJobsApp.Data', [ 'UsaJobsApp.Settings', 'UsaJobsApp.Filters', 'UsaJobsApp.Utilities',
			'MomentModule', 'LeafletModule', 'PolyfillModule' ]);
	
	/*
	 * Service Declarations
	 */
	angular.module('UsaJobsApp.Data').service('Jobs', Jobs);
	angular.module('UsaJobsApp.Data').factory('Job', JobFactory);
	angular.module('UsaJobsApp.Data').directive('jobFilter', jobFilterDirective);
	angular.module('UsaJobsApp.Data').directive('vacancyCountDesc', vacancyCountDescDirective);
	angular.module('UsaJobsApp.Data').directive('jobInfo', jobInfoDirective);
	angular.module('UsaJobsApp.Data').controller('JobDataFilter', JobDataFilterController);
	angular.module('UsaJobsApp.Data').controller('vacancyCountDescController', vacancyCountDescController);
	angular.module('UsaJobsApp.Data').controller('jobInfoController', jobInfoController);
	
	/*
	 * Functions
	 */

	Jobs.$inject = [ '$http', 'settings', 'unique', 'Job', 'eventService' ];
	function Jobs ($http, settings, unique, Job, Events) {
		
		var self = this; // closure reference to `this` for callback
		// functions
		
		/*
		 * Public Properties
		 */
		this.JobData = [];
		this.resolved = false;
		this.orgId = '';
		this.orgName = '';
		this.orgSearchUrl = '';
		
		/*
		 * Public Functions
		 */
		this.getJobs = getJobs;
		this.query = query;
		// Utility functions for getting data summaries
		this.getMaxGrade = getMaxGrade;
		this.getMinGrade = getMinGrade;
		this.getMaxSalary = getMaxSalary;
		this.getMinSalary = getMinSalary;
		this.getPayPlans = getPayPlans;
		
		/**
		 * @public Retrieve jobs from USA Jobs based on current `org` settings.
		 */
		function getJobs () {
			// dispatch USAJobs query
			this.query({
				NumberOfJobs : 250,
				OrganizationID : this.orgId
			});
        }
        /**
		 * @public Query USA Jobs with provided request parameters
		 * @param params
		 *            {Object}
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
         *
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
		 * Public Utility Functions
		 */

		/**
		 * @public Returns the maximum GS Grade listed in the jobs results.
		 * @return {Number}
		 */
		function getMaxGrade () {
			var grades = [];
			
			// protect against returning divide-by-zero/infinty
			if (jobs.length === 0) return 0;
			
			angular.forEach(jobs, function (job) {
				grades.push(job.gradeHighest());
			}, this);
			// return max,
			// provide grades array as arguments to max function
			return Math.max.apply(this, grades);
		}
		
		/**
		 * @public Returns the minimum GS Grade listed in the jobs results.
		 * @return {Number}
		 */
		function getMinGrade () {
			var grades = [];
			
			// protect against returning divide-by-zero/infinty
			if (jobs.length === 0) return 0;
			
			angular.forEach(jobs, function (job) {
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
			
			if (jobs.length === 0) return 0;
			
			angular.forEach(jobs, function (job) {
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
			
			if (jobs.length === 0) return 0;
			
			angular.forEach(jobs, function (job) {
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
			
			return arrayUtil.uniq(payPlans);
		}
		
	}
	
	JobFactory.$inject = [ '$filter', 'moment' ];
	function JobFactory ($filter) {
		// Vacancy object definition
		function Job (jobData) {
			var now = moment();
			// attach jobData properties to job object
			angular.extend(this, jobData);

            // FIXME: Provide date formats - Moment will require this in future versions.
			this.daysRemaining = moment(this.EndDate).diff(now, 'days');
			this.daysOpen = moment(now).diff(this.StartDate, 'days');
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
		Job.prototype.setVisibleWithPredicate = function (predicateFn) {
			// set visibility based on predicate function result
			if (angular.isDefined(predicateFn)) {
				this.visible = predicateFn(this);
			} else {
				// otherwise, default to visible
				this.visible = true;
			}
		};
		Job.prototype.locationArray = function () {
			// Split text list of locations into array
			return this.Locations.split(/;/g);
		};
		Job.prototype.hourly = function () {
			return this.SalaryBasis === "Per Hour";
		};
		Job.prototype.salaried = function () {
			return this.SalaryBasis === "Per Year";
		};
		Job.prototype.gradeRangeDesc = function () {
			var range = this.Grade.split("/");
			return this.PayPlan + " " + range[0] + (range[0] !== range[1] ? " to " + range[1] : "");
		};
		Job.prototype.gradeLowest = function () {
			return parseInt(this.Grade.split("/")[0]);
		};
		Job.prototype.gradeHighest = function () {
			// if grade listing contains only one grade, return that grade
			var highGrade = this.Grade.split("/")[1] ? parseInt(this.Grade.split("/")[1]) : parseInt(this.Grade
					.split("/")[0]);
			return highGrade;
		};
		Job.prototype.salaryLowest = function () {
			return parseInt(this.SalaryMin.replace(/[$,a-z]/gi, ""));
		};
		Job.prototype.salaryHighest = function () {
			return parseInt(this.SalaryMax.replace(/[$,a-z]/gi, ""));
		};
		
		return Job;
	}
	
	function jobFilterDirective () {
		var tmplt = '<div class="form row job-filter">';
		tmplt += '<vacancy-count-desc jobs="jobs"></vacancy-count-desc>';
		tmplt += '<div class="form-group col-xs-12 col-sm-9"><label for="filters.stringFilter.value" class="sr-only">Filter Vacancies</label>';
		tmplt += '<input type="text" class="form-control" ng-model="filters.stringFilter.value" ng-change="filter()" placeholder="filter vacancies by typing here"><button type="button" class="btn btn-xs btn-danger pull-right" style="position: absolute; right: 22px; top: 6px;" ng-show="filters.filterStatus.active" ng-click="reset()"><i class="fa fa-fw fa-close"></i>Clear Filters</button></div>';
		tmplt += '<p class="col-xs-12 col-sm-3 text-right"><a class="btn btn-xs btn-default" ng-click="toggleAdvancedFilters()">{{ showAdvancedFilters ? "Hide" : "Show"}} Advanced Filters</a></p>';
		tmplt += '<div ng-show="showAdvancedFilters">';
		tmplt += '<div class="form-group col-xs-12 col-sm-6"><label for="grade-slider">Grade Filter</label>';
		tmplt += '<div range-slider show-values="true" filter="grade" id="grade-slider" min="filters.gradeFilter.lowest" max="filters.gradeFilter.highest" model-min="filters.gradeFilter.min" model-max="filters.gradeFilter.max"></div></div>';
		tmplt += '<div class="form-group col-xs-12 col-sm-6"><label for="salary-slider">Salary Filter</label>';
		tmplt += '<div range-slider show-values="true" filter="currency" id="salary-slider" min="filters.salaryFilter.lowest" max="filters.salaryFilter.highest" step="10000" model-min="filters.salaryFilter.min" model-max="filters.salaryFilter.max"></div>';
		tmplt += '</div><div class="form-group  col-xs-12 col-sm-6"><div id="pay-plan-filter" class="">';
		tmplt += '<label for="pay-plan-filter">Pay Basis &nbsp;</label>';
		tmplt += '<label for="allpb-radio"><input name="allpb-radio" type="radio" ng-change="filter()" ng-model="filters.payFilter.selection" ng-value="filters.payFilter.all"> Any&nbsp;</label>';
		tmplt += '<label for="salaried-radio"><input name="salaried-radio" type="radio" ng-change="filter()" ng-model="filters.payFilter.selection" ng-value="filters.payFilter.salaried"> Salaried&nbsp;</label>';
		tmplt += '<label for="hourly-radio"><input name="hourly-radio" type="radio" ng-change="filter()" ng-model="filters.payFilter.selection" ng-value="filters.payFilter.hourly"> Hourly&nbsp;</label>';
		tmplt += '</div></div></div>';
		tmplt += '</div>';
		
		return {
			restrict : 'E',
			scope : {},
			controller : 'JobDataFilter',
			template : tmplt
		};
	}
	
	JobDataFilterController.$inject = [ '$scope', '$filter', 'eventService', 'Jobs' ];
	function JobDataFilterController ($scope, $filter, events, Jobs) {
		
		$scope.jobs = Jobs;
		$scope.showAdvancedFilters = false;
		$scope.filters = {};
		$scope.filters.filterStatus = $scope.jobs.JobData.filterStatus = {
			active : false
		};
		$scope.filters.setFiltersActive = setFiltersActive;
		
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
		
		$scope.update = update;
		$scope.reset = reset;
		$scope.predicate = predicate;
		$scope.filter = filter;
		$scope.toggleAdvancedFilters = toggleAdvancedFilters;
		
		// deep watch for changes in filter object
		$scope.$watch('filters.salaryFilter.min', handleFilterChange);
		$scope.$watch('filters.salaryFilter.max', handleFilterChange);
		$scope.$watch('filters.gradeFilter.min', handleFilterChange);
		$scope.$watch('filters.gradeFilter.max', handleFilterChange);
		
		function setFiltersActive () {
			// test all filters to see if they are active;
			this.filterStatus.active = this.gradeFilter.isActive() || this.salaryFilter.isActive()
					|| this.payFilter.isActive() || this.stringFilter.isActive();
			
			// if filters are zer
			if (this.filterStatus.active) {
				events.filters.cleared();
			}
		}
		
		function update () {
			// don't attempt to update filter settings if there is no job
			// data
			if ($scope.jobs.JobData.length === 0) return;
			
			var jobData = $scope.jobs.JobData, maxGrade = jobData.getMaxGrade(), minGrade = jobData.getMinGrade(), maxSalary = jobData
					.getMaxSalary(), minSalary = jobData.getMinSalary();
			
			$scope.filters.salaryFilter.highest = maxSalary;
			$scope.filters.salaryFilter.max = maxSalary;
			$scope.filters.salaryFilter.lowest = minSalary;
			$scope.filters.salaryFilter.min = minSalary;
			
			$scope.filters.gradeFilter.lowest = minGrade;
			$scope.filters.gradeFilter.highest = maxGrade;
			// $scope.filter();
		}
		
		function reset () {
			$scope.filters.gradeFilter.reset();
			$scope.filters.salaryFilter.reset();
			$scope.filters.payFilter.reset();
			$scope.filters.stringFilter.reset();
			events.filters.cleared();
			$scope.filter();
		}
		
		function predicate (job) {
			return $scope.filters.gradeFilter.predicate(job) && $scope.filters.salaryFilter.predicate(job)
					&& $scope.filters.payFilter.predicate(job) && $scope.filters.stringFilter.predicate(job);
		}
		
		function filter () {
			$scope.filters.setFiltersActive();
			// broadcast notification with predicate function
			events.filters.changed(predicate);
			// $scope.updateVisibleFn(predicate);
			$scope.jobs.JobData.visibleCount = countVisible();
		}
		
		function toggleAdvancedFilters () {
			$scope.showAdvancedFilters = !$scope.showAdvancedFilters;
		}
		
		function countVisible () {
			var c = 0;
			angular.forEach($scope.jobs.JobData, function (job) {
				if (job.visible) c++;
			});
			return c;
		}
		
		function handleFilterChange () {
			$scope.filter();
		}
		
		function handleJobsChange () {
			$scope.filter();
		}
		
		update();
		
	}
	
	jobInfoController.$inject = [ '$scope', 'Jobs' ];
	function jobInfoController ($scope, Jobs) {
		$scope.jobs = Jobs;
	}
	
	function vacancyCountDescDirective () {
		var tmplt = '<p class=\"usajobs-vac-count text-center\" ng-class=\"{\'bg-clear\': filterStatus.active, \'text-primary\': filterStatus.active, \'bg-danger\': jobs.JobData.visibleCount === 0 && filterStatus.active, \'text-danger\': jobs.JobData.visibleCount === 0 && filterStatus.active}\">';
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
	
	function jobInfoDirective () {
		var tmplt = '';
		tmplt += '<p>';
		tmplt += '<span ng-hide="jobs.resolved">';
		tmplt += '<i class="fa fa-spinner fa-pulse"></i> ';
		tmplt += 'Getting job openings from ';
		tmplt += '</span>';
		tmplt += '<span ng-show="jobs.resolved">';
		tmplt += '<strong>{{ jobs.JobData.length }}</strong> {{ jobs.orgName }} job openings are currently listed on ';
		tmplt += '</span>';
		tmplt += ' <a ng-href="{{jobs.orgSearchUrl}}" target="_blank">USAJobs.gov</a></p>';
		
		return {
			restrict : 'E',
			scope : {},
			controller : 'jobInfoController',
			template : tmplt
		};
	}
	
	vacancyCountDescController.$inject = [ '$scope', 'Jobs' ];
	function vacancyCountDescController ($scope, Jobs) {
		$scope.jobs = Jobs;
		$scope.filterStatus = $scope.jobs.JobData.filterStatus;
		$scope.visibleCount = $scope.jobs.JobData.visibleCount;
	}
	
})();

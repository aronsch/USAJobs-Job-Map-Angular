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

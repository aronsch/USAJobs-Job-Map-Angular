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

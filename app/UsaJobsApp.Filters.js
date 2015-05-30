/**
 * @module UsaJobsMap Custom Filters Module
 */
(function () {
	angular.module('UsaJobsApp.Filters', [ 'MomentModule' ]);
	angular.module('UsaJobsApp.Filters').filter('grade', usaJobsGradeFilter);
	angular.module('UsaJobsApp.Filters').filter('trailingzeroes', trailingZeroesFilter);
	angular.module('UsaJobsApp.Filters').filter('datedescription', dateDescriptionFilter);
	
	function usaJobsGradeFilter () {
		return function (input) {
			var output = input.toString();
			if (output.length < 2) {
				output = '0' + output;
			}
			return output;
		};
	}
	
	function trailingZeroesFilter () {
		return function (input) {
			return input.replace(/\.0+/g, "");
		};
	}
	
	dateDescriptionFilter.$inject = [ 'moment' ];
	function dateDescriptionFilter (moment) {
		return function (input) {
			var d, today, desc;
			d = moment(input);
			today = moment().diff(d, 'days') === 0;
			if (today) {
				return 'today';
			} else {
				return d.fromNow();
			}
		};
	}
	
})();

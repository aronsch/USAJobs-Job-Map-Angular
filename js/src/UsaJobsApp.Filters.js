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

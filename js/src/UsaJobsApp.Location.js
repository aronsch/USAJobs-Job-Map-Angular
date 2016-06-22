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

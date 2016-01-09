(function () {
    /**
     * USAJobsApp HTML Templates
     * Adds programmatically generated HTML templates to Angular $templateCache
     */
    // Generate component templates and add to cache
    angular.module('UsaJobsApp').run(configTemplates);

    /**
     * Cache Angular Templates
     * @param $templateCache Angular template service
     */
    configTemplates.$inject = ['$templateCache'];
    function configTemplates($templateCache) {
        // $templateCache additions
        $templateCache.put('job-info.html', jobInfoTemplate());
        $templateCache.put('job-filter.html', jobFilterTemplate());
        $templateCache.put('job-table.html', jobTableTemplate());
        $templateCache.put('vacancy-count.html', vacancyCountTemplate());
        // Leaflet.js job map template generation is located in Maps module jobMapDirective


        // Template generation functions

        /**
         * Generate jobs data summary element with refresh button control
         * @returns {String}
         */
        function jobInfoTemplate() {
            return '<p>'
                + '<span ng-hide="jobs.resolved">'
                + '<i class="fa fa-spinner fa-pulse"></i> '
                + 'Getting <strong>{{jobs.orgName}}</strong> job openings from '
                + '</span>'
                + '<span ng-show="jobs.resolved">'
                + '<strong>{{ jobs.JobData.length }} {{ jobs.orgName }}</strong> job openings are currently listed on '
                + '</span>'
                + '<a ng-href="{{jobs.orgSearchUrl}}" target="_blank">USAJobs.gov<i class="fa fa-fw fa-external-link"></i></a>'
                + ' <span class="pull-right btn btn-xs btn-default usa-jobs-refresh-btn" ng-click="refresh()" ng-disabled="!jobs.resolved">'
                + '<i class="fa fa-refresh" ng-class="{ \'fa-spin\': !jobs.resolved }"></i> Refresh'
                + '</span>'
                + '</p>';
        }

        /**
         * Generate Job Filter form template
         * @returns {String}
         */
        function jobFilterTemplate() {
            return '<div class="row form job-filter">'
                + '<vacancy-count-desc></vacancy-count-desc>'
                    // Job salary slider
                + '<div class="form-group col-xs-12 col-sm-9 col-md-10 col-lg-10"><label for="salary-slider">Filter Salary</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.salaryFilter.isActive()" ng-click="filters.salaryFilter.reset(true)"><i class="fa fa-close"></i> <span class="hidden-xs">Clear</span></button>'
                + '<div range-slider show-values="true" filter="currency" id="salary-slider" min="filters.salaryFilter.lowest" max="filters.salaryFilter.highest" step="10000" model-min="filters.salaryFilter.min" model-max="filters.salaryFilter.max" ng-class="{ disabled : !jobs.resolved }"></div>'
                + '</div>'
                + '<div class="form-group col-xs-12 col-sm-3 col-md-2 col-lg-2 text-right"><label class="hidden-xs hidden-sm">&nbsp</label><button class="btn btn-default btn-xs usajobs-filters-advanced-btn " ng-disabled="!jobs.resolved"  ng-click="toggleAdvancedFilters()">{{ showAdvancedFilters ? "Hide" : "More"}} Filters</button></div>'
                    // Advanced filters
                + '<div ng-show="showAdvancedFilters">'
                    // Grade filter slider
                + '<div class="form-group col-xs-12 col-sm-12 col-md-6 col-lg-3 usajobs-grade-filter" ng-hide="filters.gradeFilter.isDisabled"><label for="grade-slider">Filter Grade</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.gradeFilter.isActive()" ng-click="filters.gradeFilter.reset(true)"><i class="fa fa-close"></i> <span class="hidden-xs">Clear</span></button>'
                + '<div range-slider show-values="true" filter="grade" id="grade-slider" min="filters.gradeFilter.lowest" max="filters.gradeFilter.highest" model-min="filters.gradeFilter.min" model-max="filters.gradeFilter.max" ng-class="{ disabled : !jobs.resolved }"></div></div>'
                    // Text filter
                + '<div class="form-group col-xs-12 col-sm-6 col-md-6 col-lg-3"><label for="filters.stringFilter.value" class="">Filter by Typing</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.stringFilter.isActive()" ng-click="filters.stringFilter.reset(true)"><i class="fa fa-close"></i> <span class="hidden-xs">Clear</span></button>'
                + '<input ng-disabled="!jobs.resolved" type="text" class="form-control" ng-model="filters.stringFilter.value" ng-change="filter()" placeholder="filter vacancies by typing here"></div>'
                    // State dropdown
                + '<div class="form-group col-xs-12 col-sm-6 col-md-6 col-lg-3"><label for="state-filter">State/Country&nbsp;</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.state.isActive()" ng-click="filters.state.reset(true)"><i class="fa fa-close"></i> <span class="hidden-xs">Clear</span></button>'
                + '<select class="form-control" id="state-filter" ng-model="filters.state.value" ng-change="filter()"  ng-options="state.name for state in jobs.JobData.states"><option value=""></option></select>'
                + '</div>'
                    // Pay plan radio buttons
                + '<div class="form-group col-xs-12 col-sm-6 col-md-6 col-lg-3"><label for="pay-plan-filter">Filter by Pay Basis</label>'
                + '<button type="button" class="btn btn-xs btn-danger usajobs-btn-leftmargin usajobs-btn-clear" ng-show="filters.payFilter.isActive()" ng-click="filters.payFilter.reset(true)"><i class="fa fa-close"></i> <span class="hidden-xs">Clear</span></button>'
                + '<div id="pay-plan-filter" class="input-group">'
                + '<label class="radio-inline"><input id="allpb-radio" name="pay-radio" type="radio" ng-change="filter()" ng-model="filters.payFilter.selection" ng-value="filters.payFilter.all" ng-disabled="!jobs.resolved"> Any&nbsp</label>'
                + '<label class="radio-inline"><input id="salaried-radio" name="pay-radio" type="radio" ng-change="filter()" ng-model="filters.payFilter.selection" ng-value="filters.payFilter.salaried" ng-disabled="!jobs.resolved"> Salaried&nbsp</label>'
                + '<label class="radio-inline"><input id="hourly-radio" name="pay-radio" type="radio" ng-change="filter()" ng-model="filters.payFilter.selection" ng-value="filters.payFilter.hourly" ng-disabled="!jobs.resolved"> Hourly&nbsp</label>'
                + '</div></div>'
                + '</div>' // advanced filters div close
                + '</div>'; // form div close
        }


        /**
         * Generate Job Table template
         * @returns {String}
         */
        function jobTableTemplate() {
            var tmplt = '',
            // default sort icon FontAwesome classes
                defIcons = {
                    up: 'fa-sort-asc',
                    down: 'fa-sort-desc'
                };
            // alpha sort icon FontAwesome classes
            alphaIcons = {
                up: 'fa-sort-alpha-asc',
                down: 'fa-sort-alpha-desc'
            };
            // amount sort icon FontAwesome classes
            amntIcons = {
                up: 'fa-sort-amount-asc',
                down: 'fa-sort-amount-desc'
            };

            tmplt += '<div class="usajobs-jobs-table">';
            // Column Titles/Sorting
            tmplt += '<div class="clearfix usajobs-table-column-titles">';
            // Title
            tmplt += '<dl class="col-xs-6 col-sm-1 col-md-1 col-lg-1 small"><dt><a class="usajobs-sortbutton"' +
                activeClass('JobTitle') +
                ' title="Sort by Job Title" href="" ng-class="" ng-click="setPredicate(\'JobTitle\')">Title' +
                sortCaret('JobTitle', alphaIcons) + '</a></dt></dl>';
            // Locations
            tmplt += '<dl class="hidden-xs col-sm-2 col-md-1 col-lg-1 small"><dt><a class="usajobs-sortbutton"' +
                activeClass('Location') +
                ' title="Sort by Location" href="" ng-click="setPredicate(\'Locations\')">Location' +
                sortCaret('Locations', alphaIcons) + '</a></dt></dl>';
            // Salary
            tmplt += '<dl class="col-xs-6 col-sm-3 col-md-2 col-lg-2 small"><dt><a class="usajobs-sortbutton"' +
                activeSalaryClass() +
                ' title="Sort by Salary" href="" ng-click="setSalaryPredicate()">Salary' +
                sortSalaryCaret('salaryPredicate') + '</a></dt></dl>';
            // Grade
            tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt><a class="usajobs-sortbutton"' +
                activeClass('Grade') +
                ' title="Sort by Pay Grade" href="" ng-click="setPredicate(\'Grade\')">Grade' +
                sortCaret('Grade', amntIcons) + '</a></dt></dl>';
            // Job Close Date
            tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt><a class="usajobs-sortbutton"' +
                activeClass('daysRemaining') +
                ' title="Sort by Announcement Closing Date" href="" ng-click="setPredicate(\'daysRemaining\')">Closes' +
                sortCaret('daysRemaining', defIcons) + '</a></dt></dl>';
            // Job Open Date
            tmplt += '<dl class="col-xs-6 col-sm-2 col-md-2 col-lg-2 small"><dt><a class="usajobs-sortbutton"' +
                activeClass('daysOpen') +
                ' title="Sort by Announcement Opening Date" href="" ng-click="setPredicate(\'daysOpen\')">Opened' +
                sortCaret('daysOpen', defIcons) + '</a></dt></dl>';
            // Job Announcement Number
            tmplt += '<dl class="hidden-xs hidden-sm hidden-md col-lg-2 small"><dt><a class="usajobs-sortbutton"'
                + activeClass('AnnouncementNumber')
                + ' title="Sort by Job Announcement Number" '
                + 'href="" ng-click="setPredicate(\'AnnouncementNumber\')"><abbr title="Vacancy Announcment Number">Vac #</abbr>'
                + sortCaret('AnnouncementNumber', alphaIcons) + '</a></dt></dl>';
            tmplt += '</div>';

            /* Job List */
            tmplt += '<ul class="usajobs-jobs-table-list list-unstyled">';
            // Results loading alert
            tmplt += '<li class="alert alert-info" ng-click="clearFilters()" ng-hide="jobs.resolved">';
            tmplt += '<i class="fa fa-lg fa-circle-o-notch fa-spin"></i> ' +
                'Getting <strong>{{jobs.orgName}}</strong> job openings from <a ng-href="{{org.orgSearchUrl}}" target="_blank">USAJobs.gov</a>';
            tmplt += '</li>'
            // Zero jobs results alert
            tmplt += '<li class="alert alert-warning" ng-show="jobs.resolved && jobs.JobData.length === 0">';
            tmplt += '<p><i class="fa fa-lg fa-fw fa-times-circle"></i>  ' +
                'No <strong>{{jobs.orgName}}</strong> job openings were found.' +
                '</p>';
            tmplt += '<p>' +
                '<a ng-href="{{jobs.orgSearchUrl}}" target="_blank">' +
                '<i class="fa fa-lg fa-fw fa-external-link"></i>' +
                ' Go to USAJobs.gov to set up a saved search to alert you to new job openings.' +
                '</a>' +
                '</p>';
            tmplt += '</li>';
            // Zero jobs matching filters alert
            tmplt += '<li class="alert alert-danger" ' +
                'ng-click="clearFilters()" ' +
                'ng-show="jobs.JobData.visibleCount === 0 && jobs.JobData.filterStatus.active">';
            tmplt += '<i class="fa fa-lg fa-times-circle"></i> ' +
                'No jobs match your current filter criteria ' +
                '<span class="btn btn-danger"><i class="fa fa-close"></i> Clear filters</span>';
            tmplt += '</li>';

            /* Job Info Element */
            tmplt += '<li class="usajobs-jobs-table-list-item container-fluid" ' +
                'ng-repeat="job in jobs.JobData | orderBy:predicate:reverse" ' +
                'ng-show="job.visible">';
            tmplt += '<h5 class="usajobs-jobs-table-list-item-title">' +
                '<a ng-href="{{job.ApplyOnlineURL}}" ' +
                'target="_blank" title="Open this job announcement on USAJobs.gov">{{ job.title }}' +
                '<i class="fa fa-fw fa-external-link"></i>';
            tmplt += '</a>' +
                '</h5>';
            tmplt += '<div class="row usajobs-table-item-job-details">';
            // Locations
            tmplt += '<dl class="col-xs-12 col-sm-3 col-md-2 col-lg-2 small">' +
                '<dt>Location</dt>' +
                '<dd ng-repeat="loc in job.locationArrayCompact track by $index" title="{{ loc }}">{{ loc }}</dd>' +
                '</dl>';
            // Salary
            tmplt += '<dl class="col-xs-12 col-sm-3 col-md-2 col-lg-2 small">' +
                '<dt>Salary</dt>' +
                '<dd>{{ job.salaryRange }}<span ng-show="job.hourly()">/hour</span></dd>' +
                '</dl>';
            // Grade
            tmplt += '<dl class="col-xs-12 col-sm-2 col-md-2 col-lg-2 small">' +
                '<dt>Grade</dt>' +
                '<dd>{{ job.gradeRangeDesc() }}</dd>' +
                '</dl>';
            // Job Close Date
            tmplt += '<dl class="col-xs-12 col-sm-2 col-md-2 col-lg-2 small">' +
                '<dt>Closes</dt>' +
                '<dd title="{{ job.EndDate }}">{{ job.endDateDescription }}</dd>' +
                '</dl>';
            // Job Open Date
            tmplt += '<dl class="col-xs-12 col-sm-2 col-md-2 col-lg-2 small">' +
                '<dt>Opened</dt>' +
                '<dd>{{ job.StartDate }}</dd>' +
                '</dl>';
            // Job Announcement Number
            tmplt += '<dl class="hidden-xs hidden-sm hidden-md col-lg-2 small">' +
                '<dt><abbr title="Vacancy Announcment Number">Vac</abbr></dt>' +
                '<dd title="{{job.AnnouncementNumber}}">{{ job.AnnouncementNumber }}</dd>' +
                '</dl>';
            // Job Summary Toggle
            tmplt += '<div class="col-xs-12 col-sm-12 col-md-2 col-lg-2 clearfix">' +
                '<a class="hidden-print small text-muted" ng-click="job.toggleDescription()">' +
                '<i class="fa fa-fw" ng-class="{ \'fa-plus-square-o\': !job.showDescription, \'fa-minus-square-o\': job.showDescription }"></i>' +
                'Job Summary' +
                '</a>' +
                '</div>';
            tmplt += '<dl class="col-xs-12 col-sm-12 col-md-10 col-lg-10 small" ng-show="job.showDescription">' +
                '<dt class="sr-only visible-print-block">Job Summary</dt>' +
                '<dd><strong class="visible-xs-inline visible-sm-inline visible-md-inline">' +
                'Vacancy Number: {{job.AnnouncementNumber}}<br /></strong> {{ job.JobSummary }}</dd>' +
                '</dl>';
            tmplt += '</div>';
            tmplt += '</li></ul>';
            tmplt += '</div></div>';

            // Build dynamic sort direction caret element for column titles
            function sortCaret(predicate, icons) {
                return '<i class="fa fa-fw" ng-class="{\'' + icons.down + '\': (reverse && predicate===\'' + predicate
                    + '\'), \'' + icons.up + '\': (!reverse && predicate===\'' + predicate + '\')}"></i>';
            }

            // Specialized sort caret builder for Salary sorting
            function sortSalaryCaret(predicate) {
                return '<i class="fa fa-fw" ng-class="{\'' + amntIcons.down + '\': predicate===\'salaryMaxInt\', \''
                    + amntIcons.up + '\': predicate===\'salaryMinInt\'}"></i>';
            }

            // Generate ngClass attribute that adds active class to column title
            // if the table is being sorted by that column.
            function activeClass(predicate) {
                return ' ng-class="{ \'usajobs-active\': predicate===\'' + predicate + '\' }" ';
            }

            // Specialized version of the ngClass attribute generator to accomodate multiple predicates
            // needed to sort salary ranges.
            function activeSalaryClass() {
                return ' ng-class="{ \'usajobs-active\': predicate===\'salaryMaxInt\'||predicate===\'salaryMinInt\' }" ';
            }

            return tmplt;
        }

        /**
         * Generate vacancy count and filter match count template
         * @returns {String}
         */
        function vacancyCountTemplate() {
            return '<p class=\"usajobs-vac-count text-center\" ng-class=\"{\'bg-clear\': filterStatus.active, \'text-primary\': filterStatus.active, \'bg-danger\': jobs.JobData.visibleCount === 0 && filterStatus.active, \'text-danger\': jobs.JobData.visibleCount === 0 && filterStatus.active}\">'
                + '<span ng-show=\"filterStatus.active\"><strong>{{ jobs.JobData.visibleCount }}</strong> vacanc{{ jobs.JobData.visibleCount == 1 ? \"y\" : \"ies\"}} match{{ jobs.JobData.visibleCount == 1 ? \"es\" : \"\"}} your filter criteria</strong></span>'
                + '<span ng-hide=\"filterStatus.active\">&nbsp<i class="fa fa-fw fa-search" style="color: #ccc"></i>&nbsp</span>'
                + '</p>';
        }
    }
})();

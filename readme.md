# [USA Jobs](https://www.usajobs.gov) Job Listing Map

An Angular and Leaflet.js app for browsing jobs listed on [USAJobs.gov](https://www.usajobs.gov).

[Go here for a demo](http://aronsch.github.io/USAJobs-Job-Map-Angular/) using all components.

## Usage
The current USAJobs Job Search API [requires an API key](https://developer.usajobs.gov/Search-API/Request-API-Key).

The app has four modular UI components:
- `<job-map></job-map>` to display the jobs on a [Leaflet.js](http://leafletjs.com) map.
- `<job-filter></job-filter>` to display a form for filtering job results.
- `<job-table></job-table>` to display a sortable table showing all job results.
- `<job-info></job-info>` to display overall app information - job loading status, number of jobs found, and selected Federal agency.

To start the app, define the following attributes on the app element:
- `org-code` The [Federal agency sub-element org code](https://schemas.usajobs.gov/Enumerations/AgencySubElement.xml).
- `org-name` The name of the organization for display in the `<job-info>` element.

### Example
```
<div ng-app="UsaJobsApp" org-code="ARCE" org-name="Army Corp of Engineers">
    <job-info></job-info>
    <job-map></job-map>
    <job-filter></job-filter>
    <job-table></job-table>
</div>
```

## Limitations
- Only retrieves the first 500 jobs from a query. 

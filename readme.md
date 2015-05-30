# [USA Jobs](https://www.usajobs.gov) Job Listing Map

An Angular app for browsing jobs listed on [USAJobs.gov](https://www.usajobs.gov).

## Usage

The app has four modular UI components:
- `<job-map></job-map>` Displays the jobs on a [Leaflet.js](http://leafletjs.com) map.
- `<job-filter></job-filter>` Displays a form for filtering job results.
- `<job-table></job-table>` Displays a sortable table showing all job results.
- `<job-info></job-info>` Displays overall app information - job loading status, number of jobs found, and selected Federal agency.

To start the app, define the following attributes on the app element:
- `org-id` The [Federal agency sub-element org code](https://schemas.usajobs.gov/Enumerations/AgencySubElement.xml).
- `org-name` The name of the organization for display in the `<job-info>` element.

### Example
```
<div ng-app="UsaJobsApp" org-id="ARCE" org-name="Army Corp of Engineers">
    <job-info></job-info>
    <job-map></job-map>
    <job-filter></job-filter>
    <job-table></job-table>
</div>
```

## Limitations
- Only retrieves the first 250 jobs from a query. 
- Relies on geolocation services to get job location geodata. These are heavily rate and query limited.

## TODO

### Geodata
- Implement support for external geodata file
- Re-implement geodata attribution
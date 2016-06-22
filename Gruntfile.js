/*global module:false*/
module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*! \n' +
        '* <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>\n' +
        '* Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>\n' +
        '*/\n',
        // Task configuration.
        concat: {
            options: {
                banner: '<%= banner %>',
                stripBanners: true
            },
            dist: {
                src: [
                    'js/src/UsaJobsApp.js',
                    'js/src/UsaJobsApp.Settings.js',
                    'js/src/UsaJobsApp.Templates.js',
                    'js/src/UsaJobsApp.Data.js',
                    'js/src/UsaJobsApp.Location.js',
                    'js/src/UsaJobsApp.Table.js',
                    'js/src/UsaJobsApp.Map.js',
                    'js/src/UsaJobsApp.Filters.js',
                    'js/src/UsaJobsApp.ExternalDependencies.js',
                    'js/src/UsaJobsApp.usStatesGeoJson.js',
                    'js/src/UsaJobsApp.GeoJsonSelection.js'
                ],
                dest: 'js/dist/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                banner: '<%= banner %>'
            },
            dist: {
                src: '<%= concat.dist.dest %>',
                dest: 'js/dist/<%= pkg.name %>.min.js'
            }
        },
        qunit: {
            files: ['test/**/*.html']
        },
        watch: {
            lib_test: {
                files: '<%= jshint.lib_test.src %>',
                tasks: ['jshint:lib_test', 'qunit']
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Default task.
    grunt.registerTask('default', ['concat', 'uglify']);
    grunt.registerTask('test', ['qunit']);

};

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        karma: {
            unit: {
                configFile: 'karma.conf.js'
            }
        },

        concat: {
            options: {
                process: function(src, filepath) {
                    return '\n/* -------- ' + filepath + ' -------- */ \n\n' + src;
                },
            },
            js: {
                src: [
                    'app/src/js/*.js',
                    'app/src/js/**/*.js',
                    '!app/src/js/vendor/*.js'
                ],
                dest: 'app/assets/js/app.js'
            }
        },

        sass: {
            dist: {
                files: {
                    'app/assets/css/app.css': 'app/src/sass/app.sass',
                }
            }
        },

        watch: {
            js: {
                files: ['app/src/js/*.js', 'app/src/js/**/*.js'],
                tasks: ['concat']
            },
            sass: {
                files: ['app/src/sass/*', 'app/src/sass/**/*'],
                tasks: ['sass']
            }
        },

        connect: {
            server: {
                options: {
                    open: true,
                    keepalive: true,
                    port: 1338,
                    base: ['app/'],
                    // livereload: true
                }
            }
        },
    });


    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-connect');

    grunt.registerTask('default', ['watch']);

    grunt.registerTask('server', ['connect', 'watch']);

};
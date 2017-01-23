module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		browserify: {
			control: {
				src: ['leaflet-xserver/TileLayer.ClickableTiles.js'],
				dest: 'dist/leaflet-xserver.js',
				options: {
					transform: [
						[
							'browserify-shim',
							{
								'leaflet': 'global:L'
							}
						],
					],
					browserifyOptions: {
						standalone: 'L.TileLayer.ClickableTiles'
					}
				}
			}
		},
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
				'<%= grunt.template.today("yyyy-mm-dd") %> */\n\n'
			},
			build: {
				src: 'dist/leaflet-xserver.js',
				dest: 'dist/leaflet-xesrver.min.js'
			}
		}
	});

	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.registerTask('default', ['browserify', 'uglify']);
};

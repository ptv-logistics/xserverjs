module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		browserify: {
			control: {
				src: ['leaflet-xserver/src/TileLayer.ClickableTiles.js'],
				dest: 'leaflet-xserver/dist/TileLayer.ClickableTiles-src.js',
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
				src: 'leaflet-xserver/dist/TileLayer.ClickableTiles-src.js',
				dest: 'leaflet-xserver/dist/TileLayer.ClickableTiles.js'
			}
		}
	});

	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.registerTask('default', ['browserify', 'uglify']);
};

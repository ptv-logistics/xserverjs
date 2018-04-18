if (!token) {
	alert('you need a token to run the sample!');
}

var scenario = 'eu';
var itineraryLanguage = 'EN';
var routingProfile = 'carfast';
var alternativeRoutes = 0;
var routingControl;

// initialize the map 
var map = L.map('map', {
	fullscreenControl: true,
	fullscreenControlOptions: {
		fullscreenElement: document.getElementById('map-container').parentNode // needed for sidebar!
	},
	contextmenu: true,
	contextmenuWidth: 200,
	contextmenuItems: [{
		text: 'Add Waypoint At Start',
		callback: function (ev) {
			if (routingControl._plan._waypoints[0].latLng) {
				routingControl.spliceWaypoints(0, 0, ev.latlng);
			} else {
				routingControl.spliceWaypoints(0, 1, ev.latlng);
			}
		}
	}, {
		text: 'Add Waypoint At End',
		callback: function (ev) {
			if (routingControl._plan._waypoints[routingControl._plan._waypoints.length - 1].latLng) {
				routingControl.spliceWaypoints(routingControl._plan._waypoints.length, 0, ev.latlng);
			} else {
				routingControl.spliceWaypoints(routingControl._plan._waypoints.length - 1, 1, ev.latlng);
			}
		}
	}]
});

// get the start and end coordinates for a scenario
var getPlan = function () {
	if (scenario.indexOf('na') > -1) {
		return [
			L.latLng(40.71454, -74.00711),
			L.latLng(42.35867, -71.05672)
		];
	} else if (scenario.indexOf('au') > -1) {
		return [
			L.latLng(-33.86959, 151.20694),
			L.latLng(-35.3065, 149.12659)
		];
	} else {
		return [
			L.latLng(48.8588, 2.3469),
			L.latLng(52.3546, 4.9039)
		];
	}
};

// returns a layer group for xmap back- and foreground layers
function getXMapBaseLayers(style, token, labelPane) {
	var attribution = '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE';

	var background = L.tileLayer('https://xmap-eu-n-test.cloud.ptvgroup.com/WMS/GetTile/xmap-' + style + 'bg/{x}/{y}/{z}.png', {
		minZoom: 0,
		maxZoom: 19,
		opacity: 1.0,
		attribution: attribution,
		subdomains: '1234'
	});

	var foreground = L.nonTiledLayer.wms('https://xmap-eu-n-test.cloud.ptvgroup.com/WMS/WMS?xtok=' + token, {
		minZoom: 0,
		maxZoom: 19,
		opacity: 1.0,
		layers: 'xmap-' + style + 'fg',
		format: 'image/png',
		transparent: true,
		attribution: attribution,
		pane: 'labels'
	});

	return L.layerGroup([background, foreground]);
}

map.createPane('labels');
map.getPane('labels').style.zIndex = 500;
map.getPane('labels').style.pointerEvents = 'none';

var baseLayers = {
	'PTV classic': getXMapBaseLayers('ajax', token, map._panes.labelPane),
	'PTV gravelpit': getXMapBaseLayers('gravelpit-', token, map._panes.labelPane),
	'PTV silkysand': getXMapBaseLayers('silkysand-', token, map._panes.labelPane).addTo(map),
	'PTV sandbox': getXMapBaseLayers('sandbox-', token, map._panes.labelPane)
};

L.control.scale().addTo(map);
L.control.layers(baseLayers, [], {
	position: 'bottomleft'
}).addTo(map);

routingControl = L.Routing.control({
	plan: L.Routing.plan(getPlan(), {
		createMarker: function (i, wp) {
			return L.marker(wp.latLng, {
				draggable: true,
				icon: L.icon.glyph({
					glyph: String.fromCharCode(65 + i)
				})
			});
		},
		geocoder: L.Control.Geocoder.ptv({
			serviceUrl: 'https://xlocate-eu-n-test.cloud.ptvgroup.com/xlocate/rs/XLocate/',
			token: token
		}),
		reverseWaypoints: true
	}),
	lineOptions: {
		styles: [
			// Shadow
			{
				color: 'black',
				opacity: 0.8,
				weight: 11
			},
			// Outline
			{
				color: '#888',
				opacity: 0.8,
				weight: 8
			},
			// Center
			{
				color: '#aaa',
				opacity: 1,
				weight: 4
			}
		]
	},
	altLineOptions: {
		styles: [{
				color: 'grey',
				opacity: 0.8,
				weight: 11
			},
			{
				color: '#aaa',
				opacity: 0.8,
				weight: 8
			},
			{
				color: 'white',
				opacity: 1,
				weight: 4
			}
		],
	},
	showAlternatives: true,
	router: L.Routing.ptv({
		serviceUrl: 'https://xroute-eu-n-test.cloud.ptvgroup.com/xroute/rs/XRoute/',
		token: token,
		numberOfAlternatives: alternativeRoutes,
		beforeSend: function (request) {
			request.options.push({
				parameter: 'ROUTE_LANGUAGE',
				value: itineraryLanguage
			});

			request.callerContext.properties.push({
				key: 'Profile',
				value: routingProfile
			});

			return request;
		},
		routesCalculated: function (alts, r) {}
	}),
	routeWhileDragging: false,
	routeDragInterval: 500,
	collapsible: true
}).addTo(map);

routingControl.on('routingerror', function (e) {
	console.log(e.message);
});

L.Routing.errorControl(routingControl).addTo(map);

// update ui
$('#clusterSelect').val(scenario);
$('#languageSelect').val(itineraryLanguage);
$('#routingProfile').val(routingProfile);
$('#alternativeRoutes').val(alternativeRoutes);

// add side bar
var sidebar = L.control.sidebar('sidebar').addTo(map);

// update the map scenario
var updateScenario = function () {
	scenario = $('#scenarioSelect option:selected').val();
	updateParams(true);
};

// update the routing params
var updateParams = function (updateWayPoints) {
	itineraryLanguage = $('#languageSelect option:selected').val();
	routingProfile = $('#routingProfile option:selected').val();
	alternativeRoutes = $('#alternativeRoutes option:selected').val();

	if (updateWayPoints)
		routingControl.setWaypoints(getPlan());
	routingControl._router.options.numberOfAlternatives = alternativeRoutes;
	routingControl.route();
};
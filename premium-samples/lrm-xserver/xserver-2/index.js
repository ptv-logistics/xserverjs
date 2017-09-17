var scenario = 'm';
var routingProfile = 'truck40t.xml';
var enableRestrictionZones = true;
var enableTruckAttributes = true;

var baseLayers;
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

// create a new pane for the overlay tiles
map.createPane('tileOverlayPane');
map.getPane('tileOverlayPane').style.zIndex = 500;
map.getPane('tileOverlayPane').style.pointerEvents = 'none';

// get the start and end coordinates for a scenario
var getPlan = function () {
	switch (scenario) {
		case 'm':
			{
				return [
					L.latLng(48.10032397915225, 11.547317504882812),
					L.latLng(48.167001359708934, 11.602249145507814)
				];
			}
		case 'hh':
			{
				return [
					L.latLng(53.55145062603612, 9.934816360473632),
					L.latLng(53.52796226132062, 9.84975814819336)
				];
			}
		case 'na':
			{
				return [
					L.latLng(40.71454, -74.00711),
					L.latLng(42.35867, -71.05672)
				];
			}
		case 'au':
			{
				return [
					L.latLng(-33.86959, 151.20694),
					L.latLng(-35.3065, 149.12659)
				];
			}
		default:
			{ // 'eu'	
				return [
					L.latLng(48.8588, 2.3469),
					L.latLng(52.3546, 4.9039)
				];
			}
	}
};

// returns a layer group for xmap back- and foreground layers
var getXMapBaseLayers = function (style) {
	var bg = L.tileLayer('https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?storedProfile={profile}&layers=background,transport' +
		'&xtok={token}', {
			profile: style,
			token: token,
			attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE',
			maxZoom: 22,
			subdomains: '1234'
		});

	var fg = L.tileLayer.xserver('https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?storedProfile={profile}&layers=labels,{vl1}{vl2}{vl3}&contentType=JSON' +
		'&xtok={token}', {
			profile: style,
			token: token,
			attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE',
			maxZoom: 22,
			subdomains: '1234',
			pane: 'tileOverlayPane',
			zIndex: 1,
			isVirtualHost: true,
			vl1: '',
			vl2: '',
			vl3: ''
		});

	return L.layerGroup([bg, fg]);
}

routingControl = L.Routing.control({
	plan: L.Routing.plan(getPlan(), {
		routeWhileDragging: false,
		routeDragInterval: 3000,
		createMarker: function (i, wp) {
			return L.marker(wp.latLng, {
				draggable: true,
				icon: L.icon.glyph({
					glyph: String.fromCharCode(65 + i)
				})
			});
		},
		geocoder: L.Control.Geocoder.ptv({
			serviceUrl: 'https://xserver2-europe-test.cloud.ptvgroup.com/services/rest/XLocate/locations/',
			token: token
		}),
		reverseWaypoints: true
	}),
	lineOptions: {
		styles: [
			// Shadow
			{
				color: 'black',
				opacity: 1,
				weight: 11
			},
			// Outline
			{
				color: 'blue',
				opacity: 0.8,
				weight: 8
			},
			// Center
			{
				color: 'cyan',
				opacity: 0.8,
				weight: 4
			}
		]
	},
	router: L.Routing.ptv({
		serviceUrl: 'https://xserver2-europe-test.cloud.ptvgroup.com/services/rs/XRoute/',
		token: token,
		supportsHeadings: true,
		beforeSend: function (request) {
			request.storedProfile = routingProfile;
			request.requestProfile = {
				'featureLayerProfile': {
					'themes': [{
						'enabled': enableTruckAttributes,
						'id': 'PTV_TruckAttributes'
					}, {

						'enabled': enableRestrictionZones,
						'id': 'PTV_RestrictionZones'
					}]
				}
			};
			return request;
		}
	}),
	collapsible: true,
	routeWhileDragging: false,
	routeDragInterval: 3000,
	formatter: new L.Routing.Formatter({
		roundingSensitivity: 1000
	})
}).addTo(map);

routingControl.on('routingerror', function (e) {});

L.Routing.errorControl(routingControl).addTo(map);
//	routingControl.hide();
//map.setView([49, 8.4], 16);

// update ui
$('#scenarioSelect').val(scenario);
$('#routingProfile').val(routingProfile);
$('#enableRestrictionZones').prop('checked', enableRestrictionZones);
$('#enableTruckAttributes').prop('checked', enableTruckAttributes);

// add side bar
var sidebar = L.control.sidebar('sidebar').addTo(map);
sidebar.open('home');

// add scale control
L.control.scale().addTo(map);

var baseLayers = {
	'PTV gravelpit': getXMapBaseLayers('gravelpit'),
	'PTV sandbox': getXMapBaseLayers('sandbox'),
	'PTV silkysand': getXMapBaseLayers('silkysand').addTo(map)
};

var truckAttributesLayer = L.virtualLayer('PTV_TruckAttributes,', 'vl1');
var restrictionZonesLayer = L.virtualLayer('PTV_RestrictionZones,', 'vl2');

if (enableTruckAttributes)
	map.addLayer(truckAttributesLayer);
if (enableRestrictionZones)
	map.addLayer(restrictionZonesLayer);

L.control.layers(baseLayers, {
	'Truck Attributes': truckAttributesLayer,
	'Restriction Zones': restrictionZonesLayer
}, {
	position: 'bottomleft',
	autoZIndex: false
}).addTo(map);

var indSelf = false;

var _onLayerAdd = function (e) {
	if (indSelf) // event was triggered by panel
		return;

	if (e.layer === truckAttributesLayer) {
		enableTruckAttributes = true;
		$('#enableTruckAttributes').prop('checked', enableTruckAttributes);
	} else if (e.layer === restrictionZonesLayer) {
		enableRestrictionZones = true;
		$('#enableRestrictionZones').prop('checked', enableRestrictionZones);
	} else return;

	routingControl.route();
};

var _onLayerRemove = function (e) {
	if (indSelf) // event was triggered by panel
		return;

	if (e.layer === truckAttributesLayer) {
		enableTruckAttributes = false;
		$('#enableTruckAttributes').prop('checked', enableTruckAttributes);
	} else if (e.layer === restrictionZonesLayer) {
		enableRestrictionZones = false;
		$('#enableRestrictionZones').prop('checked', enableRestrictionZones);
	} else return;

	routingControl.route();
};

map.on('layeradd', _onLayerAdd, this)
map.on('layerremove', _onLayerRemove, this)

// update the map scenario
var updateScenario = function () {
	scenario = $('#scenarioSelect option:selected').val();
	updateParams(true);
};

// update the routing params
var updateParams = function (updateWayPoints) {
	routingProfile = $('#vehicleType').val();

	enableRestrictionZones = $('#enableRestrictionZones').is(':checked');
	enableTruckAttributes = $('#enableTruckAttributes').is(':checked');

	// sync panel->layers
	indSelf = true;

	if (enableTruckAttributes)
		map.addLayer(truckAttributesLayer);
	else
		map.removeLayer(truckAttributesLayer);

	if (enableRestrictionZones)
		map.addLayer(restrictionZonesLayer);
	else
		map.removeLayer(restrictionZonesLayer);

	indSelf = false;

	if (updateWayPoints)
		routingControl.setWaypoints(getPlan());
	routingControl._router.options.numberOfAlternatives = 0;
	routingControl.route();
};
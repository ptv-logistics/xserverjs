if (!token) {
	alert('you need a token to run the sample!');
}

var cluster = 'eu';
var itineraryLanguage = 'EN';
var routingProfile = 'carfast';
var alternativeRoutes = 0;

var baseLayers;
var routingControl;

// initialize the map
var map = L.map('map', {
	contextmenu: true,
	contextmenuWidth: 200,
	contextmenuItems: [
		{
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
		}
	]
});

// get the start and end coordinates for a cluster
var getPlan = function () {
	if (cluster.indexOf('cn') > -1) {
		return [
			L.latLng(40.11589, 116.28479),
			L.latLng(39.95396, 116.52649)
		];
	} else if (cluster.indexOf('jp') > -1) {
		return [
			L.latLng(35.74317, 139.79828),
			L.latLng(35.65423, 139.68945)
		];
	} else if (cluster.indexOf('na') > -1) {
		return [
			L.latLng(40.71454, -74.00711),
			L.latLng(42.35867, -71.05672)
		];
	} else if (cluster.indexOf('au') > -1) {
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

// get the fixed country for a cluster
function getGeocodingCountry() {
	if (cluster.indexOf('cn-n') > -1) {
		return 'CHN';
	} else if (cluster.indexOf('jp-n') > -1) {
		return 'JPN';
	} else {
		return null;
	}
}

// returns a layer group for xmap back- and foreground layers
function getXMapBaseLayers(baseUrl, style, xparam, labelPane) {
			return L.tileLayer('https://api{s}-xstwo.cloud.ptvgroup.com/services/rest/XMap/2.0/map/{z}/{x}/{y}/' + style +
				'?xtok=' + token, {
				attribution: '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
				maxZoom: 22,
				subdomains: '1234'
			});
}

// fix the missing click-propagation for Internet Explorer in the sidebar
var fixClickPropagationForIE = function (container) {
	container.onclick = L.DomEvent.stopPropagation;
	var inputTags = container.getElementsByTagName('input');
	var selectTags = container.getElementsByTagName('select');
	var elements = Array.prototype.slice.call(inputTags, 0);
	elements = elements.concat(Array.prototype.slice.call(selectTags, 0));

	for (var i = 0; i < elements.length; i++) {
		if (elements[i].type === 'text') {
			elements[i].onclick = L.DomEvent.stopPropagation;
		}
		elements[i].onmousedown = elements[i].ondblclick = elements[i].onpointerdown = L.DomEvent.stopPropagation;
	}
};

var setCluster = function () {
	// create a new leaflet pane for the label layer
	// see http://bl.ocks.org/rsudekum/5431771
	if (!map._panes.labelPane) {
		map._panes.labelPane = map._createPane('leaflet-top-pane', map.getPanes().shadowPane);
	}

	if (routingControl) {
		map.removeControl(routingControl);
	}

	routingControl = L.Routing.control({
		plan: L.Routing.plan(getPlan(),
		{
			createMarker: function (i, wp) {
				return L.marker(wp.latLng, {
					draggable: true,
					icon: new L.Icon.Label.Default({labelText: String.fromCharCode(65 + i)})
				});
			},
			geocoder: L.Control.Geocoder.ptv({
				fixedCountry: getGeocodingCountry(),
				serviceUrl: 'https://api-eu-test.cloud.ptvgroup.com/xlocate/rs/XLocate/',
				token: token
			}),
			reverseWaypoints: true
		}),
		lineOptions: {
			styles: [
			  // Shadow
			  {color: 'black', opacity: 0.8, weight: 11},
			  // Outline
			  {color: 'green', opacity: 0.8, weight: 8},
			  // Center
			  {color: 'orange', opacity: 1, weight: 4}
			]
		},
		router: L.Routing.ptv({
		    serviceUrl: 'https://api-xstwo.cloud.ptvgroup.com/services/rs/XRoute/2.0/',
			token: token, supportsHeadings: true,
			numberOfAlternatives: 0
		}),
		routeWhileDragging: true,
		routeDragInterval: 500,
		formatter: new L.Routing.Formatter({roundingSensitivity: 1000}),
	}).addTo(map);

	routingControl.on('routingerror', function (e) {
		alert(e.error.responseJSON.message);
	});
};

// initalize the cluster
setCluster();

// update ui
$('#clusterSelect').val(cluster);
$('#languageSelect').val(itineraryLanguage);
$('#routingProfile').val(routingProfile);
$('#alternativeRoutes').val(alternativeRoutes);

// add side bar
var sidebar = L.control.sidebar('sidebar').addTo(map);
fixClickPropagationForIE(sidebar._sidebar); // fix for IE
sidebar.open('home');


// add scale control
L.control.scale().addTo(map);

var baseLayers = {
    "PTV gravelpit": getXMapBaseLayers("https://xserver-2.ptvag.ptv.de:50000/services/rest/XMap/2.0/map", 'gravelpit', null, map._panes.labelPane),
    "PTV sandbox": getXMapBaseLayers("https://xserver-2.ptvag.ptv.de:50000/services/rest/XMap/2.0/map", 'sandbox', null, map._panes.labelPane),
    "PTV silkysand": getXMapBaseLayers("https://xserver-2.ptvag.ptv.de:50000/services/rest/XMap/2.0/map", 'silkysand', null, map._panes.labelPane).addTo(map),
};

L.control.layers(baseLayers, null, { position: 'bottomleft' }).addTo(map);


// update the map cluster
var updateCluster = function () {
    cluster = $('#clusterSelect option:selected').val();
    updateParams(true);
};

// update the routing params
var updateParams = function (updateWayPoints) {
	itineraryLanguage = $('#languageSelect option:selected').val();
	routingProfile = $('#routingProfile option:selected').val();
	alternativeRoutes = $('#alternativeRoutes option:selected').val();

	if(updateWayPoints)
		routingControl.setWaypoints(getPlan());
	routingControl._router.options.numberOfAlternatives = 0;
	routingControl.route();
};

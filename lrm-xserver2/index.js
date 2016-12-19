if (!token) {
	alert('you need a token to run the sample!');
}

// Fix for IE10 route-drag
L.Browser.pointer = null;

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
		// return [
			// L.latLng(48.8588, 2.3469),
			// L.latLng(52.3546, 4.9039)
		// ];
		return [
			L.latLng(53.55145062603612, 9.934816360473632),
			L.latLng(53.52796226132062, 9.84975814819336)
		];

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
function getXMapBaseLayers(baseUrl, style) {
			return L.tileLayer('https://s0{s}-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}/' + style +
				'?xtok=' + token, {
				attribution: '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
				maxZoom: 22,
				subdomains: '1234'
			});
}

var setCluster = function () {
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
				serviceUrl: 'https://xserver2-dev.cloud.ptvgroup.com/services/rest/XLocate/experimental/locations/',
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
		    serviceUrl: 'https://xserver2-dev.cloud.ptvgroup.com/services/rs/XRoute/',
			token: token, supportsHeadings: true,
			numberOfAlternatives: 0
		}),
		routeWhileDragging: false,
		routeDragInterval: 1000,
		formatter: new L.Routing.Formatter({roundingSensitivity: 1000}),
	    collapsible: true
	}).addTo(map);

	routingControl.on('routingerror', function (e) {
		alert(e.error.responseJSON.message);
	});
	
	routingControl.hide();	
};

// initalize the cluster
setCluster();
//map.setView([49, 8.4], 16);

// update ui
$('#clusterSelect').val(cluster);
$('#languageSelect').val(itineraryLanguage);
$('#routingProfile').val(routingProfile);
$('#alternativeRoutes').val(alternativeRoutes);

// add side bar
var sidebar = L.control.sidebar('sidebar').addTo(map);
//sidebar.open('home');


// add scale control
L.control.scale().addTo(map);

map._panes.tileoverlayPane = map._createPane('leaflet-tile-pane', map._panes.overlayPane);
			map._panes.tileoverlayPane.style['pointer-events'] = 'none';
//			map._panes.tileoverlayPane.style.zIndex = 999;

  
vectormaps.renderPTV.PARSE_COORDS_WORKER = "lib/vectormaps-worker.min.js";
 
// add PTV tile and label (overlay) layers
var overlayLayer = vectormaps.overlayLayer({
    updateWhenIdle: false,
    unloadInvisibleTiles: true,
	pane: map._panes.tileoverlayPane,
	zIndex: 999
});
var layer = vectormaps.vectorTileLayer(
    'http://xvector.westeurope.cloudapp.azure.com/vectormaps/vectormaps/', {
        stylesUrl: 'styles/styles-winter.json',
        updateWhenIdle: false,
        unloadInvisibleTiles: true
    }, overlayLayer);
var vectorWinter = L.layerGroup([layer, overlayLayer]);

overlayLayer = vectormaps.overlayLayer({
    updateWhenIdle: false,
    unloadInvisibleTiles: true,
	pane: map._panes.tileoverlayPane,
	zIndex: 999
});
layer = vectormaps.vectorTileLayer(
    'http://xvector.westeurope.cloudapp.azure.com/vectormaps/vectormaps/', {
        stylesUrl: 'styles/styles-default.json',
        updateWhenIdle: false,
        unloadInvisibleTiles: true,
    }, overlayLayer);
var vectorDefault = L.layerGroup([layer, overlayLayer]);

var empty =  L.layerGroup([]); 

  var baseLayers = {
      "PTV gravelpit": getXMapBaseLayers("", 'gravelpit'),
      "PTV sandbox": getXMapBaseLayers("", 'sandbox'),
      "PTV silkysand": getXMapBaseLayers("", 'silkysand'),
	  "Vector": vectorDefault.addTo(map),
	  "Winter": vectorWinter,
	  "Empty": empty
  };


        var truckAttributesLayer = new L.TileLayer.MetaInfoTiles(
		'https://s0{s}-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}/' +
		'silkysand-background-transport-labels+PTV_TruckAttributes/json?xtok=' + token,
		{
			attribution: '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
			subdomains: '1234',
            maxZoom: 22,
			zIndex: 998
        }).addTo(map);


L.control.layers(baseLayers, {"Truck Attributes": truckAttributesLayer} , 
{ position: 'bottomleft', autoZIndex: false }).addTo(map);


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

'use strict';
// url we're sending the request to
var xMapTileUrl = 'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?xtok={token}';
var findAddressUrl = 'https://xserver2-europe-test.cloud.ptvgroup.com/services/rest/XLocate/locations';
var isoUrl = 'https://api-test.cloud.ptvgroup.com/xroute/rs/XRoute/calculateIsochrones';
var searchForReachableObjectsUrl = 'https://api-test.cloud.ptvgroup.com/xroute/rs/XRoute/calculateReachableObjects';

var searchLocation;
var isoFeature;
var highlightedPois = [];
var isBusy = false;
var marker;
var circle;
var horizon = 600;
var searchMethod = 0;
var index;
var poiData;

// set up the map
var attribution = '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, TOMTOM';
var mapLocation = new L.LatLng(49, 8.4);

// create a map in the "map" div, set the view to a given place and zoom
var map = new L.Map('map', {
	preferCanvas: true
}).setView(mapLocation, 12);

// insert xMap back- and forground layers with sandbox-style
L.tileLayer(xMapTileUrl, {
	token: window.token,
	attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
	maxZoom: 22,
	subdomains: '1234'
}).addTo(map);

if (!token)
	alert('you need to configure your xServer internet token in token.js!')

// add scale control
L.control.scale().addTo(map);

map.on('click', onMapClick);

// add input control
var info = L.control();
info.onAdd = function (map) {
	var container = L.DomUtil.create('div', 'info leaflet-bar leaflet-control leaflet-control-custom');
	var geocodeCmd = 'if(!isBusy)findByAddress(document.getElementById(\'f1\').value);';
	var geolocateCmd = 'if(!isBusy)findByGeolocation();';
	var fulltextSearchCmd = 'if(!isBusy)findFulltext(document.getElementById(\'f2\').value);';
	var html =
		'<form id="myForm">' +
		'<div>Click map or find nearby address</div>' +
		'</div><div>' +
		'<input type="text" id="f1" value="Karlsruhe, Haid-und-Neu-Straße 15">' +
		'<input type="button" align="right" value="Geocode" onClick="' + geocodeCmd + '">' +
		'</div>' +
		'<div>Or find by geo-location' +
		'<input type="button" align="right" value="Geolocate" onClick="' + geolocateCmd + '">' +
		'</div>' +
		'<div>Search method</div>' +
		'<div>' +
		'<input type="radio" name="searchmethod" checked="true" onclick="setSearchMethod(0);">airline' +
		'<input type="radio" name="searchmethod" onclick="setSearchMethod(1);">route' +
		'<input type="radio" name="searchmethod" onclick="setSearchMethod(2);">isochrone' +
		'</div>' +
		'<div>Horizon</div>' +
		'<div>' +
		'<input type="radio" name="horizon" checked="true" onclick="setHorizon(1200);">20 min' +
		'<input type="radio" name="horizon" onclick="setHorizon(2400);">40 min' +
		'<input type="radio" name="horizon" onclick="setHorizon(3600);">60 min' +
		'</div>' +
		'<div>Or find stores by name</div>' +
		'<div>' +
		'<input type="text" id="f2" value="OBI">' +
		'<input type="button" value="Find" onClick="' + fulltextSearchCmd + '">' +
		'</div>' + '</form>';
	container.innerHTML = html;

	L.DomEvent.disableClickPropagation(container);
	return container;
};
info.addTo(map);

setBusy(true);

$.getJSON('./inobas.json', initialize);

function initialize(pd) {
	// store our data
	poiData = pd;

	// tip: sort the features by latitued, so they overlap nicely on the map!
	// poiData.features.sort(function (a, b) {
	//  return b.geometry.coordinates[1] - a.geometry.coordinates[1];
	// });

	L.geoJson(poiData, {
		attribution: 'DDS, Inobas',
		pointToLayer: poiStyle
	}).addTo(map);

	// create full text index
	index = lunr(function () {
		this.field('description', {
			boost: 10
		})
		this.ref('id')
	})
	for (var i = 0; i < poiData.features.length; i++) {
		index.add({
			id: i,
			description: poiData.features[i].properties.description
		});
	}

	setBusy(false);
}

function setBusy(busy) {

	isBusy = busy;

	$('#myForm :input').prop('disabled', busy);
}

function findNearestObjects(keepCircle) {
	if (!searchLocation)
		return;

	cleanupMarkers(keepCircle);

	var c = 'marker-red';
	marker = L.marker(searchLocation, {
		zIndexOffset: 1000,
		icon: new L.Icon.Default({
			imagePath: './icons/',
			iconUrl: c + '.png',
			iconRetinaUrl: c + '-2x.png'
		})
	}).addTo(map);
	marker.bindPopup(latFormatter(searchLocation.lat) + ', ' + lngFormatter(searchLocation.lng));

	if (searchMethod == 0)
		findByAirline(searchLocation, horizon);
	else if (searchMethod == 1)
		findByReachableObjects(searchLocation, horizon);
	else
		findByIso(searchLocation, horizon);
}

function setSearchMethod(method) {
	searchMethod = method;
	findNearestObjects(true);
}

function setHorizon(hor) {
	horizon = hor;
	findNearestObjects(true);
}

function onMapClick(e) {
	if (isBusy)
		return;

	searchLocation = e.latlng;
	findNearestObjects();
}

function findFulltext(name) {
	cleanupMarkers();

	var res = index.search(name);

	for (var i = 0; i < res.length; i++) {
		highlightPoi(poiData.features[res[i].ref], 'marker-green');
	}

	setBounds(highlightedPois);
}

function findByAddress(adr) {
	setBusy(true);

	runGetRequest(
		findAddressUrl,
		'D ' + adr, // use Germany as fixed country
		token,
		function (response) {
			var firstResult = response.results[0].location;
			searchLocation = new L.LatLng(firstResult.referenceCoordinate.y, firstResult.referenceCoordinate.x);
			findNearestObjects();
		},
		function (xhr) {
			alert(xhr.responseJSON.errorMessage);
			setBusy(false);
		});
}

function findByGeolocation(adr) {
	setBusy(true);
	map.locate({
		setView: true,
		maxZoom: 16
	});
}

map.on('locationfound', function (e) {
	// correct accuracy for mercator projection
	var circleRadius = e.accuracy / Math.cos(e.latlng.lat / 180 * Math.PI);

	cleanupMarkers();

	circle = L.circle(e.latlng, circleRadius, {
		zIndex: 1000
	}).addTo(map);

	searchLocation = e.latlng;
	findNearestObjects(true);
});

map.on('locationerror', function (e) {
	alert(e.message);
	setBusy(false);
});

function findByIso(latlng, hor) {
	setBusy(true);

	var request = {
		'sink': {
			'coords': [{
				'point': {
					'x': latlng.lng,
					'y': latlng.lat
				}
			}],
			'linkType': 'NEXT_SEGMENT'
		},
		'options': [],
		'isoOptions': {
			'isoDetail': 'POLYS_ONLY',
			'polygonCalculationMode': 'NODE_BASED',
			'expansionDesc': {
				'expansionType': 'EXP_TIME',
				'horizons': [
					hor
				]
			}
		},
		'callerContext': {
			'properties': [{
				'key': 'CoordFormat',
				'value': 'OG_GEODECIMAL'
			}, {
				'key': 'ResponseGeometry',
				'value': 'WKT'
			}, {
				'key': 'Profile',
				'value': 'carfast'
			}]
		}
	};

	runRequest(
		isoUrl,
		request,
		token,
		function (response) {
			var x = isoToPoly(response.isochrones[0].polys.wkt);

			var feature = {
				'type': 'Feature',
				'properties': {
					'style': {
						weight: 4,
						color: '#222',
						opacity: 1,
						fillColor: '#fff',
						fillOpacity: 0.5
					}
				}
			};

			feature.geometry = {
				type: 'Polygon',
				coordinates: x
			};

			isoFeature = L.geoJson([feature], {
				style: function (feature) {
					return feature.properties && feature.properties.style;
				}
			});

			isoFeature.on('click', onMapClick);
			isoFeature.addTo(map);

			for (var i = 0; i < poiData.features.length; i++) {
				if (leafletPip.pointInLayer(poiData.features[i].geometry.coordinates, isoFeature).length > 0) {
					highlightPoi(poiData.features[i], 'marker-green', null, true);
				}
			}

			map.fitBounds(isoFeature.getBounds());

			setBusy(false);
		},
		function (xhr) {
			alert(xhr.responseJSON.errorMessage);
			setBusy(false);
		});
}

function filterByAirline(latlng, hor) {
	var result = new Array();
	var range = hor /*=s*/ * 120 /* km/h */ / 3.6 /*=m/s */ ;

	for (var i = 0; i < poiData.features.length; i++) {
		var poiLocation = poiData.features[i].geometry.coordinates;
		var p = L.latLng(poiLocation[1], poiLocation[0]);
		var distance = latlng.distanceTo(p);
		if (distance < range) {
			result.push({
				distance: distance,
				data: poiData.features[i]
			});
		}
	}

	return result;
}

function findByAirline(latlng, hor) {
	setBusy(true);
	var found = filterByAirline(latlng, hor);

	for (var i = 0; i < found.length; i++) {
		highlightPoi(found[i].data, 'marker-green', Math.round(found[i].distance) + 'm', true);
	}

	setBounds(highlightedPois, latlng);

	setBusy(false);
}

function findByReachableObjects(latlng, hor) {
	var candidates = filterByAirline(latlng, hor);
	var locations = new Array();
	for (var i = 0; i < candidates.length; i++) {
		var location = candidates[i].data.geometry.coordinates;
		locations.push({
			'coords': [{
				'point': {
					'x': location[0],
					'y': location[1]
				}
			}],
			'linkType': 'NEXT_SEGMENT'
		});
	}

	setBusy(true);

	var request = {
		'sink': {
			'coords': [{
				'point': {
					'x': latlng.lng,
					'y': latlng.lat
				}
			}],
			'linkType': 'NEXT_SEGMENT'
		},
		'binaryPathDesc': null,
		'locations': locations,
		'options': [],
		'expansionDesc': {
			'expansionType': 'EXP_TIME',
			'horizons': [
				hor
			]
		},
		'callerContext': {
			'properties': [{
				'key': 'CoordFormat',
				'value': 'OG_GEODECIMAL'
			}, {
				'key': 'ResponseGeometry',
				'value': 'WKT'
			}, {
				'key': 'Profile',
				'value': 'carfast'
			}]
		}
	};

	runRequest(
		searchForReachableObjectsUrl,
		request,
		token,
		function (response) {
			setBusy(false);
			for (var i = 0; i < response.reachInfo.length; i++) {
				if (response.reachInfo[i].reachable) {
					highlightPoi(candidates[i].data, 'marker-green', response.reachInfo[i].routeInfo.distance + 'm', true);
				}
			}

			setBounds(highlightedPois, latlng);
		},
		function (xhr) {
			alert(xhr.responseJSON.errorMessage);
			setBounds([], latlng);
			setBusy(false);
		});
}

function setBounds(features, center) {
	var arr = [];
	for (var i = 0; i < features.length; i++) {
		arr.push(features[i]._latlng);
	}
	if (center)
		arr.push(center);

	if (arr.length) {
		var bounds = new L.LatLngBounds(arr);

		map.fitBounds(bounds);
	} else {
		alert('nothing found!')
	}
}

function cleanupMarkers(keepCircle) {
	for (var i = 0; i < highlightedPois.length; i++) {
		map.removeLayer(highlightedPois[i]);
	}
	highlightedPois = [];

	if (isoFeature)
		map.removeLayer(isoFeature);

	if (marker)
		map.removeLayer(marker);

	if (!keepCircle && circle) {
		map.removeLayer(circle);
		circle = null;
	}
}

function highlightPoi(feature, c, additionalInfo, drawSpiderLine) {
	var latlon = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];

	var popUp = feature.properties.description;
	if (additionalInfo)
		popUp = popUp + '<br>' + additionalInfo;

	var highlightedPoi = L.marker(latlon, {
		zIndexOffset: c === 'marker-red' ? 1000 : 0,
		icon: new L.Icon.Default({
			imagePath: './icons/',
			iconUrl: c + '.png',
			iconRetinaUrl: c + '-2x.png'
		})
	}).addTo(map);
	highlightedPoi.bindPopup(popUp);

	if (drawSpiderLine) {
		var spidlerLineline = L.polyline([searchLocation, latlon], {
			color: 'red',
			weight: 1
		}).addTo(map)
		highlightedPois.push(spidlerLineline);
		spidlerLineline.bindPopup(popUp);
	}

	highlightedPois.push(highlightedPoi);
}

function poiStyle(feature, latlng) {
	var style =
		L.circleMarker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {
			fillColor: '#fff',
			fillOpacity: 1,
			stroke: true,
			color: '#000',
			weight: 2,
			renderFast: true // our special optimization for fast-rendering
		}).setRadius(6);
	style.bindPopup(feature.properties.description);
	return style;
}
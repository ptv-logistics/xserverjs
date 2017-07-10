'use strict';
// url we're sending the request to
var xMapTileUrl = 'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?xtok={token}';
var findAddressUrl = 'https://xserver2-europe-test.cloud.ptvgroup.com/services/rest/XLocate/locations';
var calcIsoUrl = 'https://api-test.cloud.ptvgroup.com/xroute/rs/XRoute/calculateIsochrones';
var calcReachableObjectsUrl = 'https://api-test.cloud.ptvgroup.com/xroute/rs/XRoute/calculateReachableObjects';

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

var colors = {
	'DIY': '#8dd3c7',
	'RET': '#ffffb3',
	'DRG': '#bebada',
	'FRN': '#fb8072',
	'FIN': '#80b1d3',
	'COM': '#fdb462',
	'EAT': '#b3de69',
	'PHA': '#fccde5',
	'KFZ': '#d9d9d9',
	'CLO': '#bc80bd',
	'FOD': '#ccebc5',
	'LEH': '#ccebc5',
	'TVL': '#fb8072',
	'LSR': '#ffffb3',
	'GAS': '#d9d9d9'
};

if (!token)
	alert('you need to configure your xServer internet token in token.js!')

// set up the map
var attribution = '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE';
var mapLocation = new L.LatLng(49, 8.4);

// create a map in the "map" div, set the view to a given place and zoom
var map = new L.Map('map', {
	preferCanvas: true
}).setView(mapLocation, 12);

// insert xMap back- and forground layers with sandbox-style
L.tileLayer(xMapTileUrl, {
	token: window.token,
	attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE',
	maxZoom: 22,
	subdomains: '1234'
}).addTo(map);

// shim: implement missing startsWith();
fixOldIE();

document.getElementById('f1')
    .addEventListener('keyup', function(event) {
	event.preventDefault();
	if (event.keyCode == 13) {
		document.getElementById('b1').click();
	}
});

document.getElementById('f2')
    .addEventListener('keyup', function(event) {
	event.preventDefault();
	if (event.keyCode == 13) {
		document.getElementById('b2').click();
	}
});

// add scale control
L.control.scale().addTo(map);

map.on('click', onMapClick);

// add input control
var info = L.control();
info.onAdd = function (map) {
	var container = document.getElementById('panel-control')

	L.DomEvent.disableClickPropagation(container);
	L.DomEvent.disableScrollPropagation(container);

	return container;
};

info.addTo(map);

// using legend code from http://leafletjs.com/examples/choropleth-example.html
var legend = L.control({
	position: 'bottomright'
});

legend.onAdd = function (map) {
	var div = L.DomUtil.create('div', 'info legend');
	div.innerHTML = '';

	for (var key in colors) {
		if (colors.hasOwnProperty(key)) {
			div.innerHTML +=
				'<i style="background:' + colors[key] + '"></i> ' + key + '<br>';
		}
	}

	return div;
};

legend.addTo(map);

setBusy(true);

//d3.json('https://cdn.rawgit.com/ptv-logistics/xserverjs/98a9f370/premium-samples/poi-locator/inobas.json', initialize);
readCsv('https://rawgit.com/ptv-logistics/xserverjs/master/premium-samples/poi-locator/data/inobas-slim.csv', initialize);

function initialize(pd) {
	// store our data
	poiData = pd;

	// tip: sort the features by latitue, so they overlap nicely on the map!
	poiData.features.sort(function (a, b) {
		return b.geometry.coordinates[1] - a.geometry.coordinates[1];
	});

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

	// set Karlsruhe
	searchLocation = new L.LatLng(49.013301829, 8.4277897486);
	setMarker();
	findNearestObjects();
}

function setBusy(busy) {
	isBusy = busy;

	document.getElementById('myFieldSet').disabled = busy;
}

function setMarker(radius)
{
	cleanupMarkers(true);

	if(radius) {
		circle = L.circle(searchLocation, radius, {
			zIndex: 1000
		}).addTo(map);
	}

	var c = 'marker-red';
	marker = L.marker(searchLocation, {
		zIndexOffset: 1000,
		icon: new L.Icon.Default({
			imagePath: './icons/',
			iconUrl: c + '.png',
			iconRetinaUrl: c + '-2x.png'
		}),
		draggable: true
	}).addTo(map)
	marker.bindPopup(latFormatter(searchLocation.lat) + ', ' + lngFormatter(searchLocation.lng));

	marker.on('dragend', function(e) {
		onMapClick(e.target);
	});	
}

function findNearestObjects() {
	if (!searchLocation)
		return;

	cleanupMarkers();

	if (searchMethod == 0)
		findByAirline(searchLocation, horizon);
	else if (searchMethod == 1)
		findByReachableObjects(searchLocation, horizon);
	else
		findByIso(searchLocation, horizon);
}

function setSearchMethod(method) {
	searchMethod = method;
	findNearestObjects();
}

function setHorizon(hor) {
	horizon = hor;
	findNearestObjects();
}

function onMapClick(e) {
	if (isBusy)
		return;

	searchLocation = e.latlng || e._latlng;
	setMarker();
	findNearestObjects();
}

function readCsv(url, callback) {
	ssv(url, function (rows) {
		var json = {
			type: 'FeatureCollection'
		};

		json.features = rows.map(function (d) {
			var feature = {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: ptvMercatorToWgs(d.X, d.Y)
				},
				properties: {
					id: d.ID,
					category: d.CATEGORY,
					www: d.WWW,
					description: d.NAME
				}
			};

			return feature;
		});

		callback(json);
	});
}

function findFulltext(name) {
	cleanupMarkers();

	var res = index.search(name);

	var found = res.map(function(d) {
		return {
			feature: poiData.features[d.ref],
			info: poiData.features[d.ref].name
		};
	});

	highlightPois(found);

	setBounds(highlightedPois);
}

function findByAddress(adr) {
	setBusy(true);

	d3.json(findAddressUrl + '/' + encodeURIComponent(adr) + (token ? '?xtok=' + token : ''),
		function (error, response) {
			setBusy(false);

			if (error) {
				var message = JSON.parse(error.target.response).errorMessage;			
				alert(message);
				return;
			}

			if(response.results.length === 0)
			{
				alert('nothing found!');
				return;
			}

			var firstResult = response.results[0].location;
			searchLocation = new L.LatLng(firstResult.referenceCoordinate.y, firstResult.referenceCoordinate.x);
			setMarker();
			findNearestObjects();
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

	searchLocation = e.latlng;
	setMarker(circleRadius);

	findNearestObjects();
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
		calcIsoUrl,
		request,
		token,
		function (error, response) {
			setBusy(false);
			
			if (error) {
				var message = JSON.parse(error.target.response).errorMessage;			
				alert(message);
				return;
			}	

			response = JSON.parse(response.responseText);
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

			var pointsInPolygon = poiData.features
				.filter(function(d) {
					return leafletPip.pointInLayer(d.geometry.coordinates, isoFeature).length > 0;
				})
				.map(function(d) {
					return {
						feature: d,
						info: d.name
					}
				});

			highlightPois(pointsInPolygon, true);

			map.fitBounds(isoFeature.getBounds());
		}
	);
}

function filterByAirline(latlng, hor) {
	var range = hor /*=s*/ * 120 /* km/h */ / 3.6 /*=m/s */ ;

	return poiData.features.map(function (d) {
		var poiLocation = d.geometry.coordinates;
		var p = L.latLng(poiLocation[1], poiLocation[0]);
		var distance = latlng.distanceTo(p);
			
		return {
			feature: d,
			distance: distance
		};
	})
	.filter(function (d) {
		return d.distance < range;
	});
}

function findByAirline(latlng, hor) {
	var found = filterByAirline(latlng, hor)
		.map(function(d) {
			return {
				feature: d.feature,
				info: Math.round(d.distance) + 'm'
			};
		});

	highlightPois(found, true);

	setBounds(highlightedPois, latlng);

	setBusy(false);
}

function findByReachableObjects(latlng, hor) {
	var candidates = filterByAirline(latlng, hor);
	var locations = new Array();
	for (var i = 0; i < candidates.length; i++) {
		var location = candidates[i].feature.geometry.coordinates;
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
		calcReachableObjectsUrl,
		request,
		token,
		function (error, response) {
			setBusy(false);
			
			if (error) {
				var message = JSON.parse(error.target.response).errorMessage;			
				alert(message);
				return;
			}	

			response = JSON.parse(response.responseText);

			var found = candidates.map(function(d, i) {
				return {
					feature: d.feature,
					reachInfo: response.reachInfo[i]
				};
			}).filter(function(d) {
				return d.reachInfo.reachable;
			}).map(function(d) {
				return {
					feature: d.feature, 
					info: d.reachInfo.routeInfo.distance + ' m'
				};
			});

			highlightPois(found, true);

			setBounds(highlightedPois, latlng);
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

function cleanupMarkers(cleanupCirlcle) {
	for (var i = 0; i < highlightedPois.length; i++) {
		map.removeLayer(highlightedPois[i]);
	}
	highlightedPois = [];

	if (isoFeature) {
		map.removeLayer(isoFeature);
		isoFeature = null;
	}

	if (cleanupCirlcle && marker) {
		map.removeLayer(marker);
		marker = null;
	}

	if (cleanupCirlcle && circle) {
		map.removeLayer(circle);
		circle = null;
	}
}

function drawSpiderLine(feature, additionalInfo) {
	var latlon = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];

	var popUp = feature.properties.description;
	if (additionalInfo)
		popUp = popUp + '<br>' + additionalInfo;

	var spidlerLineline = L.polyline([searchLocation, latlon], {
		color: 'green',
		weight: 1
	}).addTo(map)
	highlightedPois.push(spidlerLineline);
	spidlerLineline.bindPopup(popUp);
}

function highlightPois(featureInfo, spiderLine) {
	if(spiderLine)
		for(var i = 0; i < featureInfo.length; i++)
			drawSpiderLine(featureInfo[i].feature, featureInfo[i].info);

	for(var i = 0; i < featureInfo.length; i++)
		highlightPoi(featureInfo[i].feature, featureInfo[i].info);
}

function highlightPoi(feature, additionalInfo) {
	var latlon = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];

	var popUp = feature.properties.description;
	if (additionalInfo)
		popUp = popUp + '<br>' + additionalInfo;

	var highlightedPoi = L.circleMarker(latlon, {
		fillColor: 'yellow',
		fillOpacity: 1,
		stroke: true,
		color: '#000',
		boostType: 'balloon',
		boostScale: 1,
		boostExp: 0,
		weight: 2
	}).setRadius(10).addTo(map);
	highlightedPoi.bindPopup(popUp);

	highlightedPois.push(highlightedPoi);
}

function poiStyle(feature, latlng) {
	var style =
		L.circleMarker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {
			fillColor: colors[feature.properties.category],
			fillOpacity: 1,
			stroke: true,
			color: '#000',
			boostType: 'ball',
			boostScale: 2.5,
			boostExp: 0.25,
			weight: 2,
		}).setRadius(6);
	var html = feature.properties.description;
	if (feature.properties.www) {
		var hRef = feature.properties.www;
		if (!hRef.startsWith('http'))
			hRef = 'http://' + hRef;
		html = html + '<br><a target="_blank" href="' + hRef + '">' + feature.properties.www + '</a>';
	}
	style.bindPopup(html);
	return style;
}
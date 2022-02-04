'use strict';
// url we're sending the request to
var xMapTileUrl = 'https://s0{s}-xserver2-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?storedProfile={profile}&xtok={token}';
var findAddressUrl = 'https://xserver2-test.cloud.ptvgroup.com/services/rest/XLocate/locations';
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
var csvRows;
var filter;
var poiLayer;

var colors = {
	'DIY': '#00bf59',
	'RET': '#f1b2ff',
	'DRG': '#e0d400',
	'FRN': '#7fa9da',
	'FIN': '#ffa53f',
	'COM': '#15b4d5',
	'EAT': '#a2ad2e',
	'PHA': '#b19fbb',
	'KFZ': '#5fba3d',
	'CLO': '#ffb3c4',
	'FOD': '#a0ff8c',
	'LEH': '#c7f2ff',
	'TVL': '#ffc58f',
	'LSR': '#71ffd7',
	'GAS': '#d5ffd0'
};

if (!token)
{alert('you need to configure your xServer internet token in token.js!')}

// set up the map
var attribution = '&copy; ' + new Date().getFullYear() + ' PTV AG, HERE';
var mapLocation = new L.LatLng(49, 8.4);

// create a map in the "map" div, set the view to a given place and zoom
var map = new L.Map('map', {
	fullscreenControl: true,
	preferCanvas: true
}).setView(mapLocation, 12);

// insert xMap back- and forground layers with silica-style
L.tileLayer(xMapTileUrl, {
	token: window.token,
	profile: 'blackmarble',
	attribution: '&copy; ' + new Date().getFullYear() + ' PTV AG, HERE',
	maxZoom: 22,
	subdomains: '1234'
}).addTo(map);

map._container.style.background = '#000';

// shim: implement missing startsWith();
fixOldIE();

document.getElementById('f1')
	.addEventListener('keyup', function (event) {
		event.preventDefault();
		if (event.keyCode == 13) {
			document.getElementById('b1').click();
		}
	});

document.getElementById('f2')
	.addEventListener('keyup', function (event) {
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

	var str = '';
	var i = 0;
	str += '<div class="pure-g">';
	for (var key in colors) {
		if (colors.hasOwnProperty(key)) {
			str +=
				'<div class="pure-u-1-3"><i style="background:' + colors[key] + '"></i> ' + key + '</div>';
			if ((i + 1) % 3 === 0 && i > 0 && i < Object.keys(colors).length - 1)
			{str += '</div><div class="pure-g">';}
			i++;
		}
	}
	str += '</div>';

	div.innerHTML = str;

	return div;
};

legend.addTo(map);

setBusy(true);

// d3.json('https://cdn.rawgit.com/ptv-logistics/xserverjs/98a9f370/premium-samples/poi-locator/inobas.json', initializeMap);
ssv('https://raw.githubusercontent.com/ptv-logistics/xserverjs/master/premium-samples/poi-locator/data/inobas-slim.csv', initializeMap);

function initializeMap(rows) {
	setBusy(false);

	// store our data
	csvRows = rows;

	// set Karlsruhe
	searchLocation = new L.LatLng(49.013301829, 8.4277897486);
	setMarker();

	filterPois();
}

function setBusy(busy) {
	isBusy = busy;

	document.getElementById('myFieldSet').disabled = busy;
}

function setMarker(radius) {
	cleanupMarkers(true);

	if (radius) {
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

	marker.on('dragend', function (e) {
		onMapClick(e.target);
	});
}

function findNearestObjects() {
	if (!searchLocation)
	{return;}

	cleanupMarkers();

	if (searchMethod == 0)
	{findByAirline(searchLocation, horizon);}
	else if (searchMethod == 1)
	{findByReachableObjects(searchLocation, horizon);}
	else
	{findByIso(searchLocation, horizon);}
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
	{return;}

	searchLocation = e.latlng || e._latlng;
	setMarker();
	findNearestObjects();
}

function filterPois() {
	var e = document.getElementById('type');
	var value = e.options[e.selectedIndex].value;
	if (value === '---')
	{filter = null;}
	else
	{filter = value;}

	poiData = createJsonFromRows(csvRows);

	if (filter) {
		poiData.features = poiData.features.filter(function (d) {
			return d.properties.category === filter;
		});
	}

	// tip: sort the features by latitue, so they overlap nicely on the map!
	poiData.features.sort(function (a, b) {
		return b.geometry.coordinates[1] - a.geometry.coordinates[1];
	});

	if (poiLayer)
	{map.removeLayer(poiLayer);}

	poiLayer = L.geoJson(poiData, {
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

	// initiate search
	findNearestObjects();
}

/**
 * Loads a semicolon separated text file
 * @param {} url
 * @param {} callback
 */
function ssv(url, callback) {
	var ssvParse = d3.dsvFormat(';');
	d3.request(url)
		.mimeType('text/csv')
		.response(function (xhr) {
			return ssvParse.parse(xhr.responseText);
		})
		.get(callback);
}

/**
 * Creates a GeoJson from our row collection
 * @param {} rows
 */
function createJsonFromRows(rows) {
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

	return json;
}

function findFulltext(name) {
	cleanupMarkers();

	var res = index.search(name);

	var found = res.map(function (d) {
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

			if (response.results.length === 0) {
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
	searchLocation = e.latlng;
	setMarker(e.accuracy);

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
						color: '#aaa',
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
				.filter(function (d) {
					return leafletPip.pointInLayer(d.geometry.coordinates, isoFeature).length > 0;
				})
				.map(function (d) {
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
	var range = hor /* =s*/ * 120 /* km/h */ / 3.6 /* =m/s */ ;

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
		.map(function (d) {
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

			var found = candidates.map(function (d, i) {
				return {
					feature: d.feature,
					reachInfo: response.reachInfo[i]
				};
			}).filter(function (d) {
				return d.reachInfo.reachable;
			}).map(function (d) {
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
	var coords = features.map(function (d) {
		return d._latlng;
	});
	if (center)
	{coords.push(center);}

	if (coords.length) {
		map.fitBounds(new L.LatLngBounds(coords), {maxZoom: 16});
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
	{popUp = popUp + '<br>' + additionalInfo;}

	var spidlerLineline = L.polyline([searchLocation, latlon], {
		color: 'green',
		weight: 1
	}).addTo(map)
	highlightedPois.push(spidlerLineline);
	spidlerLineline.bindPopup(popUp);
}

function highlightPois(featureInfo, spiderLine) {
	if (spiderLine)
	{for (var i = 0; i < featureInfo.length; i++)
	{drawSpiderLine(featureInfo[i].feature, featureInfo[i].info);}}

	for (var i = 0; i < featureInfo.length; i++)
	{highlightPoi(featureInfo[i].feature, featureInfo[i].info);}
}

function highlightPoi(feature, additionalInfo) {
	var latlon = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];

	var popUp = feature.properties.description;
	if (additionalInfo)
	{popUp = popUp + '<br>' + additionalInfo;}

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
		{hRef = 'http://' + hRef;}
		html = html + '<br><a target="_blank" href="' + hRef + '">' + feature.properties.www + '</a>';
	}
	style.bindPopup(html);
	return style;
}
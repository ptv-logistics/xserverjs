'use strict';
var colors = {
	'DIY': '#114477',
	'RET': '#4477AA',
	'DRG': '#77AADD',
	'FRN': '#117755',
	'FIN': '#44AA88',
	'COM': '#99CCBB',
	'EAT': '#777711',
	'PHA': '#AAAA44',
	'KFZ': '#DDDD77',
	'CLO': '#771111',
	'FOD': '#AA4444',
	'LEH': '#DD7777',
	'TVL': '#771144',
	'LSR': '#AA4477',
	'GAS': '#DD77AA'
};

var poiLayer;
var poiData;
var csvRows;
var filter;
var boostType = 'ball';
var boostScale = 1.5;
var boostExp = 0.125;

// set up the map
var mapLocation = new L.LatLng(51.5, 10);

// create a map in the "map" div, set the view to a given place and zoom
var map = new L.Map('map', {
	preferCanvas: true // marker booster needs the canvas
}).setView(mapLocation, 6);

// insert xMap layers with gravelpit-style
var baseMapLayer = L.tileLayer(
	'https://s0{s}-xserver2-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}' + 
	'?storedProfile={profile}&xtok={token}', {
		token: window.token,
		profile: 'gravelpit',
		attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE',
		subdomains: '1234',
		maxZoom: 22
	}).addTo(map);

// add scale control
L.control.scale().addTo(map);

// add input control
var info = L.control();
info.onAdd = function (map) {
	var container = document.getElementById('panel-control')

	L.DomEvent.disableClickPropagation(container);
	L.DomEvent.disableScrollPropagation(container);

	return container;
};

info.addTo(map);

var legend = L.control({
	position: 'bottomright'
});

ssv('https://rawgit.com/oliverheilig/leaflet-marker-booster/master/data/inobas-slim.csv', initialize);

legend.onAdd = function (map) {
	var div = L.DomUtil.create('div', 'info lll');

	var str = '';
	var i = 0;
	str += '<div class="pure-g">';
	for (var key in colors) {
		if (colors.hasOwnProperty(key)) {
			str +=
				'<div class="pure-u-1-3"><i style="background:' + colors[key] + '"></i> ' + key + '</div>';
			if ((i + 1) % 3 === 0 && i > 0 && i < Object.keys(colors).length - 1)
				str += '</div><div class="pure-g">';
			i++;
		}
	}
	str += '</div>';

	div.innerHTML = str;

	return div;
};

legend.addTo(map);

// IE
if (!String.prototype.startsWith) {
	String.prototype.startsWith = function (searchString, position) {
		position = position || 0;
		return this.indexOf(searchString, position) === position;
	};
}

// IE8
if (!Array.prototype.filter) {
	Array.prototype.filter = function (fun /*, thisp */ ) {
		"use strict";

		if (this === void 0 || this === null)
			throw new TypeError();

		var t = Object(this);
		var len = t.length >>> 0;
		if (typeof fun !== "function")
			throw new TypeError();

		var res = [];
		var thisp = arguments[1];
		for (var i = 0; i < len; i++) {
			if (i in t) {
				var val = t[i]; // in case fun mutates this
				if (fun.call(thisp, val, i, t))
					res.push(val);
			}
		}

		return res;
	};
}

function initialize(rows) {
	csvRows = rows;

	poiData = createJsonFromRows(csvRows);

	if (filter) {
		poiData.features = poiData.features.filter(function (d) {
			return d.properties.category === filter;
		});
	}

	// tip: sort the features by latitude, so they overlap nicely on the map!
	poiData.features.sort(function (a, b) {
		return b.geometry.coordinates[1] - a.geometry.coordinates[1];
	});

	resetPoiLayer();
}

function resetPoiLayer() {
	if (poiLayer)
		map.removeLayer(poiLayer);

	poiLayer = L.geoJson(poiData, {
		attribution: 'DDS, Inobas',
		pointToLayer: poiStyle
	}).addTo(map);
}


function poiStyle(feature, latlng) {
	var style =
		L.circleMarker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {
			fillColor: colors[feature.properties.category],
			fillOpacity: 1,
			stroke: true,
			color: '#111',
			weight: 1,
			boostType: boostType,
			boostScale: boostScale,
			boostExp: boostExp
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

function setBoostType(method) {
	switch (method) {
		case 1:
			boostType = 'circle';
			break;
		case 2:
			boostType = 'ball';
			break;
		case 3:
			boostType = 'balloon';
			break;
		default:
			boostType = undefined;
	}

	resetPoiLayer();
}

function setScaleMode(method) {
	switch (method) {
		case 0:
			boostScale = 1;
			boostExp = 0;
			break;
		case 1:
			boostScale = 1.5;
			boostExp = 0.125;
			break;
		case 2:
			boostScale = 3;
			boostExp = 0.25;
			break;
		default:
			boostScale = 6;
			boostExp = 0.325;
	}

	resetPoiLayer();
}

function filterPois() {
	var e = document.getElementById('type');
	var value = e.options[e.selectedIndex].value;
	if (value === '---')
		filter = null;
	else
		filter = value;

	initialize(csvRows);
}

/**
 * Convert a PTV Mercator coordinate to WGS84
 * @param {number} x x-coordinate
 * @param {number} y y-coordinate
 * @returns {Number|Array} the uprojected WGC coordinate
 */
function ptvMercatorToWgs(x, y) {
	// PTV Mercator is actually Google/Web Mercator with a different scale
	var ptvToGoogle = L.Projection.SphericalMercator.R / 6371000;

	// use the Leaflet SphericalMercator projection with scaled input coordinates
	var p = L.Projection.SphericalMercator.unproject(
		L.point(x, y).scaleBy(L.point(ptvToGoogle, ptvToGoogle)));

	return [p.lng, p.lat];
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
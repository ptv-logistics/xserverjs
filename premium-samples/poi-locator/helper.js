// convert a wkt linestring to a closed geoson polygon
function isoToPoly(wkt) {
	x = replaceAll('LINESTRING', '', wkt);
	x = x.trim();
	x = replaceAll(', ', '],[', x);
	x = replaceAll(' ', ',', x);
	x = replaceAll('(', '[', x);
	x = replaceAll(')', ']', x);
	x = '[[' + x + ']]';
	return JSON.parse(x);
}

function escapeRegExp(string) {
	return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}

function replaceAll(find, replace, str) {
	return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

// runRequest executes a json request on PTV xServer internet,
// given the url endpoint, the token and the callback to be called
// upon completion. 
function runRequest(url, request, token, handleSuccess) {
	d3.request(url)
		.header('Authorization', 'Basic ' + btoa('xtok:' + token))
		.header('Content-Type', 'application/json')
		.post(JSON.stringify(request), handleSuccess);
}

function lngFormatter(num) {
	var direction = (num < 0) ? 'W' : 'E';
	var formatted = Math.abs(L.Util.formatNum(num, 3)) + '&ordm; ' + direction;
	return formatted;
}

function latFormatter(num) {
	var direction = (num < 0) ? 'S' : 'N';
	var formatted = Math.abs(L.Util.formatNum(num, 3)) + '&ordm; ' + direction;
	return formatted;
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

	// use the Leaflet Google Projection with scaled input coordinates
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
					category: d.CATEGORY,
					description: d.STORE
				}
			};

			return feature;
		});

		callback(json);
	});
}

// override Leaflet implementation for fast symbol rendering
(function () {
	'use strict';

	var proto = L.Canvas.prototype;
	var prev = proto._updateCircle;

	proto._updateCircle = function (layer) {
		if (!layer.options.onSteroids) {
			return prev.call(this, layer);
		}

		if (!this._drawing || layer._empty()) {
			return;
		}

		var p = {
				x: layer._point.x,
				y: layer._point.y
			},
			ctx = this._ctx,
			r = layer._radius,
			s = (layer._radiusY || r) / r;

		this._drawnLayers[layer._leaflet_id] = layer;

		if (s !== 1) {
			ctx.save();
			ctx.scale(1, s);
		}

		ctx.beginPath();

		if (s !== 1) {
			ctx.restore();
		}

		var zoomScale;
		var scale = Math.pow(this._map.getZoom(), 1.75) * 256 / Math.PI / 6371000;
		var rscale = scale * 1000;
		r = r * rscale;
		p.y = p.y - 2 * r;

		var options = layer.options;

		// if (options.stroke && options.weight !== 0) {
		//     ctx.arc(p.x, p.y / s, r + options.weight, 0, Math.PI * 2, false);
		//     ctx.fillStyle = options.color;
		//     ctx.fill(options.fillRule || 'evenodd');
		// }

		if (options.fill) {
			var grd = ctx.createRadialGradient(p.x - r, p.y - r, 0, p.x, p.y, 2 * r);
			grd.addColorStop(0, options.fillColor);
			grd.addColorStop(1, options.color);
			ctx.beginPath();
			ctx.fillStyle = grd;
			ctx.arc(p.x, p.y / s, 2 * r, 0, Math.PI * 2, false);
			ctx.fill(options.fillRule || 'evenodd');
		}
	};


	var xproto = L.CircleMarker.prototype;
	var xprev = xproto._containsPoint;

	xproto._containsPoint = function (pp) {
		if (!this.options.onSteroids) {
			return xprev.call(this, pp);
		}

		var p = L.point(this._point.x, this._point.y),
			r = this._radius,
			s = (this._radiusY || r) / r;

		var zoomScale;
		var scale = Math.pow(this._map.getZoom(), 1.75) * 256 / Math.PI / 6371000;
		var rscale = scale * 1000;
		r = r * rscale;
		p.y = p.y - 2 * r;

		return p.distanceTo(pp) <= r + this._clickTolerance();
	};

	var cproto = L.Layer.prototype;
	var cprev = cproto._openPopup;
	cproto._openPopup = function (e) {
		var layer = e.layer || e.target;

		if (!layer instanceof L.CircleMarker && !layer.options.onSteroids)
			return cprev(e);

		if (!this._popup) {
			return;
		}

		if (!this._map) {
			return;
		}

		// prevent map click
		L.DomEvent.stop(e);

		// otherwise treat it like a marker and figure out
		// if we should toggle it open/closed
		if (this._map.hasLayer(this._popup) && this._popup._source === layer) {
			this.closePopup();
		} else {
			this.openPopup(layer, layer._latlng);
		}
	};

	var pproto = L.Popup.prototype;
	var pprev = pproto._getAnchor;
	pproto._getAnchor = function () {
		if (!this._source instanceof L.CircleMarker && !this._source.options.onSteroids)
			return cprev(e);

		var r = this._source._radius;
		var zoomScale;
		var scale = Math.pow(this._map.getZoom(), 1.75) * 256 / Math.PI / 6371000;
		var rscale = scale * 1000;
		r = 3 * r * rscale;

		// Where should we anchor the popup on the source layer?
		return L.point(this._source && this._source._getPopupAnchor ? this._source._getPopupAnchor() : [0, -r]);
	};

})();
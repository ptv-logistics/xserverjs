// convert a wkt linestring to a close geoson polygon
function isoToPoly(wkt) {
	x = replaceAll('LINESTRING', '', wkt);
	x = x.trim();
	x = replaceAll(', ', '],[', x);
	x = replaceAll(' ', ',', x);
	x = replaceAll('(', '[', x);
	x = replaceAll(')', ']', x);
	x = '[[' + x + ']]';
	return eval(x);
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

// override Leaflet implementation for fast symbol rendering
(function () {
	'use strict';

	var proto = L.Canvas.prototype;

    // https://github.com/Leaflet/Leaflet/issues/1886
    // Workaround: https://github.com/mapbox/mapbox.js/issues/470
	var prev = proto._updateCircle;

	proto._updateCircle = function (layer) {
		if(!layer.options.renderFast) {
			return prev.call(this, layer);        
		}

		if (!this._drawing || layer._empty()) { return; }

		var p = {x: layer._point.x, y:layer._point.y},
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
		r = r*rscale;
		p.y = p.y - 2*r;

		var options = layer.options;

        // if (options.stroke && options.weight !== 0) {
        //     ctx.arc(p.x, p.y / s, r + options.weight, 0, Math.PI * 2, false);
        //     ctx.fillStyle = options.color;
        //     ctx.fill(options.fillRule || 'evenodd');
        // }

		if (options.fill) {
			var grd=ctx.createRadialGradient(p.x-r, p.y-r, 0, p.x, p.y, 2*r);
			grd.addColorStop(0,options.fillColor);
			grd.addColorStop(1,  options.color);
			ctx.beginPath();
			ctx.fillStyle=grd;
			ctx.arc(p.x, p.y / s, 2*r, 0, Math.PI * 2, false);
			ctx.fill(options.fillRule || 'evenodd');
		}
	};


	var xproto = L.CircleMarker.prototype;

    // https://github.com/Leaflet/Leaflet/issues/1886
    // Workaround: https://github.com/mapbox/mapbox.js/issues/470
	var xprev = xproto._containsPoint;

	xproto._containsPoint = function (pp) {
		if(!this.options.renderFast) {
			return xprev.call(this, pp);        
		}

		var p = L.point(this._point.x, this._point.y),
			r = this._radius,
			s = (this._radiusY || r) / r;

		var zoomScale;
		var scale = Math.pow(this._map.getZoom(), 1.75) * 256 / Math.PI / 6371000;
		var rscale = scale * 1000;
		r = r*rscale;
		p.y = p.y - 2*r;

		return p.distanceTo(pp) <= r + this._clickTolerance();
	};
})();

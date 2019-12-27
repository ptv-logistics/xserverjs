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
	var r = d3.request(url)
		.header('Authorization', 'Basic ' + btoa('xtok:' + token))

	if(token)
	{r.header('Content-Type', 'application/json')}

	r.post(JSON.stringify(request), handleSuccess);
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

function fixOldIE()
{
	if (!String.prototype.startsWith) {
		String.prototype.startsWith = function (searchString, position) {
			position = position || 0;
			return this.indexOf(searchString, position) === position;
		};
	}
};
L.Routing.Ptv = L.Class.extend({
	options: {
		// xRoute url
		serviceUrl: 'https://xserver2-europe-test.cloud.ptvgroup.com/services/rs/XRoute/',
		// token for xServer internet
		token: '',
		// delegate to manipulate the request before send
		beforeSend: null
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
	},

	runRequest: function (url, request, token, handleSuccess, handleError) {
		$.ajax({
			url: url,
			type: 'POST',
			data: JSON.stringify(request),

			headers: function () {
				var h = {
					'Content-Type': 'application/json'
				};
				if (token) h['Authorization'] = 'Basic ' + btoa('xtok:' + token);
				return h;
			}(),

			success: function (data, status, xhr) {
				handleSuccess(data);
			},

			error: function (xhr, status, error) {
				handleError(xhr);
			}
		});
	},

	route: function (waypoints, callback, context, options) {
		var url = this.options.serviceUrl + 'calculateRoute';

		var request = this._buildRouteRequest(waypoints, options);

		var geometryOnly = options && options.geometryOnly;

		var numAlts = geometryOnly ? 0 : this.options.numberOfAlternatives;

		this.runRequest(url, request, this.options.token,
			L.bind(function (response) {
				this._routeDone(response, waypoints, callback, context);
			}, this),

			function (xhr) {
				xhr.message = xhr.responseText;
				callback.call(context, xhr, null);
			}
		);
	},

	_routeDone: function (response, inputWaypoints, callback, context) {
		var alts = [];

		var coordinates = this._buildLinestring(response.polyline.plain.polyline);
		alts.push({
			name: 'Route',
			coordinates: coordinates,
			summary: this._convertSummary(response),
			inputWaypoints: inputWaypoints,
			waypoints: inputWaypoints,
			instructions: []
		});

		callback.call(context, null, alts);
	},


	_buildLinestring: function (inputpoints) {
		var points = [];

		for (var i = 0; i < inputpoints.length; i++) {
			points.push([inputpoints[i].y, inputpoints[i].x]);
		}

		return points;
	},

	_convertSummary: function (response) {
		return {
			totalDistance: response.distance,
			totalTime: response.travelTime
		};
	},

	_buildRouteRequest: function (waypoints, options) {
		var wpCoords = [];
		for (i = 0; i < waypoints.length; i++) {
			wpCoords.push({
				'$type': 'OffRoadWaypoint',
				'location': {
					'offRoadCoordinate': {
						'x': waypoints[i].latLng.lng,
						'y': waypoints[i].latLng.lat
					}
				}
			});
		}

		var geometryOnly = options && options.geometryOnly;

		var numAlts = geometryOnly ? 0 : this.options.numberOfAlternatives;

		var request = {
			'waypoints': wpCoords,
			'resultFields': {
				'polyline': 'true'
			}
		};

		if (typeof this.options.beforeSend === 'function') {
			request = this.options.beforeSend(request);
		}

		return request;
	}
});

L.Routing.ptv = function (options) {
	return new L.Routing.Ptv(options);
};
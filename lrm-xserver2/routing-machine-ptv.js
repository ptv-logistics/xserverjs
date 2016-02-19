L.Routing.Ptv = L.Class.extend({
	options: {
		// xRoute url
		serviceUrl: 'https://xroute-eu-n-test.cloud.ptvgroup.com/xroute/rs/XRoute/',
		// token for xServer internet
		token: '',
		// indicates the back-end is a real xServer that supports heading informations
		supportsHeadings: true,
		// number of alternatives to calculate
		numberOfAlternatives: 0,
		// delegate to manipulate the sent request
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

			headers: {
//				'Authorization': 'Basic ' + btoa('xtok:' + token),
				'Content-Type': 'application/json'
			},

			success: function (data, status, xhr) {
				handleSuccess(data);
			},

			error: function (xhr, status, error) {
				handleError(xhr);
			}
		});
	},

	route: function (waypoints, callback, context, options, currentResponses) {
		var url = this.options.serviceUrl + 'calculateRoute';

		// build current responses on initial call
		var responses;
		if (!currentResponses) {
			responses = [];
		} else {
			responses = currentResponses;
		}

		var request = this._buildRouteRequest(waypoints, options, responses);

		var geometryOnly = options && options.geometryOnly;

		var numAlts = geometryOnly ? 0 : this.options.numberOfAlternatives;

		this.runRequest(url, request, this.options.token,
			L.bind(function (response) {
				responses.push(response);

				if (responses.length > numAlts) {
					this._routeDone(responses, waypoints, callback, context);
				} else {
					this.route(waypoints, callback, context, options, responses);
				}
			}, this),

			function (xhr) {
				console.log(xhr);
				callback.call(context, xhr, null);
			}
		);
	},

	_routeDone: function (responses, inputWaypoints, callback, context) {
		var alts = [];
		for (var i = 0; i < responses.length; i++) {
			var response = responses[i];

			var coordinates = this._buildLinestring(response.polyline.plain.lineString);
			alts.push({
				name: 'Route ' + (i + 1),
				coordinates: coordinates,
				summary: this._convertSummary(response),
				inputWaypoints: inputWaypoints,
				waypoints: inputWaypoints,
				instructions: []
			});
		}

		callback.call(context, null, alts);
	},

	_buildWaypointIndices: function (stations) {
		var waypointIndices = [];
		for (var i = 0; i < stations.length; i++) {
			waypointIndices.push(stations[i].polyIdx);
		}
	},

	_drivingDirectionType: function (manoeuvre) {
		if (!this.options.supportsHeadings) {
			return '';
		}

		switch (manoeuvre.manoeuvreType) {
			case 'UTURN':
				return 'TurnAround';
			case 'ENTER_RA':
			case 'STAY_RA':
			case 'EXIT_RA':
			case 'EXIT_RA_ENTER':
			case 'EXIT_RA_ENTER_FERRY':
				return 'Roundabout';
			case 'FURTHER':
			case 'KEEP':
			case 'CHANGE':
			case 'ENTER':
			case 'EXIT':
			case 'ENTER_FERRY':
			case 'EXIT_FERRY':
				switch (manoeuvre.turnOrient) {
					case 'LEFT':
						return 'SlightLeft';
					case 'RIGHT':
						return 'SlightRight';
					default:
						return 'Straight';
				}
				break;
			case 'TURN':
				switch (manoeuvre.turnOrient) {
					case 'LEFT':
						return (manoeuvre.turnWeight === 'HALF') ? 'SlightLeft' : (manoeuvre.turnWeight === 'STRONG') ? 'SharpLeft' : 'Left';
					case 'RIGHT':
						return (manoeuvre.turnWeight === 'HALF') ? 'SlightRight' : (manoeuvre.turnWeight === 'STRONG') ? 'SharpRight' : 'Right';
					default:
						return 'Roundabout';
				}
				break;
			default:
				return 'Straight';
		}
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

	_buildRouteRequest: function (waypoints, options, currentResponses) {
		var exceptionPaths = [];
		if (currentResponses) {
			for (var i = 0; i < currentResponses.length; i++) {
				exceptionPaths.push(
				{
					binaryPathDesc: currentResponses[i].binaryPathDesc,
					relMalus: 1000
				});
			}
		}

		var wpCoords = [];
		for (i = 0; i < waypoints.length; i++) {
			wpCoords.push({  
				"$type":"CoordinateWaypoint",
				"location":{  
				"x":waypoints[i].latLng.lng,
				"y":waypoints[i].latLng.lat
				}
			});
		}

		var geometryOnly = options && options.geometryOnly;

		var numAlts = geometryOnly ? 0 : this.options.numberOfAlternatives;

		var request = {
			"waypoints": wpCoords,
			"resultFields":{  
				"polyline":"true"
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

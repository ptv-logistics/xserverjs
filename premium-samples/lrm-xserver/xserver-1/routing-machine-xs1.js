L.Routing.Ptv = L.Class.extend({
	options: {
		// xRoute url
		serviceUrl: 'https://api.cloud.ptvgroup.com/xroute/rs/XRoute/',
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

			headers: function () {
				var h = {
					'Content-Type': 'application/json'
				};
				if (token) {h['Authorization'] = 'Basic ' + btoa('xtok:' + token);}
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

	route: function (waypoints, callback, context, options, currentResponses) {
		var url = this.options.serviceUrl + 'calculateRoute';

		// build current responses on initial call
		var responses;
		if (!currentResponses) {
			responses = [];
		} else {
			responses = currentResponses;
		}

		var request = this._buildRouteRequest(waypoints, options, responses)

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
				callback.call(context || callback, {
					status: xhr.status,
					message: xhr.responseJSON ? xhr.responseJSON.errorMessage : xhr.responseText
				});
			}
		);
	},

	_routeDone: function (responses, inputWaypoints, callback, context) {
		var alts = [];
		for (var i = 0; i < responses.length; i++) {
			var response = responses[i];

			var coordinates = this._buildLinestring(response.polygon.lineString.points);
			alts.push({
				name: 'Route ' + (i + 1),
				coordinates: coordinates,
				instructions: this._bulidInstructions(response.manoeuvres, response.segments, response.stations),
				summary: this._convertSummary(response.info),
				inputWaypoints: inputWaypoints,
				waypoints: inputWaypoints,
				waypointIndices: this._buildWaypointIndices(response.stations)
			});
		}

		callback.call(context, null, alts);

		if (typeof this.options.routesCalculated === 'function') {
			this.options.routesCalculated(alts, responses);
		}
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

		switch (manoeuvre.manoeuvreType) 
		{
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

	_bulidInstructions: function (manoeuvres, segments, stations) {
		var instructions = [];

		if (!manoeuvres) {
			return instructions;
		}

		for (var i = 0; i < manoeuvres.length; i++) {
			var manoeuvre = manoeuvres[i];
			instructions.push({
				distance: segments[manoeuvre.routeListSegmentIdx].accDist,
				exit: undefined,
				index: segments[manoeuvre.routeListSegmentIdx].firstPolyIdx,
				time: segments[manoeuvre.routeListSegmentIdx].accTime,
				type: this._drivingDirectionType(manoeuvre),
				modifier: this._drivingDirectionType(manoeuvre),
				text: manoeuvre.manoeuvreDesc
			});
		}

		for (i = stations.length - 1; i >= 0; i--) {
			var station = stations[i];
			instructions.splice(station.manoeuvreIdx, 0, {
				distance: station.accDist,
				exit: undefined,
				index: station.polyIdx,
				time: station.accTime,
				type: (i === stations.length - 1) ? 'DestinationReached' : (i === 0) ? 'Head' : 'WaypointReached',
				text: (i === stations.length - 1) ? 'Destination' : (i === 0) ? 'Start' : 'WayPoint ' + i
			});
		}

		for (i = instructions.length - 1; i > 0; i--) {
			instructions[i].distance = instructions[i].distance - instructions[i - 1].distance;
			instructions[i].time = instructions[i].time - instructions[i - 1].time;
		}

		for (i = 1; i < instructions.length; i++) {
			instructions[i - 1].distance = instructions[i].distance;
			instructions[i - 1].time = instructions[i].time;
		}

		instructions[instructions.length - 1].distance = 0;
		instructions[instructions.length - 1].time = 0;

		return instructions;
	},

	_buildLinestring: function (inputpoints) {
		var points = [];

		for (var i = 0; i < inputpoints.length; i++) {
			points.push([inputpoints[i].y, inputpoints[i].x]);
		}

		return points;
	},

	_convertSummary: function (info) {
		return {
			totalDistance: info.distance,
			totalTime: info.time
		};
	},

	_buildRouteRequest: function (waypoints, options, currentResponses) {
		var exceptionPaths = [];
		if (currentResponses) {
			for (var i = 0; i < currentResponses.length; i++) {
				exceptionPaths.push({
					binaryPathDesc: currentResponses[i].binaryPathDesc,
					relMalus: 1000
				});
			}
		}

		var wpCoords = [];
		for (i = 0; i < waypoints.length; i++) {
			wpCoords.push({
				coords: [{
					point: {
						x: waypoints[i].latLng.lng,
						y: waypoints[i].latLng.lat
					}
				}],
				linkType: 'NEXT_SEGMENT'
			});
		}

		var geometryOnly = options && options.geometryOnly;

		var numAlts = geometryOnly ? 0 : this.options.numberOfAlternatives;

		var request = {
			waypoints: wpCoords,
			options: [],
			exceptionPaths: exceptionPaths,
			details: {
				binaryPathDesc: currentResponses.length < numAlts, // last route doesn't need exception paths
				detailLevel: 'STANDARD',
				polygon: true,
				manoeuvres: !geometryOnly,
				segments: !geometryOnly
			},
			callerContext: {
				properties: [{
					key: 'CoordFormat',
					value: 'OG_GEODECIMAL'
				}]
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
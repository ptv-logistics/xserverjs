L.Routing.Ptv = L.Class.extend({
	options: {
		// xRoute url
		serviceUrl: 'https://xserver2-test.cloud.ptvgroup.com/services/rs/XRoute/',
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
				if (token) { h['Authorization'] = 'Basic ' + btoa('xtok:' + token); }
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

	_drivingDirectionType: function (inst, manoeuvre, i, n) {
		if(manoeuvre.eventType === "ROUTE_VIOLATION_EVENT") {
			inst.text = manoeuvre.accessType + " " + manoeuvre.violationType;
			return;
		}

		switch (manoeuvre.maneuverType) {
			case "START":
			case "START_LEFT":
			case "START_RIGHT":
				if (i === 0)
					inst.type = "Head";
				break;
			case "ARRIVE":
			case "ARRIVE_LEFT":
			case "ARRIVE_RIGHT":
				inst.type = (i === n - 1) ? "DestinationReached" : "WaypointReached"
				break;
			case "TAKE_ROUNDABOUT_LEFT":
			case "TAKE_ROUNDABOUT_RIGHT":
				inst.type = "Roundabout";
				break;
		}

		switch (manoeuvre.maneuverType) {
			case "START_LEFT":
			case "ARRIVE_LEFT":
			case "ENTER_LEFT":
			case "EXIT_LEFT":
			case "TURN_LEFT":
			case "TAKE_ROUNDABOUT_LEFT":
				inst.modifier = "Left";
				break;
			case "KEEP_LEFT":
			case "TURN_HALF_LEFT":
			case "CHANGE_LEFT":
				inst.modifier = "SlightLeft";
				break;
			case "TURN_SHARP_LEFT":
				inst.modifier = "SharpLeft";
				break;
			case "START_RIGHT":
			case "ARRIVE_RIGHT":
			case "ENTER_RIGHT":
			case "EXIT_RIGHT":
			case "TURN_RIGHT":
			case "TAKE_ROUNDABOUT_RIGHT":
				inst.modifier = "Right";
				break;
			case "KEEP_RIGHT":
			case "TURN_HALF_RIGHT":
			case "CHANGE_RIGHT":
				inst.modifier = "SlightRight";
				break;
			case "TURN_SHARP_RIGHT":
				inst.modifier = "SharpRight";
				break;
			case "KEEP_STRAIGHT":
				inst.modifier = "Straight";
				break;
			case "MAKE_U_TURN":
				inst.modifier = "Uturn";
				break;
			case "TAKE_COMBINED_TRANSPORT":
			case "ENTER":
			case "EXIT":
			case "CHANGE":
				break;
			case "START":
			case "ARRIVE":
			case "CONTINUE":
				break;
		}
	},

	_bulidInstructions: function (events) {
		var instructions = [];

		for (var i = 0; i < events.length; i++) {
			var manoeuvre = events[i];
			var inst = {
				distance: manoeuvre.distanceFromStart,
				time: manoeuvre.travelTimeFromStart,
				text: manoeuvre.directionDescription,
				coordinate: L.latLng(manoeuvre.coordinate.y, manoeuvre.coordinate.x)
			};
			this._drivingDirectionType(inst, manoeuvre, i, events.length);
			instructions.push(inst);
		}

		return instructions;
	},

	_routeDone: function (response, inputWaypoints, callback, context) {
		var alts = [];

		alts.push({
			name: 'Route' + (response.violated? " (!)" : ""),
			instructions: this._bulidInstructions(response.events),
			coordinates: this._buildLinestring(response.polyline.plain.polyline),
			summary: this._convertSummary(response),
			inputWaypoints: inputWaypoints,
			waypoints: inputWaypoints
		});

		if (response.alternativeRoutes)
			for (var i = 0; i < response.alternativeRoutes.length; i++) {
				var alt = response.alternativeRoutes[i];
				alts.push({
					name: "Alt " + (i + 1) + (alt.violated? " (!)" : ""),
					coordinates: this._buildLinestring(alt.polyline.plain.polyline),
					summary: this._convertSummary(alt),
					instructions: [],
					inputWaypoints: inputWaypoints,
					waypoints: inputWaypoints
				})
			}

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

		var request = {
			'waypoints': wpCoords,
			'resultFields': {
				'polyline': 'true',
				'alternativeRoutes': waypoints.length <= 2,
				'eventTypes': ['MANEUVER_EVENT', 'ROUTE_VIOLATION_EVENT'] //, 'WAYPOINT_EVENT']
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
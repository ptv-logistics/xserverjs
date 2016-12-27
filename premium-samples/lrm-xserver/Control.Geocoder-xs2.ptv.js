L.Control.Geocoder.Ptv = L.Class.extend({
	options: {
		// xLocate url
		serviceUrl: 'https://xserver2-dev.cloud.ptvgroup.com/services/rest/XLocate/locations/',
		// token for xServer internet
		token: ''
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
	},
	
	runRequest: function (url, request, token, handleSuccess, handleError) {
		$.ajax({
			url: url + request.address + '?xtok=' + token,
			type: 'GET'
		,
		success: function (data, status, xhr) {
				handleSuccess(data);
			},

		error: function (xhr, status, error) {
			handleError(xhr);
		}});
	},

	_buildAddressString: function (address) {
		var street = (address.street + ' ' + address.houseNumber).trim();
		var city = (address.postalCode + ' ' + address.city).trim();
		city = (address.state + ' ' + city).trim();

		if (!street) {
			return city;
		}
		else if (!city) {
			return street;
		}
		else {
			return street + ', ' + city;
		}
	},

	geocode: function (query, cb, context) {
		var url = this.options.serviceUrl;

		var request = {
			address: query
		};

		this.runRequest(url, request, this.options.token,
			L.bind(function (response) {
				var results = [];
				for (var i = response.results.length - 1; i >= 0; i--) {
					var resultAddress = response.results[i];
					var loc = L.latLng(resultAddress.location.referenceCoordinate.y, resultAddress.location.referenceCoordinate.x);
					results[i] = {
						name: this._buildAddressString(resultAddress.location.address),
						center: loc,
						bbox: L.latLngBounds(loc, loc)
					};
				}
				cb.call(context, results);
			}, this),

			function (xhr) {
				console.log(xhr);
			}
		);
	},

	// use xlocate1 for reverse geocoding
	
	runPostRequest: function (url, request, token, handleSuccess, handleError) {
		$.ajax({
			url: url,
			type: 'POST',
			data: JSON.stringify(request),

			headers: {
				'Authorization': 'Basic ' + btoa('xtok:' + token),
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

	reverse: function (location, scale, cb, context) {
		var url = 'https://api-test.cloud.ptvgroup.com/xlocate/rs/XLocate/findLocation';

		var request = {
			location: {
				coordinate: {
					point: {
						x: location.lng,
						y: location.lat
					}
				}
			},
			options: [],
			sorting: [],
			additionalFields: [],
			callerContext: {
				properties: [
				{
					key: 'CoordFormat',
					value: 'OG_GEODECIMAL'
				},
				{
					key: 'Profile',
					value: 'default'
				}]
			}
		};

		this.runPostRequest(url, request, this.options.token,
			L.bind(function (response) {
				if (response.resultList.length === 0) {
					return;
				}

				var resultAddress = response.resultList[0];
				var loc = L.latLng(resultAddress.coordinates.point.y, resultAddress.coordinates.point.x);
				cb.call(context, [{
					name: this._buildAddressString(resultAddress),
					center: loc,
					bounds: L.latLngBounds(loc, loc)
				}]);
			}, this),

			function (xhr) {
				console.log(xhr);
			}
		);
	}
});

L.Control.Geocoder.ptv = function (options) {
	return new L.Control.Geocoder.Ptv(options);
};

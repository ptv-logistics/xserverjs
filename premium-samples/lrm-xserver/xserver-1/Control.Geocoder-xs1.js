L.Control.Geocoder.Ptv = L.Class.extend({
	options: {
		// xLocate url
		serviceUrl: 'https://api.cloud.ptvgroup.com//xlocate/rs/XLocate/',
		// token for xServer internet
		token: '',
		// predefines the country for single-field search
		fixedCountry: ''
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

	_buildAddressString: function (address) {
		var street = (address.street + ' ' + address.houseNumber).trim();
		var city = (address.postCode + ' ' + address.city).trim();
		city = (address.state + ' ' + city).trim();
		if (!this.options.fixedCountry) {
			city = (address.country + ' ' + city).trim();
		}

		if (!street) {
			return city;
		} else if (!city) {
			return street;
		} else {
			return street + ', ' + city;
		}
	},

	geocode: function (query, cb, context) {
		var url = this.options.serviceUrl + 'findAddressByText';

		var request = {
			address: query,
			country: this.options.fixedCountry,
			options: [],
			sorting: [],
			additionalFields: [],
			callerContext: {
				properties: [{
					key: 'CoordFormat',
					value: 'OG_GEODECIMAL'
				},
				{
					key: 'Profile',
					value: 'default'
				}
				]
			}
		};

		this.runRequest(url, request, this.options.token,
			L.bind(function (response) {
				var results = [];
				for (var i = response.resultList.length - 1; i >= 0; i--) {
					var resultAddress = response.resultList[i];
					var loc = L.latLng(resultAddress.coordinates.point.y, resultAddress.coordinates.point.x);
					results[i] = {
						name: this._buildAddressString(resultAddress),
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

	reverse: function (location, scale, cb, context) {
		var url = this.options.serviceUrl + 'findLocation';

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
				properties: [{
					key: 'CoordFormat',
					value: 'OG_GEODECIMAL'
				},
				{
					key: 'Profile',
					value: 'default'
				}
				]
			}
		};

		this.runRequest(url, request, this.options.token,
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
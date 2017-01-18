L.Control.Geocoder.Ptv = L.Class.extend({
	options: {
		// xLocate url
		serviceUrl: 'https://xserver2-europe-test.cloud.ptvgroup.com/services/rest/XLocate/locations/',
		// token for xServer internet
		token: ''
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
	},

	runRequest: function (url, request, token, handleSuccess, handleError) {
		$.ajax({
			url: url + encodeURIComponent(request.address) + '?xtok=' + token,
			type: 'GET'
			,
			success: function (data, status, xhr) {
				handleSuccess(data);
			},

			error: function (xhr, status, error) {
				handleError(xhr);
			}
		});
	},


	// Creates the address string to show in the result list.
	_buildAddressString: function (loc) {
		if (loc.formattedAddress) {
			return loc.formattedAddress;
		}

		// if no formatted address is available, build our own
		var address = loc.address;

		var street = '';
		if (address.street) {
			street = address.street;
		}
		if (address.houseNumber) {
			street = (street + ' ' + address.houseNumber).trim();
		}

		var city = '';
		if (address.city && address.city.name) {
			city = address.city.name;
		}
		if (address.postalCode) {
			city = (address.postalCode + ' ' + city).trim();
		}

		if (address.state) {
			city = (address.state + ' ' + city).trim();
		}

		if (address.countryName) {
			city = (address.countryName + ' ' + city).trim();
		}

		if (address.region && address.region.name) {
			city = (city + ' (' + address.region.name + ')').trim();
		}


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
						name: this._buildAddressString(resultAddress.location),
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
	}
});

L.Control.Geocoder.ptv = function (options) {
	return new L.Control.Geocoder.Ptv(options);
};

L.Control.Geocoder.Ptv = L.Class.extend({
	options: {
		// xLocate url
		serviceUrl: 'https://api-xstwo.cloud.ptvgroup.com/services/rest/XLocate/2.0/searchlocations/',
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
					var loc = L.latLng(resultAddress.location.roofTop.y, resultAddress.location.roofTop.x);
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

	reverse: function (query, cb, context) {
		//NOT IMPLEMENTED
	}
});

L.Control.Geocoder.ptv = function (options) {
	return new L.Control.Geocoder.Ptv(options);
};

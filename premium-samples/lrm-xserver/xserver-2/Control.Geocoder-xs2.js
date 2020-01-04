if(!L.Control.Geocoder) {L.Control.Geocoder = {};}

L.Control.Geocoder.Ptv = L.Class.extend({
	options: {
		// xLocate url
		serviceUrl: '',
		// token for xServer internet
		token: ''
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
	},

	runGetRequest: function (url, request, token, handleSuccess, handleError) {
		$.ajax({
			url: url + encodeURIComponent(request.address) + '?xtok=' + token,
			type: 'GET',

			success: function (data, status, xhr) {
				handleSuccess(data);
			},

			error: function (xhr, status, error) {
				handleError(xhr);
			}
		});
	},

	runPostRequest: function (url, request, token, handleSuccess, handleError) {
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

	// using standard xLocate geocoding as suggest/autocompletion
	suggest: function(query, cb, context) {
		return this.geocode(query, cb, context);
	},
	
	geocode: function (query, cb, context) {
		var url = this.options.serviceUrl + '/rest/XLocate/locations/';

		var request = {
			address: query
		};

		this.runGetRequest(url, request, this.options.token,
			L.bind(function (response) {
				var results = [];
				if (!response.results || response.results.length === 0)
				{return;}
				for (var i = response.results.length - 1; i >= 0; i--) {
					var resultAddress = response.results[i];
					var loc = L.latLng(resultAddress.location.referenceCoordinate.y, resultAddress.location.referenceCoordinate.x);
					results[i] = {
						name: resultAddress.location.formattedAddress,
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
		var url = this.options.serviceUrl + '/rs/XLocate/experimental/searchLocations';

		var request = {
			'$type': 'SearchByPositionRequest',
			coordinate: {
				x: location.lng,
				y: location.lat
			},
			requestProfile: {
				mapLanguage: 'x-ptv-DFT'
			}
		};

		this.runPostRequest(url, request, this.options.token,
			L.bind(function (response) {
				if (!response.results || response.results.length === 0)
				{return;}

				var resultAddress = response.results[0];
				var loc = L.latLng(resultAddress.location.referenceCoordinate.y, resultAddress.location.referenceCoordinate.x);
				cb.call(context, [{
					name: resultAddress.location.formattedAddress,
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
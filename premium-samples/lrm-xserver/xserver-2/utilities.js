/**
 * Get initial lat/lng for map setup
 * @param {String} name lat/lng
 * @param {Number} defaultValue
 * @return {Number} initial lat/lng for map setup
 */
function getParameterByName(name, defaultValue) {
	var match = RegExp('[?&]' + name + '=([^&]*)').exec(document.location.href);
	return (match && decodeURIComponent(match[1].replace(/\+/g, ' '))) || defaultValue;
}

/**
 * Extend functionality of Leaflet Control
 */
L.Control.ErrorControl = L.Control.extend({
	options: {
		'position': 'topright',
		'error' : null,
		'width' : '200px'
	},
        
	// on adding the control to the specified map
	onAdd: function(map) {
		this._container = L.DomUtil.create('div', 'controlPanel');
		var content  = '<div style="min-width:260px;width:' + this.options.width + ';word-wrap:break-word">'; 
		var message = this.options.error.message;
		if (this.options.error.faultInfo) {
			content += '<h4><b>' + this.options.error.faultInfo.$type + '</b></h4>'; 
			content += message + '<br/>'; 
			if(this.options.error.faultInfo.hint)
			{content += this.options.error.faultInfo.hint;}
		} else {
			var faultType = this.options.error.faultType;
			content += '<h4><b>' + faultType.substr(faultType.lastIndexOf('.') + 1) + '</b></h4>'; 
			content += message + '<br/>';
		}

		content +='</div>';
		this._container.innerHTML += content;

		if (L.DomEvent) {
			L.DomEvent.disableClickPropagation(this._container);
			L.DomEvent.disableScrollPropagation(this._container);
		}
		return this._container;
	},

});


/**
 * Correction of UTC date
 */
function correctUTCDate(date) {
	var now = new Date();
	// '-' and '.' are allowed as separators for date items.
	// Partial date values, beginning from year, are allowed, see (?: )? groups
	var dateArray = /(\d*)(?:[-.](\d*)(?:[-.](\d*))?)?/.exec(date) || []; 
	dateArray[1] = ('0000' + parseInt(dateArray[1] || now.getFullYear())).slice(-4); // Year
	dateArray[2] = ('0' + parseInt(dateArray[2] || now.getMonth() + 1).keepBetween(1, 12)).slice(-2); // Month
	dateArray[3] = ('0' + parseInt(dateArray[3] || now.getDate()).keepBetween(1, daysInMonth(dateArray[1], dateArray[2]))).slice(-2); // Day
	return dateArray.slice(1, 4).join('-');
};

/**
 * Correction of UTC time
 */
function correctUTCTime(time) {
	var now = new Date(); 
	// ':' and '.' are allowed as separators for date items.
	// Partial date values, beginning from hour, are allowed, see (?: )? groups
	var timeArray = /(\d*)(?:[:.](\d*)(?:[:.](\d*))?)?/.exec(time) || [];
	timeArray[1] = ('0' + parseInt(timeArray[1] || now.getHours()).keepBetween(0, 23)).slice(-2); // Hours
	timeArray[2] = ('0' + parseInt(timeArray[2] || now.getMinutes()).keepBetween(0, 59)).slice(-2); // Minutes
	timeArray[3] = ('0' + parseInt(timeArray[3] || now.getSeconds()).keepBetween(0, 59)).slice(-2); // Seconds
	return timeArray.slice(1, 4).join(':');
};

/**
 * Keep number in the range defined by min and max
 */
Number.prototype.keepBetween = function (min, max) {
	return Math.max(Math.min(this, max), min);
};

/**
 * Return number of days for month and year.
 * Month is 1 based
 */
function daysInMonth(year, month) {
	return new Date(year, month, 0).getDate();
};
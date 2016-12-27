### Basic Setups for Map Widgets

#### Leaflet Basic Setup (xserver-internet)
[Demo](http://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet.1.0.html)
```javascript
        var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

        var baseMapLayer = L.tileLayer(
		'https://s0{s}-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}/' +
		'silkysand?xtok=' + token,
		{
			attribution: '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
			subdomains: '1234',
            maxZoom: 22
        }).addTo(map);
```

#### Leaflet Basic Setup (on-premise)
[Demo](http://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet.1.0.html)
```javascript
        var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

        var baseMapLayer = L.tileLayer(
		'http://127.0.0.1:50000/services/rest/XMap/tile/{z}/{x}/{y}/' +
		'silkysand?xtok=' + token,
		{
			attribution: '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
            maxZoom: 22
        }).addTo(map);
```

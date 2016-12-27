### L.TileLayer.ClickableTiles

#### As single map
[Demo](http://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet-Clickable.1.0.html)
```javascript
        var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

        var interactiveTileLayer = L.TileLayer.clickableTiles(
		'https://s0{s}-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}/' +
		'silkysand+PTV_TruckAttributes/json?xtok=' + token,
		{
			attribution: '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
			subdomains: '1234',
            maxZoom: 22
        }).addTo(map);
```

#### As layered map
[Demo](http://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet-Clickable-Layered.html)
```javascript
        var coordinate = L.latLng(49.01405, 8.4044); // KA
        var radius = 250; // m

        var map = L.map('map').setView(coordinate, 14);

        var basemapLayer = L.tileLayer(
		'https://s0{s}-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}/' +
		'silkysand?xtok=' + token,
		{
			attribution: '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
			subdomains: '1234',
            maxZoom: 22,
			pane: 'tilePane'
        }).addTo(map);

        var circle = L.circle(coordinate, radius / Math.cos(coordinate.lng / 2 / Math.PI), {
			color: 'red',
			fillColor: 'orange',
			fillOpacity: 0.5,
            pane: 'overlayPane'
		}).addTo(map).bindPopup("I am a circle.");

        var truckAttributesLayer = L.TileLayer.clickableTiles(
		'https://s0{s}-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}/' +
		'silkysand-background-transport-labels+PTV_TruckAttributes/json?xtok=' + token,
		{
			attribution: '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
			subdomains: '1234',
            maxZoom: 22,
			pane: 'shadowPane'
        }).addTo(map);
```

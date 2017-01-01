### Basic Setups for Map Widgets

#### Leaflet Basic Setup

[Demo](http://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet.1.0.html)

##### xserver-internet

```javascript
var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

var baseMapLayer = L.tileLayer(
    'https://s0{s}-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}/silkysand' +
    '?xtok=' + token
	{
        attribution: '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
        subdomains: '1234',
        maxZoom: 22
    }).addTo(map);
```

##### on-premise

```javascript
var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

var baseMapLayer = L.tileLayer(
    'http://127.0.0.1:50000/services/rest/XMap/tile/{z}/{x}/{y}/silkysand',
	{
        attribution: '<a href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
        maxZoom: 22
    }).addTo(map);
```

#### OpenLayers2 Basic Setup

[Demo](http://ptv-logistics.github.io/xserverjs/boilerplate/OpenLayers2.html)

##### xserver-internet

```javascript
var raster = new OpenLayers.Layer.XYZ(
    'BaseMap', [
        'https://s01-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/${z}/${x}/${y}?xtok=' + token,
        'https://s02-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/${z}/${x}/${y}?xtok=' + token,
        'https://s03-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/${z}/${x}/${y}?xtok=' + token,
        'https://s04-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/${z}/${x}/${y}?xtok=' + token
        ], {
            sphericalMercator: true
        }
    );
```

##### on-premis

```javascript
var raster = new OpenLayers.Layer.XYZ(
    'BaseMap', [
            'http:127.0.0.1:50000/services/rest/XMap/tile/${z}/${x}/${y}
        ], {
            sphericalMercator: true
        }
    );
```

#### OpenLayers3 Basic Setup

[Demo](http://ptv-logistics.github.io/xserverjs/boilerplate/OpenLayers3.html)

##### xserver-internet

```javascript
var raster = new ol.layer.Tile({
    source: new ol.source.XYZ({
        urls: [
            'https://s01-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?xtok=' + token,
            'https://s02-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?xtok=' + token,
            'https://s03-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?xtok=' + token,
            'https://s04-xserver2-dev.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?xtok=' + token
        ],
        layer: 'xmap', maxZoom: 22
    })
});
```

##### on-premise

```javascript
var raster = new ol.layer.Tile({
    source: new ol.source.XYZ({
        urls: [
            'http:127.0.0.1:50000/services/rest/XMap/tile/{z}/{x}/{y}'
        ],
        layer: 'xmap', maxZoom: 22
    })
});
```

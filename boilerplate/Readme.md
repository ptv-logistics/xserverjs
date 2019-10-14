### Basic Setups for Map Widgets

This section contains templates to initialize a basic xMapServer-2 base map. Read [here](https://github.com/ptv-logistics/xserverjs/tree/master/boilerplate/xmap-1) for xMapServer-1 samples.

#### Leaflet Basic Setup

[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet.1.0.html)

##### xserver-internet

```javascript
var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

var baseMapLayer = L.tileLayer(
    'https://s0{s}-xserver2-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?storedProfile={profile}' +
    '&xtok={token}', {
        token: window.token,
        profile: 'silkysand',
      	attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE',
        subdomains: '1234',
        maxZoom: 22
    }).addTo(map);  
```

##### on-premise

```javascript
var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

var baseMapLayer = L.tileLayer(
    'http://127.0.0.1:50000/services/rest/XMap/tile/{z}/{x}/{y}?storedProfile={profile}', {	
        profile: 'silkysand',
        attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE',
        maxZoom: 22
    }).addTo(map);
```

#### Aerial/Road Hybrid Maps

A hybrid map with HERE aerial imagery and PTV overlay can be achieved by creating a mesh-up of multiple tile layers. A Leaflet TileLayer with a HERE tile-URI and one or more PTV TileLayers (excluding the background) can be inserted to the same Leaflet Map instance. The PTV layer *PTV_TruckAttributes* and *PTV_TrafficIncidents* can also be made clickable (using L.TileLayer.XServer).

[Source Code](https://github.com/ptv-logistics/xserverjs/blob/master/boilerplate/Leaflet-Satellite.html)
[Source Code with Click-Interaction](https://github.com/ptv-logistics/xserverjs/blob/master/boilerplate/Leaflet-Satellite-Clickable.html)


#### OpenLayers2 Basic Setup

[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/OpenLayers2.html)

##### xserver-internet

```javascript
var raster = new OpenLayers.Layer.XYZ(
    'BaseMap', [
            'https://s01-xserver2-test.cloud.ptvgroup.com/services/rest/XMap/tile/${z}/${x}/${y}?xtok=' + token,
            'https://s02-xserver2-test.cloud.ptvgroup.com/services/rest/XMap/tile/${z}/${x}/${y}?xtok=' + token,
            'https://s03-xserver2-test.cloud.ptvgroup.com/services/rest/XMap/tile/${z}/${x}/${y}?xtok=' + token,
            'https://s04-xserver2-test.cloud.ptvgroup.com/services/rest/XMap/tile/${z}/${x}/${y}?xtok=' + token
        ], {
            sphericalMercator: true
        }
    );
```

##### on-premise

```javascript
var raster = new OpenLayers.Layer.XYZ(
    'BaseMap', [
            'http:127.0.0.1:50000/services/rest/XMap/tile/${z}/${x}/${y}'
        ], {
            sphericalMercator: true
        }
    );
```

#### OpenLayers3 Basic Setup

[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/OpenLayers3.html)

##### xserver-internet

```javascript
var raster = new ol.layer.Tile({
    source: new ol.source.XYZ({
        urls: [
            'https://s01-xserver2-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?xtok=' + token,
            'https://s02-xserver2-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?xtok=' + token,
            'https://s03-xserver2-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?xtok=' + token,
            'https://s04-xserver2-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}?xtok=' + token
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


#### KendoUI Basic Setup

[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/KendoUI.html)

##### xserver-internet

```javascript
function createMap() {
    $("#map").kendoMap({
        center: [49.01405, 8.4044],
        zoom: 10,
        layers: [{
            type: 'tile',
            urlTemplate: 'https://s0#= subdomain #-xserver2-test.cloud.ptvgroup.com/services/rest/XMap/tile/' +
            '#= zoom #/#= x #/#= y #?xtok=' + token,
            subdomains: ['1', '2', '3', '4'],
            attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE'
        }]
    });
}
```

##### on-premise
```javascript
function createMap() {
    $("#map").kendoMap({
       center: [49.01405, 8.4044],
        zoom: 10,
        layers: [{
            type: 'tile',
            urlTemplate: 'http://127.0.0.1:50000/services/rest/XMap/tile/#= zoom #/#= x #/#= y #',
            attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE'
        }]
    });
}
```

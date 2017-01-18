### L.TileLayer.ClickableTiles

leaflet-xserver provides a new layer class `L.TileLayer.ClickableTiles` that can be used to make xServer elements clickable. To use this layer, include the file `TileLayer.ClickableTiles.js` for the corresponding Leaflet version.

#### As single map
[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet-Clickable.1.0.html)

Create a new `ClickableTiles` layer and append a clickable xServer-Layer (`PTV_TruckAttirbues`) to the profile, the symbols of the layer can now be clicked to display the object information. The options are the same as for `L.TileLayer`

```javascript
var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

var interactiveTileLayer = L.TileLayer.clickableTiles(
    'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}/' +
    '{profile}+PTV_TruckAttributes/json?xtok={token},
    {       
        profile: 'silkysand',
        token: token,       
        attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
        subdomains: '1234',
        maxZoom: 22
}).addTo(map);
```

#### As layered map
[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet-Clickable-Layered.1.0.html)

It's also possible to split the xMapServer map into separate Leaflet layers. This sample creates a standard xMapServer basemap-layer and a clickable truck attributes overlay. A client-side layer `L.Circle`can then be added between the two xMapServer layers by assigning them to different panes (`tilePane`, `overlayPane` and  `shadowPane`).

```javascript
var coordinate = L.latLng(49.01405, 8.4044); // KA
var radius = 250; // m

var map = L.map('map').setView(coordinate, 14);

var basemapLayer = L.tileLayer(
      'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}/' +
      '{profile}-background-transport-labels+PTV_TruckAttributes/json?xtok={token}',
      {
        profile: 'silkysand',
        token: token,
        attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
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
    'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}/' +
    '{profile}-background-transport-labels+PTV_TruckAttributes/json?xtok={token}',
    {
        profile: 'silkysand',
        token: token,
        attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
        subdomains: '1234',
        maxZoom: 22,
        pane: 'shadowPane'
    }).addTo(map);
```

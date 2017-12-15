### Basic Setups for Map Widgets

This section contains templates to add an xMap-1 basemap to JavaScript widgets. For advanced samples with additional xMap-1 content, you can also check these external projects:

* https://github.com/ptv-logistics/Leaflet.PtvLayer (Pois, TILoader-Layer, RoadEditor-Layer)
* https://github.com/ptv-logistics/fl-labs (Feature Layers)

#### Leaflet Basic Setup (for 0.7 and 1.0)

[Demo Leaflet 1.0](https://ptv-logistics.github.io/xserverjs/boilerplate/xmap-1/Leaflet.1.0.html)

[Demo Leaflet 0.7](https://ptv-logistics.github.io/xserverjs/boilerplate/xmap-1/Leaflet.0.7.html)

The recommended configuration for xMapServer-1 is the use of the WMS adapter. For this purpose we provide the package [leaflet.nontiledlayer](https://www.npmjs.com/package/leaflet.nontiledlayer), which you can add to your project.

```javascript
<script src="https://unpkg.com/leaflet@1.2.0/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.nontiledlayer@1.0.6/dist/NonTiledLayer.js"></script>
<script src="./token.js"></script>
<script>
    // initialize leaflet
    var map = new L.Map('map', {});

    // center Karlsruhe
    map.setView(new L.LatLng(49.01, 8.4), 16);

    // using the xServer WMS adapter
    var xMapWmsUrl = 'https://api-test.cloud.ptvgroup.com/WMS/WMS?xtok=' + token;
    var xMapTileUrl = 'https://api{s}-test.cloud.ptvgroup.com/WMS/GetTile/xmap-silkysand-bg/{x}/{y}/{z}.png';

    // on-premise
    // var xMapWmsUrl = 'http://localhost:50010/WMS/WMS;
    // var xMapTileUrl = 'localhost:50010/WMS/GetTile/xmap-silkysand-bg/{x}/{y}/{z}.png';

    var xMapAttribution = '<a href="http://www.ptvgroup.com">PTV<\/a>, HERE';

    // add (tiled) background layer
    var background = L.tileLayer(xMapTileUrl, {
        maxZoom: 19,
        minZoom: 0,
        opacity: 1.0,
        noWrap: false,
        attribution: xMapAttribution,
        subdomains: '1234'
    }).addTo(map);

    // add (non-tiled) label layer. Insert at tile pane
    var labels = L.nonTiledLayer.wms(xMapWmsUrl, {
        maxZoom: 19,
        minZoom: 0,
        opacity: 1.0,
        layers: 'xmap-silkysand-fg',
        format: 'image/png',
        transparent: true,
        attribution: xMapAttribution,
        pane: 'tilePane'
        zIndex:3
    }).addTo(map);
</script>
```

#### OpenLayers 2

[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/xmap-1/OpenLayers2.html)

[Source Code](https://github.com/ptv-logistics/xserverjs/blob/master/boilerplate/xmap-1/OpenLayers2.html)

#### OpenLayers 3

[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/xmap-1/OpenLayers3.html)

[Source Code](https://github.com/ptv-logistics/xserverjs/blob/master/boilerplate/xmap-1/OpenLayers3.html)

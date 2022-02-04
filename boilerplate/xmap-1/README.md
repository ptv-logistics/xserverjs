### Basic Setups for Map Widgets

This section contains templates to add an xMap-1 basemap to JavaScript widgets. 

**Note:** For advanced samples with additional xMap-1 content, you can also check these external projects:

* https://github.com/ptv-logistics/Leaflet.PtvLayer (Pois, TILoader-Layer, RoadEditor-Layer)
* https://github.com/ptv-logistics/fl-labs (Feature Layers)

#### Leaflet Basic Map Setup (for 0.7.x and 1.x)

[Demo Leaflet 1.x](https://ptv-logistics.github.io/xserverjs/boilerplate/xmap-1/Leaflet.1.0.html)

[Demo Leaflet 0.7.x](https://ptv-logistics.github.io/xserverjs/boilerplate/xmap-1/Leaflet.0.7.html)

The recommended configuration for xMapServer-1 is the use of the WMS adapter. For this purpose we provide the package [leaflet.nontiledlayer](https://www.npmjs.com/package/leaflet.nontiledlayer), which you can add to your project.

```javascript
<script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.nontiledlayer@1.0.7/dist/NonTiledLayer.js"></script>
<script>
    // initialize leaflet
    var map = new L.Map('map', {});

    // center Karlsruhe
    map.setView(new L.LatLng(49.01, 8.4), 16);
    
    var baseProfile = 'silkysand';

    // using the xServer WMS adapter
    var xMapWmsUrl = 'https://api-test.cloud.ptvgroup.com/WMS/WMS?xtok={token}';
    var xMapTileUrl = 'https://api{s}-test.cloud.ptvgroup.com/WMS/GetTile/{profile}/{x}/{y}/{z}.png';

    // on-premise
    // var xMapWmsUrl = 'http://localhost:50010/WMS/WMS;
    // var xMapTileUrl = 'http://localhost:50010/WMS/GetTile/{profile}/{x}/{y}/{z}.png';

    var xMapAttribution = '&copy; ' + new Date().getFullYear() + '&copy; ' + new Date().getFullYear() + ' PTV AG, TomTom';

    // add (tiled) background layer
    var background = L.tileLayer(xMapTileUrl, {
        maxZoom: 19,
        minZoom: 0,
        opacity: 1.0,
        noWrap: false,
        profile: 'xmap-' + baseProfile '-bg',
        attribution: xMapAttribution,
        subdomains: '1234' // for xserver-internet
    }).addTo(map);

    // add (non-tiled) label layer. Insert at tile pane
    var labels = L.nonTiledLayer.wms(xMapWmsUrl, {
        maxZoom: 19,
        minZoom: 0,
        opacity: 1.0,
        layers: 'xmap-' + baseProfile + '-fg',
        format: 'image/png',
        transparent: true,
        attribution: xMapAttribution,
        pane: 'tilePane',
        zIndex:3,
        token: '<your xserver-inernet token>'
    }).addTo(map);
</script>
```

#### OpenLayers 2

[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/xmap-1/OpenLayers2.html)

[Source Code](https://github.com/ptv-logistics/xserverjs/blob/master/boilerplate/xmap-1/OpenLayers2.html)

#### OpenLayers 3

[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/xmap-1/OpenLayers3.html)

[Source Code](https://github.com/ptv-logistics/xserverjs/blob/master/boilerplate/xmap-1/OpenLayers3.html)

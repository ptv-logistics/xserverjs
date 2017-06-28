Administrative Regions
======================

Administrative regions are polygons defined by the borders of administrative units. These units can be countries, districts or postal code areas. Administrative regions can be utilized for many helpful use cases:

* Visualize administrative borders
* Aggregate your location data based on adminsitrative regions
* Create thematic (Choropleth) maps. These visualize quntitative data, like population density, purchasing power or individual sales per region.
* Define custom regions by merging underlyig admin regions.

Our partner [digital data services gmbh](http://www.ddsgeo.de/) provides both geography and the corresponding socio-economic data in various formats. The most popular format is [GeoJSON](http://geojson.org/). GeoJSON can be processed directly in JavaScript and Leaflet, and also [directly displayed on GitHub](https://github.com/ptv-logistics/xserverjs/blob/master/premium-samples/admin-regions/data/municipalities.json),

### Add admininstrative regions as GeoJSON to the map

Required services:

* PTV xMapServer2

Note: The sample loads the region data from the folder containing the web-page. For security reasons these are blocked on chrome an IE. You must run this application from a web-folder or use Firefox.

[Demo](https://ptv-logistics.github.io/xserverjs/premium-samples/admin-regions/)

[Source Code](https://github.com/ptv-logistics/xserverjs/blob/master/premium-samples/admin-regions/index.html)

Leaflet has a layer to display GeoJSON data. We load the data with jquery $.getJSON function. Note: you cannot run this sample directly from the file, because the browser blocks direct file access! To use this code you have to run it from a web server (IIS or Apache).

```javascript
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.1.0/leaflet.js"></script>

$.getJSON("./data/municipalities.json", function (data) {
    municipalitiesLayer = L.geoJson(data).addTo(map);
});
```

After loading we can add styling and interactions to the polygons.

### Reduce the size with TopoJSON

[Demo](https://ptv-logistics.github.io/xserverjs/premium-samples/admin-regions/admin-regions-topo)

[Source Code](https://github.com/ptv-logistics/xserverjs/blob/master/premium-samples/admin-regions/admin-regions-topo.html)

Administrative regions usually define a "topology". This means they don't have to be stored as independent polygons, but as their common borders.  [TopoJSON](https://github.com/topojson/topojson) is an extension to GeoJSON that uses this potential. To convert GeoJson to TopoJson we can use the site http://mapshaper.org/, drop our GeoJSON, and download it as TopoJSON. The resulting files are about [30% of the GeoJSON size](https://github.com/ptv-logistics/xserverjs/blob/master/premium-samples/admin-regions/data).

To load the data in leaflet, we have to include the topojson.js and an extension to the Leaflet GeoJSON layer to handle the topojson format. The initialization of this layer is the same as for GeoJSON.

```javascript
<script src="https://cdnjs.cloudflare.com/ajax/libs/topojson/2.2.0/topojson.min.js"></script>
<script src="./L.TopoJSON.js"></script>

$.getJSON("./data/municipalities.json", function (data) {
    municipalitiesLayer = L.topoJson(data).addTo(map);
});
```

### Create custom regions by merging admin regions with D3

[Demo](https://ptv-logistics.github.io/xserverjs/premium-samples/admin-regions/admin-regions-merge)

[Source Code](https://github.com/ptv-logistics/xserverjs/blob/master/premium-samples/admin-regions/admin-regions-merge.html)

One benefit of TopoJSON is the ability to merge neighbouring regions by removing their common border. The library [D3](https://d3js.org/) has a merge function for topology regions. We can filter the merge function for a specific set of ids. The result can be added to our layer containing the custom regions.

```javascript
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/4.4.0/d3.min.js"></script>

var newTopo = topojson.merge(topoData, topoData.objects.postcode.geometries.filter(function (d) {
    return customSet.has(d.properties.id); }));
customLayer.addLayer(L.topoJson(newTopo));
```

### Other scenarios

While these samples can be implemented only with pure JavaScript, there are scenarios which require more complex data. This data usually cannot be handled by the browser directly and has to be "pre rendered" by a middle-ware. There are many samples in the web for this practice and we provide some tutorials for C# on GitHub:

https://github.com/ptv-logistics/SharpMap.Widgets

https://github.com/ptv-logistics/SpatialTutorial/wiki

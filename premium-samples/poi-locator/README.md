PoiLocator
==========

A  tutorial on building mobile-friendly Web Apps to search on user-POIs by proximity or full text, using only plain JavaScript and PTV xServer. 

[Demo](https://ptv-logistics.github.io/xserverjs/premium-samples/poi-locator)

Required services:

* PTV xMapServer-2 to display the base map
* PTV xLocateServer-2 to search a geo-location for an address
* PTV xRouteServer-1 for 1:n routing and isochrone calculation

The JavaScript libraries used:

* [d3](https://jquery.com/) - a library we use to load and transform our data
* [Leaflet](http://leafletjs.com/) - a JavaScript library for mobile-friendly interactive maps 
* [Leaflet-pip](https://github.com/mapbox/leaflet-pip) - a simple point-in-polygon function in JavaScript to find all POIs within an isochrone 
* [lunr.js](http://lunrjs.com/) - a full text search engine in JavaScript to find all POIs matching a text.

Note: The sample loads the POI data from the folder containing the web-page. For security reasons these are blocked on chrome an IE. You must run this application from a web-folder or use Firefox.

## Set-up the base map
First, you need to set-up your html to include a Leaflet map. This quick-start-guide shows the required steps http://leafletjs.com/examples/quick-start.html. The initial setup that displays the basemap around Hamburg:

```js
// set up the map
var mapLocation = new L.LatLng(53.550556, 9.993333); // HH
    
// create a map in the "map" div, set the view to a given place and zoom
var map = new L.Map('map').setView(mapLocation, 14);

// initialize xServer-internet basemap with silkysand-style
var xMapTileUrl = 'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}/{profile}?xtok={token}';
L.tileLayer(xMapTileUrl, {
    profile: 'silkysand',
    token: window.token,
    attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, TOMTOM',
    maxZoom: 22,
    subdomains: '1234'
}).addTo(map);
```

## Prepare your data

Now we want to display our locations on the map. The easiest way for Leaflet is to provide the data as [GeoJson](http://geojson.org/). We have some old location data stored in a Microsoft Access database (.mdb). Here is [a tool which reads the .mdb and writes it to a text-file as GeoJson](https://github.com/ptv-logistics/PoiLocator/tree/master/tools/mdbtojson). You need Visual Studio or [C# Express for Desktop](http://www.microsoft.com/en-us/download/details.aspx?id=40787) to run the tool. The same practice should also apply to Excel, .csv or "real" databases.

GeoJson needs the coordinates as [WGS84](http://de.wikipedia.org/wiki/World_Geodetic_System_1984) values, which is some kind of de-facto standard for web maps.

1. **If your source table has a Longitude- and Latitude-field (or Lon,Lat or WGS_x,WGS_y or similar)** - Then you're fine. This is what Leaflet expects.
2. **If your data uses PTV coordinate formats (PTV_GEODECIMAL, PTV_MERCATOR, ...)** - Then you can use these code snippets, for [Java](http://rextester.com/QEY56375) and [.NET](http://rextester.com/WGC52360) which does the conversion for the various PTV formats. You can also try it online [here](http://jsil.org/try/#7029947). Before saving the point, you can convert it to Wgs84 with the Trans() function.
3. **If you have coordinates in other spatial reference systems** - Then you should try to find out what kind of coordinates these are and use some 3rd-party tools to transform into WGS84. Or just jump to point 4.
4. **If your data isn't geocoded (that means you only have addresses without coordinates)** - Then you can use PTV xLocate which is part of your xServer internet subscription. [You find a tutorial how to use xServer in C# here](http://xserver.ptvgroup.com/en-uk/cookbook/c/accessing-ptv-xserver-internet-in-net-applications/).
 
A good resource for testing your output is [GeoJsonLint](http://geojsonlint.com/).
## Add your data to the map 
In our web application we could load the JSON using jQuery. But for static data it is easier to embed it as JavaScript source. We just take the json.txt output of our tool, add a ```var poiData =``` at the beginning and a ```;``` at the end, so it looks like this. 

Now we can insert the data with the L.geoJson layer, using a custom poi-style that uses a grey push-pin and binds the description as popup.
```js
// add our POIs
$.getJSON('./inobas.json', initialize);

function initialize(pd) {
    // store our data
    poiData = pd;

    L.geoJson(poiData, {
        attribution: 'DDS, Inobas',
        pointToLayer: poiStyle
    }).addTo(map);
}

function poiStyle(feature, latlng) {
    var style = L.circleMarker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {
        fillColor: '#aaa',
        fillOpacity: 1,
        stroke: true,
        color: '#000',
        weight: 2,
        renderFast: true
    }).setRadius(6);
    style.bindPopup(feature.properties.description);
    return style;
}
```       

## Search by proximity 
Now we can view all our POIs and get the name when we click/tap on it. Next we want to find all POIs in range of a specific location. We implement two Versions for setting the source: 1. By clicking on the map and 2. By entering an address.

### Set the search location by clicking in the map
We have a ```js searchLocation``` variable that defines the origin for the search. It is a Leaflet LatLng value holding the Location as a WGS84 coordinate. 
```js
var searchLocation;
map.on('click', onMapClick);

function onMapClick(e) {
    searchLocation = e.latlng;
    findNearestObjects();
}
```

### Set the search location by geocoding
If you don't know the location on the map, but have an address, you can geocode the address to return a geographic Location. PTV xLocateServer returns a list of coorindates for an input text. To invoke the request in JavaScript, there is a tool function ```runGetRequest``` in the helper.js file which das a GET call using jQuery. We just take the first result address (the best match) and set it as our ```searchLocation```. 
```js
var findAddressUrl = 'https://xserver2-europe-test.cloud.ptvgroup.com/services/rest/XLocate/locations';

function findByAddress(adr) {
    setBusy(true);

    runGetRequest(
        findAddressUrl,
        "D " + adr,  // use Germany as fixed country
        token,
        function (response) {
            var firstResult = response.results[0].location;
            searchLocation = new L.LatLng(firstResult.referenceCoordinate.y, firstResult.referenceCoordinate.x);
            findNearestObjects();
        },
        function (xhr) {
            alert(xhr.responseJSON.errorMessage);
            setBusy(false);
        });
}
```

### Find by Airline distance
Now we want to get all Locations within a range "as the crow flies". For a horizon (defined in seconds) we calculate the range a pedestrian can move in meters, assuming he moves with a speed of 6 km/h. Now we calcalute the distance (with the Leaflet function ```latlng.distanceTo()```) for each POI from our source and return all POIs those distances are within the range.
```js
function filterByAirline(latlng, hor) {
    var result = new Array();
    var range = hor /*=s*/ * 120 /* km/h */ / 3.6 /*=m/s */;

    for (var i = 0; i < poiData.features.length; i++) {
        var poiLocation = poiData.features[i].geometry.coordinates;
        var p = L.latLng(poiLocation[1], poiLocation[0]);
        var distance = latlng.distanceTo(p);
        if (distance < range) {
            result.push({ distance: distance, data: poiData.features[i] });
        }
    }
            
    return result;
}
```
### Find by Routing
Of course this is not realistic, because you cannot walk as the crow flies. A more exact calculation is the distance calculation using the PTV xRouteServer. xRouteServer has a method called ```calculateReachableObjects```. For a given set of candidates, it calculates if there's a route with a smaller distance, and also returns the routed distance. The candidates for our reachable objects are the locations we filtered by airline. The xRoute gets the source, the candidates, the horizon and the profile for pedestrian routing. Like for xLocate, we invoke the xRoute with our ```runRequest``` helper method. 
```js
var searchForReachableObjectsUrl = 'https://xroute-eu-n-test.cloud.ptvgroup.com/xroute/rs/XRoute/calculateReachableObjects';

function findByReachableObjects(latlng, hor) {
    var candidates = filterByAirline(latlng, hor);
    var locations = new Array();
    for (var i = 0; i < candidates.length; i++) {
        var location = candidates[i].data.geometry.coordinates;
        locations.push({
            "coords": [{
                "point": {
                    "x": location[0],
                    "y": location[1]
                }
            }],
            "linkType": "NEXT_SEGMENT"
        });
    }

    var request = {
        "sink": {
            "coords": [{
                "point": {
                    "x": latlng.lng,
                    "y": latlng.lat
                }
            }],
            "linkType": "NEXT_SEGMENT"
        },
        "binaryPathDesc": null,
        "locations": locations,
        "options": [],
        "expansionDesc": {
            "expansionType": "EXP_TIME",
            "horizons": [
                 hor
             ]
        },
        "callerContext": {
            "properties": [{
                "key": "CoordFormat",
                "value": "OG_GEODECIMAL"
            }, {
                "key": "ResponseGeometry",
                "value": "WKT"
            }, {
                "key": "Profile",
                "value": "pedestrian"
            }]
        }
    };

    runRequest(
        searchForReachableObjectsUrl,
        request,
        token,
        function (response) {
            for (var i = 0; i < response.reachInfo.length; i++) {
                if (response.reachInfo[i].reachable) {
                    highlightPoi(candidates[i].data, 'marker-green', response.reachInfo[i].routeInfo.distance + "m");
                }
            }

            setBounds(highlightedPois, latlng);
        },
        function (xhr) {
            alert(xhr);
        });
}
```
### Find by Isochrone
Another elegant way is the use of "isochrones". Outgoing from a source, an isochrone is the region of all locations that can be reached within a certain horizon. PTV xRouteServer lets us calcluate an isochrone with the function ```calculateIsochrones```. We can fetch this isochrone in the client and only have to check which of our POIs are contained in the isochrone polygon. We can use the Leaflet plugin [Leaflet-pip](https://github.com/mapbox/leaflet-pip) for this.
```js
var isoUrl = 'https://xroute-eu-n-test.cloud.ptvgroup.com/xroute/rs/XRoute/calculateIsochrones';

function findByIso(latlng, hor) {
    var request = {
        "sink": {
            "coords": [{
                "point": {
                    "x": latlng.lng,
                    "y": latlng.lat
                }
            }],
            "linkType": "NEXT_SEGMENT"
        },
        "options": [],
        "isoOptions": {
            "isoDetail": "POLYS_ONLY",
            "polygonCalculationMode": "NODE_BASED",
            "expansionDesc": {
                "expansionType": "EXP_TIME",
                "horizons": [hor]
            }
        },
        "callerContext": {
            "properties": [{
                "key": "CoordFormat",
                "value": "OG_GEODECIMAL"
            }, {
                "key": "ResponseGeometry",
                "value": "WKT"
            }, {
                "key": "Profile",
                "value": "pedestrian"
            }]
        }
    };

    runRequest(
        isoUrl,
        request,
        token,
        function (response) {
            var x = isoToPoly(response.isochrones[0].polys.wkt);
            var feature = {
                "type": "Feature",
                "properties": {
                    "style": {
                        weight: 4,
                        color: "#222",
                        opacity: 1,
                        fillColor: "#fff",
                        fillOpacity: 0.5
                    }
                }
            };

            feature.geometry = {
                type: 'Polygon',
                coordinates: x
            };

            isoFeature = L.geoJson([feature], {
                style: function (feature) {
                    return feature.properties && feature.properties.style;
                }
            });

            isoFeature.on('click', onMapClick);

            for (var i = 0; i < poiData.features.length; i++) {
                if (leafletPip.pointInLayer(poiData.features[i].geometry.coordinates, isoFeature).length > 0) {
                    highlightPoi(poiData.features[i], 'marker-green');
                }
            }

            isoFeature.addTo(map);

            map.fitBounds(isoFeature.getBounds());
         },
         function (xhr) {
             alert(xhr):
         });
}
```
## Search by text 
At last we add a function to search a POI by it's description text with [lunr.js](http://lunrjs.com/).
```js
// create full text index
var index = lunr(function () {
    this.field('description', {
        boost: 10
    })
    this.ref('id')
})

for (var i = 0; i < poiData.features.length; i++) {
    index.add({
        id: i,
        description: poiData.features[i].description
    });
}

function findFuzzy(name) {
    cleanupMarkers();

    var res = index.search(name);
    for (var i = 0; i < res.length; i++) {
        highlightPoi(poiData.features[res[i].ref], 'marker-green');
    }
    setBounds(highlightedPois);
}
```

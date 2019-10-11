# leaflet-routing-machine for PTV xServer
This project shows how to use http://www.liedman.net/leaflet-routing-machine/ with PTV xServer.

[Demo](https://ptv-logistics.github.io/xserverjs/premium-samples/lrm-xserver/xserver-2/)

Required services:

* PTV xMapServer-2
* PTV xLocateServer-2
* PTV xRouteServer-2

The additional classes required to use PTV xServer with leaflet-routing-machine:

## L.Control.Geocoder.Ptv
The PTV xLocate-2 implementation of the geocoder for routing-machine.

Supported options:
* *serviceUrl* - The url for PTV xLocate. Default: ''https://xserver2-test.cloud.ptvgroup.com/services/rest/XLocate/locations/''
* *token* - The token for xServer internet access. Default: ''

## L.Routing.Ptv
The PTV xRoute-2 implementation of the router for routing-machine.

Supported options:
* *serviceUrl* - The url for PTV xRoute. Default: 'https://xserver2-test.cloud.ptvgroup.com/services/rs/XRoute/'
* *token* - The token for xServer internet access. Default: ''
* *supportsHeadings* - indicates the back-end is an xServer that supports heading informations. Default: true
* *numberOfAlternatives* - Number of alternatives to calculate. Default: 0
* *beforeSend* - A delegate to manipulate the sent request. Default: null

## leaflet-xserver

https://www.npmjs.com/package/leaflet-xserver

Support for automatic Leaflet attribution and clickable FeatureLayers.

# leaflet-routing-machine for PTV xServer
This project shows how to use http://www.liedman.net/leaflet-routing-machine/ with PTV xServer.

[Demo](http://ptv-logistics.github.io/xserverjs/premium-samples/lrm-xserver)

## L.Control.Geocoder.Ptv
The PTV xLocate implementation of the geocoder for routing-machine.

Supported options:
* *serviceUrl* - The url for PTV xLocate. Default: 'https://xlocate-eu-n-test.cloud.ptvgroup.com/xlocate/rs/XLocate/'
* *token* - The token for xServer internet access. Default: ''
* *fixedCountry* - A country that can be predefined for single-field search

## L.Routing.Ptv
The PTV xRoute implementation of the router for routing-machine.

Supported options:
* *serviceUrl* - The url for PTV xRoute. Default: 'https://xroute-eu-n-test.cloud.ptvgroup.com/xroute/rs/XRoute/'
* *token* - The token for xServer internet access. Default: ''
* *supportsHeadings* - indicates the back-end is an xServer that supports heading informations. Default: true
* *numberOfAlternatives* - Number of alternatives to calculate. Default: 0
* *beforeSend* - A delegate to manipulate the sent request. Default: null

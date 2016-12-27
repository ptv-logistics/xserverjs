# leaflet-routing-machine for PTV xServer
This project shows how to use http://www.liedman.net/leaflet-routing-machine/ with PTV xServer.

Demo: http://ptv-logistics.github.io/lrm-ptv/

To use this code, you need a PTV xMapServer installation or an xServer internet subscription. Go to http://xserver.ptvgroup.com/en-uk/products/ptv-xserver-internet/test/ to get a trial token.

This is also the base for some more advanced samples, e.g. "Feature-Layer Labs" https://github.com/ptv-logistics/fl-labs/.

The additional classes required to use PTV xServer with leaflet-routing-machine:

## L.NonTiledLayer.WMS
Provides an implementation to support single-tile WMS layers for Leaflet, similar to L.TileLayer.WMS. This is required to add xMapServer content as Leaflet layer. See here for details: https://github.com/ptv-logistics/Leaflet.NonTiledLayer

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
* *supportsHeadings* - indicates the back-end is a real xServer that supports heading informations. Default: true
* *numberOfAlternatives* - Number of alternatives to calculate. Default: 0
* *beforeSend* - A delegate to manipulate the sent request. Default: null

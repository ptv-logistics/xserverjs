L.TileLayer.MetaInfoTiles = L.TileLayer.extend({
    includes: L.Mixin.Events,
    runRequest: function (url, handleSuccess, handleError) {
		corslite(url, function(err, resp) {
			// resp is the XMLHttpRequest object
			handleSuccess(JSON.parse(resp.responseText));
		}, true); // cross origin?
    },

    findElement: function (e, container) {
        // this. is the image!
        var mp = L.DomEvent.getMousePosition(e, container);

        for (var i = container._layers.length - 1; i >= 0 ; i--) {
            var layer = container._layers[i];
            if ((layer.pixelReferencePoint.x - 8 <= mp.x) && (layer.pixelReferencePoint.x + 8 >= mp.x) &&
                (layer.pixelReferencePoint.y - 8 <= mp.y) && (layer.pixelReferencePoint.y + 8 >= mp.y)) {
                return layer;
            }
        }

        return null;
    },

    _onMouseMove: function (e) {        
        if (!this._map || this._map.dragging._draggable._moving || this._map._animatingZoom) { return; }

        if (this._tileLayer.findElement(e, this))
            L.DomUtil.addClass(this, 'leaflet-interactive'); // change cursor
        else {
            L.DomUtil.removeClass(this, 'leaflet-interactive');
        }
    },

    _onClick: function (e) {
        var found = this._tileLayer.findElement(e, this);
        if (found) {
            e.preventDefault();

            L.popup()
                .setLatLng(found.latLng)
                .setContent(found.description
                   .replace(/\|/g, "<br>") // Insert line breaks instead of pipe symbols
                   .replace(/=/g, ": ") // Use colon instead of mathematical looking equal signs
                   .replace(/[A-Z]/g, " $&") // Camel case notation eliminated by insertion of a blank
                   .toLowerCase())
                .openOn(map);

            e.stopPropagation();
            return false;
        }
    },

    pixToLatLng: function (tileKey, point) {
        var earthHalfCircum = Math.PI;
        var earthCircum = earthHalfCircum * 2.0
        var arc = earthCircum / Math.pow(2, tileKey.z);
        var x = -earthHalfCircum + (tileKey.x + (point.x / 256.0)) * arc;
        var y = earthHalfCircum - (tileKey.y + (point.y / 256.0)) * arc;

        return L.latLng(
            (360 / Math.PI) * (Math.atan(Math.exp(y)) - (Math.PI / 4)),
            (180.0 / Math.PI) * x);
    },

    createTile: function (coords, done) {
        var tile = document.createElement('img');
        tile.style['pointer-events'] = 'auto';
        tile._map = map;
        tile._layers = [];
        tile._tileLayer = this; 
        
         L.DomEvent.on(tile, 'load', L.bind(this._tileOnLoad, this, done, tile));
         L.DomEvent.on(tile, 'error', L.bind(this._tileOnError, this, done, tile));

        if (this.options.crossOrigin) {
            tile.crossOrigin = '';
        }

        /*
         Alt tag is set to empty string to keep screen readers from reading URL and for compliance reasons
         http://www.w3.org/TR/WCAG20-TECHS/H67
        */
        tile.alt = '';      

        var url = this.getTileUrl(coords);
                
        this.runRequest(url,
           L.bind(function (resp) {
               var prefixMap = {
                   "iVBOR": "data:image/png;base64,",
                   "R0lGO": "data:image/gif;base64,",
                   "/9j/4": "data:image/jpeg;base64,",
                   "Qk02U": "data:image/bmp;base64,"
               };

               var rawImage = resp.image;
               tile.src = prefixMap[rawImage.substr(0, 5)] + rawImage;

               if (resp.drawnObjects)
               {
                  L.DomEvent
                   .on(tile, 'mousemove', L.Util.throttle(this._onMouseMove, 32, tile), tile)
                   .on(tile, 'click', this._onClick, tile);
                 
                  var objectInfos = resp.drawnObjects;
                  for (var i = 0; i < objectInfos.length; i++) {
                     var oi = objectInfos[i];
                     oi.latLng = this.pixToLatLng(coords, oi.pixelReferencePoint);
                     tile._layers.push(oi);
                  }
                }
           }, this), 
           function (xhr) {
           });

        return tile;
    }
    
    
});


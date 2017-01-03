L.TileLayer.ClickableTiles = L.TileLayer.extend({
    includes: L.Mixin.Events,

    initialize: function(url, options) {
         this._isOverlay = options.isOverlay;                                           

        L.TileLayer.prototype.initialize.call(this, url, options);
    },

    onAdd: function(map) {
        this._resetQueue();

        L.TileLayer.prototype.onAdd.call(this, map);

        cont = map._container;

        L.DomEvent
           .on(cont, 'mousemove', this._onMouseMove, this) //L.Util.throttle(this._onMouseMove, 32, tile), tile)
           .on(cont, 'mousedown', this._onMouseDown, this)
           .on(cont, 'click', this._onClick, this);
    },

    onRemove: function(map) {
        this._resetQueue();

        L.TileLayer.prototype.onRemove.call(this, map);
    },

    _initContainer: function() {
        var tilePane = this.options.pane? this.options.pane : this._map._panes.tilePane;

        if (!this._container) {
            this._container = L.DomUtil.create('div', 'leaflet-layer');

            this._updateZIndex();

            if (this._animated) {
                var className = 'leaflet-tile-container';

                this._bgBuffer = L.DomUtil.create('div', className, this._container);
                this._tileContainer = L.DomUtil.create('div', className, this._container);

            } else {
                this._tileContainer = this._container;
            }

            this._tileContainer.style.zIndex = this.options.zIndex;

            tilePane.appendChild(this._container);
            
            this._map._container.style['pointer-events'] = 'auto';

            if (this.options.opacity < 1) {
                this._updateOpacity();
            }
        }
    },

    findElement: function(e, container) {
        if (!container)
            return null;

        var tiles = Array.prototype.slice.call(container.getElementsByTagName('img')),
            i, len, tile;

        for (i = 0, len = tiles.length; i < len; i++) {
            tile = tiles[i];
            var mp = L.DomEvent.getMousePosition(e, tile);

            for (var j = tile._layers.length - 1; j >= 0; j--) {
                var layer = tile._layers[j];
				var width = Math.abs(layer.pixelBoundingBox.right - layer.pixelBoundingBox.left);
				var height = Math.abs(layer.pixelBoundingBox.top - layer.pixelBoundingBox.bottom);
                if ((layer.referencePixelPoint.x - width/2 <= mp.x) && (layer.referencePixelPoint.x + width/2 >= mp.x) &&
                    (layer.referencePixelPoint.y - height/2 <= mp.y) && (layer.referencePixelPoint.y + height/2 >= mp.y)) {
                    return layer;
                }
            }
        }

        return null;
    },

    _onMouseMove: function(e) {
        if (!this._map || this._map.dragging._draggable._moving || this._map._animatingZoom) {
            return;
        }

        if (this.findElement(e, this._container)) {
            e.preventDefault();

            this._container.style['pointer-events'] = 'auto';
    
            L.DomUtil.addClass(this._container, 'leaflet-clickable'); // change cursor
        } else {
            this._container.style['pointer-events'] = 'none';

            L.DomUtil.removeClass(this._container, 'leaflet-clickable');
        }
    },

     _onMouseDown: function(e) {
        var found = this.findElement(e, this._container);
        if (found) {
            e.preventDefault();

            e.stopPropagation();
            return false;
        }
    },

    _onClick: function(e) {
        var found = this.findElement(e, this._container);
        if (found) {
            e.preventDefault();

            var description = '';
            for (var i = 0; i < found.attributes.length; i++) {
                var attribute = found.attributes[i];
                description = description.concat(
                    attribute.key.replace(/[A-Z]/g, " $&") + ': ' +
                    attribute.value.replace("_", " ") + '<br>');
            }

            L.popup()
                .setLatLng(found.latLng)
                .setContent(description
                    .toLowerCase())
                .openOn(map);

            e.stopPropagation();
            return false;
        }
    },

    pixToLatLng: function(tileKey, point) {
        var earthHalfCircum = Math.PI;
        var earthCircum = earthHalfCircum * 2.0
        var arc = earthCircum / Math.pow(2, tileKey.z);
        var x = -earthHalfCircum + (tileKey.x + (point.x / 256.0)) * arc;
        var y = earthHalfCircum - (tileKey.y + (point.y / 256.0)) * arc;

        return L.latLng(
            (360 / Math.PI) * (Math.atan(Math.exp(y)) - (Math.PI / 4)),
            (180.0 / Math.PI) * x);
    },

    maxConcurrentRequests: 8,

    requestQueue: [],

    activeRequests: [],

    queueId: 0,

    _reset: function() {
        this._resetQueue();

        L.TileLayer.prototype._reset.call(this);
    },

    _resetQueue: function() {
        this.requestQueue = [];
        this.queueId = this.queueId + 1;

        for (var i = 0; i < this.activeRequests.length; i++)
            this.activeRequests[i].abort();
        
        this.activeRequests = [];
    },

    runRequestQ: function(url, handleSuccess, force) {
        if (!force && this.activeRequests.length >= this.maxConcurrentRequests) {
            this.requestQueue.push({
                url: url,
                handleSuccess: handleSuccess
            });
            return;
        }

        var that = this;
        var queueId = this.queueId;

        var request = corslite(url, 
            function(err, resp) {
                that.activeRequests.splice(that.activeRequests.indexOf(request), 1);
                if (that.queueId == queueId && that.requestQueue.length) {
                    var pendingRequest = that.requestQueue.shift();
                    that.runRequestQ(pendingRequest.url, pendingRequest.handleSuccess, true);
                }
                
                handleSuccess(err, resp);
            }
			, true); // cross origin?

        this.activeRequests.push(request);
    },

    _loadTile: function(tile, coords) {
        if (!this._map)
            return;

        tile._map = this._map;
        tile._layers = [];
        tile._layer = this;
        tile.onload = this._tileOnLoad;
        tile.onerror = this._tileOnError;

        this._adjustTilePoint(coords);

        var url = this.getTileUrl(coords);
		
        this.runRequestQ(url,
            L.bind(function(error, response) {
                if (!this._map)
                    return;

				if(error) {
					tile.src = '';
					return;
				}
				
				var resp = JSON.parse(response.responseText)
				
                var prefixMap = {
                    "iVBOR": "data:image/png;base64,",
                    "R0lGO": "data:image/gif;base64,",
                    "/9j/4": "data:image/jpeg;base64,",
                    "Qk02U": "data:image/bmp;base64,"
                };

                var rawImage = resp.image;
                tile.src = prefixMap[rawImage.substr(0, 5)] + rawImage;

                if (resp.features) {
                    var objectInfos = resp.features;

                    for (var i = 0; i < objectInfos.length; i++) {
                        var oi = objectInfos[i];
                        oi.latLng = this.pixToLatLng(coords, oi.referencePixelPoint);
                        tile._layers.push(oi);
                    }
                }
            }, this));

        this.fire('tileloadstart', {
            tile: tile,
            url: tile.src
        });
    }
});

L.TileLayer.clickableTiles = function (url, options) {
    return new L.TileLayer.ClickableTiles(url, options);
};

function corslite(url, callback, cors) {
    var sent = false;

    if (typeof window.XMLHttpRequest === 'undefined') {
        return callback(Error('Browser not supported'));
    }

    if (typeof cors === 'undefined') {
        var m = url.match(/^\s*https?:\/\/[^\/]*/);
        cors = m && (m[0] !== location.protocol + '//' + location.hostname +
                (location.port ? ':' + location.port : ''));
    }

    var x = new window.XMLHttpRequest();

    function isSuccessful(status) {
        return status >= 200 && status < 300 || status === 304;
    }

    if (cors && !('withCredentials' in x)) {
        // IE8-9
        x = new window.XDomainRequest();

        // Ensure callback is never called synchronously, i.e., before
        // x.send() returns (this has been observed in the wild).
        // See https://github.com/mapbox/mapbox.js/issues/472
        var original = callback;
        callback = function() {
            if (sent) {
                original.apply(this, arguments);
            } else {
                var that = this, args = arguments;
                setTimeout(function() {
                    original.apply(that, args);
                }, 0);
            }
        }
    }

    function loaded() {
        if (
            // XDomainRequest
            x.status === undefined ||
            // modern browsers
            isSuccessful(x.status)) callback.call(x, null, x);
        else callback.call(x, x, null);
    }

    // Both `onreadystatechange` and `onload` can fire. `onreadystatechange`
    // has [been supported for longer](http://stackoverflow.com/a/9181508/229001).
    if ('onload' in x) {
        x.onload = loaded;
    } else {
        x.onreadystatechange = function readystate() {
            if (x.readyState === 4) {
                loaded();
            }
        };
    }

    // Call the callback with the XMLHttpRequest object as an error and prevent
    // it from ever being called again by reassigning it to `noop`
    x.onerror = function error(evt) {
        // XDomainRequest provides no evt parameter
        callback.call(this, evt || true, null);
        callback = function() { };
    };

    // IE9 must have onprogress be set to a unique function.
    x.onprogress = function() { };

    x.ontimeout = function(evt) {
        callback.call(this, evt, null);
        callback = function() { };
    };

    x.onabort = function(evt) {
        callback.call(this, evt, null);
        callback = function() { };
    };

    // GET is the only supported HTTP Verb by XDomainRequest and is the
    // only one supported here.
    x.open('GET', url, true);

    // Send the request. Sending data is not supported.
    x.send(null);
    sent = true;

    return x;
}

if (typeof module !== 'undefined') module.exports = corslite;

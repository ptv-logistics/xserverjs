(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g=(g.L||(g.L = {}));g=(g.TileLayer||(g.TileLayer = {}));g.ClickableTiles = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
"use strict";

var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null),
    corslite = require('corslite');

L.TileLayer.ClickableTiles = L.TileLayer.extend({
    includes: L.Mixin.Events,

    initialize: function (url, options) {
        L.TileLayer.prototype.initialize.call(this, url, options);
    },

    onAdd: function (map) {
        this._resetQueue();

        L.TileLayer.prototype.onAdd.call(this, map);

        var cont = map._container;
    
        cont.addEventListener('mousemove', L.bind(this._onMouseMove, this), true);
        cont.addEventListener('mousedown', L.bind(this._onMouseDown, this), true);
    
        map._mapPane.addEventListener('click', L.bind(this._onClick, this), true);
        map.addEventListener('click', L.bind(this._onMapClick, this), false);
    },

    onRemove: function (map) {
        this._resetQueue();

        var cont = map._container;
    
        cont.removeEventListener('mousemove', L.bind(this._onMouseMove, this), true);
        cont.removeEventListener('mousedown', L.bind(this._onMouseDown, this), true);
    
        map._mapPane.removeEventListener('click', L.bind(this._onClick, this), true);
        map.removeEventListener('click', L.bind(this._onMapClick, this), false);

        L.TileLayer.prototype.onRemove.call(this, map);
    },

    maxConcurrentRequests: 8,

    requestQueue: [],

    activeRequests: [],

    queueId: 0,

	_setView: function (center, zoom, noPrune, noUpdate) {
		var tileZoom = Math.round(zoom);
		if ((this.options.maxZoom !== undefined && tileZoom > this.options.maxZoom) ||
		    (this.options.minZoom !== undefined && tileZoom < this.options.minZoom)) {
			tileZoom = undefined;
		}

		var tileZoomChanged = this.options.updateWhenZooming && (tileZoom !== this._tileZoom);

        if(tileZoomChanged)
            this._resetQueue();

        L.TileLayer.prototype._setView.call(this, center, zoom, noPrune, noUpdate);
    },

    redraw: function() {
        this._resetQueue();

        L.TileLayer.prototype.redraw.call(this);        
    },

    _resetQueue: function () {
        this.requestQueue = [];
        this.queueId = this.queueId + 1;

        for (var i = 0; i < this.activeRequests.length; i++) {
            this.activeRequests[i].abort();
        }

        this.activeRequests = [];
    },

    runRequestQ: function (url, handleSuccess, force) {
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
            function (err, resp) {
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

    findElement: function (e, container) {
        // this. is the image!
        var mp = L.DomEvent.getMousePosition(e, container);

        for (var i = container._layers.length - 1; i >= 0; i--) {
            var layer = container._layers[i];
            var width = Math.abs(layer.pixelBoundingBox.right - layer.pixelBoundingBox.left);
            var height = Math.abs(layer.pixelBoundingBox.top - layer.pixelBoundingBox.bottom);
            if ((layer.referencePixelPoint.x - width / 2 <= mp.x) && (layer.referencePixelPoint.x + width / 2 >= mp.x) &&
                (layer.referencePixelPoint.y - height / 2 <= mp.y) && (layer.referencePixelPoint.y + height / 2 >= mp.y)) {
                return layer;
            }
        }

        return null;
    },

    findElement: function (e, container) {
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
                if ((layer.referencePixelPoint.x - width / 2 <= mp.x) && (layer.referencePixelPoint.x + width / 2 >= mp.x) &&
                    (layer.referencePixelPoint.y - height / 2 <= mp.y) && (layer.referencePixelPoint.y + height / 2 >= mp.y)) {
                    return layer;
                }
            }
        }

        return null;
    },

    _onMouseMove: function (e) {
        if (!this._map || this._map.dragging._draggable._moving || this._map._animatingZoom) {
            return;
        }

        if (this.findElement(e, this._container)) {
            e.preventDefault();

            this._map._container.style.cursor = "pointer";

            e.stopPropagation();
        } else {
            this._map._container.style.cursor = "";
        }
    },

    _onMouseDown: function (e) {
        var found = this.findElement(e, this._container);
        if (found) {
            e.preventDefault();

            e.stopPropagation();
            return false;
        }
    },

    _onClick: function (e) {
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

    _onMapClick: function (e) {
        var found = this.findElement(e.originalEvent, this._container);
        if (found) {
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

		/*
		 Set role="presentation" to force screen readers to ignore this
		 https://www.w3.org/TR/wai-aria/roles#textalternativecomputation
		*/
        tile.setAttribute('role', 'presentation');

        var url = this.getTileUrl(coords);

        tile._map = this._map;
        tile._layers = [];

        this.runRequestQ(url,
            L.bind(function (error, response) {
                if (!this._map)
                    return;

                if (error) {
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

        return tile;
    }
});

L.TileLayer.clickableTiles = function (url, options) {
    return new L.TileLayer.ClickableTiles(url, options);
};

module.exports = L.TileLayer.ClickableTiles;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"corslite":2}],2:[function(require,module,exports){
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

},{}]},{},[1])(1)
});
L.TileLayer.MetaInfoTiles = L.TileLayer.extend({
    includes: L.Mixin.Events,

    initialize: function(url, options) {
        options.unloadInvisibleTiles = true;
        options.reuseTiles = false;

        L.TileLayer.prototype.initialize.call(this, url, options);
    },

    onAdd: function(map) {
        this._resetQueue();

        L.TileLayer.prototype.onAdd.call(this, map);

        L.DomEvent
            .on(document, 'mousemove', this._onMouseMove, this) //L.Util.throttle(this._onMouseMove, 32, tile), tile)
            .on(document, 'click', this._onClick, this);
    },

    onRemove: function(map) {
        this._resetQueue();

        L.TileLayer.prototype.onRemove.call(this, map);
    },

    _initContainer: function() {
        var tilePane = this._map._panes.overlayPane;

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
            this._container.style['pointer-events'] = 'none';

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
                if ((layer.referencePixelPoint.x - 8 <= mp.x) && (layer.referencePixelPoint.x + 8 >= mp.x) &&
                    (layer.referencePixelPoint.y - 8 <= mp.y) && (layer.referencePixelPoint.y + 8 >= mp.y)) {
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

    maxConcurrentRequests: 4,

    activeRequestCount: 0,

    requestQueue: [],

    currentRequests: [],


    _reset: function() {
        this._resetQueue();
        for (var key in this._tiles) {
            this._resetTile(this._tiles[key]);
        }

        for (var key in this._unusedTiles) {
            this._resetTile(this._unusedTiles[key]);
        }

        L.TileLayer.prototype._reset.call(this);
    },

    cnt: 0,

    _resetQueue: function() {
        this.requestQueue = [];
        this.cnt = this.cnt + 1;
        for (var i = 0; i < this.currentRequests.length; i++)
            this.currentRequests[i].abort();
        this.currentRequests = [];

        this.activeRequestCount = 0;
    },

    runRequestQ: function(url, handleSuccess, force) {
        if (!force && this.activeRequestCount >= this.maxConcurrentRequests) {
            this.requestQueue.push({
                url: url,
                handleSuccess: handleSuccess
            });
            return;
        }
        if (!force)
            this.activeRequestCount++;

        var that = this;
        var cnt = this.cnt;

        var request = corslite(url, 
            function(err, resp) {
                that.currentRequests.splice(that.currentRequests.indexOf(request), 1);
                if (that.cnt == cnt && that.requestQueue.length) {
                    var pendingRequest = that.requestQueue.shift();
                    that.runRequestQ(pendingRequest.url, pendingRequest.handleSuccess, true);
                } else {
                    that.activeRequestCount--;
                }
                handleSuccess(err, resp);
            }
			, true); // cross origin?

        this.currentRequests.push(request);
    },

    _loadTile: function(tile, coords) {
        //        var tile = document.createElement('img');
        //        tile.style['pointer-events'] = 'auto';
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

				if(error)
					return;
				
				var resp = JSON.parse(response.responseText)
				
                var prefixMap = {
                    "iVBOR": "data:image/png;base64,",
                    "R0lGO": "data:image/gif;base64,",
                    "/9j/4": "data:image/jpeg;base64,",
                    "Qk02U": "data:image/bmp;base64,"
                };

                var rawImage = resp.image;
                tile.src = prefixMap[rawImage.substr(0, 5)] + rawImage;
                this._resetTile(tile);

                if (resp.features &&
                    this._container &&
                    this._tileContainer.style.visibility !== 'hidden') {
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
L.TileLayer.ClickableTiles = L.TileLayer.extend({
    includes: L.Mixin.Events,
	
	initialize: function(url, options) {
        options.unloadInvisibleTiles = true;
        options.reuseTiles = false;

        L.TileLayer.prototype.initialize.call(this, url, options);
    },
	
    onAdd: function(map) {
        this._resetQueue();

        L.TileLayer.prototype.onAdd.call(this, map);

        this._container.style['pointer-events'] = 'auto';
		L.DomEvent
            .on(document, 'mousemove', this._onMouseMove, this) //L.Util.throttle(this._onMouseMove, 32, tile), tile)
            .on(document, 'click', this._onClick, this);
    },

    onRemove: function(map) {
        this._resetQueue();

        L.TileLayer.prototype.onRemove.call(this, map);
    },
	
	maxConcurrentRequests: 4,

    activeRequestCount: 0,

    requestQueue: [],

    currentRequests: [],

    _reset: function() {
        this._resetQueue();

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

    findElement: function(e, container) {
        // this. is the image!
        var mp = L.DomEvent.getMousePosition(e, container);

        for (var i = container._layers.length - 1; i >= 0; i--) {
            var layer = container._layers[i];
				var width = Math.abs(layer.pixelBoundingBox.right - layer.pixelBoundingBox.left);
				var height = Math.abs(layer.pixelBoundingBox.top - layer.pixelBoundingBox.bottom);
                if ((layer.referencePixelPoint.x - width/2 <= mp.x) && (layer.referencePixelPoint.x + width/2 >= mp.x) &&
                    (layer.referencePixelPoint.y - height/2 <= mp.y) && (layer.referencePixelPoint.y + height/2 >= mp.y)) {
                    return layer;
                }
        }

        return null;
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
        if (!this._map || this._map.dragging._draggable._moving || this._map._animatingZoom) 
			return;
		
        if (this.findElement(e, this._container))
			this._map._container.style.cursor = "pointer";
        else {
			this._map._container.style.cursor = "";
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
		
		url = this.getTileUrl(coords);
		
		tile._map = this._map;
        tile._layers = [];

        this.runRequestQ(url,
            L.bind(function(error, response) {
                if (!this._map)
                    return;

				tile.src = '//';
				
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

L.TileLayer.clickableTiles = function(url, options) {
    return new L.TileLayer.ClickableTiles(url, options);
};
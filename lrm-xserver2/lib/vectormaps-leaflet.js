(function () {
  'use strict';

  var proto = L.Map.prototype;

  // https://github.com/Leaflet/Leaflet/issues/1886
  // Workaround: https://github.com/mapbox/mapbox.js/issues/470
  var prev = proto._resetView;

  proto._resetView = function () {
    var args = [].slice.call(arguments);
    args[1] = Math.floor(args[1]); // fix non-integer zoom levels
    return prev.apply(this, args);
  };

  L.TileLayer.Canvas.prototype.redraw = function () {
    if (this._map) {
      // make redraw smooth by using the same bg buffer handling as for zoom anims
      this._prepareBgBuffer();
      this._reset();
      this._update();
      var front = this._tileContainer,
      bg = this._bgBuffer;
      front.style.visibility = '';
      front.parentNode.appendChild(front);
      L.Util.falseFn(bg.offsetWidth);
    }

    return this;
  };
  
    L.TileLayer.prototype._initContainer = function () {
//	  layer._initContainer = function () {

		var tilePane = this.options.pane ? this.options.pane : map._panes.tilePane;

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

			this._tileContainer.style['pointer-events'] = 'none';
			this._tileContainer.style.zIndex = this.options.zIndex;

			
			tilePane.appendChild(this._container);

			if (this.options.opacity < 1) {
				this._updateOpacity();
			}
		}
	};
	  


})();
(function (vectormaps) {
  'use strict';

  var Util = vectormaps.Util;

  vectormaps.styleManager = function (baseUrl, stylesUrl) {
    return new StyleManager(baseUrl, stylesUrl);
  };

  function StyleManager(baseUrl, stylesUrl) {
    this.baseUrl = baseUrl;
	this.stylesUrl = stylesUrl;
  }

  var proto = StyleManager.prototype;

  Util.extend(proto, L.Mixin.Events);

  proto.getStyles = function (done, withSymbols) {
    var me = this;

    if (!! me.styles && ! (withSymbols && me.updateSymbols)) {

      done(null, me._getStyles(withSymbols));

    } else {
      if (! me.loading) {
        me.loading = true;

        if (! me.styles) {
          loadStyles(me.stylesUrl, function (err, styles) {
            if (err) {
              done(err);
            } else {
              me.styles = styles;
              me.updateSymbols = true;

              stylesDone(styles);
            }
          });
        } else {
          stylesDone(me.styles);
        }

        if (! me.typefaceFace) {
          var typefaceFontStyle = {
            fontFamily: 'dejavu sans',
            fontWeight: 'normal',
            fontStyle: 'normal'
          };

          loadScript(me.baseUrl + 'fonts/dejavu_sans_condensed_ext.typeface.js', function() {
            me.typefaceFace = _typeface_js.faces[typefaceFontStyle.fontFamily][typefaceFontStyle.fontWeight][typefaceFontStyle.fontStyle];
            checkDone();
          });
        }
      }

      me.once('reset', function () {
        me.loading = false;
        done(null, me._getStyles(withSymbols));
      });
    }

    function stylesDone(styles) {
      if (withSymbols && me.updateSymbols) {
        loadSymbols(me.baseUrl, styles.timestamp, styles.symbols, function (err, symbols) {
          me.symbols = symbols;
          me.updateSymbols = false;
          checkDone();
        });
      } else {
        checkDone();
      }
    }

    function checkDone() {
      if (me.styles && ! (withSymbols && me.updateSymbols) && me.typefaceFace) {
        me.fire('reset');
      }
    }
  };

  proto.getStylesWithSymbols = function (done) {
    return this.getStyles(done, true);
  };

  proto._getStyles = function (withSymbols) {
    var me = this,
        styles = me.styles,
        res = Util.extend({}, styles);

    res.typefaceFace = me.typefaceFace;
    if (withSymbols) { res.symbols = me.symbols; }
    return res;
  };

  proto.setStyles = function (styles) {
    var me = this;

    me.styles = styles;
    me.updateSymbols = true;
    me.fire('update');
  };

  proto.reloadStyles = function () {
    var me = this;

    if (me.inReload) {
      return;
    }
    me.inReload = true;
    loadStyles(this.stylesUrl, function(err, styles) {
      if (!err) {
        me.setStyles(styles);
      }
      me.inReload = false;
    });
  };

  proto._setBaseUrl = function (baseUrl) {
    this.baseUrl = baseUrl;
    this.reloadStyles();
  };

  proto.loadThemes = function (done) {
    Util.get(this.baseUrl + 'themes.json?timestamp=' + (new Date()).getTime(), done);
  };

  function loadStyles(stylesUrl, done) {
    Util.get(stylesUrl, done);
  }

  function loadSymbols(baseUrl, timestamp, symbols, done) {
    var names  = Object.keys(symbols),
        loaded = 0;

    symbols = Util.object(names, names.map(loadSymbol));

    function loadSymbol(name) {
      var scaling = getBestScaling(symbols[name]),
          image = loadImage(getSrc(name, scaling), wrappedDone);

      image.setAttribute('data-scaling', scaling);
      return image;
    }

    function getBestScaling(scalings) {
      var i = scalings.length - 1;
      while (i >= 0 && scalings[i] >= window.devicePixelRatio) { i--; }
      return scalings[i + 1] || scalings[i];
    }

    function getSrc(name, scaling) {
      var src = (/^https?:/).test(name) ? name : (baseUrl + 'ts_' + timestamp + '/symbols/' + name),
          scalingStr = scaling > 1 ? '@' + scaling + 'x' : '',
          x = src.lastIndexOf('.');

      return (src.substr(0, x) + scalingStr + src.substr(x));
    }

    function wrappedDone() {
      if (++loaded === names.length) {
        done(null, symbols);
      }
    }
  }

  function loadImage(src, done) {
    var img = new Image();
    img.src = src;
    img.onload = done;
    img.onerror = done;
    return img;
  }

  function loadScript(src, done) {
    var script = document.createElement('script');
    script.src = src;
    script.onload = done;
    script.onerror = done;
    document.body.appendChild(script);
    return script;
  }

})(vectormaps);
(function (vectormaps) {
  'use strict';

  var overlaysByTileId = {},
      queue = [],
      rendering = false;

  vectormaps.overlayLayer = function (options) {
    options = options || {};
    options.async = true;
    options.maxZoom = options.maxZoom || 19;

    var layer = L.tileLayer.canvas(options);

    layer.inProgress = {};
    layer.overlaysByTileId = {};

    var bgOpacity = 1.0;
    var bgFadeInterval = null;
    function bgFade() {
      bgOpacity -= 0.078125;
      if (bgOpacity < 0) bgOpacity = 0;
      layer._bgBuffer.style.opacity = bgOpacity;
      if (bgOpacity == 0 && bgFadeInterval != null) {
        window.clearInterval(bgFadeInterval);
        bgFadeInterval = null;
      }
    }

    var origPrepare = layer._prepareBgBuffer;
    layer._prepareBgBuffer = function() {
      if (bgFadeInterval != null) {
        window.clearInterval(bgFadeInterval);
        bgFadeInterval = null;
      }
      origPrepare.apply(layer, arguments);
      layer._tileContainer.style.opacity = 1.0;
      bgOpacity = 1.0;
      bgFadeInterval = window.setInterval(bgFade, 50);
    }

    var origAnimateZoom = layer._animateZoom;
    layer._animateZoom = function() {
      layer.cancel();
      origAnimateZoom.apply(layer, arguments);
    };

    layer.drawTile = drawTile;
    layer.doDrawTile = doDrawTile;
    layer.renderDone = renderDone;
    layer.cancel = function () {
      var handlers = layer.inProgress;

      Object.keys(handlers).forEach(function (tileId) {
        var handle = handlers[tileId];
        if (handle) {
          handlers[tileId].cancel();
        }
      });
    };

    layer.on('tileunload', function (evt) {
      var tileId = evt.tile['data-tileId'],
          handle = layer.inProgress[tileId];

      if (handle) {
        handle.cancel();
      }
    });

    layer.setOverlays = function(tileId, overlays) {
      layer.overlaysByTileId[tileId] = overlays;
      layer.doDrawTile(tileId);
    };
    layer.resetOverlays = function(tileId) {
      delete layer.overlaysByTileId[tileId];
    };
    layer.getNeighborOverlays = function(tileId) {
      var tileIdParts = tileId.split('/');
      var zoom = parseInt(tileIdParts[0]), x = parseInt(tileIdParts[1]), y = parseInt(tileIdParts[2]);
      var result = new Array(9);
      for (var offsetX = -1; offsetX <= 1; ++offsetX) {
        for (var offsetY = -1; offsetY <= 1; ++offsetY) {
          if (offsetX == 0 && offsetY == 0) continue;
          var overlays = layer.overlaysByTileId[[ zoom, x + offsetX, y + offsetY ].join('/')];
          if (overlays !== undefined) {
            result[(offsetX + 1)*3 + offsetY + 1] = overlays;
          }
        }
      }
      return result;
    };

    return layer;
  };

  function drawTile(tile, point, zoom) {
    // jshint validthis:true
    var me = this;

    var tileId = tile['data-tileId'] = [ zoom, point.x, point.y ].join('/');

    me.inProgress[tileId] = { cancel: function () {
      me.renderDone(tileId);
    }, canvas: tile};

    me.doDrawTile(tileId);
  }

  function doDrawTile(tileId) {
    // jshint validthis:true
    var me = this;

    var inProgress = me.inProgress[tileId];
    if (inProgress === undefined || inProgress.canvas === undefined) return;
    var overlays = me.overlaysByTileId[tileId];
    if (overlays === undefined) return;

    queue.push(function (done) {
      me.inProgress[tileId] = vectormaps.renderOverlays(overlays, inProgress.canvas, wrappedDone);

      function wrappedDone() {
        done();
        me.renderDone(tileId);
      }
    });

    processQueue();

  }

  function renderDone(tileId) {
    // jshint validthis:true
    var me = this;

    var inProgress = me.inProgress[tileId];
    if (inProgress !== undefined) {
      delete me.inProgress[tileId];
      me.tileDrawn(inProgress.canvas);
    }
  }

  function processQueue() {
    if (! rendering && queue.length) {
      rendering = true;

      queue.shift()(function () {
        rendering = false;
        processQueue();
      });
    }
  }

})(vectormaps);
(function (vectormaps) {
  'use strict';

  var Util = vectormaps.Util,
      queue = [],
      rendering = false;

  vectormaps.vectorTileLayer = function (baseUrl, options, overlayLayer) {
    options = options || {};
    options.async = true;
    options.maxZoom = options.maxZoom || 19;

    var layer = L.tileLayer.canvas(options);

    layer.baseUrl = baseUrl;
    layer.maxNonOverzoom = options.maxNonOverzoom || 19;
    layer.inProgress = {};
    layer.overlayLayer = overlayLayer;

    if (true || !supportsRenderPTV) {
      var layerMap = null,
          origOnAdd = layer.onAdd,
          origOnRemove = layer.onRemove,
		  origInitContainer = layer._initContainer;

//		 var that = this;
      // layer._initContainer = function() 
	  // { 
		// L.TileLayer.prototype._initContainer.call(this, that._map);
	  
          // var pane = layer._map._panes.tilePane,
		  // overlayPane = layer._map._panes.tileoverlayPane,
          // children = pane.childNodes,
		  // overlaychildren = overlayPane.childNodes;
			  
			  // if(children.length > 0)
			  // {          
				// var el = pane.removeChild(children[children.length -1]);
				// if(false && overlaychildren.length > 0) {				
					// layer._map._panes.tileoverlayPane.insertBefore(el, overlaychildren[0]);
				// }	
				// else	
					// layer._map._panes.tileoverlayPane.appendChild(el);
			  // }

        // };

     };
	
	
    var origAnimateZoom = layer._animateZoom;
    layer._animateZoom = function() {
      layer.cancel();
      origAnimateZoom.apply(layer, arguments);
    };

    layer.drawTile = drawTile;
    layer.cancel = function () {
      var handlers = layer.inProgress;

      Object.keys(handlers).forEach(function (tileId) {
        var handle = handlers[tileId];
        if (handle) {
          handlers[tileId].cancel();
        }
      });
    };
    layer.setOverlayImageSources = function() {
      if (layer.overlayLayer) {
        for (var i in layer.overlayLayer._tiles) {
          var tile = layer.overlayLayer._tiles[i];
          tile['data-src'] = layer.baseUrl + [ 'elements_t', 'tile', 'ts_' + layer.timestamp, tile['data-tileId'] ].join('/');
        }
      }
    };

    layer.on('tileunload', function (evt) {
      var tileId = evt.tile['data-tileId'],
          handle = layer.inProgress[tileId];

      if (handle) {
        handle.cancel();
      }

      if (layer.overlayLayer) layer.overlayLayer.resetOverlays(tileId);
    });

    layer.styleManager = vectormaps.styleManager(baseUrl, options.stylesUrl);
    layer.styleManager.on('update', function () {
      layer.redraw();
      if (layer.overlayLayer) layer.overlayLayer.redraw();
    });

    layer._setBaseUrl = function (baseUrl) {
      var re = /\/elements_([^\/]*)/;
      var match = re.exec(baseUrl);
      if (match != null) {
          var allowedElements = match[1];
          layer.baseUrl = layer.baseUrl.replace(re, "");
          layer.allowedElements = allowedElements;
      }
    };

    layer.setBaseUrl = function (baseUrl) {
      layer._setBaseUrl(baseUrl);
      layer.styleManager._setBaseUrl(baseUrl);
    };

    layer._setBaseUrl(baseUrl);

    return layer;
  };

  function drawTile(tile, point, zoom) {
    // jshint validthis:true
    var me = this,
        styleManager = me.styleManager,
        styles, data, overzoom;

    var tileId = tile['data-tileId'] = [ zoom, point.x, point.y ].join('/'),
        render = true;

    if (zoom > me.maxNonOverzoom) {
      var scaleFactor = Math.pow(2, zoom - me.maxNonOverzoom),
          x = Math.floor(point.x / scaleFactor),
          y = Math.floor(point.y / scaleFactor),
         dx = point.x % scaleFactor,
         dy = point.y % scaleFactor;

      // load this
      zoom = me.maxNonOverzoom;
      point = { x: x, y: y };

      // display like this
      overzoom = { dx: dx, dy: dy, s: scaleFactor };
    }

    me.inProgress[tileId] = { cancel: function () {
      renderDone();
      render = false;
    }};

    styleManager.getStylesWithSymbols(function (err, res) {
      if (err) {
        renderDone();
      } else {
        styles = res;
        if (render) {
          loadTileData(function (err, res) {
            data = res || {};
            if (data.Error) {
              err = data.Error;
            }
            loadDone(err);
            if (data.Error) {
              styleManager.reloadStyles();
            }
          });
        }
      }
    });

    function loadTileData(done) {
      me.timestamp = styles.timestamp;
      Util.get(tile['data-src'] = me.baseUrl + [ 'tile', 'ts_' + styles.timestamp, zoom, point.x, point.y ].join('/'), done);
    }

    function loadDone(err) {
      if (! err && render) {
        queue.push(function (done) {
          if (render) {
            try {
              if (! overzoom && 'ozs' in data && 'ozx' in data && 'ozy' in data) {
                overzoom = { dx: data['ozx'], dy: data['ozy'], s: data['ozs'] };
              }
              data.overzoom = overzoom;
              me.inProgress[tileId] = vectormaps.renderPTV(data, styles, tile, wrappedDone, me.ignoreDashes, null, me.allowedElements, !! me.overlayLayer);
            } catch (e) {
              wrappedDone();
              throw e;
            }
          } else {
            wrappedDone();
          }

          function wrappedDone() {
            done();
            renderDone();
          }
        });

        processQueue();
      } else {
        renderDone();
      }
    }

    function renderDone() {
      var inProgress = me.inProgress[tileId];
      if (inProgress !== undefined && render) {
        delete me.inProgress[tileId];
        me.tileDrawn(tile);
        var overlays = inProgress.overlays;

        if (overlays !== undefined) {
          var tileSize = vectormaps.TILE_SIZE;
          var overlayCount = overlays.length;
          var toRemove = new Array(overlayCount);
          var result = [];

          var neighborOverlays = me.overlayLayer.getNeighborOverlays(tileId);
          for (var x = -1; x <= 1; ++x) {
            for (var y = -1; y <= 1; ++y) {
              if (x == 0 && y == 0) continue;
              var toCheck = neighborOverlays[(x + 1)*3 + y + 1];
              if (toCheck === undefined) continue;
              var offsetX = x*tileSize, offsetY = y*tileSize;
              for (var i = 0; i < overlayCount; ++i) {
                if (toRemove[i]) continue;
                var overlay = overlays[i];
                toRemove[i] = overlay.intersects(offsetX, offsetY, offsetX + tileSize, offsetY + tileSize);
              }
              var toCheckCount = toCheck.length;
              for (var i = 0; i < toCheckCount; ++i) {
                var candidate = toCheck[i];
                if (candidate.intersectsLoosely(-offsetX, -offsetY, -offsetX + tileSize, -offsetY + tileSize)) {
                  var wrappedOverlay = candidate.getWrappedOverlay();
                  var alreadyPresent = false;
                  var resultCount = result.length;
                  for (var j = 0; j < resultCount; ++j) {
                    if (result[j] === wrappedOverlay) {
                      alreadyPresent = true;
                      break;
                    }
                  }
                  if (!alreadyPresent) {
                    result.push(vectormaps.overlayWrapper(candidate, offsetX, offsetY));
                  }
                }
              }
            }
          }

          var importedCount = result.length;
          for (var i = 0; i < overlayCount; ++i) {
            if (toRemove[i]) continue;
            var removed = false;
            var overlay = overlays[i];
            var wrappedOverlay = overlay.getWrappedOverlay();
            if (wrappedOverlay.text !== undefined && wrappedOverlay.rotation !== undefined) {
              for (var j = 0; j < importedCount; ++j) {
                var otherOverlay = result[j];
                var otherWrappedOverlay = otherOverlay.getWrappedOverlay();
                if (otherWrappedOverlay.text !== undefined && otherWrappedOverlay.rotation !== undefined) {
                  if (otherWrappedOverlay.text == wrappedOverlay.text) {
                    if (otherOverlay.intersects(overlay.left, overlay.top, overlay.right, overlay.bottom)) {
                      removed = true;
                      break;
                    }
                  }
                }
              }
            } else {
              for (var j = 0; j < importedCount; ++j) {
                var otherOverlay = result[j];
                var otherWrappedOverlay = otherOverlay.getWrappedOverlay();
                if (otherWrappedOverlay.text !== undefined && otherWrappedOverlay.rotation !== undefined) {
                  continue;
                }
                if (otherOverlay.intersects(overlay.left, overlay.top, overlay.right, overlay.bottom)) {
                  removed = true;
                  break;
                }
              }
            }
            if (!removed) {
              result.push(overlay);
            }
          }

          me.overlayLayer.setOverlays(tileId, result);
        }
      }
    }
  }

  function processQueue() {
    if (! rendering && queue.length) {
      rendering = true;

      queue.shift()(function () {
        rendering = false;
        processQueue();
      });
    }
  }

})(vectormaps);
(function (vectormaps) {
  'use strict';

  var Browser = vectormaps.Browser;
  var Util = vectormaps.Util;

  var supportsRenderPTV = (Browser.canvas && Browser.canvas.linedash && Browser.worker && Browser.xhr),
      tileSize = Math.round(window.devicePixelRatio * vectormaps.TILE_SIZE);

  vectormaps.tileLayer = tileLayer;

  function tileLayer(vectormapsURL, options) {
    options = options || {};
    options.maxZoom = Infinity;

    var layer = supportsRenderPTV
          ? vectormaps.vectorTileLayer(vectormapsURL, options)
          : L.tileLayer(vectormapsURL + 'tile/' + tileSize + '/{z}/{x}/{y}.png', options);

    if (!supportsRenderPTV) {
      var layerMap = null,
          origOnAdd = layer.onAdd,
          origOnRemove = layer.onRemove;

      layer.onAdd = function(map) { layerMap = map; };
      layer.onRemove = function() { layerMap = null; };

      Util.get('styles/styles-winter.json?timestamp=' + (new Date()).getTime(), function(err, styles) {
        if (err) { return; }

        layer.setUrl(vectormapsURL + 'tile/ts_' + styles.timestamp + '/' + tileSize + '/{z}/{x}/{y}.png', true);
        layer.onAdd = origOnAdd;
        layer.onRemove = origOnRemove;

        if (layerMap) {
          layer.onAdd(layerMap);

          var pane = layerMap._panes.tileoverlayPane,
              children = pane.childNodes,
              el = pane.removeChild(children[children.length -1]);

          // FIXME: This should re-order the layers.
          if (children.length == 0) {
            layer._container = pane.appendChild(el);
          } else {
            layer._container = pane.insertBefore(el, children[0]);
          }
          layerMap = null;
        }
      });
    }

    if (layer.cancel) {
      var prev = layer.addTo;

      layer.addTo = function (map) {
        map.on('zoomstart', layer.cancel);
        return prev.apply(this, arguments);
      };
    }

    return layer;
  }

})(vectormaps);
(function (vectormaps) {
  'use strict';

  var Util = vectormaps.Util,
      tileSize = vectormaps.TILE_SIZE;

  vectormaps.tileIdLayer = function() {
    var me = L.tileLayer.canvas({ maxZoom: 19 });

    me.drawTile = function (canvas, p, z) {
      var ctx = canvas.getContext('2d'),
          text = [ z, p.x, p.y ].join('/'),
          textX = 5,
          textY = 13;

      Util.scaleCanvasForHighres(canvas);

      ctx.strokeStyle = 'rgb(255,255,255)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(text, textX, textY);

      ctx.fillStyle = 'rgb(0,0,0)';
      ctx.fillText(text, textX, textY);

      ctx.beginPath();
      ctx.rect(0, 0, tileSize, tileSize);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.lineJoin = 'miter';
      ctx.stroke();
    };

    return me;
  };

})(vectormaps);

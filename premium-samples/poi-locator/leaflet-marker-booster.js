// override Leaflet implementation for fast symbol rendering
(function () {
	'use strict';

	var proto = L.Canvas.prototype;
	var prev = proto._updateCircle;

	proto._updateCircle = function (layer) {
		if (!this._drawing || layer._empty()) {
			return;
		}

		var p = {
				x: layer._point.x,
				y: layer._point.y
			},
			ctx = this._ctx,
			r = layer._radius,
			s = (layer._radiusY || r) / r;

		this._drawnLayers[layer._leaflet_id] = layer;

		if (s !== 1) {
			ctx.save();
			ctx.scale(1, s);
		}

		var options = layer.options;

		scale = 1;
		if(options.boostScale) {
			var zoomScale;
			var scale = Math.pow(2, this._map.getZoom()) * 256 / Math.PI / 6378137;
			scale = Math.pow(scale, options.boostExp) * options.boostScale;
			r = r * scale;
		} 
		if (!options.boostType) {
			ctx.beginPath();
			ctx.arc(p.x, p.y / s, r, 0, Math.PI * 2, false);
			this._fillStroke(ctx, layer);
		} else switch (options.boostType) {
			case 'ball':
				if (options.fill) {
					if(options.stroke && options.weight !== 0)
						r = r + options.weight * 0.5 * scale;
					var grd = ctx.createRadialGradient(p.x - r/2, p.y - r/2, 0, p.x, p.y, 1.25 * r);
					grd.addColorStop(0, options.fillColor);
					grd.addColorStop(1, options.color);
					ctx.beginPath();
					ctx.fillStyle = grd;
					ctx.arc(p.x, p.y / s,  r, 0, Math.PI * 2, false);
					ctx.fill(options.fillRule || 'evenodd');
				}
				break;
			default:
				ctx.beginPath();
				if (options.stroke && options.weight !== 0) {
					ctx.arc(p.x, p.y / s, r + options.weight * 0.5 * scale, 0, Math.PI * 2, false);
					ctx.fillStyle = options.color;
					ctx.fill(options.fillRule || 'evenodd');
				}

				ctx.beginPath();
				if (options.fill) {
					ctx.arc(p.x, p.y / s, r - ((options.stroke && options.weight !== 0) ? options.weight * 0.5 * scale : 0), 0, Math.PI * 2, false);
					ctx.fillStyle = options.fillColor || options.color;
					ctx.fill(options.fillRule || 'evenodd');
				}
			}

		if (s !== 1) {
			ctx.restore();
		}
	};

	var xproto = L.CircleMarker.prototype;
	var xprev = xproto._containsPoint;

	xproto._containsPoint = function (p) {
		var r = this._radius;
		
		if (this.options.boostType) {
			var options = this.options;
		
			var scale = Math.pow(2, this._map.getZoom()) * 256 / Math.PI / 6378137;
			scale = Math.pow(scale, options.boostExp) * options.boostScale;
			r = r * scale;
			r = r + (this.options.stroke ? this.options.weight * scale / 2 : 0);

			// if(options.boostType === 'ball')
			// 	p.y = p.y - r/2;
		}

		// clickTolerance olny for mobile!
		return p.distanceTo(this._point) <= r + ((L.Browser.touch && L.Browser.mobile) ? 10 : 0);
	};

	var cproto = L.Layer.prototype;
	var cprev = cproto._openPopup;
	cproto._openPopup = function (e) {
		var layer = e.layer || e.target;

		if (!(layer instanceof L.CircleMarker))
			return cprev.call(this, e);

		if (!this._popup) {
			return;
		}

		if (!this._map) {
			return;
		}

		// prevent map click
		L.DomEvent.stop(e);

		// treat it like a marker and figure out
		// if we should toggle it open/closed
		if (this._map.hasLayer(this._popup) && this._popup._source === layer) {
			this.closePopup();
		} else {
			this.openPopup(layer || e.target, layer._latlng);
			layer.on('preclick', L.DomEvent.stopPropagation);
		}
	};

	var pproto = L.Popup.prototype;
	var p_getAnchor = pproto._getAnchor;
	pproto._getAnchor = function () {
		if (!this._source._radius)
			return p_getAnchor.call(this);

		var r = this._source._radius;

		var options = this._source.options;

		var zoomScale;
		var scale = Math.pow(2, this._map.getZoom()) * 256 / Math.PI / 6378137;
		scale = Math.pow(scale, options.boostExp) * options.boostScale;
		r = 0.5 * r * scale;

		// Where should we anchor the popup on the source layer?
		return L.point(this._source && this._source._getPopupAnchor ? this._source._getPopupAnchor() : [0, -r]);
	};

	var p_onAdd = pproto.onAdd;
	pproto.onAdd = function (map) {
		p_onAdd.call(this, map);

		// stop propagation for steroid layer
		if (this._source && this._source instanceof L.CircleMarker)
			this._source.on('preclick', L.DomEvent.stopPropagation);
	};

	var p_onRemove = pproto.onRemove;
	pproto.onRemove = function (map) {
		p_onRemove.call(this, map);

		// stop propagation for steroid layer
		if (this._source && this._source instanceof L.CircleMarker)
			this._source.off('preclick', L.DomEvent.stopPropagation);
	};
})();
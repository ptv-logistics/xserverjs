// "vitual FeatureLayer implementation"
L.VirtualLayer = L.Layer.extend({
	initialize: function (name, tag) {
		this.name = name;
		this.tag = tag;
	},

	visible: false,

	onAdd: function (map) {
		this.visible = true;
		map.on('layeradd', this._onLayerAdd, this)

		map.eachLayer(function (layer) {
			if (layer.options.isVirtualHost) {
				layer.options[this.tag] = this.name;
				layer.redraw();
			}
		}, this);
	},

	_onLayerAdd: function (e) {
		if (e.layer.options.isVirtualHost) {
			var layerTag = this.visible ? this.name : '';
			if (e.layer.options[this.tag] !== layerTag) {
				e.layer.options[this.tag] = layerTag;
				e.layer.redraw();
			};
		}
	},

	onRemove: function (map) {
		this.visible = false;

		map.eachLayer(function (layer) {
			if (layer.options.isVirtualHost) {
				layer.options[this.tag] = '';
				layer.redraw();
			}
		}, this);
	}
});

L.virtualLayer = function (name, tag) {
	return new L.VirtualLayer(name, tag);
};
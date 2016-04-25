var buildD3Animations = function (alts, speed, doLoop) {
    var d3Layer = new Array(3);

    if (!map.d3Layer) {
        // create a separate pane for the xmap labels, so they are displayed on top of the route line
        // http://bl.ocks.org/rsudekum/5431771
        map._panes.svgPane = map._createPane('leaflet-overlay-pane', map.getPanes().labelPane);

        // put the 'slowest' trace on tpo
        d3Layer[2] = new L.SvgLayer({ pointerEvents: 'none', pane: map._panes.svgPane }).addTo(map);
        d3Layer[0] = new L.SvgLayer({ pointerEvents: 'none', pane: map._panes.svgPane }).addTo(map);
        d3Layer[1] = new L.SvgLayer({ pointerEvents: 'none', pane: map._panes.svgPane }).addTo(map);

        // setTimeout(function () { alert("Hello"); }, 3000);

        map.d3Layer = d3Layer;
    }
    else
        d3Layer = map.d3Layer;

	resetD3Animations();

	if(!alts.length)
		return;
	
	var refTime = alts[0].segments[alts[0].segments.length - 1].accTime;
	var replaySpeed = refTime / speed * 1000;
	
    if (doLoop) {
        var maxTime = -1;
        for (var i = 0; i < alts.length; i++) {
            if (!alts[i])
                continue;

            var t = alts[i].segments[alts[i].segments.length - 1].accTime;

            if (t > 1000000000)
                continue;

            maxTime = Math.max(maxTime, t);
        }

        map.timeOut = setTimeout(function () { buildD3Animations(alts, replaySpeed, doLoop); }, maxTime / replaySpeed * 1000);
    }

    for (var i = 0; i < alts.length; i++) {
        var svg = d3.select(d3Layer[i].getPathRoot());
        buildD3Animation(alts[i], i, d3Layer[i], svg, replaySpeed);
    }
}

var resetD3Animations = function() {
    // cancel pending animations
    for (var i = 0; i < 3; i++) {
        var animId = "anim" + i;
        d3.select('#tr' + animId).transition().duration(0);
    }

    if (map.timeOut) {
        clearTimeout(map.timeOut);
        map.timeOut = null;
    }
}

var buildD3Animation = function (route, index, layer, svg, replaySpeed) {
    if (!route)
        return;

    // when the user zooms in or out you need to reset the view
    layer.resetSvg = reset;

    var sumTime = route.segments[route.segments.length - 1].accTime;
    var sumDist = route.segments[route.segments.length - 1].accDist;

    var animId = "anim" + index;

    g = svg.append("g");
    g.attr("id", animId);

    var collection = {};
    collection.features = [];

    for (var i = 0; i < route.polygon.lineString.points.length; i++) {
        collection.features[i] = {
            type: "feature",
            properties: {
                time: i + 1,
                name: i + 1,
                id: "route1"
            },
            geometry: {
                type: "Point",
                coordinates: [route.polygon.lineString.points[i].x, route.polygon.lineString.points[i].y]
            }
        }
    }

    //read in the GeoJSON. This function is asynchronous so
    // anything that needs the json file should be within

    // this is not needed right now, but for future we may need
    // to implement some filtering. This uses the d3 filter function
    // featuresdata is an array of point objects

    var featuresdata = collection.features.filter(function (d) {
        return true; // d.properties.id == "route1";
    });

    //stream transform. transforms geometry before passing it to
    // listener. Can be used in conjunction with d3.geo.path
    // to implement the transform.

    var transform = d3.geo.transform({
        point: projectPoint
    });

    //d3.geo.path translates GeoJSON to SVG path codes.
    //essentially a path generator. In this case it's
    // a path generator referencing our custom "projection"
    // which is the Leaflet method latLngToLayerPoint inside
    // our function called projectPoint
    var d3path = d3.geo.path().projection(transform);


    // Here we're creating a FUNCTION to generate a line
    // from input points. Since input points will be in
    // Lat/Long they need to be converted to map units
    // with applyLatLngToLayer
    var toLine = d3.svg.line()
        //.interpolate("linear")
        .x(function (d) {
            return applyLatLngToLayer(d).x;
        })
        .y(function (d) {
            return applyLatLngToLayer(d).y;
        });


    // From now on we are essentially appending our features to the
    // group element. We're adding a class with the line name
    // and we're making them invisible

    // these are the points that make up the path
    // they are unnecessary so I've make them
    // transparent for now
    var ptFeatures = g.selectAll("circle")
        .data(featuresdata)
        .enter()
        .append("circle")
        .attr("r", 3)
        .attr("class", "waypoints");

    // Here we will make the points into a single
    // line/path. Note that we surround the featuresdata
    // with [] to tell d3 to treat all the points as a
    // single line. For now these are basically points
    // but below we set the "d" attribute using the
    // line creator function from above.
    var linePath = g.selectAll(".lineConnect")
        .data([featuresdata])
        .enter()
        .append("path")
        .attr("id", "tr" + animId)
        .attr("class", "lineConnect")
        .style({ 'stroke': 'Blue', 'fill': 'none', 'stroke-width': '6px' })
        .style("opacity", ".6");

    // This will be our traveling circle it will
    // travel along our path
    var marker = g.append("circle")
        .attr("r", 10)
        .attr("id", "marker" + index)
        .attr("class", "travelMarker" + index);


    // For simplicity I hard-coded this! I'm taking
    // the first and the last object (the origin)
    // and destination and adding them separately to
    // better style them. There is probably a better
    // way to do this!
    var originANDdestination = [featuresdata[0], featuresdata[17]];

    // this puts stuff on the map!
    reset();
    transition();

    // Reposition the SVG to cover the features.
    function reset() {
        var bounds = d3path.bounds(collection),
            topLeft = bounds[0],
            bottomRight = bounds[1];


        // here you're setting some styles, width, heigh etc
        // to the SVG. Note that we're adding a little height and
        // width because otherwise the bounding box would perfectly
        // cover our features BUT... since you might be using a big
        // circle to represent a 1 dimensional point, the circle
        // might get cut off.

        ptFeatures.attr("transform",
            function (d) {
                return "translate(" +
                    applyLatLngToLayer(d).x + "," +
                    applyLatLngToLayer(d).y + ")";
            });

        // again, not best practice, but I'm harding coding
        // the starting point

        marker.attr("transform",
            function () {
                var y = featuresdata[0].geometry.coordinates[1];
                var x = featuresdata[0].geometry.coordinates[0];
                return "translate(" +
                    map.latLngToLayerPoint(new L.LatLng(y, x)).x + "," +
                    map.latLngToLayerPoint(new L.LatLng(y, x)).y + ")";
            });


        // linePath.attr("d", d3path);
        linePath.attr("d", toLine);

    } // end reset

    // the transition function could have been done above using
    // chaining but it's cleaner to have a separate function.
    // the transition. Dash array expects "500, 30" where
    // 500 is the length of the "dash" 30 is the length of the
    // gap. So if you had a line that is 500 long and you used
    // "500, 0" you would have a solid line. If you had "500,500"
    // you would have a 500px line followed by a 500px gap. This
    // can be manipulated by starting with a complete gap "0,500"
    // then a small line "1,500" then bigger line "2,500" and so
    // on. The values themselves ("0,500", "1,500" etc) are being
    // fed to the attrTween operator
    function transition() {
        linePath.transition()
            .duration(sumTime * 1000 / replaySpeed)
            .ease("linear")
            .attrTween("stroke-dasharray", tweenDash)
            .each("interrupt", function () {
                d3.select('#' + animId).remove();
            })
            .each("end", function () {
                //              d3.select(this).call(transition);// infinite loop
                d3.select('#' + animId).remove();
            });
    } //end transition

    // get the first(!) index where the accTime is greater the searchelement 
    function binaryIndexOf(segments, searchElement) {
        var minIndex = 0;
        var maxIndex = segments.length - 1;
        var currentIndex;
        var currentElement;

        while (minIndex <= maxIndex) {
            currentIndex = (minIndex + maxIndex) / 2 | 0;
            currentElement = segments[currentIndex].accTime;

            if (currentElement < searchElement) {
                minIndex = currentIndex + 1;
            }
            else if (currentElement >= searchElement && (currentIndex > 0 && segments[currentIndex - 1].accTime >= searchElement)) {
                maxIndex = currentIndex - 1;
            }
            else {
                return currentIndex;
            }
        }

        return -1;
    }

    // this function feeds the attrTween operator above with the
    // stroke and dash lengths
    function tweenDash() {
        return function (t) {
            //total length of path (single value)
            var l = linePath.node().getTotalLength();

            // the relatibe time
            var rTime = t * sumTime;

            // find the (first) index where the accumlated segment time is greater
            var i = binaryIndexOf(route.segments, rTime);

            // get the relative distance 
            var xt = (i == 0) ? 0 : route.segments[i - 1].accTime;
            var xd = (i == 0) ? 0 : route.segments[i - 1].accDist;
            var dt = rTime - xt;
            var at = route.segments[i].accTime - xt;
            var rt = dt / at;
            var ad = route.segments[i].accDist - xd;
            var rd = ad * rt;
            t = (xd + rd) / sumDist;

            // this is creating a function called interpolate which takes
            // as input a single value 0-1. The function will interpolate
            // between the numbers embedded in a string. An example might
            // be interpolatString("0,500", "500,500") in which case
            // the first number would interpolate through 0-500 and the
            // second number through 500-500 (always 500). So, then
            // if you used interpolate(0.5) you would get "250, 500"
            // when input into the attrTween above this means give me
            // a line of length 250 followed by a gap of 500. Since the
            // total line length, though is only 500 to begin with this
            // essentially says give me a line of 250px followed by a gap
            // of 250px.
            interpolate = d3.interpolateString("0," + l, l + "," + l);
            //t is fraction of time 0-1 since transition began
            var marker = d3.select("#marker" + index);

            // p is the point on the line (coordinates) at a given length
            // along the line. In this case if l=50 and we're midway through
            // the time then this would 25.
            var p = linePath.node().getPointAtLength(t * l);

            //Move the marker to that point
            marker.attr("transform", "translate(" + p.x + "," + p.y + ")"); //move marker
            //console.log(t + " " + l + " " + interpolate(t))
            return interpolate(t);
        };
    } //end tweenDash

    // Use Leaflet to implement a D3 geometric transformation.
    // the latLngToLayerPoint is a Leaflet conversion method:
    //Returns the map layer point that corresponds to the given geographical
    // coordinates (useful for placing overlays on the map).
    function projectPoint(x, y) {
        var point = map.latLngToLayerPoint(new L.LatLng(y, x));
        this.stream.point(point.x, point.y);
    } //end projectPoint
};


// similar to projectPoint this function converts lat/long to
// svg coordinates except that it accepts a point from our
// GeoJSON

function applyLatLngToLayer(d) {
    var y = d.geometry.coordinates[1];
    var x = d.geometry.coordinates[0];
    return map.latLngToLayerPoint(new L.LatLng(y, x));
}

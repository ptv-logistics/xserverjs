// convert a wkt linestring to a close geoson polygon
function isoToPoly(wkt) {
    x = replaceAll('LINESTRING', '', wkt);
    x = x.trim();
    x = replaceAll(', ', '],[', x);
    x = replaceAll(' ', ',', x);
    x = replaceAll('(', '[', x);
    x = replaceAll(')', ']', x);
    x = '[[' + x + ']]';
    return eval(x);
}

function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(find, replace, str) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

// runRequest executes a json request on PTV xServer internet,
// given the url endpoint, the token and the callbacks to be called
// upon completion. The error callback is parameterless, the success
// callback is called with the object returned by the server.
function runRequest(url, request, token, handleSuccess, handleError) {
    $.ajax({
        url: url,
        type: "POST",
        data: JSON.stringify(request),

        headers: {
            "Authorization": "Basic " + btoa("xtok:" + token),
            "Content-Type": "application/json"
        },

        success: function (data, status, xhr) {
            handleSuccess(data);
        },

        error: function (xhr, status, error) {
            handleError(xhr);
        }
    });
}

function lngFormatter(num) {
    var direction = (num < 0) ? 'W' : 'E';
    var formatted = Math.abs(L.Util.formatNum(num, 3)) + '&ordm; ' + direction;
    return formatted;
}

function latFormatter(num) {
    var direction = (num < 0) ? 'S' : 'N';
    var formatted = Math.abs(L.Util.formatNum(num, 3)) + '&ordm; ' + direction;
    return formatted;
}

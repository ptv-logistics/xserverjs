///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Some controls are created to manipulate parameters of the xServerLayer, which renders background, streets,
// labels and Feature Layers. The parameters are part of the REST request and are set directly on
// xServerlayer.options.
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var map; // Leaflet map
var xServerLayer; // xServer layer
var licensedThemes = [];

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Control providing a selection of different rendering profiles. Their different properties may influence 
// the style of the map.
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

L.Control.ProfileControl = L.Control.extend({
    // Leaflet callback, used when control is added to the provided map object.
    onAdd: function(map) {
        this._container = document.getElementById('profile-control');

        if (L.DomEvent) {
            L.DomEvent.disableClickPropagation(this._container);
            L.DomEvent.disableScrollPropagation(this._container);
        }

        document.getElementById('cfg_profile').selectedIndex = 1; // Sandbox
        L.Control.ProfileControl.prototype.setProfile(); // Set initial configuration
        
        $('#cfg_profile').change(L.Control.ProfileControl.prototype.setProfile);
        
        return this._container;
    },
    
    setProfile: function() {
        xServerLayer.options.storedProfile = document.getElementById('cfg_profile').value;
        disableControlInput();
        xServerLayer.redraw();
    },
    
    setInputEnabled: function(enabled) {
        $('#cfg_profile').prop('disabled', enabled ? false : 'disabled'); 
    }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Control providing a selection of different Feature Layer themes. 
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

L.Control.ThemesControl = L.Control.extend({
    // Leaflet callback, used when control is added to the provided map object.
    onAdd: function (map) {
        this._container = document.getElementById('themes-control');

        if (L.DomEvent) {
            L.DomEvent.disableClickPropagation(this._container);
            L.DomEvent.disableScrollPropagation(this._container);
        }

        L.Control.ThemesControl.prototype.setActiveLayers(); // Set initial configuration

        [].slice.call(document.themes.themeCheckBox).forEach(function(checkBox) {
            checkBox.checked = false;
            checkBox.onclick = L.Control.ThemesControl.prototype.setActiveLayers;
        });
        
        return this._container;
    },
    
    // Refresh callback intended for the TimeConsideration control when its mode changes.
    // Updates the check boxes for the specified theme. In function 
    //   isLicensed
    // for each theme is returned if it can be used by the currently selected time consideration.
    setActiveLayers: function() {
        var layers = "background,transport,labels"; // Base layers are always included
        [].slice.call(document.themes.themeCheckBox).forEach(function(checkBox) {
            var theme = checkBox.id;
            if (checkBox.checked && L.Control.ThemesControl.prototype.isLicensed(theme) && L.Control.ThemesControl.prototype.isConsidered(theme)) {
                layers += ',' + theme;
            }
        });
        xServerLayer.options.layers = layers;
        if (layers.indexOf('PTV_TrafficIncidents') > 0) {
            map.attributionControl.addAttribution('TomTom');
        } else {
            map.attributionControl.removeAttribution('TomTom');
        }
        disableControlInput();
        xServerLayer.redraw();
    },
        
    // Encapsulates the logic if a theme is considered for the specified xServer module.
    isLicensed: function(theme) {
        return licensedThemes.some(function(element) { return element == theme; });
    },
    
    isConsidered: function(theme) {
        var timeConsiderationScenario = $('input[name=timeConsideration]:checked').val();
        switch (theme) {
            case 'PTV_TruckAttributes': return true;
            case 'PTV_SpeedPatterns': return (timeConsiderationScenario !== 'NoTimeConsideration' && timeConsiderationScenario !== 'TimeSpanConsideration');
            case 'PTV_TrafficIncidents': return true;
            default: return false;
        }       
    },
    
    setInputEnabled: function(enabled) {
        [].slice.call(document.themes.themeCheckBox).forEach(function(checkBox) {
            var theme = checkBox.id;
            var themeEnabled = enabled && L.Control.ThemesControl.prototype.isConsidered(theme) && L.Control.ThemesControl.prototype.isLicensed(theme);
            $('#' + theme).prop('disabled', themeEnabled ? false : 'disabled');
            $('#' + theme + 'Label').css('color', themeEnabled ? '#000' : '#ccc');
        });
    },
    
    disableInput: function() {
        var checkBoxes = document.themes.themeCheckBox;
        for (var i = 0; i < checkBoxes.length; i++) {
             $('#' + checkBoxes[i].id).prop('disabled', 'disabled'); 
        }        
    }
});


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Control providing a selection of different modes for time consideration. 
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

L.Control.TimeConsiderationControl = L.Control.extend({
    // Leaflet callback, used when control is added to the provided map object.
    onAdd: function(map) {
        this._container = document.getElementById('time-consideration-control');

        if (L.DomEvent) {
            L.DomEvent.disableClickPropagation(this._container);
            L.DomEvent.disableScrollPropagation(this._container);
        }

        var radioboxes = document.timeConsideration.timeConsideration;
        radioboxes[0].checked = true; // i.e. TimeConsidertionNone
        for (var i = 0; i < radioboxes.length; ++i) {
            radioboxes[i].onclick = L.Control.TimeConsiderationControl.prototype.setTimeConsideration;
        }
        L.Control.TimeConsiderationControl.prototype.setTimeConsideration(); // Set initial configuration

        $('#timespan-duration').change(L.Control.TimeConsiderationControl.prototype.setTimeSpan);
        L.Control.TimeConsiderationControl.prototype.setTimeSpan(); // Set initial configuration
        
        return this._container;
    },
    
    setTimeConsideration: function() {
        var timeConsiderationScenario = $('input[name=timeConsideration]:checked').val();
        switch (timeConsiderationScenario) {
            case 'NoTimeConsideration': xServerLayer.options.timeConsideration = 'NONE'; break;
            case 'SnapshotTimeConsideration': xServerLayer.options.timeConsideration = 'SNAPSHOT'; break;
            case 'TimeSpanConsideration': xServerLayer.options.timeConsideration = 'TIME_SPAN'; break;
            case 'OptimisticTimeConsideration': xServerLayer.options.timeConsideration = 'OPTIMISTIC'; break;
            default: return;
        }
        
        L.Control.ThemesControl.prototype.setActiveLayers(); // Set initial configuration
    },
    
    setTimeSpan: function() {
        $('#timespanText').text('Timespan (' + $('#timespan-duration').val() + 'h)');
        xServerLayer.options.timeSpan = $('#timespan-duration').val() * 60 * 60; // timespan duration is specified in sec.

        // The set of active Feature Layers may change when time consideration scenario changes, 
        // because a layer may not support each time consideration scenario. PTV_SpeedPatterns 
        // do not support TimeConsiderationNone for example.
        disableControlInput();
        xServerLayer.redraw();
    },
    
    setInputEnabled: function(enabled) {
        [].slice.call(document.timeConsideration.timeConsideration).forEach(function(element) {
             $('#' + element.id).prop('disabled', enabled ? false : 'disabled'); 
        });
        $('#timespan-duration').prop('disabled', enabled ? false : 'disabled');
    }
});


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Control for setting the reference time which is used for evaluating time-restricted Feature Layer attributes                
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

L.Control.ReferenceTimeControl = L.Control.extend({
    // Leaflet callback, used when control is added to the provided map object.
    onAdd: function(map) {
        this._container = document.getElementById('reference-time-control');

        if (L.DomEvent) {
            L.DomEvent.disableClickPropagation(this._container);
            L.DomEvent.disableScrollPropagation(this._container);
        }

        L.Control.ReferenceTimeControl.prototype.setTimeZone(new Date().getTimezoneOffset() / -60);
//        L.Control.ReferenceTimeControl.prototype.setReferenceTime(); // Set initial configuration

        $('#reference-date, #reference-time').change(L.Control.ReferenceTimeControl.prototype.setReferenceTime);
                        
        $('.spinner .btn:first-of-type').on('click', function() {
            var value = parseInt($('.spinner input').val().substr(0,3), 10);
            if (value < 14)
                value++;
            L.Control.ReferenceTimeControl.prototype.setTimeZone(value);
        });
        $('.spinner .btn:last-of-type').on('click', function() {
            var value = parseInt($('.spinner input').val().substr(0,3), 10);
            if (value > -12)
                value--;
            L.Control.ReferenceTimeControl.prototype.setTimeZone(value);
        });

        document.relevanceOptions.relevanceCheckBox.checked = false;
        document.relevanceOptions.relevanceCheckBox.onclick = function() {
            map.eachLayer(function (layer) {
                if (layer.options.isVirtualHost) {
                    layer.options.showOnlyRelevantByTime = $('input[id=ShowOnlyRelevantByTime]').is(':checked') ? "true" : "false";
                    layer.redraw();
                }
            }, this);
    
//            disableControlInput();
        }
        
        return this._container;
    },
    
    setTimeZone: function(value) {
        $(".spinner .btn:first-of-type").attr("disabled", value >= 14);
        $(".spinner .btn:last-of-type").attr("disabled", value <= -12);
        var result = value > 0 ? '+' : '-';
        var absValue = Math.abs(value);
        if(absValue < 10) {
            result += '0'
        }
        result += absValue + ':00';         
        
        $('.spinner input').val(result);
        L.Control.ReferenceTimeControl.prototype.setReferenceTime();
    },
    
    setReferenceTime: function() {
        // Correction methods are defined in Resources/js/ptv/common-utilities.js
        $('#reference-date').val(correctUTCDate($('#reference-date').val()));
        $('#reference-time').val(correctUTCTime($('#reference-time').val()));
        // URL encoding is necessary due to the '+' character used for time zones
        map.eachLayer(function (layer) {
            if (layer.options.isVirtualHost) {
                layer.options.referenceTime = encodeURIComponent($('#reference-date').val() + 'T' + $('#reference-time').val() +  $('#time-zone').val());
                layer.redraw();
            }
        }, this);
//        disableControlInput();
    },
    
    setInputEnabled: function(enabled) {       
        $('#reference-date').prop('disabled', enabled ? false : 'disabled'); 
        $('#reference-time').prop('disabled', enabled ? false : 'disabled');
        $('#time-zone').prop('disabled', enabled ? false : 'disabled');
        var value = parseInt($('.spinner input').val().substr(0,3), 10);
        $('#time-zone-btn-up').prop('disabled', enabled ? (value < 14) : 'disabled');
        $('#time-zone-btn-down').prop('disabled', enabled ? (value > -12) : 'disabled');
        $('#ShowOnlyRelevantByTime').prop('disabled', enabled ? false : 'disabled');        
    }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Control for setting the user language which is used in the traffic incidents messages.
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

L.Control.LanguageControl = L.Control.extend({
    // Leaflet callback, used when control is added to the provided map object.
    onAdd: function(map) {
        this._container = document.getElementById('language-control');

        if (L.DomEvent) {
            L.DomEvent.disableClickPropagation(this._container);
            L.DomEvent.disableScrollPropagation(this._container);
        }

        document.getElementById('lang_profile').selectedIndex = 1;
        L.Control.LanguageControl.prototype.setUserLanguage(); // Set initial configuration
        $('#lang_profile').change(L.Control.LanguageControl.prototype.setUserLanguage);

        return this._container;
    },
    
    setUserLanguage: function() {
        xServerLayer.options.userLanguage = document.getElementById('lang_profile').value;
        disableControlInput();
        xServerLayer.redraw();
    },
    
    setInputEnabled: function(enabled) {
        $('#lang_profile').prop('disabled', enabled ? false : 'disabled'); 
    }
});


function disableControlInput() {
    L.Control.ProfileControl.prototype.setInputEnabled(false);
    L.Control.ThemesControl.prototype.setInputEnabled(false);
    L.Control.TimeConsiderationControl.prototype.setInputEnabled(false);
    L.Control.ReferenceTimeControl.prototype.setInputEnabled(false);
    L.Control.LanguageControl.prototype.setInputEnabled(false);
}

function enableControlInput() {
    L.Control.ProfileControl.prototype.setInputEnabled(true);
    L.Control.ThemesControl.prototype.setInputEnabled(true);
    L.Control.TimeConsiderationControl.prototype.setInputEnabled(true);
    L.Control.ReferenceTimeControl.prototype.setInputEnabled(true);
    L.Control.LanguageControl.prototype.setInputEnabled(true);   
}
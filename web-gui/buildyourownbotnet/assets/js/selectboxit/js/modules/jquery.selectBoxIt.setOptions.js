
    // Set Options Module
    // ==================

    // Set Options
    // ----------
    //      Accepts an object to replace plugin options
    //      properties of the plugin options object

    selectBoxIt.setOptions = function(newOptions, callback) {

        var self = this;

        // If the passed in parameter is an object literal
        if($.isPlainObject(newOptions)) {

            self.options = $.extend({}, self.options, newOptions);

        }

        // Rebuilds the dropdown
        self.refresh(function() {

            // Provide callback function support
            self._callbackSupport(callback);

        }, true);

        // Maintains chainability
        return self;

    };
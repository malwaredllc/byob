// Destroy Module
// ==============

// Destroy
// -------
//    Removes the plugin from the page

selectBoxIt.destroy = function(callback) {

    // Stores the plugin context inside of the self variable
    var self = this;

    self._destroySelectBoxIt();

    // Calls the jQueryUI Widget Factory destroy method
    self.widgetProto.destroy.call(self);

    // Provides callback function support
    self._callbackSupport(callback);

    // Maintains chainability
    return self;

};

// Internal Destroy Method
// -----------------------
//    Removes the plugin from the page

selectBoxIt._destroySelectBoxIt = function() {

    // Stores the plugin context inside of the self variable
    var self = this;

    // Unbinds all of the dropdown list event handlers with the `selectBoxIt` namespace
    self.dropdown.off(".selectBoxIt");

    // If the original select box has been placed inside of the new drop down container
    if ($.contains(self.dropdownContainer[0], self.originalElem)) {

        // Moves the original select box before the drop down container
        self.dropdownContainer.before(self.selectBox);

    }

    // Remove all of the `selectBoxIt` DOM elements from the page
    self.dropdownContainer.remove();

    // Resets the style attributes for the original select box
    self.selectBox.removeAttr("style").attr("style", self.selectBoxStyles);

    // Triggers the custom `destroy` event on the original select box
    self.triggerEvent("destroy");

    // Maintains chainability
    return self;

};
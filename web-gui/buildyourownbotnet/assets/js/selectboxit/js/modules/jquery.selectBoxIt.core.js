/*! jquery.selectBoxIt - v3.8.1 - 2013-10-17
* http://www.selectboxit.com
* Copyright (c) 2013 Greg Franko; Licensed MIT*/

// Immediately-Invoked Function Expression (IIFE) [Ben Alman Blog Post](http://benalman.com/news/2010/11/immediately-invoked-function-expression/) that calls another IIFE that contains all of the plugin logic.  I used this pattern so that anyone viewing this code would not have to scroll to the bottom of the page to view the local parameters that were passed to the main IIFE.

;(function (selectBoxIt) {

    //ECMAScript 5 Strict Mode: [John Resig Blog Post](http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/)
    "use strict";

    // Calls the second IIFE and locally passes in the global jQuery, window, and document objects
    selectBoxIt(window.jQuery, window, document);

}

// Locally passes in `jQuery`, the `window` object, the `document` object, and an `undefined` variable.  The `jQuery`, `window` and `document` objects are passed in locally, to improve performance, since javascript first searches for a variable match within the local variables set before searching the global variables set.  All of the global variables are also passed in locally to be minifier friendly. `undefined` can be passed in locally, because it is not a reserved word in JavaScript.

(function ($, window, document, undefined) {

    // ECMAScript 5 Strict Mode: [John Resig Blog Post](http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/)
    "use strict";

    // Calling the jQueryUI Widget Factory Method
    $.widget("selectBox.selectBoxIt", {

        // Plugin version
        VERSION: "3.8.1",

        // These options will be used as defaults
        options: {

            // **showEffect**: Accepts String: "none", "fadeIn", "show", "slideDown", or any of the jQueryUI show effects (i.e. "bounce")
            "showEffect": "none",

            // **showEffectOptions**: Accepts an object literal.  All of the available properties are based on the jqueryUI effect options
            "showEffectOptions": {},

            // **showEffectSpeed**: Accepts Number (milliseconds) or String: "slow", "medium", or "fast"
            "showEffectSpeed": "medium",

            // **hideEffect**: Accepts String: "none", "fadeOut", "hide", "slideUp", or any of the jQueryUI hide effects (i.e. "explode")
            "hideEffect": "none",

            // **hideEffectOptions**: Accepts an object literal.  All of the available properties are based on the jqueryUI effect options
            "hideEffectOptions": {},

            // **hideEffectSpeed**: Accepts Number (milliseconds) or String: "slow", "medium", or "fast"
            "hideEffectSpeed": "medium",

            // **showFirstOption**: Shows the first dropdown list option within the dropdown list options list
            "showFirstOption": true,

            // **defaultText**: Overrides the text used by the dropdown list selected option to allow a user to specify custom text.  Accepts a String.
            "defaultText": "",

            // **defaultIcon**: Overrides the icon used by the dropdown list selected option to allow a user to specify a custom icon.  Accepts a String (CSS class name(s)).
            "defaultIcon": "",

            // **downArrowIcon**: Overrides the default down arrow used by the dropdown list to allow a user to specify a custom image.  Accepts a String (CSS class name(s)).
            "downArrowIcon": "",

            // **theme**: Provides theming support for Twitter Bootstrap and jQueryUI
            "theme": "default",

            // **keydownOpen**: Opens the dropdown if the up or down key is pressed when the dropdown is focused
            "keydownOpen": true,

            // **isMobile**: Function to determine if a user's browser is a mobile browser
            "isMobile": function() {

                // Adapted from http://www.detectmobilebrowsers.com
                var ua = navigator.userAgent || navigator.vendor || window.opera;

                // Checks for iOs, Android, Blackberry, Opera Mini, and Windows mobile devices
                return (/iPhone|iPod|iPad|Silk|Android|BlackBerry|Opera Mini|IEMobile/).test(ua);

            },

            // **native**: Triggers the native select box when a user interacts with the drop down
            "native": false,

            // **aggressiveChange**: Will select a drop down item (and trigger a change event) when a user navigates to the item via the keyboard (up and down arrow or search), before a user selects an option with a click or the enter key
            "aggressiveChange": false,

            // **selectWhenHidden: Will allow a user to select an option using the keyboard when the drop down list is hidden and focused
            "selectWhenHidden": true,

            // **viewport**: Allows for a custom domnode used for the viewport. Accepts a selector.  Default is $(window).
            "viewport": $(window),

            // **similarSearch**: Optimizes the search for lists with many similar values (i.e. State lists) by making it easier to navigate through
            "similarSearch": false,

            // **copyAttributes**: HTML attributes that will be copied over to the new drop down
            "copyAttributes": [

                "title",

                "rel"

            ],

            // **copyClasses**: HTML classes that will be copied over to the new drop down.  The value indicates where the classes should be copied.  The default value is 'button', but you can also use 'container' (recommended) or 'none'.
            "copyClasses": "button",

            // **nativeMousedown**: Mimics native firefox drop down behavior by opening the drop down on mousedown and selecting the currently hovered drop down option on mouseup
            "nativeMousedown": false,

            // **customShowHideEvent**: Prevents the drop down from opening on click or mousedown, which allows a user to open/close the drop down with a custom event handler.
            "customShowHideEvent": false,

            // **autoWidth**: Makes sure the width of the drop down is wide enough to fit all of the drop down options
            "autoWidth": true,

            // **html**: Determines whether or not option text is rendered as html or as text
            "html": true,

            // **populate**: Convenience option that accepts JSON data, an array, a single object, or valid HTML string to add options to the drop down list
            "populate": "",

            // **dynamicPositioning**: Determines whether or not the drop down list should fit inside it's viewport
            "dynamicPositioning": true,

            // **hideCurrent**: Determines whether or not the currently selected drop down option is hidden in the list
            "hideCurrent": false

        },

        // Get Themes
        // ----------
        //      Retrieves the active drop down theme and returns the theme object
        "getThemes": function() {

            var self = this,
                theme = $(self.element).attr("data-theme") || "c";

            return {

                // Twitter Bootstrap Theme
                "bootstrap": {

                    "focus": "active",

                    "hover": "",

                    "enabled": "enabled",

                    "disabled": "disabled",

                    "arrow": "caret",

                    "button": "btn",

                    "list": "dropdown-menu",

                    "container": "bootstrap",

                    "open": "open"

                },

                // jQueryUI Theme
                "jqueryui": {

                    "focus": "ui-state-focus",

                    "hover": "ui-state-hover",

                    "enabled": "ui-state-enabled",

                    "disabled": "ui-state-disabled",

                    "arrow": "ui-icon ui-icon-triangle-1-s",

                    "button": "ui-widget ui-state-default",

                    "list": "ui-widget ui-widget-content",

                    "container": "jqueryui",

                    "open": "selectboxit-open"

                },

                // jQuery Mobile Theme
                "jquerymobile": {

                    "focus": "ui-btn-down-" + theme,

                    "hover": "ui-btn-hover-" + theme,

                    "enabled": "ui-enabled",

                    "disabled": "ui-disabled",

                    "arrow": "ui-icon ui-icon-arrow-d ui-icon-shadow",

                    "button": "ui-btn ui-btn-icon-right ui-btn-corner-all ui-shadow ui-btn-up-" + theme,

                    "list": "ui-btn ui-btn-icon-right ui-btn-corner-all ui-shadow ui-btn-up-" + theme,

                    "container": "jquerymobile",

                    "open": "selectboxit-open"

                },

                "default": {

                    "focus": "selectboxit-focus",

                    "hover": "selectboxit-hover",

                    "enabled": "selectboxit-enabled",

                    "disabled": "selectboxit-disabled",

                    "arrow": "selectboxit-default-arrow",

                    "button": "selectboxit-btn",

                    "list": "selectboxit-list",

                    "container": "selectboxit-container",

                    "open": "selectboxit-open"

                }

            };

        },

        // isDeferred
        // ----------
        //      Checks if parameter is a defered object      
        isDeferred: function(def) {
            return $.isPlainObject(def) && def.promise && def.done;
        },

        // _Create
        // -------
        //      Sets the Plugin Instance variables and
        //      constructs the plugin.  Only called once.
        _create: function(internal) {

            var self = this,
                populateOption = self.options["populate"],
                userTheme = self.options["theme"];

            // If the element calling SelectBoxIt is not a select box or is not visible
            if(!self.element.is("select")) {

                // Exits the plugin
                return;

            }

            // Stores a reference to the parent Widget class
            self.widgetProto = $.Widget.prototype;

            // The original select box DOM element
            self.originalElem = self.element[0];

            // The original select box DOM element wrapped in a jQuery object
            self.selectBox = self.element;

            if(self.options["populate"] && self.add && !internal) {

                self.add(populateOption);

            }

            // All of the original select box options
            self.selectItems = self.element.find("option");

            // The first option in the original select box
            self.firstSelectItem = self.selectItems.slice(0, 1);

            // The html document height
            self.documentHeight = $(document).height();

            self.theme = $.isPlainObject(userTheme) ? $.extend({}, self.getThemes()["default"], userTheme) : self.getThemes()[userTheme] ? self.getThemes()[userTheme] : self.getThemes()["default"];

            // The index of the currently selected dropdown list option
            self.currentFocus = 0;

            // Keeps track of which blur events will hide the dropdown list options
            self.blur = true;

             // Array holding all of the original select box options text
            self.textArray = [];

            // Maintains search order in the `search` method
            self.currentIndex = 0;

            // Maintains the current search text in the `search` method
            self.currentText = "";

            // Whether or not the dropdown list opens up or down (depending on how much room is on the page)
            self.flipped = false;

            // If the create method is not called internally by the plugin
            if(!internal) {

                // Saves the original select box `style` attribute within the `selectBoxStyles` plugin instance property
                self.selectBoxStyles = self.selectBox.attr("style");

            }

            // Creates the dropdown elements that will become the dropdown
            // Creates the ul element that will become the dropdown options list
            // Add's all attributes (excluding id, class names, and unselectable properties) to the drop down and drop down items list
            // Hides the original select box and adds the new plugin DOM elements to the page
            // Adds event handlers to the new dropdown list
            self._createDropdownButton()._createUnorderedList()._copyAttributes()._replaceSelectBox()._addClasses(self.theme)._eventHandlers();

            if(self.originalElem.disabled && self.disable) {

                // Disables the dropdown list if the original dropdown list had the `disabled` attribute
                self.disable();

            }

            // If the Aria Accessibility Module has been included
            if(self._ariaAccessibility) {

                // Adds ARIA accessibillity tags to the dropdown list
                self._ariaAccessibility();

            }

            self.isMobile = self.options["isMobile"]();

            if(self._mobile) {

                // Adds mobile support
                self._mobile();

            }

            // If the native option is set to true
            if(self.options["native"]) {

                // Triggers the native select box when a user is interacting with the drop down
                this._applyNativeSelect();

            }

            // Triggers a custom `create` event on the original dropdown list
            self.triggerEvent("create");

            // Maintains chainability
            return self;

        },

        // _Create dropdown button
        // -----------------------
        //      Creates new dropdown and dropdown elements to replace
        //      the original select box with a dropdown list
        _createDropdownButton: function() {

            var self = this,
                originalElemId = self.originalElemId = self.originalElem.id || "",
                originalElemValue = self.originalElemValue = self.originalElem.value || "",
                originalElemName = self.originalElemName = self.originalElem.name || "",
                copyClasses = self.options["copyClasses"],
                selectboxClasses = self.selectBox.attr("class") || "";

            // Creates a dropdown element that contains the dropdown list text value
            self.dropdownText = $("<span/>", {

                // Dynamically sets the dropdown `id` attribute
                "id": originalElemId && originalElemId + "SelectBoxItText",

                "class": "selectboxit-text",

                // IE specific attribute to not allow the element to be selected
                "unselectable": "on",

                // Sets the dropdown `text` to equal the original select box default value
                "text": self.firstSelectItem.text()

            }).

            // Sets the HTML5 data attribute on the dropdownText `dropdown` element
            attr("data-val", originalElemValue);

            self.dropdownImageContainer = $("<span/>", {

                "class": "selectboxit-option-icon-container"

            });

            // Creates a dropdown element that contains the dropdown list text value
            self.dropdownImage = $("<i/>", {

                // Dynamically sets the dropdown `id` attribute
                "id": originalElemId && originalElemId + "SelectBoxItDefaultIcon",

                "class": "selectboxit-default-icon",

                // IE specific attribute to not allow the element to be selected
                "unselectable": "on"

            });

            // Creates a dropdown to act as the new dropdown list
            self.dropdown = $("<span/>", {

                // Dynamically sets the dropdown `id` attribute
                "id": originalElemId && originalElemId + "SelectBoxIt",

                "class": "selectboxit " + (copyClasses === "button" ? selectboxClasses: "") + " " + (self.selectBox.prop("disabled") ? self.theme["disabled"]: self.theme["enabled"]),

                // Sets the dropdown `name` attribute to be the same name as the original select box
                "name": originalElemName,

                // Sets the dropdown `tabindex` attribute to 0 to allow the dropdown to be focusable
                "tabindex": self.selectBox.attr("tabindex") || "0",

                // IE specific attribute to not allow the element to be selected
                "unselectable": "on"

            }).

            // Appends the default text to the inner dropdown list dropdown element
            append(self.dropdownImageContainer.append(self.dropdownImage)).append(self.dropdownText);

            // Create the dropdown container that will hold all of the dropdown list dom elements
            self.dropdownContainer = $("<span/>", {

                "id": originalElemId && originalElemId + "SelectBoxItContainer",

                "class": 'selectboxit-container ' + self.theme.container + ' ' + (copyClasses === "container" ? selectboxClasses: "")

            }).

            // Appends the inner dropdown list dropdown element to the dropdown list container dropdown element
            append(self.dropdown);

            // Maintains chainability
            return self;

        },

        // _Create Unordered List
        // ----------------------
        //      Creates an unordered list element to hold the
        //        new dropdown list options that directly match
        //        the values of the original select box options
        _createUnorderedList: function() {

            // Storing the context of the widget
            var self = this,

                dataDisabled,

                optgroupClass,

                optgroupElement,

                iconClass,

                iconUrl,

                iconUrlClass,

                iconUrlStyle,

                // Declaring the variable that will hold all of the dropdown list option elements
                currentItem = "",

                originalElemId = self.originalElemId || "",

                // Creates an unordered list element
                createdList = $("<ul/>", {

                    // Sets the unordered list `id` attribute
                    "id": originalElemId && originalElemId + "SelectBoxItOptions",

                    "class": "selectboxit-options",

                    //Sets the unordered list `tabindex` attribute to -1 to prevent the unordered list from being focusable
                    "tabindex": -1

                }),

                currentDataSelectedText,

                currentDataText,

                currentDataSearch,

                currentText,

                currentOption,

                parent;

            // Checks the `showFirstOption` plugin option to determine if the first dropdown list option should be shown in the options list.
            if (!self.options["showFirstOption"]) {

                // Disables the first select box option
                self.selectItems.first().attr("disabled", "disabled");

                // Excludes the first dropdown list option from the options list
                self.selectItems = self.selectBox.find("option").slice(1);

            }

            // Loops through the original select box options list and copies the text of each
            // into new list item elements of the new dropdown list
            self.selectItems.each(function(index) {

                currentOption = $(this);

                optgroupClass = "";

                optgroupElement = "";

                dataDisabled = currentOption.prop("disabled");

                iconClass = currentOption.attr("data-icon") || "";

                iconUrl = currentOption.attr("data-iconurl") || "";

                iconUrlClass = iconUrl ? "selectboxit-option-icon-url": "";

                iconUrlStyle = iconUrl ? 'style="background-image:url(\'' + iconUrl + '\');"': "";

                currentDataSelectedText = currentOption.attr("data-selectedtext");

                currentDataText = currentOption.attr("data-text");

                currentText = currentDataText ? currentDataText: currentOption.text();

                parent = currentOption.parent();

                // If the current option being traversed is within an optgroup

                if(parent.is("optgroup")) {

                    optgroupClass = "selectboxit-optgroup-option";

                    if(currentOption.index() === 0) {

                         optgroupElement = '<span class="selectboxit-optgroup-header ' + parent.first().attr("class") + '"data-disabled="true">' + parent.first().attr("label") + '</span>';

                    }

                }

                currentOption.attr("value", this.value);

                // Uses string concatenation for speed (applies HTML attribute encoding)
                currentItem += optgroupElement + '<li data-id="' + index + '" data-val="' + this.value + '" data-disabled="' + dataDisabled + '" class="' + optgroupClass + " selectboxit-option " + ($(this).attr("class") || "") + '"><a class="selectboxit-option-anchor"><span class="selectboxit-option-icon-container"><i class="selectboxit-option-icon ' + iconClass + ' ' + (iconUrlClass || self.theme["container"]) + '"' + iconUrlStyle + '></i></span>' + (self.options["html"] ? currentText: self.htmlEscape(currentText)) + '</a></li>';

                currentDataSearch = currentOption.attr("data-search");

                // Stores all of the original select box options text inside of an array
                // (Used later in the `searchAlgorithm` method)
                self.textArray[index] = dataDisabled ? "": currentDataSearch ? currentDataSearch: currentText;

                // Checks the original select box option for the `selected` attribute
                if (this.selected) {

                    // Replaces the default text with the selected option text
                    self._setText(self.dropdownText, currentDataSelectedText || currentText);

                    //Set the currently selected option
                    self.currentFocus = index;

                }

            });

            // If the `defaultText` option is being used
            if ((self.options["defaultText"] || self.selectBox.attr("data-text"))) {

                var defaultedText = self.options["defaultText"] || self.selectBox.attr("data-text");

                // Overrides the current dropdown default text with the value the user specifies in the `defaultText` option
                self._setText(self.dropdownText, defaultedText);

                self.options["defaultText"] = defaultedText;

            }

            // Append the list item to the unordered list
            createdList.append(currentItem);

            // Stores the dropdown list options list inside of the `list` instance variable
            self.list = createdList;

            // Append the dropdown list options list to the dropdown container element
            self.dropdownContainer.append(self.list);

            // Stores the individual dropdown list options inside of the `listItems` instance variable
            self.listItems = self.list.children("li");

            self.listAnchors = self.list.find("a");

            // Sets the 'selectboxit-option-first' class name on the first drop down option
            self.listItems.first().addClass("selectboxit-option-first");

            // Sets the 'selectboxit-option-last' class name on the last drop down option
            self.listItems.last().addClass("selectboxit-option-last");

            // Set the disabled CSS class for select box options
            self.list.find("li[data-disabled='true']").not(".optgroupHeader").addClass(self.theme["disabled"]);

            self.dropdownImage.addClass(self.selectBox.attr("data-icon") || self.options["defaultIcon"] || self.listItems.eq(self.currentFocus).find("i").attr("class"));

            self.dropdownImage.attr("style", self.listItems.eq(self.currentFocus).find("i").attr("style"));

            //Maintains chainability
            return self;

        },

        // _Replace Select Box
        // -------------------
        //      Hides the original dropdown list and inserts
        //        the new DOM elements
        _replaceSelectBox: function() {

            var self = this,
                height,
                originalElemId = self.originalElem.id || "",
                size = self.selectBox.attr("data-size"),
                listSize = self.listSize = size === undefined ? "auto" : size === "0" || "size" === "auto" ? "auto" : +size,
                downArrowContainerWidth,
                dropdownImageWidth;

            // Hides the original select box
            self.selectBox.css("display", "none").

            // Adds the new dropdown list to the page directly after the hidden original select box element
            after(self.dropdownContainer);

            self.dropdownContainer.appendTo('body').

            addClass('selectboxit-rendering');

            // The height of the dropdown list
            height = self.dropdown.height();

            // The down arrow element of the dropdown list
            self.downArrow = $("<i/>", {

                // Dynamically sets the dropdown `id` attribute of the dropdown list down arrow
                "id": originalElemId && originalElemId + "SelectBoxItArrow",

                "class": "selectboxit-arrow",

                // IE specific attribute to not allow the dropdown list text to be selected
                "unselectable": "on"

            });

            // The down arrow container element of the dropdown list
            self.downArrowContainer = $("<span/>", {

                // Dynamically sets the dropdown `id` attribute for the down arrow container element
                "id": originalElemId && originalElemId + "SelectBoxItArrowContainer",

                "class": "selectboxit-arrow-container",

                // IE specific attribute to not allow the dropdown list text to be selected
                "unselectable": "on"

            }).

            // Inserts the down arrow element inside of the down arrow container element
            append(self.downArrow);

            // Appends the down arrow element to the dropdown list
            self.dropdown.append(self.downArrowContainer);

            // Adds the `selectboxit-selected` class name to the currently selected drop down option
            self.listItems.removeClass("selectboxit-selected").eq(self.currentFocus).addClass("selectboxit-selected");

            // The full outer width of the down arrow container
            downArrowContainerWidth = self.downArrowContainer.outerWidth(true);

            // The full outer width of the dropdown image
            dropdownImageWidth = self.dropdownImage.outerWidth(true);

            // If the `autoWidth` option is true
            if(self.options["autoWidth"]) {

                // Sets the auto width of the drop down
                self.dropdown.css({ "width": "auto" }).css({

                    "width": self.list.outerWidth(true) + downArrowContainerWidth + dropdownImageWidth

                });

                self.list.css({

                    "min-width": self.dropdown.width()

                });

            }

            // Dynamically adds the `max-width` and `line-height` CSS styles of the dropdown list text element
            self.dropdownText.css({

                "max-width": self.dropdownContainer.outerWidth(true) - (downArrowContainerWidth + dropdownImageWidth)

            });

            // Adds the new dropdown list to the page directly after the hidden original select box element
            self.selectBox.after(self.dropdownContainer);

            self.dropdownContainer.removeClass('selectboxit-rendering');

            if($.type(listSize) === "number") {

                // Stores the new `max-height` for later
                self.maxHeight = self.listAnchors.outerHeight(true) * listSize;

            }

            // Maintains chainability
            return self;

        },

        // _Scroll-To-View
        // ---------------
        //      Updates the dropdown list scrollTop value
        _scrollToView: function(type) {

            var self = this,

                currentOption = self.listItems.eq(self.currentFocus),

                // The current scroll positioning of the dropdown list options list
                listScrollTop = self.list.scrollTop(),

                // The height of the currently selected dropdown list option
                currentItemHeight = currentOption.height(),

                // The relative distance from the currently selected dropdown list option to the the top of the dropdown list options list
                currentTopPosition = currentOption.position().top,

                absCurrentTopPosition = Math.abs(currentTopPosition),

                // The height of the dropdown list option list
                listHeight = self.list.height(),

                currentText;

            // Scrolling logic for a text search
            if (type === "search") {

                // Increases the dropdown list options `scrollTop` if a user is searching for an option
                // below the currently selected option that is not visible
                if (listHeight - currentTopPosition < currentItemHeight) {

                    // The selected option will be shown at the very bottom of the visible options list
                    self.list.scrollTop(listScrollTop + (currentTopPosition - (listHeight - currentItemHeight)));

                }

                // Decreases the dropdown list options `scrollTop` if a user is searching for an option above the currently selected option that is not visible
                else if (currentTopPosition < -1) {

                    self.list.scrollTop(currentTopPosition - currentItemHeight);

                }
            }

            // Scrolling logic for the `up` keyboard navigation
            else if (type === "up") {

                // Decreases the dropdown list option list `scrollTop` if a user is navigating to an element that is not visible
                if (currentTopPosition < -1) {

                    self.list.scrollTop(listScrollTop - absCurrentTopPosition);

                }
            }

            // Scrolling logic for the `down` keyboard navigation
            else if (type === "down") {

                // Increases the dropdown list options `scrollTop` if a user is navigating to an element that is not fully visible
                if (listHeight - currentTopPosition < currentItemHeight) {

                    // Increases the dropdown list options `scrollTop` by the height of the current option item.
                    self.list.scrollTop((listScrollTop + (absCurrentTopPosition - listHeight + currentItemHeight)));

                }
            }

            // Maintains chainability
            return self;

        },

        // _Callback
        // ---------
        //      Call the function passed into the method
        _callbackSupport: function(callback) {

            var self = this;

            // Checks to make sure the parameter passed in is a function
            if ($.isFunction(callback)) {

                // Calls the method passed in as a parameter and sets the current `SelectBoxIt` object that is stored in the jQuery data method as the context(allows for `this` to reference the SelectBoxIt API Methods in the callback function. The `dropdown` DOM element that acts as the new dropdown list is also passed as the only parameter to the callback
                callback.call(self, self.dropdown);

            }

            // Maintains chainability
            return self;

        },

        // _setText
        // --------
        //      Set's the text or html for the drop down
        _setText: function(elem, currentText) {

            var self = this;

            if(self.options["html"]) {

                elem.html(currentText);

            }

            else {

                elem.text(currentText);

            }

            return self;

        },

        // Open
        // ----
        //      Opens the dropdown list options list
        open: function(callback) {

            var self = this,
                showEffect = self.options["showEffect"],
                showEffectSpeed = self.options["showEffectSpeed"],
                showEffectOptions = self.options["showEffectOptions"],
                isNative = self.options["native"],
                isMobile = self.isMobile;

            // If there are no select box options, do not try to open the select box
            if(!self.listItems.length || self.dropdown.hasClass(self.theme["disabled"])) {

                return self;

            }

            // If the new drop down is being used and is not visible
            if((!isNative && !isMobile) && !this.list.is(":visible")) {

                // Triggers a custom "open" event on the original select box
                self.triggerEvent("open");

                if (self._dynamicPositioning && self.options["dynamicPositioning"]) {

                    // Dynamically positions the dropdown list options list
                    self._dynamicPositioning();

                }

                // Uses `no effect`
                if(showEffect === "none") {

                    // Does not require a callback function because this animation will complete before the call to `scrollToView`
                    self.list.show();

                }

                // Uses the jQuery `show` special effect
                else if(showEffect === "show" || showEffect === "slideDown" || showEffect === "fadeIn") {

                    // Requires a callback function to determine when the `show` animation is complete
                    self.list[showEffect](showEffectSpeed);

                }

                // If none of the above options were passed, then a `jqueryUI show effect` is expected
                else {

                    // Allows for custom show effects via the [jQueryUI core effects](http://http://jqueryui.com/demos/show/)
                    self.list.show(showEffect, showEffectOptions, showEffectSpeed);

                }

                self.list.promise().done(function() {

                    // Updates the list `scrollTop` attribute
                    self._scrollToView("search");

                    // Triggers a custom "opened" event when the drop down list is done animating
                    self.triggerEvent("opened");

                });

            }

            // Provide callback function support
            self._callbackSupport(callback);

            // Maintains chainability
            return self;

        },

        // Close
        // -----
        //      Closes the dropdown list options list
        close: function(callback) {

            var self = this,
                hideEffect = self.options["hideEffect"],
                hideEffectSpeed = self.options["hideEffectSpeed"],
                hideEffectOptions = self.options["hideEffectOptions"],
                isNative = self.options["native"],
                isMobile = self.isMobile;

            // If the drop down is being used and is visible
            if((!isNative && !isMobile) && self.list.is(":visible")) {

                // Triggers a custom "close" event on the original select box
                self.triggerEvent("close");

                // Uses `no effect`
                if(hideEffect === "none") {

                    // Does not require a callback function because this animation will complete before the call to `scrollToView`
                    self.list.hide();

                }

                // Uses the jQuery `hide` special effect
                else if(hideEffect === "hide" || hideEffect === "slideUp" || hideEffect === "fadeOut") {

                    self.list[hideEffect](hideEffectSpeed);

                }

                // If none of the above options were passed, then a `jqueryUI hide effect` is expected
                else {

                    // Allows for custom hide effects via the [jQueryUI core effects](http://http://jqueryui.com/demos/hide/)
                    self.list.hide(hideEffect, hideEffectOptions, hideEffectSpeed);

                }

                // After the drop down list is done animating
                self.list.promise().done(function() {

                    // Triggers a custom "closed" event when the drop down list is done animating
                    self.triggerEvent("closed");

                });

            }

            // Provide callback function support
            self._callbackSupport(callback);

            // Maintains chainability
            return self;

        },

        toggle: function() {

            var self = this,
                listIsVisible = self.list.is(":visible");

            if(listIsVisible) {

                self.close();

            }

            else if(!listIsVisible) {

                self.open();

            }

        },

        // _Key Mappings
        // -------------
        //      Object literal holding the string representation of each key code
        _keyMappings: {

            "38": "up",

            "40": "down",

            "13": "enter",

            "8": "backspace",

            "9": "tab",

            "32": "space",

            "27": "esc"

        },

        // _Key Down Methods
        // -----------------
        //      Methods to use when the keydown event is triggered
        _keydownMethods: function() {

            var self = this,
                moveToOption = self.list.is(":visible") || !self.options["keydownOpen"];

            return {

                "down": function() {

                    // If the plugin options allow keyboard navigation
                    if (self.moveDown && moveToOption) {

                        self.moveDown();

                    }

                },

                "up": function() {

                     // If the plugin options allow keyboard navigation
                    if (self.moveUp && moveToOption) {

                        self.moveUp();

                    }

                },

                "enter": function() {

                    var activeElem = self.listItems.eq(self.currentFocus);

                    // Updates the dropdown list value
                    self._update(activeElem);

                    if (activeElem.attr("data-preventclose") !== "true") {

                        // Closes the drop down list options list
                        self.close();

                    }

                    // Triggers the `enter` events on the original select box
                    self.triggerEvent("enter");

                },

                "tab": function() {

                    // Triggers the custom `tab-blur` event on the original select box
                    self.triggerEvent("tab-blur");

                    // Closes the drop down list
                    self.close();

                },

                "backspace": function() {

                    // Triggers the custom `backspace` event on the original select box
                    self.triggerEvent("backspace");

                },

                "esc": function() {

                    // Closes the dropdown options list
                    self.close();

                }

            };

        },


        // _Event Handlers
        // ---------------
        //      Adds event handlers to the new dropdown and the original select box
        _eventHandlers: function() {

            // LOCAL VARIABLES
            var self = this,
                nativeMousedown = self.options["nativeMousedown"],
                customShowHideEvent = self.options["customShowHideEvent"],
                currentDataText,
                currentText,
                focusClass = self.focusClass,
                hoverClass = self.hoverClass,
                openClass = self.openClass;

            // Select Box events
            this.dropdown.on({

                // `click` event with the `selectBoxIt` namespace
                "click.selectBoxIt": function() {

                    // Used to make sure the dropdown becomes focused (fixes IE issue)
                    self.dropdown.trigger("focus", true);

                    // The `click` handler logic will only be applied if the dropdown list is enabled
                    if (!self.originalElem.disabled) {

                        // Triggers the `click` event on the original select box
                        self.triggerEvent("click");

                        if(!nativeMousedown && !customShowHideEvent) {

                            self.toggle();

                        }

                    }

                },

                // `mousedown` event with the `selectBoxIt` namespace
                "mousedown.selectBoxIt": function() {

                    // Stores data in the jQuery `data` method to help determine if the dropdown list gains focus from a click or tabstop.  The mousedown event fires before the focus event.
                    $(this).data("mdown", true);

                    self.triggerEvent("mousedown");

                    if(nativeMousedown && !customShowHideEvent) {

                        self.toggle();

                    }

                },

                // `mouseup` event with the `selectBoxIt` namespace
                "mouseup.selectBoxIt": function() {

                    self.triggerEvent("mouseup");

                },

                // `blur` event with the `selectBoxIt` namespace.  Uses special blur logic to make sure the dropdown list closes correctly
                "blur.selectBoxIt": function() {

                    // If `self.blur` property is true
                    if (self.blur) {

                        // Triggers both the `blur` and `focusout` events on the original select box.
                        // The `focusout` event is also triggered because the event bubbles
                        // This event has to be used when using event delegation (such as the jQuery `delegate` or `on` methods)
                        // Popular open source projects such as Backbone.js utilize event delegation to bind events, so if you are using Backbone.js, use the `focusout` event instead of the `blur` event
                        self.triggerEvent("blur");

                        // Closes the dropdown list options list
                        self.close();

                        $(this).removeClass(focusClass);

                    }

                },

                "focus.selectBoxIt": function(event, internal) {

                    // Stores the data associated with the mousedown event inside of a local variable
                    var mdown = $(this).data("mdown");

                    // Removes the jQuery data associated with the mousedown event
                    $(this).removeData("mdown");

                    // If a mousedown event did not occur and no data was passed to the focus event (this correctly triggers the focus event), then the dropdown list gained focus from a tabstop
                    if (!mdown && !internal) {

                        setTimeout(function() {

                            // Triggers the `tabFocus` custom event on the original select box
                            self.triggerEvent("tab-focus");

                        }, 0);

                    }

                    // Only trigger the `focus` event on the original select box if the dropdown list is hidden (this verifies that only the correct `focus` events are used to trigger the event on the original select box
                    if(!internal) {

                        if(!$(this).hasClass(self.theme["disabled"])) {

                            $(this).addClass(focusClass);

                        }

                        //Triggers the `focus` default event on the original select box
                        self.triggerEvent("focus");

                    }

                },

                // `keydown` event with the `selectBoxIt` namespace.  Catches all user keyboard navigations
                "keydown.selectBoxIt": function(e) {

                    // Stores the `keycode` value in a local variable
                    var currentKey = self._keyMappings[e.keyCode],

                        keydownMethod = self._keydownMethods()[currentKey];

                    if(keydownMethod) {

                        keydownMethod();

                        if(self.options["keydownOpen"] && (currentKey === "up" || currentKey === "down")) {

                            self.open();

                        }

                    }

                    if(keydownMethod && currentKey !== "tab") {

                        e.preventDefault();

                    }

                },

                // `keypress` event with the `selectBoxIt` namespace.  Catches all user keyboard text searches since you can only reliably get character codes using the `keypress` event
                "keypress.selectBoxIt": function(e) {

                    // Sets the current key to the `keyCode` value if `charCode` does not exist.  Used for cross
                    // browser support since IE uses `keyCode` instead of `charCode`.
                    var currentKey = e.charCode || e.keyCode,

                        key = self._keyMappings[e.charCode || e.keyCode],

                        // Converts unicode values to characters
                        alphaNumericKey = String.fromCharCode(currentKey);

                    // If the plugin options allow text searches
                    if (self.search && (!key || (key && key === "space"))) {

                        // Calls `search` and passes the character value of the user's text search
                        self.search(alphaNumericKey, true, true);

                    }

                    if(key === "space") {

                        e.preventDefault();

                    }

                },

                // `mousenter` event with the `selectBoxIt` namespace .The mouseenter JavaScript event is proprietary to Internet Explorer. Because of the event's general utility, jQuery simulates this event so that it can be used regardless of browser.
                "mouseenter.selectBoxIt": function() {

                    // Trigger the `mouseenter` event on the original select box
                    self.triggerEvent("mouseenter");

                },

                // `mouseleave` event with the `selectBoxIt` namespace. The mouseleave JavaScript event is proprietary to Internet Explorer. Because of the event's general utility, jQuery simulates this event so that it can be used regardless of browser.
                "mouseleave.selectBoxIt": function() {

                    // Trigger the `mouseleave` event on the original select box
                    self.triggerEvent("mouseleave");

                }

            });

            // Select box options events that set the dropdown list blur logic (decides when the dropdown list gets
            // closed)
            self.list.on({

                // `mouseover` event with the `selectBoxIt` namespace
                "mouseover.selectBoxIt": function() {

                    // Prevents the dropdown list options list from closing
                    self.blur = false;

                },

                // `mouseout` event with the `selectBoxIt` namespace
                "mouseout.selectBoxIt": function() {

                    // Allows the dropdown list options list to close
                    self.blur = true;

                },

                // `focusin` event with the `selectBoxIt` namespace
                "focusin.selectBoxIt": function() {

                    // Prevents the default browser outline border to flicker, which results because of the `blur` event
                    self.dropdown.trigger("focus", true);

                }

            });

            // Select box individual options events bound with the jQuery `delegate` method.  `Delegate` was used because binding indropdownidual events to each list item (since we don't know how many there will be) would decrease performance.  Instead, we bind each event to the unordered list, provide the list item context, and allow the list item events to bubble up (`event bubbling`). This greatly increases page performance because we only have to bind an event to one element instead of x number of elements. Delegates the `click` event with the `selectBoxIt` namespace to the list items
            self.list.on({

                "mousedown.selectBoxIt": function() {

                    self._update($(this));

                    self.triggerEvent("option-click");

                    // If the current drop down option is not disabled
                    if ($(this).attr("data-disabled") === "false" && $(this).attr("data-preventclose") !== "true") {

                        // Closes the drop down list
                        self.close();

                    }

                    setTimeout(function() {

                        self.dropdown.trigger('focus', true);

                    }, 0);

                },

               // Delegates the `focusin` event with the `selectBoxIt` namespace to the list items
               "focusin.selectBoxIt": function() {

                    // Removes the hover class from the previous drop down option
                    self.listItems.not($(this)).removeAttr("data-active");

                    $(this).attr("data-active", "");

                    var listIsHidden = self.list.is(":hidden");

                    if((self.options["searchWhenHidden"] && listIsHidden) || self.options["aggressiveChange"] || (listIsHidden && self.options["selectWhenHidden"])) {

                        self._update($(this));

                    }

                    // Adds the focus CSS class to the currently focused dropdown list option
                   $(this).addClass(focusClass);

                },

                // Delegates the `focus` event with the `selectBoxIt` namespace to the list items
                "mouseup.selectBoxIt": function() {

                    if(nativeMousedown && !customShowHideEvent) {

                        self._update($(this));

                        self.triggerEvent("option-mouseup");

                        // If the current drop down option is not disabled
                        if ($(this).attr("data-disabled") === "false" && $(this).attr("data-preventclose") !== "true") {

                            // Closes the drop down list
                            self.close();

                        }

                    }

                },

                // Delegates the `mouseenter` event with the `selectBoxIt` namespace to the list items
                "mouseenter.selectBoxIt": function() {

                    // If the currently moused over drop down option is not disabled
                    if($(this).attr("data-disabled") === "false") {

                        self.listItems.removeAttr("data-active");

                        $(this).addClass(focusClass).attr("data-active", "");

                        // Sets the dropdown list indropdownidual options back to the default state and sets the focus CSS class on the currently hovered option
                        self.listItems.not($(this)).removeClass(focusClass);

                        $(this).addClass(focusClass);

                        self.currentFocus = +$(this).attr("data-id");

                    }

                },

                // Delegates the `mouseleave` event with the `selectBoxIt` namespace to the list items
                "mouseleave.selectBoxIt": function() {

                    // If the currently moused over drop down option is not disabled
                    if($(this).attr("data-disabled") === "false") {

                        // Removes the focus class from the previous drop down option
                        self.listItems.not($(this)).removeClass(focusClass).removeAttr("data-active");

                        $(this).addClass(focusClass);

                        self.currentFocus = +$(this).attr("data-id");

                    }

                },

                // Delegates the `blur` event with the `selectBoxIt` namespace to the list items
                "blur.selectBoxIt": function() {

                    // Removes the focus CSS class from the previously focused dropdown list option
                    $(this).removeClass(focusClass);

                }

            }, ".selectboxit-option");

            // Select box individual option anchor events bound with the jQuery `delegate` method.  `Delegate` was used because binding indropdownidual events to each list item (since we don't know how many there will be) would decrease performance.  Instead, we bind each event to the unordered list, provide the list item context, and allow the list item events to bubble up (`event bubbling`). This greatly increases page performance because we only have to bind an event to one element instead of x number of elements. Delegates the `click` event with the `selectBoxIt` namespace to the list items
            self.list.on({

                "click.selectBoxIt": function(ev) {

                    // Prevents the internal anchor tag from doing anything funny
                    ev.preventDefault();

                }

            }, "a");

            // Original dropdown list events
            self.selectBox.on({

                // `change` event handler with the `selectBoxIt` namespace
                "change.selectBoxIt, internal-change.selectBoxIt": function(event, internal) {

                    var currentOption,
                        currentDataSelectedText;

                    // If the user called the change method
                    if(!internal) {

                        currentOption = self.list.find('li[data-val="' + self.originalElem.value + '"]');

                        // If there is a dropdown option with the same value as the original select box element
                        if(currentOption.length) {

                            self.listItems.eq(self.currentFocus).removeClass(self.focusClass);

                            self.currentFocus = +currentOption.attr("data-id");

                        }

                    }

                    currentOption = self.listItems.eq(self.currentFocus);

                    currentDataSelectedText = currentOption.attr("data-selectedtext");

                    currentDataText = currentOption.attr("data-text");

                    currentText = currentDataText ?  currentDataText: currentOption.find("a").text();

                    // Sets the new dropdown list text to the value of the current option
                    self._setText(self.dropdownText, currentDataSelectedText || currentText);

                    self.dropdownText.attr("data-val", self.originalElem.value);

                    if(currentOption.find("i").attr("class")) {

                        self.dropdownImage.attr("class", currentOption.find("i").attr("class")).addClass("selectboxit-default-icon");

                        self.dropdownImage.attr("style", currentOption.find("i").attr("style"));
                    }

                    // Triggers a custom changed event on the original select box
                    self.triggerEvent("changed");

                },

                // `disable` event with the `selectBoxIt` namespace
                "disable.selectBoxIt": function() {

                    // Adds the `disabled` CSS class to the new dropdown list to visually show that it is disabled
                    self.dropdown.addClass(self.theme["disabled"]);

                },

                // `enable` event with the `selectBoxIt` namespace
                "enable.selectBoxIt": function() {

                    // Removes the `disabled` CSS class from the new dropdown list to visually show that it is enabled
                    self.dropdown.removeClass(self.theme["disabled"]);

                },

                // `open` event with the `selectBoxIt` namespace
                "open.selectBoxIt": function() {

                    var currentElem = self.list.find("li[data-val='" + self.dropdownText.attr("data-val") + "']"),
                        activeElem;

                    // If no current element can be found, then select the first drop down option
                    if(!currentElem.length) {

                        // Sets the default value of the dropdown list to the first option that is not disabled
                        currentElem = self.listItems.not("[data-disabled=true]").first();

                    }

                    self.currentFocus = +currentElem.attr("data-id");

                    activeElem = self.listItems.eq(self.currentFocus);

                    self.dropdown.addClass(openClass).

                    // Removes the focus class from the dropdown list and adds the library focus class for both the dropdown list and the currently selected dropdown list option
                    removeClass(hoverClass).addClass(focusClass);

                    self.listItems.removeClass(self.selectedClass).

                    removeAttr("data-active").not(activeElem).removeClass(focusClass);

                    activeElem.addClass(self.selectedClass).addClass(focusClass);

                    if(self.options.hideCurrent) {

                        self.listItems.show();

                        activeElem.hide();

                    }

                },

                "close.selectBoxIt": function() {

                    // Removes the open class from the dropdown container
                    self.dropdown.removeClass(openClass);

                },

                "blur.selectBoxIt": function() {

                    self.dropdown.removeClass(focusClass);

                },

                // `mousenter` event with the `selectBoxIt` namespace
                "mouseenter.selectBoxIt": function() {

                    if(!$(this).hasClass(self.theme["disabled"])) {
                        self.dropdown.addClass(hoverClass);
                    }

                },

                // `mouseleave` event with the `selectBoxIt` namespace
                "mouseleave.selectBoxIt": function() {

                    // Removes the hover CSS class on the previously hovered dropdown list option
                    self.dropdown.removeClass(hoverClass);

                },

                // `destroy` event
                "destroy": function(ev) {

                    // Prevents the default action from happening
                    ev.preventDefault();

                    // Prevents the destroy event from propagating
                    ev.stopPropagation();

                }

            });

            // Maintains chainability
            return self;

        },

        // _update
        // -------
        //      Updates the drop down and select box with the current value
        _update: function(elem) {

            var self = this,
                currentDataSelectedText,
                currentDataText,
                currentText,
                defaultText = self.options["defaultText"] || self.selectBox.attr("data-text"),
                currentElem = self.listItems.eq(self.currentFocus);

            if (elem.attr("data-disabled") === "false") {

                currentDataSelectedText = self.listItems.eq(self.currentFocus).attr("data-selectedtext");

                currentDataText = currentElem.attr("data-text");

                currentText = currentDataText ? currentDataText: currentElem.text();

                // If the default text option is set and the current drop down option is not disabled
                if ((defaultText && self.options["html"] ? self.dropdownText.html() === defaultText: self.dropdownText.text() === defaultText) && self.selectBox.val() === elem.attr("data-val")) {

                    self.triggerEvent("change");

                }

                else {

                    // Sets the original dropdown list value and triggers the `change` event on the original select box
                    self.selectBox.val(elem.attr("data-val"));

                    // Sets `currentFocus` to the currently focused dropdown list option.
                    // The unary `+` operator casts the string to a number
                    // [James Padolsey Blog Post](http://james.padolsey.com/javascript/terse-javascript-101-part-2/)
                    self.currentFocus = +elem.attr("data-id");

                    // Triggers the dropdown list `change` event if a value change occurs
                    if (self.originalElem.value !== self.dropdownText.attr("data-val")) {

                        self.triggerEvent("change");

                    }

                }

            }

        },

        // _addClasses
        // -----------
        //      Adds SelectBoxIt CSS classes
        _addClasses: function(obj) {

            var self = this,

                focusClass = self.focusClass = obj.focus,

                hoverClass = self.hoverClass = obj.hover,

                buttonClass = obj.button,

                listClass = obj.list,

                arrowClass = obj.arrow,

                containerClass = obj.container,

                openClass = self.openClass = obj.open;

            self.selectedClass = "selectboxit-selected";

            self.downArrow.addClass(self.selectBox.attr("data-downarrow") || self.options["downArrowIcon"] || arrowClass);

            // Adds the correct container class to the dropdown list
            self.dropdownContainer.addClass(containerClass);

            // Adds the correct class to the dropdown list
            self.dropdown.addClass(buttonClass);

            // Adds the default class to the dropdown list options
            self.list.addClass(listClass);

            // Maintains chainability
            return self;

        },

        // Refresh
        // -------
        //    The dropdown will rebuild itself.  Useful for dynamic content.
        refresh: function(callback, internal) {

            var self = this;

            // Destroys the plugin and then recreates the plugin
            self._destroySelectBoxIt()._create(true);

            if(!internal) {
                self.triggerEvent("refresh");
            }

            self._callbackSupport(callback);

            //Maintains chainability
            return self;

        },

        // HTML Escape
        // -----------
        //      HTML encodes a string
        htmlEscape: function(str) {

            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

        },

        // triggerEvent
        // ------------
        //      Trigger's an external event on the original select box element
        triggerEvent: function(eventName) {

            var self = this,
                // Finds the currently option index
                currentIndex = self.options["showFirstOption"] ? self.currentFocus : ((self.currentFocus - 1) >= 0 ? self.currentFocus: 0);

            // Triggers the custom option-click event on the original select box and passes the select box option
            self.selectBox.trigger(eventName, { "selectbox": self.selectBox, "selectboxOption": self.selectItems.eq(currentIndex), "dropdown": self.dropdown, "dropdownOption": self.listItems.eq(self.currentFocus) });

            // Maintains chainability
            return self;

        },

        // _copyAttributes
        // ---------------
        //      Copies HTML attributes from the original select box to the new drop down 
        _copyAttributes: function() {

            var self = this;

            if(self._addSelectBoxAttributes) {

                self._addSelectBoxAttributes();

            }

            return self;

        },

        // _realOuterWidth
        // ---------------
        //      Retrieves the true outerWidth dimensions of a hidden DOM element
        _realOuterWidth: function(elem) {

            if(elem.is(":visible")) {

                return elem.outerWidth(true);

            }

            var self = this,
                clonedElem = elem.clone(),
                outerWidth;

            clonedElem.css({

                "visibility": "hidden",

                "display": "block",

                "position": "absolute"

            }).appendTo("body");

            outerWidth = clonedElem.outerWidth(true);

            clonedElem.remove();

            return outerWidth;
        }

    });

    // Stores the plugin prototype object in a local variable
    var selectBoxIt = $.selectBox.selectBoxIt.prototype;
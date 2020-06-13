
    // Dynamic Positioning Module
    // ==========================

    // _Dynamic positioning
    // --------------------
    //      Dynamically positions the dropdown list options list

    selectBoxIt._dynamicPositioning = function() {

        var self = this;

        // If the `size` option is a number
        if($.type(self.listSize) === "number") {

            // Set's the max-height of the drop down list
            self.list.css("max-height", self.maxHeight || "none");

        }

        // If the `size` option is not a number
        else {

            // Returns the x and y coordinates of the dropdown list options list relative to the document
            var listOffsetTop = self.dropdown.offset().top,

                // The height of the dropdown list options list
                listHeight = self.list.data("max-height") || self.list.outerHeight(),

                // The height of the dropdown list DOM element
                selectBoxHeight = self.dropdown.outerHeight(),

                viewport = self.options["viewport"],

                viewportHeight = viewport.height(),

                viewportScrollTop = $.isWindow(viewport.get(0)) ? viewport.scrollTop() : viewport.offset().top,

                topToBottom = (listOffsetTop + selectBoxHeight + listHeight <= viewportHeight + viewportScrollTop),

                bottomReached = !topToBottom;

            if(!self.list.data("max-height")) {

              self.list.data("max-height", self.list.outerHeight());

            }

            // If there is room on the bottom of the viewport to display the drop down options
            if (!bottomReached) {

                self.list.css("max-height", listHeight);

                // Sets custom CSS properties to place the dropdown list options directly below the dropdown list
                self.list.css("top", "auto");

            }

            // If there is room on the top of the viewport
            else if((self.dropdown.offset().top - viewportScrollTop) >= listHeight) {

                self.list.css("max-height", listHeight);

                // Sets custom CSS properties to place the dropdown list options directly above the dropdown list
                self.list.css("top", (self.dropdown.position().top - self.list.outerHeight()));

            }

            // If there is not enough room on the top or the bottom
            else {

                var outsideBottomViewport = Math.abs((listOffsetTop + selectBoxHeight + listHeight) - (viewportHeight + viewportScrollTop)),

                    outsideTopViewport = Math.abs((self.dropdown.offset().top - viewportScrollTop) - listHeight);

                // If there is more room on the bottom
                if(outsideBottomViewport < outsideTopViewport) {

                    self.list.css("max-height", listHeight - outsideBottomViewport - (selectBoxHeight/2));

                    self.list.css("top", "auto");

                }

                // If there is more room on the top
                else {

                    self.list.css("max-height", listHeight - outsideTopViewport - (selectBoxHeight/2));

                    // Sets custom CSS properties to place the dropdown list options directly above the dropdown list
                    self.list.css("top", (self.dropdown.position().top - self.list.outerHeight()));

                }

            }

        }

        // Maintains chainability
        return self;

    };
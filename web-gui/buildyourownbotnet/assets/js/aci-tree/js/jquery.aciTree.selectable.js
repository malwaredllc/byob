
/*
 * aciTree jQuery Plugin v4.5.0-rc.3
 * http://acoderinsights.ro
 *
 * Copyright (c) 2014 Dragos Ursu
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Require jQuery Library >= v1.9.0 http://jquery.com
 * + aciPlugin >= v1.5.1 https://github.com/dragosu/jquery-aciPlugin
 */

/*
 * This extension adds item selection/keyboard navigation to aciTree and need to
 * be always included if you care about accessibility.
 *
 * There is an extra property for the item data:
 *
 * {
 *   ...
 *   selected: false,                    // TRUE means the item will be selected
 *   ...
 * }
 *
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        selectable: true,               // if TRUE then one item can be selected (and the tree navigation with the keyboard will be enabled)
        multiSelectable: false,         // if TRUE then multiple items can be selected at a time
        // the 'tabIndex' attribute need to be >= 0 set on the tree container (by default will be set to 0)
        fullRow: false,                 // if TRUE then the selection will be made on the entire row (the CSS need to reflect this)
        textSelection: false            // if FALSE then the item text can't be selected
    };

    // aciTree selectable extension
    // adds item selection & keyboard navigation (left/right, up/down, pageup/pagedown, home/end, space, enter, escape)
    // dblclick also toggles the item

    var aciTree_selectable = {
        __extend: function() {
            // add extra data
            $.extend(this._instance, {
                focus: false
            });
            $.extend(this._private, {
                blurTimeout: null,
                spinPoint: null // the selected item to operate against when using the shift key with selection
            });
            // call the parent
            this._super();
        },
        // test if has focus
        hasFocus: function() {
            return this._instance.focus;
        },
        // init selectable
        _selectableInit: function() {
            if (this._instance.jQuery.attr('tabindex') === undefined) {
                // ensure the tree can get focus
                this._instance.jQuery.attr('tabindex', 0);
            }
            if (!this._instance.options.textSelection) {
                // disable text selection
                this._selectable(false);
            }
            this._instance.jQuery.bind('acitree' + this._private.nameSpace, function(event, api, item, eventName, options) {
                switch (eventName) {
                    case 'closed':
                        var focused = api.focused();
                        if (api.isChildren(item, focused)) {
                            // move focus to parent on close
                            api._focusOne(item);
                        }
                        // deselect children on parent close
                        api.children(item, true).each(api.proxy(function(element) {
                            var item = $(element);
                            if (this.isSelected(item)) {
                                this.deselect(item);
                            }
                        }, true));
                        break;
                }
            }).bind('focusin' + this._private.nameSpace, this.proxy(function() {
                // handle tree focus
                window.clearTimeout(this._private.blurTimeout);
                if (!this.hasFocus()) {
                    this._instance.focus = true;
                    this._instance.jQuery.addClass('aciTreeFocus');
                    this._trigger(null, 'focused');
                }
            })).bind('focusout' + this._private.nameSpace, this.proxy(function() {
                // handle tree focus
                window.clearTimeout(this._private.blurTimeout);
                this._private.blurTimeout = window.setTimeout(this.proxy(function() {
                    if (this.hasFocus()) {
                        this._instance.focus = false;
                        this._instance.jQuery.removeClass('aciTreeFocus');
                        this._trigger(null, 'blurred');
                    }
                }), 10);
            })).bind('keydown' + this._private.nameSpace, this.proxy(function(e) {
                if (!this.hasFocus()) {
                    // do not handle if we do not have focus
                    return;
                }
                var focused = this.focused();
                if (focused.length && this.isBusy(focused)) {
                    // skip when busy
                    return false;
                }
                var item = $([]);
                switch (e.which) {
                    case 65: // aA
                        if (this._instance.options.multiSelectable && e.ctrlKey) {
                            // select all visible items
                            var select = this.visible(this.enabled(this.children(null, true))).not(this.selected());
                            select.each(this.proxy(function(element) {
                                this.select($(element), {
                                    focus: false
                                });
                            }, true));
                            if (!this.focused().length) {
                                // ensure one item has focus
                                this._focusOne(this.visible(select, true).first());
                            }
                            // prevent default action
                            e.preventDefault();
                        }
                        break;
                    case 38: // up
                        item = focused.length ? this._prev(focused) : this.first();
                        break;
                    case 40: // down
                        item = focused.length ? this._next(focused) : this.first();
                        break;
                    case 37: // left
                        if (focused.length) {
                            if (this.isOpen(focused)) {
                                item = focused;
                                // close the item
                                this.close(focused, {
                                    collapse: this._instance.options.collapse,
                                    expand: this._instance.options.expand,
                                    unique: this._instance.options.unique
                                });
                            } else {
                                item = this.parent(focused);
                            }
                        } else {
                            item = this._first();
                        }
                        break;
                    case 39: // right
                        if (focused.length) {
                            if (this.isInode(focused) && this.isClosed(focused)) {
                                item = focused;
                                // open the item
                                this.open(focused, {
                                    collapse: this._instance.options.collapse,
                                    expand: this._instance.options.expand,
                                    unique: this._instance.options.unique
                                });
                            } else {
                                item = this.first(focused);
                            }
                        } else {
                            item = this._first();
                        }
                        break;
                    case 33: // pgup
                        item = focused.length ? this._prevPage(focused) : this._first();
                        break;
                    case 34: // pgdown
                        item = focused.length ? this._nextPage(focused) : this._first();
                        break;
                    case 36: // home
                        item = this._first();
                        break;
                    case 35: // end
                        item = this._last();
                        break;
                    case 13: // enter
                    case 107: // numpad [+]
                        item = focused;
                        if (this.isInode(focused) && this.isClosed(focused)) {
                            // open the item
                            this.open(focused, {
                                collapse: this._instance.options.collapse,
                                expand: this._instance.options.expand,
                                unique: this._instance.options.unique
                            });
                        }
                        break;
                    case 27: // escape
                    case 109: // numpad [-]
                        item = focused;
                        if (this.isOpen(focused)) {
                            // close the item
                            this.close(focused, {
                                collapse: this._instance.options.collapse,
                                expand: this._instance.options.expand,
                                unique: this._instance.options.unique
                            });
                        }
                        if (e.which == 27) {
                            // prevent default action on ESC
                            e.preventDefault();
                        }
                        break;
                    case 32: // space
                        item = focused;
                        if (this.isInode(focused) && !e.ctrlKey) {
                            // toggle the item
                            this.toggle(focused, {
                                collapse: this._instance.options.collapse,
                                expand: this._instance.options.expand,
                                unique: this._instance.options.unique
                            });
                        }
                        // prevent page scroll
                        e.preventDefault();
                        break;
                    case 106: // numpad [*]
                        item = focused;
                        if (this.isInode(focused)) {
                            // open all children
                            this.open(focused, {
                                collapse: this._instance.options.collapse,
                                expand: true,
                                unique: this._instance.options.unique
                            });
                        }
                        break;
                }
                if (item.length) {
                    if (this._instance.options.multiSelectable && !e.ctrlKey && !e.shiftKey) {
                        // unselect others
                        this._unselect(this.selected().not(item));
                    }
                    if (!this.isVisible(item)) {
                        // bring it into view
                        this.setVisible(item);
                    }
                    if (e.ctrlKey) {
                        if ((e.which == 32) && this.isEnabled(item)) { // space
                            if (this.isSelected(item)) {
                                this.deselect(item);
                            } else {
                                this.select(item);
                            }
                            // remember for later
                            this._private.spinPoint = item;
                        } else {
                            this._focusOne(item);
                        }
                    } else if (e.shiftKey) {
                        this._shiftSelect(item);
                    } else {
                        if (!this.isSelected(item) && this.isEnabled(item)) {
                            this.select(item);
                        } else {
                            this._focusOne(item);
                        }
                        // remember for later
                        this._private.spinPoint = item;
                    }
                    return false;
                }
            }));
            this._fullRow(this._instance.options.fullRow);
            this._multiSelectable(this._instance.options.multiSelectable);
        },
        // change full row mode
        _fullRow: function(state) {
            this._instance.jQuery.off(this._private.nameSpace, '.aciTreeLine,.aciTreeItem').off(this._private.nameSpace, '.aciTreeItem');
            this._instance.jQuery.on('mousedown' + this._private.nameSpace + ' click' + this._private.nameSpace, state ? '.aciTreeLine,.aciTreeItem' : '.aciTreeItem', this.proxy(function(e) {
                var item = this.itemFrom(e.target);
                if (!this.isVisible(item)) {
                    this.setVisible(item);
                }
                if (e.ctrlKey) {
                    if (e.type == 'click') {
                        if (this.isEnabled(item)) {
                            // (de)select item
                            if (this.isSelected(item)) {
                                this.deselect(item);
                                this._focusOne(item);
                            } else {
                                this.select(item);
                            }
                        } else {
                            this._focusOne(item);
                        }
                    }
                } else if (this._instance.options.multiSelectable && e.shiftKey) {
                    this._shiftSelect(item);
                } else {
                    if (this._instance.options.multiSelectable && (!this.isSelected(item) || (e.type == 'click'))) {
                        // deselect all other (keep the old focus)
                        this._unselect(this.selected().not(item));
                    }
                    this._selectOne(item);
                }
                if (!e.shiftKey) {
                    this._private.spinPoint = item;
                }
            })).on('dblclick' + this._private.nameSpace, state ? '.aciTreeLine,.aciTreeItem' : '.aciTreeItem', this.proxy(function(e) {
                var item = this.itemFrom(e.target);
                if (this.isInode(item)) {
                    // toggle the item
                    this.toggle(item, {
                        collapse: this._instance.options.collapse,
                        expand: this._instance.options.expand,
                        unique: this._instance.options.unique
                    });
                    return false;
                }
            }));
        },
        // change selection mode
        _multiSelectable: function(state) {
            if (state) {
                this._instance.jQuery.attr('aria-multiselectable', true);
            } else {
                var focused = this.focused();
                this._unselect(this.selected().not(focused));
                this._instance.jQuery.removeAttr('aria-multiselectable');
            }
        },
        // process `shift` key selection
        _shiftSelect: function(item) {
            var spinPoint = this._private.spinPoint;
            if (!spinPoint || !$.contains(this._instance.jQuery.get(0), spinPoint.get(0)) || !this.isOpenPath(spinPoint)) {
                var spinPoint = this.focused();
            }
            if (spinPoint.length) {
                // select a range of items
                var select = [item.get(0)], start = spinPoint.get(0), found = false, stop = item.get(0);
                var visible = this.visible(this.children(null, true));
                visible.each(this.proxy(function(element) {
                    // find what items to select
                    if (found) {
                        if (this.isEnabled($(element))) {
                            select.push(element);
                        }
                        if ((element == start) || (element == stop)) {
                            return false;
                        }
                    } else if ((element == start) || (element == stop)) {
                        if (this.isEnabled($(element))) {
                            select.push(element);
                        }
                        if ((element == start) && (element == stop)) {
                            return false;
                        }
                        found = true;
                    }
                }, true));
                this._unselect(this.selected().not(select));
                // select the items
                $(select).not(item).each(this.proxy(function(element) {
                    var item = $(element);
                    if (!this.isSelected(item)) {
                        // select item (keep the old focus)
                        this.select(item, {
                            focus: false
                        });
                    }
                }, true));
            }
            this._selectOne(item);
        },
        // override `_initHook`
        _initHook: function() {
            if (this.extSelectable()) {
                this._selectableInit();
            }
            // call the parent
            this._super();
        },
        // override `_itemHook`
        _itemHook: function(parent, item, itemData, level) {
            if (this.extSelectable()) {
                this._selectableDOM.select(item, itemData.selected);
            }
            // call the parent
            this._super(parent, item, itemData, level);
        },
        // low level DOM functions
        _selectableDOM: {
            // (de)select one or more items
            select: function(items, state) {
                if (state) {
                    items.addClass('aciTreeSelected').attr('aria-selected', true);
                } else {
                    items.removeClass('aciTreeSelected').attr('aria-selected', false);
                }
            },
            // focus one item, unfocus one or more items
            focus: function(items, state) {
                if (state) {
                    items.addClass('aciTreeFocus').focus();
                } else {
                    items.removeClass('aciTreeFocus');
                }
            }
        },
        // make element (un)selectable
        _selectable: function(state) {
            if (state) {
                this._instance.jQuery.css({
                    '-webkit-user-select': 'text',
                    '-moz-user-select': 'text',
                    '-ms-user-select': 'text',
                    '-o-user-select': 'text',
                    'user-select': 'text'
                }).attr({
                    'unselectable': null,
                    'onselectstart': null
                }).unbind('selectstart' + this._private.nameSpace);
            } else {
                this._instance.jQuery.css({
                    '-webkit-user-select': 'none',
                    '-moz-user-select': '-moz-none',
                    '-ms-user-select': 'none',
                    '-o-user-select': 'none',
                    'user-select': 'none'
                }).attr({
                    'unselectable': 'on',
                    'onselectstart': 'return false'
                }).bind('selectstart' + this._private.nameSpace, function(e) {
                    if (!$(e.target).is('input,textarea')) {
                        return false;
                    }
                });
            }
        },
        // get first visible item
        _first: function() {
            return $(domApi.first(this._instance.jQuery[0], function(node) {
                return this.hasClass(node, 'aciTreeVisible') ? true : null;
            }));
        },
        // get last visible item
        _last: function() {
            return $(domApi.last(this._instance.jQuery[0], function(node) {
                return this.hasClass(node, 'aciTreeVisible') ? true : null;
            }));
        },
        // get previous visible starting with item
        _prev: function(item) {
            return $(domApi.prevAll(item[0], function(node) {
                return this.hasClass(node, 'aciTreeVisible') ? true : null;
            }));
        },
        // get next visible starting with item
        _next: function(item) {
            return $(domApi.nextAll(item[0], function(node) {
                return this.hasClass(node, 'aciTreeVisible') ? true : null;
            }));
        },
        // get item height
        _height: function(item) {
            var size = item.children('.aciTreeLine').find('.aciTreeItem');
            return size.outerHeight(true);
        },
        // get previous page starting with item
        _prevPage: function(item) {
            var visible = this._instance.jQuery.find('.aciTreeVisible');
            var space = this._instance.jQuery.height();
            var now = this._height(item);
            var prev = item;
            var index = visible.index(item);
            while ((now < space) && (index > 0)) {
                index--;
                prev = visible.eq(index);
                now += this._height(prev);
            }
            return prev;
        },
        // get next page starting with item
        _nextPage: function(item) {
            var visible = this._instance.jQuery.find('.aciTreeVisible');
            var space = this._instance.jQuery.height();
            var now = this._height(item);
            var next = item;
            var index = visible.index(item);
            while ((now < space) && (index < visible.length - 1)) {
                index++;
                next = visible.eq(index);
                now += this._height(next);
            }
            return next;
        },
        // select one item
        _selectOne: function(item) {
            if (this.isSelected(item)) {
                this._focusOne(item);
            } else {
                if (this.isEnabled(item)) {
                    // select the item
                    this.select(item);
                } else {
                    this._focusOne(item);
                }
            }
        },
        // unselect the items
        _unselect: function(items) {
            items.each(this.proxy(function(element) {
                this.deselect($(element));
            }, true));
        },
        // focus one item
        _focusOne: function(item) {
            if (!this._instance.options.multiSelectable) {
                this._unselect(this.selected().not(item));
            }
            if (!this.isFocused(item)) {
                this.focus(item);
            }
        },
        // select item
        // `options.focus` when set to FALSE will not set the focus
        // `options.oldSelected` will keep the old selected items
        select: function(item, options) {
            options = this._options(options, 'selected', 'selectfail', 'wasselected', item);
            if (this.extSelectable() && this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeselect', options)) {
                    this._fail(item, options);
                    return;
                }
                // keep the old ones
                options.oldSelected = this.selected();
                if (!this._instance.options.multiSelectable) {
                    // deselect all other
                    var unselect = options.oldSelected.not(item);
                    this._selectableDOM.select(unselect, false);
                    unselect.each(this.proxy(function(element) {
                        this._trigger($(element), 'deselected', options);
                    }, true));
                }
                if (this.isSelected(item)) {
                    this._notify(item, options);
                } else {
                    this._selectableDOM.select(item, true);
                    this._success(item, options);
                }
                // process focus
                if ((options.focus === undefined) || options.focus) {
                    if (!this.isFocused(item) || options.focus) {
                        this.focus(item, this._inner(options));
                    }
                }
            } else {
                this._fail(item, options);
            }
        },
        // deselect item
        deselect: function(item, options) {
            options = this._options(options, 'deselected', 'deselectfail', 'notselected', item);
            if (this.extSelectable() && this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforedeselect', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isSelected(item)) {
                    this._selectableDOM.select(item, false);
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // set `virtual` focus
        // `options.oldFocused` will keep the old focused item
        focus: function(item, options) {
            options = this._options(options, 'focus', 'focusfail', 'wasfocused', item);
            if (this.extSelectable() && this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforefocus', options)) {
                    this._fail(item, options);
                    return;
                }
                // keep the old ones
                options.oldFocused = this.focused();
                // blur all other
                var unfocus = options.oldFocused.not(item);
                this._selectableDOM.focus(unfocus, false);
                // unfocus all others
                unfocus.each(this.proxy(function(element) {
                    this._trigger($(element), 'blur', options);
                }, true));
                if (this.isFocused(item)) {
                    this._notify(item, options);
                } else {
                    this._selectableDOM.focus(item, true);
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // remove `virtual` focus
        blur: function(item, options) {
            options = this._options(options, 'blur', 'blurfail', 'notfocused', item);
            if (this.extSelectable() && this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeblur', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isFocused(item)) {
                    this._selectableDOM.focus(item, false);
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // get selected items
        selected: function() {
            return this._instance.jQuery.find('.aciTreeSelected');
        },
        // override `_serialize`
        _serialize: function(item, callback) {
            // call the parent
            var data = this._super(item, callback);
            if (data && this.extSelectable()) {
                if (data.hasOwnProperty('selected')) {
                    data.selected = this.isSelected(item);
                } else if (this.isSelected(item)) {
                    data.selected = true;
                }
            }
            return data;
        },
        // test if item is selected
        isSelected: function(item) {
            return item && item.hasClass('aciTreeSelected');
        },
        // return the focused item
        focused: function() {
            return this._instance.jQuery.find('.aciTreeFocus');
        },
        // test if item is focused
        isFocused: function(item) {
            return item && item.hasClass('aciTreeFocus');
        },
        // test if selectable is enabled
        extSelectable: function() {
            return this._instance.options.selectable;
        },
        // override set `option`
        option: function(option, value) {
            if (this.wasInit() && !this.isLocked()) {
                if ((option == 'selectable') && (value != this.extSelectable())) {
                    if (value) {
                        this._selectableInit();
                    } else {
                        this._selectableDone();
                    }
                }
                if ((option == 'multiSelectable') && (value != this._instance.options.multiSelectable)) {
                    this._multiSelectable(value);
                }
                if ((option == 'fullRow') && (value != this._instance.options.fullRow)) {
                    this._fullRow(value);
                }
                if ((option == 'textSelection') && (value != this._instance.options.textSelection)) {
                    this._selectable(value);
                }
            }
            // call the parent
            this._super(option, value);
        },
        // done selectable
        _selectableDone: function(destroy) {
            if (this._instance.jQuery.attr('tabindex') == 0) {
                this._instance.jQuery.removeAttr('tabindex');
            }
            if (!this._instance.options.textSelection) {
                this._selectable(true);
            }
            this._instance.jQuery.unbind(this._private.nameSpace);
            this._instance.jQuery.off(this._private.nameSpace, '.aciTreeLine,.aciTreeItem').off(this._private.nameSpace, '.aciTreeItem');
            this._instance.jQuery.removeClass('aciTreeFocus').removeAttr('aria-multiselectable');
            this._instance.focus = false;
            this._private.spinPoint = null;
            if (!destroy) {
                // remove selection
                this._unselect(this.selected());
                var focused = this.focused();
                if (focused.length) {
                    this.blur(focused);
                }
            }
        },
        // override `_destroyHook`
        _destroyHook: function(unloaded) {
            if (unloaded) {
                this._selectableDone(true);
            }
            // call the parent
            this._super(unloaded);
        }

    };

    // extend the base aciTree class and add the selectable stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_selectable, 'aciTreeSelectable');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

    // for internal access
    var domApi = aciPluginClass.plugins.aciTree_dom;

})(jQuery, this);

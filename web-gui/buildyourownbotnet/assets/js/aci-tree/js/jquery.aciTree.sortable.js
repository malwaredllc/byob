
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
 * This extension adds the possibility to sort the tree items.
 * Require aciSortable https://github.com/dragosu/jquery-aciSortable and the utils extension for reordering items.
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        sortable: false,             // if TRUE then the tree items can be sorted
        sortDelay: 750,              // how many [ms] before opening a inode on hovering when in drag
        // called by the `aciSortable` inside the `drag` callback
        sortDrag: function(item, placeholder, isValid, helper) {
            if (!isValid) {
                helper.html(this.getLabel(item));
            }
        },
        // called by the `aciSortable` inside the `valid` callback
        sortValid: function(item, hover, before, isContainer, placeholder, helper) {
            if (isContainer) {
                helper.html('move ' + this.getLabel(item) + ' to ' + this.getLabel(this.itemFrom(hover)));
                placeholder.removeClass('aciTreeAfter aciTreeBefore');
            } else if (before !== null) {
                if (before) {
                    helper.html('move ' + this.getLabel(item) + ' before ' + this.getLabel(hover));
                    placeholder.removeClass('aciTreeAfter').addClass('aciTreeBefore');
                } else {
                    helper.html('move ' + this.getLabel(item) + ' after ' + this.getLabel(hover));
                    placeholder.removeClass('aciTreeBefore').addClass('aciTreeAfter');
                }
            }
        }
    };

    // aciTree sortable extension

    var aciTree_sortable = {
        __extend: function() {
            // add extra data
            $.extend(this._private, {
                openTimeout: null,
                dragDrop: null // the items used in drag & drop
            });
            // call the parent
            this._super();
        },
        // init sortable
        _sortableInit: function() {
            this._instance.jQuery.aciSortable({
                container: '.aciTreeUl',
                item: '.aciTreeLi',
                child: 50,
                childHolder: '<ul class="aciTreeUl aciTreeChild"></ul>',
                childHolderSelector: '.aciTreeChild',
                placeholder: '<li class="aciTreeLi aciTreePlaceholder"><div></div></li>',
                placeholderSelector: '.aciTreePlaceholder',
                helper: '<div class="aciTreeHelper"></div>',
                helperSelector: '.aciTreeHelper',
                // just before drag start
                before: this.proxy(function(item) {
                    // init before drag
                    if (!this._initDrag(item)) {
                        return false;
                    }
                    // a way to cancel the operation
                    if (!this._trigger(item, 'beforedrag')) {
                        this._trigger(item, 'dragfail');
                        return false;
                    }
                    return true;
                }),
                // just after drag start, before dragging
                start: this.proxy(function(item, placeholder, helper) {
                    this._instance.jQuery.addClass('aciTreeDragDrop');
                    helper.css({
                        opacity: 1
                    }).html(this.getLabel(item));
                }),
                // when in drag
                drag: this.proxy(function(item, placeholder, isValid, helper) {
                    if (!isValid) {
                        window.clearTimeout(this._private.openTimeout);
                    }
                    if (this._instance.options.sortDrag) {
                        this._instance.options.sortDrag.apply(this, arguments);
                    }
                }),
                // to check the drop target (when the placeholder is repositioned)
                valid: this.proxy(function(item, hover, before, isContainer, placeholder, helper) {
                    window.clearTimeout(this._private.openTimeout);
                    if (!this._checkDrop(item, hover, before, isContainer, placeholder, helper)) {
                        return false;
                    }
                    var options = this._options({
                        hover: hover,
                        before: before,
                        isContainer: isContainer,
                        placeholder: placeholder,
                        helper: helper
                    });
                    // a way to cancel the operation
                    if (!this._trigger(item, 'checkdrop', options)) {
                        return false;
                    }
                    if (!isContainer && this.isInode(hover)) {
                        if (!this.isOpen(hover) && !hover.data('opening' + this._private.nameSpace)) {
                            this._private.openTimeout = window.setTimeout(this.proxy(function() {
                                hover.data('opening' + this._private.nameSpace, true);
                                this.open(hover, {
                                    success: function(item) {
                                        item.removeData('opening' + this._private.nameSpace);
                                    },
                                    fail: function(item) {
                                        item.removeData('opening' + this._private.nameSpace);
                                    }
                                });
                            }), this._instance.options.sortDelay);
                        }
                    }
                    if (this._instance.options.sortValid) {
                        this._instance.options.sortValid.apply(this, arguments);
                    }
                    return true;
                }),
                // when dragged as child
                create: this.proxy(function(api, item, hover) {
                    if (this.isLeaf(hover)) {
                        hover.append(api._instance.options.childHolder);
                        return true;
                    }
                    return false;
                }, true),
                // on drag end
                end: this.proxy(function(item, hover, placeholder, helper) {
                    window.clearTimeout(this._private.openTimeout);
                    var options = {
                        placeholder: placeholder,
                        helper: helper
                    };
                    options = this._options(options, 'sorted', 'dropfail', null, item);
                    if (placeholder.parent().length) {
                        var prev = this.prev(placeholder, true);
                        if (prev.length) {
                            // add after a item
                            placeholder.detach();
                            var items = $(this._private.dragDrop.get().reverse());
                            this._private.dragDrop = null;
                            items.each(this.proxy(function(element) {
                                this.moveAfter($(element), this._inner(options, {
                                    success: options.success,
                                    fail: options.fail,
                                    after: prev
                                }));
                            }, true));
                        } else {
                            var next = this.next(placeholder, true);
                            if (next.length) {
                                // add before a item
                                placeholder.detach();
                                var items = $(this._private.dragDrop.get().reverse());
                                this._private.dragDrop = null;
                                items.each(this.proxy(function(element) {
                                    this.moveBefore($(element), this._inner(options, {
                                        success: options.success,
                                        fail: options.fail,
                                        before: next
                                    }));
                                }, true));
                            } else {
                                // add as a child
                                var parent = this.parent(placeholder);
                                var container = placeholder.parent();
                                placeholder.detach();
                                container.remove();
                                if (this.isLeaf(parent)) {
                                    // we can set asChild only for leaves
                                    var items = this._private.dragDrop;
                                    this.asChild(items.eq(0), this._inner(options, {
                                        success: function() {
                                            this._success(item, options);
                                            this.open(parent);
                                            items.filter(':gt(0)').each(this.proxy(function(element) {
                                                this.moveAfter($(element), this._inner(options, {
                                                    success: options.success,
                                                    fail: options.fail,
                                                    after: this.last(parent)
                                                }));
                                            }, true));
                                        },
                                        fail: options.fail,
                                        parent: parent
                                    }));
                                } else {
                                    this._fail(item, options);
                                }
                            }
                        }
                    } else {
                        this._fail(item, options);
                    }
                    this._private.dragDrop = null;
                    if (helper.parent().length) {
                        // the helper is inserted in the DOM
                        var top = $(window).scrollTop();
                        var left = $(window).scrollLeft();
                        var rect = item.get(0).getBoundingClientRect();
                        // animate helper to item position
                        helper.animate({
                            top: rect.top + top,
                            left: rect.left + left,
                            opacity: 0
                        },
                        {
                            complete: function() {
                                // detach the helper when completed
                                helper.detach();
                            }
                        });
                    }
                    this._instance.jQuery.removeClass('aciTreeDragDrop');
                })
            });
        },
        // override `_initHook`
        _initHook: function() {
            if (this.extSortable()) {
                this._sortableInit();
            }
            // call the parent
            this._super();
        },
        // reduce items by removing the childrens
        _parents: function(items) {
            var len = items.length, a, b, remove = [];
            for (var i = 0; i < len - 1; i++) {
                a = items.eq(i);
                for (var j = i + 1; j < len; j++) {
                    b = items.eq(j);
                    if (this.isChildren(a, b)) {
                        remove.push(items[j]);
                    } else if (this.isChildren(b, a)) {
                        remove.push(items[i]);
                    }
                }
            }
            return items.not(remove);
        },
        // called before drag start
        _initDrag: function(item) {
            // support `selectable` extension
            if (this.extSelectable && this.extSelectable()) {
                if (!this.hasFocus()) {
                    this._instance.jQuery.focus();
                }
                if (!this.isEnabled(item)) {
                    return false;
                }
                var drag = this.selected();
                if (drag.length) {
                    if (!this.isSelected(item)) {
                        return false;
                    }
                } else {
                    drag = item;
                }
                this._private.dragDrop = this._parents(drag);
            } else {
                this._instance.jQuery.focus();
                this._private.dragDrop = item;
            }
            return true;
        },
        // check the drop target
        _checkDrop: function(item, hover, before, isContainer, placeholder, helper) {
            var items = this._private.dragDrop;
            if (!items) {
                return false;
            }
            var test = this.itemFrom(hover);
            if (items.is(test) || items.has(test.get(0)).length) {
                return false;
            }
            if (!isContainer) {
                test = before ? this.prev(hover) : this.next(hover);
                if (items.is(test)) {
                    return false;
                }
            }
            return true;
        },
        // test if sortable is enabled
        extSortable: function() {
            return this._instance.options.sortable;
        },
        // override set `option`
        option: function(option, value) {
            if (this.wasInit() && !this.isLocked()) {
                if ((option == 'sortable') && (value != this.extSortable())) {
                    if (value) {
                        this._sortableInit();
                    } else {
                        this._sortableDone();
                    }
                }
            }
            // call the parent
            this._super(option, value);
        },
        // done sortable
        _sortableDone: function() {
            this._instance.jQuery.unbind(this._private.nameSpace);
            this._instance.jQuery.aciSortable('destroy');
        },
        // override `_destroyHook`
        _destroyHook: function(unloaded) {
            if (unloaded) {
                this._sortableDone();
            }
            // call the parent
            this._super(unloaded);
        }
    };

    // extend the base aciTree class and add the sortable stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_sortable, 'aciTreeSortable');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

})(jQuery, this);

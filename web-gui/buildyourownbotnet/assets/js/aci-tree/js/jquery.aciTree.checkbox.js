
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
 * This extension adds checkbox support to aciTree,
 * should be used with the selectable extension.
 *
 * The are a few extra properties for the item data:
 *
 * {
 *   ...
 *   checkbox: true,                    // TRUE (default) means the item will have a checkbox (can be omitted if the `radio` extension is not used)
 *   checked: false,                    // if should be checked or not
 *   ...
 * }
 *
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        checkbox: false,                // if TRUE then each item will have a checkbox
        checkboxChain: true,
        // if TRUE the selection will propagate to the parents/children
        // if -1 the selection will propagate only to parents
        // if +1 the selection will propagate only to children
        // if FALSE the selection will not propagate in any way
        checkboxBreak: true,            // if TRUE then a missing checkbox will break the chaining
        checkboxClick: false            // if TRUE then a click will trigger a state change only when made over the checkbox itself
    };

    // aciTree checkbox extension

    var aciTree_checkbox = {
        // init checkbox
        _checkboxInit: function() {
            this._instance.jQuery.bind('acitree' + this._private.nameSpace, function(event, api, item, eventName, options) {
                switch (eventName) {
                    case 'loaded':
                        // check/update on item load
                        api._checkboxLoad(item);
                        break;
                }
            }).bind('keydown' + this._private.nameSpace, this.proxy(function(e) {
                switch (e.which) {
                    case 32: // space
                        // support `selectable` extension
                        if (this.extSelectable && this.extSelectable() && !e.ctrlKey) {
                            var item = this.focused();
                            if (this.hasCheckbox(item) && this.isEnabled(item)) {
                                if (this.isChecked(item)) {
                                    this.uncheck(item);
                                } else {
                                    this.check(item);
                                }
                                e.stopImmediatePropagation();
                                // prevent page scroll
                                e.preventDefault();
                            }
                        }
                        break;
                }
            })).on('click' + this._private.nameSpace, '.aciTreeItem', this.proxy(function(e) {
                if (!this._instance.options.checkboxClick || $(e.target).is('.aciTreeCheck')) {
                    var item = this.itemFrom(e.target);
                    if (this.hasCheckbox(item) && this.isEnabled(item) && (!this.extSelectable || !this.extSelectable() || (!e.ctrlKey && !e.shiftKey))) {
                        // change state on click
                        if (this.isChecked(item)) {
                            this.uncheck(item);
                        } else {
                            this.check(item);
                        }
                        e.preventDefault();
                    }
                }
            }));
        },
        // override `_initHook`
        _initHook: function() {
            if (this.extCheckbox()) {
                this._checkboxInit();
            }
            // call the parent
            this._super();
        },
        // override `_itemHook`
        _itemHook: function(parent, item, itemData, level) {
            if (this.extCheckbox()) {
                // support `radio` extension
                var radio = this.extRadio && this.hasRadio(item);
                if (!radio && (itemData.checkbox || ((itemData.checkbox === undefined) && (!this.extRadio || !this.extRadio())))) {
                    this._checkboxDOM.add(item, itemData);
                }
            }
            // call the parent
            this._super(parent, item, itemData, level);
        },
        // low level DOM functions
        _checkboxDOM: {
            // add item checkbox
            add: function(item, itemData) {
                item.attr('aria-checked', !!itemData.checked).addClass('aciTreeCheckbox' + (itemData.checked ? ' aciTreeChecked' : '')).children('.aciTreeLine').find('.aciTreeText').wrap('<label></label>').before('<span class="aciTreeCheck" />');
            },
            // remove item checkbox
            remove: function(item) {
                var label = item.removeAttr('aria-checked').removeClass('aciTreeCheckbox aciTreeChecked aciTreeTristate').children('.aciTreeLine').find('label');
                if (label.length) {
                    label.find('*').not('.aciTreeText').remove();
                    label.find('.aciTreeText').unwrap();
                }
            },
            // (un)check items
            check: function(items, state) {
                items.attr('aria-checked', state).toggleClass('aciTreeChecked', state);
            },
            // (un)set tristate items
            tristate: function(items, state) {
                items.toggleClass('aciTreeTristate', state);
            }
        },
        // update items on load, starting from the loaded node
        _checkboxLoad: function(item) {
            if (this._instance.options.checkboxChain === false) {
                // do not update on load
                return;
            }
            var state = undefined;
            if (this.hasCheckbox(item)) {
                if (this.isChecked(item)) {
                    if (!this.checkboxes(this.children(item, false, true), true).length) {
                        // the item is checked but no children are, check them all
                        state = true;
                    }
                } else {
                    // the item is not checked, uncheck all children
                    state = false;
                }
            }
            this._checkboxUpdate(item, state);
        },
        // get children list
        _checkboxChildren: function(item) {
            if (this._instance.options.checkboxBreak) {
                var list = [];
                var process = this.proxy(function(item) {
                    var children = this.children(item, false, true);
                    children.each(this.proxy(function(element) {
                        var item = $(element);
                        // break on missing checkbox
                        if (this.hasCheckbox(item)) {
                            list.push(element);
                            process(item);
                        }
                    }, true));
                });
                process(item);
                return $(list);
            } else {
                var children = this.children(item, true, true);
                return this.checkboxes(children);
            }
        },
        // update checkbox state
        _checkboxUpdate: function(item, state) {
            // update children
            var checkDown = this.proxy(function(item, count, state) {
                var children = this.children(item, false, true);
                var total = 0;
                var checked = 0;
                children.each(this.proxy(function(element) {
                    var item = $(element);
                    var subCount = {
                        total: 0,
                        checked: 0
                    };
                    if (this.hasCheckbox(item)) {
                        if ((state !== undefined) && (this._instance.options.checkboxChain !== -1)) {
                            this._checkboxDOM.check(item, state);
                        }
                        total++;
                        if (this.isChecked(item)) {
                            checked++;
                        }
                        checkDown(item, subCount, state);
                    } else {
                        if (this._instance.options.checkboxBreak) {
                            var reCount = {
                                total: 0,
                                checked: 0
                            };
                            checkDown(item, reCount);
                        } else {
                            checkDown(item, subCount, state);
                        }
                    }
                    total += subCount.total;
                    checked += subCount.checked;
                }, true));
                if (item) {
                    this._checkboxDOM.tristate(item, (checked > 0) && (checked != total));
                    count.total += total;
                    count.checked += checked;
                }
            });
            var count = {
                total: 0,
                checked: 0
            };
            checkDown(item, count, state);
            // update parents
            var checkUp = this.proxy(function(item, tristate, state) {
                var parent = this.parent(item);
                if (parent.length) {
                    if (!tristate) {
                        var children = this._checkboxChildren(parent);
                        var checked = this.checkboxes(children, true).length;
                        var tristate = (checked > 0) && (checked != children.length);
                    }
                    if (this.hasCheckbox(parent)) {
                        if ((state !== undefined) && (this._instance.options.checkboxChain !== 1)) {
                            this._checkboxDOM.check(parent, tristate ? true : state);
                        }
                        this._checkboxDOM.tristate(parent, tristate);
                        checkUp(parent, tristate, state);
                    } else {
                        if (this._instance.options.checkboxBreak) {
                            checkUp(parent);
                        } else {
                            checkUp(parent, tristate, state);
                        }
                    }
                }
            });
            checkUp(item, undefined, state);
        },
        // test if item have a checkbox
        hasCheckbox: function(item) {
            return item && item.hasClass('aciTreeCheckbox');
        },
        // add checkbox
        addCheckbox: function(item, options) {
            options = this._options(options, 'checkboxadded', 'addcheckboxfail', 'wascheckbox', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeaddcheckbox', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.hasCheckbox(item)) {
                    this._notify(item, options);
                } else {
                    var process = function() {
                        this._checkboxDOM.add(item, {
                        });
                        this._success(item, options);
                    };
                    // support `radio` extension
                    if (this.extRadio && this.hasRadio(item)) {
                        // remove radio first
                        this.removeRadio(item, this._inner(options, {
                            success: process,
                            fail: options.fail
                        }));
                    } else {
                        process.apply(this);
                    }
                }
            } else {
                this._fail(item, options);
            }
        },
        // remove checkbox
        removeCheckbox: function(item, options) {
            options = this._options(options, 'checkboxremoved', 'removecheckboxfail', 'notcheckbox', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeremovecheckbox', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.hasCheckbox(item)) {
                    this._checkboxDOM.remove(item);
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if it's checked
        isChecked: function(item) {
            if (this.hasCheckbox(item)) {
                return item.hasClass('aciTreeChecked');
            }
            // support `radio` extension
            if (this._super) {
                // call the parent
                return this._super(item);
            }
            return false;
        },
        // check checkbox
        check: function(item, options) {
            if (this.extCheckbox && this.hasCheckbox(item)) {
                options = this._options(options, 'checked', 'checkfail', 'waschecked', item);
                // a way to cancel the operation
                if (!this._trigger(item, 'beforecheck', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isChecked(item)) {
                    this._notify(item, options);
                } else {
                    this._checkboxDOM.check(item, true);
                    if (this._instance.options.checkboxChain !== false) {
                        // chain them
                        this._checkboxUpdate(item, true);
                    }
                    this._success(item, options);
                }
            } else {
                // support `radio` extension
                if (this._super) {
                    // call the parent
                    this._super(item, options);
                } else {
                    this._trigger(item, 'checkfail', options);
                    this._fail(item, options);
                }
            }
        },
        // uncheck checkbox
        uncheck: function(item, options) {
            if (this.extCheckbox && this.hasCheckbox(item)) {
                options = this._options(options, 'unchecked', 'uncheckfail', 'notchecked', item);
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeuncheck', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isChecked(item)) {
                    this._checkboxDOM.check(item, false);
                    if (this._instance.options.checkboxChain !== false) {
                        // chain them
                        this._checkboxUpdate(item, false);
                    }
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                // support `radio` extension
                if (this._super) {
                    // call the parent
                    this._super(item, options);
                } else {
                    this._trigger(item, 'uncheckfail', options);
                    this._fail(item, options);
                }
            }
        },
        // filter items with checkbox by state (if set)
        checkboxes: function(items, state) {
            var list = items.filter('.aciTreeCheckbox');
            if (state !== undefined) {
                return state ? list.filter('.aciTreeChecked') : list.not('.aciTreeChecked');
            }
            return list;
        },
        // override `_serialize`
        _serialize: function(item, callback) {
            var data = this._super(item, callback);
            if (data && this.extCheckbox()) {
                if (data.hasOwnProperty('checkbox')) {
                    data.checkbox = this.hasCheckbox(item);
                    data.checked = this.isChecked(item);
                } else if (this.hasCheckbox(item)) {
                    if (this.extRadio && this.extRadio()) {
                        data.checkbox = true;
                    }
                    data.checked = this.isChecked(item);
                }
            }
            return data;
        },
        // override `serialize`
        serialize: function(item, what, callback) {
            if (what == 'checkbox') {
                var serialized = '';
                var children = this.children(item, true, true);
                this.checkboxes(children, true).each(this.proxy(function(element) {
                    var item = $(element);
                    if (callback) {
                        serialized += callback.call(this, item, what, this.getId(item));
                    } else {
                        serialized += this._instance.options.serialize.call(this, item, what, this.getId(item));
                    }
                }, true));
                return serialized;
            }
            return this._super(item, what, callback);
        },
        // test if item is in tristate
        isTristate: function(item) {
            return item && item.hasClass('aciTreeTristate');
        },
        // filter tristate items
        tristate: function(items) {
            return items.filter('.aciTreeTristate');
        },
        // test if checkbox is enabled
        extCheckbox: function() {
            return this._instance.options.checkbox;
        },
        // override set `option`
        option: function(option, value) {
            if (this.wasInit() && !this.isLocked()) {
                if ((option == 'checkbox') && (value != this.extCheckbox())) {
                    if (value) {
                        this._checkboxInit();
                    } else {
                        this._checkboxDone();
                    }
                }
            }
            // call the parent
            this._super(option, value);
        },
        // done checkbox
        _checkboxDone: function(destroy) {
            this._instance.jQuery.unbind(this._private.nameSpace);
            this._instance.jQuery.off(this._private.nameSpace, '.aciTreeItem');
            if (!destroy) {
                // remove checkboxes
                this.checkboxes(this.children(null, true, true)).each(this.proxy(function(element) {
                    this.removeCheckbox($(element));
                }, true));
            }
        },
        // override `_destroyHook`
        _destroyHook: function(unloaded) {
            if (unloaded) {
                this._checkboxDone(true);
            }
            // call the parent
            this._super(unloaded);
        }

    };

    // extend the base aciTree class and add the checkbox stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_checkbox, 'aciTreeCheckbox');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

})(jQuery, this);


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
 * The aciTree core.
 *
 * A few words about how item data looks like:
 *
 * for a leaf node (a node that does not have any children):
 *
 * {
 *   id: 'some_file_ID',                // should be unique item ID
 *   label: 'This is a File Item',      // the item label (text value)
 *   inode: false,                      // FALSE means is a leaf node (can be omitted)
 *   icon: 'fileIcon',                  // CSS class name for the icon (if any), can also be an Array ['CSS class name', background-position-x, background-position-y]
 *   disabled: false,                   // TRUE means the item is disabled (can be omitted)
 *   random_prop: 'random 1'            // sample user defined property (you can have any number defined)
 * }
 *
 * for a inner node (a node that have at least a children under it):
 *
 * {
 *   id: 'some_folder_ID',              // should be unique item ID
 *   label: 'This is a Folder Item',    // the item label (text value)
 *   inode: true,                       // can also be NULL to find at runtime if its an inode (on load will be transformed in a leaf node if there aren't any children)
 *   open: false,                       // if TRUE then the node will be opened when the tree is loaded (can be omitted)
 *   icon: 'folderIcon',                // CSS class name for the icon (if any), can also be an Array ['CSS class name', background-position-x, background-position-y]
 *   disabled: false,                   // TRUE means the item is disabled (can be omitted)
 *   source: 'myDataSource',            // the data source name (if any) to read the children from, by default `aciTree.options.ajax` is used
 *   branch: [                          // a list of children
 *      { ... item data ... },
 *      { ... item data ... },
 *      ...
 *   ],
 *   random_prop: 'random 2'            // sample user defined property (you can have any number defined)
 * }
 *
 * The `branch` array can be empty, in this case the children will be loaded when the node will be opened for the first time.
 *
 * Please note that the item data should be valid (in the expected format). No checking is done and errors can appear on invalid data.
 *
 * One note about a item: a item is always the LI element with the class 'aciTreeLi'.
 * The children of a node are all added under a UL element with the class 'aciTreeUl'.
 *
 * Almost all API functions expect only one item. If you need to process more at once then you'll need to loop between all of them yourself.
 *
 * The `options` parameter for all API methods (when there is one) is a object with the properties (not all are required or used):
 *
 * {
 *   uid: string -> operation UID (defaults to `ui`)
 *   success: function (item, options) -> callback to be called on success (you can access plugin API with `this` keyword inside the callback)
 *   fail: function (item, options) -> callback to be called on fail (you can access plugin API with `this` keyword inside the callback)
 *   notify: function (item, options) -> notify callback (internal use for when already in the requested state, will call `success` by default)
 *   expand: true/false -> propagate on open/toggle
 *   collapse: true/false -> propagate on close/toggle
 *   unique: true/false -> should other branches be closed (on open/toggle) ?
 *   unanimated: true/false -> if it's TRUE then no animations are to be run (used on open/close/toggle)
 *   itemData: object[item data]/array[item data] -> used when adding/updating items
 * }
 *
 * Note: when using the API methods that support the `options` parameter, you will need to use the success/fail callbacks if you need to do
 * any processing after the API call. This because there can be async operations that will complete at a later time and the API methods will
 * exit before the job is actually completed. This will happen when items are loaded with AJAX, on animations and other delayed operations (see _queue).
 *
 */

(function($, window, undefined) {

    // default options

    var options = {
        // the AJAX options (see jQuery.ajax) where the `success` and `error` are overridden by aciTree
        ajax: {
            url: null, // URL from where to take the data, something like `path/script?nodeId=` (the node ID value will be added for each request)
            dataType: 'json'
        },
        dataSource: null, // a list of data sources to be used (each entry in `aciTree.options.ajax` format)
        rootData: null, // initial ROOT data for the Tree (if NULL then one initial AJAX request is made on init)
        queue: {
            async: 4, // the number of simultaneous async (AJAX) tasks
            interval: 50, // interval [ms] after which to insert a `delay`
            delay: 20                   // how many [ms] delay between tasks (after `interval` expiration)
        },
        loaderDelay: 500, // how many msec to wait before showing the main loader ? (on lengthy operations)
        expand: false, // if TRUE then all children of a node are expanded when the node is opened
        collapse: false, // if TRUE then all children of a node are collapsed when the node is closed
        unique: false, // if TRUE then a single tree branch will stay open, the oters are closed when a node is opened
        empty: false, // if TRUE then all children of a node are removed when the node is closed
        show: {// show node/ROOT animation (default is slideDown)
            props: {
                'height': 'show'
            },
            duration: 'medium',
            easing: 'linear'
        },
        animateRoot: true, // if the ROOT should be animated on init
        hide: {// hide node animation (default is slideUp)
            props: {
                'height': 'hide'
            },
            duration: 'medium',
            easing: 'linear'
        },
        view: {// scroll item into view animation
            duration: 'medium',
            easing: 'linear'
        },
        // called for each AJAX request when a node needs to be loaded
        // `item` is the item who will be loaded
        // `settings` is the `aciTree.options.ajax` object or an entry from `aciTree.options.dataSource`
        ajaxHook: function(item, settings) {
            // the default implementation changes the URL by adding the item ID at the end
            settings.url += (item ? this.getId(item) : '');
        },
        // called after each item is created but before is inserted into the DOM
        // `parent` is the parent item (can be empty)
        // `item` is the new created item
        // `itemData` is the object used to create the item
        // `level` is the #0 based item level
        itemHook: function(parent, item, itemData, level) {
            // there is no default implementation
        },
        // called for each item to serialize its value
        // `item` is the tree item to be serialized
        // `what` is the option telling what is being serialized
        // `value` is the current serialized value (from the `item`, value type depending of `what`)
        serialize: function(item, what, value) {
            if (typeof what == 'object') {
                return value;
            } else {
                // the default implementation uses a `|` (pipe) character to separate values
                return '|' + value;
            }
        }
    };

    // aciTree plugin core

    var aciTree_core = {
        // add extra data
        __extend: function() {
            $.extend(this._instance, {
                queue: new this._queue(this, this._instance.options.queue) // the global tree queue
            });
            $.extend(this._private, {
                locked: false, // to tell the tree state
                itemClone: {// keep a clone of the LI for faster tree item creation
                },
                // timeouts for the loader
                loaderHide: null,
                loaderInterval: null,
                // busy delay counter
                delayBusy: 0
            });
        },
        // init the treeview
        init: function(options) {
            options = this._options(options);
            // check if was init already
            if (this.wasInit()) {
                this._trigger(null, 'wasinit', options);
                this._fail(null, options);
                return;
            }
            // check if is locked
            if (this.isLocked()) {
                this._trigger(null, 'locked', options);
                this._fail(null, options);
                return;
            }
            // a way to cancel the operation
            if (!this._trigger(null, 'beforeinit', options)) {
                this._trigger(null, 'initfail', options);
                this._fail(null, options);
                return;
            }
            this._private.locked = true;
            this._instance.jQuery.addClass('aciTree' + this._instance.index).attr('role', 'tree').on('click' + this._instance.nameSpace, '.aciTreeButton', this.proxy(function(e) {
                // process click on button
                var item = this.itemFrom(e.target);
                // skip when busy
                if (!this.isBusy(item)) {
                    // tree button pressed
                    this.toggle(item, {
                        collapse: this._instance.options.collapse,
                        expand: this._instance.options.expand,
                        unique: this._instance.options.unique
                    });
                }
            })).on('mouseenter' + this._instance.nameSpace + ' mouseleave' + this._instance.nameSpace, '.aciTreePush', function(e) {
                // handle the aciTreeHover class
                var element = e.target;
                if (!domApi.hasClass(element, 'aciTreePush')) {
                    element = domApi.parentByClass(element, 'aciTreePush');
                }
                domApi.toggleClass(element, 'aciTreeHover', e.type == 'mouseenter');
            }).on('mouseenter' + this._instance.nameSpace + ' mouseleave' + this._instance.nameSpace, '.aciTreeLine', function(e) {
                // handle the aciTreeHover class
                var element = e.target;
                if (!domApi.hasClass(element, 'aciTreeLine')) {
                    element = domApi.parentByClass(element, 'aciTreeLine');
                }
                domApi.toggleClass(element, 'aciTreeHover', e.type == 'mouseenter');
            });
            this._initHook();
            // call on success
            var success = this.proxy(function() {
                // call the parent
                this._super();
                this._private.locked = false;
                this._trigger(null, 'init', options);
                this._success(null, options);
            });
            // call on fail
            var fail = this.proxy(function() {
                // call the parent
                this._super();
                this._private.locked = false;
                this._trigger(null, 'initfail', options);
                this._fail(null, options);
            });
            if (this._instance.options.rootData) {
                // the rootData was set, use it to init the tree
                this.loadFrom(null, this._inner(options, {
                    success: success,
                    fail: fail,
                    itemData: this._instance.options.rootData
                }));
            } else if (this._instance.options.ajax.url) {
                // the AJAX url was set, init with AJAX
                this.ajaxLoad(null, this._inner(options, {
                    success: success,
                    fail: fail
                }));
            } else {
                success.apply(this);
            }
        },
        _initHook: function() {
            // override this to do extra init
        },
        // check locked state
        isLocked: function() {
            return this._private.locked;
        },
        // get a formatted message
        // `raw` is the raw message text (can contain %NUMBER sequences, replaced with values from `params`)
        // `params` is a list of values to be replaced into the message (by #0 based index)
        _format: function(raw, params) {
            if (!(params instanceof Array)) {
                return raw;
            }
            var parts = raw.split(/(%[0-9]+)/gm);
            var compile = '', part, index, last = false, len;
            var test = new window.RegExp('^%[0-9]+$');
            for (var i = 0; i < parts.length; i++) {
                part = parts[i];
                len = part.length;
                if (len) {
                    if (!last && test.test(part)) {
                        index = window.parseInt(part.substr(1)) - 1;
                        if ((index >= 0) && (index < params.length)) {
                            compile += params[index];
                            continue;
                        }
                    } else {
                        last = false;
                        if (part.substr(len - 1) == '%') {
                            if (part.substr(len - 2) != '%%') {
                                last = true;
                            }
                            part = part.substr(0, len - 1);
                        }
                    }
                    compile += part;
                }
            }
            return compile;
        },
        // low level DOM functions
        _coreDOM: {
            // set as leaf node
            leaf: function(items) {
                domApi.addRemoveListClass(items.toArray(), 'aciTreeLeaf', ['aciTreeInode', 'aciTreeInodeMaybe', 'aciTreeOpen'], function(node) {
                    node.removeAttribute('aria-expanded');
                });
            },
            // set as inner node
            inode: function(items, branch) {
                domApi.addRemoveListClass(items.toArray(), branch ? 'aciTreeInode' : 'aciTreeInodeMaybe', 'aciTreeLeaf', function(node) {
                    node.setAttribute('aria-expanded', false);
                });
            },
            // set as open/closed
            toggle: function(items, state) {
                domApi.toggleListClass(items.toArray(), 'aciTreeOpen', state, function(node) {
                    node.setAttribute('aria-expanded', state);
                });
            },
            // set odd/even classes
            oddEven: function(items, odd) {
                var list = items.toArray();
                for (var i = 0; i < list.length; i++) {
                    domApi.addRemoveClass(list[i], odd ? 'aciTreeOdd' : 'aciTreeEven', odd ? 'aciTreeEven' : 'aciTreeOdd');
                    odd = !odd;
                }
            }
        },
        // a small queue implementation
        // `context` the context to be used with `callback.call`
        // `options` are the queue options
        _queue: function(context, options) {
            var locked = false;
            var fifo = [], fifoAsync = [];
            var load = 0, loadAsync = 0, schedule = 0, stack = 0;
            // run the queue
            var run = function() {
                if (locked) {
                    stack--;
                    return;
                }
                var now = new window.Date().getTime();
                if (schedule > now) {
                    stack--;
                    return;
                }
                var callback, async = false;
                if (load < options.async * 2) {
                    // get the next synchronous callback
                    callback = fifo.shift();
                }
                if (!callback && (loadAsync < options.async)) {
                    // get the next async callback
                    callback = fifoAsync.shift();
                    async = true;
                }
                if (callback) {
                    // run the callback
                    if (async) {
                        loadAsync++;
                        callback.call(context, function() {
                            loadAsync--;
                        });
                        if (stack < 40) {
                            stack++;
                            run();
                        }
                    } else {
                        load++;
                        callback.call(context, function() {
                            if (now - schedule > options.interval) {
                                schedule = now + options.delay;
                            }
                            load--;
                            if (stack < 40) {
                                stack++;
                                run();
                            }
                        });
                    }
                }
                stack--;
            };
            var interval = [];
            // start the queue
            var start = function() {
                for (var i = 0; i < 4; i++) {
                    interval[i] = window.setInterval(function() {
                        if (stack < 20) {
                            stack++;
                            run();
                        }
                    }, 10);
                }
            };
            // stop the queue
            var stop = function() {
                for (var i = 0; i < interval.length; i++) {
                    window.clearInterval(interval[i]);
                }
            };
            start();
            // init the queue
            this.init = function() {
                this.destroy();
                start();
                return this;
            };
            // push `callback` function (complete) for later call
            // `async` tells if is async callback
            this.push = function(callback, async) {
                if (!locked) {
                    if (async) {
                        fifoAsync.push(callback);
                    } else {
                        fifo.push(callback);
                    }
                }
                return this;
            };
            // test if busy
            this.busy = function() {
                return (load != 0) || (loadAsync != 0) || (fifo.length != 0) || (fifoAsync.length != 0);
            };
            // destroy queue
            this.destroy = function() {
                locked = true;
                stop();
                fifo = [];
                fifoAsync = [];
                load = 0;
                loadAsync = 0;
                schedule = 0;
                stack = 0;
                locked = false;
                return this;
            };
        },
        // used with a `queue` to execute something at the end
        // `endCallback` function (complete) is the callback called at the end
        _task: function(queue, endCallback) {
            var counter = 0, finish = false;
            // push a `callback` function (complete) for later call
            this.push = function(callback, async) {
                counter++;
                queue.push(function(complete) {
                    var context = this;
                    callback.call(this, function() {
                        counter--;
                        if ((counter < 1) && !finish) {
                            finish = true;
                            endCallback.call(context, complete);
                        } else {
                            complete();
                        }
                    });
                }, async);
            };
        },
        // helper function to extend the `options` object
        // `object` the initial options object
        // _success, _fail, _notify are callbacks or string (the event name to be triggered)
        // `item` is the item to trigger events for
        _options: function(object, _success, _fail, _notify, item) {
            // options object (need to be in this form for all API functions
            // that have the `options` parameter, not all properties are required)
            var options = $.extend({
                uid: 'ui',
                success: null, // success callback
                fail: null, // fail callback
                notify: null, // notify callback (internal use for when already in the requested state)
                expand: this._instance.options.expand, // propagate (on open)
                collapse: this._instance.options.collapse, // propagate (on close)
                unique: this._instance.options.unique, // keep a single branch open (on open)
                unanimated: false, // unanimated (open/close/toggle)
                itemData: {
                } // items data (object) or a list (array) of them (used when creating branches)
            },
            object);
            var success = _success ? ((typeof _success == 'string') ? function() {
                this._trigger(item, _success, options);
            } : _success) : null;
            var fail = _fail ? ((typeof _fail == 'string') ? function() {
                this._trigger(item, _fail, options);
            } : _fail) : null;
            var notify = _notify ? ((typeof _notify == 'string') ? function() {
                this._trigger(item, _notify, options);
            } : _notify) : null;
            if (success) {
                // success callback
                if (object && object.success) {
                    options.success = function() {
                        success.apply(this, arguments);
                        object.success.apply(this, arguments);
                    };
                } else {
                    options.success = success;
                }
            }
            if (fail) {
                // fail callback
                if (object && object.fail) {
                    options.fail = function() {
                        fail.apply(this, arguments);
                        object.fail.apply(this, arguments);
                    };
                } else {
                    options.fail = fail;
                }
            }
            if (notify) {
                // notify callback
                if (object && object.notify) {
                    options.notify = function() {
                        notify.apply(this, arguments);
                        object.notify.apply(this, arguments);
                    };
                } else if (!options.notify && object && object.success) {
                    options.notify = function() {
                        notify.apply(this, arguments);
                        object.success.apply(this, arguments);
                    };
                } else {
                    options.notify = notify;
                }
            } else if (!options.notify && object && object.success) {
                // by default, run success callback
                options.notify = object.success;
            }
            return options;
        },
        // helper for passing `options` object to inner methods
        // the callbacks are removed and `override` can be used to update properties
        _inner: function(options, override) {
            // removing success/fail/notify from options
            return $.extend({
            }, options, {
                success: null,
                fail: null,
                notify: null
            },
            override);
        },
        // trigger the aciTree events on the tree container
        _trigger: function(item, eventName, options) {
            var event = $.Event('acitree');
            if (!options) {
                options = this._options();
            }
            this._instance.jQuery.trigger(event, [this, item, eventName, options]);
            return !event.isDefaultPrevented();
        },
        // call on success
        _success: function(item, options) {
            if (options && options.success) {
                options.success.call(this, item, options);
            }
        },
        // call on fail
        _fail: function(item, options) {
            if (options && options.fail) {
                options.fail.call(this, item, options);
            }
        },
        // call on notify (should be same as `success` but called when already in the requested state)
        _notify: function(item, options) {
            if (options && options.notify) {
                options.notify.call(this, item, options);
            }
        },
        // delay callback on busy item
        _delayBusy: function(item, callback) {
            if ((this._private.delayBusy < 10) && this.isBusy(item)) {
                this._private.delayBusy++;
                window.setTimeout(this.proxy(function() {
                    this._delayBusy.call(this, item, callback);
                    this._private.delayBusy--;
                }), 10);
                return;
            }
            callback.apply(this);
        },
        // return the data source for item
        // defaults to `aciTree.options.ajax` if not set on the item/his parents
        _dataSource: function(item) {
            var dataSource = this._instance.options.dataSource;
            if (dataSource) {
                var data = this.itemData(item);
                if (data && data.source && dataSource[data.source]) {
                    return dataSource[data.source];
                }
                var parent;
                do {
                    parent = this.parent(item);
                    data = this.itemData(parent);
                    if (data && data.source && dataSource[data.source]) {
                        return dataSource[data.source];
                    }
                } while (parent.length);
            }
            return this._instance.options.ajax;
        },
        // process item loading with AJAX
        // `item` can be NULL to load the ROOT
        // loaded data need to be array of item objects
        // each item can have children (defined as `itemData.branch` - array of item data objects)
        ajaxLoad: function(item, options) {
            if (item && this.isBusy(item)) {
                // delay the load if busy
                this._delayBusy(item, function() {
                    this.ajaxLoad(item, options);
                });
                return;
            }
            options = this._options(options, function() {
                this._loading(item);
                this._trigger(item, 'loaded', options);
            }, function() {
                this._loading(item);
                this._trigger(item, 'loadfail', options);
            }, function() {
                this._loading(item);
                this._trigger(item, 'wasloaded', options);
            });
            if (!item || this.isInode(item)) {
                // add the task to the queue
                this._instance.queue.push(function(complete) {
                    // a way to cancel the operation
                    if (!this._trigger(item, 'beforeload', options)) {
                        this._fail(item, options);
                        complete();
                        return;
                    }
                    this._loading(item, true);
                    if (this.wasLoad(item)) {
                        // was load already
                        this._notify(item, options);
                        complete();
                        return;
                    }
                    // ensure we work on a copy of the dataSource object
                    var settings = $.extend({
                    }, this._dataSource(item));
                    // call the `aciTree.options.ajaxHook`
                    this._instance.options.ajaxHook.call(this, item, settings);
                    // loaded data need to be array of item objects
                    settings.success = this.proxy(function(itemList) {
                        if (itemList && (itemList instanceof Array) && itemList.length) {
                            // the AJAX returned some items
                            var process = function() {
                                if (this.wasLoad(item)) {
                                    this._notify(item, options);
                                    complete();
                                } else {
                                    // create a branch from `itemList`
                                    this._createBranch(item, this._inner(options, {
                                        success: function() {
                                            this._success(item, options);
                                            complete();
                                        },
                                        fail: function() {
                                            this._fail(item, options);
                                            complete();
                                        },
                                        itemData: itemList
                                    }));
                                }
                            };
                            if (!item || this.isInode(item)) {
                                process.apply(this);
                            } else {
                                // change the item to inode, then load
                                this.setInode(item, this._inner(options, {
                                    success: process,
                                    fail: options.fail
                                }));
                            }
                        } else {
                            // the AJAX response was not just right (or not a inode)
                            var process = function() {
                                this._fail(item, options);
                                complete();
                            };
                            if (!item || this.isLeaf(item)) {
                                process.apply(this);
                            } else {
                                // change the item to leaf
                                this.setLeaf(item, this._inner(options, {
                                    success: process,
                                    fail: process
                                }));
                            }
                        }
                    });
                    settings.error = this.proxy(function() {
                        // AJAX failed
                        this._fail(item, options);
                        complete();
                    });
                    $.ajax(settings);
                }, true);
            } else {
                this._fail(item, options);
            }
        },
        // process item loading
        // `item` can be NULL to load the ROOT
        // `options.itemData` need to be array of item objects
        // each item can have children (defined as `itemData.branch` - array of item data objects)
        loadFrom: function(item, options) {
            if (item && this.isBusy(item)) {
                // delay the load if busy
                this._delayBusy(item, function() {
                    this.loadFrom(item, options);
                });
                return;
            }
            options = this._options(options, function() {
                this._loading(item);
                this._trigger(item, 'loaded', options);
            }, function() {
                this._loading(item);
                this._trigger(item, 'loadfail', options);
            }, function() {
                this._loading(item);
                this._trigger(item, 'wasloaded', options);
            });
            if (!item || this.isInode(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeload', options)) {
                    this._fail(item, options);
                    return;
                }
                this._loading(item, true);
                if (this.wasLoad(item)) {
                    // was load already
                    this._notify(item, options);
                    return;
                }
                // data need to be array of item objects
                if (options.itemData && (options.itemData instanceof Array) && options.itemData.length) {
                    // create the branch from `options.itemData`
                    var process = function() {
                        if (this.wasLoad(item)) {
                            this._notify(item, options);
                        } else {
                            this._createBranch(item, options);
                        }
                    };
                    if (!item || this.isInode(item)) {
                        process.apply(this);
                    } else {
                        // change the item to inode, then create children
                        this.setInode(item, this._inner(options, {
                            success: process,
                            fail: options.fail
                        }));
                    }
                } else {
                    // this is not a inode
                    if (!item || this.isLeaf(item)) {
                        this._fail(item, options);
                    } else {
                        // change the item to leaf
                        this.setLeaf(item, this._inner(options, {
                            success: options.fail,
                            fail: options.fail
                        }));
                    }
                }
            } else {
                this._fail(item, options);
            }
        },
        // unload item
        // `item` can be NULL to unload the entire tree
        unload: function(item, options) {
            options = this._options(options, function() {
                this._loading(item);
                this._trigger(item, 'unloaded', options);
            }, function() {
                this._loading(item);
                this._trigger(item, 'unloadfail', options);
            }, function() {
                this._loading(item);
                this._trigger(item, 'notloaded', options);
            });
            if (!item || this.isInode(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeunload', options)) {
                    this._fail(item, options);
                    return;
                }
                this._loading(item, true);
                if (!this.wasLoad(item)) {
                    // if was not loaded
                    this._notify(item, options);
                    return;
                }
                // first check each children
                var cancel = false;
                var children = this.children(item, true, true);
                children.each(this.proxy(function(element) {
                    var item = $(element);
                    if (this.isInode(item)) {
                        if (this.isOpen(item)) {
                            // a way to cancel the operation
                            if (!this._trigger(item, 'beforeclose', options)) {
                                cancel = true;
                                return false;
                            }
                        }
                        if (this.wasLoad(item)) {
                            // a way to cancel the operation
                            if (!this._trigger(item, 'beforeunload', options)) {
                                cancel = true;
                                return false;
                            }
                        }
                    }
                    // a way to cancel the operation
                    if (!this._trigger(item, 'beforeremove', options)) {
                        cancel = true;
                        return false;
                    }
                }, true));
                if (cancel) {
                    // it was canceled
                    this._fail(item, options);
                    return;
                }
                var process = function() {
                    children.each(this.proxy(function(element) {
                        // trigger the events before DOM changes
                        var item = $(element);
                        if (this.isInode(item)) {
                            if (this.isOpen(item)) {
                                this._trigger(item, 'closed', options);
                            }
                            if (this.wasLoad(item)) {
                                this._trigger(item, 'unloaded', options);
                            }
                        }
                        this._trigger(item, 'removed', options);
                    }, true));
                };
                // process the child remove
                if (item) {
                    if (this.isOpen(item)) {
                        // first close the item, then remove children
                        this.close(item, this._inner(options, {
                            success: function() {
                                process.call(this);
                                this._removeContainer(item);
                                this._success(item, options);
                            },
                            fail: options.fail
                        }));
                    } else {
                        process.call(this);
                        this._removeContainer(item);
                        this._success(item, options);
                    }
                } else {
                    // unload the ROOT
                    this._animate(item, false, !this._instance.options.animateRoot || options.unanimated, function() {
                        process.call(this);
                        this._removeContainer();
                        this._success(item, options);
                    });
                }
            } else {
                this._fail(item, options);
            }
        },
        // remove item
        remove: function(item, options) {
            if (this.isItem(item)) {
                if (this.hasSiblings(item)) {
                    options = this._options(options, function() {
                        if (this.isOpenPath(item)) {
                            // if the parents are opened (visible) update the item states
                            domApi.removeClass(item[0], 'aciTreeVisible');
                            this._setOddEven(item);
                        }
                        this._trigger(item, 'removed', options);
                    }, 'removefail', null, item);
                    // a way to cancel the operation
                    if (!this._trigger(item, 'beforeremove', options)) {
                        this._fail(item, options);
                        return;
                    }
                    if (this.wasLoad(item)) {
                        // unload the inode then remove
                        this.unload(item, this._inner(options, {
                            success: function() {
                                this._success(item, options);
                                this._removeItem(item);
                            },
                            fail: options.fail
                        }));
                    } else {
                        // just remove the item
                        this._success(item, options);
                        this._removeItem(item);
                    }
                } else {
                    var parent = this.parent(item);
                    if (parent.length) {
                        this.setLeaf(parent, options);
                    } else {
                        this.unload(null, options);
                    }
                }
            } else {
                this._trigger(item, 'removefail', options)
                this._fail(item, options);
            }
        },
        // open item children
        _openChildren: function(item, options) {
            if (options.expand) {
                var queue = this._instance.queue;
                // process the children inodes
                this.inodes(this.children(item)).each(function() {
                    var item = $(this);
                    // queue node opening
                    queue.push(function(complete) {
                        this.open(item, this._inner(options));
                        complete();
                    });
                });
                queue.push(function(complete) {
                    this._success(item, options);
                    complete();
                });
            } else {
                this._success(item, options);
            }
        },
        // process item open
        _openItem: function(item, options) {
            if (!options.unanimated && !this.isVisible(item)) {
                options.unanimated = true;
            }
            if (options.unique) {
                // close other opened nodes
                this.closeOthers(item);
                options.unique = false;
            }
            // open the node
            this._coreDOM.toggle(item, true);
            // (temporarily) update children states
            this._setOddEvenChildren(item);
            this._animate(item, true, options.unanimated, function() {
                this._openChildren(item, options);
            });
        },
        // open item and his children if requested
        open: function(item, options) {
            options = this._options(options, function() {
                if (this.isOpenPath(item)) {
                    // if all parents are open, update the items after
                    this._updateVisible(item);
                    this._setOddEven(item);
                }
                this._trigger(item, 'opened', options);
            }, 'openfail', 'wasopened', item);
            if (this.isInode(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeopen', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isOpen(item)) {
                    options.success = options.notify;
                    // propagate/open children (if required)
                    this._openChildren(item, options);
                } else {
                    if (this.wasLoad(item)) {
                        this._openItem(item, options);
                    } else {
                        // try to load the node, then open
                        this.ajaxLoad(item, this._inner(options, {
                            success: function() {
                                this._openItem(item, options);
                            },
                            fail: options.fail
                        }));
                    }
                }
            } else {
                this._fail(item, options);
            }
        },
        // close item children
        _closeChildren: function(item, options) {
            if (this._instance.options.empty) {
                // unload on close
                options.unanimated = true;
                this.unload(item, options);
            } else if (options.collapse) {
                var queue = this._instance.queue;
                // process the children inodes
                this.inodes(this.children(item)).each(function() {
                    var item = $(this);
                    // queue node close
                    queue.push(function(complete) {
                        this.close(item, this._inner(options, {
                            unanimated: true
                        }));
                        complete();
                    });
                });
                queue.push(function(complete) {
                    this._success(item, options);
                    complete();
                });
            } else {
                this._success(item, options);
            }
        },
        // process item close
        _closeItem: function(item, options) {
            if (!options.unanimated && !this.isVisible(item)) {
                options.unanimated = true;
            }
            // close the item
            this._coreDOM.toggle(item, false);
            this._animate(item, false, options.unanimated, function() {
                this._closeChildren(item, options);
            });
        },
        // close item and his children if requested
        close: function(item, options) {
            options = this._options(options, function() {
                if (this.isOpenPath(item)) {
                    // if all parents are open, update the items after
                    this._updateVisible(item);
                    this._setOddEven(item);
                }
                this._trigger(item, 'closed', options);
            }, 'closefail', 'wasclosed', item);
            if (this.isInode(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeclose', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isOpen(item)) {
                    this._closeItem(item, options);
                } else if (this.wasLoad(item)) {
                    options.success = options.notify;
                    // propagate/close/empty children (if required)
                    this._closeChildren(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // update visible state
        _updateVisible: function(item) {
            if (this.isOpenPath(item)) {
                if (!this.isHidden(item)) {
                    // if open parents and not hidden
                    domApi.addClass(item[0], 'aciTreeVisible');
                    if (this.isOpen(item)) {
                        // process children
                        domApi.children(item[0], false, this.proxy(function(node) {
                            if (!domApi.hasClass(node, 'aciTreeVisible')) {
                                this._updateVisible($(node));
                            }
                        }));
                    } else {
                        // children are not visible
                        domApi.children(item[0], true, function(node) {
                            return domApi.removeClass(node, 'aciTreeVisible') ? true : null;
                        });
                    }
                }
            } else if (domApi.removeClass(item[0], 'aciTreeVisible')) {
                domApi.children(item[0], true, function(node) {
                    return domApi.removeClass(node, 'aciTreeVisible') ? true : null;
                });
            }
        },
        // keep just one branch open
        closeOthers: function(item, options) {
            options = this._options(options);
            if (this.isItem(item)) {
                var queue = this._instance.queue;
                // exclude the item and his parents
                var exclude = item.add(this.path(item)).add(this.children(item, true));
                // close all other open nodes
                this.inodes(this.children(null, true, true), true).not(exclude).each(function() {
                    var item = $(this);
                    // add node to close queue
                    queue.push(function(complete) {
                        this.close(item, this._inner(options));
                        complete();
                    });
                });
                queue.push(function(complete) {
                    this._success(item, options);
                    complete();
                });
            } else {
                this._fail(item, options);
            }
        },
        // toggle item
        toggle: function(item, options) {
            options = this._options(options, 'toggled', 'togglefail', null, item);
            if (this.isInode(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforetoggle', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isOpen(item)) {
                    this.close(item, options);
                } else {
                    this.open(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // get item path starting from the top parent (ROOT)
        // when `reverse` is TRUE returns the path in reverse order
        path: function(item, reverse) {
            if (item) {
                var parent = item[0], list = [];
                while (parent = domApi.parent(parent)) {
                    list.push(parent);
                }
                return reverse ? $(list) : $(list.reverse());
            }
            return $([]);
        },
        // test if item is in view
        // when `center` is TRUE will test if is centered in view
        isVisible: function(item, center) {
            if (item && this.isOpenPath(item)) {
                // the item path need to be open
                var rect = this._instance.jQuery[0].getBoundingClientRect();
                var size = domApi.childrenByClass(item[0], 'aciTreeItem');
                var test = size.getBoundingClientRect();
                var height = $(size).outerHeight(true);
                var offset = center ? this._instance.jQuery.innerHeight() / 2 : 0;
                if ((test.bottom - height < rect.top + offset) || (test.top + height > rect.bottom - offset)) {
                    // is out of view
                    return false;
                }
                return true;
            }
            return false;
        },
        // open path to item
        openPath: function(item, options) {
            options = this._options(options);
            if (this.isItem(item)) {
                var queue = this._instance.queue;
                // process closed inodes
                this.inodes(this.path(item), false).each(function() {
                    var item = $(this);
                    // add node to open queue
                    queue.push(function(complete) {
                        this.open(item, this._inner(options));
                        complete();
                    });
                });
                queue.push(function(complete) {
                    this._success(item, options);
                    complete();
                });
            } else {
                this._fail(item, options);
            }
        },
        // test if path to item is open
        isOpenPath: function(item) {
            var parent = this.parent(item);
            return parent.length ? this.isOpen(parent) && domApi.hasClass(parent[0], 'aciTreeVisible') : true;
        },
        // get animation speed vs. offset size
        // `speed` is the raw speed
        // `totalSize` is the available size
        // `required` is the offset used for calculations
        _speedFraction: function(speed, totalSize, required) {
            if ((required < totalSize) && totalSize) {
                var numeric = parseInt(speed);
                if (isNaN(numeric)) {
                    // predefined string values
                    switch (speed) {
                        case 'slow':
                            numeric = 600;
                            break;
                        case 'medium':
                            numeric = 400;
                            break;
                        case 'fast':
                            numeric = 200;
                            break;
                        default:
                            return speed;
                    }
                }
                return numeric * required / totalSize;
            }
            return speed;
        },
        // bring item in view
        // `options.center` says if should be centered in view
        setVisible: function(item, options) {
            options = this._options(options, 'visible', 'visiblefail', 'wasvisible', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforevisible', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isVisible(item)) {
                    // is visible already
                    this._notify(item, options);
                    return;
                }
                var process = function() {
                    // compute position with getBoundingClientRect
                    var rect = this._instance.jQuery[0].getBoundingClientRect();
                    var size = domApi.childrenByClass(item[0], 'aciTreeItem');
                    var test = size.getBoundingClientRect();
                    var height = $(size).outerHeight(true);
                    var offset = options.center ? this._instance.jQuery.innerHeight() / 2 : 0;
                    if (test.bottom - height < rect.top + offset) {
                        // item somewhere before the first visible
                        var diff = rect.top + offset - test.bottom + height;
                        if (!options.unanimated && this._instance.options.view) {
                            this._instance.jQuery.stop(true).animate({
                                scrollTop: this._instance.jQuery.scrollTop() - diff
                            },
                            {
                                duration: this._speedFraction(this._instance.options.view.duration, rect.bottom - rect.top, diff),
                                easing: this._instance.options.view.easing,
                                complete: this.proxy(function() {
                                    this._success(item, options);
                                })
                            });
                        } else {
                            this._instance.jQuery.stop(true).get(0).scrollTop = this._instance.jQuery.scrollTop() - diff;
                            this._success(item, options);
                        }
                    } else if (test.top + height > rect.bottom - offset) {
                        // item somewhere after the last visible
                        var diff = test.top - rect.bottom + offset + height;
                        if (!options.unanimated && this._instance.options.view) {
                            this._instance.jQuery.stop(true).animate({
                                scrollTop: this._instance.jQuery.scrollTop() + diff
                            },
                            {
                                duration: this._speedFraction(this._instance.options.view.duration, rect.bottom - rect.top, diff),
                                easing: this._instance.options.view.easing,
                                complete: this.proxy(function() {
                                    this._success(item, options);
                                })
                            });
                        } else {
                            this._instance.jQuery.stop(true).get(0).scrollTop = this._instance.jQuery.scrollTop() + diff;
                            this._success(item, options);
                        }
                    } else {
                        this._success(item, options);
                    }
                };
                if (this.hasParent(item)) {
                    // first we need to open the path to item
                    this.openPath(item, this._inner(options, {
                        success: process,
                        fail: options.fail
                    }));
                } else {
                    process.apply(this);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if item has parent
        hasParent: function(item) {
            return this.parent(item).length > 0;
        },
        // get item parent
        parent: function(item) {
            return item ? $(domApi.parent(item[0])) : $([]);
        },
        // get item top (ROOT) parent
        topParent: function(item) {
            return this.path(item).eq(0);
        },
        // create tree branch
        // `options.itemData` need to be in the same format as for .append
        _createBranch: function(item, options) {
            var total = 0;
            var count = function(itemList) {
                var itemData;
                for (var i = 0; i < itemList.length; i++) {
                    itemData = itemList[i];
                    if (itemData.branch && (itemData.branch instanceof Array) && itemData.branch.length) {
                        count(itemData.branch);
                    }
                }
                total++;
            };
            count(options.itemData);
            var index = 0;
            var complete = this.proxy(function() {
                index++;
                if (index >= total) {
                    this._success(item, options);
                }
            });
            var process = this.proxy(function(node, itemList) {
                if (node) {
                    // set it as a inode
                    domApi.addRemoveClass(node[0], 'aciTreeInode', 'aciTreeInodeMaybe');
                }
                // use .append to add new items
                this.append(node, this._inner(options, {
                    success: function(item, options) {
                        var itemData;
                        for (var i = 0; i < options.itemData.length; i++) {
                            itemData = options.itemData[i];
                            // children need to be array of item objects
                            if (itemData.branch && (itemData.branch instanceof Array) && itemData.branch.length) {
                                process(options.items.eq(i), itemData.branch);
                            }
                            if (itemData.open) {
                                // open the item is requuested
                                this.open(options.items.eq(i), this._inner(options, {
                                    itemData: null,
                                    items: null
                                }));
                            }
                        }
                        complete();
                    },
                    fail: options.fail,
                    itemData: itemList
                }));
            });
            process(item, options.itemData);
        },
        // get first/last items
        _getFirstLast: function(parent) {
            if (!parent) {
                parent = this._instance.jQuery;
            }
            return $(domApi.withAnyClass(domApi.children(parent[0]), ['aciTreeFirst', 'aciTreeLast']));
        },
        // update first/last items
        _setFirstLast: function(parent, clear) {
            if (clear) {
                domApi.removeListClass(clear.toArray(), ['aciTreeFirst', 'aciTreeLast']);
            }
            if (this.hasChildren(parent)) {
                domApi.addClass(this.first(parent)[0], 'aciTreeFirst');
                domApi.addClass(this.last(parent)[0], 'aciTreeLast');
            }
        },
        // update odd/even state
        _setOddEven: function(items) {
            // consider only visible items
            var visible;
            if (this._instance.jQuery[0].getElementsByClassName) {
                visible = this._instance.jQuery[0].getElementsByClassName('aciTreeVisible');
                visible = visible ? window.Array.prototype.slice.call(visible) : [];
            } else {
                visible = $(domApi.children(this._instance.jQuery[0], true, function(node) {
                    return this.hasClass(node, 'aciTreeVisible') ? true : null;
                }));
            }
            var odd = true;
            if (visible.length) {
                var index = 0;
                if (items) {
                    // search the item to start with (by index)
                    items.each(function() {
                        if (visible.indexOf) {
                            var found = visible.indexOf(this);
                            if (found != -1) {
                                index = window.Math.min(found, index);
                            }
                        } else {
                            for (var i = 0; i < visible.length; i++) {
                                if (visible[i] === this) {
                                    index = window.Math.min(i, index);
                                    break;
                                }
                            }
                        }
                    });
                    index = window.Math.max(index - 1, 0);
                }
                if (index > 0) {
                    // determine with what to start with (odd/even)
                    var first = visible[index];
                    if (domApi.hasClass(first, 'aciTreOdd')) {
                        odd = false;
                    }
                    // process only after index
                    visible = visible.slice(index + 1);
                }
            }
            this._coreDOM.oddEven($(visible), odd);
        },
        // update odd/even state for direct children
        _setOddEvenChildren: function(item) {
            var odd = domApi.hasClass(item[0], 'aciTreeOdd');
            var children = this.children(item);
            this._coreDOM.oddEven(children, !odd);
        },
        // process item before inserting into the DOM
        _itemHook: function(parent, item, itemData, level) {
            if (this._instance.options.itemHook) {
                this._instance.options.itemHook.apply(this, arguments);
            }
        },
        // create item by `itemData`
        // `level` is the #0 based item level
        _createItem: function(itemData, level) {
            if (this._private.itemClone[level]) {
                var li = this._private.itemClone[level].cloneNode(true);
                var icon = li.firstChild;
                for (var i = 0; i < level; i++) {
                    icon = icon.firstChild;
                }
                icon = icon.firstChild.lastChild.firstChild;
                var text = icon.nextSibling;
            } else {
                var li = window.document.createElement('LI');
                li.setAttribute('tabindex', -1);
                li.setAttribute('role', 'treeitem');
                li.setAttribute('aria-selected', false);
                var line = window.document.createElement('DIV');
                li.appendChild(line);
                line.className = 'aciTreeLine';
                var last = line, branch;
                for (var i = 0; i < level; i++) {
                    branch = window.document.createElement('DIV');
                    last.appendChild(branch);
                    branch.className = 'aciTreeBranch aciTreeLevel' + i;
                    last = branch;
                }
                var entry = window.document.createElement('DIV');
                last.appendChild(entry);
                entry.className = 'aciTreeEntry';
                var button = window.document.createElement('SPAN');
                entry.appendChild(button);
                button.className = 'aciTreeButton';
                var push = window.document.createElement('SPAN');
                button.appendChild(push);
                push.className = 'aciTreePush';
                push.appendChild(window.document.createElement('SPAN'));
                var item = window.document.createElement('SPAN');
                entry.appendChild(item);
                item.className = 'aciTreeItem';
                var icon = window.document.createElement('SPAN');
                item.appendChild(icon);
                var text = window.document.createElement('SPAN');
                item.appendChild(text);
                text.className = 'aciTreeText';
                this._private.itemClone[level] = li.cloneNode(true);
            }
            li.className = 'aciTreeLi' + (itemData.inode || (itemData.inode === null) ? (itemData.inode || (itemData.branch && itemData.branch.length) ? ' aciTreeInode' : ' aciTreeInodeMaybe') : ' aciTreeLeaf') + ' aciTreeLevel' + level + (itemData.disabled ? ' aciTreeDisabled' : '');
            li.setAttribute('aria-level', level + 1);
            if (itemData.icon) {
                if (itemData.icon instanceof Array) {
                    icon.className = 'aciTreeIcon ' + itemData.icon[0];
                    icon.style.backgroundPosition = itemData.icon[1] + 'px ' + itemData.icon[2] + 'px';
                } else {
                    icon.className = 'aciTreeIcon ' + itemData.icon;
                }
            } else {
                icon.parentNode.removeChild(icon);
            }
            text.innerHTML = itemData.label;
            var $li = $(li);
            $li.data('itemData' + this._instance.nameSpace, $.extend({
            }, itemData, {
                branch: itemData.branch && itemData.branch.length
            }));
            return $li;
        },
        // remove item
        _removeItem: function(item) {
            var parent = this.parent(item);
            item.remove();
            // update sibling state
            this._setFirstLast(parent.length ? parent : null);
        },
        // create & add one or more items
        // `ul`, `before` and `after` are set depending on the caller
        // `itemData` need to be array of objects or just an object (one item)
        // `level` is the #0 based level
        // `callback` function (items) is called at the end of the operation
        _createItems: function(ul, before, after, itemData, level, callback) {
            var items = [], fragment = window.document.createDocumentFragment();
            var task = new this._task(this._instance.queue, function(complete) {
                items = $(items);
                if (items.length) {
                    // add the new items
                    if (ul) {
                        ul[0].appendChild(fragment);
                    } else if (before) {
                        before[0].parentNode.insertBefore(fragment, before[0]);
                    } else if (after) {
                        after[0].parentNode.insertBefore(fragment, after[0].nextSibling);
                    }
                }
                callback.call(this, items);
                complete();
            });
            if (itemData) {
                this._loader(true);
                var parent;
                if (ul) {
                    parent = this.itemFrom(ul);
                } else if (before) {
                    parent = this.parent(before);
                } else if (after) {
                    parent = this.parent(after);
                }
                if (itemData instanceof Array) {
                    // this is a list of items
                    for (var i = 0; i < itemData.length; i++) {
                        (function(itemData) {
                            task.push(function(complete) {
                                var item = this._createItem(itemData, level);
                                this._itemHook(parent, item, itemData, level);
                                fragment.appendChild(item[0]);
                                items.push(item[0]);
                                complete();
                            });
                        })(itemData[i]);
                    }
                } else {
                    task.push(function(complete) {
                        // only one item
                        var item = this._createItem(itemData, level);
                        this._itemHook(parent, item, itemData, level);
                        fragment.appendChild(item[0]);
                        items.push(item[0]);
                        complete();
                    });
                }
            }
            // run at least once
            task.push(function(complete) {
                complete();
            });
        },
        // create children container
        _createContainer: function(item) {
            if (!item) {
                item = this._instance.jQuery;
            }
            // ensure we have a UL in place
            var ul = domApi.container(item[0]);
            if (!ul) {
                var ul = window.document.createElement('UL');
                ul.setAttribute('role', 'group');
                ul.className = 'aciTreeUl';
                ul.style.display = 'none';
                item[0].appendChild(ul);
            }
            return $(ul);
        },
        // remove children container
        _removeContainer: function(item) {
            if (!item) {
                item = this._instance.jQuery;
            }
            var ul = domApi.container(item[0]);
            ul.parentNode.removeChild(ul);
        },
        // append one or more items to item
        // `options.itemData` can be a item object or array of item objects
        // `options.items` will keep a list of added items
        append: function(item, options) {
            options = this._options(options, 'appended', 'appendfail', null, item);
            if (item) {
                if (this.isInode(item)) {
                    // a way to cancel the operation
                    if (!this._trigger(item, 'beforeappend', options)) {
                        this._fail(item, options);
                        return;
                    }
                    var container = this._createContainer(item);
                    var last = this.last(item);
                    this._createItems(container, null, null, options.itemData, this.level(item) + 1, function(list) {
                        if (list.length) {
                            // some items created, update states
                            domApi.addRemoveClass(item[0], 'aciTreeInode', 'aciTreeInodeMaybe');
                            this._setFirstLast(item, last);
                            if (this.isHidden(item)) {
                                domApi.addListClass(list.toArray(), 'aciTreeHidden');
                            } else if (this.isOpenPath(item) && this.isOpen(item)) {
                                domApi.addListClass(list.toArray(), 'aciTreeVisible');
                                this._setOddEven(list.first());
                            }
                            // trigger `added` for each item
                            list.each(this.proxy(function(element) {
                                this._trigger($(element), 'added', options);
                            }, true));
                        } else if (!this.hasChildren(item, true)) {
                            container.remove();
                        }
                        options.items = list;
                        this._success(item, options);
                    });
                } else {
                    this._fail(item, options);
                }
            } else {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeappend', options)) {
                    this._fail(item, options);
                    return;
                }
                var container = this._createContainer();
                var last = this.last();
                this._createItems(container, null, null, options.itemData, 0, function(list) {
                    if (list.length) {
                        // some items created, update states
                        this._setFirstLast(null, last);
                        domApi.addListClass(list.toArray(), 'aciTreeVisible');
                        this._setOddEven();
                        // trigger `added` for each item
                        list.each(this.proxy(function(element) {
                            this._trigger($(element), 'added', options);
                        }, true));
                        this._animate(null, true, !this._instance.options.animateRoot || options.unanimated);
                    } else if (!this.hasChildren(null, true)) {
                        // remove the children container
                        container.remove();
                    }
                    options.items = list;
                    this._success(item, options);
                });
            }
        },
        // insert one or more items before item
        // `options.itemData` can be a item object or array of item objects
        // `options.items` will keep a list of added items
        before: function(item, options) {
            options = this._options(options, 'before', 'beforefail', null, item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforebefore', options)) {
                    this._fail(item, options);
                    return;
                }
                var prev = this.prev(item);
                this._createItems(null, item, null, options.itemData, this.level(item), function(list) {
                    if (list.length) {
                        // some items created, update states
                        if (!prev.length) {
                            domApi.removeClass(item[0], 'aciTreeFirst');
                            domApi.addClass(list.first()[0], 'aciTreeFirst');
                        }
                        var parent = this.parent(item);
                        if (parent.length && this.isHidden(parent)) {
                            domApi.addListClass(list.toArray(), 'aciTreeHidden');
                        } else if (this.isOpenPath(item)) {
                            domApi.addListClass(list.toArray(), 'aciTreeVisible');
                            this._setOddEven(list.first());
                        }
                        // trigger `added` for each item
                        list.each(this.proxy(function(element) {
                            this._trigger($(element), 'added', options);
                        }, true));
                    }
                    options.items = list;
                    this._success(item, options);
                });
            } else {
                this._fail(item, options);
            }
        },
        // insert one or more items after item
        // `options.itemData` can be a item object or array of item objects
        // `options.items` will keep a list of added items
        after: function(item, options) {
            options = this._options(options, 'after', 'afterfail', null, item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeafter', options)) {
                    this._fail(item, options);
                    return;
                }
                var next = this.next(item);
                this._createItems(null, null, item, options.itemData, this.level(item), function(list) {
                    if (list.length) {
                        // some items created, update states
                        if (!next.length) {
                            domApi.removeClass(item[0], 'aciTreeLast');
                            domApi.addClass(list.last()[0], 'aciTreeLast');
                        }
                        var parent = this.parent(item);
                        if (parent.length && this.isHidden(parent)) {
                            domApi.addListClass(list.toArray(), 'aciTreeHidden');
                        } else if (this.isOpenPath(item)) {
                            domApi.addListClass(list.toArray(), 'aciTreeVisible');
                            this._setOddEven(list.first());
                        }
                        // trigger `added` for each item
                        list.each(this.proxy(function(element) {
                            this._trigger($(element), 'added', options);
                        }, true));
                    }
                    options.items = list;
                    this._success(item, options);
                });
            } else {
                this._fail(item, options);
            }
        },
        // get item having the element
        itemFrom: function(element) {
            if (element) {
                var item = $(element);
                if (item[0] === this._instance.jQuery[0]) {
                    return $([]);
                } else {
                    return $(domApi.parentFrom(item[0]));
                }
            }
            return $([]);
        },
        // get item children
        // if `branch` is TRUE then all children are returned
        // if `hidden` is TRUE then the hidden items will be considered too
        children: function(item, branch, hidden) {
            return $(domApi.children(item ? item[0] : this._instance.jQuery[0], branch, hidden ? null : function(node) {
                return this.hasClass(node, 'aciTreeHidden') ? null : true;
            }));
        },
        // filter only the visible items (items with all parents opened)
        // if `view` is TRUE then only the items in view are returned
        visible: function(items, view) {
            var list = domApi.withClass(items.toArray(), 'aciTreeVisible');
            if (view) {
                var filter = [];
                for (var i = 0; i < list.length; i++) {
                    if (this.isVisible($(list[i]))) {
                        filter.push(list[i]);
                    }
                }
                return $(filter);
            }
            return $(list);
        },
        // filter only inner nodes from items
        // if `state` is set then filter only open/closed ones
        inodes: function(items, state) {
            if (state !== undefined) {
                if (state) {
                    return $(domApi.withClass(items.toArray(), 'aciTreeOpen'));
                } else {
                    return $(domApi.withAnyClass(items.toArray(), ['aciTreeInode', 'aciTreeInodeMaybe'], 'aciTreeOpen'));
                }
            }
            return $(domApi.withAnyClass(items.toArray(), ['aciTreeInode', 'aciTreeInodeMaybe']));
        },
        // filter only leaf nodes from items
        leaves: function(items) {
            return $(domApi.withClass(items.toArray(), 'aciTreeLeaf'));
        },
        // test if is a inner node
        isInode: function(item) {
            return item && domApi.hasAnyClass(item[0], ['aciTreeInode', 'aciTreeInodeMaybe']);
        },
        // test if is a leaf node
        isLeaf: function(item) {
            return item && domApi.hasClass(item[0], 'aciTreeLeaf');
        },
        // test if item was loaded
        wasLoad: function(item) {
            if (item) {
                return domApi.container(item[0]) !== null;
            }
            return domApi.container(this._instance.jQuery[0]) !== null;
        },
        // set item as inner node
        setInode: function(item, options) {
            options = this._options(options, 'inodeset', 'inodefail', 'wasinode', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeinode', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isLeaf(item)) {
                    this._coreDOM.inode(item, true);
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // set item as leaf node
        setLeaf: function(item, options) {
            options = this._options(options, 'leafset', 'leaffail', 'wasleaf', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeleaf', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isInode(item)) {
                    var process = function() {
                        this._coreDOM.leaf(item);
                        this._success(item, options);
                    };
                    if (this.wasLoad(item)) {
                        // first unload the node
                        this.unload(item, this._inner(options, {
                            success: process,
                            fail: options.fail
                        }));
                    } else {
                        process.apply(this);
                    }
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // add/update item icon
        // `options.icon` can be the CSS class name or array['CSS class name', background-position-x, background-position-y]
        // `options.oldIcon` will keep the old icon
        addIcon: function(item, options) {
            options = this._options(options, 'iconadded', 'addiconfail', 'wasicon', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeaddicon', options)) {
                    this._fail(item, options);
                    return;
                }
                var data = this.itemData(item);
                // keep the old one
                options.oldIcon = data.icon;
                var parent = item.children('.aciTreeLine').find('.aciTreeItem');
                var found = parent.children('.aciTreeIcon');
                if (found.length && data.icon && (options.icon.toString() == data.icon.toString())) {
                    this._notify(item, options);
                } else {
                    if (options.icon instanceof Array) {
                        // icon with background-position
                        if (found.length) {
                            found.attr('class', 'aciTreeIcon ' + options.icon[0]).css('background-position', options.icon[1] + 'px ' + options.icon[2] + 'px');
                        } else {
                            parent.prepend('<div class="aciTreeIcon ' + options.icon[0] + '" style="background-position:' + options.icon[1] + 'px ' + options.icon[2] + 'px' + '"></div>');
                        }
                    } else {
                        // only the CSS class name
                        if (found.length) {
                            found.attr('class', 'aciTreeIcon ' + options.icon);
                        } else {
                            parent.prepend('<div class="aciTreeIcon ' + options.icon + '"></div>');
                        }
                    }
                    // remember this one
                    data.icon = options.icon;
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // remove item icon
        // options.oldIcon will keep the old icon
        removeIcon: function(item, options) {
            options = this._options(options, 'iconremoved', 'removeiconfail', 'noticon', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeremoveicon', options)) {
                    this._fail(item, options);
                    return;
                }
                var data = this.itemData(item);
                // keep the old one
                options.oldIcon = data.icon;
                var parent = item.children('.aciTreeLine').find('.aciTreeItem');
                var found = parent.children('.aciTreeIcon');
                if (found.length) {
                    found.remove();
                    // remember was removed
                    data.icon = null;
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if item has icon
        hasIcon: function(item) {
            return !!this.getIcon(item);
        },
        // get item icon
        getIcon: function(item) {
            var data = this.itemData(item);
            return data ? data.icon : null;
        },
        // set item label
        // `options.label` is the new label
        // `options.oldLabel` will keep the old label
        setLabel: function(item, options) {
            options = this._options(options, 'labelset', 'labelfail', 'waslabel', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforelabel', options)) {
                    this._fail(item, options);
                    return;
                }
                var data = this.itemData(item);
                // keep the old one
                options.oldLabel = data.label;
                if (options.label == options.oldLabel) {
                    this._notify(item, options);
                } else {
                    // set the label
                    item.children('.aciTreeLine').find('.aciTreeText').html(options.label);
                    // remember this one
                    data.label = options.label;
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // disable item
        disable: function(item, options) {
            options = this._options(options, 'disabled', 'disablefail', 'wasdisabled', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforedisable', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isDisabled(item)) {
                    this._notify(item, options);
                } else {
                    item.addClass('aciTreeDisabled');
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if item is disabled
        isDisabled: function(item) {
            return item && item.hasClass('aciTreeDisabled');
        },
        // test if any of parents are disabled
        isDisabledPath: function(item) {
            return this.path(item).is('.aciTreeDisabled');
        },
        // filter only the disabled items
        disabled: function(items) {
            return items.filter('.aciTreeDisabled');
        },
        // enable item
        enable: function(item, options) {
            options = this._options(options, 'enabled', 'enablefail', 'wasenabled', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeenable', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isDisabled(item)) {
                    item.removeClass('aciTreeDisabled');
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if item is enabled
        isEnabled: function(item) {
            return item && !item.hasClass('aciTreeDisabled');
        },
        // test if all parents are enabled
        isEnabledPath: function(item) {
            return !this.path(item).is('.aciTreeDisabled');
        },
        // filter only the enabled items
        enabled: function(items) {
            return items.not('.aciTreeDisabled');
        },
        // set item as hidden
        hide: function(item, options) {
            options = this._options(options, 'hidden', 'hidefail', 'washidden', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforehide', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isHidden(item)) {
                    this._notify(item, options);
                } else {
                    item.removeClass('aciTreeVisible').addClass('aciTreeHidden');
                    // process children
                    this.children(item, true).removeClass('aciTreeVisible').addClass('aciTreeHidden');
                    // update item states
                    var parent = this.parent(item);
                    this._setFirstLast(parent.length ? parent : null, item);
                    this._setOddEven(item);
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if item is hidden
        isHidden: function(item) {
            return item && item.hasClass('aciTreeHidden');
        },
        // test if any of parents are hidden
        isHiddenPath: function(item) {
            var parent = this.parent(item);
            return parent.length ? parent.hasClass('aciTreeHidden') : false;
        },
        // update hidden state
        _updateHidden: function(item) {
            if (this.isHiddenPath(item)) {
                if (!this.isHidden(item)) {
                    item.addClass('aciTreeHidden');
                    this._updateVisible(item);
                }
            } else {
                this._updateVisible(item);
            }
        },
        // filter only the hidden items
        hidden: function(items) {
            return items.filter('.aciTreeHidden');
        },
        // show hidden item
        _showHidden: function(item) {
            var parent = null;
            this.path(item).add(item).each(this.proxy(function(element) {
                var item = $(element);
                if (this.isHidden(item)) {
                    item.removeClass('aciTreeHidden');
                    if (this.isOpenPath(item) && (!parent || this.isOpen(parent))) {
                        item.addClass('aciTreeVisible');
                    }
                    // update item states
                    this._setFirstLast(parent, this._getFirstLast(parent));
                }
                parent = item;
            }, true));
        },
        // show hidden item
        show: function(item, options) {
            options = this._options(options, 'shown', 'showfail', 'wasshown', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeshow', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isHidden(item)) {
                    this._showHidden(item);
                    var parent = this.topParent(item);
                    // update item states
                    this._setOddEven(parent.length ? parent : item);
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if item is open
        isOpen: function(item) {
            return item && item.hasClass('aciTreeOpen');
        },
        // test if item is closed
        isClosed: function(item) {
            return item && !item.hasClass('aciTreeOpen');
        },
        // test if item has children
        // if `hidden` is TRUE then the hidden items will be considered too
        hasChildren: function(item, hidden) {
            return this.children(item, null, hidden).length > 0;
        },
        // test if item has siblings
        // if `hidden` is TRUE then the hidden items will be considered too
        hasSiblings: function(item, hidden) {
            return this.siblings(item, hidden).length > 0;
        },
        // test if item has another before
        // if `hidden` is TRUE then the hidden items will be considered too
        hasPrev: function(item, hidden) {
            return this.prev(item, hidden).length > 0;
        },
        // test if item has another after
        // if `hidden` is TRUE then the hidden items will be considered too
        hasNext: function(item, hidden) {
            return this.next(item, hidden).length > 0;
        },
        // get item siblings
        // if `hidden` is TRUE then the hidden items will be considered too
        siblings: function(item, hidden) {
            return item ? item.siblings('.aciTreeLi' + (hidden ? '' : ':not(.aciTreeHidden)')) : $([]);
        },
        // get previous item
        // if `hidden` is TRUE then the hidden items will be considered too
        prev: function(item, hidden) {
            return item ? (hidden ? item.prev('.aciTreeLi') : item.prevAll('.aciTreeLi:not(.aciTreeHidden):first')) : $([]);
        },
        // get next item
        // if `hidden` is TRUE then the hidden items will be considered too
        next: function(item, hidden) {
            return item ? (hidden ? item.next('.aciTreeLi') : item.nextAll('.aciTreeLi:not(.aciTreeHidden):first')) : $([]);
        },
        // get item level - starting from 0
        // return -1 for invalid items
        level: function(item) {
            var level = -1;
            if (this.isItem(item)) {
                while (item.hasClass('aciTreeLi')) {
                    item = item.parent().parent();
                    level++;
                }
            }
            return level;
        },
        // get item ID
        getId: function(item) {
            var data = this.itemData(item);
            return data ? data.id : null;
        },
        // get item data
        itemData: function(item) {
            return item ? item.data('itemData' + this._instance.nameSpace) : null;
        },
        // set item ID
        // `options.id` is the new item ID
        // `options.oldId` will keep the old ID
        setId: function(item, options) {
            options = this._options(options, 'idset', 'idfail', 'wasid', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeid', options)) {
                    this._fail(item, options);
                    return;
                }
                var data = this.itemData(item);
                // keep the old one
                options.oldId = data.id;
                if (options.id == options.oldId) {
                    this._notify(item, options);
                } else {
                    // remember this one
                    data.id = options.id;
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // get item index - starting from #0
        getIndex: function(item) {
            return item ? item.parent().children('.aciTreeLi').index(item) : null;
        },
        // set item index - #0 based
        // `options.index` is the new index
        // `options.oldIndex` will keep the old index
        setIndex: function(item, options) {
            options = this._options(options, 'indexset', 'indexfail', 'wasindex', item);
            if (this.isItem(item)) {
                var oldIndex = this.getIndex(item);
                var siblings = this.siblings(item);
                if ((options.index != oldIndex) && !siblings.length) {
                    this._fail(item, options);
                    return;
                }
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeindex', options)) {
                    this._fail(item, options);
                    return;
                }
                // keep the old one
                options.oldIndex = oldIndex;
                if (options.index == oldIndex) {
                    this._notify(item, options);
                } else {
                    // set the new index
                    if (options.index < 1) {
                        siblings.first().before(item);
                    } else if (options.index >= siblings.length) {
                        siblings.last().after(item);
                    } else {
                        siblings.eq(options.index).before(item);
                    }
                    var parent = this.parent(item);
                    // update item states
                    this._setFirstLast(parent.length ? parent : null, item.add([siblings.get(0), siblings.get(-1)]));
                    this._setOddEven(parent);
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // get item label
        getLabel: function(item) {
            var data = this.itemData(item);
            return data ? data.label : null;
        },
        // test if is valid item
        isItem: function(item) {
            return item && item.hasClass('aciTreeLi');
        },
        // item animation
        // `state` if TRUE then show, FALSE then hide
        // `unanimated` if TRUE then don't use animations
        // `callback` function () to call at the end
        _animate: function(item, state, unanimated, callback) {
            if (!item) {
                item = this._instance.jQuery;
            }
            if (!unanimated) {
                // use the defined animation props
                var setting = state ? this._instance.options.show : this._instance.options.hide;
                if (setting) {
                    var ul = item.children('.aciTreeUl');
                    if (ul.length) {
                        // animate children container
                        ul.stop(true, true).animate(setting.props, {
                            duration: setting.duration,
                            easing: setting.easing,
                            complete: callback ? this.proxy(callback) : null
                        });
                    } else if (callback) {
                        callback.apply(this);
                    }
                    return;
                }
            }
            // use no animation
            item.children('.aciTreeUl').stop(true, true).toggle(state);
            if (callback) {
                callback.apply(this);
            }
        },
        // get first children of item
        // if `hidden` is TRUE then the hidden items will be considered too
        first: function(item, hidden) {
            if (!item) {
                item = this._instance.jQuery;
            }
            return item.children('.aciTreeUl').children('.aciTreeLi' + (hidden ? '' : ':not(.aciTreeHidden)') + ':first');
        },
        // test if item is the first one for his parent
        // if `hidden` is TRUE then the hidden items will be considered too
        isFirst: function(item, hidden) {
            if (item) {
                var parent = this.parent(item);
                return this.first(parent.length ? parent : null, hidden).is(item);
            }
            return false;
        },
        // get last children of item
        // if `hidden` is TRUE then the hidden items will be considered too
        last: function(item, hidden) {
            if (!item) {
                item = this._instance.jQuery;
            }
            return item.children('.aciTreeUl').children('.aciTreeLi' + (hidden ? '' : ':not(.aciTreeHidden)') + ':last');
        },
        // test if item is the last one for his parent
        // if `hidden` is TRUE then the hidden items will be considered too
        isLast: function(item, hidden) {
            if (item) {
                var parent = this.parent(item);
                return this.last(parent.length ? parent : null, hidden).is(item);
            }
            return false;
        },
        // test if item is busy/loading
        isBusy: function(item) {
            if (item) {
                return domApi.hasClass(item[0], 'aciTreeLoad');
            } else {
                return this._instance.queue.busy();
            }
        },
        // set loading state
        _loading: function(item, state) {
            if (item) {
                domApi.toggleClass(item[0], 'aciTreeLoad', state);
                if (state) {
                    item[0].setAttribute('aria-busy', true);
                } else {
                    item[0].removeAttribute('aria-busy');
                }
            } else if (state) {
                this._loader(state);
            }
        },
        // show loader image
        _loader: function(show) {
            if (show || this.isBusy()) {
                if (!this._private.loaderInterval) {
                    this._private.loaderInterval = window.setInterval(this.proxy(function() {
                        this._loader();
                    }), this._instance.options.loaderDelay);
                }
                this._instance.jQuery.addClass('aciTreeLoad');
                window.clearTimeout(this._private.loaderHide);
                this._private.loaderHide = window.setTimeout(this.proxy(function() {
                    this._instance.jQuery.removeClass('aciTreeLoad');
                }), this._instance.options.loaderDelay * 2);
            }
        },
        // test if parent has children
        isChildren: function(parent, children) {
            if (!parent) {
                parent = this._instance.jQuery;
            }
            return children && (parent.has(children).length > 0);
        },
        // test if parent has immediate children
        isImmediateChildren: function(parent, children) {
            if (!parent) {
                parent = this._instance.jQuery;
            }
            return children && parent.children('.aciTreeUl').children('.aciTreeLi').is(children);
        },
        // test if items share the same parent
        sameParent: function(item1, item2) {
            if (item1 && item2) {
                var parent1 = this.parent(item1);
                var parent2 = this.parent(item2);
                return (!parent1.length && !parent2.length) || (parent1.get(0) == parent2.get(0));
            }
            return false;
        },
        // test if items share the same top parent
        sameTopParent: function(item1, item2) {
            if (item1 && item2) {
                var parent1 = this.topParent(item1);
                var parent2 = this.topParent(item2);
                return (!parent1.length && !parent2.length) || (parent1.get(0) == parent2.get(0));
            }
            return false;
        },
        // return the updated item data
        // `callback` function (item) called for each item
        _serialize: function(item, callback) {
            var data = this.itemData(item);
            if (this.isInode(item)) {
                data.inode = true;
                if (this.wasLoad(item)) {
                    if (data.hasOwnProperty('open')) {
                        data.open = this.isOpen(item);
                    } else if (this.isOpen(item)) {
                        data.open = true;
                    }
                    data.branch = [];
                    this.children(item, false, true).each(this.proxy(function(element) {
                        var entry = this._serialize($(element), callback);
                        if (callback) {
                            entry = callback.call(this, $(element), {
                            }, entry);
                        } else {
                            entry = this._instance.options.serialize.call(this, $(element), {
                            }, entry);
                        }
                        if (entry) {
                            data.branch.push(entry);
                        }
                    }, true));
                    if (!data.branch.length) {
                        data.branch = null;
                    }
                } else {
                    if (data.hasOwnProperty('open')) {
                        data.open = false;
                    }
                    if (data.hasOwnProperty('branch')) {
                        data.branch = null;
                    }
                }
            } else {
                if (data.hasOwnProperty('inode')) {
                    data.inode = false;
                }
                if (data.hasOwnProperty('open')) {
                    data.open = null;
                }
                if (data.hasOwnProperty('branch')) {
                    data.branch = null;
                }
            }
            if (data.hasOwnProperty('disabled')) {
                data.disabled = this.isDisabled(item);
            } else if (this.isDisabled(item)) {
                data.disabled = true;
            }
            return data;
        },
        // return serialized data
        // `callback` function (item, what, value) - see `aciTree.options.serialize`
        serialize: function(item, what, callback) {
            // override this to provide serialized data
            if (typeof what == 'object') {
                if (item) {
                    var data = this._serialize(item, callback);
                    if (callback) {
                        data = callback.call(this, item, {
                        }, data);
                    } else {
                        data = this._instance.options.serialize.call(this, item, {
                        }, data);
                    }
                    return data;
                } else {
                    var list = [];
                    this.children(null, false, true).each(this.proxy(function(element) {
                        var data = this._serialize($(element), callback);
                        if (callback) {
                            data = callback.call(this, $(element), {
                            }, data);
                        } else {
                            data = this._instance.options.serialize.call(this, $(element), {
                            }, data);
                        }
                        if (data) {
                            list.push(data);
                        }
                    }, true));
                    return list;
                }
            }
            return '';
        },
        // destroy the control
        destroy: function(options) {
            options = this._options(options);
            // check if was init
            if (!this.wasInit()) {
                this._trigger(null, 'notinit', options);
                this._fail(null, options);
                return;
            }
            // check if is locked
            if (this.isLocked()) {
                this._trigger(null, 'locked', options);
                this._fail(null, options);
                return;
            }
            // a way to cancel the operation
            if (!this._trigger(null, 'beforedestroy', options)) {
                this._trigger(null, 'destroyfail', options);
                this._fail(null, options);
                return;
            }
            this._private.locked = true;
            this._instance.jQuery.addClass('aciTreeLoad').attr('aria-busy', true);
            this._instance.queue.destroy();
            this._destroyHook(false);
            // unload the entire treeview
            this.unload(null, this._inner(options, {
                success: this.proxy(function() {
                    window.clearTimeout(this._private.loaderHide);
                    window.clearInterval(this._private.loaderInterval);
                    this._private.itemClone = {
                    };
                    this._destroyHook(true);
                    this._instance.jQuery.unbind(this._instance.nameSpace).off(this._instance.nameSpace, '.aciTreeButton').off(this._instance.nameSpace, '.aciTreeLine');
                    this._instance.jQuery.removeClass('aciTree' + this._instance.index + ' aciTreeLoad').removeAttr('role aria-busy');
                    this._private.locked = false;
                    // call the parent
                    this._super();
                    this._trigger(null, 'destroyed', options);
                    this._success(null, options);
                }),
                fail: function() {
                    this._instance.jQuery.removeClass('aciTreeLoad');
                    this._private.locked = false;
                    this._trigger(null, 'destroyfail', options);
                    this._fail(null, options);
                }
            }));
        },
        _destroyHook: function(unloaded) {
            // override this to do extra destroy before/after unload
        }

    };

    // extend the base aciPluginUi class and store into aciPluginClass.plugins
    aciPluginClass.plugins.aciTree = aciPluginClass.aciPluginUi.extend(aciTree_core, 'aciTreeCore');

    // publish the plugin & the default options
    aciPluginClass.publish('aciTree', options);

    // for internal access
    var domApi = aciPluginClass.plugins.aciTree_dom;

})(jQuery, this);

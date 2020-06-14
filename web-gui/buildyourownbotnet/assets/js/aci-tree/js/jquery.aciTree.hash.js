
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
 * This extension adds hash/fragment support using aciFragment, it opens/select item(s) based on variables stored in the fragment part of the URL.
 * The states are loaded from the URL fragment and set on treeview init. Multiple item IDs separated with ";" are supported for
 * opening/selecting deep items (if loading nodes is required).
 * Require aciFragment https://github.com/dragosu/jquery-aciFragment and the utils extension for finding items by ID.
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        selectHash: null,        // hash key name to select a item (item path IDs as key value, multiple item IDs separated with a ";")
        openHash: null           // hash key name to open item(s) (item path IDs as key value, multiple item IDs separated with a ";")
    };

    // aciTree hash extension
    // select/open items based on IDs stored in the fragment of the current URL

    var aciTree_hash = {
        __extend: function() {
            $.extend(this._private, {
                lastSelect: null,
                lastOpen: null,
                // store `aciFragment` api
                hashApi: null
            });
            // call the parent
            this._super();
        },
        // init hash
        _hashInit: function() {
            // init `aciFragment`
            this._instance.jQuery.aciFragment();
            this._private.hashApi = this._instance.jQuery.aciFragment('api');
            this._instance.jQuery.bind('acitree' + this._private.nameSpace, function(event, api, item, eventName, options) {
                switch (eventName) {
                    case 'init':
                        api._hashRestore();
                        break;
                }
            }).bind('acifragment' + this._private.nameSpace, this.proxy(function(event, api, anchorChanged) {
                event.stopPropagation();
                this._hashRestore();
            }));
        },
        // override `_initHook`
        _initHook: function() {
            if (this.extHast()) {
                this._hashInit();
            }
            // call the parent
            this._super();
        },
        // restore item states from hash
        _hashRestore: function() {
            var queue = this._instance.queue;
            var process = function(opened) {
                // open all hash items
                for (var i in opened) {
                    (function(id) {
                        // add item to queue
                        queue.push(function(complete) {
                            this.search(null, {
                                success: function(item) {
                                    this.open(item, {
                                        uid: 'ui.hash',
                                        success: complete,
                                        fail: complete
                                    });
                                },
                                fail: complete,
                                search: id
                            });
                        });
                    })(opened[i]);
                }
            };
            if (this._instance.options.openHash) {
                var hash = this._private.hashApi.get(this._instance.options.openHash, '');
                if (hash.length && (hash != this._private.lastOpen)) {
                    this._private.lastOpen = hash;
                    var opened = hash.split(';');
                    process(opened);
                }
            }
            // support `selectable` extension
            if (this._instance.options.selectHash && this.extSelectable && this.extSelectable()) {
                var hash = this._private.hashApi.get(this._instance.options.selectHash, '');
                if (hash.length && (hash != this._private.lastSelect)) {
                    this._private.lastSelect = hash;
                    var opened = hash.split(';');
                    var selected = opened.pop();
                    process(opened);
                    if (selected) {
                        // select item
                        queue.push(function(complete) {
                            this.search(null, {
                                success: function(item) {
                                    this.select(item, {
                                        uid: 'ui.hash',
                                        success: function(item) {
                                            this.setVisible(item, {
                                                center: true
                                            });
                                            complete();
                                        },
                                        fail: complete
                                    });
                                },
                                fail: complete,
                                search: selected
                            });
                        });
                    }
                }
            }
        },
        // test if hash is enabled
        extHast: function() {
            return this._instance.options.selectHash || this._instance.options.openHash;
        },
        // override set option
        option: function(option, value) {
            var hash = this.extHast();
            // call the parent
            this._super(option, value);
            if (this.extHast() != hash) {
                if (hash) {
                    this._hashDone();
                } else {
                    this._hashInit();
                }
            }
        },
        // done hash
        _hashDone: function() {
            this._instance.jQuery.unbind(this._private.nameSpace);
            this._private.hashApi = null;
            this._instance.jQuery.aciFragment('destroy');
        },
        // override `_destroyHook`
        _destroyHook: function(unloaded) {
            if (unloaded) {
                this._hashDone();
            }
            // call the parent
            this._super(unloaded);
        }
    };

    // extend the base aciTree class and add the hash stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_hash, 'aciTreeHash');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

})(jQuery, this);

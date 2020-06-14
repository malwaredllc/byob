
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
 * This extension adds save/restore support for item states (open/selected) using local storage.
 * The states are saved on item select/open and restored on treeview init.
 * Require jStorage https://github.com/andris9/jStorage and the utils extension for finding items by ID.
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        persist: null           // the storage key name to keep the states (should be unique/treeview)
    };

    // aciTree persist extension
    // save/restore item state in/from local storage

    var aciTree_persist = {
        __extend: function() {
            $.extend(this._private, {
                // timeouts for the save operation
                selectTimeout: null,
                focusTimeout: null,
                openTimeout: null
            });
            // call the parent
            this._super();
        },
        // init persist
        _initPersist: function() {
            this._instance.jQuery.bind('acitree' + this._private.nameSpace, function(event, api, item, eventName, options) {
                if (options.uid == 'ui.persist') {
                    // skip processing itself
                    return;
                }
                switch (eventName) {
                    case 'init':
                        api._persistRestore();
                        break;
                    case 'selected':
                    case 'deselected':
                        // support `selectable` extension
                        api._persistLater('selected');
                        break;
                    case 'focus':
                    case 'blur':
                        // support `selectable` extension
                        api._persistLater('focused');
                        break;
                    case 'opened':
                    case 'closed':
                        api._persistLater('opened');
                        break;
                }
            });
        },
        // override `_initHook`
        _initHook: function() {
            if (this.extPersist()) {
                this._initPersist();
            }
            // call the parent
            this._super();
        },
        // persist states
        _persistLater: function(type) {
            switch (type) {
                case 'selected':
                    window.clearTimeout(this._private.selectTimeout);
                    this._private.selectTimeout = window.setTimeout(this.proxy(function() {
                        this._persistSelected();
                    }), 250);
                    break;
                case 'focused':
                    window.clearTimeout(this._private.focusTimeout);
                    this._private.focusTimeout = window.setTimeout(this.proxy(function() {
                        this._persistFocused();
                    }), 250);
                    break;
                case 'opened':
                    window.clearTimeout(this._private.openTimeout);
                    this._private.openTimeout = window.setTimeout(this.proxy(function() {
                        this._persistOpened();
                    }), 250);
                    break;
            }
        },
        // restore item states
        _persistRestoreX: function() {
            var queue = new this._queue(this, this._instance.options.queue);
            var opened = $.jStorage.get('aciTree_' + this._instance.options.persist + '_opened');
            if (opened instanceof Array) {
                // open all saved items
                for (var i in opened) {
                    (function(path) {
                        // add item to queue
                        queue.push(function(complete) {
                            this.searchPath(null, {
                                success: function(item) {
                                    this.open(item, {
                                        uid: 'ui.persist',
                                        success: complete,
                                        fail: complete
                                    });
                                },
                                fail: complete,
                                path: path.split(';'),
                                load: true
                            });
                        });
                    })(opened[i]);
                }
            }
            // support `selectable` extension
            if (this.extSelectable && this.extSelectable()) {
                var selected = $.jStorage.get('aciTree_' + this._instance.options.persist + '_selected');
                if (selected instanceof Array) {
                    // select all saved items
                    for (var i in selected) {
                        (function(path) {
                            queue.push(function(complete) {
                                this.searchPath(null, {
                                    success: function(item) {
                                        this.select(item, {
                                            uid: 'ui.persist',
                                            success: function() {
                                                complete();
                                            },
                                            fail: complete,
                                            focus: false
                                        });
                                    },
                                    fail: complete,
                                    path: path.split(';')
                                });
                            });
                        })(selected[i]);
                        if (!this._instance.options.multiSelectable) {
                            break;
                        }
                    }
                }
                var focused = $.jStorage.get('aciTree_' + this._instance.options.persist + '_focused');
                if (focused instanceof Array) {
                    // focus all saved items
                    for (var i in focused) {
                        (function(path) {
                            queue.push(function(complete) {
                                this.searchPath(null, {
                                    success: function(item) {
                                        this.focus(item, {
                                            uid: 'ui.persist',
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
                                    path: path.split(';')
                                });
                            });
                        })(focused[i]);
                    }
                }
            }
        },
        _persistRestore: function() {
            var queue = new this._queue(this, this._instance.options.queue);
            var task = new this._task(queue, function(complete) {
                // support `selectable` extension
                if (this.extSelectable && this.extSelectable()) {
                    var selected = $.jStorage.get('aciTree_' + this._instance.options.persist + '_selected');
                    if (selected instanceof Array) {
                        // select all saved items
                        for (var i in selected) {
                            (function(path) {
                                queue.push(function(complete) {
                                    this.searchPath(null, {
                                        success: function(item) {
                                            this.select(item, {
                                                uid: 'ui.persist',
                                                success: function() {
                                                    complete();
                                                },
                                                fail: complete,
                                                focus: false
                                            });
                                        },
                                        fail: complete,
                                        path: path.split(';')
                                    });
                                });
                            })(selected[i]);
                            if (!this._instance.options.multiSelectable) {
                                break;
                            }
                        }
                    }
                    var focused = $.jStorage.get('aciTree_' + this._instance.options.persist + '_focused');
                    if (focused instanceof Array) {
                        // focus all saved items
                        for (var i in focused) {
                            (function(path) {
                                queue.push(function(complete) {
                                    this.searchPath(null, {
                                        success: function(item) {
                                            this.focus(item, {
                                                uid: 'ui.persist',
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
                                        path: path.split(';')
                                    });
                                });
                            })(focused[i]);
                        }
                    }
                }
                complete();
            });
            var opened = $.jStorage.get('aciTree_' + this._instance.options.persist + '_opened');
            if (opened instanceof Array) {
                // open all saved items
                for (var i in opened) {
                    (function(path) {
                        // add item to queue
                        task.push(function(complete) {
                            this.searchPath(null, {
                                success: function(item) {
                                    this.open(item, {
                                        uid: 'ui.persist',
                                        success: complete,
                                        fail: complete
                                    });
                                },
                                fail: complete,
                                path: path.split(';'),
                                load: true
                            });
                        });
                    })(opened[i]);
                }
            }
        },
        // persist selected items
        _persistSelected: function() {
            // support `selectable` extension
            if (this.extSelectable && this.extSelectable()) {
                var selected = [];
                this.selected().each(this.proxy(function(element) {
                    var item = $(element);
                    var path = this.pathId(item);
                    path.push(this.getId(item));
                    selected.push(path.join(';'));
                }, true));
                $.jStorage.set('aciTree_' + this._instance.options.persist + '_selected', selected);
            }
        },
        // persist focused item
        _persistFocused: function() {
            // support `selectable` extension
            if (this.extSelectable && this.extSelectable()) {
                var focused = [];
                this.focused().each(this.proxy(function(element) {
                    var item = $(element);
                    var path = this.pathId(item);
                    path.push(this.getId(item));
                    focused.push(path.join(';'));
                }, true));
                $.jStorage.set('aciTree_' + this._instance.options.persist + '_focused', focused);
            }
        },
        // persist opened items
        _persistOpened: function() {
            var opened = [];
            this.inodes(this.children(null, true), true).each(this.proxy(function(element) {
                var item = $(element);
                if (this.isOpenPath(item)) {
                    var path = this.pathId(item);
                    path.push(this.getId(item));
                    opened.push(path.join(';'));
                }
            }, true));
            $.jStorage.set('aciTree_' + this._instance.options.persist + '_opened', opened);
        },
        // test if there is any saved data
        isPersist: function() {
            if (this.extPersist()) {
                var selected = $.jStorage.get('aciTree_' + this._instance.options.persist + '_selected');
                if (selected instanceof Array) {
                    return true;
                }
                var focused = $.jStorage.get('aciTree_' + this._instance.options.persist + '_focused');
                if (focused instanceof Array) {
                    return true;
                }
                var opened = $.jStorage.get('aciTree_' + this._instance.options.persist + '_opened');
                if (opened instanceof Array) {
                    return true;
                }
            }
            return false;
        },
        // remove any saved states
        unpersist: function() {
            if (this.extPersist()) {
                $.jStorage.deleteKey('aciTree_' + this._instance.options.persist + '_selected');
                $.jStorage.deleteKey('aciTree_' + this._instance.options.persist + '_focused');
                $.jStorage.deleteKey('aciTree_' + this._instance.options.persist + '_opened');
            }
        },
        // test if persist is enabled
        extPersist: function() {
            return this._instance.options.persist;
        },
        // override set `option`
        option: function(option, value) {
            var persist = this.extPersist();
            // call the parent
            this._super(option, value);
            if (this.extPersist() != persist) {
                if (persist) {
                    this._donePersist();
                } else {
                    this._initPersist();
                }
            }
        },
        // done persist
        _donePersist: function() {
            this._instance.jQuery.unbind(this._private.nameSpace);
        },
        // override `_destroyHook`
        _destroyHook: function(unloaded) {
            if (unloaded) {
                this._donePersist();
            }
            // call the parent
            this._super(unloaded);
        }
    };

    // extend the base aciTree class and add the persist stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_persist, 'aciTreePersist');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

})(jQuery, this);


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
 * A few utility functions for aciTree.
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        // called when items need to be filtered, for each tree item
        // return TRUE/FALSE to include/exclude items on filtering
        filterHook: function(item, search, regexp) {
            return search.length ? regexp.test(window.String(this.getLabel(item))) : true;
        }
    };

    // aciTree utils extension
    // adds item update option, branch processing, moving items & item swapping, item search by ID

    var aciTree_utils = {
        __extend: function() {
            // add extra data
            $.extend(this._instance, {
                filter: new this._queue(this, this._instance.options.queue)
            });
            // stop queue until needed
            this._instance.filter.destroy();
            // call the parent
            this._super();
        },
        // call the `callback` function (item) for each children of item
        // when `load` is TRUE will also try to load nodes
        branch: function(item, callback, load) {
            var queue = this._instance.queue;
            var process = this.proxy(function(item, callback, next) {
                var child = next ? this.next(item) : this.first(item);
                if (child.length) {
                    if (this.isInode(child)) {
                        if (this.wasLoad(child)) {
                            queue.push(function(complete) {
                                callback.call(this, child);
                                process(child, callback);
                                process(child, callback, true);
                                complete();
                            });
                        } else if (load) {
                            // load the item first
                            this.ajaxLoad(child, {
                                success: function() {
                                    callback.call(this, child);
                                    process(child, callback);
                                    process(child, callback, true);
                                },
                                fail: function() {
                                    process(child, callback, true);
                                }
                            });
                        } else {
                            queue.push(function(complete) {
                                callback.call(this, child);
                                process(child, callback, true);
                                complete();
                            });
                        }
                    } else {
                        queue.push(function(complete) {
                            callback.call(this, child);
                            process(child, callback, true);
                            complete();
                        });
                    }
                }
            });
            process(item, callback);
        },
        // swap two items (they can't be parent & children)
        // `options.item1` & `options.item2` are the swapped items
        swap: function(options) {
            options = this._options(options, null, 'swapfail', null, null);
            var item1 = options.item1;
            var item2 = options.item2;
            if (this.isItem(item1) && this.isItem(item2) && !this.isChildren(item1, item2) && !this.isChildren(item2, item1) && (item1.get(0) != item2.get(0))) {
                // a way to cancel the operation
                if (!this._trigger(null, 'beforeswap', options)) {
                    this._fail(null, options);
                    return;
                }
                var prev = this.prev(item1);
                if (prev.length) {
                    if (item2.get(0) == prev.get(0)) {
                        item2.before(item1);
                    } else {
                        item1.insertAfter(item2);
                        item2.insertAfter(prev);
                    }
                } else {
                    var next = this.next(item1);
                    if (next.length) {
                        if (item2.get(0) == next.get(0)) {
                            item2.after(item1);
                        } else {
                            item1.insertAfter(item2);
                            item2.insertBefore(next);
                        }
                    } else {
                        var parent = item1.parent();
                        item1.insertAfter(item2);
                        parent.append(item2);
                    }
                }
                // update item states
                this._updateLevel(item1);
                var parent = this.parent(item1);
                this._setFirstLast(parent.length ? parent : null, item1);
                this._updateHidden(item1);
                this._updateLevel(item2);
                parent = this.parent(item2);
                this._setFirstLast(parent.length ? parent : null, item2);
                this._updateHidden(item2);
                this._setOddEven(item1.add(item2));
                this._trigger(null, 'swapped', options);
                this._success(null, options);
            } else {
                this._fail(null, options);
            }
        },
        // update item level
        _updateItemLevel: function(item, fromLevel, toLevel) {
            item.removeClass('aciTreeLevel' + fromLevel).addClass('aciTreeLevel' + toLevel);
            var entry = item.children('.aciTreeLine').find('.aciTreeEntry');
            if (fromLevel < toLevel) {
                for (var i = fromLevel; i < toLevel; i++) {
                    entry.wrap('<div class="aciTreeBranch aciTreeLevel' + i + '"></div>');
                }
            } else if (fromLevel > toLevel) {
                for (var i = toLevel; i < fromLevel; i++) {
                    entry.unwrap();
                }
            }
        },
        // update child level
        _updateChildLevel: function(item, fromLevel, toLevel) {
            this.children(item).each(this.proxy(function(element) {
                var item = $(element);
                this._updateItemLevel(item, fromLevel, toLevel);
                if (this.isInode(item)) {
                    this.children(item).each(this.proxy(function(element) {
                        this._updateChildLevel($(element), fromLevel + 1, toLevel + 1);
                    }, true));
                }
            }, true));
        },
        // update item level
        _updateLevel: function(item) {
            var level = this.level(item);
            var found = window.parseInt(item.attr('class').match(/aciTreeLevel[0-9]+/)[0].match(/[0-9]+/));
            if (level != found) {
                this._updateItemLevel(item, found, level);
                this._updateChildLevel(item, found + 1, level + 1);
            }
        },
        // move item up
        moveUp: function(item, options) {
            options = this._options(options);
            options.index = window.Math.max(this.getIndex(item) - 1, 0);
            this.setIndex(item, options);
        },
        // move item down
        moveDown: function(item, options) {
            options = this._options(options);
            options.index = window.Math.min(this.getIndex(item) + 1, this.siblings(item).length);
            this.setIndex(item, options);
        },
        // move item in first position
        moveFirst: function(item, options) {
            options = this._options(options);
            options.index = 0;
            this.setIndex(item, options);
        },
        // move item in last position
        moveLast: function(item, options) {
            options = this._options(options);
            options.index = this.siblings(item).length;
            this.setIndex(item, options);
        },
        // move item before another (they can't be parent & children)
        // `options.before` is the element before which the item will be moved
        moveBefore: function(item, options) {
            options = this._options(options, null, 'movefail', 'wasbefore', item);
            var before = options.before;
            if (this.isItem(item) && this.isItem(before) && !this.isChildren(item, before) && (item.get(0) != before.get(0))) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforemove', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.prev(before, true).get(0) == item.get(0)) {
                    this._notify(item, options);
                } else {
                    var parent = this.parent(item);
                    var prev = this.prev(item, true);
                    if (!prev.length) {
                        prev = parent.length ? parent : this.first();
                    }
                    item.insertBefore(before);
                    if (parent.length && !this.hasChildren(parent, true)) {
                        this.setLeaf(parent);
                    }
                    this._updateLevel(item);
                    // update item states
                    this._setFirstLast(parent.length ? parent : null);
                    parent = this.parent(item);
                    this._setFirstLast(parent.length ? parent : null, item.add(before));
                    this._updateHidden(item);
                    this._setOddEven(item.add(before).add(prev));
                    this._trigger(item, 'moved', options);
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // move item after another (they can't be parent & children)
        // `options.after` is the element after which the item will be moved
        moveAfter: function(item, options) {
            options = this._options(options, null, 'movefail', 'wasafter', item);
            var after = options.after;
            if (this.isItem(item) && this.isItem(after) && !this.isChildren(item, after) && (item.get(0) != after.get(0))) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforemove', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.next(after, true).get(0) == item.get(0)) {
                    this._notify(item, options);
                } else {
                    var parent = this.parent(item);
                    var prev = this.prev(item, true);
                    if (!prev.length) {
                        prev = parent.length ? parent : this.first();
                    }
                    item.insertAfter(after);
                    if (parent.length && !this.hasChildren(parent, true)) {
                        this.setLeaf(parent);
                    }
                    this._updateLevel(item);
                    this._setFirstLast(parent.length ? parent : null);
                    parent = this.parent(item);
                    this._setFirstLast(parent.length ? parent : null, item.add(after));
                    this._updateHidden(item);
                    this._setOddEven(item.add(after).add(prev));
                    this._trigger(item, 'moved', options);
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // move item to be a child of another (they can't be parent & children and the targeted parent item must be empty)
        // `options.parent` is the parent element on which the item will be added
        asChild: function(item, options) {
            options = this._options(options, null, 'childfail', null, item);
            var parent = options.parent;
            if (this.isItem(item) && this.isItem(parent) && !this.isChildren(item, parent) && !this.hasChildren(parent, true) && (item.get(0) != parent.get(0))) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforechild', options)) {
                    this._fail(item, options);
                    return;
                }
                var process = function() {
                    var oldParent = this.parent(item);
                    var prev = this.prev(item);
                    if (!prev.length) {
                        prev = oldParent.length ? oldParent : this.first();
                    }
                    var container = this._createContainer(parent);
                    container.append(item);
                    if (oldParent.length && !this.hasChildren(oldParent, true)) {
                        // no more children
                        this.setLeaf(oldParent);
                    }
                    // update item states
                    this._updateLevel(item);
                    this._setFirstLast(oldParent.length ? oldParent : null);
                    this._setFirstLast(parent.length ? parent : null, item);
                    this._updateHidden(item);
                    this._setOddEven(item.add(prev));
                    this._trigger(item, 'childset', options);
                    this._success(item, options);
                };
                if (this.isInode(parent)) {
                    process.apply(this);
                } else {
                    // set as inode first
                    this.setInode(parent, this._inner(options, {
                        success: process,
                        fail: options.fail
                    }));
                }
            } else {
                this._fail(item, options);
            }
        },
        // search a `path` ID from a parent
        _search: function(parent, pathId) {
            var items = this.children(parent);
            var item, id, length, found, exact = false;
            for (var i = 0, size = items.length; i < size; i++) {
                item = items.eq(i);
                id = window.String(this.getId(item));
                length = id.length;
                if (length) {
                    if (id == pathId.substr(0, length)) {
                        found = item;
                        exact = pathId.length == length;
                        break;
                    }
                }
            }
            if (found) {
                if (!exact) {
                    // try to search children
                    var child = this._search(found, pathId);
                    if (child) {
                        return child;
                    }
                }
                return {
                    item: found,
                    exact: exact
                };
            } else {
                return null;
            }
        },
        // search items by ID
        // `options.id` is the ID to search for
        // if `path` is TRUE then the search will be more optimized
        // and reduced to the first branch that matches the ID
        // but the ID must be set like a path otherwise will not work
        // if `load` is TRUE will also try to load nodes (works only when `path` is TRUE)
        searchId: function(path, load, options) {
            options = this._options(options);
            var id = options.id;
            if (path) {
                if (load) {
                    var process = this.proxy(function(item) {
                        var found = this._search(item, id);
                        if (found) {
                            if (found.exact) {
                                this._success(found.item, options);
                            } else {
                                if (this.wasLoad(found.item)) {
                                    this._fail(item, options);
                                } else {
                                    // load the item
                                    this.ajaxLoad(found.item, this._inner(options, {
                                        success: function() {
                                            process(found.item);
                                        },
                                        fail: options.fail
                                    }));
                                }
                            }
                        } else {
                            this._fail(item, options);
                        }
                    });
                    process();
                } else {
                    var found = this._search(null, id);
                    if (found && found.exact) {
                        this._success(found.item, options);
                    } else {
                        this._fail(null, options);
                    }
                }
            } else {
                var found = $();
                this._instance.jQuery.find('.aciTreeLi').each(this.proxy(function(element) {
                    if (id == this.getId($(element))) {
                        found = $(element);
                        return false;
                    }
                }, true));
                if (found.length) {
                    this._success(found, options);
                } else {
                    this._fail(null, options);
                }
            }
        },
        // search nodes by ID or custom property starting from item
        // `options.search` is the value to be searched
        // `options.load` if TRUE will try to load nodes
        // `options.callback` function (item, search) return TRUE for the custom match
        // `options.results` will keep the search results
        search: function(item, options) {
            var results = [];
            options = this._options(options);
            var task = new this._task(new this._queue(this, this._instance.options.queue), function(complete) {
                // run this at the end
                if (results.length) {
                    options.results = $(results);
                    this._success($(results[0]), options);
                } else {
                    this._fail(item, options);
                }
                complete();
            });
            var children = this.proxy(function(item) {
                this.children(item, false, true).each(this.proxy(function(element) {
                    if (options.callback) {
                        // custom search
                        var match = options.callback.call(this, $(element), options.search);
                        if (match) {
                            results.push(element);
                        } else if (match === null) {
                            // skip childrens
                            return;
                        }
                    } else if (this.getId($(element)) == options.search) {
                        // default ID match
                        results.push(element);
                    }
                    if (this.isInode($(element))) {
                        // process children
                        task.push(function(complete) {
                            search($(element));
                            complete();
                        });
                    }
                }, true));
            });
            var search = this.proxy(function(item) {
                if (this.wasLoad(item)) {
                    // process children
                    task.push(function(complete) {
                        children(item);
                        complete();
                    });
                } else if (options.load) {
                    task.push(function(complete) {
                        // load the item first
                        this.ajaxLoad(item, {
                            success: function() {
                                children(item);
                                complete();
                            },
                            fail: complete
                        });
                    });
                }
            });
            // run the search
            task.push(function(complete) {
                search(item);
                complete();
            });
        },
        // search node by a list of IDs starting from item
        // `options.path` is a list of IDs to be searched - the path to the node
        // `options.load` if TRUE will try to load nodes
        searchPath: function(item, options) {
            options = this._options(options);
            var path = options.path;
            var search = this.proxy(function(item, id) {
                this.search(item, {
                    success: function(item) {
                        if (path.length) {
                            search(item, path.shift());
                        } else {
                            this._success(item, options);
                        }
                    },
                    fail: function() {
                        this._fail(item, options);
                    },
                    search: id,
                    load: options.load,
                    callback: function(item, search) {
                        // prevent drill-down
                        return (this.getId(item) == search) ? true : null;
                    }
                });
            });
            search(item, path.shift());
        },
        // get item path IDs starting from the top parent (ROOT)
        // when `reverse` is TRUE returns the IDs in reverse order
        pathId: function(item, reverse) {
            var path = this.path(item, reverse), id = [];
            path.each(this.proxy(function(element) {
                id.push(this.getId($(element)));
            }, true));
            return id;
        },
        // escape string and return RegExp
        _regexp: function(search) {
            return new window.RegExp(window.String(search).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08'), 'i');
        },
        // filter the tree items based on search criteria
        // `options.search` is the keyword
        // `options.first` will be the first matched item (if any)
        filter: function(item, options) {
            options = this._options(options, null, 'filterfail', null, item);
            if (!item || this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforefilter', options)) {
                    this._fail(item, options);
                    return;
                }
                var search = window.String(options.search);
                var regexp = this._regexp(search);
                var first = null;
                this._instance.filter.init();
                var task = new this._task(this._instance.filter, function(complete) {
                    // run this at the end
                    this._instance.filter.destroy();
                    options.first = first;
                    this._setOddEven();
                    this._trigger(item, 'filtered', options);
                    this._success(item, options);
                    complete();
                });
                // process children
                var process = this.proxy(function(parent) {
                    var children = this.children(parent, false, true);
                    var found = false;
                    children.each(this.proxy(function(element) {
                        var item = $(element);
                        if (this._instance.options.filterHook.call(this, item, search, regexp)) {
                            if (!first) {
                                first = item;
                            }
                            found = true;
                            item.removeClass('aciTreeHidden');
                        } else {
                            item.removeClass('aciTreeVisible').addClass('aciTreeHidden');
                        }
                        if (this.isInode(item)) {
                            // continue with the children
                            task.push(function(complete) {
                                process(item);
                                complete();
                            });
                        }
                    }, true));
                    if (found) {
                        // update item states
                        if (parent && this.isHidden(parent)) {
                            this._showHidden(parent);
                        }
                        if (!parent || (this.isOpenPath(parent) && this.isOpen(parent))) {
                            children.not('.aciTreeHidden').addClass('aciTreeVisible');
                        }
                        this._setFirstLast(parent, this._getFirstLast(parent));
                    }
                });
                task.push(function(complete) {
                    process(item);
                    complete();
                });
            } else {
                this._fail(item, options);
            }
        },
        // call the `callback` function (item) for the first item
        _firstAll: function(callback) {
            callback.call(this, this.first());
        },
        // call the `callback` function (item) for the last item
        // when `load` is TRUE will also try to load nodes
        _lastAll: function(item, callback, load) {
            if (item) {
                if (this.isInode(item)) {
                    if (this.wasLoad(item)) {
                        this._lastAll(this.last(item), callback, load);
                        return;
                    } else if (load) {
                        this.ajaxLoad(item, {
                            success: function() {
                                this._lastAll(this.last(item), callback, load);
                            },
                            fail: function() {
                                callback.call(this, item);
                            }
                        });
                        return;
                    }
                }
                callback.call(this, item);
            } else {
                callback.call(this, this.last());
            }
        },
        // call the `callback` function (item) for the next item from tree
        // when `load` is TRUE will also try to load nodes
        _nextAll: function(item, callback, load) {
            if (item) {
                if (this.isInode(item)) {
                    if (this.wasLoad(item)) {
                        callback.call(this, this.first(item));
                        return;
                    } else if (load) {
                        this.ajaxLoad(item, {
                            success: function() {
                                callback.call(this, this.first(item));
                            },
                            fail: function() {
                                this._nextAll(item, callback, load);
                            }
                        });
                        return;
                    }
                }
                var next = this.next(item);
                if (next.length) {
                    callback.call(this, next);
                } else {
                    // search next by parents
                    var search = this.proxy(function(item) {
                        var parent = this.parent(item);
                        if (parent.length) {
                            var next = this.next(parent);
                            if (next.length) {
                                return next;
                            } else {
                                return search(parent);
                            }
                        }
                        return null;
                    });
                    callback.call(this, search(item));
                }
            } else {
                callback.call(this, this.first());
            }
        },
        // call the `callback` function (item) for the previous item from tree
        // when `load` is TRUE will also try to load nodes
        _prevAll: function(item, callback, load) {
            if (item) {
                var prev = this.prev(item);
                if (prev.length) {
                    if (this.isInode(prev)) {
                        this._lastAll(prev, callback, load);
                    } else {
                        callback.call(this, prev);
                    }
                } else {
                    var parent = this.parent(item);
                    callback.call(this, parent.length ? parent : null);
                }
            } else {
                callback.call(this, this.last());
            }
        },
        // call the `callback` function (item) with the previous found item based on search criteria
        // `search` is the keyword
        prevMatch: function(item, search, callback) {
            var regexp = this._regexp(search);
            this._instance.filter.init();
            var task = new this._task(this._instance.filter, function(complete) {
                this._instance.filter.destroy();
                complete();
            });
            var process = function(item) {
                task.push(function(complete) {
                    this._prevAll(item, function(item) {
                        if (item) {
                            if (this._instance.options.filterHook.call(this, item, search, regexp)) {
                                callback.call(this, item);
                            } else {
                                process(item);
                            }
                        } else {
                            callback.call(this, null);
                        }
                        complete();
                    });
                });
            };
            process(this.isItem(item) ? item : null);
        },
        // call the `callback` function (item) with the next found item based on search criteria
        // `search` is the keyword
        nextMatch: function(item, search, callback) {
            var regexp = this._regexp(search);
            this._instance.filter.init();
            var task = new this._task(this._instance.filter, function(complete) {
                this._instance.filter.destroy();
                complete();
            });
            var process = function(item) {
                task.push(function(complete) {
                    this._nextAll(item, function(item) {
                        if (item) {
                            if (this._instance.options.filterHook.call(this, item, search, regexp)) {
                                callback.call(this, item);
                            } else {
                                process(item);
                            }
                        } else {
                            callback.call(this, null);
                        }
                        complete();
                    });
                });
            };
            process(this.isItem(item) ? item : null);
        }

    };

    // extend the base aciTree class and add the utils stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_utils, 'aciTreeUtils');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

})(jQuery, this);

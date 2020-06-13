
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
 * The aciTree low-level DOM functions.
 *
 * A collection of functions optimised for aciTree DOM structure.
 *
 * Need to be included before the aciTree core and after aciPlugin.
 */

aciPluginClass.plugins.aciTree_dom = {
    // get the UL container from a LI
    // `node` must be valid LI DOM node
    // can return NULL
    container: function(node) {
        var container = node.lastChild;
        if (container && (container.nodeName == 'UL')) {
            return container;
        }
        return null;
    },
    // get the first children from a LI (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node
    // can return NULL
    firstChild: function(node, callback) {
        var container = this.container(node);
        if (container) {
            var firstChild = container.firstChild;
            if (callback) {
                while (firstChild && !callback.call(this, firstChild)) {
                    firstChild = firstChild.nextSibling;
                }
            }
            return firstChild;
        }
        return null;
    },
    // get the last children from a LI (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node
    // can return NULL
    lastChild: function(node, callback) {
        var container = this.container(node);
        if (container) {
            var lastChild = container.lastChild;
            if (callback) {
                while (lastChild && !callback.call(this, lastChild)) {
                    lastChild = lastChild.previousSibling;
                }
            }
            return lastChild;
        }
        return null;
    },
    // get the previous LI sibling (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node
    // can return NULL
    prev: function(node, callback) {
        var previous = node.previousSibling;
        if (callback) {
            while (previous && !callback.call(this, previous)) {
                previous = previous.previousSibling;
            }
        }
        return previous;
    },
    // get the next LI sibling (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node
    // can return NULL
    next: function(node, callback) {
        var next = node.nextSibling;
        if (callback) {
            while (next && !callback.call(this, next)) {
                next = next.nextSibling;
            }
        }
        return next;
    },
    // get the previous LI in tree order (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node or NULL to prevent drill down/skip the node
    // can return NULL
    prevAll: function(node, callback) {
        var previous, lastChild, drillDown, match, prev, parent;
        while (true) {
            previous = this.prev(node);
            if (previous) {
                if (callback) {
                    match = callback.call(this, previous);
                    if (match === null) {
                        node = previous;
                        continue;
                    }
                }
                lastChild = this.lastChild(previous);
                if (lastChild) {
                    if (callback && (callback.call(this, lastChild) === null)) {
                        node = lastChild;
                        continue;
                    }
                    prev = false;
                    while (drillDown = this.lastChild(lastChild)) {
                        lastChild = drillDown;
                        if (callback) {
                            match = callback.call(this, lastChild);
                            if (match === null) {
                                node = lastChild;
                                prev = true;
                                break;
                            }
                        }
                    }
                    if (prev) {
                        continue;
                    }
                    if (callback) {
                        match = callback.call(this, lastChild);
                        if (match) {
                            return lastChild;
                        } else if (match !== null) {
                            node = lastChild;
                            continue;
                        }
                    } else {
                        return lastChild;
                    }
                } else {
                    if (!callback || match) {
                        return previous;
                    } else {
                        node = previous;
                        continue;
                    }
                }
            }
            parent = this.parent(node);
            if (parent) {
                if (callback) {
                    match = callback.call(this, parent);
                    if (match) {
                        return parent;
                    } else {
                        node = parent;
                    }
                } else {
                    return parent;
                }
            } else {
                return null;
            }
        }
        return null;
    },
    // get the next LI in tree order (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node or NULL to prevent drill down/skip the node
    // can return NULL
    nextAll: function(node, callback) {
        var firstChild, match, next, parent, child;
        while (true) {
            firstChild = this.firstChild(node);
            if (firstChild) {
                if (callback) {
                    match = callback.call(this, firstChild);
                    if (match) {
                        return firstChild;
                    } else {
                        node = firstChild;
                        if (match !== null) {
                            continue;
                        }
                    }
                } else {
                    return firstChild;
                }
            }
            while (true) {
                next = this.next(node);
                if (next) {
                    if (callback) {
                        match = callback.call(this, next);
                        if (match) {
                            return next;
                        } else {
                            node = next;
                            if (match !== null) {
                                break;
                            } else {
                                continue;
                            }
                        }
                    } else {
                        return next;
                    }
                } else {
                    parent = node;
                    child = null;
                    while (parent = this.parent(parent)) {
                        next = this.next(parent);
                        if (next) {
                            if (callback) {
                                match = callback.call(this, next);
                                if (match) {
                                    return next;
                                } else {
                                    node = next;
                                    if (match !== null) {
                                        child = true;
                                    } else {
                                        child = false;
                                    }
                                    break;
                                }
                            } else {
                                return next;
                            }
                        }
                    }
                    if (child !== null) {
                        if (child) {
                            break;
                        } else {
                            continue;
                        }
                    }
                    return null;
                }
            }
        }
        return null;
    },
    // get the first LI in tree order (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node or NULL to prevent drill down/skip the node
    // can return NULL
    first: function(node, callback) {
        var container = this.container(node);
        if (container) {
            var firstChild = container.firstChild;
            if (firstChild) {
                if (callback && !callback.call(this, firstChild)) {
                    return this.nextAll(firstChild, callback);
                }
                return firstChild;
            }
        }
        return null;
    },
    // get the last LI in tree order (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node or NULL to prevent drill down/skip the node
    // can return NULL
    last: function(node, callback) {
        var container = this.container(node);
        if (container) {
            var lastChild = container.lastChild;
            if (lastChild) {
                if (callback && (callback.call(this, lastChild) === null)) {
                    return this.prevAll(lastChild, callback);
                } else {
                    var drillDown;
                    while (drillDown = this.lastChild(lastChild)) {
                        lastChild = drillDown;
                    }
                    if (callback && !callback.call(this, lastChild)) {
                        return this.prevAll(lastChild, callback);
                    }
                    return lastChild;
                }
            }
        }
        return null;
    },
    // get the children LI from the node
    // `node` must be valid LI DOM node
    // `drillDown` if TRUE all children are returned
    // `callback` can return FALSE to skip a node or NULL to prevent drill down/skip the node
    children: function(node, drillDown, callback) {
        var children = [], levels = [], match, next, skip;
        var firstChild = this.firstChild(node);
        if (firstChild) {
            while (true) {
                skip = false;
                do {
                    if (callback) {
                        match = callback.call(this, firstChild);
                        if (match) {
                            children.push(firstChild);
                        }
                        if (drillDown && (match !== null)) {
                            next = this.firstChild(firstChild);
                            if (next) {
                                levels.push(firstChild);
                                firstChild = next;
                                skip = true;
                                break;
                            }
                        }
                    } else {
                        children.push(firstChild);
                        if (drillDown) {
                            next = this.firstChild(firstChild);
                            if (next) {
                                levels.push(firstChild);
                                firstChild = next;
                                skip = true;
                                break;
                            }
                        }
                    }
                } while (firstChild = firstChild.nextSibling);
                if (!skip) {
                    while (firstChild = levels.pop()) {
                        firstChild = firstChild.nextSibling;
                        if (firstChild) {
                            break;
                        }
                    }
                    if (!firstChild) {
                        break;
                    }
                }
            }
        }
        return children;
    },
    // get a children from the node
    // `node` must be valid DOM node
    // `callback` can return FALSE to skip a node or NULL to stop the search
    // can return NULL
    childrenTill: function(node, callback) {
        var levels = [], match, next, skip;
        var firstChild = node.firstChild;
        if (firstChild) {
            while (true) {
                skip = false;
                do {
                    match = callback.call(this, firstChild);
                    if (match) {
                        return firstChild;
                    } else if (match === null) {
                        return null;
                    }
                    next = firstChild.firstChild;
                    if (next) {
                        levels.push(firstChild);
                        firstChild = next;
                        skip = true;
                        break;
                    }
                } while (firstChild = firstChild.nextSibling);
                if (!skip) {
                    while (firstChild = levels.pop()) {
                        firstChild = firstChild.nextSibling;
                        if (firstChild) {
                            break;
                        }
                    }
                    if (!firstChild) {
                        break;
                    }
                }
            }
        }
        return null;
    },
    // get a children from the node having a class
    // `node` must be valid DOM node
    // `className` String or Array to check for
    // can return NULL
    childrenByClass: function(node, className) {
        if (node.getElementsByClassName) {
            var list = node.getElementsByClassName(className instanceof Array ? className.join(' ') : className);
            return list ? list[0] : null;
        } else {
            return this.childrenTill(node, function(node) {
                return this.hasClass(node, className);
            });
        }
    },
    // get the parent LI from the children LI
    // `node` must be valid LI DOM node
    // can return NULL
    parent: function(node) {
        var parent = node.parentNode.parentNode;
        if (parent && (parent.nodeName == 'LI')) {
            return parent;
        }
        return null;
    },
    // get the parent LI from any children
    // `node` must be valid children of a LI DOM node
    // can return NULL
    parentFrom: function(node) {
        while (node.nodeName != 'LI') {
            node = node.parentNode;
            if (!node) {
                return null;
            }
        }
        return node;
    },
    // get a parent from the node
    // `node` must be valid DOM node
    // `callback` can return FALSE to skip a node or NULL to stop the search
    // can return NULL
    parentTill: function(node, callback) {
        var match;
        while (node = node.parentNode) {
            match = callback.call(this, node);
            if (match) {
                return node;
            } else if (match === null) {
                return null;
            }
        }
        return null;
    },
    // get a parent from the node having a class
    // `node` must be valid DOM node
    // `className` String or Array to check for
    // can return NULL
    parentByClass: function(node, className) {
        return this.parentTill(node, function(node) {
            return this.hasClass(node, className);
        });
    },
    // test if node has class(es)
    // `className` String or Array to check for
    // `withOut` String or Array to exclude with
    hasClass: function(node, className, withOut) {
        var oldClass = ' ' + node.className + ' ';
        if (withOut instanceof Array) {
            for (var i = 0; i < withOut.length; i++) {
                if (oldClass.indexOf(' ' + withOut[i] + ' ') != -1) {
                    return false;
                }
            }
        } else {
            if (withOut && oldClass.indexOf(' ' + withOut + ' ') != -1) {
                return false;
            }
        }
        if (className instanceof Array) {
            for (var i = 0; i < className.length; i++) {
                if (oldClass.indexOf(' ' + className[i] + ' ') == -1) {
                    return false;
                }
            }
        } else {
            if (oldClass.indexOf(' ' + className + ' ') == -1) {
                return false;
            }
        }
        return true;
    },
    // filter nodes with class(es)
    // `nodes` Array of DOM nodes
    // @see `hasClass`
    withClass: function(nodes, className, withOut) {
        var filter = [];
        for (var i = 0; i < nodes.length; i++) {
            if (this.hasClass(nodes[i], className, withOut)) {
                filter.push(nodes[i]);
            }
        }
        return filter;
    },
    // test if node has any class(es)
    // `className` String or Array to check for (any class)
    // `withOut` String or Array to exclude with
    hasAnyClass: function(node, className, withOut) {
        var oldClass = ' ' + node.className + ' ';
        if (withOut instanceof Array) {
            for (var i = 0; i < withOut.length; i++) {
                if (oldClass.indexOf(' ' + withOut[i] + ' ') != -1) {
                    return false;
                }
            }
        } else {
            if (withOut && oldClass.indexOf(' ' + withOut + ' ') != -1) {
                return false;
            }
        }
        if (className instanceof Array) {
            for (var i = 0; i < className.length; i++) {
                if (oldClass.indexOf(' ' + className[i] + ' ') != -1) {
                    return true;
                }
            }
        } else {
            if (oldClass.indexOf(' ' + className + ' ') != -1) {
                return true;
            }
        }
        return false;
    },
    // filter nodes with any class(es)
    // `nodes` Array of DOM nodes
    // @see `hasAnyClass`
    withAnyClass: function(nodes, className, withOut) {
        var filter = [];
        for (var i = 0; i < nodes.length; i++) {
            if (this.hasAnyClass(nodes[i], className, withOut)) {
                filter.push(nodes[i]);
            }
        }
        return filter;
    },
    // add class(es) to node
    // `node` must be valid DOM node
    // `className` String or Array to add
    // return TRUE if className changed
    addClass: function(node, className) {
        var oldClass = ' ' + node.className + ' ', append = '';
        if (className instanceof Array) {
            for (var i = 0; i < className.length; i++) {
                if (oldClass.indexOf(' ' + className[i] + ' ') == -1) {
                    append += ' ' + className[i];
                }
            }
        } else {
            if (oldClass.indexOf(' ' + className + ' ') == -1) {
                append += ' ' + className;
            }
        }
        if (append) {
            node.className = node.className + append;
            return true;
        }
        return false;
    },
    // add class(es) to nodes
    // `nodes` Array of DOM nodes
    // @see `addClass`
    addListClass: function(nodes, className, callback) {
        for (var i = 0; i < nodes.length; i++) {
            this.addClass(nodes[i], className);
            if (callback) {
                callback.call(this, nodes[i]);
            }
        }
    },
    // remove class(es) from node
    // `node` must be valid DOM node
    // `className` String or Array to remove
    // return TRUE if className changed
    removeClass: function(node, className) {
        var oldClass = ' ' + node.className + ' ';
        if (className instanceof Array) {
            for (var i = 0; i < className.length; i++) {
                oldClass = oldClass.replace(' ' + className[i] + ' ', ' ');
            }
        } else {
            oldClass = oldClass.replace(' ' + className + ' ', ' ');
        }
        oldClass = oldClass.substr(1, oldClass.length - 2);
        if (node.className != oldClass) {
            node.className = oldClass;
            return true;
        }
        return false;
    },
    // remove class(es) from nodes
    // `nodes` Array of DOM nodes
    // @see `removeClass`
    removeListClass: function(nodes, className, callback) {
        for (var i = 0; i < nodes.length; i++) {
            this.removeClass(nodes[i], className);
            if (callback) {
                callback.call(this, nodes[i]);
            }
        }
    },
    // toggle node class(es)
    // `node` must be valid DOM node
    // `className` String or Array to toggle
    // `add` TRUE to add them
    // return TRUE if className changed
    toggleClass: function(node, className, add) {
        if (add) {
            return this.addClass(node, className);
        } else {
            return this.removeClass(node, className);
        }
    },
    // toggle nodes class(es)
    // `nodes` Array of DOM nodes
    // @see `toggleClass`
    toggleListClass: function(nodes, className, add, callback) {
        for (var i = 0; i < nodes.length; i++) {
            this.toggleClass(nodes[i], className, add);
            if (callback) {
                callback.call(this, nodes[i]);
            }
        }
    },
    // add/remove and keep old class(es)
    // `node` must be valid DOM node
    // `addClass` String or Array to add
    // `removeClass` String or Array to remove
    // return TRUE if className changed
    addRemoveClass: function(node, addClass, removeClass) {
        var oldClass = ' ' + node.className + ' ';
        if (removeClass) {
            if (removeClass instanceof Array) {
                for (var i = 0; i < removeClass.length; i++) {
                    oldClass = oldClass.replace(' ' + removeClass[i] + ' ', ' ');
                }
            } else {
                oldClass = oldClass.replace(' ' + removeClass + ' ', ' ');
            }
        }
        if (addClass) {
            var append = '';
            if (addClass instanceof Array) {
                for (var i = 0; i < addClass.length; i++) {
                    if (oldClass.indexOf(' ' + addClass[i] + ' ') == -1) {
                        append += addClass[i] + ' ';
                    }
                }
            } else {
                if (oldClass.indexOf(' ' + addClass + ' ') == -1) {
                    append += addClass + ' ';
                }
            }
            oldClass += append;
        }
        oldClass = oldClass.substr(1, oldClass.length - 2);
        if (node.className != oldClass) {
            node.className = oldClass;
            return true;
        }
        return false;
    },
    // add/remove and keep old class(es)
    // `nodes` Array of DOM nodes
    // @see `addRemoveClass`
    addRemoveListClass: function(nodes, addClass, removeClass, callback) {
        for (var i = 0; i < nodes.length; i++) {
            this.addRemoveClass(nodes[i], addClass, removeClass);
            if (callback) {
                callback.call(this, nodes[i]);
            }
        }
    }
};

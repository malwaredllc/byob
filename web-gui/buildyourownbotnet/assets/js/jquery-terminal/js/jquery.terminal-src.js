/**@license
 *       __ _____                     ________                              __
 *      / // _  /__ __ _____ ___ __ _/__  ___/__ ___ ______ __ __  __ ___  / /
 *  __ / // // // // // _  // _// // / / // _  // _//     // //  \/ // _ \/ /
 * /  / // // // // // ___// / / // / / // ___// / / / / // // /\  // // / /__
 * \___//____ \\___//____//_/ _\_  / /_//____//_/ /_/ /_//_//_/ /_/ \__\_\___/
 *           \/              /____/                              version {{VER}}
 *
 * This file is part of jQuery Terminal. https://terminal.jcubic.pl
 *
 * Copyright (c) 2010-2019 Jakub T. Jankiewicz <https://jcubic.pl/m>e
 * Released under the MIT license
 *
 * Contains:
 *
 * Storage plugin Distributed under the MIT License
 * modified to work from Data URIs that block storage and cookies in Chrome
 * Copyright (c) 2010 Dave Schindler
 *
 * jQuery Timers licenced with the WTFPL
 * <http://jquery.offput.ca/timers/>
 *
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 *
 * jQuery Caret
 * Copyright (c) 2009, Gideon Sireling
 * 3 clause BSD License
 *
 * sprintf.js
 * Copyright (c) 2007-2013 Alexandru Marasteanu <hello at alexei dot ro>
 * licensed under 3 clause BSD license
 *
 * debounce function from Lodash
 * Copyright JS Foundation and other contributors <https://js.foundation/>
 * The MIT License
 *
 * emoji regex v7.0.1 by Mathias Bynens
 * MIT license
 *
 * broken image by Sophia Bai from the Noun Project (CC-BY)
 *
 * Date: {{DATE}}
 */
/* global location, setTimeout, window, global, sprintf, setImmediate,
          IntersectionObserver,  ResizeObserver, module, require, define,
          setInterval, clearInterval, clearTimeout, Blob, Map, Image */
/* eslint-disable */
/* istanbul ignore next */
(function(ctx) {
    var sprintf = function() {
        if (!sprintf.cache.hasOwnProperty(arguments[0])) {
            sprintf.cache[arguments[0]] = sprintf.parse(arguments[0]);
        }
        return sprintf.format.call(null, sprintf.cache[arguments[0]], arguments);
    };
    sprintf.format = function(parse_tree, argv) {
        var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
        for (i = 0; i < tree_length; i++) {
            node_type = get_type(parse_tree[i]);
            if (node_type === 'string') {
                output.push(parse_tree[i]);
            }
            else if (node_type === 'array') {
                match = parse_tree[i]; // convenience purposes only
                if (match[2]) { // keyword argument
                    arg = argv[cursor];
                    for (k = 0; k < match[2].length; k++) {
                        if (!arg.hasOwnProperty(match[2][k])) {
                            throw(sprintf('[sprintf] property "%s" does not exist', match[2][k]));
                        }
                        arg = arg[match[2][k]];
                    }
                }
                else if (match[1]) { // positional argument (explicit)
                    arg = argv[match[1]];
                }
                else { // positional argument (implicit)
                    arg = argv[cursor++];
                }

                if (/[^s]/.test(match[8]) && (get_type(arg) !== 'number')) {
                    throw(sprintf('[sprintf] expecting number but found %s', get_type(arg)));
                }
                switch (match[8]) {
                    case 'b': arg = arg.toString(2); break;
                    case 'c': arg = String.fromCharCode(arg); break;
                    case 'd': arg = parseInt(arg, 10); break;
                    case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
                    case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
                    case 'o': arg = arg.toString(8); break;
                    case 's': arg = ((arg = String(arg)) && match[7] ? arg.slice(0, match[7]) : arg); break;
                    case 'u': arg = arg >>> 0; break;
                    case 'x': arg = arg.toString(16); break;
                    case 'X': arg = arg.toString(16).toUpperCase(); break;
                }
                arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? ' +' + arg : arg);
                pad_character = match[4] ? match[4] === '0' ? '0' : match[4].charAt(1) : ' ';
                pad_length = match[6] - String(arg).length;
                pad = match[6] ? str_repeat(pad_character, pad_length) : '';
                output.push(match[5] ? arg + pad : pad + arg);
            }
        }
        return output.join('');
    };

    sprintf.cache = {};

    sprintf.parse = function(fmt) {
        var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
        while (_fmt) {
            if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
                parse_tree.push(match[0]);
            }
            else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
                parse_tree.push('%');
            }
            else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
                if (match[2]) {
                    arg_names |= 1;
                    var field_list = [], replacement_field = match[2], field_match = [];
                    if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
                        field_list.push(field_match[1]);
                        while ((replacement_field = replacement_field.slice(field_match[0].length)) !== '') {
                            if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
                                field_list.push(field_match[1]);
                            }
                            else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
                                field_list.push(field_match[1]);
                            }
                            else {
                                throw('[sprintf] huh?');
                            }
                        }
                    }
                    else {
                        throw('[sprintf] huh?');
                    }
                    match[2] = field_list;
                }
                else {
                    arg_names |= 2;
                }
                if (arg_names === 3) {
                    throw('[sprintf] mixing positional and named placeholders is not (yet) supported');
                }
                parse_tree.push(match);
            }
            else {
                throw('[sprintf] huh?');
            }
            _fmt = _fmt.slice(match[0].length);
        }
        return parse_tree;
    };

    var vsprintf = function(fmt, argv, _argv) {
        _argv = argv.slice(0);
        _argv.splice(0, 0, fmt);
        return sprintf.apply(null, _argv);
    };

    /**
     * helpers
     */
    function get_type(variable) {
        return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
    }

    function str_repeat(input, multiplier) {
        for (var output = []; multiplier > 0; output[--multiplier] = input) {/* do nothing */}
        return output.join('');
    }

    /**
     * export to either browser or node.js
     */
    ctx.sprintf = sprintf;
    ctx.vsprintf = vsprintf;
})(typeof global !== "undefined" ? global : window);
// -----------------------------------------------------------------------
/* eslint-enable */
// UMD taken from https://github.com/umdjs/umd
(function(factory, undefined) {
    var root = typeof window !== 'undefined' ? window : global;
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        // istanbul ignore next
        define(['jquery', 'wcwidth'], function(jquery, wcwidth) {
            factory(jquery, wcwidth, root);
            return jquery;
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node/CommonJS
        module.exports = function(root, jQuery, wcwidth) {
            if (jQuery === undefined) {
                // require('jQuery') returns a factory that requires window to
                // build a jQuery instance, we normalize how we use modules
                // that require this pattern but the window provided is a noop
                // if it's defined (how jquery works)
                if (window !== undefined) {
                    jQuery = require('jquery');
                } else {
                    jQuery = require('jquery')(root);
                }
            }
            if (wcwidth === undefined) {
                wcwidth = require('wcwidth');
            }
            factory(jQuery, wcwidth, root);
            return jQuery;
        };
    } else {
        // Browser
        // istanbul ignore next
        factory(root.jQuery, root.wcwidth, root);
    }
})(function($, wcwidth, root, undefined) {
    'use strict';
    // -----------------------------------------------------------------------
    // :: debug functions
    // -----------------------------------------------------------------------
    /* eslint-disable */
    /* istanbul ignore next */
    function debug(str) {
        if (false) {
            console.log(str);
            //$.terminal.active().echo(str);
        }
    }
    /* eslint-enable */
    // -----------------------------------------------------------------------
    // :: Replacemenet for jQuery 2 deferred objects
    // -----------------------------------------------------------------------
    function DelayQueue() {
        var callbacks = $.Callbacks();
        var resolved = false;
        this.resolve = function() {
            callbacks.fire();
            resolved = true;
        };
        this.add = function(fn) {
            if (resolved) {
                fn();
            } else {
                callbacks.add(fn);
            }
        };
    }
    // -----------------------------------------------------------------------
    // :: map object to object
    // -----------------------------------------------------------------------
    $.omap = function(o, fn) {
        var result = {};
        $.each(o, function(k, v) {
            result[k] = fn.call(o, k, v);
        });
        return result;
    };
    $.fn.text_length = function() {
        return this.map(function() {
            return $(this).text().length;
        }).get().reduce(function(a, b) {
            return a + b;
        }, 0);
    };
    // -----------------------------------------------------------------------
    // :: Deep clone of objects and arrays
    // -----------------------------------------------------------------------
    var Clone = {
        clone_object: function(object) {
            var tmp = {};
            if (typeof object === 'object') {
                if ($.isArray(object)) {
                    return this.clone_array(object);
                } else if (object === null) {
                    return object;
                } else {
                    for (var key in object) {
                        if ($.isArray(object[key])) {
                            tmp[key] = this.clone_array(object[key]);
                        } else if (typeof object[key] === 'object') {
                            tmp[key] = this.clone_object(object[key]);
                        } else {
                            tmp[key] = object[key];
                        }
                    }
                }
            }
            return tmp;
        },
        clone_array: function(array) {
            if (!is_function(Array.prototype.map)) {
                throw new Error("Your browser don't support ES5 array map " +
                                'use es5-shim');
            }
            return array.slice(0).map(function(item) {
                if (typeof item === 'object') {
                    return this.clone_object(item);
                } else {
                    return item;
                }
            }.bind(this));
        }
    };
    var clone = function(object) {
        return Clone.clone_object(object);
    };

    /* eslint-disable */
    // -----------------------------------------------------------------------
    // :: Storage plugin
    // -----------------------------------------------------------------------
    var localStorage;
    /* istanbul ignore next */
    (function() {
        var hasLS = function() {
            try {
                var testKey = 'test', storage = window.localStorage;
                storage.setItem(testKey, '1');
                storage.removeItem(testKey);
                return true;
            } catch (error) {
                return false;
            }
        };
        var hasCookies = function() {
            try {
                document.cookie.split(';');
                return true;
            } catch (e) {
                return false;
            }
        };
        // Private data
        var isLS = hasLS();
        // Private functions
        function wls(n, v) {
            var c;
            if (typeof n === 'string' && typeof v === 'string') {
                localStorage[n] = v;
                return true;
            } else if (typeof n === 'object' && typeof v === 'undefined') {
                for (c in n) {
                    if (n.hasOwnProperty(c)) {
                        localStorage[c] = n[c];
                    }
                }
                return true;
            }
            return false;
        }
        function wc(n, v) {
            var dt, e, c;
            dt = new Date();
            dt.setTime(dt.getTime() + 31536000000);
            e = '; expires=' + dt.toGMTString();
            if (typeof n === 'string' && typeof v === 'string') {
                document.cookie = n + '=' + v + e + '; path=/';
                return true;
            } else if (typeof n === 'object' && typeof v === 'undefined') {
                for (c in n) {
                    if (n.hasOwnProperty(c)) {
                        document.cookie = c + '=' + n[c] + e + '; path=/';
                    }
                }
                return true;
            }
            return false;
        }
        function rls(n) {
            return localStorage[n];
        }
        function rc(n) {
            var nn, ca, i, c;
            nn = n + '=';
            ca = document.cookie.split(';');
            for (i = 0; i < ca.length; i++) {
                c = ca[i];
                while (c.charAt(0) === ' ') {
                    c = c.slice(1, c.length);
                }
                if (c.indexOf(nn) === 0) {
                    return c.slice(nn.length, c.length);
                }
            }
            return null;
        }
        function dls(n) {
            return delete localStorage[n];
        }
        function dc(n) {
            return wc(n, '', -1);
        }
        /**
         * Public API
         * $.Storage.set("name", "value")
         * $.Storage.set({"name1":"value1", "name2":"value2", etc})
         * $.Storage.get("name")
         * $.Storage.remove("name")
         */
        if (!hasCookies() && !isLS) {
            localStorage = {};
            $.extend({
                Storage: {
                    set: wls,
                    get: rls,
                    remove: dls
                }
            });
        } else {
            if (isLS) {
                localStorage = window.localStorage;
            }
            $.extend({
                Storage: {
                    set: isLS ? wls : wc,
                    get: isLS ? rls : rc,
                    remove: isLS ? dls : dc
                }
            });
        }
    })();
    // -----------------------------------------------------------------------
    // :: Debounce from Lodash
    // -----------------------------------------------------------------------
    /* istanbul ignore next */
    var debounce = (function() {
        var FUNC_ERROR_TEXT = 'Expected a function';
        function isObject(value) {
            var type = typeof value;
            return value != null && (type == 'object' || type == 'function');
        }
        function now() {
            return Date.now();
        }
        return function debounce(func, wait, options) {
            var nativeMax = Math.max,
                nativeMin = Math.min;

            var lastArgs,
                lastThis,
                maxWait,
                result,
                timerId,
                lastCallTime,
                lastInvokeTime = 0,
                leading = false,
                maxing = false,
                trailing = true;

            if (typeof func != 'function') {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            wait = wait || 0;
            if (isObject(options)) {
                leading = !!options.leading;
                maxing = 'maxWait' in options;
                maxWait = maxing ? nativeMax(options.maxWait || 0, wait) : maxWait;
                trailing = 'trailing' in options ? !!options.trailing : trailing;
            }

            function invokeFunc(time) {
                var args = lastArgs,
                    thisArg = lastThis;

                lastArgs = lastThis = undefined;
                lastInvokeTime = time;
                result = func.apply(thisArg, args);
                return result;
            }

            function leadingEdge(time) {
                // Reset any `maxWait` timer.
                lastInvokeTime = time;
                // Start the timer for the trailing edge.
                timerId = setTimeout(timerExpired, wait);
                // Invoke the leading edge.
                return leading ? invokeFunc(time) : result;
            }

            function remainingWait(time) {
                var timeSinceLastCall = time - lastCallTime,
                    timeSinceLastInvoke = time - lastInvokeTime,
                    timeWaiting = wait - timeSinceLastCall;

                return maxing
                    ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke)
                    : timeWaiting;
            }

            function shouldInvoke(time) {
                var timeSinceLastCall = time - lastCallTime,
                    timeSinceLastInvoke = time - lastInvokeTime;

                // Either this is the first call, activity has stopped and we're at the
                // trailing edge, the system time has gone backwards and we're treating
                // it as the trailing edge, or we've hit the `maxWait` limit.
                return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
                        (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
            }

            function timerExpired() {
                var time = now();
                if (shouldInvoke(time)) {
                    return trailingEdge(time);
                }
                // Restart the timer.
                timerId = setTimeout(timerExpired, remainingWait(time));
            }

            function trailingEdge(time) {
                timerId = undefined;

                // Only invoke if we have `lastArgs` which means `func` has been
                // debounced at least once.
                if (trailing && lastArgs) {
                    return invokeFunc(time);
                }
                lastArgs = lastThis = undefined;
                return result;
            }

            function cancel() {
                if (timerId !== undefined) {
                    clearTimeout(timerId);
                }
                lastInvokeTime = 0;
                lastArgs = lastCallTime = lastThis = timerId = undefined;
            }

            function flush() {
                return timerId === undefined ? result : trailingEdge(now());
            }

            function debounced() {
                var time = now(),
                    isInvoking = shouldInvoke(time);

                lastArgs = arguments;
                lastThis = this;
                lastCallTime = time;

                if (isInvoking) {
                    if (timerId === undefined) {
                        return leadingEdge(lastCallTime);
                    }
                    if (maxing) {
                        // Handle invocations in a tight loop.
                        timerId = setTimeout(timerExpired, wait);
                        return invokeFunc(lastCallTime);
                    }
                }
                if (timerId === undefined) {
                    timerId = setTimeout(timerExpired, wait);
                }
                return result;
            }
            debounced.cancel = cancel;
            debounced.flush = flush;
            return debounced;
        };
    })();
    // -----------------------------------------------------------------------
    // :: jQuery Timers
    // -----------------------------------------------------------------------
    var jQuery = $;
    /* istanbul ignore next */
    (function($) {
        jQuery.fn.extend({
            everyTime: function(interval, label, fn, times, belay) {
                return this.each(function() {
                    jQuery.timer.add(this, interval, label, fn, times, belay);
                });
            },
            oneTime: function(interval, label, fn) {
                return this.each(function() {
                    jQuery.timer.add(this, interval, label, fn, 1);
                });
            },
            stopTime: function(label, fn) {
                return this.each(function() {
                    jQuery.timer.remove(this, label, fn);
                });
            }
        });

        jQuery.extend({
            timer: {
                guid: 1,
                global: {},
                regex: /^([0-9]+)\s*(.*s)?$/,
                powers: {
                    // Yeah this is major overkill...
                    'ms': 1,
                    'cs': 10,
                    'ds': 100,
                    's': 1000,
                    'das': 10000,
                    'hs': 100000,
                    'ks': 1000000
                },
                timeParse: function(value) {
                    if (value === undefined || value === null) {
                        return null;
                    }
                    var result = this.regex.exec(jQuery.trim(value.toString()));
                    if (result[2]) {
                        var num = parseInt(result[1], 10);
                        var mult = this.powers[result[2]] || 1;
                        return num * mult;
                    } else {
                        return value;
                    }
                },
                add: function(element, interval, label, fn, times, belay) {
                    var counter = 0;

                    if (jQuery.isFunction(label)) {
                        if (!times) {
                            times = fn;
                        }
                        fn = label;
                        label = interval;
                    }

                    interval = jQuery.timer.timeParse(interval);

                    if (typeof interval !== 'number' ||
                        isNaN(interval) ||
                        interval <= 0) {
                        return;
                    }
                    if (times && times.constructor !== Number) {
                        belay = !!times;
                        times = 0;
                    }

                    times = times || 0;
                    belay = belay || false;

                    if (!element.$timers) {
                        element.$timers = {};
                    }
                    if (!element.$timers[label]) {
                        element.$timers[label] = {};
                    }
                    fn.$timerID = fn.$timerID || this.guid++;

                    var handler = function() {
                        if (belay && handler.inProgress) {
                            return;
                        }
                        handler.inProgress = true;
                        if ((++counter > times && times !== 0) ||
                            fn.call(element, counter) === false) {
                            jQuery.timer.remove(element, label, fn);
                        }
                        handler.inProgress = false;
                    };

                    handler.$timerID = fn.$timerID;

                    if (!element.$timers[label][fn.$timerID]) {
                        element.$timers[label][fn.$timerID] = window.setInterval(handler, interval);
                    }

                    if (!this.global[label]) {
                        this.global[label] = [];
                    }
                    this.global[label].push(element);

                },
                remove: function(element, label, fn) {
                    var timers = element.$timers, ret;

                    if (timers) {

                        if (!label) {
                            for (var lab in timers) {
                                if (timers.hasOwnProperty(lab)) {
                                    this.remove(element, lab, fn);
                                }
                            }
                        } else if (timers[label]) {
                            if (fn) {
                                if (fn.$timerID) {
                                    window.clearInterval(timers[label][fn.$timerID]);
                                    delete timers[label][fn.$timerID];
                                }
                            } else {
                                for (var _fn in timers[label]) {
                                    if (timers[label].hasOwnProperty(_fn)) {
                                        window.clearInterval(timers[label][_fn]);
                                        delete timers[label][_fn];
                                    }
                                }
                            }

                            for (ret in timers[label]) {
                                if (timers[label].hasOwnProperty(ret)) {
                                    break;
                                }
                            }
                            if (!ret) {
                                ret = null;
                                delete timers[label];
                            }
                        }

                        for (ret in timers) {
                            if (timers.hasOwnProperty(ret)) {
                                break;
                            }
                        }
                        if (!ret) {
                            element.$timers = null;
                        }
                    }
                }
            }
        });
        if (/(msie) ([\w.]+)/.exec(navigator.userAgent.toLowerCase())) {
            $(window).one('unload', function() {
                var global = jQuery.timer.global;
                for (var label in global) {
                    if (global.hasOwnProperty(label)) {
                        var els = global[label], i = els.length;
                        while (--i) {
                            jQuery.timer.remove(els[i], label);
                        }
                    }
                }
            });
        }
    })(jQuery);
    // -----------------------------------------------------------------------
    // :: CROSS BROWSER SPLIT
    // -----------------------------------------------------------------------
    /* istanbul ignore next */
    (function(undef) {
        // prevent double include

        if (!String.prototype.split.toString().match(/\[native/)) {
            return;
        }

        var nativeSplit = String.prototype.split,
        compliantExecNpcg = /()??/.exec("")[1] === undef, // NPCG: nonparticipating capturing group
        self;

        self = function(str, separator, limit) {
            // If `separator` is not a regex, use `nativeSplit`
            if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
                return nativeSplit.call(str, separator, limit);
            }
            var output = [],
            flags = (separator.ignoreCase ? "i" : "") +
                (separator.multiline  ? "m" : "") +
                (separator.extended   ? "x" : "") + // Proposed for ES6
                (separator.sticky     ? "y" : ""), // Firefox 3+
                lastLastIndex = 0,
            // Make `global` and avoid `lastIndex` issues by working with a copy
            separator2, match, lastIndex, lastLength;
            separator = new RegExp(separator.source, flags + "g");
            str += ""; // Type-convert
            if (!compliantExecNpcg) {
                // Doesn't need flags gy, but they don't hurt
                separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
            }
            /* Values for `limit`, per the spec:
             * If undefined: 4294967295 // Math.pow(2, 32) - 1
             * If 0, Infinity, or NaN: 0
             * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
             * If negative number: 4294967296 - Math.floor(Math.abs(limit))
             * If other: Type-convert, then use the above rules
             */
            // ? Math.pow(2, 32) - 1 : ToUint32(limit)
            limit = limit === undef ? -1 >>> 0 : limit >>> 0;
            while (match = separator.exec(str)) {
                    // `separator.lastIndex` is not reliable cross-browser
                    lastIndex = match.index + match[0].length;
                    if (lastIndex > lastLastIndex) {
                        output.push(str.slice(lastLastIndex, match.index));
                        // Fix browsers whose `exec` methods don't consistently return `undefined` for
                        // nonparticipating capturing groups
                        if (!compliantExecNpcg && match.length > 1) {
                            match[0].replace(separator2, function() {
                                for (var i = 1; i < arguments.length - 2; i++) {
                                    if (arguments[i] === undef) {
                                        match[i] = undef;
                                    }
                                }
                            });
                        }
                        if (match.length > 1 && match.index < str.length) {
                            Array.prototype.push.apply(output, match.slice(1));
                        }
                        lastLength = match[0].length;
                        lastLastIndex = lastIndex;
                        if (output.length >= limit) {
                            break;
                        }
                    }
                    if (separator.lastIndex === match.index) {
                        separator.lastIndex++; // Avoid an infinite loop
                    }
                }
            if (lastLastIndex === str.length) {
                if (lastLength || !separator.test("")) {
                    output.push("");
                }
            } else {
                output.push(str.slice(lastLastIndex));
            }
            return output.length > limit ? output.slice(0, limit) : output;
        };

        // For convenience
        String.prototype.split = function(separator, limit) {
            return self(this, separator, limit);
        };

        return self;

    })();
    // -----------------------------------------------------------------------
    // :: jQuery Caret
    // -----------------------------------------------------------------------
    /* istanbul ignore next */
    $.fn.caret = function(pos) {
        var target = this[0];
        var isContentEditable = target.contentEditable === 'true';
        //get
        if (arguments.length === 0) {
            //HTML5
            if (window.getSelection) {
                //contenteditable
                if (isContentEditable) {
                    target.focus();
                    var range1 = window.getSelection().getRangeAt(0),
                    range2 = range1.cloneRange();
                    range2.selectNodeContents(target);
                    range2.setEnd(range1.endContainer, range1.endOffset);
                    return range2.toString().length;
                }
                //textarea
                return target.selectionStart;
            }
            //IE<9
            if (document.selection) {
                target.focus();
                //contenteditable
                if (isContentEditable) {
                    var range1 = document.selection.createRange(),
                    range2 = document.body.createTextRange();
                    range2.moveToElementText(target);
                    range2.setEndPoint('EndToEnd', range1);
                    return range2.text.length;
                }
                //textarea
                var pos = 0,
                range = target.createTextRange(),
                range2 = document.selection.createRange().duplicate(),
                bookmark = range2.getBookmark();
                range.moveToBookmark(bookmark);
                while (range.moveStart('character', -1) !== 0) pos++;
                return pos;
            }
            //not supported
            return 0;
        }
        //set
        if (pos === -1)
            pos = this[isContentEditable? 'text' : 'val']().length;
        //HTML5
        if (window.getSelection) {
            //contenteditable
            if (isContentEditable) {
                target.focus();
                window.getSelection().collapse(target.firstChild, pos);
            }
            //textarea
            else
                target.setSelectionRange(pos, pos);
        }
        //IE<9
        else if (document.body.createTextRange) {
            var range = document.body.createTextRange();
            range.moveToElementText(target);
            range.moveStart('character', pos);
            range.collapse(true);
            range.select();
        }
        if (!isContentEditable && !this.is(':focus')) {
            target.focus();
        }
        return pos;
    };
    /* eslint-enable */
    // -----------------------------------------------------------------------
    // :: Cross-browser resize element plugin using sentinel iframe or
    // :: resizeObserver
    // -----------------------------------------------------------------------
    $.fn.resizer = function(callback, options) {
        var settings = $.extend({}, {
            prefix: ''
        }, options);
        var trigger = arguments.length === 0;
        var unbind = arguments[0] === "unbind";
        if (!trigger && !unbind && !is_function(callback)) {
            throw new Error('Invalid argument, it need to a function or string ' +
                            '"unbind" or no arguments.');
        }
        if (unbind) {
            callback = is_function(arguments[1]) ? arguments[1] : null;
        }
        return this.each(function() {
            var $this = $(this);
            var iframe;
            var callbacks;
            function resize_handler() {
                callbacks.fire();
            }
            if (trigger || unbind) {
                callbacks = $this.data('callbacks');
                if (trigger) {
                    callbacks && callbacks.fire();
                } else {
                    if (callback && callbacks) {
                        callbacks.remove(callback);
                        if (!callbacks.has()) {
                            callbacks = null;
                        }
                    } else {
                        callbacks = null;
                    }
                    if (!callbacks) {
                        $this.removeData('callbacks');
                        if (window.ResizeObserver) {
                            var observer = $this.data('observer');
                            if (observer) {
                                observer.unobserve(this);
                                $this.removeData('observer');
                            }
                        } else {
                            iframe = $this.find('> iframe');
                            if (iframe.length) {
                                // just in case of memory leaks in IE
                                $(iframe[0].contentWindow).off('resize').remove();
                                iframe.remove();
                            } else if ($this.is('body')) {
                                $(window).off('resize.resizer');
                            }
                        }
                    }
                }
            } else if ($this.data('callbacks')) {
                $(this).data('callbacks').add(callback);
            } else {
                callbacks = $.Callbacks();
                callbacks.add(callback);
                $this.data('callbacks', callbacks);
                var resizer;
                var first = true;
                if (window.ResizeObserver) {
                    resizer = new ResizeObserver(function() {
                        if (!first) {
                            resize_handler();
                        }
                        first = false;
                    });
                    resizer.observe(this);
                    $this.data('observer', resizer);
                } else if ($this.is('body')) {
                    $(window).on('resize.resizer', resize_handler);
                } else {
                    iframe = $('<iframe/>').addClass(settings.prefix + 'resizer')
                        .appendTo(this)[0];

                    $(iframe.contentWindow).on('resize', resize_handler);
                }
            }
        });
    };
    // -----------------------------------------------------------------------
    function jquery_resolve(value) {
        var defer = jQuery.Deferred();
        defer.resolve(value);
        return defer.promise();
    }
    // -----------------------------------------------------------------------
    function unpromise(value, callback, error) {
        if (value) {
            if (is_function(value.catch)) {
                value.catch(error);
            }
            if (is_function(value.done)) {
                return value.done(callback);
            } else if (is_function(value.then)) {
                return value.then(callback);
            } else {
                return callback(value);
            }
        }
    }
    // -----------------------------------------------------------------------
    // :: based on https://github.com/zeusdeux/isInViewport
    // :: work only vertically and on dom elements
    // -----------------------------------------------------------------------
    $.fn.is_fully_in_viewport = (function() {
        function is_visible(node, container) {
            var box = node.getBoundingClientRect();
            var viewport = container[0].getBoundingClientRect();
            var top = box.top - viewport.top;
            var bottom = box.bottom - viewport.top;
            var height = container.height();
            return bottom > 0 && top <= height;
        }
        if (window.IntersectionObserver) {
            return function(container) {
                var node = this[0];
                var defer = jQuery.Deferred();
                var item_observer = new window.IntersectionObserver(function(entries) {
                    defer.resolve(entries[0].isIntersecting && entries[0].ratio === 1);
                    item_observer.unobserve(node);
                }, {
                    root: container[0]
                });
                item_observer.observe(node);
                return defer.promise();
            };
        } else {
            return function(container) {
                return jquery_resolve(is_visible(this[0], container));
            };
        }
    })();
    // -------------------------------------------------------------------------
    /* eslint-disable */
    var entity_re = /(&(?:[a-z\d]+|#\d+|#x[a-f\d]+);)/i;
    // regex that match single character at begining and folowing combine character
    // https://en.wikipedia.org/wiki/Combining_character
    var combine_chr_re = /(.(?:[\u0300-\u036F]|[\u1AB0-\u1abE]|[\u1DC0-\u1DF9]|[\u1DFB-\u1DFF]|[\u20D0-\u20F0]|[\uFE20-\uFE2F])+)/;
    // source: https://mathiasbynens.be/notes/javascript-unicode
    var astral_symbols_re = /([\uD800-\uDBFF][\uDC00-\uDFFF])/;
    // source: https://github.com/mathiasbynens/emoji-regex
    var emoji_re = /(\uD83C\uDFF4(?:\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74)\uDB40\uDC7F|\u200D\u2620\uFE0F)|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC68(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDB0-\uDDB3])|(?:\uD83C[\uDFFB-\uDFFF])\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDB0-\uDDB3]))|\uD83D\uDC69\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDB0-\uDDB3])|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2695\u2696\u2708]|\uD83D\uDC68(?:(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|(?:(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)\uFE0F|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDD6-\uDDDD])(?:(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\u200D[\u2640\u2642])|\uD83D\uDC69\u200D[\u2695\u2696\u2708])\uFE0F|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D\uDC68(?:\u200D(?:(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D[\uDC66\uDC67])|\uD83C[\uDFFB-\uDFFF])|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDB0-\uDDB3])|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83C\uDDF6\uD83C\uDDE6|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF4\uD83C\uDDF2|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|[#\*0-9]\uFE0F\u20E3|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270A-\u270D]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC70\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDCAA\uDD74\uDD7A\uDD90\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD36\uDDB5\uDDB6\uDDD1-\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDEEB\uDEEC\uDEF4-\uDEF9]|\uD83E[\uDD10-\uDD3A\uDD3C-\uDD3E\uDD40-\uDD45\uDD47-\uDD70\uDD73-\uDD76\uDD7A\uDD7C-\uDDA2\uDDB0-\uDDB9\uDDC0-\uDDC2\uDDD0-\uDDFF])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEF9]|\uD83E[\uDD10-\uDD3A\uDD3C-\uDD3E\uDD40-\uDD45\uDD47-\uDD70\uDD73-\uDD76\uDD7A\uDD7C-\uDDA2\uDDB0-\uDDB9\uDDC0-\uDDC2\uDDD0-\uDDFF])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC69\uDC6E\uDC70-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD18-\uDD1C\uDD1E\uDD1F\uDD26\uDD30-\uDD39\uDD3D\uDD3E\uDDB5\uDDB6\uDDB8\uDDB9\uDDD1-\uDDDD]))/;
    // https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
    var mobile_re = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i;
    var tablet_re = /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i;
    var format_split_re = /(\[\[(?:-?[@!gbiuso])*;[^;]*;[^\]]*\](?:[^\]\\]*(?:\\\\)*\\\][^\]]*|[^\]]*|[^[]*\[[^\]]*)\]?)/i;
    var format_parts_re = /\[\[((?:-?[@!gbiuso])*);([^;]*);([^;\]]*);?([^;\]]*);?([^\]]*)\]([^\]\\]*\\\][^\]]*|[^\]]*|[^[]*\[[^\]]+)\]?/gi;
    var format_re = /\[\[((?:-?[@!gbiuso])*;[^;\]]*;[^;\]]*(?:;|[^\]()]*);?[^\]]*)\]([^\]]*\\\][^\]]*|[^\]]*|[^[]*\[[^\]]*)\]?/gi;
    var format_exist_re = /\[\[((?:-?[@!gbiuso])*;[^;\]]*;[^;\]]*(?:;|[^\]()]*);?[^\]]*)\]([^\]]*\\\][^\]]*|[^\]]*|[^[]*\[[^\]]*)\]/gi;
    var format_full_re = /^(\[\[(?:(?:-?[@!gbiuso])*;[^;\]]*;[^;\]]*(?:;|[^\]()]*);?[^\]]*)\])([^\]]*\\\][^\]]*|[^\]]*|[^[]*\[[^\]]*)(\])$/i;
    var format_begin_re = /(\[\[(?:-?[@!gbiuso])*;[^;]*;[^\]]*\])/i;
    var format_start_re = /^(\[\[(?:-?[@!gbiuso])*;[^;]*;[^\]]*\])/i;
    var format_end_re = /\[\[(?:-?[@!gbiuso])*;[^;]*;[^\]]*\]?$/i;
    var self_closing_re = /^(?:\[\[)?[^;]*@[^;]*;/;
    var color_hex_re = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
    var url_re = /(\bhttps?:\/\/(?:(?:(?!&[^;]+;)|(?=&amp;))[^\s"'<>\][)])+)/gi;
    var url_nf_re = /\b(?![^\s[\]]*])(https?:\/\/(?:(?:(?!&[^;]+;)|(?=&amp;))[^\s"'<>\][)])+)/gi;
    var email_re = /((([^<>('")[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,})))/g;
    var url_full_re = /^(https?:\/\/(?:(?:(?!&[^;]+;)|(?=&amp;))[^\s"'<>\][)])+)$/gi;
    var email_full_re = /^((([^<>('")[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,})))$/g;
    var command_re = /((?:"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'|\/[^\/\\]*(?:\\[\S\s][^\/\\]*)*\/[gimsuy]*(?=\s|$)|(?:\\\s|\S))+)(?=\s|$)/gi;
    var extended_command_re = /^\s*((terminal|cmd)::([a-z_]+)\(([\s\S]*)\))\s*$/;
    var format_exec_re = /(\[\[(?:[^\][]|\\\])+\]\])/;
    var float_re = /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/;
    var re_re = /^\/((?:\\\/|[^/]|\[[^\]]*\/[^\]]*\])+)\/([gimsuy]*)$/;
    var string_re = /("(?:[^"\\]|\\(?:\\\\)*"|\\\\)*"|'(?:[^'\\]|\\(?:\\\\)*'|\\\\)*')/;
    var unclosed_strings_re = /^(?=((?:[^"']+|"[^"\\]*(?:\\[^][^"\\]*)*"|'[^'\\]*(?:\\[^][^'\\]*)*')*))\1./;
    var broken_image = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 14"><title id="title2">rounded</title><path id="terminal-broken-image" d="m 14,10 h 2 v 1 a 3,3 0 0 1 -3,3 H 3 A 3,3 0 0 1 0,11 H 4.5 A 1.00012,1.00012 0 0 0 5.207,10.707 L 6.5,9.414 7.793,10.707 a 0.99963,0.99963 0 0 0 1.41406,0 l 2.36719,-2.36719 1.80127,1.44092 A 0.99807,0.99807 0 0 0 14,10 Z M 16,3 V 8 H 14.35059 L 12.12451,6.21924 A 0.99846,0.99846 0 0 0 10.793,6.293 L 8.5,8.586 7.207,7.293 a 0.99962,0.99962 0 0 0 -1.41406,0 L 4.08594,9 H 0 V 3 A 3,3 0 0 1 3,0 h 10 a 3,3 0 0 1 3,3 z M 6,4.5 A 1.5,1.5 0 1 0 4.5,6 1.5,1.5 0 0 0 6,4.5 Z" /></svg>';
    var use_broken_image = '<svg class="terminal-broken-image" role="presentation" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 14" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="#terminal-broken-image"/></svg>';
    /* eslint-enable */
    // -------------------------------------------------------------------------
    // :: features flags
    // -------------------------------------------------------------------------
    // taken from https://hacks.mozilla.org/2011/09/detecting-and-generating-
    // css-animations-in-javascript/
    var animation_supported = (function() {
        var animation = false,
            domPrefixes = 'Webkit Moz O ms Khtml'.split(' '),
            elm = document.createElement('div');
        if (elm.style.animationName) {
            animation = true;
        }
        if (animation === false) {
            for (var i = 0; i < domPrefixes.length; i++) {
                var name = domPrefixes[i] + 'AnimationName';
                if (elm.style[name] !== undefined) {
                    animation = true;
                    break;
                }
            }
        }
        elm = null;
        return animation;
    })();
    // -------------------------------------------------------------------------
    var agent = window.navigator.userAgent;
    var is_IE = /MSIE|Trident/.test(agent) || /rv:11.0/i.test(agent);
    var is_IEMobile = /IEMobile/.test(agent);
    // -------------------------------------------------------------------------
    var is_ch_unit_supported = (function() {
        if (is_IE && !is_IEMobile) {
            return false;
        }
        var div = document.createElement('div');
        div.style.width = '1ch';
        return div.style.width === '1ch';
    })();
    // -------------------------------------------------------------------------
    var is_css_variables_supported = window.CSS && window.CSS.supports &&
            window.CSS.supports('--fake-var', 0);
    // -------------------------------------------------------------------------
    var is_android = navigator.userAgent.toLowerCase().indexOf('android') !== -1;
    // -------------------------------------------------------------------------
    var is_key_native = (function is_key_native() {
        if (!('KeyboardEvent' in window && 'key' in window.KeyboardEvent.prototype)) {
            return false;
        }
        var proto = window.KeyboardEvent.prototype;
        var get = Object.getOwnPropertyDescriptor(proto, 'key').get;
        return !!get.toString().match(/\[native code\]/);
    })();
    // -------------------------------------------------------------------------
    var is_mobile = (function(a) {
        var check = false;
        if (mobile_re.test(a) || tablet_re.test(a.substr(0, 4))) {
            check = true;
        }
        return check;
    })(navigator.userAgent || navigator.vendor || window.opera);

    // -------------------------------------------------------------------------
    // IE ch unit bug detection - better that UserAgent that can be changed
    // -------------------------------------------------------------------------
    var ch_unit_bug = false;
    $(function() {
        function width(e) {
            return e[0].getBoundingClientRect().width;
        }
        var base = '<span style="font-family: monospace;visibility:hidden;';
        var ch = $(base + 'width:1ch;overflow: hidden">&nbsp;</span>').appendTo('body');
        var space = $(base + '">&nbsp;</span>').appendTo('body');
        ch_unit_bug = width(ch) !== width(space);
        ch.remove();
        space.remove();
    });
    // -----------------------------------------------------------------------
    // :: hide elements from screen readers
    // -----------------------------------------------------------------------
    function a11y_hide(element) {
        element.attr({
            role: 'presentation',
            'aria-hidden': 'true'
        });
    }
    // ---------------------------------------------------------------------
    // :: alert only first exception of type
    // ---------------------------------------------------------------------
    var excepctions = [];
    function alert_exception(label, e) {
        if (arguments[0] instanceof $.terminal.Exception) {
            label = arguments[0].type;
            e = arguments[0];
        }
        var message = (label ? label + ': ' : '') + exception_message(e);
        if (excepctions.indexOf(message) === -1) {
            excepctions.push(message);
            setTimeout(function() {
                throw e;
            }, 0);
            //alert(message + (e.stack ? '\n' + e.stack : ''));
        }
    }
    // ---------------------------------------------------------------------
    // :; detect if mouse event happen on scrollbar
    // ---------------------------------------------------------------------
    function scrollbar_event(e, node) {
        var left = node.offset().left;
        return node.outerWidth() <= e.clientX - left;
    }
    // ---------------------------------------------------------------------
    // :: Return exception message as string
    // ---------------------------------------------------------------------
    function exception_message(e) {
        if (typeof e === 'string') {
            return e;
        } else if (typeof e.fileName === 'string') {
            return e.fileName + ': ' + e.message;
        } else {
            return e.message;
        }
    }
    // -----------------------------------------------------------------------
    // :: CYCLE DATA STRUCTURE
    // -----------------------------------------------------------------------
    function Cycle() {
        var data = [].slice.call(arguments);
        var pos = 0;
        $.extend(this, {
            get: function() {
                return data;
            },
            index: function() {
                return pos;
            },
            rotate: function(skip, init) {
                if (init === undefined) {
                    init = pos;
                } else if (init === pos) {
                    return;
                }
                if (!skip) {
                    var defined = data.filter(function(item) {
                        return typeof item !== 'undefined';
                    });
                    if (!defined.length) {
                        return;
                    }
                }
                if (!data.length) {
                    return;
                }
                if (data.length === 1) {
                    return data[0];
                } else {
                    if (pos === data.length - 1) {
                        pos = 0;
                    } else {
                        ++pos;
                    }
                    if (typeof data[pos] !== 'undefined') {
                        return data[pos];
                    } else {
                        return this.rotate(true, init);
                    }
                }
            },
            length: function() {
                return data.length;
            },
            remove: function(index) {
                delete data[index];
            },
            set: function(item) {
                for (var i = data.length; i--;) {
                    if (data[i] === item) {
                        pos = i;
                        return;
                    }
                }
                this.append(item);
                pos = data.length - 1;
            },
            front: function() {
                if (data.length) {
                    var index = pos;
                    var restart = false;
                    while (!data[index]) {
                        index++;
                        if (index > data.length) {
                            if (restart) {
                                break;
                            }
                            index = 0;
                            restart = true;
                        }
                    }
                    return data[index];
                }
            },
            map: function(fn) {
                return data.map(function(item, i) {
                    if (typeof item !== 'undefined') {
                        return fn(item, i);
                    }
                    return null;
                }).filter(Boolean);
            },
            forEach: function(fn) {
                return data.forEach(function(item, i) {
                    if (typeof item !== 'undefined') {
                        fn(item, i);
                    }
                });
            },
            append: function(item) {
                data.push(item);
            }
        });
    }
    /*
    function time() {
        // performance.now almost equal Date.now()- performance.timing.navigationStart
        // the difference check should be almost the same
        return performance ? performance.now() : Date.now();
    }
    */
    // -----------------------------------------------------------------------
    // :: STACK DATA STRUCTURE
    // -----------------------------------------------------------------------
    function Stack(init) {
        var data = is_array(init) ? init : init ? [init] : [];
        $.extend(this, {
            data: function() {
                return data;
            },
            map: function(fn) {
                return $.map(data, fn);
            },
            size: function() {
                return data.length;
            },
            pop: function() {
                if (data.length === 0) {
                    return null;
                } else {
                    var value = data[data.length - 1];
                    data = data.slice(0, data.length - 1);
                    return value;
                }
            },
            push: function(value) {
                data = data.concat([value]);
                return value;
            },
            top: function() {
                return data.length > 0 ? data[data.length - 1] : null;
            },
            clone: function() {
                return new Stack(data.slice(0));
            }
        });
    }
    // -------------------------------------------------------------------------
    // :: Class for Worker that do some computation when needed
    // :: if validation function return false it mean that condition changed
    // :: and cache need to be cleared. If value was not prcessed it will run
    // :: the action
    // -------------------------------------------------------------------------
    function WorkerCache(options) {
        var settings = $.extend({
            validation: $.noop,
            action: $.noop,
            onCache: $.noop
        }, options);
        this._onCache = settings.onCache;
        this._action = settings.action;
        this._validation = settings.validation;
        this._cache = new Map();
    }
    // -------------------------------------------------------------------------
    WorkerCache.prototype.validate = function() {
        var valid = this._validation();
        var test = valid === undefined || valid === true;
        if (!test) {
            this._cache.clear();
        }
        return test;
    };
    // -------------------------------------------------------------------------
    WorkerCache.prototype.get = function(key) {
        var value;
        if (this.validate() && this._cache.has(key)) {
            value = this._cache.get(key);
            this._onCache({cahce: value});
            return value;
        }
        value = this._action(key);
        this._cache.set(key, value);
        return value;
    };
    // -------------------------------------------------------------------------
    // :: HISTORY CLASS
    // -------------------------------------------------------------------------
    function History(name, size, memory) {
        var enabled = true;
        var storage_key = '';
        if (typeof name === 'string' && name !== '') {
            storage_key = name + '_';
        }
        storage_key += 'commands';
        var data;
        if (memory) {
            data = [];
        } else {
            data = $.Storage.get(storage_key);
            data = data ? JSON.parse(data) : [];
        }
        var pos = data.length - 1;
        $.extend(this, {
            append: function(item) {
                if (enabled) {
                    if (data[data.length - 1] !== item) {
                        data.push(item);
                        if (size && data.length > size) {
                            data = data.slice(-size);
                        }
                        pos = data.length - 1;
                        if (!memory) {
                            $.Storage.set(storage_key, JSON.stringify(data));
                        }
                    }
                }
            },
            set: function(new_data) {
                if (is_array(new_data)) {
                    data = new_data;
                    if (!memory) {
                        $.Storage.set(storage_key, JSON.stringify(data));
                    }
                }
            },
            data: function() {
                return data;
            },
            reset: function() {
                pos = data.length - 1;
            },
            last: function() {
                return data[data.length - 1];
            },
            end: function() {
                return pos === data.length - 1;
            },
            position: function() {
                return pos;
            },
            current: function() {
                return data[pos];
            },
            next: function() {
                var old = pos;
                if (pos < data.length - 1) {
                    ++pos;
                }
                if (old !== pos) {
                    return data[pos];
                }
            },
            previous: function() {
                var old = pos;
                if (pos > 0) {
                    --pos;
                }
                if (old !== pos) {
                    return data[pos];
                }
            },
            clear: function() {
                data = [];
                this.purge();
            },
            enabled: function() {
                return enabled;
            },
            enable: function() {
                enabled = true;
            },
            purge: function() {
                if (!memory) {
                    $.Storage.remove(storage_key);
                }
            },
            disable: function() {
                enabled = false;
            },
            toggle: function(value) {
                if (typeof value === 'undefined') {
                    enabled = !enabled;
                } else {
                    enabled = value;
                }
            }
        });
    }
    // -------------------------------------------------------------------------
    // :: COMMAND LINE PLUGIN
    // -------------------------------------------------------------------------
    var cmd_index = 0;
    $.cmd = {
        defaults: {
            mask: false,
            caseSensitiveSearch: true,
            historySize: 60,
            prompt: '> ',
            enabled: true,
            history: true,
            onPositionChange: $.noop,
            onCommandChange: $.noop,
            inputStyle: 'textarea',
            mobileDelete: is_mobile,
            onPaste: $.noop,
            clickTimeout: 200,
            holdTimeout: 400,
            holdRepeatTimeout: 200,
            mobileIngoreAutoSpace: [],
            repeatTimeoutKeys: [],
            tabindex: 1,
            tabs: 4
        }
    };
    $.fn.cmd = function(options) {
        var settings = $.extend({}, $.cmd.defaults, options);
        function mobile_ignore_key(key) {
            return settings.mobileIngoreAutoSpace.length &&
                settings.mobileIngoreAutoSpace.indexOf(key) !== -1 && is_android;
        }
        var self = this;
        var maybe_data = self.data('cmd');
        if (maybe_data) {
            return maybe_data;
        }
        var id = cmd_index++;
        self.addClass('cmd');
        var wrapper = $('<div class="cmd-wrapper"/>').appendTo(self);
        wrapper.append('<span class="cmd-prompt"></span>');
        wrapper.append('<div class="cmd-cursor-line">' +
                       '<span></span>' +
                       '<span class="cmd-cursor"><span>' +
                       '<span>&nbsp;</span></span></span>' +
                       '<span></span>' +
                       '</div>');
        // a11y: don't read command it's in textarea that's in focus
        a11y_hide(wrapper.find('.cmd-cursor-line'));
        // on mobile the only way to hide textarea on desktop it's needed because
        // textarea show up after focus
        //self.append('<span class="mask"></mask>');
        var clip = $('<textarea>').attr({
            autocapitalize: 'off',
            spellcheck: 'false',
            tabindex: settings.tabindex
        }).addClass('cmd-clipboard').appendTo(self);
        if (!is_mobile) {
            clip.val(' ');
        }
        if (settings.width) {
            self.width(settings.width);
        }
        var num_chars; // calculated by resize
        var char_width;
        var last_rendered_prompt;
        var prompt_last_line;
        var prompt_len;
        var prompt_node = self.find('.cmd-prompt');
        var reverse_search = false;
        var rev_search_str = '';
        var reverse_search_position = null;
        var backup_prompt;
        // TODO: try to use workerCache with data that don't change like bare_text
        // or format function.
        // TODO: remove workerCache for formatters they require dynamic
        // value of position so data change when you move cursor
        /*
        var formatter = new WorkerCache({
            validation: function() {
                if (this._formatters instanceof Array) {
                    var test = this._formatters.every(function(e, i) {
                        return $.terminal.defaults.formatters[i] === e;
                    });
                    if (!test) {
                        this._formatters = $.terminal.defaults.formatters;
                    }
                    return test;
                }
                return true;
            },
            onCache: function(value) {
                this._counter = this._counter || 0;
                this._counter++;
            },
            action: function(string) {
                this._times = this._times || [];
                var t0 = time();
                // some optimization - don't change object shape and ref
                format_options.position = position;
                string = $.terminal.escape_formatting(string);
                var value = $.terminal.apply_formatters(string, format_options);
                var t1 = time();
                this._times.push(t1 - t0);
                return value;
            }
        });
        */
        var command = '';
        var last_command;
        // text from selection using CTRL+SHIFT+C (as in Xterm)
        var kill_text = ''; // text from command that kill part of the command
        var position = 0;
        var prompt;
        var enabled;
        var formatted_position = 0;
        var name, history;
        var cursor = self.find('.cmd-cursor');
        var animation;
        var restart_animation;
        var paste_count = 0;
        // use \uFFFF to mark newline extra character
        // so we can hide it by css when using text selection
        var line_marker = '\uFFFF';
        var line_marker_re = /\uFFFF$/;
        function get_char_pos(e) {
            var node = $(e.target);
            if (node.is('span,img,a')) {
                node = node.closest('[data-text]');
                return node.index() +
                    node.parent('span').prevAll().find('[data-text]').length +
                    node.closest('[role="presentation"]')
                        .prevUntil('.cmd-prompt').find('[data-text]').length;
            } else if (node.is('div[role="presentation"]')) {
                var last = !node.next().length;
                return node.find('[data-text]').length +
                    node.prevUntil('.cmd-prompt').find('[data-text]').length -
                    (last ? 0 : 1);
            }
        }
        // IE mapping
        var key_mapping = {
            'SPACEBAR': ' ',
            'UP': 'ArrowUP',
            'DOWN': 'ArrowDown',
            'LEFT': 'ArrowLeft',
            'RIGHT': 'ArrowRight',
            'DEL': 'Delete',
            'MULTIPLY': '*',
            'DIVIDE': '/',
            'SUBTRACT': '-',
            'ADD': '+'
        };
        function ie_key_fix(e) {
            var key = e.key.toUpperCase();
            if (key_mapping[key]) {
                return key_mapping[key];
            }
            return key;
        }
        function get_key(e) {
            if (e.key) {
                var key = ie_key_fix(e).toUpperCase();
                if (key === 'CONTROL') {
                    return 'CTRL';
                } else {
                    var combo = [];
                    if (e.ctrlKey) {
                        combo.push('CTRL');
                    }
                    if (e.metaKey && key !== 'META') {
                        combo.push('META');
                    }
                    if (e.shiftKey && key !== 'SHIFT') {
                        combo.push('SHIFT');
                    }
                    if (e.altKey && key !== 'ALT') {
                        combo.push('ALT');
                    }
                    if (combo.length && key === ' ') {
                        key = 'SPACEBAR';
                    }
                    if (e.key) {
                        combo.push(key);
                    }
                    return combo.join('+');
                }
            }
        }
        // -----------------------------------------------------------------
        // for invoking shortcuts using terminal::keydown
        // taken from https://github.com/cvan/keyboardevent-key-polyfill/
        var keycodes = {
            3: 'Cancel',
            6: 'Help',
            8: 'Backspace',
            9: 'Tab',
            12: 'Clear',
            13: 'Enter',
            16: 'Shift',
            17: 'Control',
            18: 'Alt',
            19: 'Pause',
            20: 'CapsLock',
            27: 'Escape',
            28: 'Convert',
            29: 'NonConvert',
            30: 'Accept',
            31: 'ModeChange',
            32: ' ',
            33: 'PageUp',
            34: 'PageDown',
            35: 'End',
            36: 'Home',
            37: 'ArrowLeft',
            38: 'ArrowUp',
            39: 'ArrowRight',
            40: 'ArrowDown',
            41: 'Select',
            42: 'Print',
            43: 'Execute',
            44: 'PrintScreen',
            45: 'Insert',
            46: 'Delete',
            48: ['0', ')'],
            49: ['1', '!'],
            50: ['2', '@'],
            51: ['3', '#'],
            52: ['4', '$'],
            53: ['5', '%'],
            54: ['6', '^'],
            55: ['7', '&'],
            56: ['8', '*'],
            57: ['9', '('],
            91: 'OS',
            93: 'ContextMenu',
            144: 'NumLock',
            145: 'ScrollLock',
            181: 'VolumeMute',
            182: 'VolumeDown',
            183: 'VolumeUp',
            186: [';', ':'],
            187: ['=', '+'],
            188: [',', '<'],
            189: ['-', '_'],
            190: ['.', '>'],
            191: ['/', '?'],
            192: ['`', '~'],
            219: ['[', '{'],
            220: ['\\', '|'],
            221: [']', '}'],
            222: ["'", '"'],
            224: 'Meta',
            225: 'AltGraph',
            246: 'Attn',
            247: 'CrSel',
            248: 'ExSel',
            249: 'EraseEof',
            250: 'Play',
            251: 'ZoomOut'
        };
        var i;
        // Function keys (F1-24).
        for (i = 1; i < 25; i++) {
            keycodes[111 + i] = 'F' + i;
        }
        // Printable ASCII characters.
        var letter = '';
        for (i = 65; i < 91; i++) {
            letter = String.fromCharCode(i);
            keycodes[i] = [letter.toLowerCase(), letter.toUpperCase()];
        }
        var reversed_keycodes = {};
        Object.keys(keycodes).forEach(function(which) {
            if (is_array(keycodes[which])) {
                keycodes[which].forEach(function(key) {
                    reversed_keycodes[key.toUpperCase()] = which;
                });
            } else {
                reversed_keycodes[keycodes[which].toUpperCase()] = which;
            }
        });
        // -----------------------------------------------------------------
        var keymap;
        var default_keymap = {
            'ALT+D': delete_forward({clipboard: true}),
            'HOLD+ALT+D': delete_forward({clipboard: true, hold: true}),
            'HOLD+DELETE': delete_forward({clipboard: false, hold: true}),
            'HOLD+SHIFT+DELETE': delete_forward({clipboard: false, hold: true}),
            'ENTER': function() {
                if (history && command && !settings.mask &&
                    ((is_function(settings.historyFilter) &&
                      settings.historyFilter(command)) ||
                     (settings.historyFilter instanceof RegExp &&
                      command.match(settings.historyFilter)) ||
                     !settings.historyFilter)) {
                    history.append(command);
                }
                var tmp = command;
                history.reset();

                // for next input event on firefox/android with google keyboard
                prev_command = '';
                no_keydown = true;

                self.set('');
                var promise;
                if (settings.commands) {
                    promise = settings.commands.call(self, tmp);
                }
                if (is_function(prompt)) {
                    if (promise && is_function(promise.then)) {
                        promise.then(draw_prompt);
                    } else {
                        draw_prompt();
                    }
                }
                clip.val('');
                return false;
            },
            'SHIFT+ENTER': function() {
                self.insert('\n');
                return true;
            },
            'BACKSPACE': backspace_key,
            'SHIFT+BACKSPACE': backspace_key,
            'TAB': function() {
                self.insert('\t');
            },
            'CTRL+D': function() {
                self['delete'](1);
                return false;
            },
            'DELETE': function() {
                self['delete'](1);
                return true;
            },
            'HOLD+ARROWUP': up_arrow,
            'ARROWUP': up_arrow,
            'CTRL+P': prev_history,
            'ARROWDOWN': down_arrow,
            'HOLD+ARROWDOWN': down_arrow,
            'CTRL+N': next_history,
            'ARROWLEFT': left,
            'HOLD+ARROWLEFT': debounce(left, 10),
            'CTRL+B': left,
            'CTRL+ARROWLEFT': function() {
                // jump to one character after last space before prevoius word
                var len = position - 1;
                var pos = 0;
                if (command[len] === ' ') {
                    --len;
                }
                for (var i = len; i > 0; --i) {
                    if (command[i] === ' ' && command[i + 1] !== ' ') {
                        pos = i + 1;
                        break;
                    } else if (command[i] === '\n' &&
                               command[i + 1] !== '\n') {
                        pos = i;
                        break;
                    }
                }
                self.position(pos);
            },
            'CTRL+R': function() {
                if (reverse_search) {
                    reverse_history_search(true);
                } else {
                    backup_prompt = prompt;
                    draw_reverse_prompt();
                    last_command = command;
                    self.set('');
                    redraw();
                    reverse_search = true;
                }
                return false;
            },
            'CTRL+G': function() {
                if (reverse_search) {
                    prompt = backup_prompt;
                    draw_prompt();
                    self.set(last_command);
                    redraw();
                    reverse_search = false;
                    rev_search_str = '';
                    return false;
                }
            },
            'ARROWRIGHT': right,
            'HOLD+ARROWRIGHT': debounce(right, 10),
            'CTRL+F': right,
            'CTRL+ARROWRIGHT': function() {
                // jump to beginning or end of the word
                if (command[position] === ' ') {
                    ++position;
                }
                var re = /\S[\n\s]{2,}|[\n\s]+\S?/;
                var match = command.slice(position).match(re);
                if (!match || match[0].match(/^\s+$/)) {
                    self.position(text(command).length);
                } else if (match[0][0] !== ' ') {
                    position += match.index + 1;
                } else {
                    position += match.index + match[0].length - 1;
                    if (match[0][match[0].length - 1] !== ' ') {
                        --position;
                    }
                }
                redraw();
            },
            'F12': return_true, // Allow Firebug
            'END': end(true),
            'CTRL+END': end(),
            'CTRL+E': end(),
            'HOME': home(true),
            'CTRL+HOME': home(),
            'CTRL+A': home(),
            'SHIFT+INSERT': paste_event,
            'CTRL+SHIFT+T': return_true, // open closed tab
            'CTRL+W': delete_backward({clipboard: true, hold: false}),
            'HOLD+BACKSPACE': delete_backward({clipboard: false, hold: true}),
            'HOLD+SHIFT+BACKSPACE': delete_backward({clipboard: false, hold: true}),
            'CTRL+H': function() {
                if (command !== '' && position > 0) {
                    self['delete'](-1);
                }
                return false;
            },
            'CTRL+X': return_true,
            'CTRL+C': return_true,
            'CTRL+T': return_true,
            'CTRL+Y': function() {
                if (kill_text !== '') {
                    self.insert(kill_text);
                }
            },
            'CTRL+V': paste_event,
            'META+V': paste_event,
            'CTRL+K': function() {
                var len = text(command).length;
                if (len > position) {
                    kill_text = self['delete'](len - position);
                    text_to_clipboard(clip, kill_text);
                }
                return false;
            },
            'CTRL+U': function() {
                if (command !== '' && position !== 0) {
                    kill_text = self['delete'](-position);
                    text_to_clipboard(clip, kill_text);
                }
                return false;
            },
            'CTRL+TAB': function() {
                return false;
            },
            'META+`': return_true, // CMD+` switch browser window on Mac
            'META+R': return_true, // CMD+R page reload in Chrome Mac
            'META+L': return_true // CLD+L jump into Ominbox on Chrome Mac
        };
        // -------------------------------------------------------------------------------
        function delete_forward(options) {
            options = options || {};
            if (options.hold && !settings.mobileDelete) {
                return function delete_character_forward() {
                    self['delete'](1);
                    return false;
                };
            }
            return function delete_word_forward() {
                var re = / *[^ ]+ *(?= )|[^ ]+$/;
                var substring = command.slice(position);
                var m = substring.match(re);
                if (m) {
                    kill_text = m[0];
                    if (options.clipboard) {
                        text_to_clipboard(clip, kill_text);
                    }
                }
                self.set(
                    command.slice(0, position) +
                        command.slice(position).replace(re, ''),
                    true
                );
                // chrome jump to address bar
                return false;
            };
        }
        // -------------------------------------------------------------------------------
        function delete_backward(options) {
            options = options || {};
            if (options.hold && !settings.mobileDelete) {
                return function delete_character_backward() {
                    self['delete'](-1);
                };
            }
            return function delete_word_backward() {
                // don't work in Chromium (can't prevent close tab)
                if (command !== '' && position !== 0) {
                    var m = command.slice(0, position).match(/([^ ]* *$)/);
                    if (m[0].length) {
                        kill_text = self['delete'](-m[0].length);
                        if (options.clipboard) {
                            text_to_clipboard(clip, kill_text);
                        }
                    }
                }
                return false;
            };
        }
        // -------------------------------------------------------------------------------
        function return_true() {
            return true;
        }
        // -------------------------------------------------------------------------------
        function paste_event() {
            clip.val('');
            paste_count = 0;
            if (self.isenabled() && !clip.is(':focus')) {
                clip.trigger('focus', [true]);
            }
            clip.one('input', paste);
            return true;
        }
        // ---------------------------------------------------------------------
        // :: Paste content to terminal using hidden textarea
        // ---------------------------------------------------------------------
        function paste() {
            if (paste_count++ > 0) {
                return;
            }
            function set() {
                clip.val(command);
                fix_textarea();
            }
            function insert(text) {
                self.insert(text);
                set();
            }
            if (self.isenabled()) {
                //wait until Browser insert text to textarea
                self.oneTime(100, function() {
                    var value = clip.val();
                    if (is_function(settings.onPaste)) {
                        var ret = settings.onPaste.call(self, {
                            target: self,
                            text: value
                        });
                        if (ret !== undefined) {
                            if (ret && is_function(ret.then || ret.done)) {
                                (ret.then || ret.done).call(ret, insert);
                            } else if (typeof ret === 'string') {
                                insert(ret);
                            } else if (ret === false) {
                                set();
                            }
                            return;
                        }
                    }
                    insert(value);
                });
            }
        }
        // -------------------------------------------------------------------------------
        function prev_history() {
            if (first_up_history) {
                last_command = command;
                self.set(history.current());
            } else {
                self.set(history.previous());
            }
            first_up_history = false;
            return false;
        }
        // -------------------------------------------------------------------------------
        function next_history() {
            self.set(history.end() ? last_command : history.next());
            return false;
        }
        // -------------------------------------------------------------------------------
        function have_newlines(string) {
            return string.match(/\n/);
        }
        // -------------------------------------------------------------------------------
        function match_column(re, string, col) {
            var match = string.match(re);
            if (have_newlines(string)) {
                return match && match[1].length <= col;
            } else {
                return match && match[1].length <= col - prompt_len;
            }
        }
        // -------------------------------------------------------------------------------
        function up_arrow() {
            var before = command.substring(0, position);
            var re = /\n?([^\n]+)$/;
            var col = self.column();
            if (have_newlines(before)) {
                for (var i = before.length - col - 1; i--;) {
                    if (before[i] === '\n') {
                        break;
                    }
                    var str = before.substring(0, i);
                    if (match_column(re, str, col)) {
                        break;
                    }
                }
                self.position(i);
                return false;
            } else {
                return prev_history();
            }
        }
        // -------------------------------------------------------------------------------
        function down_arrow() {
            var after = command.substring(position);
            var col = self.column();
            if (have_newlines(after)) {
                var before = command.substring(0, position);
                var match = after.match(/^[^\n]*\n/);
                if (match) {
                    var new_pos = col + match[0].length;
                    if (!have_newlines(before)) {
                        new_pos += prompt_len;
                    }
                    self.position(new_pos, true);
                }
                return false;
            } else {
                return next_history();
            }
        }
        // -------------------------------------------------------------------------------
        function backspace_key() {
            if (reverse_search) {
                rev_search_str = rev_search_str.slice(0, -1);
                draw_reverse_prompt();
            } else if (command !== '' && position > 0) {
                self['delete'](-1);
            }
            // for next input after naitve backspace
            // we need timeout because we don't want it to trigger
            // for current input but next one
            self.oneTime(1, function() {
                no_keydown = true;
            });
        }
        // -------------------------------------------------------------------------------
        function left() {
            if (position > 0) {
                self.position(-1, true);
            }
        }
        // -------------------------------------------------------------------------------
        function right() {
            if (position < bare_text(command).length) {
                self.position(1, true);
            }
            return false;
        }
        // -------------------------------------------------------------------------------
        function home(line) {
            function home() {
                self.position(0);
            }
            if (line) {
                return function() {
                    if (command.match(/\n/)) {
                        var string = command.substring(0, self.position());
                        self.position(string.lastIndexOf('\n') + 1);
                    } else {
                        home();
                    }
                };
            } else {
                return home;
            }
        }
        // -------------------------------------------------------------------------------
        function end(line) {
            function end() {
                self.position(text(command).length);
            }
            if (line) {
                return function() {
                    if (command.match(/\n/)) {
                        var lines = command.split('\n');
                        var pos = self.position();
                        var sum = 0;
                        for (var i = 0; i < lines.length; ++i) {
                            sum += lines[i].length;
                            if (sum > pos) {
                                self.position(sum + i);
                                return;
                            }
                        }
                    }
                    end();
                };
            } else {
                return end;
            }
        }
        // -------------------------------------------------------------------------------
        function mobile_focus() {
            //if (is_touch) {
            var focus = clip.is(':focus');
            if (enabled) {
                if (!focus) {
                    //clip.trigger('focus', [true]);
                }
                self.oneTime(10, function() {
                    if (!clip.is(':focus') && enabled) {
                        clip.trigger('focus', [true]);
                    }
                });
            } else if (focus && (is_mobile || !enabled)) {
                clip.trigger('blur', [true]);
            }
        }
        // -------------------------------------------------------------------------------
        // fix for .cursor span animation that should only be applied when
        // animation is equal to terminal-blink
        // -------------------------------------------------------------------------------
        function fix_cursor() {
            if (animation_supported) {
                var style = window.getComputedStyle(cursor[0]);
                var animationName = style.getPropertyValue('--animation');
                animationName = animationName.replace(/^\s*|\s*$/g, '');
                var _class = self.attr('class');
                if (_class.match(/-animation/)) {
                    _class = _class.replace(/[a-z]+-animation/g, '');
                }
                if (animationName && !animationName.match(/blink/)) {
                    var className = animationName.replace(/terminal-/, '') + '-animation';
                    if (!_class.match(className)) {
                        _class += ' ' + className;
                    }
                }
                _class = _class.replace(/\s+/g, ' ');
                if (_class !== self.attr('class').replace(/\s+/g, ' ')) {
                    self.attr('class', _class);
                }
            }
        }
        // -------------------------------------------------------------------------------
        // on mobile you can't delete character if input is empty (event
        // will not fire) so we fake text entry, we could just put dummy
        // data but we put real command and position
        // -------------------------------------------------------------------------------
        function fix_textarea(position_only) {
            if (!self.isenabled()) {
                return;
            }
            // delay worked while experimenting
            self.oneTime(10, function() {
                // we use space before command to show select all context menu
                // idea taken from CodeMirror
                if (!is_mobile && clip.val() !== command && !position_only) {
                    clip.val(' ' + command);
                }
                if (enabled) {
                    self.oneTime(10, function() {
                        try {
                            // we check first to improve performance
                            if (!is_mobile && clip.caret() !== position + 1) {
                                clip.caret(position + 1);
                            }
                        } catch (e) {
                            // firefox throw NS_ERROR_FAILURE ignore
                        }
                    });
                }
            });
        }
        // -------------------------------------------------------------------------------
        // terminal animation don't work on android because they animate
        // 2 properties
        // -------------------------------------------------------------------------------
        if (animation_supported && !is_android) {
            animation = function(toggle) {
                if (toggle) {
                    cursor.addClass('cmd-blink');
                } else {
                    cursor.removeClass('cmd-blink');
                }
            };
            restart_animation = function() {
                var new_cursor = cursor.clone();
                new_cursor.insertBefore(cursor);
                cursor.remove();
                cursor = new_cursor;
            };
        } else {
            var animating = false;
            animation = function(toggle) {
                if (toggle && !animating) {
                    animating = true;
                    cursor.addClass('cmd-inverted cmd-blink');
                    self.everyTime(500, 'blink', blink);
                } else if (animating && !toggle) {
                    animating = false;
                    self.stopTime('blink', blink);
                    cursor.removeClass('cmd-inverted cmd-blink');
                }
            };
            restart_animation = function() {
                animation(false);
                animation(true);
            };
        }
        // ---------------------------------------------------------------------
        // :: Blinking cursor function
        // ---------------------------------------------------------------------
        function blink() {
            cursor.toggleClass('cmd-inverted');
        }
        // ---------------------------------------------------------------------
        // :: Set prompt for reverse search
        // ---------------------------------------------------------------------
        function draw_reverse_prompt() {
            prompt = '(reverse-i-search)`' + rev_search_str + "': ";
            draw_prompt();
        }
        // ---------------------------------------------------------------------
        // :: Disable reverse search
        // ---------------------------------------------------------------------
        function clear_reverse_state() {
            prompt = backup_prompt;
            reverse_search = false;
            reverse_search_position = null;
            rev_search_str = '';
        }
        // ---------------------------------------------------------------------
        // :: Search through command line history. If next is not defined or
        // :: false it searches for the first item from the end. If true it
        // :: search for the next item
        // ---------------------------------------------------------------------
        function reverse_history_search(next) {
            var history_data = history.data();
            var regex, save_string;
            var len = history_data.length;
            if (next && reverse_search_position > 0) {
                len -= reverse_search_position;
            }
            if (rev_search_str.length > 0) {
                for (var j = rev_search_str.length; j > 0; j--) {
                    save_string = $.terminal.escape_regex(rev_search_str.slice(0, j));
                    if (settings.caseSensitiveSearch) {
                        regex = new RegExp(save_string);
                    } else {
                        regex = new RegExp(save_string, 'i');
                    }
                    for (var i = len; i--;) {
                        if (regex.test(history_data[i])) {
                            reverse_search_position = history_data.length - i;
                            self.position(history_data[i].indexOf(save_string));
                            self.set(history_data[i], true);
                            redraw();
                            if (rev_search_str.length !== j) {
                                rev_search_str = rev_search_str.slice(0, j);
                                draw_reverse_prompt();
                            }
                            return;
                        }
                    }
                }
            }
            rev_search_str = ''; // clear if not found any
        }
        // ---------------------------------------------------------------------
        // :: calculate width of hte character
        // ---------------------------------------------------------------------
        function get_char_width() {
            var $prompt = self.find('.cmd-prompt');
            var html = $prompt.html();
            $prompt.html('<span>&nbsp;</span>');
            var width = $prompt.find('span')[0].getBoundingClientRect().width;
            $prompt.html(html);
            return width;
        }
        // ---------------------------------------------------------------------
        // :: return number of characters in command line
        // ---------------------------------------------------------------------
        function get_num_chars(char_width) {
            var width = self.width();
            return Math.floor(width / char_width);
        }
        // ---------------------------------------------------------------------
        // :: Split String that fit into command line where first line need to
        // :: fit next to prompt (need to have less characters)
        // ---------------------------------------------------------------------
        function get_splitted_command_line(string) {
            function split(string) {
                return $.terminal.split_equal(string, num_chars);
            }
            function skip_empty(array) {
                // we remove lines that are leftovers after adding space at the end
                return array.filter(function(line) {
                    return !$.terminal.strip(line).match(/^ $/);
                });
            }
            var line = prompt_node.find('.cmd-line');
            var prompt;
            if (line.length) {
                prompt = line.nextUntil('.cmd-line').text();
            } else {
                prompt = prompt_node.text();
            }
            prompt = $.terminal.escape_brackets(prompt);
            var re = new RegExp('^' + $.terminal.escape_regex(prompt));
            var array;
            if (string.match(/\n/)) {
                var tmp = string.split('\n');
                var first_len = num_chars - prompt_len - 1;
                for (var i = 0; i < tmp.length - 1; ++i) {
                    tmp[i] += line_marker;
                }
                // split first line
                if (strlen(tmp[0]) > first_len) {
                    array = split(prompt + tmp[0]);
                    array[0] = array[0].replace(re, '');
                    array = skip_empty(array);
                } else {
                    array = [tmp[0]];
                }
                // process rest of the lines
                for (i = 1; i < tmp.length; ++i) {
                    if (strlen(tmp[i]) > num_chars) {
                        var splitted = split(tmp[i]);
                        if (i < tmp.length - 1) {
                            splitted = skip_empty(splitted);
                        }
                        array = array.concat(splitted);
                    } else {
                        array.push(tmp[i]);
                    }
                }
            } else {
                array = split(prompt + string, num_chars);
                array[0] = array[0].replace(re, '');
            }
            // fix issue with cursor that was cut off #379
            if (array.length > 1 && array[array.length - 1].length === num_chars) {
                array.push('');
            }
            return array;
        }
        // ---------------------------------------------------------------------
        // :: use custom formatting
        // ---------------------------------------------------------------------
        function formatting(string, skip_formatted_position) {
            // we don't want to format command when user type formatting in
            try {
                string = $.terminal.escape_formatting(string);
                var format_options = $.extend({}, settings, {
                    unixFormattingEscapeBrackets: true,
                    position: position
                });
                var formatted = $.terminal.apply_formatters(string, format_options);
                var output = $.terminal.normalize(formatted[0]);
                var max = $.terminal.length(output);
                if (!skip_formatted_position) {
                    formatted_position = formatted[1];
                    // fix issue with nested formatting where max length
                    // is checked before nested_formatting flatten formatting
                    if (formatted_position > max) {
                        formatted_position = max;
                    }
                }
                output = $.terminal.normalize(output);
                return output;
            } catch (e) {
                alert_exception('[Formatting]', e.stack);
                return string;
            }
        }
        // ---------------------------------------------------------------------
        // :: format and encode the string
        // ---------------------------------------------------------------------
        function format(string, before) {
            //string = $.terminal.normalize(string);
            var encoded = $.terminal.encode(wrap(string), {
                tabs: settings.tabs,
                before: before
            });
            string = $.terminal.format(encoded, {
                char_width: settings.char_width,
                allowedAttributes: settings.allowedAttributes || []
            });
            var re = /(<span[^>]+data-text[^>]+>)(.*?)(<\/span>)/g;
            return string.replace(re, '$1<span>$2</span>$3');
        }
        // ---------------------------------------------------------------------
        // :: function create new string with all characters in it's own
        // :: formatting - it will only have style if the input is formatting
        // :: this function is not very usefull so it's not in $.terminal
        // ---------------------------------------------------------------------
        function wrap(string) {
            return $.terminal.partition(string).join('');
        }
        // ---------------------------------------------------------------------
        // :: shortcut helpers
        // ---------------------------------------------------------------------
        function length(str, raw) {
            return $.terminal.length(str, raw);
        }
        // ---------------------------------------------------------------------
        function substring(str, start, end) {
            return $.terminal.substring(str, start, end);
        }
        // ---------------------------------------------------------------------
        // :: Function that displays the command line. Split long lines and
        // :: place cursor in the right place
        // ---------------------------------------------------------------------
        var redraw = (function() {
            var before = cursor.prev();
            var after = cursor.next();
            var cursor_line = cursor.parent();
            // -----------------------------------------------------------------
            // :: Draw line with the cursor
            // -----------------------------------------------------------------
            function draw_cursor_line(string, options) {
                var end_line = string.match(line_marker_re);
                if (end_line) {
                    string = string.replace(line_marker_re, ' ');
                }
                var cursor_end_line = false;
                var settings = $.extend({
                    prompt: '',
                    last: false
                }, options);
                var position = settings.position;
                var len = length(string);
                var prompt = settings.prompt;
                if (ch_unit_bug) {
                    cursor.width(char_width);
                }
                var c;
                if (position === len) {
                    before.html(format(string));
                    cursor.html('<span><span>&nbsp;</span></span>');
                    after.html('');
                } else if (position === 0) {
                    before.html('');
                    c = substring(string, 0, 1);
                    cursor.html(format(c));
                    after.html(format(substring(string, 1), prompt + c));
                } else {
                    var before_str = $.terminal.substring(string, 0, position);
                    before.html(format(before_str, prompt));
                    c = substring(string, position, position + 1);
                    var c_before = (prompt + before_str).replace(/^.*\t/, '');
                    cursor.html(format(c, c_before));
                    if (position === len - 1) {
                        cursor_end_line = true;
                        after.html('');
                    } else {
                        if (c.match(/\t/)) {
                            c_before = '';
                        } else {
                            c_before += c;
                        }
                        after.html(format(substring(string, position + 1), c_before));
                    }
                }
                cursor.toggleClass('cmd-end-line', cursor_end_line);
                // fix for animation when changing --animation dynamically
                fix_cursor();
                var cursor_len = $.terminal.length(cursor.text());
                if (cursor_len > 1) {
                    var node = cursor.find('[data-text]')[0];
                    node.style.setProperty('--length', cursor_len);
                }
                // synchronize css animations (it's not that important because if user
                // will change animation she should disable animation on span, but it
                // looks nicer until she disable that inner animation)
                restart_animation();
            }
            function div(string, before) {
                var end_line = string.match(line_marker_re);
                var result = '<div role="presentation" aria-hidden="true"';
                if (end_line) {
                    string = string.replace(line_marker_re, ' ');
                    result += ' class="cmd-end-line"';
                }
                result += '>' + format(string, before || '') + '</div>';
                return result;
            }
            // -----------------------------------------------------------------
            // :: Display lines after the cursor
            // -----------------------------------------------------------------
            function lines_after(lines) {
                var last_ins = cursor_line;
                $.each(lines, function(i, line) {
                    last_ins = $(div(line)).insertAfter(last_ins);
                });
            }
            // -----------------------------------------------------------------
            // :: Display lines before the cursor
            // -----------------------------------------------------------------
            function lines_before(lines) {
                $.each(lines, function(i, line) {
                    cursor_line.before(div(line, i === 0 ? prompt_last_line : ''));
                });
            }
            // -----------------------------------------------------------------
            // :: Redraw function
            // -----------------------------------------------------------------
            return function() {
                var string;
                switch (typeof settings.mask) {
                    case 'boolean':
                        string = settings.mask ? command.replace(/./g, '*') : command;
                        break;
                    case 'string':
                        string = command.replace(/./g, settings.mask);
                        break;
                }
                var formatted = formatting(string);
                var pos;
                if (length(formatted) === text(string).length) {
                    pos = position;
                } else {
                    pos = formatted_position;
                }
                var i;
                wrapper.css('visibility', 'hidden');
                wrapper.find('div:not(.cmd-cursor-line)').remove();
                before.html('');
                // long line
                if (strlen(text(formatted)) > num_chars - prompt_len - 1 ||
                    formatted.match(/\n/)) {
                    var tabs = formatted.match(/\t/g);
                    var original_string = formatted;
                    //quick tabulation hack
                    if (tabs) {
                        formatted = formatted.replace(/\t/g, '\x00\x00\x00\x00');
                    }
                    var array = get_splitted_command_line(formatted);
                    if (tabs) {
                        array = $.map(array, function(line) {
                            return line.replace(/\x00\x00\x00\x00/g, '\t');
                        });
                    }
                    var first_len = length(array[0]);
                    //cursor in first line
                    if (first_len === 0 && array.length === 1) {
                        // skip empty line
                    } else if (pos < first_len) {
                        draw_cursor_line(array[0], {
                            length: array.length,
                            position: pos,
                            prompt: prompt_last_line
                        });
                        lines_after(array.slice(1));
                    } else if (pos === first_len) {
                        // first char acter of second line
                        cursor_line.before(div(array[0], prompt_last_line));
                        draw_cursor_line(array[1] || '', {
                            length: array.length,
                            position: 0,
                            last: array.length <= 2
                        });
                        if (array.length > 2) {
                            lines_after(array.slice(2));
                        }
                    } else {
                        var last = array.slice(-1)[0];
                        var len = length(original_string);
                        var from_last = len - pos;
                        var last_len = length(last);
                        var new_pos = 0;
                        if (from_last === -1) {
                            from_last = 0;
                        }
                        if (from_last <= last_len) { // in last line
                            lines_before(array.slice(0, -1));
                            if (last_len === from_last) {
                                new_pos = 0;
                            } else {
                                new_pos = last_len - from_last;
                            }
                            draw_cursor_line(last, {
                                length: array.length,
                                position: new_pos,
                                last: true
                            });
                        } else {
                            // more lines, cursor in the middle
                            var line_index;
                            var current;
                            new_pos = pos;
                            for (i = 0; i < array.length; ++i) {
                                var current_len = $.terminal.length(array[i]);
                                if (new_pos > current_len) {
                                    new_pos -= current_len;
                                } else {
                                    break;
                                }
                            }
                            current = array[i];
                            line_index = i;
                            // cursor on first character in line
                            if (new_pos === length(current)) {
                                new_pos = 0;
                                current = array[++line_index];
                                if (current === undefined) {
                                    //should never happen
                                    var msg = $.terminal.defaults.strings.redrawError;
                                    throw new Error(msg);
                                }
                            }
                            draw_cursor_line(current, {
                                length: array.length,
                                position: new_pos
                            });
                            lines_before(array.slice(0, line_index));
                            lines_after(array.slice(line_index + 1));
                        }
                    }
                    self.find('.cmd-cursor-line ~ div:last-of-type')
                        .append('<span></span>');
                } else if (formatted === '') {
                    before.html('');
                    cursor.html('<span><span>&nbsp;</span></span>');
                    after.html('');
                } else {
                    draw_cursor_line(formatted, {
                        length: 1,
                        position: pos
                    });
                }
                var in_line = cursor_line.prevUntil('.cmd-prompt').length;
                if (is_css_variables_supported) {
                    self[0].style.setProperty('--cursor-line', in_line);
                } else {
                    clip.css('top', in_line * 14 + 'px');
                }
                wrapper.css('visibility', '');
            };
        })();
        // ---------------------------------------------------------------------
        // :: find position that match display position for commands that
        // :: change length by formatters
        // ---------------------------------------------------------------------
        var find_position = (function() {
            function make_guess(string, position) {
                var opts = $.extend({}, settings, {
                    position: position
                });
                return $.terminal.apply_formatters(string, opts)[1];
            }
            function cmp(search_pos, pos, string) {
                var guess = make_guess(string, pos);
                if (guess === search_pos) {
                    var next_guess = make_guess(string, pos + 1);
                    if (next_guess > search_pos) {
                        return 0;
                    }
                    return 1;
                } else if (guess < search_pos) {
                    return 1;
                } else {
                    return -1;
                }
            }
            return function(string, formatted_position) {
                if (formatted_position === 0) {
                    return 0;
                }
                string = bare_text(string);
                var codepoint_len = string.length;
                var str = $.terminal.escape_brackets(command);
                var pos = binary_search(0, codepoint_len, formatted_position, cmp, [str]);
                var chars = $.terminal.split_characters(string);
                if (codepoint_len > chars.length) {
                    var len = 0;
                    for (var i = 0; i < chars.length; ++i) {
                        len += chars[i].length;
                        if (len >= pos) {
                            return len;
                        }
                    }
                }
                return pos;
            };
        })();
        // ---------------------------------------------------------------------
        // :: Draw prompt that can be a function or a string
        // ---------------------------------------------------------------------
        var prev_prompt_data;
        var draw_prompt = (function() {
            function set(prompt) {
                prompt = $.terminal.apply_formatters(prompt, {});
                prompt = $.terminal.normalize(prompt);
                prompt = crlf(prompt);
                last_rendered_prompt = prompt;
                var lines = $.terminal.split_equal(prompt, num_chars).map(function(line) {
                    if (!$.terminal.have_formatting(line)) {
                        return '[[;;]' + line + ']';
                    }
                    return line;
                });
                var options = {
                    char_width: settings.char_width
                };
                prompt_last_line = lines[lines.length - 1];
                var encoded_last_line = $.terminal.encode(lines[lines.length - 1], {
                    tabs: settings.tabs
                });
                var last_line = $.terminal.format(encoded_last_line, options);
                var formatted = lines.slice(0, -1).map(function(line) {
                    line = $.terminal.encode(line, {
                        tabs: settings.tabs
                    });
                    return '<span class="cmd-line">' +
                        $.terminal.format(line, options) +
                        '</span>';
                }).concat([last_line]).join('\n');
                // update prompt if changed
                if (prompt_node.html() !== formatted) {
                    prompt_node.html(formatted);
                    prompt_len = strlen(text(encoded_last_line));
                }
            }
            return function() {
                // the data is used as cancelable reference because we have ref
                // data object that is hold in closure and we remove `set` function
                // so previous call to function prompt will be ignored
                if (prev_prompt_data && prev_prompt_data.set) {
                    prev_prompt_data.set = $.noop;
                    // remove reference for garbage collector
                    prev_prompt_data = null;
                }
                switch (typeof prompt) {
                    case 'string':
                        set(prompt);
                        break;
                    case 'function':
                        var data = prev_prompt_data = {
                            set: set
                        };
                        var ret = prompt.call(self, function(string) {
                            data.set(string);
                        });
                        if (ret && ret.then) {
                            ret.then(data.set).catch(function(e) {
                                var prompt = $.terminal.escape_brackets('[ERR]> ');
                                data.set('[[;red;]' + prompt + ']');
                                alert_exception('Prompt', e);
                            });
                        }
                        break;
                }
            };
        })();
        // ---------------------------------------------------------------------
        function fire_change_command() {
            if (is_function(settings.onCommandChange)) {
                settings.onCommandChange.call(self, command);
            }
        }
        // ---------------------------------------------------------------------
        function clean(string) {
            return string.replace(/((?!\\).)\\(?:&#93;|])/g, '$1&#93;');
        }
        // ---------------------------------------------------------------------
        // :: Command Line Methods
        // ---------------------------------------------------------------------
        $.extend(self, {
            option: function(name, value) {
                if (typeof value === 'undefined') {
                    return settings[name];
                } else {
                    settings[name] = value;
                }
                return self;
            },
            name: function(string) {
                if (string !== undefined) {
                    name = string;
                    var enabled = history && history.enabled() || !history;
                    history = new History(
                        name,
                        settings.historySize,
                        settings.history === 'memory'
                    );
                    // disable new history if old was disabled
                    if (!enabled) {
                        history.disable();
                    }
                    return self;
                } else {
                    return name;
                }
            },
            purge: function() {
                history.clear();
                return self;
            },
            history: function() {
                return history;
            },
            'delete': function(n, stay) {
                var removed, string;
                if (n === 0) {
                    return "";
                } else if (n < 0) {
                    if (position > 0) {
                        // this may look weird but if n is negative we need
                        // to use +
                        removed = command.slice(0, position).slice(n);
                        string = bare_text(command);
                        string = string.slice(0, position + n) +
                            string.slice(position, string.length);
                        if (!stay) {
                            self.position(position + n);
                        }
                    }
                } else if (command !== '') {
                    string = text(command);
                    if (position < string.length) {
                        removed = string.slice(position).slice(0, n);
                        string = string.slice(0, position) +
                            string.slice(position + n, string.length);
                    }
                }
                if (removed) {
                    command = clean(string);
                }
                redraw();
                fix_textarea();
                fire_change_command();
                return removed;
            },
            set: function(string, stay, silent) {
                if (string !== undefined) {
                    command = clean(string);
                    if (!stay) {
                        self.position(bare_text(command).length);
                    }
                    redraw();
                    fix_textarea();
                    if (!silent) {
                        fire_change_command();
                    }
                }
                return self;
            },
            keymap: function(new_keymap, value) {
                function wrap(key, fn) {
                    var original = default_keymap[key];
                    if (is_function(original)) {
                        original = original.bind(self);
                    }
                    return function(e) {
                        // new keymap function will get default as 2nd argument
                        return fn.call(self, e, original);
                    };
                }
                if (typeof new_keymap === 'undefined') {
                    return keymap;
                } else if (typeof new_keymap === 'string') {
                    if (typeof value === 'undefined') {
                        if (keymap[new_keymap]) {
                            return keymap[new_keymap];
                        } else if (default_keymap[new_keymap]) {
                            return default_keymap[new_keymap];
                        }
                    } else {
                        keymap[new_keymap] = wrap(new_keymap, value);
                    }
                } else {
                    keymap = $.extend(
                        {},
                        keymap ? keymap : default_keymap,
                        $.omap(new_keymap || {}, wrap)
                    );
                    return self;
                }
            },
            insert: function(string, stay) {
                var bare_command = bare_text(command);
                var len = bare_text(string).length;
                if (position === bare_command.length) {
                    string = bare_command + string;
                } else if (position === 0) {
                    string = string + bare_command;
                } else {
                    string = bare_command.slice(0, position) +
                        string + bare_command.slice(position);
                }
                command = clean(string);
                if (!stay) {
                    self.position(len, true, true);
                }
                fix_textarea();
                redraw();
                fire_change_command();
                return self;
            },
            get: function() {
                return command;
            },
            commands: function(commands) {
                if (commands) {
                    settings.commands = commands;
                    return self;
                } else {
                    return commands;
                }
            },
            destroy: function() {
                doc.unbind('keypress.cmd', keypress_event);
                doc.unbind('keydown.cmd', keydown_event);
                doc.unbind('input.cmd', input_event);
                self.stopTime('blink', blink);
                self.find('.cmd-wrapper').remove();
                self.find('.cmd-prompt, .cmd-clipboard').remove();
                self.removeClass('cmd').removeData('cmd').off('.cmd');
                return self;
            },
            column: function(include_prompt) {
                var before = command.substring(0, position);
                if (position === 0 || !command.length) {
                    return 0;
                }
                var re = /\n?([^\n]*)$/;
                var match = before.match(re);
                var col = match[1].length;
                if (!have_newlines(before) && include_prompt) {
                    col += prompt_len;
                }
                return col;
            },
            prompt: function(user_prompt) {
                if (user_prompt === true) {
                    return last_rendered_prompt;
                } else if (user_prompt === undefined) {
                    return prompt;
                } else {
                    var should_redraw = user_prompt !== prompt;
                    if (typeof user_prompt === 'string' ||
                        typeof user_prompt === 'function') {
                        prompt = user_prompt;
                    } else {
                        throw new Error('prompt must be a function or string');
                    }
                    if (should_redraw) {
                        draw_prompt();
                        // we could check if command is longer then numchars-new
                        // prompt
                        redraw();
                    }
                    return self;
                }
            },
            kill_text: function() {
                return kill_text;
            },
            position: function(n, relative, silent) {
                if (typeof n === 'number') {
                    var pos = position;
                    var len = bare_text(command).length;
                    if (relative) {
                        position += n;
                    } else if (n < 0) {
                        position = 0;
                    } else if (n > len) {
                        position = len;
                    } else {
                        position = n;
                    }
                    if (pos !== position && !silent) {
                        redraw();
                        if (is_function(settings.onPositionChange)) {
                            settings.onPositionChange(position, formatted_position);
                        }
                        fix_textarea(true);
                    }
                    return self;
                } else {
                    return position;
                }
            },
            refresh: function() {
                draw_prompt();
                redraw();
                fix_textarea(true);
                return self;
            },
            // if formatter change length of the strings (like emoji demo) we need to keep
            // track of two different positions one for command and one for display
            display_position: function(n, relative) {
                if (n === undefined) {
                    return formatted_position;
                } else {
                    // double escape
                    var string = formatting($.terminal.escape_formatting(command), true);
                    var len = length(string);
                    var command_len = bare_text(command).length;
                    var new_formatted_pos;
                    if (relative) {
                        new_formatted_pos = formatted_position + n;
                    } else if (n > len) {
                        new_formatted_pos = len;
                    } else {
                        new_formatted_pos = n;
                    }
                    if (text(string).length === length(command, true)) {
                        formatted_position = new_formatted_pos;
                        return self.position(new_formatted_pos);
                    }
                    if (len === new_formatted_pos) {
                        formatted_position = new_formatted_pos;
                        return self.position(command_len);
                    }
                    var pos = find_position(command, new_formatted_pos);
                    if (pos !== -1) {
                        formatted_position = new_formatted_pos;
                        self.position(pos);
                    }
                    return self;
                }
            },
            visible: (function() {
                var visible = self.visible;
                return function() {
                    visible.apply(self, []);
                    redraw();
                    draw_prompt();
                    return self;
                };
            })(),
            show: (function() {
                var show = self.show;
                return function() {
                    show.apply(self, []);
                    redraw();
                    draw_prompt();
                    return self;
                };
            })(),
            resize: function(num) {
                char_width = get_char_width();
                var new_num_chars;
                if (typeof num === 'number') {
                    new_num_chars = num;
                } else {
                    new_num_chars = get_num_chars(char_width);
                }
                if (num_chars !== new_num_chars || arguments[0] === true) {
                    num_chars = new_num_chars;
                    redraw();
                    draw_prompt();
                }
                return self;
            },
            invoke_key: function(shortcut) {
                var keys = shortcut.toUpperCase().split('+');
                var key = keys.pop();
                var ctrl = keys.indexOf('CTRL') !== -1;
                var shift = keys.indexOf('SHIFT') !== -1;
                var alt = keys.indexOf('ALT') !== -1;
                var meta = keys.indexOf('META') !== -1;
                var e = $.Event("keydown", {
                    ctrlKey: ctrl,
                    shiftKey: shift,
                    altKey: alt,
                    metaKey: meta,
                    which: reversed_keycodes[key],
                    key: key
                });
                var doc = $(document.documentElement || window);
                doc.trigger(e);
                e = $.Event("keypress");
                e.key = key;
                e.which = e.keyCode = 0;
                doc.trigger(e);
                return self;
            },
            enable: function(silent) {
                if (!enabled) {
                    enabled = true;
                    self.addClass('enabled');
                    try {
                        if (clip.is(':not(:focus)')) {
                            clip.focus();
                        }
                        clip.caret(position);
                    } catch (e) {
                        // firefox throw NS_ERROR_FAILURE - ignore
                    }
                    animation(true);
                    if (!silent && is_function(prompt)) {
                        draw_prompt();
                    }
                    fix_cursor();
                    fix_textarea();
                }
                mobile_focus();
                return self;
            },
            isenabled: function() {
                return enabled;
            },
            disable: function(focus) {
                enabled = false;
                self.removeClass('enabled');
                animation(false);
                if (!focus) {
                    mobile_focus();
                }
                return self;
            },
            mask: function(new_mask) {
                if (typeof new_mask === 'undefined') {
                    return settings.mask;
                } else {
                    settings.mask = new_mask;
                    redraw();
                    return self;
                }
            }
        });
        // ---------------------------------------------------------------------
        // :: INIT
        // ---------------------------------------------------------------------
        self.name(settings.name || settings.prompt || '');
        if (settings.prompt !== false) {
            prompt = settings.prompt;
            draw_prompt();
        }
        if (settings.enabled === true) {
            self.enable();
        }
        char_width = get_char_width();
        num_chars = get_num_chars(char_width);
        if (!settings.history) {
            history.disable();
        }
        var first_up_history = true;
        // skip_keypress - hack for Android that was inserting characters on
        // backspace
        var skip_keypress = false;
        var dead_key = false;
        var single_key = false;
        var no_keypress = false;
        var no_key = false;
        var no_keydown = true;
        var backspace = false;
        var process = false;
        var hold = false;
        var hold_pause = false;
        var skip_insert;
        // we hold text before keydown to fix backspace for Android/Chrome/SwiftKey
        // keyboard that generate keycode 229 for all keys #296
        var prev_command = '';
        var prev_key;
        // ---------------------------------------------------------------------
        // :: Keydown Event Handler
        // ---------------------------------------------------------------------
        function is_backspace(e) {
            return e.key.toUpperCase() === 'BACKSPACE' || e.which === 8;
        }
        // ---------------------------------------------------------------------
        function is_single(e) {
            return e.key && e.key.length === 1 && !e.ctrlKey;
        }
        // ---------------------------------------------------------------------
        function is_delay_key(key) {
            var specials = ['HOLD+SHIFT+BACKSPACE', 'HOLD+BACKSPACE'];
            return specials.indexOf(key) !== -1 && settings.mobileDelete ||
                settings.repeatTimeoutKeys.indexOf(key) !== -1;
        }
        // ---------------------------------------------------------------------
        function clear_reverse_search_key(e) {
            // arrows / Home / End / ENTER
            return e.which === 35 || e.which === 36 ||
                e.which === 37 || e.which === 38 ||
                e.which === 39 || e.which === 40 ||
                e.which === 13 || e.which === 27;
        }
        var skip_keydown = false;
        // ---------------------------------------------------------------------
        // function complexicity is 35 when adding this exception
        // eslint-disable-next-line complexity
        function keydown_event(e) {
            debug('keydown "' + e.key + '" ' + e.fake + ' ' + e.which);
            var result;
            process = (e.key || '').toLowerCase() === 'process' || e.which === 0;
            dead_key = no_keypress && single_key && !is_backspace(e);
            // special keys don't trigger keypress fix #293
            try {
                if (!e.fake) {
                    single_key = is_single(e);
                    // chrome on android support key property but it's "Unidentified"
                    no_key = String(e.key).toLowerCase() === 'unidentified';
                    backspace = is_backspace(e);
                }
            } catch (exception) {}
            // keydown created in input will have text already inserted and we
            // want text before input
            if (e.key === "Unidentified") {
                no_keydown = true;
                // android swift keyboard have always which == 229 we will triger proper
                // event in input with e.fake == true
                return;
            }
            if (!e.fake) {
                no_keydown = false;
            }
            no_keypress = true;
            // Meta+V did bind input but it didin't happen because terminal paste
            // prevent native insert action
            clip.off('input', paste);
            var key = get_key(e);
            if (is_function(settings.keydown)) {
                e.key = ie_key_fix(e);
                result = settings.keydown.call(self, e);
                if (result !== undefined) {
                    //skip_keypress = true;
                    if (!result) {
                        skip_insert = true;
                    }
                    return result;
                }
            }
            if (key !== prev_key) {
                clear_hold();
            }
            // CTRL+C hanlding is only exception of cmd aware terminal logic
            // cmd need to call CTRL+C keymap when terminal is not enabled
            if (enabled || (key === 'CTRL+C' && is_terminal_selected(self))) {
                if (hold) {
                    prev_key = key;
                    key = 'HOLD+' + key;
                    if (hold_pause) {
                        return;
                    }
                    if (settings.holdRepeatTimeout > 0 && is_delay_key(key)) {
                        hold_pause = true;
                        self.oneTime(settings.holdRepeatTimeout, 'delay', function() {
                            hold_pause = false;
                        });
                    }
                } else {
                    self.oneTime(settings.holdTimeout, 'hold', function() {
                        hold = true;
                    });
                    prev_key = key;
                }
                // if e.fake ignore of space is handled in input and next keydown
                // is not triggered this is just in case code since on Android
                // keydown is not triggered only input so event is always fake on Android
                if (!e.fake && is_android) {
                    if (skip_keydown) {
                        clear_hold();
                        skip_keydown = false;
                        return false;
                    }
                    if (mobile_ignore_key(key)) {
                        skip_keydown = true;
                    } else if (mobile_ignore_key(prev_key)) {
                        // just in case next key is different then space
                        skip_keydown = false;
                    }
                }
                restart_animation();
                // CTRL+V don't fire keypress in IE11
                skip_insert = ['CTRL+V', 'META+V'].indexOf(key) !== -1;
                if (e.which !== 38 && !(e.which === 80 && e.ctrlKey)) {
                    first_up_history = true;
                }
                if (reverse_search && clear_reverse_search_key(e)) {
                    clear_reverse_state();
                    draw_prompt();
                    if (e.which === 27) { // ESC
                        self.set('');
                    }
                    redraw();
                    if (e.which === 13) {
                        keydown_event.call(this, e);
                    }
                } else if (is_function(keymap[key])) {
                    result = keymap[key](e);
                    if (result === true) {
                        return;
                    }
                    if (result !== undefined) {
                        return result;
                    }
                } else if (e.altKey) {
                    return;
                } else {
                    skip_keypress = false;
                    return;
                }
                // this will prevent for instance backspace to go back one page
                //skip_keypress = true;
                //e.preventDefault();
            }
        }
        function clear_hold() {
            self.stopTime('hold');
            self.stopTime('delay');
            hold_pause = hold = false;
        }
        var doc = $(document.documentElement || window);
        self.keymap(settings.keymap || {});
        function keypress_event(e) {
            debug('keypress "' + e.key + '" ' + e.fake);
            clear_hold();
            var result;
            if (!e.fake) {
                no_keypress = false;
            }
            if ((e.ctrlKey || e.metaKey) && !e.altKey) {
                return;
            }
            if (skip_keypress) {
                return;
            }
            if (is_function(settings.keypress)) {
                result = settings.keypress.call(self, e);
                if (result !== undefined) {
                    if (!result) {
                        skip_insert = true;
                    }
                    return result;
                }
            }
            if (enabled) {
                if (e.fake) {
                    // event created in input, we prevent inserting text
                    // in different interpreter when keydown called pop
                    return;
                }
                // key polyfill is not correct for keypress
                // https://github.com/cvan/keyboardevent-key-polyfill/issues/15
                var key;
                if (is_key_native) {
                    key = e.key;
                    // fixing IE inconsistency #362
                    var normalized = key.toUpperCase();
                    if (key_mapping[normalized]) {
                        key = key_mapping[normalized];
                    }
                }
                if (!key || no_key) {
                    key = String.fromCharCode(e.which);
                }
                if ($.inArray(e.which, [13, 0, 8]) > -1) {
                    if (e.keyCode === 123) { // for F12 which === 0
                        return;
                    }
                    return false;
                    // which === 100 - d
                } else if (key && (!e.ctrlKey || (e.ctrlKey && e.ctrlKey)) &&
                           (!(e.altKey && e.which === 100) || e.altKey) &&
                           !dead_key) {
                    // dead_key are handled by input event
                    if (reverse_search) {
                        rev_search_str += key;
                        reverse_history_search();
                        draw_reverse_prompt();
                    } else if (key.length === 1) {
                        self.insert(key);
                    }
                }
            }
        }
        function event(type, chr, which) {
            var event = $.Event(type);
            event.which = which;
            event.key = chr;
            event.fake = true;
            doc.trigger(event);
        }
        var skip_input = false;
        function input_event() {
            debug('input ' + no_keydown + ' || ' + process + ' ((' + no_keypress +
                  ' || ' + dead_key + ') && !' + skip_insert + ' && (' + single_key +
                  ' || ' + no_key + ') && !' + backspace + ')');
            // correct for fake space used for select all context menu hack
            var val = clip.val();
            if (!is_mobile) {
                val = val.replace(/^ /, '');
            }
            // Some Androids don't fire keypress - #39
            // if there is dead_key we also need to grab real character #158
            // Firefox/Android with google keyboard don't fire keydown and keyup #319
            if ((no_keydown || process || ((no_keypress || dead_key) && !skip_insert &&
                                          (single_key || no_key) && !backspace)) &&
                val !== command) {
                var pos = position;
                // backspace is set in keydown if no keydown we need to get new one
                if (no_keydown) {
                    var cmd = prev_command;
                    backspace = cmd.slice(0, cmd.length - 1).length === val.length;
                }
                if (skip_input) {
                    skip_input = false;
                    clip.val(command);
                    return;
                }
                if (reverse_search) {
                    rev_search_str = val;
                    reverse_history_search();
                    draw_reverse_prompt();
                } else {
                    var str = val.slice(position);
                    if (str.length === 1 || backspace) {
                        // original not optimized function called once
                        var chr = get_next_character(str);
                        if (mobile_ignore_key(chr)) {
                            skip_input = true;
                        }
                        // we trigger events so keypress and keydown callback work
                        if (no_keydown) {
                            var keycode;
                            if (backspace) {
                                keycode = 8;
                            } else {
                                keycode = str.toUpperCase().charCodeAt(0);
                            }
                            event('keydown', backspace ? 'Backspace' : str, keycode);
                        }
                        if (no_keypress && !backspace) {
                            event('keypress', chr, str.charCodeAt(0));
                        }
                    }
                    if (backspace) {
                        prev_command = command;
                        return;
                    }
                    // if user return false in keydown we don't want to insert text
                    if (skip_insert) {
                        skip_insert = false;
                        return;
                    }
                    self.set(val);
                }
                if (backspace) {
                    self.position(pos - 1);
                } else {
                    // user enter more then one character if click on complete word
                    // on android
                    self.position(pos + Math.abs(val.length - prev_command.length));
                }
            }
            prev_command = command;
            skip_insert = false;
            no_keydown = true;
        }
        doc.bind('keypress.cmd', keypress_event);
        doc.bind('keydown.cmd', keydown_event);
        doc.bind('keyup.cmd', clear_hold);
        doc.bind('input.cmd', input_event);
        (function() {
            var was_down = false;
            var count = 0;
            self.on('mousedown.cmd', function() {
                was_down = true;
            }).on('mouseup.cmd', function(e) {
                function trigger() {
                    var $target = $(e.target);
                    var is_prompt = $target.is('.cmd-prompt');
                    if (!is_prompt && down && get_selected_html() === '') {
                        if (enabled) {
                            if ($target.is('.cmd')) {
                                self.position(text(command).length);
                            } else {
                                self.display_position(get_char_pos(e));
                            }
                        }
                    }
                    count = 0;
                }
                // we get button from event for testing normally it's on originalEvent
                var button;
                if (e.originalEvent === undefined) {
                    button = e.button;
                } else {
                    button = e.originalEvent.button;
                }
                if (button === 0 && get_selected_html() === '') {
                    var name = 'click_' + id;
                    if (++count === 1) {
                        var down = was_down;
                        if (enabled) {
                            if (settings.clickTimeout === 0) {
                                trigger();
                            } else {
                                self.oneTime(settings.clickTimeout, name, trigger);
                            }
                        } else {
                            count = 0;
                        }
                    } else {
                        self.stopTime(name);
                        count = 0;
                    }
                }
                was_down = false;
            });
        })();
        self.data('cmd', self);
        if (!('KeyboardEvent' in window && 'key' in window.KeyboardEvent.prototype)) {
            setTimeout(function() {
                throw new Error('key event property not supported try https://github.' +
                                'com/inexorabletash/polyfill/blob/master/keyboard.js');
            }, 0);
        }
        return self;
    }; // cmd plugin
    // -------------------------------------------------------------------------
    var strlen = (function() {
        if (typeof wcwidth === 'undefined') {
            return function(string) {
                return $.terminal.length(string);
            };
        } else {
            return wcwidth;
        }
    })();
    // -------------------------------------------------------------------------
    function count_selfclosing_formatting(string) {
        var count = 0;
        if ($.terminal.have_formatting(string)) {
            var re = new RegExp(format_parts_re, 'i');
            $.terminal.format_split(string).forEach(function(str) {
                if ($.terminal.is_formatting(str)) {
                    var m = str.match(re);
                    if (m && m[1].match(/@/) && m[6] === '') {
                        count++;
                    }
                }
            });
        }
        return count;
    }
    // -------------------------------------------------------------------------
    function bare_text(string) {
        if (!string.match(/&/)) {
            return string;
        }
        return $('<span>' + safe(string) + '</span>').text();
    }
    // -------------------------------------------------------------------------
    function text(string) {
        return bare_text($.terminal.strip(string));
    }
    // -------------------------------------------------------------------------
    function safe(string) {
        if (!string.match(/[<>&]/)) {
            return string;
        }
        return string.replace(/&(?![^;]+;)/g, '&amp;')
            .replace(/>/g, '&gt;').replace(/</g, '&lt;');
    }
    // -------------------------------------------------------------------------
    function crlf(string) {
        return string.replace(/\r/g, '');
    }
    // -------------------------------------------------------------------------
    function char_len(chr) {
        return entity_re.test(chr) ? 1 : chr.length;
    }
    // -------------------------------------------------------------------------
    function make_re_fn(re) {
        return function(string) {
            var m = string.match(re);
            if (starts_with(m)) {
                return m[1];
            }
        };
    }
    // -------------------------------------------------------------------------
    function starts_with(match) {
        return match && match.index === 0;
    }
    // -------------------------------------------------------------------------
    // :: optimized higher order function that it check complex regexes
    // :: only when bigger string match those regexes, function is always
    // :: used in loop when you process whole string, it's used to create local
    // :: get_next_character function only cmd in input use original
    // :: not optimized function
    // -------------------------------------------------------------------------
    function make_next_char_fun(string) {
        var tests = [];
        [
            entity_re,
            emoji_re,
            combine_chr_re
        ].forEach(function(re) {
            if (string.match(re)) {
                tests.push(make_re_fn(re));
            }
        });
        if (string.match(astral_symbols_re)) {
            tests.push(function(string) {
                var m1 = string.match(astral_symbols_re);
                if (starts_with(m1)) {
                    var m2 = string.match(combine_chr_re);
                    if (m2 && m2.index === 1) {
                        return string.slice(0, 3);
                    }
                    return m1[1];
                }
            });
        }
        return function(string) {
            for (var i = 0; i < tests.length; ++i) {
                var test = tests[i];
                var ret = test(string);
                if (ret) {
                    return ret;
                }
            }
            return string[0];
        };
    }
    // -------------------------------------------------------------------------
    // :: function that return character from beginning of the string
    // :: counting emoji, suroggate pairs and combine characters
    // -------------------------------------------------------------------------
    function get_next_character(string) {
        var match_entity = string.match(entity_re);
        if (starts_with(match_entity)) {
            return match_entity[1];
        }
        var match_combo = string.match(combine_chr_re);
        if (starts_with(match_combo)) {
            return match_combo[1];
        }
        var match_emoji = string.match(emoji_re);
        if (starts_with(match_emoji)) {
            return match_emoji[1];
        } else if (string.charCodeAt(0) < 255) {
            return string[0];
        } else {
            var astral_match = string.match(astral_symbols_re);
            if (starts_with(astral_match)) {
                match_combo = string.match(combine_chr_re);
                if (match_combo && match_combo.index === 1) {
                    return string.slice(0, 3);
                }
                return string.slice(0, 2);
            } else {
                return string[0];
            }
        }
    }
    // -------------------------------------------------------------------------
    // normalize position for counting emoji and extra chars
    // -------------------------------------------------------------------------
    function normalize_position(string, position) {
        if (position === 0) {
            return position;
        }
        string = $.terminal.strip(string);
        var result = $.terminal.split_characters(string).reduce(function(acc, chr) {
            if (typeof acc === 'number') {
                return acc;
            }
            var length = acc.length + char_len(chr);
            if (length >= position) {
                return acc.position + 1;
            }
            return {
                position: acc.position + 1,
                length: length
            };
        }, {position: 0, length: 0});
        if (typeof result === 'number') {
            return result;
        } else {
            return result.position;
        }
    }
    // -------------------------------------------------------------------------
    function char_width_prop(len, options) {
        if (is_ch_unit_supported) {
            return 'width: ' + len + 'ch';
        } else if (!is_css_variables_supported) {
            if (options.char_width) {
                return 'width: ' + (options.char_width * len) + 'px';
            }
        } else {
            return '--length: ' + len;
        }
        return '';
    }
    // -------------------------------------------------------------------------
    // options {char_width}
    function extra_css(text, options) {
        if (typeof wcwidth !== 'undefined') {
            var bare = bare_text(text);
            var len = strlen(bare);
            if (len !== $.terminal.length(bare)) {
                return char_width_prop(len, options);
            }
        }
        return '';
    }
    // -------------------------------------------------------------------------
    function wide_characters(text, options) {
        if (typeof wcwidth !== 'undefined') {
            var bare = bare_text(text);
            var chars = $.terminal.split_characters(bare);
            if (chars.length === 1) {
                return text;
            }
            var specs = chars.map(function(chr) {
                return {
                    len: strlen(chr),
                    chr: chr
                };
            }).reduce(function(arr, spec) {
                var last = arr[arr.length - 1];
                if (last) {
                    if (last.len !== spec.len) {
                        return arr.concat([{
                            sum: spec.len,
                            len: spec.len,
                            specs: [spec]
                        }]);
                    } else {
                        arr.pop();
                        return arr.concat([{
                            sum: last.sum + spec.len,
                            len: last.len,
                            specs: last.specs.concat(spec)
                        }]);
                    }
                }
                return [{
                    sum: spec.len,
                    specs: [spec],
                    len: spec.len
                }];
            }, []);
            return specs.map(function(spec) {
                if (spec.len === 1) {
                    return spec.chr;
                }
                var style = char_width_prop(spec.sum, options);
                if (spec.sum === chars.length || !style.length) {
                    return '<span>' + make_string(spec) + '</span>';
                } else if (spec.specs.length > 1) {
                    return wrap(style, spec.specs.map(function(spec) {
                        return wrap(char_width_prop(spec.len), spec.chr);
                    }).join(''));
                } else {
                    return wrap(style, make_string(spec));
                }
            }).join('');
        }
        function make_string(spec) {
            return spec.specs.map(function(spec) {
                return spec.chr;
            }).join('');
        }
        function wrap(style, str) {
            return '<span style="' + style + '">' + str + '</span>';
        }
        return text;
    }
    // ---------------------------------------------------------------------
    // :: Binary search utility
    // ---------------------------------------------------------------------
    function binary_search(start, end, search_pos, compare_fn, more_args) {
        var len = end - start;
        var mid = start + Math.floor(len / 2);
        var args = [search_pos, mid].concat(more_args);
        var cmp = compare_fn.apply(null, args);
        if (cmp === 0) {
            return mid;
        } else if (cmp > 0 && len > 1) {
            return binary_search(
                mid,
                end,
                search_pos,
                compare_fn,
                more_args
            );
        } else if (cmp < 0 && len > 1) {
            return binary_search(
                start,
                mid,
                search_pos,
                compare_fn,
                more_args
            );
        } else {
            return -1;
        }
    }
    // -----------------------------------------------------------------
    // :: selection utilities - should work in modern browser including IE9
    // -----------------------------------------------------------------
    function is_terminal_selected(cmd) {
        if (is_function(window.getSelection)) {
            var selection = window.getSelection();
            if (selection.toString()) {
                var node = selection.getRangeAt(0).startContainer.parentNode;
                var term = $(node).closest('.terminal');
                return term.length && (cmd && term.find('.cmd').is(cmd) || !cmd);
            }
        }
    }
    // -----------------------------------------------------------------
    function get_selected_html() {
        var html = '';
        if (is_function(window.getSelection)) {
            var sel = window.getSelection();
            if (sel.rangeCount) {
                var container = document.createElement('div');
                for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                    container.appendChild(sel.getRangeAt(i).cloneContents());
                }
                html = container.innerHTML;
            }
        }
        return html;
    }
    // -----------------------------------------------------------------
    function with_selection(fn) {
        var html = '';
        var ranges = [];
        if (is_function(window.getSelection)) {
            var selection = window.getSelection();
            if (selection.rangeCount) {
                var container = document.createElement("div");
                for (var i = 0, len = selection.rangeCount; i < len; ++i) {
                    var range = selection.getRangeAt(i).cloneRange();
                    ranges.push(range);
                    container.appendChild(range.cloneContents());
                }
                html = container.innerHTML;
            }
        }
        fn(html);
        if (ranges.length) {
            selection.removeAllRanges();
            ranges.forEach(function(range) {
                selection.addRange(range);
            });
        }
        return html !== '';
    }
    // -----------------------------------------------------------------
    function process_selected_line() {
        var $self = $(this);
        var result = $self.text();
        if ($self.hasClass('cmd-end-line')) {
            result += '\n';
        }
        return result;
    }
    // -----------------------------------------------------------------
    function process_div(element) {
        // span is empty line, div is default case with text
        return $(element).find('> div, > span')
            .map(process_selected_line).get().join('\n').replace(/\n$/, '');
    }
    // -----------------------------------------------------------------
    function process_selected_html(html) {
        var stdout;
        var text = '';
        var $html = $('<div>' + html + '</div>');
        if (html.match(/<\/div>/)) {
            // match multiple echo output
            stdout = $html.find('div[data-index]').map(function() {
                return process_div(this);
            }).get().join('\n');
            // match inside single echo output
            if (!stdout && html.match(/style="width: 100%;?"/)) {
                stdout = process_div($html);
            }
            text = stdout;
        }
        var $prompt = $html.find('.cmd-prompt');
        if ($prompt.length) {
            if (text.length) {
                text += '\n';
            }
            text += $prompt.text();
        }
        var $cmd_lines = $html.find('[role="presentation"]');
        if ($cmd_lines.length) {
            text += $cmd_lines.map(process_selected_line).get().join('');
        }
        if (!text.length && html) {
            text = $html.text();
        }
        return text.replace(/\xA0/g, ' '); // fix &nbsp; space
    }
    // ---------------------------------------------------------------------
    // :: copy given DOM element text to clipboard
    // ---------------------------------------------------------------------
    var text_to_clipboard;
    if (is_function(document.queryCommandSupported) &&
        document.queryCommandSupported('copy')) {
        text_to_clipboard = function text_to_clipboard($textarea, text) {
            var val = $textarea.val();
            var had_focus = $textarea.is(':focus');
            var pos = $textarea.caret();
            $textarea.val(text).focus();
            $textarea[0].select();
            document.execCommand('copy');
            $textarea.val(val);
            if (had_focus) {
                $textarea.caret(pos);
            }
            return true;
        };
    } else {
        text_to_clipboard = $.noop;
    }
    // ---------------------------------------------------------------------
    var get_textarea_selection = (function() {
        var textarea = document.createElement('textarea');
        var selectionStart = 'selectionStart' in textarea;
        textarea = null;
        if (selectionStart) {
            return function(textarea) {
                var length = textarea.selectionEnd - textarea.selectionStart;
                return textarea.value.substr(textarea.selectionStart, length);
            };
        } else if (document.selection) {
            return function() {
                var range = document.selection.createRange();
                return range.text();
            };
        } else {
            return function() {
                return '';
            };
        }
    })();
    // ---------------------------------------------------------------------
    function clear_textarea_selection(textarea) {
        textarea.selectionStart = textarea.selectionEnd = 0;
    }
    // ---------------------------------------------------------------------
    // :: return string that are common in all elements of the array
    // ---------------------------------------------------------------------
    function common_string(string, array, matchCase) {
        if (!array.length) {
            return '';
        }
        var type = string_case(string);
        var result = [];
        for (var j = string.length; j < array[0].length; ++j) {
            var push = false;
            var candidate = array[0].charAt(j),
                candidateLower = candidate.toLowerCase();
            for (var i = 1; i < array.length; ++i) {
                push = true;
                var current = array[i].charAt(j),
                    currentLower = current.toLowerCase();
                if (candidate !== current) {
                    if (matchCase || type === 'mixed') {
                        push = false;
                        break;
                    } else if (candidateLower === currentLower) {
                        if (type === 'lower') {
                            candidate = candidate.toLowerCase();
                        } else if (type === 'upper') {
                            candidate = candidate.toUpperCase();
                        } else {
                            push = false;
                            break;
                        }
                    } else {
                        push = false;
                        break;
                    }
                }
            }
            if (push) {
                result.push(candidate);
            } else {
                break;
            }
        }
        return string + result.join('');
    }
    // ---------------------------------------------------------------------
    function trigger_terminal_change(next) {
        terminals.forEach(function(term) {
            term.settings().onTerminalChange.call(term, next);
        });
    }
    // ---------------------------------------------------------------------
    var select = (function() {
        if (window.getSelection) {
            var selection = window.getSelection();
            if (selection.setBaseAndExtent) {
                return function(start, end) {
                    var selection = window.getSelection();
                    selection.setBaseAndExtent(start, 0, end, 1);
                };
            } else {
                return function(start, end) {
                    var selection = window.getSelection();
                    var range = document.createRange();
                    range.setStart(start, 0);
                    range.setEnd(end, end.childNodes.length);
                    selection.removeAllRanges();
                    selection.addRange(range);
                };
            }
        } else {
            return $.noop;
        }
    })();
    // -------------------------------------------------------------------------
    function process_command(string, fn) {
        var array = string.match(command_re) || [];
        if (array.length) {
            var name = array.shift();
            var args = $.map(array, function(arg) {
                if (arg.match(/^["']/)) {
                    arg = arg.replace(/\n/g, '\\u0000\\u0000\\u0000\\u0000');
                    arg = fn(arg);
                    return arg.replace(/\x00\x00\x00\x00/g, '\n');
                }
                return fn(arg);
            });
            var quotes = $.map(array, function(arg) {
                var m = arg.match(/^(['"]).*\1$/);
                return m && m[1] || '';
            });
            var rest = string.slice(name.length).trim();
            return {
                command: string,
                name: name,
                args: args,
                args_quotes: quotes,
                rest: rest
            };
        } else {
            return {
                command: string,
                name: '',
                args: [],
                args_quotes: quotes,
                rest: ''
            };
        }
    }
    // -------------------------------------------------------------------------
    $.terminal = {
        version: '{{VER}}',
        date: '{{DATE}}',
        // colors from https://www.w3.org/wiki/CSS/Properties/color/keywords
        color_names: [
            'transparent', 'currentcolor', 'black', 'silver', 'gray', 'white',
            'maroon', 'red', 'purple', 'fuchsia', 'green', 'lime', 'olive',
            'yellow', 'navy', 'blue', 'teal', 'aqua', 'aliceblue',
            'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque',
            'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown',
            'burlywood', 'cadetblue', 'chartreuse', 'chocolate', 'coral',
            'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue',
            'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey',
            'darkkhaki', 'darkmagenta', 'darkolivegreen', 'darkorange',
            'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
            'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise',
            'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey',
            'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen', 'fuchsia',
            'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green',
            'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred', 'indigo',
            'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen',
            'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
            'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey',
            'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue',
            'lightslategray', 'lightslategrey', 'lightsteelblue', 'lightyellow',
            'lime', 'limegreen', 'linen', 'magenta', 'maroon',
            'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple',
            'mediumseagreen', 'mediumslateblue', 'mediumspringgreen',
            'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
            'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive',
            'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod',
            'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip',
            'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'red',
            'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown',
            'seagreen', 'seashell', 'sienna', 'silver', 'skyblue', 'slateblue',
            'slategray', 'slategrey', 'snow', 'springgreen', 'steelblue', 'tan',
            'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat',
            'white', 'whitesmoke', 'yellow', 'yellowgreen', 'rebeccapurple'],
        // for unit tests
        Cycle: Cycle,
        History: History,
        Stack: Stack,
        // ---------------------------------------------------------------------
        // :: Validate html color (it can be name or hex)
        // ---------------------------------------------------------------------
        valid_color: function valid_color(color) {
            if (color.match(color_hex_re)) {
                return true;
            } else {
                return $.inArray(color.toLowerCase(), $.terminal.color_names) !== -1;
            }
        },
        // ---------------------------------------------------------------------
        // :: function check if given string contain invalid strings
        // ---------------------------------------------------------------------
        unclosed_strings: function unclosed_strings(string) {
            return !!string.match(unclosed_strings_re);
        },
        // ---------------------------------------------------------------------
        // :: Escape all special regex characters, so it can be use as regex to
        // :: match exact string that contain those characters
        // ---------------------------------------------------------------------
        escape_regex: function escape_regex(str) {
            if (typeof str === 'string') {
                var special = /([-\\^$[\]()+{}?*.|])/g;
                return str.replace(special, '\\$1');
            }
        },
        // ---------------------------------------------------------------------
        // :: test if string contain formatting
        // ---------------------------------------------------------------------
        have_formatting: function have_formatting(str) {
            return typeof str === 'string' && !!str.match(format_exist_re);
        },
        is_formatting: function is_formatting(str) {
            return typeof str === 'string' && !!str.match(format_full_re);
        },
        // ---------------------------------------------------------------------
        // :: return array of formatting and text between them
        // ---------------------------------------------------------------------
        format_split: function format_split(str) {
            return str.split(format_split_re).filter(Boolean);
        },
        // ---------------------------------------------------------------------
        // :: replace that return position after replace for working with
        // :: replacement that change length of the string
        // :: source https://stackoverflow.com/a/46756077/387194
        // ---------------------------------------------------------------------
        tracking_replace: function tracking_replace(string, rex, replacement, position) {
            if (!(rex instanceof RegExp)) {
                throw new Error('tracking_replace: Second argument need to be RegExp');
            }
            function substring(string, start, end) {
                return string.slice(start, end);
            }
            function length(string) {
                return $.terminal.strip(string).length;
            }
            var new_string = "";
            var match;
            var index = 0;
            var rep_string;
            var new_position = position;
            var start;
            rex.lastIndex = 0; // Just to be sure
            while ((match = rex.exec(string))) {
                // if regex don't have g flag lastIndex will not work
                if (rex.global) {
                    // Add any of the original string we just skipped
                    var last_index = length(substring(string, 0, rex.lastIndex));
                    start = last_index - length(match[0]);
                } else {
                    start = match.index;
                    last_index = start + length(match[0]);
                }
                if (index < start) {
                    new_string += substring(string, index, start);
                }
                index = last_index;
                // Build the replacement string. This just handles $$ and $n,
                // you may want to add handling for $`, $', and $&.
                if (typeof replacement === 'function') {
                    rep_string = replacement.apply(null, match);
                } else {
                    rep_string = replacement.replace(/\$(\$|\d)/g, function(m, c0) {
                        if (c0 === "$") {
                            return "$";
                        }
                        return match[c0];
                    });
                }
                // Add on the replacement
                new_string += rep_string;
                // If the position is affected...
                if (start < position) {
                    // ... update it:
                    var rep_len = length(rep_string);
                    rep_len += count_selfclosing_formatting(rep_string);
                    if (last_index < position) {
                        // It's after the replacement, move it
                        new_position = Math.max(
                            0,
                            new_position +
                            rep_len -
                            length(match[0])
                        );
                    } else {
                        // It's *in* the replacement, put it just after
                        new_position += rep_len - (position - start);
                    }
                }
                // If the regular expression doesn't have the g flag, break here so
                // we do just one replacement (and so we don't have an endless loop!)
                if (!rex.global) {
                    break;
                }
            }
            // Add on any trailing text in the string
            if (index < length(string)) {
                new_string += substring(string, index);
            }
            // Return the string and the updated position
            if (string === new_string) {
                return [string, position];
            }
            return [new_string, new_position];
        },
        // ---------------------------------------------------------------------
        // :: helper function used by substring and split_equal it loop over
        // :: string and execute callback with text count and other data
        // ---------------------------------------------------------------------
        iterate_formatting: function iterate_formatting(string, callback) {
            function is_space(i) {
                return string.slice(i - 6, i) === '&nbsp;' ||
                    string.slice(i - 1, i).match(/\s/);
            }
            // ----------------------------------------------------------------
            function match_entity(index) {
                return string.slice(index).match(entity_re);
            }
            // ----------------------------------------------------------------
            function is_open_formatting(i) {
                return string[i] === '[' && string[i + 1] === '[';
            }
            // ----------------------------------------------------------------
            function is_escape_bracket(i) {
                return string[i - 1] !== '\\' && string[i] === '\\' &&
                    string[i + 1] === ']';
            }
            // ----------------------------------------------------------------
            function is_text(i) {
                return not_formatting && (string[i] !== ']' || !have_formatting)
                    && !opening;
            }
            // ----------------------------------------------------------------
            // :: function will skip to next character in main loop
            // :: TODO: improve performance of emoji regex and check whole
            // :: string it's complex string if not use simple function
            // ----------------------------------------------------------------
            var get_next_character = make_next_char_fun(string);
            function next_iteration() {
                var char = get_next_character(substring);
                if (char.length > 1 && $.terminal.length(substring) > 1) {
                    return char.length - 1;
                }
                return 0;
            }
            // ----------------------------------------------------------------
            function is_next_space() {
                return (is_space(i) && (not_formatting || opening)) &&
                    (space === -1 && prev_space !== i || space !== -1);
            }
            // ----------------------------------------------------------------
            // :: last iteration or one before closing formatting
            // ----------------------------------------------------------------
            var last = false;
            function is_last() {
                if (i === string.length - 1 && !last) {
                    last = true;
                } else {
                    last = !!substring.match(/^.]$/);
                }
                return last;
            }
            // ----------------------------------------------------------------
            var have_formatting = $.terminal.have_formatting(string);
            var formatting = '';
            var in_text = false;
            var count = 0;
            var match;
            var space = -1;
            var space_count = -1;
            var prev_space;
            var length = 0;
            var offset = 0;
            var re_ent = /(&[^;]+);$/;
            for (var i = 0; i < string.length; i++) {
                var substring = string.slice(i);
                match = substring.match(format_start_re);
                if (match) {
                    formatting = match[1];
                    in_text = false;
                } else if (formatting) {
                    if (string[i] === ']') {
                        if (in_text) {
                            formatting = '';
                            in_text = false;
                        } else {
                            in_text = true;
                        }
                    }
                } else {
                    in_text = true;
                }
                var not_formatting = (formatting && in_text) || !formatting;
                var opening = is_open_formatting(i);
                if (is_next_space()) {
                    space = i;
                    space_count = count;
                }
                var braket = string[i].match(/[[\]]/);
                offset = 0;
                if (not_formatting) {
                    // treat entity as one character
                    if (string[i] === '&') {
                        match = match_entity(i);
                        if (match) {
                            i += match[1].length - 2; // 2 because continue adds 1 to i
                            continue;
                        }
                        ++count;
                        ++length;
                    } else if (is_escape_bracket(i)) {
                        // escape \] and \\ counts as one character
                        ++count;
                        ++length;
                        offset = 1;
                        i += 1;
                    } else if (!braket || !have_formatting) {
                        ++count;
                        ++length;
                    }
                }
                if (is_text(i)) {
                    if (strlen(string[i]) === 2) {
                        length++;
                    }
                    var char = get_next_character(substring);
                    var size = char.length;
                    // begining of enity that we've skipped, we are at the end
                    if (char === ';') {
                        match = string.slice(0, i + 1).match(re_ent);
                        if (match) {
                            offset = match[1].length;
                            size = offset + 1;
                        }
                    }
                    var data = {
                        last: is_last(),
                        count: count,
                        index: i - offset,
                        formatting: formatting,
                        length: length,
                        text: in_text,
                        size: size,
                        space: space,
                        space_count: space_count
                    };
                    var ret = callback(data);
                    if (ret === false) {
                        break;
                    } else if (ret) {
                        if (ret.count !== undefined) {
                            count = ret.count;
                        }
                        if (ret.length !== undefined) {
                            length = ret.length;
                        }
                        if (ret.space !== undefined) {
                            prev_space = space;
                            space = ret.space;
                        }
                        if (ret.index !== undefined) {
                            i = ret.index;
                            continue;
                        }
                    }
                } else if (i === string.length - 1 && !last) {
                    // last iteration, if formatting have last bracket,
                    // from formatting, then last iteration
                    // was already called (in if) #550
                    callback({
                        count: count + 1,
                        index: i,
                        formatting: formatting,
                        length: 0,
                        text: in_text,
                        space: space
                    });
                }
                // handle emoji, suroggate pairs and combine characters
                if (in_text) {
                    i += next_iteration();
                }
            }
        },
        // ---------------------------------------------------------------------
        // :: function return string splitted into single characters
        // :: each character is wrapped into formatting from input string
        // :: or empty formatting so it will create span when using with ::format
        // ---------------------------------------------------------------------
        partition: function partition(string) {
            if (!$.terminal.have_formatting(string)) {
                var chars = $.terminal.split_characters(string);
                return chars.map(wrap);
            }
            var result = [];
            function wrap(string) {
                if (string.match(/\\$/)) {
                    string += '\\';
                }
                return '[[;;]' + string + ']';
            }
            function formatting(string) {
                if ($.terminal.is_formatting(string)) {
                    if (string.match(/\\]$/)) {
                        string = string.replace(/\\]/g, '\\\\]');
                    }
                } else {
                    string = wrap(string);
                }
                return string;
            }
            $.terminal.iterate_formatting(string, function(data) {
                if (data.text) {
                    var text = [];
                    if (data.formatting) {
                        text.push(data.formatting);
                    }
                    text.push(string.substring(data.index, data.index + data.size));
                    if (data.formatting) {
                        text.push(']');
                    }
                    result.push(formatting(text.join('')));
                }
            });
            return result;
        },
        // ---------------------------------------------------------------------
        // :: formatting aware substring function
        // ---------------------------------------------------------------------
        substring: function substring(string, start_index, end_index) {
            var chars = $.terminal.split_characters(string);
            if (!chars.slice(start_index, end_index).length) {
                return '';
            }
            if (!$.terminal.have_formatting(string)) {
                return chars.slice(start_index, end_index).join('');
            }
            var start = 0;
            var end;
            var start_formatting = '';
            var end_formatting = '';
            var prev_index;
            var offset = 1;
            $.terminal.iterate_formatting(string, function(data) {
                if (start_index && data.count === start_index + 1) {
                    start = data.index;
                    if (data.formatting) {
                        start_formatting = data.formatting;
                    }
                }
                if (end_index && data.count === end_index) {
                    end_formatting = data.formatting;
                    prev_index = data.index;
                    offset = data.size;
                }
                if (data.count === end_index + 1) {
                    end = data.index;
                    if (data.formatting) {
                        end = prev_index + offset;
                    }
                }
            });
            if (start_index && !start) {
                return '';
            }
            if (end === undefined) {
                end = string.length;
            }
            string = start_formatting + string.slice(start, end);
            if (end_formatting) {
                string = string.replace(/(\[\[^\]]+)?\]$/, '');
                string += ']';
            }
            return string;
        },
        // ---------------------------------------------------------------------
        // :: add format text as 5th paramter to formatting it's used for
        // :: data attribute in format function - and fix unclosed &
        // ---------------------------------------------------------------------
        normalize: function normalize(string) {
            string = string.replace(format_re, function(_, format, text) {
                if (format.match(self_closing_re) && text === '') {
                    return '[[' + format + '] ]';
                }
                if (text === '') {
                    return '';
                }
                function safe(string) {
                    return string.replace(/\\\]/g, '&#93;').replace(/\n/g, '\\n')
                        .replace(/&nbsp;/g, ' ');
                }
                format = safe(format);
                var semicolons = format.match(/;/g).length;
                // missing semicolons
                if (semicolons >= 4) {
                    var args = format.split(/;/);
                    var start = args.slice(0, 4).join(';');
                    var arg = args.slice(4).join(';');
                    return '[[' + start + ';' + (arg || text) + ']' + text + ']';
                } else if (semicolons === 2) {
                    semicolons = ';;';
                } else if (semicolons === 3) {
                    semicolons = ';';
                }
                // return '[[' + format + ']' + text + ']';
                // closing braket will break formatting so we need to escape
                // those using html entity equvalent
                // space is hack for images that break iterate_formatting
                format += semicolons + safe(text);
                return '[[' + format + ']' + text + ']';
            });
            return $.terminal.amp(string);
        },
        // ---------------------------------------------------------------------
        // :: split text into lines with equal length so each line can be
        // :: rendered separately (text formatting can be longer then a line).
        // ---------------------------------------------------------------------
        split_equal: function split_equal(str, length, keep_words) {
            var prev_format = '';
            var result = [];
            var array = $.terminal.normalize(str).split(/\n/g);
            for (var i = 0, len = array.length; i < len; ++i) {
                if (array[i] === '') {
                    result.push('');
                    continue;
                }
                var line = array[i];
                var get_next_character = make_next_char_fun(line);
                var first_index = 0;
                var output;
                var line_length = line.length;
                var last_bracket = !!line.match(/\[\[[^\]]+\](?:[^\][]|\\\])+\]$/);
                $.terminal.iterate_formatting(line, function(data) {
                    var chr, substring;
                    if (data.length >= length || data.last ||
                        (data.length === length - 1 &&
                         strlen(line[data.index + 1]) === 2)) {
                        var can_break = false;
                        // TODO: this need work
                        if (keep_words && data.space !== -1) {
                            // replace html entities with characters
                            var stripped = text(line).substring(data.space_count);
                            // real length, not counting formatting
                            stripped = stripped.slice(0, length).trim();
                            var text_len = strlen(stripped);
                            if (stripped.match(/\s/) || text_len < length) {
                                can_break = true;
                            }
                        }
                        // if words is true we split at last space and make next loop
                        // continue where the space where located
                        var after_index = data.index + data.size;
                        if (last_bracket) {
                            after_index += 1;
                        }
                        var new_index;
                        if (keep_words && data.space !== -1 &&
                            after_index !== line_length && can_break) {
                            output = line.slice(first_index, data.space);
                            new_index = data.space - 1;
                        } else {
                            substring = line.slice(data.index);
                            chr = get_next_character(substring);
                            output = line.slice(first_index, data.index) + chr;
                            if (data.last && last_bracket && chr !== ']') {
                                output += ']';
                            }
                            new_index = data.index + chr.length - 1;
                        }
                        if (keep_words) {
                            output = output.replace(/^(&nbsp;|\s)+|(&nbsp;|\s)+$/g, '');
                        }
                        first_index = (new_index || data.index) + 1;
                        if (prev_format) {
                            var closed_formatting = output.match(/^[^\]]*\]/);
                            output = prev_format + output;
                            if (closed_formatting) {
                                prev_format = '';
                            }
                        }
                        var matched = output.match(format_re);
                        if (matched) {
                            var last = matched[matched.length - 1];
                            if (last[last.length - 1] !== ']') {
                                prev_format = last.match(format_begin_re)[1];
                                output += ']';
                            } else if (output.match(format_end_re)) {
                                output = output.replace(format_end_re, '');
                                prev_format = last.match(format_begin_re)[1];
                            }
                        }
                        result.push(output);
                        // modify loop by returing new data
                        return {index: new_index, length: 0, space: -1};
                    }
                });
            }
            return result;
        },
        // ---------------------------------------------------------------------
        // :: Escape & that's not part of entity
        // ---------------------------------------------------------------------
        amp: function amp(str) {
            return str.replace(/&(?!#[0-9]+;|#x[0-9a-f]+;|[a-z]+;)/gi, '&amp;');
        },
        // ---------------------------------------------------------------------
        // :: Encode formating as html for insertion into DOM
        // ---------------------------------------------------------------------
        encode: function encode(str, options) {
            var settings = $.extend({
                tabs: 4,
                before: ''
            }, options);
            return $.terminal.amp(str).replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/ /g, '&nbsp;').split('\n').map(function(line) {
                    var splitted = line.split(/((?:\[\[[^\]]+\])?\t(?:\])?)/);
                    splitted = splitted.filter(Boolean);
                    return splitted.map(function(str, i) {
                        if (str.match(/\t/)) {
                            return str.replace(/\t([^\t]*)$/, function(_, end) {
                                if (i !== 0 && splitted[i - 1].match(/\t\]?$/)) {
                                    var sp = new Array(settings.tabs + 1).join('&nbsp;');
                                    return sp + end;
                                } else {
                                    var before = splitted.slice(i - 1, i).join('');
                                    if (settings.before && i <= 1) {
                                        before = settings.before + before;
                                    }
                                    var len = $.terminal.length(before);
                                    var chars = settings.tabs - (len % settings.tabs);
                                    if (chars === 0) {
                                        chars = 4;
                                    }
                                    return new Array(chars + 1).join('&nbsp;') + end;
                                }
                            });
                        }
                        return str;
                    }).join('');
                }).join('\n');
        },
        // -----------------------------------------------------------------------
        // :: Default formatter that allow for nested formatting, example:
        // :: [[;;#000]hello [[;#f00;]red] world]
        // -----------------------------------------------------------------------
        nested_formatting: function nested_formatting(string) {
            if (!$.terminal.have_formatting(string)) {
                return string;
            }
            var stack = [];
            var re = /((?:\[\[(?:[^\][]|\\\])+\])?(?:[^\][]|\\\])*\]?)/;
            var format_re = /\[\[([^\][]+)\][\s\S]*/;
            var format_split_re = /^\[\[([^;]*);([^;]*);([^\]]*)\]/;
            function get_inherit_style(stack) {
                var output = [[], '', ''];
                if (!stack.length) {
                    return output;
                }
                for (var i = stack.length; i--;) {
                    var formatting = stack[i].split(';');
                    var style = formatting[0].split(/(-?[@!gbiuso])/g).filter(Boolean);
                    style.forEach(function(s) {
                        if (output[0].indexOf(s) === -1) {
                            output[0].push(s);
                        }
                    });
                    for (var j = 1; j < output.length; ++j) {
                        var value = formatting[j].trim();
                        if (value && !output[j]) {
                            output[j] = value;
                        }
                    }
                }
                var ignore = output[0].filter(function(s) {
                    return s[0] === '-';
                }).map(function(s) {
                    return s[1];
                });
                output[0] = output[0].filter(function(s) {
                    return ignore.indexOf(s) === -1 && ignore.indexOf(s[1]) === -1;
                }).join('');
                return output.join(';');
            }
            return string.split(re).filter(Boolean).map(function(string) {
                var style;
                if (string.match(/^\[\[/)) {
                    var formatting = string.replace(format_re, '$1');
                    var is_formatting = $.terminal.is_formatting(string);
                    string = string.replace(format_split_re, '');
                    stack.push(formatting);
                    if ($.terminal.nested_formatting.__inherit__) {
                        style = get_inherit_style(stack);
                    } else {
                        style = formatting;
                    }
                    if (!is_formatting) {
                        string += ']';
                    } else {
                        stack.pop();
                    }
                    string = '[[' + style + ']' + string;
                } else {
                    var pop = false;
                    if (string.match(/\]/)) {
                        pop = true;
                    }
                    if (stack.length) {
                        if ($.terminal.nested_formatting.__inherit__) {
                            style = get_inherit_style(stack);
                        } else {
                            style = stack[stack.length - 1];
                        }
                        string = '[[' + style + ']' + string;
                    }
                    if (pop) {
                        stack.pop();
                    } else if (stack.length) {
                        string += ']';
                    }
                }
                return string;
            }).join('');
        },
        // ---------------------------------------------------------------------
        // :: safe function that will render text as it is
        // ---------------------------------------------------------------------
        escape_formatting: function escape_formatting(string) {
            return $.terminal.escape_brackets(string);
        },
        // ---------------------------------------------------------------------
        // :: apply custom formatters only to text
        // ---------------------------------------------------------------------
        apply_formatters: function apply_formatters(string, settings) {
            if (string === "") {
                if (settings && typeof settings.position === 'number') {
                    return ["", settings.position];
                } else {
                    return "";
                }
            }
            function test_lengths(formatter, index, ret, string) {
                if (!formatter.__no_warn__ &&
                    $.terminal.length(ret) !== $.terminal.length(string)) {
                    warn('Your formatter[' + index + '] change length of the string, ' +
                         'you should use [regex, replacement] formatter or function ' +
                         ' that return [replacement, position] instead');
                }
            }
            var formatters = $.terminal.defaults.formatters;
            settings = settings || {};
            var i = 0;
            function apply_function_formatter(formatter, input) {
                var options = $.extend({}, settings, {
                    position: input[1]
                });
                var ret = formatter(input[0], options);
                if (typeof ret === 'string') {
                    test_lengths(formatter, i - 1, ret, input[0]);
                    if (typeof ret === 'string') {
                        return [ret, options.position];
                    }
                    return input;
                } else if (is_array(ret) && ret.length === 2) {
                    return ret;
                } else {
                    return input;
                }
            }
            var input;
            if (typeof settings.position === 'number') {
                input = [string, settings.position];
            } else {
                input = [string, 0];
            }
            try {
                var result = formatters.reduce(function(input, formatter) {
                    i++;
                    // __meta__ is for safe formatter that can handle formatters
                    // inside formatters. for other usage we use format_split so one
                    // formatter don't mess with formatter that was previous
                    // on the list
                    if (typeof formatter === 'function' && formatter.__meta__) {
                        return apply_function_formatter(formatter, input);
                    } else {
                        var length = 0;
                        var found_position = false;
                        var splitted = $.terminal.format_split(input[0]);
                        var partials = splitted.map(function(string) {
                            var position;
                            var this_len = text(string).length;
                            // first position that match is used for this partial
                            if (input[1] <= length + this_len && !found_position) {
                                position = input[1] - length;
                                found_position = true;
                            } else {
                                // -1 indicate that we will not track position because it
                                // was in one of the previous parial strings
                                position = -1;
                            }
                            // length is used to correct position after replace
                            var length_before = length;
                            var result;
                            length += this_len;
                            if ($.terminal.is_formatting(string)) {
                                return [string, -1];
                            } else {
                                if (is_array(formatter)) {
                                    var options = formatter[2] || {};
                                    result = [string, position < 0 ? 0 : position];
                                    if (result[0].match(formatter[0])) {
                                        if (options.loop) {
                                            while (result[0].match(formatter[0])) {
                                                result = $.terminal.tracking_replace(
                                                    result[0],
                                                    formatter[0],
                                                    formatter[1],
                                                    result[1]
                                                );
                                            }
                                        } else {
                                            result = $.terminal.tracking_replace(
                                                result[0],
                                                formatter[0],
                                                formatter[1],
                                                result[1]
                                            );
                                        }
                                    }
                                    if (position < 0) {
                                        return [result[0], -1];
                                    }
                                } else if (typeof formatter === 'function') {
                                    result = apply_function_formatter(formatter, [
                                        string, position
                                    ]);
                                }
                                if (typeof result !== 'undefined') {
                                    // correct position becuase it's relative
                                    // to partial and we need global for whole string
                                    if (result[1] !== -1) {
                                        result[1] += length_before;
                                    }
                                    return result;
                                }
                                return [string, -1];
                            }
                        });
                        var position_partial = partials.filter(function(partial) {
                            return partial[1] !== -1;
                        })[0];
                        var string = partials.map(function(partial) {
                            return partial[0];
                        }).join('');
                        var position;
                        if (typeof position_partial === 'undefined') {
                            position = input[1];
                        } else {
                            position = position_partial[1];
                        }
                        // to make sure that output position is not outside the string
                        var max = text(string).length;
                        max += count_selfclosing_formatting(string);
                        if (position > max) {
                            position = max;
                        }
                        if (string === input[0]) {
                            return input;
                        }
                        return [string, position];
                    }
                }, input);
                if (typeof settings.position === 'number') {
                    var codepoint_len = $.terminal.strip(result[0]).length;
                    if ($.terminal.length(result[0]) < codepoint_len) {
                        var position = result[1];
                        position = normalize_position(result[0], position);
                        var max = $.terminal.length(result[0]);
                        if (position > max) {
                            position = max;
                        }
                        result[1] = position;
                    }
                    return result;
                } else {
                    return result[0];
                }
            } catch (e) {
                var msg = 'Error in formatter [' + (i - 1) + ']';
                formatters.splice(i - 1);
                throw new $.terminal.Exception('formatting', msg, e.stack);
            }
        },
        // ---------------------------------------------------------------------
        // :: Replace terminal formatting with html
        // ---------------------------------------------------------------------
        format: function format(str, options) {
            var settings = $.extend({}, {
                linksNoReferrer: false,
                linksNoFollow: false,
                allowedAttributes: [],
                char_width: undefined,
                escape: true,
                anyLinks: false
            }, options || {});
            // -----------------------------------------------------------------
            function filter_attr_names(names) {
                if (names.length && settings.allowedAttributes.length) {
                    return names.filter(function(name) {
                        if (name === 'data-text') {
                            return false;
                        }
                        var allowed = false;
                        var filters = settings.allowedAttributes;
                        for (var i = 0; i < filters.length; ++i) {
                            if (filters[i] instanceof RegExp) {
                                if (filters[i].test(name)) {
                                    allowed = true;
                                    break;
                                }
                            } else if (filters[i] === name) {
                                allowed = true;
                                break;
                            }
                        }
                        return allowed;
                    });
                }
                return [];
            }
            // -----------------------------------------------------------------
            function clean_data(data, text) {
                if (data === '') {
                    return text;
                } else {
                    return data.replace(/&#93;/g, ']')
                        .replace(/>/g, '&gt;').replace(/</g, '&lt;');
                }
            }
            // -----------------------------------------------------------------
            function add_attrs(attrs) {
                if (attrs) {
                    var keys = filter_attr_names(Object.keys(attrs));
                    if (keys.length) {
                        return ' ' + keys.map(function(name) {
                            var value = attrs[name].replace(/"/g, '&quot;');
                            return name + '="' + value + '"';
                        }).join(' ');
                    }
                }
                return '';
            }
            // -----------------------------------------------------------------
            function rel_attr() {
                var rel = ["noopener"];
                if (settings.linksNoReferrer) {
                    rel.unshift("noreferrer");
                }
                if (settings.linksNoFollow) {
                    rel.unshift("nofollow");
                }
                return rel;
            }
            // -----------------------------------------------------------------
            // test if this is valid Path
            // -----------------------------------------------------------------
            function is_path(url) {
                return url.match(/^\.{1,2}\//) ||
                    url.match(/^\//) ||
                    !(url.match(/\//) || url.match(/^[^:]+:/));
            }
            // -----------------------------------------------------------------
            function with_url_validation(fn) {
                return function(url) {
                    if (settings.anyLinks) {
                        return true;
                    }
                    var test = fn(url);
                    if (!test) {
                        warn('Invalid URL ' + url + ' only https ftp and Path ' +
                             'are allowed');
                    }
                    return test;
                };
            }
            // -----------------------------------------------------------------
            var valid_href = with_url_validation(function(url) {
                return url.match(/^((https?|ftp):\/\/|\.{0,2}\/)/) || is_path(url);
            });
            // -----------------------------------------------------------------
            var valid_src = with_url_validation(function(url) {
                return url.match(/^(https?:|blob:|data:)/) || is_path(url);
            });
            // -----------------------------------------------------------------
            function format(s, style, color, background, _class, data_text, text) {
                var attrs;
                if (data_text.match(/;/)) {
                    try {
                        var splitted = data_text.split(';');
                        var str = splitted.slice(1).join(';')
                            .replace(/&nbsp;/g, ' ')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>');
                        if (str.match(/^\s*\{[^}]*\}\s*$/)) {
                            attrs = JSON.parse(str);
                            data_text = splitted[0];
                        }
                    } catch (e) {
                    }
                }
                if (text === '' && !style.match(/@/)) {
                    return ''; //'<span>&nbsp;</span>';
                }
                text = safe(text);
                text = text.replace(/\\\]/g, '&#93;');
                if (settings.escape) {
                    // inside formatting we need to unescape escaped slashes
                    // but this escape is not needed when echo - don't know why
                    text = text.replace(/\\\\/g, '\\');
                }
                var style_str = '';
                if (style.indexOf('b') !== -1) {
                    style_str += 'font-weight:bold;';
                }
                var text_decoration = [];
                if (style.indexOf('u') !== -1) {
                    text_decoration.push('underline');
                }
                if (style.indexOf('s') !== -1) {
                    text_decoration.push('line-through');
                }
                if (style.indexOf('o') !== -1) {
                    text_decoration.push('overline');
                }
                if (text_decoration.length) {
                    style_str += 'text-decoration:' +
                        text_decoration.join(' ') + ';';
                }
                if (style.indexOf('i') !== -1) {
                    style_str += 'font-style:italic;';
                }
                if ($.terminal.valid_color(color)) {
                    style_str += 'color:' + color + ';' +
                        '--color:' + color + ';';
                    if (style.indexOf('!') !== -1) {
                        style_str += '--link-color:' + color + ';';
                    }
                    if (style.indexOf('g') !== -1) {
                        style_str += 'text-shadow:0 0 5px ' + color + ';';
                    }
                }
                if ($.terminal.valid_color(background)) {
                    style_str += 'background-color:' + background + ';';
                }
                var data = clean_data(data_text, text);
                var extra = extra_css(text, settings);
                if (extra) {
                    text = wide_characters(text, settings);
                    style_str += extra;
                }
                var result;
                if (style.indexOf('!') !== -1) {
                    if (data.match(email_re)) {
                        result = '<a href="mailto:' + data + '"';
                    } else {
                        // only http and ftp links (prevent javascript)
                        // unless user force it with anyLinks option
                        if (!valid_href(data)) {
                            data = '';
                        }
                        result = '<a target="_blank"';
                        if (data) {
                            result += ' href="' + data + '"';
                        }
                        result += ' rel="' + rel_attr().join(' ') + '"';
                    }
                    // make focus to terminal textarea that will enable
                    // terminal when pressing tab and terminal is disabled
                    result += ' tabindex="1000"';
                } else if (style.indexOf('@') !== -1) {
                    result = '<img';
                    if (valid_src(data)) {
                        result += ' src="' + data + '"';
                    }
                } else {
                    result = '<span';
                }
                result += add_attrs(attrs);
                if (style_str !== '') {
                    result += ' style="' + style_str + '"';
                }
                if (_class !== '') {
                    result += ' class="' + _class + '"';
                }
                // links and image need data-text attribute cmd click behavior
                // formatter can return links.
                if (style.indexOf('!') !== -1) {
                    result += ' data-text>' + text + '</a>';
                } else if (style.indexOf('@') !== -1) {
                    result += ' data-text/>';
                } else {
                    result += ' data-text="' + data.replace(/"/g, '&quot;') + '">' +
                        text + '</span>';
                }
                return result;
            }
            if (typeof str === 'string') {
                // support for formating foo[[u;;]bar]baz[[b;#fff;]quux]zzz
                var splitted = $.terminal.format_split(str);
                str = $.map(splitted, function(text) {
                    if (text === '') {
                        return text;
                    } else if ($.terminal.is_formatting(text)) {
                        // fix &nbsp; inside formatting because encode is called
                        // before format
                        text = text.replace(/\[\[[^\]]+\]/, function(text) {
                            return text.replace(/&nbsp;/g, ' ');
                        });
                        return text.replace(format_parts_re, format);
                    } else {
                        text = safe(text);
                        text = text.replace(/\\\]/, '&#93;');
                        var extra = extra_css(text, settings);
                        if (extra.length) {
                            text = wide_characters(text, settings);
                            return '<span style="' + extra + '">' + text + '</span>';
                        } else {
                            return '<span>' + text + '</span>';
                        }
                    }
                }).join('');
                return str.replace(/<span><br\s*\/?><\/span>/gi, '<br/>');
            } else {
                return '';
            }
        },
        // ---------------------------------------------------------------------
        // :: Replace brackets with html entities
        // ---------------------------------------------------------------------
        escape_brackets: function escape_brackets(string) {
            return string.replace(/\[/g, '&#91;').replace(/\]/g, '&#93;');
        },
        // ---------------------------------------------------------------------
        // :: complmentary function
        // ---------------------------------------------------------------------
        unescape_brackets: function unescape_brackets(string) {
            return string.replace(/&#91;/g, '[').replace(/&#93;/g, ']');
        },
        // ---------------------------------------------------------------------
        // :: return number of characters without formatting
        // ---------------------------------------------------------------------
        length: function(string, raw) {
            return $.terminal.split_characters(raw ? string : text(string)).length;
        },
        // ---------------------------------------------------------------------
        // :: split characters handling emoji, surogate pairs and combine chars
        // ---------------------------------------------------------------------
        split_characters: function split_characters(string) {
            var result = [];
            var get_next_character = make_next_char_fun(string);
            while (string.length) {
                var chr = get_next_character(string);
                string = string.slice(chr.length);
                result.push(chr);
            }
            return result;
        },
        // ---------------------------------------------------------------------
        // :: return string where array items are in columns padded spaces
        // :: after adding align tabs arr.join('\t\t') looks much better
        // ---------------------------------------------------------------------
        columns: function(array, cols, space) {
            var no_formatting = array.map(function(string) {
                return $.terminal.strip(string);
            });
            var lengths = no_formatting.map(function(string) {
                return strlen(string);
            });
            if (typeof space === 'undefined') {
                space = 4;
            }
            var length = Math.max.apply(null, lengths) + space;
            // we need value - 1 because index starts from 0
            var column_limit = Math.floor(cols / length) - 1;
            if (column_limit < 1) {
                return array.join('\n');
            }
            var lines = [];
            for (var i = 0, len = array.length; i < len; i += column_limit) {
                var line = array.slice(i, i + column_limit);
                var last = line.pop();
                lines.push(line.reduce(function(acc, string) {
                    var stripped = $.terminal.strip(string);
                    var pad = new Array(length - stripped.length + 1).join(' ');
                    acc.push(string + pad);
                    return acc;
                }, []).join('') + last);
            }
            return lines.join('\n');
        },
        // ---------------------------------------------------------------------
        // :: Remove formatting from text
        // ---------------------------------------------------------------------
        strip: function strip(str) {
            str = str.replace(format_parts_re, '$6');
            return str.replace(/\\([[\]])/g, function(whole, bracket) {
                return bracket;
            });
        },
        // ---------------------------------------------------------------------
        // :: Return active terminal
        // ---------------------------------------------------------------------
        active: function active() {
            return terminals.front();
        },
        // ---------------------------------------------------------------------
        // :: Implmentation detail id is always length of terminals Cycle
        // ---------------------------------------------------------------------
        last_id: function last_id() {
            var len = terminals.length();
            return len - 1;
        },
        // ---------------------------------------------------------------------
        // :: Function that works with strings like 'asd' 'asd\' asd' "asd asd"
        // :: asd\ 123 -n -b / [^ ]+ / /\s+/ asd\ a it creates a regex and
        // :: numbers and replaces escape characters in double quotes
        // :: if strict is set to false it only strips single and double quotes
        // :: and escapes spaces
        // ---------------------------------------------------------------------
        parse_argument: function parse_argument(arg, strict) {
            function parse_string(string) {
                // split string to string literals and non-strings
                return string.split(string_re).map(function(string) {
                    // remove quotes if before are even number of slashes
                    // we don't remove slases becuase they are handled by JSON.parse
                    if (string.match(/^['"]/)) {
                        // fixing regex to match empty string is not worth it
                        if (string === '""' || string === "''") {
                            return '';
                        }
                        var quote = string[0];
                        var re = new RegExp("(^|(?:\\\\(?:\\\\)*)?)" + quote, "g");
                        string = string.replace(re, "$1");
                    }
                    string = '"' + string + '"';
                    // use build in function to parse rest of escaped characters
                    return JSON.parse(string);
                }).join('');
            }
            if (strict === false) {
                if (arg[0] === "'" && arg[arg.length - 1] === "'") {
                    return arg.replace(/^'|'$/g, '');
                } else if (arg[0] === '"' && arg[arg.length - 1] === '"') {
                    return arg.replace(/^"|"$/g, '').replace(/\\([" ])/g, '$1');
                } else if (arg.match(/\/.*\/[gimy]*$/)) {
                    return arg;
                } else if (arg.match(/['"]]/)) {
                    // part of arg is in quote
                    return parse_string(arg);
                } else {
                    return arg.replace(/\\ /g, ' ');
                }
            }
            var regex = arg.match(re_re);
            if (regex) {
                return new RegExp(regex[1], regex[2]);
            } else if (arg.match(/['"]/)) {
                return parse_string(arg);
            } else if (arg.match(/^-?[0-9]+$/)) {
                return parseInt(arg, 10);
            } else if (arg.match(float_re)) {
                return parseFloat(arg);
            } else {
                return arg.replace(/\\(['"() ])/g, '$1');
            }
        },
        // ---------------------------------------------------------------------
        // :: function split and parse arguments
        // ---------------------------------------------------------------------
        parse_arguments: function parse_arguments(string) {
            return $.map(string.match(command_re) || [], $.terminal.parse_argument);
        },
        // ---------------------------------------------------------------------
        // :: Function split and strips single and double quotes
        // :: and escapes spaces
        // ---------------------------------------------------------------------
        split_arguments: function split_arguments(string) {
            return $.map(string.match(command_re) || [], function(arg) {
                return $.terminal.parse_argument(arg, false);
            });
        },
        // ---------------------------------------------------------------------
        // :: Function that returns an object {name,args}. Arguments are parsed
        // :: using the function parse_arguments
        // ---------------------------------------------------------------------
        parse_command: function parse_command(string) {
            return process_command(string, $.terminal.parse_argument);
        },
        // ---------------------------------------------------------------------
        // :: Same as parse_command but arguments are parsed using split_arguments
        // ---------------------------------------------------------------------
        split_command: function split_command(string) {
            return process_command(string, function(arg) {
                return $.terminal.parse_argument(arg, false);
            });
        },
        // ---------------------------------------------------------------------
        // :; function that parse arguments like yargs library
        // ---------------------------------------------------------------------
        parse_options: function parse_options(arg, options) {
            var settings = $.extend({}, {
                boolean: []
            }, options);
            if (typeof arg === 'string') {
                return parse_options($.terminal.split_arguments(arg), options);
            }
            var result = {
                _: []
            };
            function token(value) {
                this.value = value;
            }
            var rest = arg.reduce(function(acc, arg) {
                var str = typeof arg === 'string' ? arg : '';
                if (str.match(/^-/) && acc instanceof token) {
                    result[acc.value] = true;
                }
                if (str.match(/^--/)) {
                    var name = str.replace(/^--/, '');
                    if (settings.boolean.indexOf(name) === -1) {
                        return new token(name);
                    } else {
                        result[name] = true;
                    }
                } else if (str.match(/^-/)) {
                    var single = str.replace(/^-/, '').split('');
                    if (settings.boolean.indexOf(single.slice(-1)[0]) === -1) {
                        var last = single.pop();
                    }
                    single.forEach(function(single) {
                        result[single] = true;
                    });
                    if (last) {
                        return new token(last);
                    }
                } else if (acc instanceof token) {
                    result[acc.value] = arg;
                } else if (arg) {
                    result._.push(arg);
                }
                return null;
            }, null);
            if (rest instanceof token) {
                result[rest.value] = true;
            }
            return result;
        },
        // ---------------------------------------------------------------------
        // :: function executed for each text inside [[ .... ]] in echo
        // ---------------------------------------------------------------------
        extended_command: function extended_command(term, string, options) {
            var settings = $.extend({
                invokeMethods: false
            }, options);
            try {
                change_hash = false;
                var m = string.match(extended_command_re);
                if (m) {
                    if (!settings.invokeMethods) {
                        warn('To invoke terminal or cmd methods you need to enable ' +
                             'invokeMethods option');
                        return;
                    }
                    string = m[1];
                    var obj = m[2] === 'terminal' ? term : term.cmd();
                    var fn = m[3];
                    try {
                        var args = eval('[' + m[4] + ']');
                        if (!obj[fn]) {
                            term.error('Unknow function ' + fn);
                        } else {
                            obj[fn].apply(term, args);
                        }
                    } catch (e) {
                        term.error('Invalid invocation in ' +
                                   $.terminal.escape_brackets(string));
                    }
                } else {
                    term.exec(string, true).done(function() {
                        change_hash = true;
                    });
                }
            } catch (e) {
                // error is process in exec
            }
        },
        // ---------------------------------------------------------------------
        // :: ES6 iterator for a given string that handle emoji and formatting
        // ---------------------------------------------------------------------
        iterator: function(string) {
            function formatting(string) {
                if ($.terminal.is_formatting(string)) {
                    if (string.match(/\]\\\]/)) {
                        string = string.replace(/\]\\\]/g, ']\\\\]');
                    }
                }
                return string;
            }
            if (typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol') {
                var len = $.terminal.length(string);
                var i = 0;
                var obj = {};
                obj[Symbol.iterator] = function() {
                    return {
                        next: function() {
                            if (i < len) {
                                var text = $.terminal.substring(string, i, i + 1);
                                i++;
                                return {
                                    value: formatting(text)
                                };
                            } else {
                                return {
                                    done: true
                                };
                            }
                        }
                    };
                };
                return obj;
            }
        },
        // ---------------------------------------------------------------------
        // :: object that can be used in string methods intead of regex
        // ---------------------------------------------------------------------
        formatter: new (function() {
            try {
                this[Symbol.split] = function(string) {
                    return $.terminal.format_split(string);
                };
                this[Symbol.match] = function(string) {
                    return string.match(format_re);
                };
                this[Symbol.replace] = function(string, replacer) {
                    return string.replace(format_parts_re, replacer);
                };
                this[Symbol.search] = function(string) {
                    return string.search(format_re);
                };
            } catch (e) {
            }
        })(),
        // ---------------------------------------------------------------------
        // :: helper function that add formatter before nested_formatting
        // ---------------------------------------------------------------------
        new_formatter: function(formatter) {
            var formatters = $.terminal.defaults.formatters;
            for (var i = 0; i < formatters.length; ++i) {
                if (formatters[i] === $.terminal.nested_formatting) {
                    formatters.splice(i, 0, formatter);
                    return;
                }
            }
            formatters.push(formatter);
        }
    };
    // -------------------------------------------------------------------------
    $.terminal.Exception = function Terminal_Exception(type, message, stack) {
        if (arguments.length === 1) {
            this.message = arguments[0];
            this.type = 'TERMINAL';
        } else {
            this.type = type;
            this.message = message;
            if (stack) {
                this.stack = stack;
            }
        }
    };
    $.terminal.Exception.prototype = new Error();
    $.terminal.Exception.prototype.toString = function() {
        return this.message + '\n' + this.stack;
    };
    // -----------------------------------------------------------------------
    // Helper plugins and functions
    // -----------------------------------------------------------------------
    $.fn.visible = function() {
        return this.css('visibility', 'visible');
    };
    $.fn.hidden = function() {
        return this.css('visibility', 'hidden');
    };
    // -----------------------------------------------------------------------
    var warnings = [];
    function warn(msg) {
        msg = '[jQuery Terminal] ' + msg;
        if (warnings.indexOf(msg) === -1) {
            warnings.push(msg);
            /* eslint-disable */
            if (console) {
                if (console.warn) {
                    console.warn(msg);
                } else if (console.log) {
                    console.log(msg);
                }
                /* eslint-enable */
            } else {
                // prevent catching in outer try..catch
                setTimeout(function() {
                    throw new Error('WARN: ' + msg);
                }, 0);
            }
        }
    }
    // -----------------------------------------------------------------------
    // JSON-RPC CALL
    // -----------------------------------------------------------------------
    var ids = {}; // list of url based ids of JSON-RPC
    $.jrpc = function(url, method, params, success, error) {
        var deferred = new $.Deferred();
        var options;
        if ($.isPlainObject(url)) {
            options = url;
        } else {
            options = {
                url: url,
                method: method,
                params: params,
                success: success,
                error: error
            };
        }
        function validJSONRPC(response) {
            return $.isNumeric(response.id) &&
                (typeof response.result !== 'undefined' ||
                 typeof response.error !== 'undefined');
        }
        ids[options.url] = ids[options.url] || 0;
        var request = {
            'jsonrpc': '2.0',
            'method': options.method,
            'params': options.params,
            'id': ++ids[options.url]
        };
        $.ajax({
            url: options.url,
            beforeSend: function beforeSend(jxhr, settings) {
                if (is_function(options.request)) {
                    options.request(jxhr, request);
                }
                settings.data = JSON.stringify(request);
            },
            success: function success(response, status, jqXHR) {
                var content_type = jqXHR.getResponseHeader('Content-Type');
                if (!content_type.match(/(application|text)\/json/)) {
                    warn('Response Content-Type is neither application/json' +
                         ' nor text/json');
                }
                var json;
                try {
                    json = JSON.parse(response);
                } catch (e) {
                    if (options.error) {
                        options.error(jqXHR, 'Invalid JSON', e);
                    } else {
                        throw new $.terminal.Exception('JSON', 'Invalid JSON', e.stack);
                    }
                    deferred.reject({message: 'Invalid JSON', response: response});
                    return;
                }
                if (is_function(options.response)) {
                    options.response(jqXHR, json);
                }
                if (validJSONRPC(json) || options.method === 'system.describe') {
                    // don't catch errors in success callback
                    if (options.success) {
                        options.success(json, status, jqXHR);
                    }
                    deferred.resolve(json);
                } else {
                    if (options.error) {
                        options.error(jqXHR, 'Invalid JSON-RPC');
                    }
                    deferred.reject({message: 'Invalid JSON-RPC', response: response});
                }
            },
            error: options.error,
            contentType: 'application/json',
            dataType: 'text',
            async: true,
            cache: false,
            // timeout: 1,
            type: 'POST'
        });
        return deferred.promise();
    };

    // -----------------------------------------------------------------------
    /*
    function is_scrolled_into_view(elem) {
        var docViewTop = $(window).scrollTop();
        var docViewBottom = docViewTop + $(window).height();

        var elemTop = $(elem).offset().top;
        var elemBottom = elemTop + $(elem).height();

        return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom));
    }
    */
    // -----------------------------------------------------------------------
    function terminal_ready(term) {
        return !!(term.closest('body').length &&
                  term.is(':visible') &&
                  term.find('.cmd-prompt').length);
    }
    // -----------------------------------------------------------------------
    // :: Create fake terminal to calcualte the dimention of one character
    // :: this will make terminal work if terminal div is not added to the
    // :: DOM at init like with:
    // :: $('<div/>').terminal().echo('foo bar').appendTo('body');
    // -----------------------------------------------------------------------
    function get_char_size(term) {
        var rect;
        if (terminal_ready(term)) {
            var $prompt = term.find('.cmd-prompt').clone().css({
                visiblity: 'hidden',
                position: 'absolute'
            });
            $prompt.appendTo(term.find('.cmd')).html('&nbsp;');
            rect = $prompt[0].getBoundingClientRect();
            $prompt.remove();
        } else {
            var temp = $('<div class="terminal terminal-temp"><div class="terminal-' +
                         'wrapper"><div class="terminal-output"><div><div class="te' +
                         'rminal-line" style="float: left"><span>&nbsp;</span></div' +
                         '></div></div></div>').appendTo('body');
            temp.addClass(term.attr('class')).attr('id', term.attr('id'));
            if (term) {
                var style = term.attr('style');
                if (style) {
                    style = style.split(/\s*;\s*/).filter(function(s) {
                        return !s.match(/display\s*:\s*none/i);
                    }).join(';');
                    temp.attr('style', style);
                }
            }
            rect = temp.find('.terminal-line')[0].getBoundingClientRect();
        }
        var result = {
            width: rect.width,
            height: rect.height
        };
        if (temp) {
            temp.remove();
        }
        return result;
    }
    // -----------------------------------------------------------------------
    // :: calculate numbers of characters
    // -----------------------------------------------------------------------
    function get_num_chars(terminal, char_size) {
        var width = terminal.find('.terminal-fill').width();
        var result = Math.floor(width / char_size.width);
        // random number to not get NaN in node.js but big enough to
        // not wrap exception
        return result || 1000;
    }
    // -----------------------------------------------------------------------
    // :: Calculate number of lines that fit without scroll
    // -----------------------------------------------------------------------
    function get_num_rows(terminal, char_size) {
        return Math.floor(terminal.find('.terminal-fill').height() / char_size.height);
    }
    // -----------------------------------------------------------------------
    function all(array, fn) {
        var same = array.filter(function(item) {
            return item[fn]() === item;
        });
        return same.length === array.length;
    }
    // -----------------------------------------------------------------------
    function string_case(string) {
        var array = string.split('');
        if (all(array, 'toLowerCase')) {
            return 'lower';
        } else if (all(array, 'toUpperCase')) {
            return 'upper';
        } else {
            return 'mixed';
        }
    }
    // -----------------------------------------------------------------------
    function same_case(string) {
        return string_case(string) !== 'mixed';
    }
    // -----------------------------------------------------------------------
    // fix for jQuery bug
    function is_function(object) {
        return get_type(object) === 'function';
    }
    // -----------------------------------------------------------------------
    function is_array(object) {
        return get_type(object) === 'array';
    }
    // -----------------------------------------------------------------------
    function get_type(object) {
        return typeof object === 'function' ? 'function' : $.type(object);
    }
    // -----------------------------------------------------------------------
    // :: TERMINAL PLUGIN CODE
    // -----------------------------------------------------------------------
    var version_set = !$.terminal.version.match(/^\{\{/);
    var copyright = 'Copyright (c) 2011-2019 Jakub T. Jankiewicz ' +
        '<https://jcubic.pl/me>';
    var version_string = version_set ? ' v. ' + $.terminal.version : ' ';
    // regex is for placing version string aligned to the right
    var reg = new RegExp(' {' + version_string.length + '}$');
    var name_ver = 'jQuery Terminal Emulator' +
        (version_set ? version_string : '');
    // -----------------------------------------------------------------------
    // :: Terminal Signatures
    // -----------------------------------------------------------------------
    var signatures = [
        ['jQuery Terminal', '(c) 2011-2019 jcubic'],
        [name_ver, copyright.replace(/^Copyright | *<.*>/g, '')],
        [name_ver, copyright.replace(/^Copyright /, '')],
        [
            '      _______                 ________                        __',
            '     / / _  /_ ____________ _/__  ___/______________  _____  / /',
            ' __ / / // / // / _  / _/ // / / / _  / _/     / /  \\/ / _ \\/ /',
            '/  / / // / // / ___/ // // / / / ___/ // / / / / /\\  / // / /__',
            '\\___/____ \\\\__/____/_/ \\__ / /_/____/_//_/_/_/_/_/  \\/\\__\\_\\___/',
            '         \\/          /____/                                   '
                .replace(reg, ' ') + version_string,
            copyright
        ],
        [
            '      __ _____                     ________                            ' +
                '  __',
            '     / // _  /__ __ _____ ___ __ _/__  ___/__ ___ ______ __ __  __ ___ ' +
                ' / /',
            ' __ / // // // // // _  // _// // / / // _  // _//     // //  \\/ // _ ' +
                '\\/ /',
            '/  / // // // // // ___// / / // / / // ___// / / / / // // /\\  // // ' +
                '/ /__',
            '\\___//____ \\\\___//____//_/ _\\_  / /_//____//_/ /_/ /_//_//_/ /_/ \\' +
                '__\\_\\___/',
            ('          \\/              /____/                                     ' +
             '     ').replace(reg, '') + version_string,
            copyright
        ]
    ];
    // -----------------------------------------------------------------------
    // :: Default options
    // -----------------------------------------------------------------------
    $.terminal.nested_formatting.__meta__ = true;
    // if set to true nested formatting will inherit styles from styles outside
    $.terminal.nested_formatting.__inherit__ = false;
    // nested formatting will always return different length so we silent the warning
    $.terminal.nested_formatting.__no_warn__ = true;
    $.terminal.defaults = {
        prompt: '> ',
        history: true,
        exit: true,
        clear: true,
        enabled: true,
        maskChar: '*',
        wrap: true,
        checkArity: true,
        raw: false,
        tabindex: 1,
        invokeMethods: false,
        exceptionHandler: null,
        pauseEvents: true,
        softPause: false,
        memory: false,
        cancelableAjax: true,
        processArguments: true,
        linksNoReferrer: false,
        anyLinks: false,
        linksNoFollow: false,
        processRPCResponse: null,
        completionEscape: true,
        onCommandChange: null,
        mobileDelete: is_mobile,
        onPositionChange: null,
        convertLinks: true,
        extra: {},
        tabs: 4,
        historySize: 60,
        scrollObject: null,
        historyState: false,
        importHistory: false,
        historyFilter: null,
        echoCommand: true,
        scrollOnEcho: true,
        login: null,
        outputLimit: -1,
        formatters: [$.terminal.nested_formatting],
        onAjaxError: null,
        pasteImage: true,
        scrollBottomOffset: 20,
        wordAutocomplete: true,
        caseSensitiveAutocomplete: true,
        caseSensitiveSearch: true,
        clickTimeout: 200,
        holdTimeout: 400,
        holdRepeatTimeout: 200,
        repeatTimeoutKeys: [],
        mobileIngoreAutoSpace: [],
        request: $.noop,
        response: $.noop,
        describe: 'procs',
        onRPCError: null,
        doubleTab: null,
        doubleTabEchoCommand: false,
        completion: false,
        onInit: $.noop,
        onClear: $.noop,
        onBlur: $.noop,
        onFocus: $.noop,
        onTerminalChange: $.noop,
        onExit: $.noop,
        onPush: $.noop,
        onPop: $.noop,
        keypress: $.noop,
        keydown: $.noop,
        renderHandler: null,
        onAfterRedraw: $.noop,
        onEchoCommand: $.noop,
        onPaste: $.noop,
        onFlush: $.noop,
        onBeforeCommand: null,
        onAfterCommand: null,
        onBeforeEcho: null,
        onAfterEcho: null,
        onBeforeLogin: null,
        onAfterLogout: null,
        onBeforeLogout: null,
        allowedAttributes: ['title', /^aria-/, 'id', /^data-/],
        strings: {
            comletionParameters: 'From version 1.0.0 completion function need to' +
                ' have two arguments',
            wrongPasswordTryAgain: 'Wrong password try again!',
            wrongPassword: 'Wrong password!',
            ajaxAbortError: 'Error while aborting ajax call!',
            wrongArity: "Wrong number of arguments. Function '%s' expects %s got" +
                ' %s!',
            commandNotFound: "Command '%s' Not Found!",
            oneRPCWithIgnore: 'You can use only one rpc with describe == false ' +
                'or rpc without system.describe',
            oneInterpreterFunction: "You can't use more than one function (rpc " +
                'without system.describe or with option describe == false count' +
                 's as one)',
            loginFunctionMissing: "You didn't specify a login function",
            noTokenError: 'Access denied (no token)',
            serverResponse: 'Server responded',
            wrongGreetings: 'Wrong value of greetings parameter',
            notWhileLogin: "You can't call `%s' function while in login",
            loginIsNotAFunction: 'Authenticate must be a function',
            canExitError: "You can't exit from main interpreter",
            invalidCompletion: 'Invalid completion',
            invalidSelector: 'Sorry, but terminal said that you use invalid ' +
                'selector!',
            invalidTerminalId: 'Invalid Terminal ID',
            login: 'login',
            password: 'password',
            recursiveCall: 'Recursive call detected, skip',
            notAString: '%s function: argument is not a string',
            redrawError: 'Internal error, wrong position in cmd redraw',
            invalidStrings: 'Command %s have unclosed strings',
            defunctTerminal: "You can't call method on terminal that was destroyed"
        }
    };
    // -------------------------------------------------------------------------
    // :: All terminal globals
    // -------------------------------------------------------------------------
    var requests = []; // for canceling on CTRL+D
    var terminals = new Cycle(); // list of terminals global in this scope
    // state for all terminals, terminals can't have own array fo state because
    // there is only one popstate event
    var save_state = []; // hold objects returned by export_view by history API
    var hash_commands;
    var change_hash = false; // don't change hash on Init
    var fire_hash_change = true;
    var first_instance = true; // used by history state
    $.fn.terminal = function(init_interpreter, options) {
        function StorageHelper(memory) {
            if (memory) {
                this.storage = {};
            }
            this.set = function(key, value) {
                if (memory) {
                    this.storage[key] = value;
                } else {
                    $.Storage.set(key, value);
                }
            };
            this.get = function(key) {
                if (memory) {
                    return this.storage[key];
                } else {
                    return $.Storage.get(key);
                }
            };
            this.remove = function(key) {
                if (memory) {
                    delete this.storage[key];
                } else {
                    $.Storage.remove(key);
                }
            };
        }
        // ---------------------------------------------------------------------
        // :: helper function
        // ---------------------------------------------------------------------
        function get_processed_command(command) {
            if ($.terminal.unclosed_strings(command)) {
                var string = $.terminal.escape_brackets(command);
                var message = sprintf(strings().invalidStrings, "`" + string + "`");
                throw new $.terminal.Exception(message);
            } else if (is_function(settings.processArguments)) {
                return process_command(command, settings.processArguments);
            } else if (settings.processArguments) {
                return $.terminal.parse_command(command);
            } else {
                return $.terminal.split_command(command);
            }
        }
        // ---------------------------------------------------------------------
        // :: helper function that use option to render objects
        // ---------------------------------------------------------------------
        function preprocess_value(value) {
            if (is_function(settings.renderHandler)) {
                var ret = settings.renderHandler.call(self, value, self);
                if (ret === false) {
                    return false;
                }
                if (typeof ret === 'string' || is_node(ret)) {
                    return ret;
                } else {
                    return value;
                }
            }
            return value;
        }
        // ---------------------------------------------------------------------
        // :: call when line is out of view when outputLimit is used
        // :: NOTE: it's not called when less plugin is used onClear is called
        // :: instead because less call term::clear() after export old view
        // ---------------------------------------------------------------------
        function unmount(node) {
            var index = node.data('index');
            var line = lines[index];
            var options = line[1];
            if (is_function(options.unmount)) {
                options.unmount.call(self, node);
            }
        }
        // ---------------------------------------------------------------------
        // :: helper function used in render and in update
        // ---------------------------------------------------------------------
        function prepare_render(value, options) {
            if (is_node(value)) {
                var settings = $.extend({}, options, {
                    raw: true,
                    finalize: function(div) {
                        var node;
                        if (value instanceof $.fn.init) {
                            // deep clone with events - we clone because remove
                            // from DOM will remove events from original object
                            node = value.clone(true, true);
                        } else {
                            // don't clone html nodes because it will not
                            // work for canvas or video tag
                            node = value;
                        }
                        div.find('.terminal-render-item').replaceWith(node);
                        if (options && is_function(options.finalize)) {
                            options.finalize(div, self);
                        }
                    }
                });
                return ['<div class="terminal-render-item"/>', settings];
            }
        }
        // ---------------------------------------------------------------------
        // :: helper function that renders DOM nodes and jQuery objects
        // ---------------------------------------------------------------------
        function render(value, options) {
            var ret = prepare_render(value, options);
            if (ret) {
                self.echo.apply(self, ret);
                return true;
            }
        }
        // ---------------------------------------------------------------------
        function get_node(index) {
            return output.find('[data-index=' + index + ']');
        }
        // ---------------------------------------------------------------------
        // :: test if object can be rendered
        // ---------------------------------------------------------------------
        function is_node(object) {
            return object instanceof $.fn.init || object instanceof Element;
        }
        // ---------------------------------------------------------------------
        // :: Display object on terminal
        // ---------------------------------------------------------------------
        function display_object(object) {
            object = preprocess_value(object);
            if (object === false) {
                return;
            }
            if (render(object)) {
                return;
            }
            if (typeof object === 'string') {
                self.echo(object);
            } else if (is_array(object)) {
                self.echo($.map(object, function(object) {
                    return JSON.stringify(object);
                }).join(' '));
            } else if (typeof object === 'object') {
                self.echo(JSON.stringify(object));
            } else {
                self.echo(object);
            }
        }
        // ---------------------------------------------------------------------
        // :: Display line code in the file if line numbers are present
        // ---------------------------------------------------------------------
        function print_line(url_spec, cols) {
            var re = /(.*):([0-9]+):([0-9]+)$/;
            // google chrome have line and column after filename
            var m = url_spec.match(re);
            if (m) {
                // TODO: do we need to call pause/resume or return promise?
                self.pause(settings.softPause);
                $.get(m[1], function(response) {
                    var file = m[1];
                    var code = response.split('\n');
                    var n = +m[2] - 1;
                    var start = n > 2 ? n - 2 : 0;
                    var lines = code.slice(start, n + 3).map(function(line, i) {
                        var prefix = '[' + (n + i - 1) + ']: ';
                        var limit = cols - prefix.length - 4;
                        if (line.length > limit) {
                            line = line.substring(0, limit) + '...';
                        }
                        if (n > 2 ? i === 2 : i === n) {
                            line = '[[;#f00;]' +
                                $.terminal.escape_brackets(line) + ']';
                        }
                        return prefix + line;
                    }).filter(Boolean).join('\n');
                    if (lines.length) {
                        self.echo('[[b;white;]' + file + ']');
                        self.echo(lines).resume();
                    }
                }, 'text');
            }
        }
        // ---------------------------------------------------------------------
        // :: Helper function
        // ---------------------------------------------------------------------
        function display_json_rpc_error(error) {
            if (is_function(settings.onRPCError)) {
                settings.onRPCError.call(self, error);
            } else {
                self.error('&#91;RPC&#93; ' + error.message);
                if (error.error && error.error.message) {
                    error = error.error;
                    // more detailed error message
                    var msg = '\t' + error.message;
                    if (error.file) {
                        msg += ' in file "' + error.file.replace(/.*\//, '') + '"';
                    }
                    if (error.at) {
                        msg += ' at line ' + error.at;
                    }
                    self.error(msg);
                }
            }
        }
        // ---------------------------------------------------------------------
        // :: Create interpreter function from url string
        // ---------------------------------------------------------------------
        function make_basic_json_rpc(url, auth) {
            var interpreter = function(method, params) {
                self.pause(settings.softPause);
                $.jrpc({
                    url: url,
                    method: method,
                    params: params,
                    request: function(jxhr, request) {
                        try {
                            settings.request.call(self, jxhr, request, self);
                        } catch (e) {
                            display_exception(e, 'USER');
                        }
                    },
                    response: function(jxhr, response) {
                        try {
                            settings.response.call(self, jxhr, response, self);
                        } catch (e) {
                            display_exception(e, 'USER');
                        }
                    },
                    success: function success(json) {
                        if (json.error) {
                            display_json_rpc_error(json.error);
                        } else if (is_function(settings.processRPCResponse)) {
                            settings.processRPCResponse.call(self, json.result, self);
                        } else {
                            display_object(json.result);
                        }
                        self.resume();
                    },
                    error: ajax_error
                });
            };
            // this is the interpreter function
            return function(command, terminal) {
                if (command === '') {
                    return;
                }
                try {
                    command = get_processed_command(command);
                } catch (e) {
                    // exception can be thrown on invalid regex
                    display_exception(e, 'TERMINAL (get_processed_command)');
                    return;
                    // throw e; // this will show stack in other try..catch
                }
                if (!auth || command.name === 'help') {
                    // allows to call help without a token
                    interpreter(command.name, command.args);
                } else {
                    var token = terminal.token();
                    if (token) {
                        interpreter(command.name, [token].concat(command.args));
                    } else {
                        // should never happen
                        terminal.error('&#91;AUTH&#93; ' + strings().noTokenError);
                    }
                }
            };
        }
        // ---------------------------------------------------------------------
        // :: Create interpreter function from Object. If the value is object
        // :: it will create nested interpreters
        // ---------------------------------------------------------------------
        function make_object_interpreter(object, arity, login, fallback) {
            // function that maps commands to object methods
            // it keeps terminal context
            return function(user_command, terminal) {
                if (user_command === '') {
                    return;
                }
                // command = split_command_line(command);
                var command;
                try {
                    command = get_processed_command(user_command);
                } catch (e) {
                    // exception can be thrown on invalid regex
                    if (is_function(settings.exception)) {
                        settings.exception(e, self);
                    } else {
                        self.error('Error: ' + (e.message || e));
                    }
                    return;
                    // throw e; // this will show stack in other try..catch
                }
                var val = object[command.name];
                var type = get_type(val);
                if (type === 'function') {
                    if (arity && val.length !== command.args.length) {
                        self.error(
                            '&#91;Arity&#93; ' +
                                sprintf(
                                    strings().wrongArity,
                                    command.name,
                                    val.length,
                                    command.args.length
                                )
                        );
                    } else {
                        return val.apply(self, command.args);
                    }
                } else if (type === 'object' || type === 'string') {
                    var commands = [];
                    if (type === 'object') {
                        commands = Object.keys(val);
                        val = make_object_interpreter(
                            val,
                            arity,
                            login
                        );
                    }
                    terminal.push(val, {
                        prompt: command.name + '> ',
                        name: command.name,
                        completion: type === 'object' ? commands : undefined
                    });
                } else if (is_function(fallback)) {
                    fallback(user_command, self);
                } else if (is_function(settings.onCommandNotFound)) {
                    settings.onCommandNotFound.call(self, user_command, self);
                } else {
                    terminal.error(sprintf(strings().commandNotFound, command.name));
                }
            };
        }
        // ---------------------------------------------------------------------
        function ajax_error(xhr, status, error) {
            self.resume(); // onAjaxError can use pause/resume call it first
            if (is_function(settings.onAjaxError)) {
                settings.onAjaxError.call(self, xhr, status, error);
            } else if (status !== 'abort') {
                self.error('&#91;AJAX&#93; ' + status + ' - ' +
                           strings().serverResponse + ':\n' +
                           $.terminal.escape_brackets(xhr.responseText));
            }
        }
        // ---------------------------------------------------------------------
        // :: function create interpreter object based on JSON-RPC meta data
        // ---------------------------------------------------------------------
        function make_json_rpc_object(url, auth, success) {
            function jrpc_success(json) {
                if (json.error) {
                    display_json_rpc_error(json.error);
                } else if (is_function(settings.processRPCResponse)) {
                    settings.processRPCResponse.call(self, json.result, self);
                } else {
                    display_object(json.result);
                }
                self.resume();
            }
            function jrpc_request(jxhr, request) {
                try {
                    settings.request.call(self, jxhr, request, self);
                } catch (e) {
                    display_exception(e, 'USER');
                }
            }
            function jrpc_response(jxhr, response) {
                try {
                    settings.response.call(self, jxhr, response, self);
                } catch (e) {
                    display_exception(e, 'USER');
                }
            }
            function response(response) {
                var procs = response;
                // we check if it's false before we call this function but
                // it don't hurt to be explicit here
                if (settings.describe !== false && settings.describe !== '') {
                    settings.describe.split('.').forEach(function(field) {
                        procs = procs[field];
                    });
                }
                if (procs && procs.length) {
                    var interpreter_object = {};
                    $.each(procs, function(_, proc) {
                        if ($.isPlainObject(proc) && typeof proc.name === 'string') {
                            interpreter_object[proc.name] = function() {
                                var append = auth && proc.name !== 'help';
                                var args = Array.prototype.slice.call(arguments);
                                var args_len = args.length + (append ? 1 : 0);
                                if (settings.checkArity && proc.params &&
                                    proc.params.length !== args_len) {
                                    self.error(
                                        '&#91;Arity&#93; ' +
                                            sprintf(
                                                strings().wrongArity,
                                                proc.name,
                                                proc.params.length,
                                                args_len
                                            )
                                    );
                                } else {
                                    self.pause(settings.softPause);
                                    if (append) {
                                        var token = self.token(true);
                                        if (token) {
                                            args = [token].concat(args);
                                        } else {
                                            self.error('&#91;AUTH&#93; ' +
                                                       strings().noTokenError);
                                        }
                                    }
                                    $.jrpc({
                                        url: url,
                                        method: proc.name,
                                        params: args,
                                        request: jrpc_request,
                                        response: jrpc_response,
                                        success: jrpc_success,
                                        error: ajax_error
                                    });
                                }
                            };
                        }
                    });
                    var login = typeof auth === 'string' ? auth : 'login';
                    interpreter_object.help = interpreter_object.help || function(fn) {
                        if (typeof fn === 'undefined') {
                            var names = procs.map(function(proc) {
                                return proc.name;
                            }).join(', ') + ', help';
                            self.echo('Available commands: ' + names);
                        } else {
                            var found = false;
                            $.each(procs, function(_, proc) {
                                if (proc.name === fn) {
                                    found = true;
                                    var msg = '';
                                    msg += '[[bu;;]' + proc.name + ']';
                                    if (proc.params) {
                                        var params = proc.params;
                                        if (auth && proc.name !== login) {
                                            params = params.slice(1);
                                        }
                                        msg += ' ' + params.join(' ');
                                    }
                                    if (proc.help) {
                                        msg += '\n' + proc.help;
                                    }
                                    self.echo(msg);
                                    return false;
                                }
                            });
                            if (!found) {
                                if (fn === 'help') {
                                    self.echo('[[bu;;]help] [method]\ndisplay help ' +
                                              'for the method or list of methods if not' +
                                              ' specified');
                                } else {
                                    var msg = 'Method `' + fn + "' not found ";
                                    self.error(msg);
                                }
                            }
                        }
                    };
                    success(interpreter_object);
                } else {
                    success(null);
                }
            }
            return $.jrpc({
                url: url,
                method: 'system.describe',
                params: [],
                success: response,
                request: jrpc_request,
                response: jrpc_response,
                error: function error() {
                    success(null);
                }
            });
        }
        // ---------------------------------------------------------------------
        // :: function create interpeter function and call finalize with
        // :: interpreter and optional completion
        // ---------------------------------------------------------------------
        function make_interpreter(user_intrp, login, finalize) {
            finalize = finalize || $.noop;
            var type = get_type(user_intrp);
            var object;
            var result = {};
            var rpc_count = 0; // only one rpc can be use for array
            var fn_interpreter;
            if (type === 'array') {
                object = {};
                // recur will be called when previous acync call is finished
                (function recur(interpreters, success) {
                    if (interpreters.length) {
                        var first = interpreters[0];
                        var rest = interpreters.slice(1);
                        var type = get_type(first);
                        if (type === 'string') {
                            self.pause(settings.softPause);
                            if (settings.describe === false) {
                                if (++rpc_count === 1) {
                                    fn_interpreter = make_basic_json_rpc(first, login);
                                } else {
                                    self.error(strings().oneRPCWithIgnore);
                                }
                                recur(rest, success);
                            } else {
                                make_json_rpc_object(first, login, function(new_obj) {
                                    if (new_obj) {
                                        $.extend(object, new_obj);
                                    } else if (++rpc_count === 1) {
                                        fn_interpreter = make_basic_json_rpc(
                                            first,
                                            login
                                        );
                                    } else {
                                        self.error(strings().oneRPCWithIgnore);
                                    }
                                    self.resume();
                                    recur(rest, success);
                                });
                            }
                        } else if (type === 'function') {
                            if (fn_interpreter) {
                                self.error(strings().oneInterpreterFunction);
                            } else {
                                fn_interpreter = first;
                            }
                            recur(rest, success);
                        } else if (type === 'object') {
                            $.extend(object, first);
                            recur(rest, success);
                        }
                    } else {
                        success();
                    }
                })(user_intrp, function() {
                    finalize({
                        interpreter: make_object_interpreter(
                            object,
                            false,
                            login,
                            fn_interpreter && fn_interpreter.bind(self)
                        ),
                        completion: Object.keys(object)
                    });
                });
            } else if (type === 'string') {
                if (settings.describe === false) {
                    object = {
                        interpreter: make_basic_json_rpc(user_intrp, login)
                    };
                    if ($.isArray(settings.completion)) {
                        object.completion = settings.completion;
                    }
                    finalize(object);
                } else {
                    self.pause(settings.softPause);
                    make_json_rpc_object(user_intrp, login, function(object) {
                        if (object) {
                            result.interpreter = make_object_interpreter(
                                object,
                                false,
                                login
                            );
                            result.completion = Object.keys(object);
                        } else {
                            // no procs in system.describe
                            result.interpreter = make_basic_json_rpc(user_intrp, login);
                        }
                        finalize(result);
                        self.resume();
                    });
                }
            } else if (type === 'object') {
                finalize({
                    interpreter: make_object_interpreter(
                        user_intrp,
                        settings.checkArity,
                        login
                    ),
                    completion: Object.keys(user_intrp)
                });
            } else {
                // allow $('<div/>').terminal();
                if (type === 'undefined') {
                    user_intrp = $.noop;
                } else if (type !== 'function') {
                    var msg = type + ' is invalid interpreter value';
                    throw new $.terminal.Exception(msg);
                }
                // single function don't need bind
                finalize({
                    interpreter: user_intrp,
                    completion: settings.completion
                });
            }
        }
        // ---------------------------------------------------------------------
        // :: Create JSON-RPC authentication function
        // ---------------------------------------------------------------------
        function make_json_rpc_login(url, login) {
            var method = get_type(login) === 'boolean' ? 'login' : login;
            return function(user, passwd, callback) {
                self.pause(settings.softPause);
                $.jrpc({
                    url: url,
                    method: method,
                    params: [user, passwd],
                    request: function(jxhr, request) {
                        try {
                            settings.request.call(self, jxhr, request, self);
                        } catch (e) {
                            display_exception(e, 'USER');
                        }
                    },
                    response: function(jxhr, response) {
                        try {
                            settings.response.call(self, jxhr, response, self);
                        } catch (e) {
                            display_exception(e, 'USER');
                        }
                    },
                    success: function success(response) {
                        if (!response.error && response.result) {
                            callback(response.result);
                        } else {
                            // null will trigger message that login fail
                            callback(null);
                        }
                        self.resume();
                    },
                    error: ajax_error
                });
            };
            // default name is login so you can pass true
        }
        // ---------------------------------------------------------------------
        // :: display Exception on terminal
        // ---------------------------------------------------------------------
        function display_exception(e, label, silent) {
            if (is_function(settings.exceptionHandler)) {
                settings.exceptionHandler.call(self, e, label);
            } else {
                self.exception(e, label);
                if (!silent) {
                    setTimeout(function() {
                        throw e;
                    }, 0);
                }
            }
        }
        // ---------------------------------------------------------------------
        // :: Draw line - can have line breaks and be longer than the width of
        // :: the terminal, there are 2 options raw and finalize
        // :: raw - will not encode the string and finalize if a function that
        // :: will have div container of the line as first argument
        // :: NOTE: it formats and appends lines to output_buffer. The actual
        // :: append to terminal output happens in the flush function
        // ---------------------------------------------------------------------
        var output_buffer = [];
        var NEW_LINE = 1;
        var format_cache;
        if ('Map' in root) {
            format_cache = new Map();
        }
        function buffer_line(arg, index, options) {
            // urls should always have formatting to keep url if split
            var i, len;
            output_buffer.push(NEW_LINE);
            var format_options = {
                linksNoReferrer: settings.linksNoReferrer,
                linksNoFollow: settings.linksNoFollow,
                anyLinks: settings.anyLinks,
                char_width: char_size.width,
                escape: false,
                allowedAttributes: options.allowedAttributes || []
            };
            var use_cache = settings.useCache && format_cache;
            function format_buff(arg, newline) {
                var args = JSON.stringify([arg, format_options]);
                if (use_cache) {
                    if (format_cache.has(args)) {
                        return format_cache.get(args);
                    }
                }
                var data = {
                    line: $.terminal.format(
                        arg,
                        format_options
                    ),
                    newline: newline
                };
                if (use_cache) {
                    format_cache.set(args, data);
                }
                return data;
            }
            if (arg instanceof Array) {
                for (i = 0, len = arg.length; i < len; ++i) {
                    if (arg[i] === '' || arg[i] === '\r') {
                        output_buffer.push({line: '<span></span>'});
                    } else {
                        output_buffer.push(format_buff(arg[i], i === len - 1));
                    }
                }
            } else if (!options.raw) {
                output_buffer.push(format_buff(arg));
            } else {
                output_buffer.push({line: arg});
            }
            output_buffer.push({
                finalize: options.finalize,
                index: index
            });
        }
        // ---------------------------------------------------------------------
        function links(string) {
            function format(_, style, color, background, _class, data, text) {
                function formatting(s, text) {
                    return '[[' + [
                        style + (s || ''),
                        color,
                        background,
                        _class,
                        data || text
                    ].join(';') + ']';
                }
                function escaped(_) {
                    return ']' + formatting('!', _) + _ + ']' + formatting();
                }
                if (!style.match(/!/)) {
                    if (text.match(email_full_re) || text.match(url_full_re)) {
                        return formatting('!', text) + text + ']';
                    } else if (text.match(email_re) || text.match(url_nf_re)) {
                        var output = text.replace(email_re, escaped)
                            .replace(url_nf_re, escaped);
                        return formatting('', data) + output + ']';
                    }
                }
                return _;
            }
            if (!(string.match(email_re) || string.match(url_nf_re))) {
                return string;
            }
            if (!$.terminal.have_formatting(string)) {
                return string.replace(email_re, '[[!;;]$1]').
                    replace(url_nf_re, '[[!;;]$1]');
            }
            return $.terminal.format_split(string).map(function(str) {
                if ($.terminal.is_formatting(str)) {
                    return str.replace(format_parts_re, format);
                } else {
                    return str.replace(email_re, '[[!;;]$1]').
                        replace(url_nf_re, '[[!;;]$1]');
                }
            }).join('');
        }
        // ---------------------------------------------------------------------
        function should_wrap(string, options) {
            return (strlen(text(string)) > options.cols ||
                    string.match(/\n/)) &&
                ((settings.wrap === true &&
                  options.wrap === undefined) ||
                 settings.wrap === false &&
                 options.wrap === true);
        }
        // ---------------------------------------------------------------------
        var string_cache;
        if ('Map' in root) {
            string_cache = new Map();
        }
        function process_line(line) {
            // prevent exception in display exception
            try {
                var line_settings = $.extend({
                    exec: true,
                    raw: false,
                    finalize: $.noop,
                    invokeMethods: false,
                    formatters: true,
                    convertLinks: settings.convertLinks
                }, line.options || {});
                var string;
                string = stringify_value(line.value);
                if (string !== '') {
                    if (!line_settings.raw) {
                        if (line_settings.formatters) {
                            try {
                                string = $.terminal.apply_formatters(
                                    string,
                                    settings
                                );
                            } catch (e) {
                                display_exception(e, 'FORMATTING');
                            }
                        }
                        if (settings.useCache) {
                            var key = string;
                            if (string_cache && string_cache.has(key)) {
                                string = string_cache.get(key);
                                buffer_line(string, line.index, line_settings);
                                return;
                            }
                        }
                        if (line_settings.exec) {
                            var parts = string.split(format_exec_re);
                            string = $.map(parts, function(string) {
                                if (string && string.match(format_exec_re) &&
                                    !$.terminal.is_formatting(string)) {
                                    // redraw should not execute commands and it have
                                    // and lines variable have all extended commands
                                    string = string.replace(/^\[\[|\]\]$/g, '');
                                    if (line_settings.exec) {
                                        var trim = string.trim();
                                        if (prev_exec_cmd && prev_exec_cmd === trim) {
                                            prev_exec_cmd = '';
                                            self.error(strings().recursiveCall);
                                        } else {
                                            prev_exec_cmd = trim;
                                            $.terminal.extended_command(self, string, {
                                                invokeMethods: line_settings.invokeMethods
                                            });
                                        }
                                    }
                                    return '';
                                } else {
                                    return string;
                                }
                            }).join('');
                        }
                        if (string === '') {
                            return;
                        }
                        if (line_settings.convertLinks) {
                            string = links(string);
                        }
                        string = crlf($.terminal.normalize(string));
                        string = $.terminal.encode(string, {
                            tabs: settings.tabs
                        });
                        //string = $.terminal.normalize(string);
                        var array;
                        var cols = line_settings.cols = self.cols();
                        if (should_wrap(string, line_settings)) {
                            var words = line_settings.keepWords;
                            array = $.terminal.split_equal(string, cols, words);
                        } else if (string.match(/\n/)) {
                            array = string.split(/\n/);
                        }
                    }
                }
                var arg = array || string;
                if (string_cache && key) {
                    string_cache.set(key, arg);
                }
                buffer_line(arg, line.index, line_settings);
            } catch (e) {
                output_buffer = [];
                // don't display exception if exception throw in terminal
                if (is_function(settings.exceptionHandler)) {
                    settings.exceptionHandler.call(self, e, 'TERMINAL');
                } else {
                    alert_exception('[Internal Exception(process_line)]', e);
                }
            }
        }
        // ---------------------------------------------------------------------
        // :: Update terminal lines
        // ---------------------------------------------------------------------
        function redraw(options) {
            options = $.extend({}, {
                // should be used when single line is updated
                update: false,
                // should be used if you want to scroll to bottom after redraw
                scroll: true
            }, options || {});
            if (!options.update) {
                command_line.resize(num_chars);
                // we don't want reflow while processing lines
                var detached_output = output.empty().detach();
            }
            var lines_to_show = [];
            // Dead code
            if (settings.outputLimit >= 0) {
                // flush will limit lines but if there is lot of
                // lines we don't need to show them and then remove
                // them from terminal
                var limit;
                if (settings.outputLimit === 0) {
                    limit = self.rows();
                } else {
                    limit = settings.outputLimit;
                }
                lines.forEach(function(line, index) {
                    var value = line[0];
                    var options = line[1];
                    lines_to_show.push({
                        value: value,
                        index: index,
                        options: options
                    });
                });
                var pivot = lines_to_show.length - limit - 1;
                lines_to_show = lines_to_show.slice(pivot);
            } else {
                lines_to_show = lines.map(function(line, index) {
                    return {
                        value: line[0],
                        index: index,
                        options: line[1]
                    };
                });
            }
            try {
                output_buffer = [];
                $.each(lines_to_show, function(i, line) {
                    process_line(line);
                });
                if (!options.update) {
                    command_line.before(detached_output); // reinsert output
                }
                self.flush(options);
                fire_event('onAfterRedraw');
            } catch (e) {
                if (is_function(settings.exceptionHandler)) {
                    settings.exceptionHandler.call(self, e, 'TERMINAL (redraw)');
                } else {
                    alert_exception('[redraw]', e);
                }
            }
        }
        // ---------------------------------------------------------------------
        // :: Function limit output lines based on outputLimit option
        // ---------------------------------------------------------------------
        function limit_lines() {
            if (settings.outputLimit >= 0) {
                var limit;
                if (settings.outputLimit === 0) {
                    limit = self.rows();
                } else {
                    limit = settings.outputLimit;
                }
                var $lines = output.find('> div > div');
                if ($lines.length + 1 > limit) {
                    var max = $lines.length - limit + 1;
                    var for_remove = $lines.slice(0, max);
                    // you can't get parent if you remove the
                    // element so we first get the parent
                    var parents = for_remove.parent();
                    for_remove.remove();
                    parents.each(function() {
                        var $self = $(this);
                        if ($self.is(':empty')) {
                            unmount($self);
                            // there can be divs inside parent that
                            // was not removed
                            $self.remove();
                        }
                    });
                }
            }
        }
        // ---------------------------------------------------------------------
        // :: Display user greetings or terminal signature
        // ---------------------------------------------------------------------
        function show_greetings() {
            if (settings.greetings === undefined) {
                // signature have ascii art so it's not suite for screen readers
                self.echo(self.signature, {finalize: a11y_hide, formatters: false});
            } else if (settings.greetings) {
                var type = typeof settings.greetings;
                if (type === 'string') {
                    self.echo(settings.greetings);
                } else if (type === 'function') {
                    try {
                        var ret = settings.greetings.call(self, self.echo);
                        var error = make_label_error('Greetings');
                        unpromise(ret, self.echo, function(e) {
                            error(e);
                            settings.greetings = null;
                        });
                    } catch (e) {
                        settings.greetings = null;
                        display_exception(e, 'greetings');
                    }
                } else {
                    self.error(strings().wrongGreetings);
                }
            }
        }
        // ---------------------------------------------------------------------
        // :: Display prompt and last command
        // ---------------------------------------------------------------------
        function echo_command(command) {
            if (typeof command === 'undefined') {
                command = self.get_command();
            }
            // true will return last rendered string
            var prompt = command_line.prompt(true);
            var mask = command_line.mask();
            switch (typeof mask) {
                case 'string':
                    command = command.replace(/./g, mask);
                    break;
                case 'boolean':
                    if (mask) {
                        command = command.replace(/./g, settings.maskChar);
                    } else {
                        command = $.terminal.escape_formatting(command);
                    }
                    break;
            }
            var options = {
                convertLinks: false,
                exec: false,
                finalize: function finalize(div) {
                    a11y_hide(div.addClass('terminal-command'));
                    fire_event('onEchoCommand', [div, command]);
                }
            };
            self.echo(prompt + command, options);
        }
        // ---------------------------------------------------------------------
        function have_scrollbar() {
            return fill.outerWidth() !== self.outerWidth();
        }
        // ---------------------------------------------------------------------
        // :: Helper function that restore state. Call import_view or exec
        // ---------------------------------------------------------------------
        function restore_state(spec) {
            // spec [terminal_id, state_index, command]
            var terminal = terminals.get()[spec[0]];
            if (!terminal) {
                throw new $.terminal.Exception(strings().invalidTerminalId);
            }
            var command_idx = spec[1];
            if (save_state[command_idx]) { // state exists
                terminal.import_view(save_state[command_idx]);
            } else {
                // restore state
                change_hash = false;
                var command = spec[2];
                if (command) {
                    terminal.exec(command).done(function() {
                        change_hash = true;
                        save_state[command_idx] = terminal.export_view();
                    });
                }
            }
            /*if (spec[3].length) {
                restore_state(spec[3]);
            }*/
        }
        // ---------------------------------------------------------------------
        function make_label_error(label) {
            return function(e) {
                self.error('[' + label + '] ' + (e.message || e)).resume();
            };
        }
        // ---------------------------------------------------------------------
        // :: Helper function
        // ---------------------------------------------------------------------
        function maybe_update_hash() {
            if (change_hash) {
                fire_hash_change = false;
                location.hash = '#' + JSON.stringify(hash_commands);
                setTimeout(function() {
                    fire_hash_change = true;
                }, 100);
            }
        }
        // ---------------------------------------------------------------------
        // :: Wrapper over interpreter, it implements exit and catches all
        // :: exeptions from user code and displays them on the terminal
        // ---------------------------------------------------------------------
        var first_command = true;
        var resume_callbacks = [];
        function commands(command, silent, exec) {
            function init_state() {
                // execHash need first empty command too
                if (settings.historyState || settings.execHash && exec) {
                    if (!save_state.length) {
                        // first command in first terminal don't have hash
                        self.save_state();
                    } else {
                        self.save_state(null);
                    }
                }
            }
            // -----------------------------------------------------------------
            function after_exec() {
                // variables defined later in commands
                if (!exec) {
                    change_hash = true;
                    if (settings.historyState) {
                        self.save_state(command, false);
                    }
                    change_hash = saved_change_hash;
                }
                deferred.resolve();
                fire_event('onAfterCommand', [command]);
            }
            // -----------------------------------------------------------------
            function show(result) {
                if (typeof result !== 'undefined') {
                    display_object(result);
                }
                after_exec();
                self.resume();
            }
            // -----------------------------------------------------------------

            // -----------------------------------------------------------------
            function invoke() {
                // Call user interpreter function
                var result = interpreter.interpreter.call(self, command, self);
                if (result) {
                    // auto pause/resume when user return promises
                    // it should not pause when user return promise from read()
                    if (!force_awake) {
                        self.pause(settings.softPause);
                    }
                    force_awake = false;
                    var error = make_label_error('Command');
                    // when for native Promise object work only in jQuery 3.x
                    if (is_function(result.done || result.then)) {
                        return unpromise(result, show, error);
                    } else {
                        return $.when(result).done(show).catch(error);
                    }
                } else if (paused) {
                    resume_callbacks.push(function() {
                        // exec with resume/pause in user code
                        after_exec();
                    });
                } else {
                    after_exec();
                }
            }
            // -----------------------------------------------------------------
            // first command store state of the terminal before the command get
            // executed
            if (first_command) {
                first_command = false;
                init_state();
            }
            try {
                // this callback can disable commands
                if (fire_event('onBeforeCommand', [command]) === false) {
                    return;
                }
                if (exec) {
                    prev_exec_cmd = command.trim();
                } else {
                    prev_command = $.terminal.split_command(command);
                }
                if (!ghost()) {
                    // exec execute this function wihout the help of cmd plugin
                    // that add command to history on enter
                    if (exec && (is_function(settings.historyFilter) &&
                                 settings.historyFilter(command) ||
                                 command.match(settings.historyFilter))) {
                        command_line.history().append(command);
                    }
                }
                var interpreter = interpreters.top();
                if (!silent && settings.echoCommand) {
                    echo_command(command);
                }
                // new promise will be returned to exec that will resolve his
                // returned promise
                var deferred = new $.Deferred();
                // we need to save sate before commands is deleyd because
                // execute_extended_command disable it and it can be executed
                // after delay
                var saved_change_hash = change_hash;
                if (command.match(/^\s*login\s*$/) && self.token(true)) {
                    if (self.level() > 1) {
                        self.logout(true);
                    } else {
                        self.logout();
                    }
                    after_exec();
                } else if (settings.exit && command.match(/^\s*exit\s*$/) &&
                           !in_login) {
                    var level = self.level();
                    if (level === 1 && self.get_token() || level > 1) {
                        if (self.get_token(true)) {
                            self.set_token(undefined, true);
                        }
                        self.pop();
                    }
                    after_exec();
                } else if (settings.clear && command.match(/^\s*clear\s*$/) &&
                           !in_login) {
                    self.clear();
                    after_exec();
                } else {
                    var ret = invoke();
                    if (ret) {
                        return ret;
                    }
                }
                return deferred.promise();
            } catch (e) {
                display_exception(e, 'USER', exec);
                self.resume();
                if (exec) {
                    throw e;
                }
            }
        }
        // ---------------------------------------------------------------------
        // :: The logout function removes Storage, disables history and runs
        // :: the login function. This function is called only when options.login
        // :: function is defined. The check for this is in the self.pop method
        // ---------------------------------------------------------------------
        function global_logout() {
            if (fire_event('onBeforeLogout', [], true) === false) {
                return;
            }
            clear_loging_storage();
            fire_event('onAfterlogout', [], true);
            self.login(global_login_fn, true, initialize);
        }
        // ---------------------------------------------------------------------
        function clear_loging_storage() {
            var name = self.prefix_name(true) + '_';
            storage.remove(name + 'token');
            storage.remove(name + 'login');
        }
        // ---------------------------------------------------------------------
        // :: Save the interpreter name for use with purge
        // ---------------------------------------------------------------------
        function maybe_append_name(interpreter_name) {
            var storage_key = self.prefix_name() + '_interpreters';
            var names = storage.get(storage_key);
            if (names) {
                names = JSON.parse(names);
            } else {
                names = [];
            }
            if ($.inArray(interpreter_name, names) === -1) {
                names.push(interpreter_name);
                storage.set(storage_key, JSON.stringify(names));
            }
        }
        // ---------------------------------------------------------------------
        // :: Function enables history, sets prompt, runs interpreter function
        // ---------------------------------------------------------------------
        function prepare_top_interpreter(silent) {
            var interpreter = interpreters.top();
            var name = self.prefix_name(true);
            if (!ghost()) {
                maybe_append_name(name);
            }
            var login = self.login_name(true);
            command_line.name(name + (login ? '_' + login : ''));
            var prompt = interpreter.prompt;
            if (is_function(prompt)) {
                prompt = context_callback_proxy(prompt);
            }
            if (prompt !== command_line.prompt()) {
                if (is_function(interpreter.prompt)) {
                    // prevent flicker of old prompt until async prompt finishes
                    command_line.prompt('');
                }
                command_line.prompt(interpreter.prompt);
            }
            if (typeof interpreter.history !== 'undefined') {
                self.history().toggle(interpreter.history);
            }
            if ($.isPlainObject(interpreter.keymap)) {
                command_line.keymap($.omap(interpreter.keymap, function(name, fun) {
                    return function() {
                        var args = [].slice.call(arguments);
                        try {
                            return fun.apply(self, args);
                        } catch (e) {
                            display_exception(e, 'USER KEYMAP');
                        }
                    };
                }));
            }
            command_line.set('');
            init_queue.resolve();
            if (!silent && is_function(interpreter.onStart)) {
                interpreter.onStart.call(self, self);
            }
        }
        // ---------------------------------------------------------------------
        function fire_event(name, args, skip_local) {
            args = (args || []).concat([self]); // create new array
            // even can be fired before interpreters is created
            var top = interpreters && interpreters.top();
            if (top && is_function(top[name]) && !skip_local) {
                try {
                    return top[name].apply(self, args);
                } catch (e) {
                    delete top[name];
                    display_exception(e, name);
                }
            } else if (is_function(settings[name])) {
                try {
                    return settings[name].apply(self, args);
                } catch (e) {
                    settings[name] = null;
                    display_exception(e, name);
                }
            }
        }
        var scroll_to_view = (function() {
            function scroll_to_view(visible) {
                if (!visible) {
                    // try catch for Node.js unit tests
                    try {
                        self.scroll_to(self.find('.cmd-cursor'));
                        return true;
                    } catch (e) {
                        return true;
                    }
                }
            }
            // we don't want debounce in Unit Tests
            if (typeof global !== 'undefined' && typeof global.it === 'function') {
                return scroll_to_view;
            }
            return debounce(scroll_to_view, 100, {
                leading: true,
                trailing: false
            });
        })();
        // ---------------------------------------------------------------------
        function make_cursor_visible() {
            var cursor = self.find('.cmd-cursor-line');
            return cursor.is_fully_in_viewport(self).then(scroll_to_view);
        }
        // ---------------------------------------------------------------------
        function hashchange() {
            if (fire_hash_change && settings.execHash) {
                try {
                    if (location.hash) {
                        var hash = location.hash.replace(/^#/, '');
                        hash_commands = JSON.parse(decodeURIComponent(hash));
                    } else {
                        hash_commands = [];
                    }
                    if (hash_commands.length) {
                        restore_state(hash_commands[hash_commands.length - 1]);
                    } else if (save_state[0]) {
                        self.import_view(save_state[0]);
                    }
                } catch (e) {
                    display_exception(e, 'TERMINAL');
                }
            }
        }
        // ---------------------------------------------------------------------
        function initialize() {
            prepare_top_interpreter();
            show_greetings();
            if (lines.length) {
                self.refresh(); // for case when showing long error before init
            }
            // was_paused flag is workaround for case when user call exec before
            // login and pause in onInit, 3rd exec will have proper timing (will
            // execute after onInit resume)
            var was_paused = false;
            if (is_function(settings.onInit)) {
                onPause = function() { // local in terminal
                    was_paused = true;
                };
                try {
                    settings.onInit.call(self, self);
                } catch (e) {
                    display_exception(e, 'OnInit');
                    // throw e; // it will be catched by terminal
                } finally {
                    onPause = $.noop;
                    if (!was_paused && self.enabled()) {
                        // resume login if user didn't call pause in onInit
                        // if user pause in onInit wait with exec until it
                        // resume
                        self.resume(true);
                    }
                }
            }
            if (first_instance) {
                first_instance = false;
                $(window).on('hashchange', hashchange);
            }
        }
        // ---------------------------------------------------------------------
        // :: If Ghost don't store anything in localstorage
        // ---------------------------------------------------------------------
        function ghost() {
            return in_login || command_line.mask() !== false;
        }
        // ---------------------------------------------------------------------
        // :: Keydown event handler
        // ---------------------------------------------------------------------
        function user_key_down(e) {
            var result, top = interpreters.top();
            if (is_function(top.keydown)) {
                result = top.keydown.call(self, e, self);
                if (result !== undefined) {
                    return result;
                }
            } else if (is_function(settings.keydown)) {
                result = settings.keydown.call(self, e, self);
                if (result !== undefined) {
                    return result;
                }
            }
        }
        var keymap = {
            'CTRL+D': function(e, original) {
                if (!in_login) {
                    if (command_line.get() === '') {
                        if (interpreters.size() > 1 ||
                            is_function(global_login_fn)) {
                            self.pop('');
                        } else {
                            self.resume();
                            self.echo('');
                        }
                    } else {
                        original();
                    }
                }
                return false;
            },
            'CTRL+C': function() {
                with_selection(function(html) {
                    if (html === '') {
                        var command = self.get_command();
                        var position = self.get_position();
                        command = command.slice(0, position) + '^C' +
                            command.slice(position + 2);
                        echo_command(command);
                        self.set_command('');
                    } else {
                        var clip = self.find('textarea');
                        text_to_clipboard(clip, process_selected_html(html));
                    }
                });
                return false;
            },
            'CTRL+L': function() {
                self.clear();
            },
            'TAB': function(e, orignal) {
                // TODO: move this to cmd plugin
                //       add completion = array | function
                //       !!! Problem complete more then one key need terminal
                var top = interpreters.top(), completion, caseSensitive;
                if (typeof top.caseSensitiveAutocomplete !== 'undefined') {
                    caseSensitive = top.caseSensitiveAutocomplete;
                } else {
                    caseSensitive = settings.caseSensitiveAutocomplete;
                }
                if (settings.completion &&
                    get_type(settings.completion) !== 'boolean' &&
                    top.completion === undefined) {
                    completion = settings.completion;
                } else {
                    completion = top.completion;
                }
                if (completion === 'settings') {
                    completion = settings.completion;
                }
                function resolve(commands) {
                    // local copy
                    commands = commands.slice();
                    // default commands should not match for arguments
                    if (!self.before_cursor(false).match(/\s/)) {
                        if (settings.clear && $.inArray('clear', commands) === -1) {
                            commands.push('clear');
                        }
                        if (settings.exit && $.inArray('exit', commands) === -1) {
                            commands.push('exit');
                        }
                    }
                    self.complete(commands, {
                        echo: true,
                        word: settings.wordAutocomplete,
                        escape: settings.completionEscape,
                        caseSensitive: caseSensitive,
                        echoCommand: settings.doubleTabEchoCommand,
                        doubleTab: settings.doubleTab
                    });
                }
                if (completion) {
                    switch (get_type(completion)) {
                        case 'function':
                            var string = self.before_cursor(settings.wordAutocomplete);
                            if (completion.length === 3) {
                                var error = new Error(strings().comletionParameters);
                                display_exception(error, 'USER');
                                return false;
                            }
                            var result = completion.call(self, string, resolve);
                            unpromise(result, resolve, make_label_error('Completion'));
                            break;
                        case 'array':
                            resolve(completion);
                            break;
                        default:
                            throw new $.terminal.Exception(strings().invalidCompletion);
                    }
                } else {
                    orignal();
                }
                return false;
            },
            'CTRL+V': function(e, original) {
                original(e);
                self.oneTime(200, function() {
                    self.scroll_to_bottom();
                });
                return true;
            },
            'CTRL+TAB': function() {
                if (terminals.length() > 1) {
                    self.focus(false);
                    return false;
                }
            },
            'PAGEDOWN': function() {
                self.scroll(self.height());
            },
            'PAGEUP': function() {
                self.scroll(-self.height());
            }
        };
        // ---------------------------------------------------------------------
        function key_down(e) {
            // Prevent to be executed by cmd: CTRL+D, TAB, CTRL+TAB (if more
            // then one terminal)
            var result, i;
            if (self.enabled()) {
                if (!self.paused()) {
                    result = user_key_down(e);
                    if (result !== undefined) {
                        return result;
                    }
                    if (e.which !== 9) { // not a TAB
                        tab_count = 0;
                    }
                } else {
                    if (!settings.pauseEvents) {
                        result = user_key_down(e);
                        if (result !== undefined) {
                            return result;
                        }
                    }
                    if (e.which === 68 && e.ctrlKey) { // CTRL+D (if paused)
                        if (settings.pauseEvents) {
                            result = user_key_down(e);
                            if (result !== undefined) {
                                return result;
                            }
                        }
                        if (requests.length) {
                            for (i = requests.length; i--;) {
                                var r = requests[i];
                                if (r.readyState !== 4) {
                                    try {
                                        r.abort();
                                    } catch (error) {
                                        if (is_function(settings.exceptionHandler)) {
                                            settings.exceptionHandler.call(
                                                self,
                                                e,
                                                'AJAX ABORT'
                                            );
                                        } else {
                                            self.error(strings().ajaxAbortError);
                                        }
                                    }
                                }
                            }
                            requests = [];
                        }
                        self.resume();
                    }
                    return false;
                }
            }
        }
        // ---------------------------------------------------------------------
        function key_press(e) {
            var top = interpreters.top();
            if (enabled && (!paused || !settings.pauseEvents)) {
                if (is_function(top.keypress)) {
                    return top.keypress.call(self, e, self);
                } else if (is_function(settings.keypress)) {
                    return settings.keypress.call(self, e, self);
                }
            }
        }
        // ---------------------------------------------------------------------
        function ready(queue) {
            return function(fun) {
                queue.add(fun);
            };
        }
        // ---------------------------------------------------------------------
        function strings() {
            return $.extend(
                {},
                $.terminal.defaults.strings,
                settings && settings.strings || {}
            );
        }
        // ---------------------------------------------------------------------
        var self = this;
        if (self.is('body,html')) {
            self = $('<div/>').appendTo('body');
            $('body').addClass('full-screen-terminal');
        }
        if (this.length > 1) {
            return this.each(function() {
                $.fn.terminal.call(
                    $(this),
                    init_interpreter,
                    $.extend({name: self.selector}, options)
                );
            });
        }
        // terminal already exists
        if (self.data('terminal')) {
            return self.data('terminal');
        }
        // -----------------------------------------------------------------
        // TERMINAL METHODS
        // -----------------------------------------------------------------
        $.extend(self, $.omap({
            id: function() {
                return terminal_id;
            },
            // -------------------------------------------------------------
            // :: Clear the output
            // -------------------------------------------------------------
            clear: function() {
                if (fire_event('onClear') !== false) {
                    lines.forEach(function(line, i) {
                        var options = line[1];
                        if (is_function(options.onClear)) {
                            options.onClear.call(self, get_node(i));
                        }
                    });
                    lines = [];
                    output[0].innerHTML = '';
                    self.prop({scrollTop: 0});
                }
                return self;
            },
            // -------------------------------------------------------------
            // :: Return an object that can be used with import_view to
            // :: restore the state
            // -------------------------------------------------------------
            export_view: function() {
                var user_export = fire_event('onExport');
                user_export = user_export || {};
                return $.extend({}, {
                    focus: enabled,
                    mask: command_line.mask(),
                    prompt: self.get_prompt(),
                    command: self.get_command(),
                    position: command_line.position(),
                    lines: clone(lines),
                    interpreters: interpreters.clone(),
                    history: command_line.history().data
                }, user_export);
            },
            // -------------------------------------------------------------
            // :: Restore the state of the previous exported view
            // -------------------------------------------------------------
            import_view: function(view) {
                if (in_login) {
                    throw new Error(sprintf(strings().notWhileLogin, 'import_view'));
                }
                fire_event('onImport', [view]);
                when_ready(function ready() {
                    self.set_prompt(view.prompt);
                    self.set_command(view.command);
                    command_line.position(view.position);
                    command_line.mask(view.mask);
                    if (view.focus) {
                        self.focus();
                    }
                    lines = clone(view.lines).filter(function(line) {
                        return line[0];
                    });
                    if (view.interpreters instanceof Stack) {
                        interpreters = view.interpreters;
                    }
                    if (settings.importHistory) {
                        command_line.history().set(view.history);
                    }
                    redraw();
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: Store current terminal state
            // -------------------------------------------------------------
            save_state: function(command, ignore_hash, index) {
                // save_state.push({view:self.export_view(), join:[]});
                if (typeof index !== 'undefined') {
                    save_state[index] = self.export_view();
                } else {
                    save_state.push(self.export_view());
                }
                if (!$.isArray(hash_commands)) {
                    hash_commands = [];
                }
                if (command !== undefined && !ignore_hash) {
                    var state = [
                        terminal_id,
                        save_state.length - 1,
                        command
                    ];
                    hash_commands.push(state);
                    maybe_update_hash();
                }
                return self;
            },
            // -------------------------------------------------------------
            // :: Execute a command, it will handle commands that do AJAX
            // :: calls and have delays, if the second argument is set to
            // :: true it will not echo executed command
            // -------------------------------------------------------------
            exec: function(command, silent, deferred) {
                var d = deferred || new $.Deferred();
                cmd_ready(function ready() {
                    if ($.isArray(command)) {
                        (function recur() {
                            var cmd = command.shift();
                            if (cmd) {
                                self.exec(cmd, silent).done(recur);
                            } else {
                                d.resolve();
                            }
                        })();
                    } else if (paused) {
                        // both commands executed here (resume will call Term::exec)
                        // delay command multiple time
                        delayed_commands.push([command, silent, d]);
                    } else {
                        // commands may return promise from user code
                        // it will resolve exec promise when user promise
                        // is resolved
                        var ret = commands(command, silent, true);
                        unpromise(ret, function() {
                            d.resolve();
                        }, function() {
                            d.reject();
                        });
                    }
                });
                // while testing it didn't executed last exec when using this
                // for resolved deferred
                return d.promise();
            },
            // -------------------------------------------------------------
            // :: bypass login function that wait untill you type user/pass
            // :: it hide implementation detail
            // -------------------------------------------------------------
            autologin: function(user, token, silent) {
                self.trigger('terminal.autologin', [user, token, silent]);
                return self;
            },
            // -------------------------------------------------------------
            // :: Function changes the prompt of the command line to login
            // :: with a password and calls the user login function with
            // :: the callback that expects a token. The login is successful
            // :: if the user calls it with value that is truthy
            // -------------------------------------------------------------
            login: function(auth, infinite, success, error) {
                logins.push([].slice.call(arguments));
                if (in_login) {
                    throw new Error(sprintf(strings().notWhileLogin, 'login'));
                }
                if (!is_function(auth)) {
                    throw new Error(strings().loginIsNotAFunction);
                }
                in_login = true;
                if (self.token() && self.level() === 1 && !autologin) {
                    in_login = false; // logout will call login
                    self.logout(true);
                } else if (self.token(true) && self.login_name(true)) {
                    in_login = false;
                    if (is_function(success)) {
                        success();
                    }
                    return self;
                }
                // don't store login data in history
                if (settings.history) {
                    command_line.history().disable();
                }
                function popUserPass() {
                    while (self.level() > level) {
                        self.pop(undefined, true);
                    }
                    if (settings.history) {
                        command_line.history().enable();
                    }
                }
                // so we know how many times call pop
                var level = self.level();
                function login_callback(user, token, silent) {
                    if (self.paused()) {
                        self.resume();
                    }
                    if (token) {
                        popUserPass();
                        var name = self.prefix_name(true) + '_';
                        storage.set(name + 'token', token);
                        storage.set(name + 'login', user);
                        in_login = false;
                        fire_event('onAfterLogin', [user, token]);
                        if (is_function(success)) {
                            // will be used internaly since users know
                            // when login success (they decide when
                            // it happen by calling the callback -
                            // this funtion)
                            success();
                        }
                    } else {
                        if (infinite) {
                            if (!silent) {
                                self.error(strings().wrongPasswordTryAgain);
                            }
                            self.pop(undefined, true).set_mask(false);
                        } else {
                            in_login = false;
                            if (!silent) {
                                self.error(strings().wrongPassword);
                            }
                            self.pop(undefined, true).pop(undefined, true);
                        }
                        // used only to call pop in push
                        if (is_function(error)) {
                            error();
                        }
                    }
                    self.off('terminal.autologin');
                }
                self.on('terminal.autologin', function(event, user, token, silent) {
                    if (fire_event('onBeforeLogin', [user, token]) === false) {
                        return;
                    }
                    login_callback(user, token, silent);
                });
                self.push(function(user) {
                    self.set_mask(settings.maskChar).push(function(pass) {
                        try {
                            if (fire_event('onBeforeLogin', [user, pass]) === false) {
                                popUserPass();
                                return;
                            }
                            self.pause();
                            var ret = auth.call(self, user, pass, function(
                                token,
                                silent) {
                                login_callback(user, token, silent);
                            });
                            if (ret && is_function(ret.then || ret.done)) {
                                (ret.then || ret.done).call(ret, function(token) {
                                    login_callback(user, token);
                                });
                            }
                        } catch (e) {
                            display_exception(e, 'AUTH');
                        }
                    }, {
                        prompt: strings().password + ': ',
                        name: 'password'
                    });
                }, {
                    prompt: strings().login + ': ',
                    name: 'login'
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: User defined settings and defaults as well
            // -------------------------------------------------------------
            settings: function() {
                return settings;
            },
            // -------------------------------------------------------------
            // :: Get string before cursor
            // -------------------------------------------------------------
            before_cursor: function(word) {
                var pos = command_line.position();
                var command = command_line.get().slice(0, pos);
                var cmd_strings = command.split(' ');
                var string; // string before cursor that will be completed
                if (word) {
                    if (cmd_strings.length === 1) {
                        string = cmd_strings[0];
                    } else {
                        var m = command.match(/(\\?")/g);
                        var double_quotes = m ? m.filter(function(chr) {
                            return !chr.match(/^\\/);
                        }).length : 0;
                        m = command.match(/'/g);
                        var single_quote = m ? m.length : 0;
                        if (single_quote % 2 === 1) {
                            string = command.match(/('[^']*)$/)[0];
                        } else if (double_quotes % 2 === 1) {
                            string = command.match(/("(?:[^"]|\\")*)$/)[0];
                        } else {
                            string = cmd_strings[cmd_strings.length - 1];
                            for (i = cmd_strings.length - 1; i > 0; i--) {
                                // treat escape space as part of the string
                                var prev_string = cmd_strings[i - 1];
                                if (prev_string[prev_string.length - 1] === '\\') {
                                    string = cmd_strings[i - 1] + ' ' + string;
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                } else {
                    string = command;
                }
                return string;
            },
            // -------------------------------------------------------------
            // :: complete word or command based on array of words
            // -------------------------------------------------------------
            complete: function(commands, options) {
                options = $.extend({
                    word: true,
                    echo: false,
                    escape: true,
                    echoCommand: false,
                    caseSensitive: true,
                    doubleTab: null
                }, options || {});
                var sensitive = options.caseSensitive;
                // cursor can be in the middle of the command
                // so we need to get the text before the cursor
                var string = self.before_cursor(options.word).replace(/\\"/g, '"');
                var quote = false;
                if (options.word) {
                    if (string.match(/^"/)) {
                        quote = '"';
                    } else if (string.match(/^'/)) {
                        quote = "'";
                    }
                    if (quote) {
                        string = string.replace(/^["']/, '');
                    }
                }
                if (tab_count % 2 === 0) {
                    command = self.before_cursor(options.word);
                } else {
                    var test = self.before_cursor(options.word);
                    if (test !== command) {
                        // command line changed between TABS - ignore
                        return;
                    }
                }
                var safe = $.terminal.escape_regex(string);
                if (options.escape) {
                    safe = safe.replace(/(\\+)(["'() ])/g, function(_, slash, chr) {
                        if (chr.match(/[()]/)) {
                            return slash + '\\?\\' + chr;
                        } else {
                            return slash + '?' + chr;
                        }
                    });
                }
                function escape(string) {
                    if (quote === '"') {
                        string = string.replace(/"/g, '\\"');
                    }
                    if (!quote && options.escape) {
                        string = string.replace(/(["'() ])/g, '\\$1');
                    }
                    return string;
                }
                function matched_strings() {
                    var matched = [];
                    for (var i = commands.length; i--;) {
                        if (commands[i].match(/\n/) && options.word) {
                            warn('If you use commands with newlines you ' +
                                 'should use word option for complete or' +
                                 ' wordAutocomplete terminal option');
                        }
                        if (regex.test(commands[i])) {
                            var match = escape(commands[i]);
                            if (!sensitive && same_case(match)) {
                                if (string.toLowerCase() === string) {
                                    match = match.toLowerCase();
                                } else if (string.toUpperCase() === string) {
                                    match = match.toUpperCase();
                                }
                            }
                            matched.push(match);
                        }
                    }
                    return matched;
                }
                var flags = sensitive ? '' : 'i';
                var regex = new RegExp('^' + safe, flags);
                var matched = matched_strings();
                function replace(input, replacement) {
                    var text = self.get_command();
                    var pos = self.get_position();
                    var re = new RegExp('^' + input, 'i');
                    var pre = text.slice(0, pos);
                    var post = text.slice(pos);
                    var to_insert = replacement.replace(re, '') + (quote || '');
                    self.set_command(pre + to_insert + post);
                    self.set_position((pre + to_insert).length);
                }
                if (matched.length === 1) {
                    if (options.escape) {
                        replace(safe, matched[0]);
                    } else {
                        self.insert(matched[0].replace(regex, '') + (quote || ''));
                    }
                    command = self.before_cursor(options.word);
                    return true;
                } else if (matched.length > 1) {
                    if (++tab_count >= 2) {
                        tab_count = 0;
                        if (options.echo) {
                            if (is_function(options.doubleTab)) {
                                // new API old is keep for backward compatibility
                                if (options.echoCommand) {
                                    echo_command();
                                }
                                var ret = options.doubleTab.call(
                                    self,
                                    string,
                                    matched,
                                    echo_command
                                );
                                if (typeof ret === 'undefined') {
                                    return true;
                                } else {
                                    return ret;
                                }
                            } else if (options.doubleTab !== false) {
                                echo_command();
                                var text = matched.slice().reverse().join('\t\t');
                                self.echo($.terminal.escape_brackets(text), {
                                    keepWords: true,
                                    formatters: false
                                });
                            }
                            return true;
                        }
                    } else {
                        var common = common_string(escape(string), matched, sensitive);
                        if (common) {
                            replace(safe, common);
                            command = self.before_cursor(options.word);
                            return true;
                        }
                    }
                }
            },
            // -------------------------------------------------------------
            // :: Return commands function from top interpreter
            // -------------------------------------------------------------
            commands: function() {
                return interpreters.top().interpreter;
            },
            // -------------------------------------------------------------
            // :: Low Level method that overwrites interpreter
            // -------------------------------------------------------------
            set_interpreter: function(user_intrp, login) {
                function overwrite_interpreter() {
                    self.pause(settings.softPause);
                    make_interpreter(user_intrp, login, function(result) {
                        self.resume();
                        var top = interpreters.top();
                        $.extend(top, result);
                        prepare_top_interpreter(true);
                    });
                }
                if (is_function(login)) {
                    self.login(login, true, overwrite_interpreter);
                } else if (get_type(user_intrp) === 'string' && login) {
                    self.login(
                        make_json_rpc_login(user_intrp, login),
                        true,
                        overwrite_interpreter
                    );
                } else {
                    overwrite_interpreter();
                }
                return self;
            },
            // -------------------------------------------------------------
            // :: Show user greetings or terminal signature
            // -------------------------------------------------------------
            greetings: function() {
                show_greetings();
                return self;
            },
            // -------------------------------------------------------------
            // :: Return true if terminal is paused false otherwise
            // -------------------------------------------------------------
            paused: function() {
                return paused;
            },
            // -------------------------------------------------------------
            // :: Pause the terminal, it should be used for ajax calls
            // -------------------------------------------------------------
            pause: function(visible) {
                cmd_ready(function ready() {
                    onPause();
                    paused = true;
                    command_line.disable(visible || is_android);
                    if (!visible) {
                        command_line.find('.cmd-prompt').hidden();
                    }
                    fire_event('onPause');
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: Resume the previously paused terminal
            // -------------------------------------------------------------
            resume: function(silent) {
                cmd_ready(function ready() {
                    paused = false;
                    if (enabled && terminals.front() === self) {
                        command_line.enable(silent);
                    }
                    command_line.find('.cmd-prompt').visible();
                    var original = delayed_commands;
                    delayed_commands = [];
                    for (var i = 0; i < original.length; ++i) {
                        self.exec.apply(self, original[i]);
                    }
                    self.trigger('resume');
                    var fn = resume_callbacks.shift();
                    if (fn) {
                        fn();
                    }
                    self.scroll_to_bottom();
                    fire_event('onResume');
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: Return the number of characters that fit into the width of
            // :: the terminal
            // -------------------------------------------------------------
            cols: function() {
                if (settings.numChars) {
                    return settings.numChars;
                }
                if (typeof num_chars === 'undefined' || num_chars === 1000) {
                    num_chars = get_num_chars(self, char_size);
                }
                return num_chars;
            },
            // -------------------------------------------------------------
            // :: Return the number of lines that fit into the height of the
            // :: terminal
            // -------------------------------------------------------------
            rows: function() {
                if (settings.numRows) {
                    return settings.numRows;
                }
                if (typeof num_rows === 'undefined') {
                    num_rows = get_num_rows(self, char_size);
                }
                return num_rows;
            },
            // -------------------------------------------------------------
            // :: Return the History object
            // -------------------------------------------------------------
            history: function() {
                return command_line.history();
            },
            // -------------------------------------------------------------
            // :: toggle recording of history state
            // -------------------------------------------------------------
            history_state: function(toggle) {
                function run() {
                    settings.historyState = true;
                    if (!save_state.length) {
                        self.save_state();
                    } else if (terminals.length() > 1) {
                        self.save_state(null);
                    }
                }
                if (toggle) {
                    // if set to true and if set from user command we need
                    // not to include the command
                    if (typeof window.setImmediate === 'undefined') {
                        setTimeout(run, 0);
                    } else {
                        setImmediate(run);
                    }
                } else {
                    settings.historyState = false;
                }
                return self;
            },
            // -------------------------------------------------------------
            // :: clear the history state
            // -------------------------------------------------------------
            clear_history_state: function() {
                hash_commands = [];
                save_state = [];
                return self;
            },
            // -------------------------------------------------------------
            // :: Switch to the next terminal
            // -------------------------------------------------------------
            next: function() {
                if (terminals.length() === 1) {
                    return self;
                } else {
                    terminals.front().disable();
                    var next = terminals.rotate().enable();
                    // 50 provides buffer in viewport
                    var x = next.offset().top - 50;
                    $('html,body').animate({scrollTop: x}, 500);
                    try {
                        trigger_terminal_change(next);
                    } catch (e) {
                        display_exception(e, 'onTerminalChange');
                    }
                    return next;
                }
            },
            // -------------------------------------------------------------
            // :: Make the terminal in focus or blur depending on the first
            // :: argument. If there is more then one terminal it will
            // :: switch to next one, if the second argument is set to true
            // :: the events will be not fired. Used on init
            // -------------------------------------------------------------
            focus: function(toggle, silent) {
                cmd_ready(function ready() {
                    if (terminals.length() === 1) {
                        if (toggle === false) {
                            self.disable(silent);
                        } else {
                            self.enable(silent);
                        }
                    } else if (toggle === false) {
                        self.next();
                    } else {
                        var front = terminals.front();
                        if (front !== self) {
                            // there should be only from terminal enabled but tests
                            // sometime fail because there where more them one
                            // where cursor have blink class
                            terminals.forEach(function(terminal) {
                                if (terminal !== self && terminal.enabled()) {
                                    terminal.disable(silent);
                                }
                            });
                            if (!silent) {
                                try {
                                    trigger_terminal_change(self);
                                } catch (e) {
                                    display_exception(e, 'onTerminalChange');
                                }
                            }
                        }
                        terminals.set(self);
                        self.enable(silent);
                    }
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: Disable/Enable terminal that can be enabled by click
            // -------------------------------------------------------------
            freeze: function(freeze) {
                when_ready(function ready() {
                    if (freeze) {
                        self.disable();
                        frozen = true;
                    } else {
                        frozen = false;
                        self.enable();
                    }
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: check if terminal is frozen
            // -------------------------------------------------------------
            frozen: function() {
                return frozen;
            },
            // -------------------------------------------------------------
            // :: Enable the terminal
            // -------------------------------------------------------------
            enable: function(silent) {
                if (!enabled && !frozen) {
                    if (num_chars === undefined) {
                        // enabling first time
                        self.resize();
                    }
                    cmd_ready(function ready() {
                        var ret;
                        if (!silent && !enabled) {
                            fire_event('onFocus');
                        }
                        if (!silent && ret === undefined || silent) {
                            enabled = true;
                            if (!self.paused()) {
                                command_line.enable(true);
                            }
                        }
                    });
                }
                return self;
            },
            // -------------------------------------------------------------
            // :: function clear formatting cache if you don't longer need it
            // :: cache is used if option useCache is set to true
            // -------------------------------------------------------------
            clear_cache: 'Map' in root ? function() {
                format_cache.clear();
                string_cache.clear();
                return self;
            } : function() {
                return self;
            },
            // -------------------------------------------------------------
            // :: Disable the terminal
            // -------------------------------------------------------------
            disable: function(silent) {
                cmd_ready(function ready() {
                    var ret;
                    if (!silent && enabled) {
                        ret = fire_event('onBlur');
                    }
                    if (!silent && ret === undefined || silent) {
                        enabled = false;
                        command_line.disable();
                    }
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: return true if the terminal is enabled
            // -------------------------------------------------------------
            enabled: function() {
                return enabled;
            },
            // -------------------------------------------------------------
            // :: Return the terminal signature depending on the size of the terminal
            // -------------------------------------------------------------
            signature: function() {
                var cols = self.cols();
                for (var i = signatures.length; i--;) {
                    var lengths = signatures[i].map(function(line) {
                        return line.length;
                    });
                    if (Math.max.apply(null, lengths) <= cols) {
                        return signatures[i].join('\n') + '\n';
                    }
                }
                return '';
            },
            // -------------------------------------------------------------
            // :: Return the version number
            // -------------------------------------------------------------
            version: function() {
                return $.terminal.version;
            },
            // -------------------------------------------------------------
            // :: Return actual command line object (jquery object with cmd
            // :: methods)
            // -------------------------------------------------------------
            cmd: function() {
                return command_line;
            },
            // -------------------------------------------------------------
            // :: Return the current command entered by terminal
            // -------------------------------------------------------------
            get_command: function() {
                return command_line.get();
            },
            // -------------------------------------------------------------
            // :: echo command and previous prompt (used by echo_newline.js)
            // -------------------------------------------------------------
            echo_command: function(command) {
                return echo_command(command);
            },
            // -------------------------------------------------------------
            // :: Change the command line to the new one
            // -------------------------------------------------------------
            set_command: function(command, silent) {
                when_ready(function ready() {
                    // TODO: refactor to use options - breaking change
                    if (typeof command !== 'string') {
                        command = JSON.stringify(command);
                    }
                    command_line.set(command, undefined, silent);
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: Change position of the command line
            // -------------------------------------------------------------
            set_position: function(position, relative) {
                when_ready(function ready() {
                    command_line.position(position, relative);
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: Return position of the command line
            // -------------------------------------------------------------
            get_position: function() {
                return command_line.position();
            },
            // -------------------------------------------------------------
            // :: Insert text into the command line after the cursor
            // -------------------------------------------------------------
            insert: function(string, stay) {
                if (typeof string === 'string') {
                    when_ready(function ready() {
                        var bottom = self.is_bottom();
                        command_line.insert(string, stay);
                        if (settings.scrollOnEcho || bottom) {
                            self.scroll_to_bottom();
                        }
                    });
                    return self;
                } else {
                    throw new Error(sprintf(strings().notAString, 'insert'));
                }
            },
            // -------------------------------------------------------------
            // :: Set the prompt of the command line
            // -------------------------------------------------------------
            set_prompt: function(prompt) {
                when_ready(function ready() {
                    if (is_function(prompt)) {
                        command_line.prompt(function(callback) {
                            prompt.call(self, callback, self);
                        });
                    } else {
                        command_line.prompt(prompt);
                    }
                    interpreters.top().prompt = prompt;
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: Return the prompt used by the terminal
            // -------------------------------------------------------------
            get_prompt: function() {
                return interpreters.top().prompt;
                // command_line.prompt(); - can be a wrapper
                //return command_line.prompt();
            },
            // -------------------------------------------------------------
            // :: Enable or Disable mask depedning on the passed argument
            // :: the mask can also be character (in fact it will work with
            // :: strings longer then one)
            // -------------------------------------------------------------
            set_mask: function(mask) {
                when_ready(function ready() {
                    command_line.mask(mask === true ? settings.maskChar : mask);
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: Return the ouput of the terminal as text
            // -------------------------------------------------------------
            get_output: function(raw) {
                if (raw) {
                    return lines;
                } else {
                    return $.map(lines, function(item) {
                        return is_function(item[0]) ? item[0]() : item[0];
                    }).join('\n');
                }
            },
            // -------------------------------------------------------------
            // :: Recalculate and redraw everything
            // -------------------------------------------------------------
            resize: function(width, height) {
                if (!self.is(':visible')) {
                    // delay resize if terminal not visible
                    self.stopTime('resize');
                    self.oneTime(500, 'resize', function() {
                        self.resize(width, height);
                    });
                } else {
                    if (width && height) {
                        self.width(width);
                        self.height(height);
                    }
                    width = self.width();
                    height = self.height();
                    if (typeof settings.numChars !== 'undefined' ||
                        typeof settings.numRows !== 'undefined') {
                        command_line.resize(settings.numChars);
                        self.refresh();
                        fire_event('onResize');
                        return;
                    }
                    var new_num_chars = get_num_chars(self, char_size);
                    var new_num_rows = get_num_rows(self, char_size);
                    // only if number of chars changed
                    if (new_num_chars !== num_chars ||
                        new_num_rows !== num_rows) {
                        num_chars = new_num_chars;
                        num_rows = new_num_rows;
                        command_line.resize(num_chars);
                        self.refresh();
                        fire_event('onResize');
                    }
                }
                return self;
            },
            // -------------------------------------------------------------
            // :: redraw the terminal
            // -------------------------------------------------------------
            refresh: function() {
                if (char_size.width !== 0) {
                    self[0].style.setProperty('--char-width', char_size.width);
                }
                redraw({
                    scroll: false,
                    update: true
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: Flush the output to the terminal
            // -------------------------------------------------------------
            flush: function(options) {
                options = $.extend({}, {
                    update: false,
                    scroll: true
                }, options || {});
                try {
                    var bottom = self.is_bottom();
                    output.css('visibilty', 'hidden');
                    var wrapper;
                    // print all lines
                    // var output_buffer = lines.flush();
                    while (output_buffer.length) {
                        var data = output_buffer.shift();
                        if (data === NEW_LINE) {
                            wrapper = $(document.createElement('div'));
                        } else if ($.isPlainObject(data) && is_function(data.finalize)) {
                            // this is finalize function from echo
                            if (options.update) {
                                var selector = '> div[data-index=' + data.index + ']';
                                var node = output.find(selector);
                                if (node.html() !== wrapper.html()) {
                                    node.replaceWith(wrapper);
                                }
                            } else {
                                wrapper.appendTo(output);
                            }
                            wrapper.attr('data-index', data.index);
                            data.finalize(wrapper);
                        } else {
                            var line = data.line;
                            var div = document.createElement('div');
                            div.style.width = '100%';
                            div.innerHTML = line;
                            if (data.newline) {
                                div.className = 'cmd-end-line';
                            }
                            wrapper[0].appendChild(div);
                        }
                    }
                    limit_lines();
                    output.css('visibilty', '');
                    fire_event('onFlush');

                    if ((settings.scrollOnEcho && options.scroll) || bottom) {
                        self.scroll_to_bottom();
                    }
                } catch (e1) {
                    if (is_function(settings.exceptionHandler)) {
                        try {
                            settings.exceptionHandler.call(self, e1, 'TERMINAL (Flush)');
                        } catch (e2) {
                            settings.exceptionHandler = $.noop;
                            alert_exception('[exceptionHandler]', e2);
                        }
                    } else {
                        alert_exception('[Flush]', e1);
                    }
                } finally {
                    output_buffer = [];
                }
                return self;
            },
            // -------------------------------------------------------------
            // :: Update the output line - line number can be negative
            // -------------------------------------------------------------
            update: function(line, value, options) {
                when_ready(function ready() {
                    if (line < 0) {
                        line = lines.length + line; // yes +
                    }
                    if (!lines[line]) {
                        self.error('Invalid line number ' + line);
                    } else if (value === null) {
                        lines.splice(line, 1);
                        output.find('[data-index=' + line + ']').remove();
                    } else {
                        var ret = prepare_render(value, options);
                        if (ret) {
                            value = ret[0];
                            options = ret[1];
                        }
                        lines[line][0] = value;
                        if (options) {
                            lines[line][1] = options;
                        }
                        process_line({
                            value: value,
                            index: line,
                            options: options
                        });
                        self.flush({
                            scroll: false,
                            update: true
                        });
                    }
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: convenience method for removing selected line
            // -------------------------------------------------------------
            remove_line: function(line) {
                return self.update(line, null);
            },
            // -------------------------------------------------------------
            // :: return index of last line in case when you need to update
            // :: after something is echo on the terminal
            // -------------------------------------------------------------
            last_index: function() {
                return lines.length - 1;
            },
            // -------------------------------------------------------------
            // :: Print data to the terminal output. It can have options
            // :: * flush - indicate that arg should be send to DOM
            // :: * raw - indicate if it should handle input as html
            // :: * finalize - function call with container div
            // :: * keepWords - inform how to wrap text
            // :: * formatters - inform function if it should use formatters
            // ::   on input string - good to prevent XSS when you want
            // ::   advanced server side controling of terminal
            // :: you can echo: promise, function, strings array or string
            // -------------------------------------------------------------
            echo: function(arg, options) {
                var arg_defined = arguments.length > 0;
                function echo(arg) {
                    try {
                        var locals = $.extend({
                            flush: true,
                            exec: true,
                            raw: settings.raw,
                            finalize: $.noop,
                            unmount: $.noop,
                            keepWords: false,
                            invokeMethods: settings.invokeMethods,
                            onClear: null,
                            formatters: true,
                            allowedAttributes: settings.allowedAttributes
                        }, options || {});
                        // finalize function is passed around and invoked
                        // in terminal::flush after content is added to DOM
                        (function(finalize) {
                            locals.finalize = function(div) {
                                if (locals.raw) {
                                    div.addClass('raw');
                                }
                                try {
                                    if (is_function(finalize)) {
                                        finalize.call(self, div);
                                    }
                                    div.find('img').each(function() {
                                        var self = $(this);
                                        var img = new Image();
                                        img.onerror = function() {
                                            self.replaceWith(use_broken_image);
                                        };
                                        img.src = this.src;
                                    });
                                } catch (e) {
                                    display_exception(e, 'USER:echo(finalize)');
                                    finalize = null;
                                }
                            };
                        })(locals.finalize);
                        if (locals.flush) {
                            // flush buffer if there was no flush after previous echo
                            if (output_buffer.length) {
                                self.flush();
                            }
                        }
                        if (fire_event('onBeforeEcho', [arg]) === false) {
                            return;
                        }
                        var value;
                        if (typeof arg === 'function') {
                            value = arg.bind(self);
                        } else if (typeof arg === 'undefined') {
                            if (arg_defined) {
                                value = String(arg);
                            } else {
                                value = '';
                            }
                        } else {
                            var ret = preprocess_value(arg);
                            if (ret === false) {
                                return self;
                            }
                            value = ret;
                        }
                        if (render(value, locals)) {
                            return self;
                        }
                        process_line({
                            value: value,
                            options: locals,
                            index: lines.length
                        });
                        // extended commands should be processed only
                        // once in echo and not on redraw
                        locals.exec = false;
                        lines.push([value, locals]);
                        if (locals.flush) {
                            self.flush();
                            fire_event('onAfterEcho', [arg]);
                        }
                    } catch (e) {
                        // if echo throw exception we can't use error to
                        // display that exception
                        if (is_function(settings.exceptionHandler)) {
                            settings.exceptionHandler.call(self, e, 'TERMINAL (echo)');
                        } else {
                            alert_exception('[Terminal.echo]', e);
                        }
                    }
                }
                if (arg !== undefined && is_function(arg.then)) {
                    $.when(arg).done(echo).catch(make_label_error('Echo'));
                } else {
                    echo(arg);
                }
                return self;
            },
            // -------------------------------------------------------------
            // :: echo red text
            // -------------------------------------------------------------
            error: function(message, options) {
                options = $.extend({}, options, {raw: false, formatters: false});
                function format(string) {
                    if (typeof string !== 'string') {
                        string = String(string);
                    }
                    // quick hack to fix trailing backslash
                    var str = $.terminal.escape_brackets(string).
                        replace(/\\$/, '&#92;').
                        replace(url_re, ']$1[[;;;terminal-error]');
                    return '[[;;;terminal-error]' + str + ']';
                }
                if (typeof message === 'function') {
                    return self.echo(function() {
                        return format(message.call(self));
                    }, options);
                }
                if (message && message.then) {
                    message.then(function(string) {
                        self.echo(format(string));
                    }).catch(make_label_error('Echo Error'));
                    return self;
                }
                return self.echo(format(message), options);
            },
            // -------------------------------------------------------------
            // :: Display Exception on terminal
            // -------------------------------------------------------------
            exception: function(e, label) {
                var message = exception_message(e);
                if (label) {
                    message = '&#91;' + label + '&#93;: ' + message;
                }
                if (message) {
                    self.error(message, {
                        finalize: function(div) {
                            div.addClass('terminal-exception terminal-message');
                        },
                        keepWords: true
                    });
                }
                if (typeof e.fileName === 'string') {
                    // display filename and line which throw exeption
                    self.pause(settings.softPause);
                    $.get(e.fileName, function(file) {
                        var num = e.lineNumber - 1;
                        var line = file.split('\n')[num];
                        if (line) {
                            self.error('[' + e.lineNumber + ']: ' + line);
                        }
                        self.resume();
                    }, 'text');
                }
                if (e.stack) {
                    var stack = $.terminal.escape_brackets(e.stack);
                    self.echo(stack.split(/\n/g).map(function(trace) {
                        // nested formatting will handle urls but that formatting
                        // can be removed - this code was created before
                        // that formatting existed (see commit ce01c3f5)
                        return '[[;;;terminal-error]' +
                            trace.replace(url_re, function(url) {
                                return ']' + url + '[[;;;terminal-error]';
                            }) + ']';
                    }).join('\n'), {
                        finalize: function(div) {
                            div.addClass('terminal-exception terminal-stack-trace');
                        },
                        formatters: false
                    });
                }
                return self;
            },
            // -------------------------------------------------------------
            // :: Scroll Div that holds the terminal
            // -------------------------------------------------------------
            scroll: function(amount) {
                var pos;
                amount = Math.round(amount);
                if (self.prop) { // work with jQuery > 1.6
                    if (amount > self.prop('scrollTop') && amount > 0) {
                        self.prop('scrollTop', 0);
                    }
                    pos = self.prop('scrollTop');
                    self.scrollTop(pos + amount);
                } else {
                    if (amount > self.prop('scrollTop') && amount > 0) {
                        self.prop('scrollTop', 0);
                    }
                    pos = self.prop('scrollTop');
                    self.scrollTop(pos + amount);
                }
                return self;
            },
            // -------------------------------------------------------------
            // :: Exit all interpreters and logout. The function will throw
            // :: exception if there is no login provided
            // -------------------------------------------------------------
            logout: function(local) {
                if (in_login) {
                    throw new Error(sprintf(strings().notWhileLogin, 'logout'));
                }
                when_ready(function ready() {
                    if (local) {
                        var login = logins.pop();
                        self.set_token(undefined, true);
                        self.login.apply(self, login);
                    } else if (interpreters.size() === 1 && self.token()) {
                        self.logout(true);
                    } else {
                        while (interpreters.size() > 1) {
                            // pop will call global_logout that will call login
                            // and size will be > 0; this is workaround the problem
                            if (self.token()) {
                                self.logout(true).pop().pop();
                            } else {
                                self.pop();
                            }
                        }
                    }
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: Function returns the token returned by callback function
            // :: in login function. It does nothing (return undefined) if
            // :: there is no login
            // -------------------------------------------------------------
            token: function(local) {
                return storage.get(self.prefix_name(local) + '_token');
            },
            // -------------------------------------------------------------
            // :: Function sets the token to the supplied value. This function
            // :: works regardless of wherer settings.login is supplied
            // -------------------------------------------------------------
            set_token: function(token, local) {
                var name = self.prefix_name(local) + '_token';
                if (typeof token === 'undefined') {
                    storage.remove(name);
                } else {
                    storage.set(name, token);
                }
                return self;
            },
            // -------------------------------------------------------------
            // :: Function get the token either set by the login method or
            // :: by the set_token method.
            // -------------------------------------------------------------
            get_token: function(local) {
                return self.token(local);
            },
            // -------------------------------------------------------------
            // :: Function return Login name entered by the user
            // -------------------------------------------------------------
            login_name: function(local) {
                return storage.get(self.prefix_name(local) + '_login');
            },
            // -------------------------------------------------------------
            // :: Function returns the name of current interpreter
            // -------------------------------------------------------------
            name: function() {
                return interpreters.top().name;
            },
            // -------------------------------------------------------------
            // :: Function return prefix name for login/token
            // -------------------------------------------------------------
            prefix_name: function(local) {
                var name = (settings.name ? settings.name + '_' : '') +
                    terminal_id;
                if (local && interpreters.size() > 1) {
                    var local_name = interpreters.map(function(intrp) {
                        return intrp.name || '';
                    }).slice(1).join('_');
                    if (local_name) {
                        name += '_' + local_name;
                    }
                }
                return name;
            },
            // -------------------------------------------------------------
            // :: wrapper for common use case
            // -------------------------------------------------------------
            read: function(message, success, cancel) {
                // return from read() should not pause terminal
                force_awake = true;
                var defer = jQuery.Deferred();
                var read = false;
                self.push(function(string) {
                    read = true;
                    defer.resolve(string);
                    if (is_function(success)) {
                        success(string);
                    }
                    self.pop();
                    if (settings.history) {
                        command_line.history().enable();
                    }
                }, {
                    name: 'read',
                    history: false,
                    prompt: message || '',
                    onExit: function() {
                        if (!read) {
                            defer.reject();
                            if (is_function(cancel)) {
                                cancel();
                            }
                        }
                    }
                });
                if (settings.history) {
                    command_line.history().disable();
                }
                return defer.promise();
            },
            // -------------------------------------------------------------
            // :: Push a new interenter on the Stack
            // -------------------------------------------------------------
            push: function(interpreter, options) {
                cmd_ready(function ready() {
                    options = options || {};
                    var defaults = {
                        infiniteLogin: false
                    };
                    var push_settings = $.extend({}, defaults, options);
                    if (!push_settings.name && prev_command) {
                        // push is called in login
                        push_settings.name = prev_command.name;
                    }
                    if (push_settings.prompt === undefined) {
                        push_settings.prompt = (push_settings.name || '>') + ' ';
                    }
                    // names.push(options.name);
                    var top = interpreters.top();
                    if (top) {
                        top.mask = command_line.mask();
                    }
                    var was_paused = paused;
                    function init() {
                        fire_event('onPush', [top, interpreters.top()]);
                        prepare_top_interpreter();
                    }
                    // self.pause();
                    make_interpreter(interpreter, options.login, function(ret) {
                        // result is object with interpreter and completion properties
                        interpreters.push($.extend({}, ret, push_settings));
                        if (push_settings.completion === true) {
                            if ($.isArray(ret.completion)) {
                                interpreters.top().completion = ret.completion;
                            } else if (!ret.completion) {
                                interpreters.top().completion = false;
                            }
                        }
                        if (push_settings.login) {
                            var error;
                            var type = get_type(push_settings.login);
                            if (type === 'function') {
                                error = push_settings.infiniteLogin ? $.noop : self.pop;
                                self.login(
                                    push_settings.login,
                                    push_settings.infiniteLogin,
                                    init,
                                    error
                                );
                            } else if (get_type(interpreter) === 'string' &&
                                       type === 'string' || type === 'boolean') {
                                error = push_settings.infiniteLogin ? $.noop : self.pop;
                                self.login(
                                    make_json_rpc_login(
                                        interpreter,
                                        push_settings.login
                                    ),
                                    push_settings.infiniteLogin,
                                    init,
                                    error
                                );
                            }
                        } else {
                            init();
                        }
                        if (!was_paused && self.enabled()) {
                            self.resume();
                        }
                    });
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: Remove the last interpreter from the Stack
            // -------------------------------------------------------------
            pop: function(string, silent) {
                if (string !== undefined) {
                    echo_command(string);
                }
                var token = self.token(true);
                var top;
                if (interpreters.size() === 1) {
                    top = interpreters.top();
                    if (settings.login) {
                        if (!silent) {
                            fire_event('onPop', [top, null]);
                        }
                        global_logout();
                        fire_event('onExit');
                    } else {
                        self.error(strings().canExitError);
                    }
                } else {
                    if (token) {
                        clear_loging_storage();
                    }
                    var current = interpreters.pop();
                    top = interpreters.top();
                    prepare_top_interpreter();
                    // restore mask
                    self.set_mask(top.mask);
                    if (!silent) {
                        fire_event('onPop', [current, top]);
                    }
                    // we check in case if you don't pop from password interpreter
                    if (in_login && self.get_prompt() !== strings().login + ': ') {
                        in_login = false;
                    }
                    if (is_function(current.onExit)) {
                        try {
                            current.onExit.call(self, self);
                        } catch (e) {
                            current.onExit = $.noop;
                            display_exception(e, 'onExit');
                        }
                    }
                }
                return self;
            },
            // -------------------------------------------------------------
            // :: Change terminal option(s) at runtime
            // -------------------------------------------------------------
            option: function(object_or_name, value) {
                if (typeof value === 'undefined') {
                    if (typeof object_or_name === 'string') {
                        return settings[object_or_name];
                    } else if (typeof object_or_name === 'object') {
                        $.each(object_or_name, function(key, value) {
                            settings[key] = value;
                        });
                    }
                } else {
                    settings[object_or_name] = value;
                    if (object_or_name.match(/^num(Chars|Rows)$/)) {
                        redraw();
                    }
                }
                return self;
            },
            // -------------------------------------------------------------
            // :: invoke keydown shorcut
            // -------------------------------------------------------------
            invoke_key: function(shortcut) {
                command_line.invoke_key(shortcut);
                return self;
            },
            // -------------------------------------------------------------
            // :: change terminal keymap at runtime
            // -------------------------------------------------------------
            keymap: function(keymap, fn) {
                if (arguments.length === 0) {
                    return command_line.keymap();
                }
                if (typeof fn === 'undefined') {
                    if (typeof keymap === 'string') {
                        return command_line.keymap(keymap);
                    } else if ($.isPlainObject(keymap)) {
                        // argument is an object
                        keymap = $.omap(keymap || {}, function(key, fn) {
                            if (!new_keymap[key]) {
                                return fn.bind(self);
                            }
                            return function(e, original) {
                                // new keymap function will get default as 2nd argument
                                return fn.call(self, e, function() {
                                    return new_keymap[key](e, original);
                                });
                            };
                        });
                        command_line.keymap(keymap);
                    }
                } else if (typeof fn === 'function') {
                    var key = keymap;
                    if (!new_keymap[key]) {
                        command_line.keymap(key, fn.bind(self));
                    } else {
                        command_line.keymap(key, function(e, original) {
                            return fn.call(self, e, function() {
                                return new_keymap[key](e, original);
                            });
                        });
                    }
                }
            },
            // -------------------------------------------------------------
            // :: Return how deep you are in nested interpreters
            // -------------------------------------------------------------
            level: function() {
                return interpreters.size();
            },
            // -------------------------------------------------------------
            // :: Reinitialize the terminal
            // -------------------------------------------------------------
            reset: function() {
                when_ready(function ready() {
                    self.clear();
                    while (interpreters.size() > 1) {
                        interpreters.pop();
                    }
                    initialize();
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: Remove all local storage left by terminal, it will not
            // :: logout you until you refresh the browser
            // -------------------------------------------------------------
            purge: function() {
                when_ready(function ready() {
                    var prefix = self.prefix_name() + '_';
                    var names = storage.get(prefix + 'interpreters');
                    if (names) {
                        $.each(JSON.parse(names), function(_, name) {
                            storage.remove(name + '_commands');
                            storage.remove(name + '_token');
                            storage.remove(name + '_login');
                        });
                    }
                    command_line.purge();
                    storage.remove(prefix + 'interpreters');
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: Remove all events and DOM nodes left by terminal, it will
            // :: not purge the terminal so you will have the same state
            // :: when you refresh the browser
            // -------------------------------------------------------------
            destroy: function() {
                when_ready(function ready() {
                    command_line.destroy().remove();
                    self.resizer('unbind');
                    font_resizer.resizer('unbind').remove();
                    $(document).unbind('.terminal_' + self.id());
                    $(window).unbind('.terminal_' + self.id());
                    self.unbind('click wheel mousewheel mousedown mouseup');
                    self.removeData('terminal').removeClass('terminal').
                        unbind('.terminal');
                    if (settings.width) {
                        self.css('width', '');
                    }
                    if (settings.height) {
                        self.css('height', '');
                    }
                    $(window).off('blur', blur_terminal).
                        off('focus', focus_terminal);
                    self.find('.terminal-fill, .terminal-font').remove();
                    self.stopTime();
                    terminals.remove(terminal_id);
                    if (visibility_observer) {
                        if (visibility_observer.unobserve) {
                            visibility_observer.unobserve(self[0]);
                        } else {
                            clearInterval(visibility_observer);
                        }
                    }
                    var scroll_marker = self.find('.terminal-scroll-marker');
                    if (is_bottom_observer) {
                        visibility_observer.unobserve(scroll_marker[0]);
                    }
                    scroll_marker.remove();
                    if (mutation_observer) {
                        mutation_observer.disconnect();
                    }
                    if (!terminals.length()) {
                        $(window).off('hashchange');
                    }
                    output.remove();
                    wrapper.remove();
                    defunct = true;
                });
                return self;
            },
            // -------------------------------------------------------------
            // :: ref: https://stackoverflow.com/a/18927969/387194
            // -------------------------------------------------------------
            scroll_to: function(elem) {
                var scroll = self.scrollTop() - self.offset().top + $(elem).offset().top;
                self.scrollTop(scroll);
                return self;
            },
            // -------------------------------------------------------------
            scroll_to_bottom: function() {
                var scrollHeight;
                if (self.prop) {
                    scrollHeight = self.prop('scrollHeight');
                } else {
                    scrollHeight = self.attr('scrollHeight');
                }
                self.scrollTop(scrollHeight);
                return self;
            },
            // -------------------------------------------------------------
            // :: return true if terminal div or body is at the bottom
            // :: is use scrollBottomOffset option as margin for the check
            // -------------------------------------------------------------
            is_bottom: function() {
                if (settings.scrollBottomOffset === -1) {
                    return false;
                } else if (typeof is_bottom_detected === 'boolean') {
                    return is_bottom_detected;
                } else {
                    var scroll_height, scroll_top, height;
                    scroll_height = self[0].scrollHeight;
                    scroll_top = self[0].scrollTop;
                    height = self[0].offsetHeight;
                    var limit = scroll_height - settings.scrollBottomOffset;
                    return scroll_top + height > limit;
                }
            }
        }, function(name, fun) {
            // wrap all functions and display execptions
            return function() {
                if (defunct) {
                    if (!settings.exceptionHandler) {
                        throw new $.terminal.Exception(strings().defunctTerminal);
                    }
                }
                try {
                    return fun.apply(self, [].slice.apply(arguments));
                } catch (e) {
                    // exec catch by command (resume call exec)
                    if (name !== 'exec' && name !== 'resume') {
                        display_exception(e, e.type || 'TERMINAL', true);
                    }
                    if (!settings.exceptionHandler) {
                        throw e;
                    }
                }
            };
        }));
        // -----------------------------------------------------------------
        // :: INIT CODE
        // -----------------------------------------------------------------
        if (self.length === 0) {
            var msg = sprintf(strings().invalidSelector);
            throw new $.terminal.Exception(msg);
        }
        self.data('terminal', self);
        // var names = []; // stack if interpreter names
        var prev_command; // used for name on the terminal if not defined
        var prev_exec_cmd;
        var tab_count = 0; // for tab completion
        var output; // .terminal-output jquery object
        var terminal_id = terminals.length();
        var force_awake = false; // flag used to don't pause when user return read() call
        var num_chars; // numer of chars in line
        var num_rows; // number of lines that fit without scrollbar
        var command; // for tab completion
        var logins = new Stack(); // stack of logins
        var command_queue = new DelayQueue();
        var init_queue = new DelayQueue();
        var when_ready = ready(init_queue);
        var cmd_ready = ready(command_queue);
        var is_bottom_detected;
        var is_bottom_observer;
        var in_login = false;// some Methods should not be called when login
        // TODO: Try to use mutex like counter for pause/resume
        var onPause = $.noop;// used to indicate that user call pause onInit
        var old_width, old_height;
        var delayed_commands = []; // used when exec commands while paused
        var settings = $.extend(
            {},
            $.terminal.defaults,
            {
                name: self.selector,
                exit: !!(options && options.login || !options)
            },
            options || {}
        );
        if (typeof settings.width === 'number') {
            self.width(settings.width);
        }
        if (typeof settings.height === 'number') {
            self.height(settings.height);
        }
        var char_size = get_char_size(self);
        // so it's the same as in TypeScript definition for options
        delete settings.formatters;
        // used to throw error when calling methods on destroyed terminal
        var defunct = false;
        var lines = [];
        var storage = new StorageHelper(settings.memory);
        var enabled = settings.enabled;
        var frozen = false;
        var paused = false;
        var autologin = true; // set to false if onBeforeLogin return false
        var interpreters;
        var command_line;
        var old_enabled;
        var visibility_observer;
        var mutation_observer;
        // backward compatibility
        if (settings.ignoreSystemDescribe === true) {
            settings.describe = false;
        }
        // register ajaxSend for cancel requests on CTRL+D
        $(document).bind('ajaxSend.terminal_' + self.id(), function(e, xhr) {
            requests.push(xhr);
        });
        var wrapper = $('<div class="terminal-wrapper"/>').appendTo(self);
        $(broken_image).hide().appendTo(wrapper);
        var font_resizer = $('<div class="terminal-font">&nbsp;</div>').appendTo(self);
        var fill = $('<div class="terminal-fill"/>').appendTo(self);
        output = $('<div>').addClass('terminal-output').attr('role', 'log')
            .appendTo(wrapper);
        self.addClass('terminal');
        // before login event
        if (settings.login && fire_event('onBeforeLogin') === false) {
            autologin = false;
        }
        // create json-rpc authentication function
        var base_interpreter;
        if (typeof init_interpreter === 'string') {
            base_interpreter = init_interpreter;
        } else if (is_array(init_interpreter)) {
            // first JSON-RPC
            for (var i = 0, len = init_interpreter.length; i < len; ++i) {
                if (typeof init_interpreter[i] === 'string') {
                    base_interpreter = init_interpreter[i];
                    break;
                }
            }
        }
        var global_login_fn;
        if (is_function(settings.login)) {
            global_login_fn = settings.login;
        } else if (base_interpreter &&
            (typeof settings.login === 'string' || settings.login === true)) {
            global_login_fn = make_json_rpc_login(base_interpreter, settings.login);
        }
        terminals.append(self);
        function focus_terminal() {
            if (old_enabled) {
                self.focus();
            }
        }
        // -------------------------------------------------------------------------------
        function blur_terminal() {
            old_enabled = enabled;
            self.disable().find('.cmd textarea').trigger('blur', [true]);
        }
        // -------------------------------------------------------------------------------
        function stringify_value(value) {
            if (is_function(value)) {
                value = value();
            }
            if (get_type(value) !== 'string') {
                if (is_function(settings.parseObject)) {
                    var ret = settings.parseObject(value);
                    if (get_type(ret) === 'string') {
                        value = ret;
                    }
                } else if (is_array(value)) {
                    value = $.terminal.columns(value, self.cols(), settings.tabs);
                } else {
                    value = String(value);
                }
            }
            return value;
        }
        // -------------------------------------------------------------------------------
        function context_callback_proxy(fn) {
            if (fn.proxy) {
                return fn;
            }
            var wrapper = function(callback) {
                return fn.call(self, callback, self);
            };
            wrapper.proxy = true;
            return wrapper;
        }
        // -------------------------------------------------------------------------------
        // paste event is not testable in node
        // istanbul ignore next
        function paste_event(e) {
            e = e.originalEvent;
            // we don't care about browser that don't support clipboard data
            // those browser simple will not have this feature normal paste
            // is cross-browser and it's handled by cmd plugin
            function is_type(item, type) {
                return item.type.indexOf(type) !== -1;
            }
            function echo_image(image) {
                self.echo('<img src="' + image + '"/>', {raw: true});
            }
            function data_uri(blob) {
                var URL = window.URL || window.webkitURL;
                return URL.createObjectURL(blob);
            }
            function echo(object, ignoreEvents) {
                if (!ignoreEvents && is_function(settings.onPaste)) {
                    var event = {
                        target: self
                    };
                    if (typeof object === 'string') {
                        event['text'] = object;
                    } else if (object instanceof Blob) {
                        event['image'] = data_uri(object);
                    }
                    var ret = fire_event('onPaste', [event]);
                    if (ret) {
                        if (is_function(ret.then || ret.done)) {
                            return (ret.then || ret.done).call(ret, function(ret) {
                                echo(ret, true);
                            });
                        } else {
                            echo(ret, true);
                        }
                    } else {
                        echo(event.image || event.text, true);
                    }
                } else if (object instanceof Blob) {
                    echo_image(data_uri(object));
                } else if (typeof object === 'string') {
                    if (object.match(/^(data:|blob:)/)) {
                        echo_image(object);
                    } else {
                        self.insert(object);
                    }
                }
            }
            if (e.clipboardData) {
                if (self.enabled()) {
                    var items = e.clipboardData.items;
                    if (items) {
                        for (var i = 0; i < items.length; i++) {
                            if (is_type(items[i], 'image') && settings.pasteImage) {
                                var blob = items[i].getAsFile();
                                echo(blob);
                            } else if (is_type(items[i], 'text/plain')) {
                                items[i].getAsString(echo);
                            }
                        }
                    } else if (e.clipboardData.getData) {
                        var text = e.clipboardData.getData('text/plain');
                        echo(text);
                    }
                    return false;
                }
            }
        }
        $(document).on('paste.terminal_' + self.id(), paste_event);
        var new_keymap = $.extend(
            {},
            keymap,
            $.omap(settings.keymap || {}, function(key, fn) {
                if (!keymap[key]) {
                    return fn.bind(self);
                }
                return function(e, original) {
                    // new keymap function will get default as 2nd argument
                    return fn.call(self, e, function() {
                        return keymap[key](e, original);
                    });
                };
            })
        );
        make_interpreter(init_interpreter, settings.login, function(interpreter) {
            if (settings.completion && typeof settings.completion !== 'boolean' ||
                !settings.completion) {
                // overwrite interpreter completion by global setting #224
                // we use string to indicate that it need to be taken from settings
                // so we are able to change it using option API method
                interpreter.completion = 'settings';
            }
            var prompt = settings.prompt;
            if (is_function(prompt)) {
                prompt = context_callback_proxy(prompt);
            }
            interpreters = new Stack($.extend({}, settings.extra, {
                name: settings.name,
                prompt: prompt,
                keypress: settings.keypress,
                keydown: settings.keydown,
                resize: settings.onResize,
                greetings: settings.greetings,
                mousewheel: settings.mousewheel,
                history: settings.history,
                keymap: new_keymap
            }, interpreter));
            // CREATE COMMAND LINE
            command_line = $('<div/>').appendTo(wrapper).cmd({
                tabindex: settings.tabindex,
                mobileDelete: settings.mobileDelete,
                mobileIngoreAutoSpace: settings.mobileIngoreAutoSpace,
                prompt: global_login_fn ? false : prompt,
                history: settings.memory ? 'memory' : settings.history,
                historyFilter: settings.historyFilter,
                historySize: settings.historySize,
                caseSensitiveSearch: settings.caseSensitiveSearch,
                onPaste: settings.onPaste,
                width: '100%',
                enabled: false,
                char_width: char_size.width,
                keydown: key_down,
                keymap: new_keymap,
                clickTimeout: settings.clickTimeout,
                holdTimeout: settings.holdTimeout,
                holdRepeatTimeout: settings.holdRepeatTimeout,
                repeatTimeoutKeys: settings.repeatTimeoutKeys,
                allowedAttributes: settings.allowedAttributes,
                keypress: key_press,
                tabs: settings.tabs,
                onPositionChange: function() {
                    var args = [].slice.call(arguments);
                    make_cursor_visible();
                    fire_event('onPositionChange', args);
                },
                onCommandChange: function(command) {
                    // resize is not triggered when insert called just after init
                    //  and scrollbar appear
                    if (old_width !== fill.width()) {
                        // resizer handler will update old_width
                        self.resizer();
                    }
                    fire_event('onCommandChange', [command]);
                    make_cursor_visible();
                },
                commands: commands
            });
            function disable(e) {
                e = e.originalEvent;
                if (e) {
                    // e.terget is body when click outside of context menu to close it
                    // even if you click on terminal
                    var node = document.elementFromPoint(e.clientX, e.clientY);
                    if (!$(node).closest('.terminal').length && self.enabled()) {
                        // we only need to disable when click outside of terminal
                        // click on other terminal is handled by focus event
                        self.disable();
                    }
                }
            }
            self.oneTime(100, function() {
                $(document).bind('click.terminal_' + self.id(), disable).
                    bind('contextmenu.terminal_' + self.id(), disable);
            });
            var $win = $(window);
            // cordova application, if keyboard was open and we resume, it will be
            // closed so we need to disable terminal so you can enable it with tap
            document.addEventListener("resume", function() {
                self.disable();
            });
            // istanbul ignore next
            if (is_mobile) {
                self.click(function() {
                    if (!frozen) {
                        if (!self.enabled()) {
                            self.focus();
                            command_line.enable();
                        } else {
                            self.disable();
                        }
                    }
                });
            } else {
                // work weird on mobile
                $win.on('focus.terminal_' + self.id(), focus_terminal).
                    on('blur.terminal_' + self.id(), blur_terminal);
                // detect mouse drag
                (function() {
                    var count = 0;
                    var $target;
                    var name = 'click_' + self.id();
                    var textarea = self.find('.cmd textarea');
                    function click() {
                        if ($target.is('.terminal') ||
                            $target.is('.terminal-wrapper')) {
                            var len = self.get_command().length;
                            self.set_position(len);
                        } else if ($target.closest('.cmd-prompt').length) {
                            self.set_position(0);
                        }
                        if (!textarea.is(':focus')) {
                            textarea.focus();
                        }
                        reset();
                    }
                    function reset() {
                        count = 0;
                        $target = null;
                    }
                    var ignore_elements = '.terminal-output textarea,' +
                        '.terminal-output input';
                    self.mousedown(function(e) {
                        if (!scrollbar_event(e, fill)) {
                            $target = $(e.target);
                        }
                    }).mouseup(function() {
                        if ($target && $target.closest(ignore_elements).length) {
                            if (enabled) {
                                self.disable();
                            }
                        } else if (get_selected_html() === '' && $target) {
                            if (++count === 1) {
                                if (!frozen) {
                                    if (!enabled) {
                                        self.focus();
                                    } else {
                                        var timeout = settings.clickTimeout;
                                        self.oneTime(timeout, name, click);
                                        return;
                                    }
                                }
                            } else {
                                self.stopTime(name);
                            }
                        }
                        reset();
                    }).dblclick(function() {
                        reset();
                        self.stopTime(name);
                    });
                })();
                (function() {
                    var clip = self.find('.cmd textarea');
                    function is_context_event(e) {
                        return e.type === 'mousedown' && e.buttons === 2 ||
                            e.type === 'contextmenu';
                    }
                    self.on('contextmenu.terminal mousedown.terminal', function(e) {
                        if (get_selected_html() === '' && is_context_event(e)) {
                            if (!$(e.target).is('img,value,audio,object,canvas,a')) {
                                if (!self.enabled()) {
                                    self.enable();
                                }
                                var offset = command_line.offset();
                                clip.css({
                                    left: e.pageX - offset.left - 20,
                                    top: e.pageY - offset.top - 20,
                                    width: '5em',
                                    height: '4em'
                                });
                                if (!clip.is(':focus')) {
                                    clip.focus();
                                }
                                self.stopTime('textarea');
                                self.oneTime(100, 'textarea', function() {
                                    var props = {
                                        left: '',
                                        top: '',
                                        width: '',
                                        height: ''
                                    };
                                    if (!is_css_variables_supported) {
                                        var in_line = self.find('.cmd .cmd-cursor-line')
                                            .prevUntil('.cmd-prompt').length;
                                        props.top = in_line * 14 + 'px';
                                    }
                                    clip.css(props);
                                });
                                self.stopTime('selection');
                                self.everyTime(20, 'selection', function() {
                                    if (clip[0].selection !== clip[0].value) {
                                        if (get_textarea_selection(clip[0])) {
                                            clear_textarea_selection(clip[0]);
                                            select(
                                                self.find('.terminal-output')[0],
                                                self.find('.cmd div:last-of-type')[0]
                                            );
                                            self.stopTime('selection');
                                        }
                                    }
                                });
                            }
                        }
                    });
                })();
            }
            self.on('click', 'a', function(e) {
                var $this = $(this);
                if ($this.closest('.terminal-exception').length) {
                    var href = $this.attr('href');
                    if (href.match(/:[0-9]+$/)) { // display line if specified
                        e.preventDefault();
                        print_line(href, self.cols());
                    }
                }
                // refocus because links have tabindex in case where user want
                // tab change urls, we can ignore this function on click
                if (enabled) {
                    self.find('.cmd textarea').focus();
                }
            });
            function calculate_char_size() {
                var width = char_size.width;
                char_size = get_char_size(self);
                if (width !== char_size.width) {
                    command_line.option('char_width', char_size.width).refresh();
                }
            }
            resize();
            function resize() {
                if (self.is(':visible')) {
                    var width = fill.width();
                    var height = fill.height();
                    // prevent too many calculations in IE
                    if (old_height !== height || old_width !== width) {
                        self.resize();
                    }
                    old_height = height;
                    old_width = width;
                }
            }
            function create_resizers() {
                var options = {
                    prefix: 'terminal-'
                };
                self.resizer('unbind').resizer(resize, options);
                font_resizer.resizer('unbind').resizer(function() {
                    calculate_char_size();
                    self.resize();
                }, options);
            }
            function bottom_detect(intersections) {
                is_bottom_detected = intersections[0].intersectionRatio === 1;
            }
            function create_bottom_detect() {
                if (window.IntersectionObserver) {
                    var top = $('<div class="terminal-scroll-marker"/>').appendTo(self);
                    var marker = top;
                    if (settings.scrollBottomOffset !== -1) {
                        marker = $('<div/>').css({
                            height: settings.scrollBottomOffset
                        }).appendTo(top);
                    }
                    is_bottom_observer = new IntersectionObserver(bottom_detect, {
                        root: self[0]
                    });
                    is_bottom_observer.observe(marker[0]);
                }
            }
            // this observer can be added imedietely even if terminal is not in the DOM
            // because both of the elements (root and target) are in same fragment
            create_bottom_detect();
            if (self.is(':visible')) {
                create_resizers();
            }
            function observe_visibility() {
                if (visibility_observer) {
                    if (visibility_observer.unobserve) {
                        visibility_observer.unobserve(self[0]);
                    } else {
                        clearInterval(visibility_observer);
                    }
                }
                var was_enabled = self.enabled();
                var visible = self.is(':visible');
                if (was_enabled && !visible) {
                    self.disable();
                }
                if (visible) {
                    create_resizers();
                } else {
                    // hide terminal content until it's resized (and num chars calculated)
                    wrapper.css('visibility', 'hidden');
                }
                function visibility_checker() {
                    if (self.is(':visible') && !visible) {
                        visible = true;
                        create_resizers();
                        calculate_char_size();
                        resize();
                        if (was_enabled) {
                            self.enable();
                        }
                        wrapper.css('visibility', '');
                    } else if (visible && !self.is(':visible')) {
                        visible = false;
                        was_enabled = $.terminal.active() === self && self.enabled();
                        self.disable();
                        wrapper.css('visibility', 'hidden');
                    }
                }
                if (window.IntersectionObserver && self.css('position') !== 'fixed') {
                    visibility_observer = new IntersectionObserver(visibility_checker, {
                        root: null
                    });
                    visibility_observer.observe(self[0]);
                } else {
                    visibility_observer = setInterval(visibility_checker, 100);
                }
            }
            var in_dom = !!self.closest('body').length;
            var MutationObsrv = window.MutationObserver || window.WebKitMutationObserver;
            if (MutationObsrv) {
                mutation_observer = new MutationObsrv(function() {
                    if (self.closest('body').length) {
                        if (!in_dom) {
                            self.scroll_to_bottom();
                            // this observer need to be added when terminal is in the DOM
                            observe_visibility();
                            resize();
                        }
                        in_dom = true;
                    } else if (in_dom) {
                        in_dom = false;
                    }
                });
                mutation_observer.observe(document.body, {childList: true});
            }
            if (in_dom) {
                // check if element is in the DOM if not running IntersectionObserver
                // don't make sense
                observe_visibility();
            }
            command_queue.resolve();
            // touch devices need touch event to get virtual keyboard
            if (enabled && self.is(':visible') && !is_mobile) {
                self.focus(undefined, true);
            } else {
                self.disable();
            }
            // -------------------------------------------------------------
            // Run Login
            if (is_function(global_login_fn)) {
                self.login(global_login_fn, true, initialize);
            } else {
                initialize();
            }
            // -------------------------------------------------------------
            // :: helper
            function exec_spec(spec) {
                var terminal = terminals.get()[spec[0]];
                // execute if belong to this terminal
                if (terminal && terminal_id === terminal.id()) {
                    if (!spec[2]) {
                        defer.resolve();
                        return defer.promise();
                    } else if (paused) {
                        var defer = $.Deferred();
                        resume_callbacks.push(function() {
                            return terminal.exec(spec[2]).done(function() {
                                terminal.save_state(spec[2], true, spec[1]);
                                defer.resolve();
                            });
                        });
                        return defer.promise();
                    } else {
                        return terminal.exec(spec[2]).done(function() {
                            terminal.save_state(spec[2], true, spec[1]);
                        });
                    }
                }
            }
            // exec from hash called in each terminal instance
            if (settings.execHash) {
                if (location.hash) {
                    // wait until login is initialized
                    setTimeout(function() {
                        try {
                            var hash = location.hash.replace(/^#/, '');
                            // yes no var - local inside terminal
                            hash_commands = JSON.parse(decodeURIComponent(hash));
                            var i = 0;
                            (function recur() {
                                var spec = hash_commands[i++];
                                if (spec) {
                                    exec_spec(spec).done(recur);
                                } else {
                                    change_hash = true;
                                }
                            })();// */
                        } catch (e) {
                            // invalid json - ignore
                        }
                    });
                } else {
                    change_hash = true;
                }
            } else {
                change_hash = true; // if enabled later
            }
            // change_hash = true; // exec can now change hash
            // -------------------------------------------------------------
            /* istanbul ignore next */
            (function() {
                var shift = false;
                $(document).bind('keydown.terminal_' + self.id(), function(e) {
                    if (e.shiftKey) {
                        shift = true;
                    }
                }).bind('keyup.terminal_' + self.id(), function(e) {
                    // in Google Chromium/Linux shiftKey is false
                    if (e.shiftKey || e.which === 16) {
                        shift = false;
                    }
                });
                // this could work without calling scroll on wheel event but we
                // need it for cases where you have mouse wheel work differently
                // like with less command that scroll text
                function mousewheel(event, delta) {
                    if (!shift) {
                        var interpreter = interpreters.top();
                        var ret;
                        if (is_function(interpreter.mousewheel)) {
                            ret = interpreter.mousewheel(event, delta, self);
                        } else if (is_function(settings.mousewheel)) {
                            ret = settings.mousewheel(event, delta, self);
                        }
                        if (ret === true) {
                            return;
                        }
                        if ((have_scrollbar() || ret === false) && !event.ctrlKey) {
                            event.stopPropagation();
                            event.preventDefault();
                        }
                        if (ret === false) {
                            return false;
                        }
                        if (delta > 0) {
                            self.scroll(-40);
                        } else {
                            self.scroll(40);
                        }
                    }
                }
                if ($.event.special.mousewheel) {
                    // we keep mousewheel plugin just in case
                    self.on('mousewheel', mousewheel);
                } else {
                    // detection take from:
                    // https://developer.mozilla.org/en-US/docs/Web/Events/wheel
                    var event;
                    var div = document.createElement("div");
                    if ("onwheel" in div) {
                        event = "wheel"; // Modern browsers support "wheel"
                    } else if (document.onmousewheel !== undefined) {
                        // Webkit and IE support at least "mousewheel"
                        event = "mousewheel";
                    } else {
                        // let's assume that remaining browsers are older Firefox
                        event = "DOMMouseScroll";
                    }
                    div = null;
                    self.on(event, function(e) {
                        var delta;
                        if (event === 'mousewheel') {
                            delta = - 1 / 40 * e.originalEvent.wheelDelta;
                        } else {
                            delta = e.originalEvent.deltaY || e.originalEvent.detail;
                        }
                        mousewheel(e, -delta);
                    });
                }
            })();
        }); // make_interpreter
        return self;
    }; // terminal plugin
});

/**@license
 *       __ _____                     ________                              __
 *      / // _  /__ __ _____ ___ __ _/__  ___/__ ___ ______ __ __  __ ___  / /
 *  __ / // // // // // _  // _// // / / // _  // _//     // //  \/ // _ \/ /
 * /  / // // // // // ___// / / // / / // ___// / / / / // // /\  // // / /__
 * \___//____ \\___//____//_/ _\_  / /_//____//_/ /_/ /_//_//_/ /_/ \__\_\___/
 *           \/              /____/
 * http://terminal.jcubic.pl
 *
 * Wrapper for options that will create autocomplete menu for jQuery Terminal
 *
 * Copyright (c) 2014-2019 Jakub Jankiewicz <https://jcubic.pl/me>
 * Released under the MIT license
 *
 */
/* global define, global, require, module, setTimeout, clearTimeout */
(function(factory) {
    var root = typeof window !== 'undefined' ? window : global;
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        // istanbul ignore next
        define(['jquery', 'jquery.terminal'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node/CommonJS
        module.exports = function(root, jQuery) {
            if (jQuery === undefined) {
                // require('jQuery') returns a factory that requires window to
                // build a jQuery instance, we normalize how we use modules
                // that require this pattern but the window provided is a noop
                // if it's defined (how jquery works)
                if (typeof window !== 'undefined') {
                    jQuery = require('jquery');
                } else {
                    jQuery = require('jquery')(root);
                }
            }
            if (!jQuery.fn.terminal) {
                if (typeof window !== 'undefined') {
                    require('jquery.terminal');
                } else {
                    require('jquery.terminal')(jQuery);
                }
            }
            factory(jQuery);
            return jQuery;
        };
    } else {
        // Browser
        // istanbul ignore next
        factory(root.jQuery);
    }
})(function($) {
    var jquery_terminal = $.fn.terminal;
    $.fn.terminal = function(interpreter, options) {
        function init(node) {
            return jquery_terminal.call(node, interpreter, autocomplete_menu(options));
        }
        if (this.length > 1) {
            return this.each(init.bind(null, this));
        } else {
            return init(this);
        }
    };
    // -----------------------------------------------------------------------------------
    // :: cancableble task for usage in comletion menu to ignore previous async completion
    // -----------------------------------------------------------------------------------
    function Task(fn) {
        this._fn = fn;
    }
    Task.prototype.invoke = function() {
        if (!this._cancel) {
            this._fn.apply(null, arguments);
        }
    };
    Task.prototype.cancel = function() {
        this._cancel = true;
    };
    // -----------------------------------------------------------------------------------
    // :: function return patched terminal settings
    // -----------------------------------------------------------------------------------
    function autocomplete_menu(options) {
        if (options && !options.autocompleteMenu) {
            return options;
        }
        var settings = options || {};
        var last_task;
        // -------------------------------------------------------------------------------
        // :: function that do actuall matching and displaying of completion menu
        // -------------------------------------------------------------------------------
        function complete_menu(term, e, word, list) {
            var matched = [];
            var regex = new RegExp('^' + $.terminal.escape_regex(word));
            for (var i = list.length; i--;) {
                if (regex.test(list[i])) {
                    matched.unshift(list[i]);
                }
            }
            if (e.which === 9) {
                if (term.complete(matched)) {
                    word = term.before_cursor(true);
                    regex = new RegExp('^' + $.terminal.escape_regex(word));
                }
            }
            if (word && matched.length) {
                ul.hide();
                for (i = 0; i < matched.length; ++i) {
                    var text = matched[i].replace(regex, '');
                    if (text) {
                        $('<li>' + text + '</li>').appendTo(ul);
                    }
                }
                ul.show();
            }
        }
        var ul;
        if (typeof settings.completion !== 'undefined') {
            var onInit = settings.onInit || $.noop;
            var keydown = settings.keydown || $.noop;
            var completion = settings.completion;
            delete settings.completion;
            settings.onInit = function(term) {
                onInit.call(this, term);
                // init html menu element
                var wrapper = this.cmd().find('.cmd-cursor').
                    wrap('<span/>').parent().addClass('cursor-wrapper');
                ul = $('<ul></ul>').appendTo(wrapper);
                ul.on('click', 'li', function() {
                    term.insert($(this).text());
                    ul.empty();
                });
            };
            var timer;
            settings.keydown = function(e, term) {
                // setTimeout because terminal is adding characters in keypress
                // we use keydown because we need to prevent default action
                // for tab and still execute custom code
                clearTimeout(timer);
                timer = setTimeout(function() {
                    ul.empty();
                    var word = term.before_cursor(true);
                    if (last_task) {
                        last_task.cancel(); // ignore previous completion task
                    }
                    // we save task in closure for callbacks and promise::then
                    var task = last_task = new Task(complete_menu);
                    if (typeof completion === 'function') {
                        var ret = completion.call(term, word, function(list) {
                            task.invoke(term, e, word, list);
                        });
                        if (ret && typeof ret.then === 'function') {
                            ret.then(function(completion) {
                                task.invoke(term, e, word, completion);
                            });
                        } else if (ret instanceof Array) {
                            task.invoke(term, e, word, ret);
                        }
                    } else if (completion instanceof Array) {
                        task.invoke(term, e, word, completion);
                    }
                }, 0);
                var ret = keydown.call(this, e, term);
                if (typeof ret !== 'undefined') {
                    return false;
                }
                if (e.which === 9) {
                    return false;
                }
            };
        }
        return settings;
    }
});

/**@license
 *       __ _____                     ________                              __
 *      / // _  /__ __ _____ ___ __ _/__  ___/__ ___ ______ __ __  __ ___  / /
 *  __ / // // // // // _  // _// // / / // _  // _//     // //  \/ // _ \/ /
 * /  / // // // // // ___// / / // / / // ___// / / / / // // /\  // // / /__
 * \___//____ \\___//____//_/ _\_  / /_//____//_/ /_/ /_//_//_/ /_/ \__\_\___/
 *           \/              /____/
 * http://terminal.jcubic.pl
 *
 * Monkey patch to add newlinew option for echo method inside jQuery Terminal
 *
 * Copyright (c) 2014-2019 Jakub Jankiewicz <https://jcubic.pl/me>
 * Released under the MIT license
 *
 */
/* global define, global, require, module */
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
    var init = $.fn.terminal;
    $.fn.terminal = function(interpreter, options) {
        return init.call(this, interpreter, patch_options(options)).each(function() {
            patch_term($(this).data('terminal'), should_echo_command(options));
        });
    };
    var last;
    var prompt;
    function should_echo_command(options) {
        return options && options.echoCommand !== false || !options;
    }
    function patch_options(options) {
        var keymap = {
            'ENTER': function(e, original) {
                var term = this;
                if (!last) {
                    if (should_echo_command(options)) {
                        term.echo_command();
                    }
                } else {
                    this.__echo(last + prompt + this.get_command());
                    this.set_prompt(prompt);
                    last = '';
                }
                if (options && options.keymap && options.keymap.ENTER) {
                    options.keymap.ENTER.call(this, e, original);
                } else {
                    original.call(this, e);
                }
            }
        };
        var settings = {
            echoCommand: false,
            keymap: $.extend({}, options && options.keymap || {}, keymap)
        };
        return $.extend({}, options || {}, settings);
    }
    function patch_term(term, echo_command) {
        if (term.__echo) {
            return term;
        }
        term.__echo = term.echo;
        term.__exec = term.exec;
        term.exec = function() {
            last = '';
            if (echo_command) {
                this.settings().echoCommand = true;
            }
            var ret = term.__exec.apply(this, arguments);
            if (echo_command) {
                this.settings().echoCommand = false;
            }
            return ret;
        };
        term.echo = function(arg, options) {
            var settings = $.extend({
                newline: true
            }, options);
            function process(prompt) {
                // this probably can be simplify because terminal handle
                // newlines in prompt
                var last_line;
                last += arg;
                arg = last + prompt;
                var arr = arg.split('\n');
                if (arr.length === 1) {
                    last_line = arg;
                } else {
                    term.__echo(arr.slice(0, -1).join('\n'), options);
                    last_line = arr[arr.length - 1];
                }
                term.set_prompt(last_line);
            }
            if (settings.newline === false) {
                if (!prompt) {
                    prompt = term.get_prompt();
                }
                if (typeof prompt === 'string') {
                    process(prompt);
                } else {
                    prompt(process);
                }
            } else {
                if (prompt) {
                    term.set_prompt(prompt);
                }
                if (last) {
                    term.__echo(last + arg, options);
                } else if (!arguments.length) {
                    // original echo check length to test if someone call echo
                    // with value that is undefined
                    term.__echo();
                } else {
                    term.__echo(arg, options);
                }
                last = '';
                prompt = '';
            }
            return term;
        };
    }
});

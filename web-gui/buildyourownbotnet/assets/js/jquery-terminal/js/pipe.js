/**@license
 *       __ _____                     ________                              __
 *      / // _  /__ __ _____ ___ __ _/__  ___/__ ___ ______ __ __  __ ___  / /
 *  __ / // // // // // _  // _// // / / // _  // _//     // //  \/ // _ \/ /
 * /  / // // // // // ___// / / // / / // ___// / / / / // // /\  // // / /__
 * \___//____ \\___//____//_/ _\_  / /_//____//_/ /_/ /_//_//_/ /_/ \__\_\___/
 *           \/              /____/
 * http://terminal.jcubic.pl
 *
 * This is object enchancment that will add pipe operator and redirects to commands
 *
 * Copyright (c) 2014-2019 Jakub Jankiewicz <https://jcubic.pl/me>
 * Released under the MIT license
 *
 */
/* global define, global, require, module, sprintf */
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
    // -----------------------------------------------------------------------------------
    // :: split over array - returns array of arrays
    // -----------------------------------------------------------------------------------
    function array_split(array, splitter) {
        var test_fn;
        if (typeof splitter === 'function') {
            test_fn = splitter;
        } else if (splitter instanceof RegExp) {
            test_fn = function(item) {
                if (item instanceof RegExp) {
                    item = item.source;
                } else if (typeof item !== 'string') {
                    item = item.toString();
                }
                var m = item.match(splitter);
                if (m) {
                    if (m.length > 1) {
                        return m.slice(1);
                    }
                    return true;
                }
            };
        } else {
            test_fn = function(item) {
                return splitter === item;
            };
        }
        var output = [];
        var sub = [];
        array.forEach(function(item, i) {
            var check = test_fn(item, i);
            if (check) {
                output.push(sub);
                sub = [];
                if (check instanceof Array) {
                    output.push(check);
                }
            } else {
                sub.push(item);
            }
        });
        output.push(sub);
        return output;
    }
    // -----------------------------------------------------------------------------------
    function is_function(obj) {
        return typeof obj === 'function';
    }
    // -----------------------------------------------------------------------------------
    $.terminal.defaults.strings.pipeNestedInterpreterError = 'You can\'t pipe nested ' +
        'interpreter';
    $.terminal.pipe = function pipe(interpreter, options) {
        var settings = $.extend({
            processArguments: true,
            overwrite: undefined,
            redirects: {}
        }, options);
        var overwrite_buffer;
        var term;
        var orig;
        var command_index;
        var process_redirect = false;
        // -------------------------------------------------------------------------------
        function parse_redirect(args, re) {
            var redirects = [];
            if (args.length) {
                var cmd_redirect, settings_redirect;
                for (var i = 0; i < args.length; ++i) {
                    var operator = null;
                    if (args[i].length === 1 && args[i][0].match(re)) {
                        operator = args[i][0];
                    }
                    if (operator) {
                        for (var j = settings.redirects.length; j--;) {
                            if (operator === settings.redirects[j].name) {
                                settings_redirect = settings.redirects[j];
                                break;
                            }
                        }
                        cmd_redirect = {
                            fn: settings_redirect.callback,
                            args: []
                        };
                        redirects.push(cmd_redirect);
                    } else {
                        cmd_redirect.args = args[i];
                    }
                }
            }
            return redirects;
        }
        // -------------------------------------------------------------------------------
        function is_pipe(cmd) {
            var quotes = [''].concat(cmd.args_quotes);
            return function(string, i) {
                return string === '|' && !quotes[i];
            };
        }
        // -------------------------------------------------------------------------------
        function tokens(cmd) {
            return [cmd.name].concat(cmd.args);
        }
        // -------------------------------------------------------------------------------
        function parse_command(command) {
            var cmd;
            if (term.settings().processArguments) {
                cmd = $.terminal.parse_command(command);
            } else {
                cmd = $.terminal.split_command(command);
            }
            return array_split(tokens(cmd), is_pipe(cmd)).map(function(args) {
                var cmd = {
                    redirects: []
                };
                if (settings.redirects.length) {
                    var redirect_names = settings.redirects.map(function(redirect) {
                        return $.terminal.escape_regex(redirect.name);
                    });
                    var re = new RegExp('^(' + redirect_names.join('|') + ')$');
                    var split_args = array_split(args, re);
                    if (split_args.length > 1) {
                        args = split_args[0];
                        cmd.redirects = parse_redirect(split_args.slice(1), re);
                    }
                }
                cmd.name = args[0];
                cmd.args = args.slice(1);
                return cmd;
            });
        }
        // -------------------------------------------------------------------------------
        function overwrite(command) {
            return command.overwrite === true ||
                typeof command.overwrite === 'undefined' ||
                settings.overwrite === true;
        }
        // -------------------------------------------------------------------------------
        function redirects(command) {
            var defer = $.Deferred();
            if (overwrite(command)) {
                overwrite_buffer = true;
            }
            function resolve() {
                overwrite_buffer = false;
                defer.resolve();
            }
            if (command.redirects.length) {
                var i = 0;
                (function loop() {
                    var redirect = command.redirects[i++];
                    if (redirect) {
                        var fn = redirect.fn;
                        var args = redirect.args;
                        continuation(fn.apply(term, args), function(value) {
                            echo_non_empty(value);
                            loop();
                        }, 'redirect loop');
                    } else {
                        resolve();
                    }
                })();
            } else {
                resolve();
            }
            return defer.promise();
        }
        // -------------------------------------------------------------------------------
        function continuation(promise, callback) {
            if (promise && promise.then) {
                promise.then(callback);
                return promise;
            } else {
                callback();
            }
        }
        // -------------------------------------------------------------------------------
        function echo_non_empty(value) {
            if (typeof value !== 'undefined') {
                term.echo(value);
            }
        }
        // -------------------------------------------------------------------------------
        function single_command(commands) {
            return commands.length === 1 && !commands[0].redirects.length;
        }
        // -------------------------------------------------------------------------------
        function make_tty() {
            var tty = {
                read: function(message, callback) {
                    // in case we return read() call from interpreter
                    // we can't access force_awake flag in term (it's invoked later)
                    if (term.paused()) {
                        term.resume();
                    }
                    if ((command_index === 0 && !tty.buffer) || process_redirect) {
                        term.push = orig.push;
                        term.echo = orig.echo;
                        var ret = orig.read.apply(term, arguments);
                        return ret.then(function(value) {
                            term.push = tty.push;
                            term.echo = tty.echo;
                            return value;
                        });
                    } else {
                        var text;
                        if (tty.buffer) {
                            text = tty.buffer.replace(/\n$/, '');
                            delete tty.buffer;
                        }
                        var d = new $.Deferred();
                        if (is_function(callback)) {
                            callback(text);
                        }
                        d.resolve(text);
                        return d.promise();
                    }
                },
                echo: function(string) {
                    if (overwrite_buffer) {
                        overwrite_buffer = false;
                        tty.buffer = '';
                    }
                    tty.buffer = (tty.buffer || '') + string + '\n';
                },
                push: function() {
                    this.error(strings(this).pipeNestedInterpreterError);
                }
            };
            return tty;
        }
        // -------------------------------------------------------------------------------
        function strings(term) {
            var term_settings = term.settings();
            return $.extend(
                {},
                $.terminal.defaults.strings,
                term_settings && term_settings.strings || {}
            );
        }
        // -------------------------------------------------------------------------------
        function error(message) {
            var echo = term.echo;
            term.echo = orig.echo;
            term.error(message);
            term.echo = echo;
        }
        // -------------------------------------------------------------------------------
        function stringify(cmd) {
            return cmd.name + ' ' + cmd.args.join(' ');
        }
        // -------------------------------------------------------------------------------
        return function(command, t) {
            command_index = -1;
            term = t; // for echo_non_empty and function that call it
            var term_settings = term.settings();
            if (!orig) {
                orig = {
                    echo: term.echo,
                    read: term.read,
                    push: term.push
                };
            }
            var tty = make_tty();
            var commands = parse_command(command);
            function loop(callback) {
                var i = 0;
                var d = new $.Deferred();
                return (function inner() {
                    var cmd = commands[i++];
                    if (cmd) {
                        process_redirect = true;
                        redirects(cmd).then(function() {
                            process_redirect = false;
                            if (!commands[i]) {
                                $.extend(term, {echo: orig.echo, push: orig.push});
                            }
                            command_index++;
                            var ret = callback(cmd);
                            if (ret === false) {
                                return inner();
                            } else {
                                return continuation(ret, inner, 'inner');
                            }
                        });
                    } else {
                        d.resolve();
                    }
                    return d.promise();
                })();
            }
            if (single_command(commands)) {
                var cmd = commands[0];
                if (is_function(interpreter)) {
                    return interpreter.call(term, stringify(cmd), term);
                } else if (is_function(interpreter[cmd.name])) {
                    return interpreter[cmd.name].apply(term, cmd.args);
                } else if ($.isPlainObject(interpreter[cmd.name])) {
                    term.push(interpreter[cmd.name], {
                        prompt: cmd.name + '> ',
                        name: cmd.name,
                        completion: Object.keys(interpreter[cmd.name])
                    });
                } else if (is_function(term_settings.onCommandNotFound)) {
                    term_settings.onCommandNotFound.call(term, command, term);
                } else {
                    error(sprintf(strings(term).commandNotFound, cmd.name));
                }
            } else {
                $.extend(term, tty);
                var stop_error = false;
                var promise = loop(function(cmd) {
                    var ret;
                    if (is_function(interpreter)) {
                        // this branch will be always invoked with new API
                        // using pipe option
                        var str = stringify(cmd);
                        // this resume and exec is needed for rpc
                        // because it use pause/resume and not promises
                        // TODO: refactor RPC in terminal
                        term.resume();
                        ret = term.exec(str, true);
                        return continuation(ret, echo_non_empty);
                    } else {
                        var inter = interpreter[cmd.name];
                        if (is_function(inter)) {
                            ret = inter.apply(term, cmd.args);
                            return continuation(ret, echo_non_empty);
                        } else {
                            if ($.isPlainObject(inter)) {
                                error(strings(term).pipeNestedInterpreterError);
                            } else if (is_function(term_settings.onCommandNotFound)) {
                                if (!stop_error) {
                                    term_settings.onCommandNotFound.call(
                                        term,
                                        command,
                                        term
                                    );
                                    stop_error = true;
                                }
                            } else {
                                error(sprintf(strings(term).commandNotFound, cmd.name));
                            }
                            return false;
                        }
                    }
                });
                return promise.then(function() {
                    $.extend(term, orig);
                });
            }
        };
    };
    // -------------------------------------------------------------------------
    var init = $.fn.terminal;
    $.fn.terminal = function(interpreter, options) {
        if (options && options.pipe) {
            var settings = $.extend({}, {
                onInit: function() {
                    if (options && options.pipe) {
                        var fn_interpreter = this.commands();
                        this.set_interpreter($.terminal.pipe(fn_interpreter, options));
                    }
                    if (options && is_function(options.onInit)) {
                        options.onInit.call(this, this);
                    }
                }
            }, options);
        }
        return init.call(this, interpreter, settings || options);
    };
});

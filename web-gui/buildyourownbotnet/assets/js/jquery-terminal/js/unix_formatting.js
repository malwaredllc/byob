/**@license
 *       __ _____                     ________                              __
 *      / // _  /__ __ _____ ___ __ _/__  ___/__ ___ ______ __ __  __ ___  / /
 *  __ / // // // // // _  // _// // / / // _  // _//     // //  \/ // _ \/ /
 * /  / // // // // // ___// / / // / / // ___// / / / / // // /\  // // / /__
 * \___//____ \\___//____//_/ _\_  / /_//____//_/ /_/ /_//_//_/ /_/ \__\_\___/
 *           \/              /____/
 * http://terminal.jcubic.pl
 *
 * This is example of how to create custom formatter for jQuery Terminal
 *
 * Copyright (c) 2014-2019 Jakub Jankiewicz <https://jcubic.pl/me>
 * Released under the MIT license
 *
 * Includes: node-ansiparser, MIT license, Copyright (c) 2014 Joerg Breitbart
 *
 * Last Update in jQuery Terminal 2.11.0
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
    /* eslint-disable */
    /* istanbul ignore next */
    function warn(str) {
        if ('warn' in console) {
            console.warn(str);
        }
    }
    // node-ansiparser
    // The MIT License (MIT)
    // Copyright (c) 2014 Joerg Breitbart
    /* istanbul ignore next */
    var AnsiParser = (function () {
        'use strict';

        /**
         * range function for numbers [a, .., b-1]
         *
         * @param {number} a
         * @param {number} b
         * @return {Array}
         */
        function r(a, b) {
            var c = b - a;
            var arr = new Array(c);
            while (c--)
                arr[c] = --b;
            return arr;
        }

        /**
         * Add a transition to the transition table.
         *
         * @param table - table to add transition
         * @param {number} inp - input character code
         * @param {number} state - current state
         * @param {number=} action - action to be taken
         * @param {number=} next - next state
         */
        function add(table, inp, state, action, next) {
            table[state<<8|inp] = ((action | 0) << 4) | ((next === undefined) ? state : next);
        }

        /**
         * Add multiple transitions to the transition table.
         *
         * @param table - table to add transition
         * @param {Array} inps - array of input character codes
         * @param {number} state - current state
         * @param {number=} action - action to be taken
         * @param {number=} next - next state
         */
        function add_list(table, inps, state, action, next) {
            for (var i=0; i<inps.length; i++)
                add(table, inps[i], state, action, next);
        }

        /** global definition of printables and executables */
        var PRINTABLES = r(0x20, 0x7f);
        var EXECUTABLES = r(0x00, 0x18);
        EXECUTABLES.push(0x19);
        EXECUTABLES.concat(r(0x1c, 0x20));

        /* meaning of state and action indices
           var STATES = [
           'GROUND',
           'ESCAPE',
           'ESCAPE_INTERMEDIATE',
           'CSI_ENTRY',
           'CSI_PARAM',
           'CSI_INTERMEDIATE',
           'CSI_IGNORE',
           'SOS_PM_APC_STRING',
           'OSC_STRING',
           'DCS_ENTRY',
           'DCS_PARAM',
           'DCS_IGNORE',
           'DCS_INTERMEDIATE',
           'DCS_PASSTHROUGH'
           ];
           var ACTIONS = [
           'ignore',
           'error',
           'print',
           'execute',
           'osc_start',
           'osc_put',
           'osc_end',
           'csi_dispatch',
           'param',
           'collect',
           'esc_dispatch',
           'clear',
           'dcs_hook',
           'dcs_put',
           'dcs_unhook'
           ];
        */

        /**
         * create the standard transition table - used by all parser instances
         *
         *     table[state << 8 | character code] = action << 4 | next state
         *
         *     - states are indices of STATES (0 to 13)
         *     - control character codes defined from 0 to 159 (C0 and C1)
         *     - actions are indices of ACTIONS (0 to 14)
         *     - any higher character than 159 is handled by the 'error' action
         */
        var TRANSITION_TABLE = (function() {
            var t = new Uint8Array(4095);

            // table with default transition [any] --> [error, GROUND]
            for (var state=0; state<14; ++state) {
                for (var code=0; code<160; ++code) {
                    t[state<<8|code] = 16;
                }
            }

            // apply transitions
            // printables
            add_list(t, PRINTABLES, 0, 2);
            // global anywhere rules
            for (state=0; state<14; ++state) {
                add_list(t, [0x18, 0x1a, 0x99, 0x9a], state, 3, 0);
                add_list(t, r(0x80, 0x90), state, 3, 0);
                add_list(t, r(0x90, 0x98), state, 3, 0);
                add(t, 0x9c, state, 0, 0);   // ST as terminator
                add(t, 0x1b, state, 11, 1);  // ESC
                add(t, 0x9d, state, 4, 8);   // OSC
                add_list(t, [0x98, 0x9e, 0x9f], state, 0, 7);
                add(t, 0x9b, state, 11, 3);  // CSI
                add(t, 0x90, state, 11, 9);  // DCS
            }
            // rules for executables and 7f
            add_list(t, EXECUTABLES, 0, 3);
            add_list(t, EXECUTABLES, 1, 3);
            add(t, 0x7f, 1);
            add_list(t, EXECUTABLES, 8);
            add_list(t, EXECUTABLES, 3, 3);
            add(t, 0x7f, 3);
            add_list(t, EXECUTABLES, 4, 3);
            add(t, 0x7f, 4);
            add_list(t, EXECUTABLES, 6, 3);
            add_list(t, EXECUTABLES, 5, 3);
            add(t, 0x7f, 5);
            add_list(t, EXECUTABLES, 2, 3);
            add(t, 0x7f, 2);
            // osc
            add(t, 0x5d, 1, 4, 8);
            add_list(t, PRINTABLES, 8, 5);
            add(t, 0x7f, 8, 5);
            add_list(t, [0x9c, 0x1b, 0x18, 0x1a, 0x07], 8, 6, 0);
            add_list(t, r(0x1c, 0x20), 8, 0);
            // sos/pm/apc does nothing
            add_list(t, [0x58, 0x5e, 0x5f], 1, 0, 7);
            add_list(t, PRINTABLES, 7);
            add_list(t, EXECUTABLES, 7);
            add(t, 0x9c, 7, 0, 0);
            // csi entries
            add(t, 0x5b, 1, 11, 3);
            add_list(t, r(0x40, 0x7f), 3, 7, 0);
            add_list(t, r(0x30, 0x3a), 3, 8, 4);
            add(t, 0x3b, 3, 8, 4);
            add_list(t, [0x3c, 0x3d, 0x3e, 0x3f], 3, 9, 4);
            add_list(t, r(0x30, 0x3a), 4, 8);
            add(t, 0x3b, 4, 8);
            add_list(t, r(0x40, 0x7f), 4, 7, 0);
            add_list(t, [0x3a, 0x3c, 0x3d, 0x3e, 0x3f], 4, 0, 6);
            add_list(t, r(0x20, 0x40), 6);
            add(t, 0x7f, 6);
            add_list(t, r(0x40, 0x7f), 6, 0, 0);
            add(t, 0x3a, 3, 0, 6);
            add_list(t, r(0x20, 0x30), 3, 9, 5);
            add_list(t, r(0x20, 0x30), 5, 9);
            add_list(t, r(0x30, 0x40), 5, 0, 6);
            add_list(t, r(0x40, 0x7f), 5, 7, 0);
            add_list(t, r(0x20, 0x30), 4, 9, 5);
            // esc_intermediate
            add_list(t, r(0x20, 0x30), 1, 9, 2);
            add_list(t, r(0x20, 0x30), 2, 9);
            add_list(t, r(0x30, 0x7f), 2, 10, 0);
            add_list(t, r(0x30, 0x50), 1, 10, 0);
            add_list(t, [0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x59, 0x5a, 0x5c], 1, 10, 0);
            add_list(t, r(0x60, 0x7f), 1, 10, 0);
            // dcs entry
            add(t, 0x50, 1, 11, 9);
            add_list(t, EXECUTABLES, 9);
            add(t, 0x7f, 9);
            add_list(t, r(0x1c, 0x20), 9);
            add_list(t, r(0x20, 0x30), 9, 9, 12);
            add(t, 0x3a, 9, 0, 11);
            add_list(t, r(0x30, 0x3a), 9, 8, 10);
            add(t, 0x3b, 9, 8, 10);
            add_list(t, [0x3c, 0x3d, 0x3e, 0x3f], 9, 9, 10);
            add_list(t, EXECUTABLES, 11);
            add_list(t, r(0x20, 0x80), 11);
            add_list(t, r(0x1c, 0x20), 11);
            add_list(t, EXECUTABLES, 10);
            add(t, 0x7f, 10);
            add_list(t, r(0x1c, 0x20), 10);
            add_list(t, r(0x30, 0x3a), 10, 8);
            add(t, 0x3b, 10, 8);
            add_list(t, [0x3a, 0x3c, 0x3d, 0x3e, 0x3f], 10, 0, 11);
            add_list(t, r(0x20, 0x30), 10, 9, 12);
            add_list(t, EXECUTABLES, 12);
            add(t, 0x7f, 12);
            add_list(t, r(0x1c, 0x20), 12);
            add_list(t, r(0x20, 0x30), 12, 9);
            add_list(t, r(0x30, 0x40), 12, 0, 11);
            add_list(t, r(0x40, 0x7f), 12, 12, 13);
            add_list(t, r(0x40, 0x7f), 10, 12, 13);
            add_list(t, r(0x40, 0x7f), 9, 12, 13);
            add_list(t, EXECUTABLES, 13, 13);
            add_list(t, PRINTABLES, 13, 13);
            add(t, 0x7f, 13);
            add_list(t, [0x1b, 0x9c], 13, 14, 0);

            return t;
        })();


        /**
         *  AnsiParser - Parser for ANSI terminal escape sequences.
         *
         * @param {Object=} terminal emulation object
         * @constructor
         */
        function AnsiParser(terminal) {
            this.initial_state = 0;  // 'GROUND' is default
            this.current_state = this.initial_state|0;

            // clone global transition table
            this.transitions = new Uint8Array(4095);
            this.transitions.set(TRANSITION_TABLE);

            // global non pushable buffers for multiple parse invocations
            this.osc = '';
            this.params = [0];
            this.collected = '';

            // back reference to terminal
            this.term = terminal || {};
            var instructions = ['inst_p', 'inst_o', 'inst_x', 'inst_c',
                                'inst_e', 'inst_H', 'inst_P', 'inst_U', 'inst_E'];
            for (var i=0; i<instructions.length; ++i)
                if (!(instructions[i] in this.term))
                    this.term[instructions[i]] = function() {};
        }

        /**
         * Reset the parser.
         */
        AnsiParser.prototype.reset = function() {
            this.current_state = this.initial_state|0;
            this.osc = '';
            this.params = [0];
            this.collected = '';
        };

        /**
         * Parse string s.
         * @param {string} s
         */
        AnsiParser.prototype.parse = function(s) {
            var code = 0,
                transition = 0,
                error = false,
                current_state = this.current_state|0;

            // local buffers
            var printed = -1;
            var dcs = -1;
            var osc = this.osc;
            var collected = this.collected;
            var params = this.params;

            // process input string
            for (var i=0, l=s.length|0; i<l; ++i) {
                code = s.charCodeAt(i)|0;
                // shortcut for most chars (print action)
                if (current_state===0 && code>0x1f && code<0x80) {
                    printed = (printed + 1) ? printed|0: i|0;
                    continue;
                }
                transition = ((code < 0xa0) ? (this.transitions[(current_state<<8|code)|0])|0 : 16)|0;
                switch ((transition >> 4)|0) {
                    case 2: // print
                        printed = (printed + 1) ? printed|0: i|0;
                        break;
                    case 3: // execute
                        if (printed + 1) {
                            this.term.inst_p(s.substring(printed, i));
                            printed = -1;
                        }
                        this.term.inst_x(String.fromCharCode(code));
                        break;
                    case 0: // ignore
                        // handle leftover print and dcs chars
                        if (printed + 1) {
                            this.term.inst_p(s.substring(printed, i));
                            printed = -1;
                        } else if (dcs + 1) {
                            this.term.inst_P(s.substring(dcs, i));
                            dcs = -1;
                        }
                        break;
                    case 1: // error
                        // handle unicode chars in write buffers w'o state change
                        if (code > 0x9f) {
                            switch (current_state) {
                                case 0: // GROUND -> add char to print string
                                    printed = (!(printed+1)) ? i|0 : printed|0;
                                    break;
                                case 8: // OSC_STRING -> add char to osc string
                                    osc += String.fromCharCode(code);
                                    transition = (transition | 8)|0;
                                    break;
                                case 6: // CSI_IGNORE -> ignore char
                                    transition = (transition | 6)|0;
                                    break;
                                case 11: // DCS_IGNORE -> ignore char
                                    transition = (transition | 11)|0;
                                    break;
                                case 13: // DCS_PASSTHROUGH -> add char to dcs
                                    if (!(dcs + 1))
                                        dcs = i|0;
                                    transition = (transition | 13)|0;
                                    break;
                                default: // real error
                                    error = true;
                            }
                        } else { // real error
                            error = true;
                        }
                        if (error) {
                            if (this.term.inst_E(
                                {
                                    pos: i,                 // position in parse string
                                    character: String.fromCharCode(code), // wrong character
                                    state: current_state,   // in state
                                    print: printed,         // print buffer
                                    dcs: dcs,               // dcs buffer
                                    osc: osc,               // osc buffer
                                    collect: collected,     // collect buffer
                                    params: params          // params buffer
                                })) {
                                return;
                            }
                            error = false;
                        }
                        break;
                    case 7: // csi_dispatch
                        this.term.inst_c(collected, params, String.fromCharCode(code));
                        break;
                    case 8: // param
                        if (code === 0x3b)
                            params.push(0);
                        else
                            params[params.length-1] = (params[params.length-1] * 10 + code - 48)|0;
                        break;
                    case 9: // collect
                        collected += String.fromCharCode(code);
                        break;
                    case 10: // esc_dispatch
                        this.term.inst_e(collected, String.fromCharCode(code));
                        break;
                    case 11: // clear
                        if (printed + 1) {
                            this.term.inst_p(s.substring(printed, i));
                            printed = -1;
                        }
                        osc = '';
                        params = [0];
                        collected = '';
                        dcs = -1;
                        break;
                    case 12: // dcs_hook
                        this.term.inst_H(collected, params, String.fromCharCode(code));
                        break;
                    case 13: // dcs_put
                        if (!(dcs + 1))
                            dcs = i|0;
                        break;
                    case 14: // dcs_unhook
                        if (dcs + 1) {
                            this.term.inst_P(s.substring(dcs, i));
                        }
                        this.term.inst_U();
                        if (code === 0x1b)
                            transition = (transition | 1)|0;
                        osc = '';
                        params = [0];
                        collected = '';
                        dcs = -1;
                        break;
                    case 4: // osc_start
                        if (~printed) {
                            this.term.inst_p(s.substring(printed, i));
                            printed = -1;
                        }
                        osc = '';
                        break;
                    case 5: // osc_put
                        osc += s.charAt(i);
                        break;
                    case 6: // osc_end
                        if (osc && code !== 0x18 && code !== 0x1a)
                            this.term.inst_o(osc);
                        if (code === 0x1b)
                            transition = (transition | 1)|0;
                        osc = '';
                        params = [0];
                        collected = '';
                        dcs = -1;
                        break;
                }
                current_state = (transition & 15)|0;
            }

            // push leftover pushable buffers to terminal
            if (!current_state && (printed + 1)) {
                this.term.inst_p(s.substring(printed));
            } else if (current_state===13 && (dcs + 1)) {
                this.term.inst_P(s.substring(dcs));
            }

            // save non pushable buffers
            this.osc = osc;
            this.collected = collected;
            this.params = params;

            // save state
            this.current_state = current_state|0;
        };
        return AnsiParser;
    })();
    /* eslint-enable */
    // ---------------------------------------------------------------------
    $.terminal.defaults.unixFormattingEscapeBrackets = false;
    // we match characters and html entities because command line escape brackets
    // echo don't, when writing formatter always process html entitites so it work
    // for cmd plugin as well for echo
    var chr = '[^\\x08]|[\\r\\n]{2}|&[^;]+;';
    var backspace_re = new RegExp('^(' + chr + ')?\\x08');
    var overtyping_re = new RegExp('^(?:(' + chr + ')?\\x08(_|\\1)|' +
                                   '(_)\\x08(' + chr + '))');
    var new_line_re = /^(\r\n|\n\r|\r|\n)/;
    var clear_line_re = /[^\r\n]+\r\x1B\[K/g;
    // ---------------------------------------------------------------------
    function length(string) {
        return $.terminal.length(string);
    }
    // ---------------------------------------------------------------------
    // :: Replace overtyping (from man) formatting with terminal formatting
    // ---------------------------------------------------------------------
    $.terminal.overtyping = function overtyping(string, options) {
        string = $.terminal.unescape_brackets(string);
        var settings = $.extend({
            unixFormattingEscapeBrackets: false,
            position: 0
        }, options);
        var removed_chars = [];
        var new_position;
        var char_count = 0;
        var backspaces = [];
        function replace(string, position) {
            var result = '';
            var push = 0;
            var start;
            char_count = 0;
            function correct_position(start, match, rep_string) {
                // logic taken from $.terminal.tracking_replace
                if (start < position) {
                    var last_index = start + length(match);
                    if (last_index < position) {
                        // It's after the replacement, move it
                        new_position = Math.max(
                            0,
                            new_position +
                            length(rep_string) -
                            length(match)
                        );
                    } else {
                        // It's *in* the replacement, put it just after
                        new_position += length(rep_string) - (position - start);
                    }
                }
            }
            for (var i = 0; i < string.length; ++i) {
                var partial = string.substring(i);
                var match = partial.match(backspace_re);
                var removed_char = removed_chars[0];
                if (match) {
                    // we remove backspace and character or html entity before it
                    // but we keep it in removed array so we can put it back
                    // when we have caritage return or line feed
                    if (match[1]) {
                        start = i - match[1].length + push;
                        removed_chars.push({
                            index: start,
                            string: match[1],
                            overtyping: partial.match(overtyping_re)
                        });
                        correct_position(start, match[0], '', 1);
                    }
                    if (char_count < 0) {
                        char_count = 0;
                    }
                    backspaces = backspaces.map(function(b) {
                        return b - 1;
                    });
                    backspaces.push(start);
                    return result + partial.replace(backspace_re, '');
                } else if (partial.match(new_line_re)) {
                    // if newline we need to add at the end all characters
                    // removed by backspace but only if there are no more
                    // other characters than backspaces added between
                    // backspaces and newline
                    if (removed_chars.length) {
                        var chars = removed_chars;
                        removed_chars = [];
                        chars.reverse().forEach(function(char) {
                            if (i > char.index) {
                                if (--char_count <= 0) {
                                    correct_position(char.index, '', char.string, 2);
                                    result += char.string;
                                }
                            } else {
                                removed_chars.unshift(char);
                            }
                        });
                    }
                    var m = partial.match(new_line_re);
                    result += m[1];
                    i += m[1].length - 1;
                } else {
                    if (backspaces.length) {
                        var backspace = backspaces[0];
                        if (i === backspace) {
                            backspaces.shift();
                        }
                        if (i >= backspace) {
                            char_count++;
                        }
                    }
                    if (removed_chars.length) {
                        // if we are in index of removed character we check if the
                        // character is the same it will be bold or if removed char
                        // or char at index is underscore then it will
                        // be terminal formatting with underscore
                        if (i > removed_char.index && removed_char.overtyping) {
                            removed_chars.shift();
                            correct_position(removed_char.index, '', removed_char.string);
                            // if we add special character we need to correct
                            // next push to removed_char array
                            push++;
                            // we use special characters instead of terminal
                            // formatting so it's easier to proccess when removing
                            // backspaces
                            if (removed_char.string === string[i]) {
                                result += string[i] + '\uFFF1';
                                continue;
                            } else if (removed_char.string === '_' ||
                                       string[i] === '_') {
                                var chr;
                                if (removed_char.string === '_') {
                                    chr = string[i];
                                } else {
                                    chr = removed_char.string;
                                }
                                result += chr + '\uFFF2';
                                continue;
                            }
                        }
                    }
                    result += string[i];
                }
            }
            return result;
        }
        var break_next = false;
        // loop until not more backspaces
        new_position = settings.position;
        // we need to clear line \x1b[K in overtyping because it need to be before
        // overtyping and from_ansi need to be called after so it escape stuff
        // between Escape Code and cmd will have escaped formatting typed by user
        var rep = $.terminal.tracking_replace(string, clear_line_re, '', new_position);
        string = rep[0];
        new_position = rep[1];
        while (string.match(/\x08/) || removed_chars.length) {
            string = replace(string, new_position);
            if (break_next) {
                break;
            }
            if (!string.match(/\x08/)) {
                // we break the loop so if removed_chars still chave items
                // we don't have infite loop
                break_next = true;
            }
        }
        function format(string, chr, style) {
            var re = new RegExp('((:?.' + chr + ')+)', 'g');
            return string.replace(re, function(_, string) {
                var re = new RegExp(chr, 'g');
                return '[[' + style + ']' + string.replace(re, '') + ']';
            });
        }
        // replace special characters with terminal formatting
        string = format(string, '\uFFF1', 'b;#fff;');
        string = format(string, '\uFFF2', 'u;;');
        if (settings.unixFormattingEscapeBrackets) {
            string = $.terminal.escape_brackets(string);
        }
        if (options && typeof options.position === 'number') {
            return [string, new_position];
        }
        return string;
    };
    // ---------------------------------------------------------------------
    // :: Html colors taken from ANSI formatting in Linux Terminal
    // ---------------------------------------------------------------------
    $.terminal.ansi_colors = {
        normal: {
            black: '#000',
            red: '#A00',
            green: '#008400',
            yellow: '#A50',
            blue: '#00A',
            magenta: '#A0A',
            cyan: '#0AA',
            white: '#AAA'
        },
        faited: {
            black: '#000',
            red: '#640000',
            green: '#006100',
            yellow: '#737300',
            blue: '#000087',
            magenta: '#650065',
            cyan: '#008787',
            white: '#818181'
        },
        bold: {
            black: '#444',
            red: '#F55',
            green: '#44D544',
            yellow: '#FF5',
            blue: '#55F',
            magenta: '#F5F',
            cyan: '#5FF',
            white: '#FFF'
        },
        // XTerm 8-bit pallete
        palette: [
            '#000000', '#AA0000', '#00AA00', '#AA5500', '#0000AA', '#AA00AA',
            '#00AAAA', '#AAAAAA', '#555555', '#FF5555', '#55FF55', '#FFFF55',
            '#5555FF', '#FF55FF', '#55FFFF', '#FFFFFF', '#000000', '#00005F',
            '#000087', '#0000AF', '#0000D7', '#0000FF', '#005F00', '#005F5F',
            '#005F87', '#005FAF', '#005FD7', '#005FFF', '#008700', '#00875F',
            '#008787', '#0087AF', '#0087D7', '#0087FF', '#00AF00', '#00AF5F',
            '#00AF87', '#00AFAF', '#00AFD7', '#00AFFF', '#00D700', '#00D75F',
            '#00D787', '#00D7AF', '#00D7D7', '#00D7FF', '#00FF00', '#00FF5F',
            '#00FF87', '#00FFAF', '#00FFD7', '#00FFFF', '#5F0000', '#5F005F',
            '#5F0087', '#5F00AF', '#5F00D7', '#5F00FF', '#5F5F00', '#5F5F5F',
            '#5F5F87', '#5F5FAF', '#5F5FD7', '#5F5FFF', '#5F8700', '#5F875F',
            '#5F8787', '#5F87AF', '#5F87D7', '#5F87FF', '#5FAF00', '#5FAF5F',
            '#5FAF87', '#5FAFAF', '#5FAFD7', '#5FAFFF', '#5FD700', '#5FD75F',
            '#5FD787', '#5FD7AF', '#5FD7D7', '#5FD7FF', '#5FFF00', '#5FFF5F',
            '#5FFF87', '#5FFFAF', '#5FFFD7', '#5FFFFF', '#870000', '#87005F',
            '#870087', '#8700AF', '#8700D7', '#8700FF', '#875F00', '#875F5F',
            '#875F87', '#875FAF', '#875FD7', '#875FFF', '#878700', '#87875F',
            '#878787', '#8787AF', '#8787D7', '#8787FF', '#87AF00', '#87AF5F',
            '#87AF87', '#87AFAF', '#87AFD7', '#87AFFF', '#87D700', '#87D75F',
            '#87D787', '#87D7AF', '#87D7D7', '#87D7FF', '#87FF00', '#87FF5F',
            '#87FF87', '#87FFAF', '#87FFD7', '#87FFFF', '#AF0000', '#AF005F',
            '#AF0087', '#AF00AF', '#AF00D7', '#AF00FF', '#AF5F00', '#AF5F5F',
            '#AF5F87', '#AF5FAF', '#AF5FD7', '#AF5FFF', '#AF8700', '#AF875F',
            '#AF8787', '#AF87AF', '#AF87D7', '#AF87FF', '#AFAF00', '#AFAF5F',
            '#AFAF87', '#AFAFAF', '#AFAFD7', '#AFAFFF', '#AFD700', '#AFD75F',
            '#AFD787', '#AFD7AF', '#AFD7D7', '#AFD7FF', '#AFFF00', '#AFFF5F',
            '#AFFF87', '#AFFFAF', '#AFFFD7', '#AFFFFF', '#D70000', '#D7005F',
            '#D70087', '#D700AF', '#D700D7', '#D700FF', '#D75F00', '#D75F5F',
            '#D75F87', '#D75FAF', '#D75FD7', '#D75FFF', '#D78700', '#D7875F',
            '#D78787', '#D787AF', '#D787D7', '#D787FF', '#D7AF00', '#D7AF5F',
            '#D7AF87', '#D7AFAF', '#D7AFD7', '#D7AFFF', '#D7D700', '#D7D75F',
            '#D7D787', '#D7D7AF', '#D7D7D7', '#D7D7FF', '#D7FF00', '#D7FF5F',
            '#D7FF87', '#D7FFAF', '#D7FFD7', '#D7FFFF', '#FF0000', '#FF005F',
            '#FF0087', '#FF00AF', '#FF00D7', '#FF00FF', '#FF5F00', '#FF5F5F',
            '#FF5F87', '#FF5FAF', '#FF5FD7', '#FF5FFF', '#FF8700', '#FF875F',
            '#FF8787', '#FF87AF', '#FF87D7', '#FF87FF', '#FFAF00', '#FFAF5F',
            '#FFAF87', '#FFAFAF', '#FFAFD7', '#FFAFFF', '#FFD700', '#FFD75F',
            '#FFD787', '#FFD7AF', '#FFD7D7', '#FFD7FF', '#FFFF00', '#FFFF5F',
            '#FFFF87', '#FFFFAF', '#FFFFD7', '#FFFFFF', '#080808', '#121212',
            '#1C1C1C', '#262626', '#303030', '#3A3A3A', '#444444', '#4E4E4E',
            '#585858', '#626262', '#6C6C6C', '#767676', '#808080', '#8A8A8A',
            '#949494', '#9E9E9E', '#A8A8A8', '#B2B2B2', '#BCBCBC', '#C6C6C6',
            '#D0D0D0', '#DADADA', '#E4E4E4', '#EEEEEE'
        ]
    };
    // ---------------------------------------------------------------------
    // :: Replace ANSI formatting with terminal formatting
    // ---------------------------------------------------------------------
    $.terminal.from_ansi = (function() {
        var color_list = {
            30: 'black',
            31: 'red',
            32: 'green',
            33: 'yellow',
            34: 'blue',
            35: 'magenta',
            36: 'cyan',
            37: 'white',

            39: 'inherit' // default color
        };
        var background_list = {
            40: 'black',
            41: 'red',
            42: 'green',
            43: 'yellow',
            44: 'blue',
            45: 'magenta',
            46: 'cyan',
            47: 'white',

            49: 'transparent' // default background
        };
        function format_ansi(controls/*code*/, state) {
            //var controls = code.split(';');
            var num;
            var styles = [];
            var output_color = '';
            var output_background = '';
            var _process_true_color = -1;
            var _ex_color = false;
            var _ex_background = false;
            var _process_8bit = false;
            var palette = $.terminal.ansi_colors.palette;
            function set_styles(num) {
                switch (num) {
                    case 0:
                        Object.keys(state).forEach(function(key) {
                            delete state[key];
                        });
                        state.bold = false;
                        state.faited = false;
                        break;
                    case 1:
                        styles.push('b');
                        state.bold = true;
                        state.faited = false;
                        break;
                    case 4:
                        styles.push('u');
                        break;
                    case 3:
                        styles.push('i');
                        break;
                    case 5:
                        if (_ex_color || _ex_background) {
                            _process_8bit = true;
                        }
                        break;
                    case 38:
                        _ex_color = true;
                        break;
                    case 48:
                        _ex_background = true;
                        break;
                    case 2:
                        if (_ex_color || _ex_background) {
                            _process_true_color = 0;
                        } else {
                            state.faited = true;
                            state.bold = false;
                        }
                        break;
                    case 7:
                        state.reverse = true;
                        break;
                    default:
                        if (controls[1] !== '5') {
                            if (color_list[num]) {
                                output_color = color_list[num];
                            }
                            if (background_list[num]) {
                                output_background = background_list[num];
                            }
                        }
                }
            }
            // -----------------------------------------------------------------
            function process_true_color() {
                if (_ex_color) {
                    if (!output_color) {
                        output_color = '#';
                    }
                    if (output_color.length < 7) {
                        output_color += ('0' + num.toString(16)).slice(-2);
                    }
                }
                if (_ex_background) {
                    if (!output_background) {
                        output_background = '#';
                    }
                    if (output_background.length < 7) {
                        output_background += ('0' + num.toString(16)).slice(-2);
                    }
                }
                if (_process_true_color === 2) {
                    _process_true_color = -1;
                } else {
                    _process_true_color++;
                }
            }
            // -----------------------------------------------------------------
            function should__process_8bit() {
                return _process_8bit && ((_ex_background && !output_background) ||
                                        (_ex_color && !output_color));
            }
            // -----------------------------------------------------------------
            function process_8bit() {
                if (_ex_color && palette[num] && !output_color) {
                    output_color = palette[num];
                }
                if (_ex_background && palette[num] && !output_background) {
                    output_background = palette[num];
                }
                _process_8bit = false;
            }
            // -----------------------------------------------------------------
            for (var i in controls) {
                if (controls.hasOwnProperty(i)) {
                    num = parseInt(controls[i], 10);
                    if (_process_true_color > -1) {
                        process_true_color();
                    } else if (should__process_8bit()) {
                        process_8bit();
                    } else {
                        set_styles(num);
                    }
                }
            }
            if (state.reverse) {
                if (output_color || output_background) {
                    var tmp = output_background;
                    output_background = output_color;
                    output_color = tmp;
                } else {
                    output_color = 'black';
                    output_background = 'white';
                }
            }
            output_color = output_color || state.color;
            output_background = output_background || state.background;
            state.background = output_background;
            state.color = output_color;
            var colors, color, background;
            if (state.bold) {
                colors = $.terminal.ansi_colors.bold;
            } else if (state.faited) {
                colors = $.terminal.ansi_colors.faited;
            } else {
                colors = $.terminal.ansi_colors.normal;
            }
            if (typeof output_color !== 'undefined') {
                if (output_color.match(/^#/)) {
                    color = output_color;
                } else if (output_color === 'inherit') {
                    color = output_color;
                } else {
                    color = colors[output_color];
                }
            }
            if (typeof output_background !== 'undefined') {
                if (output_background.match(/^#/)) { // already 8bit color #460
                    background = output_background;
                } else if (output_background === 'transparent') {
                    background = output_background;
                } else {
                    background = $.terminal.ansi_colors.normal[output_background];
                }
            }
            var ret = [styles.join(''), color, background];
            return ret;
        }
        // -------------------------------------------------------------------------------
        var ansi_re = /(\x1B\[[0-9;]*[A-Za-z])/g;
        // -------------------------------------------------------------------------------
        return function from_ansi(input, options) {
            options = options || {};
            var settings = $.extend({
                unixFormattingEscapeBrackets: false,
                position: 0
            }, options);
            if (input.match(ansi_re)) {
                input = $.terminal.unescape_brackets(input);
                var state = {};
                var code, inside, format;
                var cursor = {x: 0, y: 0};
                var result = [];
                var print = function print(s) {
                    var s_len = s.length;
                    if (settings.unixFormattingEscapeBrackets) {
                        s = $.terminal.escape_formatting(s);
                    }
                    if (format) {
                        s = format + s + ']';
                    }
                    var line = result[cursor.y];
                    var len;
                    if (!line) {
                        if (cursor.x > 0) {
                            result[cursor.y] = new Array(cursor.x + 1).join(' ') + s;
                        } else {
                            result[cursor.y] = s;
                        }
                    } else {
                        var line_len = $.terminal.length(line);
                        if (cursor.x === 0) {
                            result[cursor.y] = s + $.terminal.substring(line, s_len);
                        } else if (line_len < cursor.x) {
                            len = cursor.x - (line_len - 1);
                            result[cursor.y] += new Array(len).join(' ') + s;
                        } else if (line_len === cursor.x) {
                            result[cursor.y] += s;
                        } else {
                            var before = $.terminal.substring(line, 0, cursor.x);
                            var after = $.terminal.substring(line, cursor.x + s_len);
                            result[cursor.y] = before + s + after;
                        }
                    }
                    cursor.x += s_len;
                };
                var use_CR = !!input.match(/\x0D/);
                var events = {
                    inst_p: print,
                    inst_x: use_CR ? function(flag) {
                        var code = flag.charCodeAt(0);
                        if (code === 13) {
                            cursor.x = 0;
                        }
                        if (code === 10) {
                            cursor.y++;
                        }
                    } : function(flag) {
                        var code = flag.charCodeAt(0);
                        if (code === 10) {
                            cursor.x = 0;
                            cursor.y++;
                        }
                    },
                    inst_c: function(collected, params, flag) {
                        var value = params[0] === 0 ? 1 : params[0];
                        switch (flag) {
                            case 'A': // UP
                                cursor.y -= value;
                                break;
                            case 'B': // Down
                                cursor.y += value;
                                break;
                            case 'C': // Forward
                                cursor.x += value;
                                break;
                            case 'D': // Backward
                                cursor.x -= value;
                                break;
                            case 'E': // Cursor Next Line
                                cursor.x = 0;
                                cursor.y += value;
                                break;
                            case 'F': // Cursor Previous Line
                                cursor.x = 0;
                                cursor.y -= value;
                                break;
                            case 'm':
                                code = format_ansi(params, state);
                                var empty = params.length === 1 && params[0] === 0;
                                if (inside) {
                                    if (empty) {
                                        inside = false;
                                        format = null;
                                    } else {
                                        format = '[[' + code.join(';') + ']';
                                    }
                                } else if (empty) {
                                    format = null;
                                } else {
                                    format = '[[' + code.join(';') + ']';
                                    inside = true;
                                }
                                break;
                        }
                        if (cursor.x < 0) {
                            cursor.x = 0;
                        }
                        if (cursor.y < 0) {
                            cursor.y = 0;
                        }
                    }
                    /*
                    inst_o: function(s) {console.log('osc', s);},
                    inst_e: function(collected, flag) {},
                    inst_H: function(collected, params, flag) {},
                    inst_P: function(dcs) {},
                    inst_U: function() {}
                    */
                };
                var parser = new AnsiParser(events);
                parser.parse(input);
                return result.join('\n');
            }
            if (typeof options !== 'undefined' && typeof options.position === 'number') {
                return [input, options.position];
            }
            return input;
        };
    })();
    $.terminal.from_ansi.__no_warn__ = true;
    $.terminal.defaults.formatters.unshift($.terminal.from_ansi);
    $.terminal.defaults.formatters.unshift($.terminal.overtyping);
});

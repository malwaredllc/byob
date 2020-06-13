/**
 * jQuery Plugin for text based dialogs that look
 * like dialog linux command it use cmd plugin from
 * jQuery Terminal
 *
 * Copyright (c) 2017 Jakub Jankiewicz <http://jcubic.pl/me>
 *
 * Linceses under MIT license
 */
/* global jQuery setTimeout  */
(function($) {
    $.dialog = {
        defaults: {
            cols: 50,
            rows: 8,
            title: '',
            message: '',
            cancel: $.noop
        },
        strings: {
            ok: '_OK',
            cancel: '_Cancel'
        }
    };
    function get_char_size() {
        var temp = $('<div class="dialog temp"><div class="box"><span>'+
                     '&nbsp;</span></div></div>').appendTo('body');
        var rect = temp.find('span')[0].getBoundingClientRect();
        var result = {
            width: rect.width,
            height: rect.height
        };
        temp.remove();
        return result;
    }
    function chunks(str, length) {
        if (str.length <= length) {
            return [str];
        }
        var num_chunks = Math.ceil(str.length / length);
        var result = [];
        for(var i = 0, o = 0; i < num_chunks; ++i, o += length) {
            result.push(str.substr(o, length));
        }
        return result;
    }
    function str_repeat(str, n) {
        return new Array(n).join(str);
    }
    $.fn.dialog = function(fn, options) {
        fn = fn || $.noop;
        var chars = {
            hor: '─',
            ver: '│',
            nw: '┌',
            cw: '├',
            sw: '└',
            ne: '┐',
            ce: '┤',
            se: '┘'
        };
        var settings = $.extend({}, $.dialog.defaults, options || {});
        var cols = settings.cols > 20 ? settings.cols : 20;
        var rows = settings.rows > 8 ? settings.rows : 8;
        function line(container, left, right, options) {
            var settings = $.extend({
                bottom: false,
                reverse: false,
                length: cols
            }, options || {});
            var first, second;
            if (settings.bottom) {
                first = left;
                second = str_repeat(chars.hor, settings.length - 2) + right;
            } else {
                first = left + str_repeat(chars.hor, settings.length - 2);
                second = right;
            }
            container.append('<span class="' +
                             (settings.reverse ? 'dark' : 'light') +
                             '">' + first + '</span>');
            container.append('<span class="' +
                             (settings.reverse ? 'light' : 'dark') +
                             '">' + second + '</span>');
        }
        function update_css_var() {
            self[0].style.setProperty('--char-width', char_size.width);
            self[0].style.setProperty('--char-height', char_size.height);
        }
        if (this.length > 1) {
            var args = [].slice.call(arguments);
            return this.each(function() {
                $.fn.dialog.apply(this, args);
            });
        }
        var char_size = get_char_size();
        var self = $(this).addClass('dialog');
        update_css_var();
        var box = $('<div class="box"/>');
        var top = $('<div class="top"/>').appendTo(box);
        line(top, chars.nw, chars.ne);

        var width;

        var title = $('<div class="title"><span>' + settings.title +
                      '</span></div>').appendTo(box);

        if (settings.message) {
            var header = $('<div class="header"/>').appendTo(box);
            var size = cols - 5;
            width = char_size.width * size;
            chunks(settings.message, size).forEach(function(line) {
                var $line = $('<div class="line"/>').appendTo(header);
                $line.append('<span class="left light">' + chars.ver +
                             '&nbsp;</span>');
                $('<span>' + line + '</span>').width(width).appendTo($line);
                $line.append('<span class="left dark">&nbsp;' + chars.ver +
                             '</span>');
            });
        }

        var input = $('<div class="input"/>').appendTo(box);

        var input_line = $('<div class="line"/>').appendTo(input);
        var input_left = $('<div class="left light">' + chars.ver +
                           '&nbsp;</div>').appendTo(input_line);
        var input_top = $('<div class="top"/>').appendTo(input_line);
        line(input_top, chars.nw, chars.ne, {length: cols-4, reverse: true});
        var input_right = $('<div class="right dark">&nbsp;' + chars.ver +
                            '</div>').appendTo(input_line);

        input_line = $('<div class="line"/>').appendTo(input);
        $('<div class="left light">' + chars.ver + '&nbsp;</div>')
            .appendTo(input_line);
        $('<div class="left dark">' + chars.ver + '</div>')
            .appendTo(input_line);
        fn = fn.bind(self);
        width = char_size.width * (cols - 7);
        var cmd = $('<div/>').appendTo(input_line).cmd({
            width: width,
            prompt: '',
            commands: fn,
            keydown: function() {
                setTimeout(function() {
                    cmd.scrollLeft(cmd.prop('scrollWidth'));
                }, 0);
            },
            keymap: {
                UP: up,
                ARROWUP: up,
                DOWN: down,
                ARROWDOWN: down
            }
        });
        cmd.on('click', function() {
            cmd.enable();
            buttons.find('.selected, .active').removeClass('selected active');
            buttons.find('.ok').addClass('active');
        });
        $('<div class="right light">' + chars.ver + '</div>')
            .appendTo(input_line);
        $('<div class="right dark">&nbsp;' + chars.ver + '</div>')
            .appendTo(input_line);

        input_line = $('<div class="line"/>').appendTo(input);
        $('<div class="left light">' + chars.ver + '&nbsp;</div>')
            .appendTo(input_line);
        var input_bottom = $('<div class="bottom"/>').appendTo(input_line);
        line(input_bottom, chars.sw, chars.se, {
            length: cols-4,
            reverse: true,
            bottom: true
        });
        $('<div class="right dark">&nbsp;' + chars.ver + '</div>')
            .appendTo(input_line);

        var separator = $('<div class="separator"/>').appendTo(box);
        line(separator, chars.cw, chars.ce);

        var button_line = $('<div class="buttons-line"/>').appendTo(box);
        $('<div class="left light">' + chars.ver + '</div>')
            .appendTo(button_line);
        width = char_size.width * (cols - 3);
        var buttons = $('<div class="buttons"/>')
            .appendTo(button_line).width(width);
        function tag(str) {
            return str.replace(/_(.)/, '<span class="mark">$1</span>');
        }
        $('<button class="ok active">' + tag($.dialog.strings.ok) +
          '</button>').appendTo(buttons);
        $('<button class="cancel">' + tag($.dialog.strings.cancel) +
          '</button>').appendTo(buttons);
        $('<div class="right dark">' + chars.ver +
          '</div>').appendTo(button_line);

        buttons.on('click', '.ok', function() {
            cmd.disable();
            $(this).addClass('selected active').next()
                .removeClass('selected active');
            fn(cmd.get());
        }).on('click', '.cancel', function() {
            cmd.disable();
            $(this).addClass('selected active').prev()
                .removeClass('selected active');
            settings.cancel.call(self, cmd.get());
        });
        function up() {
            setTimeout(function() {
                cmd.disable();
            }, 0);
            var active = buttons.find('.cancel').addClass('selected active')
                .prev().removeClass('selected active');
        }
        function down() {
            setTimeout(function() {
                cmd.disable();
            }, 0);
            var active = buttons.find('.ok').addClass('selected active')
                .next().removeClass('selected active');
        }
        function keydown(e) {
            var key = e.key.toUpperCase();
            var map = {
                ARROWUP: 'UP',
                ARROWDOWN: 'DOWN',
                ARROWLEFT: 'LEFT',
                ARROWRIGHT: 'RIGHT'
            };
            if (map[key]) {
                key = map[key];
            }
            var active = buttons.find('.active');
            switch (key) {
                case 'ENTER':
                    if (!cmd.isenabled()) {
                        active.click();
                    }
                    break;
                case 'LEFT':
                    if (!cmd.isenabled()) {
                        if (active.is('.ok')) {
                            cmd.enable();
                            active.removeClass('selected');
                        } else {
                            active.removeClass('active selected').prev()
                                .addClass('active selected');
                        }
                    }
                    break;
                case 'RIGHT':
                    if (!cmd.isenabled()) {
                        if (active.is('.cancel')) {
                            cmd.enable();
                            active.removeClass('selected');
                        } else {
                            active.removeClass('active selected').next()
                                .addClass('active selected');
                        }
                    }
                    break;
                case 'UP':
                    if (!cmd.isenabled()) {
                        if (active.is('.ok')) {
                            cmd.enable();
                            active.removeClass('selected active');
                            buttons.find('.ok').addClass('active');
                        } else {
                            active.removeClass('active selected').prev()
                                .addClass('active selected');
                        }
                    }
                    break;
                case 'DOWN':
                    if (!cmd.isenabled()) {
                        if (active.is('.cancel')) {
                            cmd.enable();
                            active.removeClass('selected active');
                            buttons.find('.ok').addClass('active');
                        } else {
                            active.removeClass('active selected').next()
                                .addClass('active selected');
                        }
                    }
                    break;
            }
        }
        $(document).on('keydown', keydown);
        var bottom = $('<div class="bottom"/>').appendTo(box);
        line(bottom, chars.sw, chars.se, {bottom: true});

        box.appendTo(self);

        $.extend(self, {
            destroy: function() {
                self.removeClass('dialog');
                $(document).off('keydown', keydown);
                cmd.destroy();
                box.remove();
            },
            cmd: function() {
                return cmd;
            },
            refresh: function() {
                char_size = get_char_size();
                update_css_var();
            }
        });
        return self;
    };
})(jQuery);

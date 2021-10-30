
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
 * This extension adds inplace edit support to aciTree,
 * should be used with the selectable extension.
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        editable: false,                // if TRUE then each item will be inplace editable
        editDelay: 250                  // how many [ms] to wait (with mouse down) before starting the edit (on mouse release)
    };

    // aciTree editable extension
    // add inplace item editing by pressing F2 key or mouse click (to enter edit mode)
    // press enter/escape to save/cancel the text edit

    var aciTree_editable = {
        __extend: function() {
            // add extra data
            $.extend(this._private, {
                editTimestamp: null
            });
            // call the parent
            this._super();
        },
        // init editable
        _editableInit: function() {
            this._instance.jQuery.bind('acitree' + this._private.nameSpace, function(event, api, item, eventName, options) {
                switch (eventName) {
                    case 'blurred':
                        // support `selectable` extension
                        var item = api.edited();
                        if (item.length) {
                            // cancel edit/save the changes
                            api.endEdit();
                        }
                        break;
                    case 'deselected':
                        // support `selectable` extension
                        if (api.isEdited(item)) {
                            // cancel edit/save the changes
                            api.endEdit();
                        }
                        break;
                }
            }).bind('click' + this._private.nameSpace, this.proxy(function() {
                // click on the tree
                var item = this.edited();
                if (item.length) {
                    // cancel edit/save the changes
                    this.endEdit();
                }
            })).bind('keydown' + this._private.nameSpace, this.proxy(function(e) {
                switch (e.which) {
                    case 113: // F2
                        // support `selectable` extension
                        if (this.extSelectable && this.extSelectable()) {
                            var item = this.focused();
                            if (item.length && !this.isEdited(item) && this.isEnabled(item)) {
                                // enable edit on F2 key
                                this.edit(item);
                                // prevent default F2 key function
                                e.preventDefault();
                            }
                        }
                        break;
                }
            })).on('mousedown' + this._private.nameSpace, '.aciTreeItem', this.proxy(function(e) {
                if ($(e.target).is('.aciTreeItem,.aciTreeText')) {
                    this._private.editTimestamp = $.now();
                }
            })).on('mouseup' + this._private.nameSpace, '.aciTreeItem', this.proxy(function(e) {
                if ($(e.target).is('.aciTreeItem,.aciTreeText')) {
                    var passed = $.now() - this._private.editTimestamp;
                    // start edit only after N [ms] but before N * 4 [ms] have passed
                    if ((passed > this._instance.options.editDelay) && (passed < this._instance.options.editDelay * 4)) {
                        var item = this.itemFrom(e.target);
                        if ((!this.extSelectable || !this.extSelectable() || (this.isFocused(item) && (this.selected().length == 1))) && this.isEnabled(item)) {
                            // edit on mouseup
                            this.edit(item);
                        }
                    }
                }
            })).on('keydown' + this._private.nameSpace, 'input[type=text]', this.proxy(function(e) {
                // key handling
                switch (e.which) {
                    case 13: // enter
                        this.itemFrom(e.target).focus();
                        this.endEdit();
                        e.stopPropagation();
                        break;
                    case 27: // escape
                        this.itemFrom(e.target).focus();
                        this.endEdit({
                            save: false
                        });
                        e.stopPropagation();
                        // prevent default action on ESC
                        e.preventDefault();
                        break;
                    case 38: // up
                    case 40: // down
                    case 37: // left
                    case 39: // right
                    case 33: // pgup
                    case 34: // pgdown
                    case 36: // home
                    case 35: // end
                    case 32: // space
                    case 107: // numpad [+]
                    case 109: // numpad [-]
                    case 106: // numpad [*]
                        e.stopPropagation();
                        break;
                }
            })).on('blur' + this._private.nameSpace, 'input[type=text]', this.proxy(function() {
                if (!this.extSelectable || !this.extSelectable()) {
                    // cancel edit/save the changes
                    this.endEdit();
                }
            })).on('click' + this._private.nameSpace + ' dblclick' + this._private.nameSpace, 'input[type=text]', function(e) {
                e.stopPropagation();
            });
        },
        // override `_initHook`
        _initHook: function() {
            if (this.extEditable()) {
                this._editableInit();
            }
            // call the parent
            this._super();
        },
        // low level DOM functions
        _editableDOM: {
            // add edit field
            add: function(item) {
                var line = item.addClass('aciTreeEdited').children('.aciTreeLine');
                line.find('.aciTreeText').html('<input id="aciTree-editable-tree-item" type="text" value="" style="-webkit-user-select:text;-moz-user-select:text;-ms-user-select:text;-o-user-select:text;user-select:text" />');
                line.find('label').attr('for', 'aciTree-editable-tree-item');
                this._editableDOM.get(item).val(this.getLabel(item));
            },
            // remove edit field
            remove: function(item, label) {
                var line = item.removeClass('aciTreeEdited').children('.aciTreeLine');
                line.find('.aciTreeText').html(this.getLabel(item));
                line.find('label').removeAttr('for');
            },
            // return edit field
            get: function(item) {
                return item ? item.children('.aciTreeLine').find('input[type=text]') : $([]);
            }
        },
        // get edited item
        edited: function() {
            return this._instance.jQuery.find('.aciTreeEdited');
        },
        // test if item is edited
        isEdited: function(item) {
            return item && item.hasClass('aciTreeEdited');
        },
        // set focus to the input
        _focusEdit: function(item) {
            var field = this._editableDOM.get(item).focus().trigger('click').get(0);
            if (field) {
                if (typeof field.selectionStart == 'number') {
                    field.selectionStart = field.selectionEnd = field.value.length;
                } else if (field.createTextRange !== undefined) {
                    var range = field.createTextRange();
                    range.collapse(false);
                    range.select();
                }
            }
        },
        // override `setLabel`
        setLabel: function(item, options) {
            if (!this.extEditable() || !this.isEdited(item)) {
                // call the parent
                this._super(item, options);
            }
        },
        // edit item inplace
        edit: function(item, options) {
            options = this._options(options, 'edit', 'editfail', 'wasedit', item);
            if (this.extEditable() && this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeedit', options)) {
                    this._fail(item, options);
                    return;
                }
                var edited = this.edited();
                if (edited.length) {
                    if (edited.get(0) == item.get(0)) {
                        this._notify(item, options);
                        return;
                    } else {
                        this._editableDOM.remove.call(this, edited);
                        this._trigger(edited, 'endedit', options);
                    }
                }
                this._editableDOM.add.call(this, item);
                this._focusEdit(item);
                this._success(item, options);
            } else {
                this._fail(item, options);
            }
        },
        // end edit
        // `options.save` when set to FALSE will not save the changes
        endEdit: function(options) {
            var item = this.edited();
            options = this._options(options, 'edited', 'endeditfail', 'endedit', item);
            if (this.extEditable() && this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeendedit', options)) {
                    this._fail(item, options);
                    return;
                }
                var text = this._editableDOM.get(item).val();
                this._editableDOM.remove.call(this, item);
                if ((options.save === undefined) || options.save) {
                    this.setLabel(item, {
                        label: text
                    });
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if editable is enabled
        extEditable: function() {
            return this._instance.options.editable;
        },
        // override set `option`
        option: function(option, value) {
            if (this.wasInit() && !this.isLocked()) {
                if ((option == 'editable') && (value != this.extEditable())) {
                    if (value) {
                        this._editableInit();
                    } else {
                        this._editableDone();
                    }
                }
            }
            // call the parent
            this._super(option, value);
        },
        // done editable
        _editableDone: function() {
            this._instance.jQuery.unbind(this._private.nameSpace);
            this._instance.jQuery.off(this._private.nameSpace, '.aciTreeItem');
            this._instance.jQuery.off(this._private.nameSpace, 'input[type=text]');
            var edited = this.edited();
            if (edited.length) {
                this.endEdit();
            }
        },
        // override `_destroyHook`
        _destroyHook: function(unloaded) {
            if (unloaded) {
                this._editableDone();
            }
            // call the parent
            this._super(unloaded);
        }

    };

    // extend the base aciTree class and add the editable stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_editable, 'aciTreeEditable');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

})(jQuery, this);


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
 * This extension adds multiple column support to aciTree.
 *
 * The `columnData` option is used to tell what are the columns and show one or
 * more values that will be read from the item data object.
 *
 * Column data is an array of column definitions, each column definition is
 * an object:
 *
 * {
 *   width: 100,
 *   props: 'column_x',
 *   value: 'default'
 * }
 *
 * where the `width` is the column width in [px], if undefined - then the value
 * from the CSS will be used; the `props` is the property name that will be
 * read from the item data, if undefined (or the `item-data[column.props]`
 * is undefined) then a default value will be set for the column: the `value`.
 *
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        columnData: []                  // column definitions list
    };

    // aciTree columns extension
    // adds item columns, set width with CSS or using the API

    var aciTree_column = {
        __extend: function() {
            // add extra data
            $.extend(this._private, {
                propsIndex: { // column index cache
                }
            });
            // call the parent
            this._super();
        },
        // override `_initHook`
        _initHook: function() {
            if (this._instance.options.columnData.length) {
                // check column width
                var found = false, data;
                for (var i in this._instance.options.columnData) {
                    data = this._instance.options.columnData[i];
                    if (data.width !== undefined) {
                        // update column width
                        this._updateCss('.aciTree.aciTree' + this._instance.index + ' .aciTreeColumn' + i, 'width:' + data.width + 'px;');
                        found = true;
                    }
                    this._private.propsIndex[data.props] = i;
                }
                if (found) {
                    // at least a column width set
                    this._updateWidth();
                }
            }
            // call the parent
            this._super();
        },
        // read property value from a CSS class name
        _getCss: function(className, property, numeric) {
            var id = '_getCss_' + window.String(className).replace(/[^a-z0-9_-]/ig, '_');
            var test = $('body').find('#' + id);
            if (!test.length) {
                if (className instanceof Array) {
                    var style = '', end = '';
                    for (var i in className) {
                        style += '<div class="' + className[i] + '">';
                        end += '</div>';
                    }
                    style += end;
                } else {
                    var style = '<div class="' + className + '"></div>';
                }
                $('body').append('<div id="' + id + '" style="position:relative;display:inline-block;width:0px;height:0px;line-height:0px;overflow:hidden">' + style + '</div>');
                test = $('body').find('#' + id);
            }
            var value = test.find('*:last').css(property);
            if (numeric) {
                value = parseInt(value);
                if (isNaN(value)) {
                    value = null;
                }
            }
            return value;
        },
        // dynamically change a CSS class definition
        _updateCss: function(className, definition) {
            var id = '_updateCss_' + window.String(className).replace('>', '_gt_').replace(/[^a-z0-9_-]/ig, '_');
            var style = '<style id="' + id + '" type="text/css">' + className + '{' + definition + '}</style>';
            var test = $('body').find('#' + id);
            if (test.length) {
                test.replaceWith(style);
            } else {
                $('body').prepend(style);
            }
        },
        // get column width
        // `index` is the #0 based column index
        getWidth: function(index) {
            if ((index >= 0) && (index < this.columns())) {
                return this._getCss(['aciTree aciTree' + this._instance.index, 'aciTreeColumn' + index], 'width', true);
            }
            return null;
        },
        // set column width
        // `index` is the #0 based column index
        setWidth: function(index, width) {
            if ((index >= 0) && (index < this.columns())) {
                this._updateCss('.aciTree.aciTree' + this._instance.index + ' .aciTreeColumn' + index, 'width:' + width + 'px;');
                this._updateWidth();
            }
        },
        // update item margins
        _updateWidth: function() {
            var width = 0;
            for (var i in this._instance.options.columnData) {
                if (this.isColumn(i)) {
                    width += this.getWidth(i);
                }
            }
            var icon = this._getCss(['aciTree', 'aciTreeIcon'], 'width', true);
            // add item padding
            width += this._getCss(['aciTree', 'aciTreeItem'], 'padding-left', true) + this._getCss(['aciTree', 'aciTreeItem'], 'padding-right', true);
            this._updateCss('.aciTree.aciTree' + this._instance.index + ' .aciTreeItem', 'margin-right:' + (icon + width) + 'px;');
            this._updateCss('.aciTree[dir=rtl].aciTree' + this._instance.index + ' .aciTreeItem', 'margin-right:0;margin-left:' + (icon + width) + 'px;');
        },
        // test if column is visible
        // `index` is the #0 based column index
        isColumn: function(index) {
            if ((index >= 0) && (index < this.columns())) {
                return this._getCss(['aciTree aciTree' + this._instance.index, 'aciTreeColumn' + index], 'display') != 'none';
            }
            return false;
        },
        // get column index by `props`
        // return -1 if the column does not exists
        columnIndex: function(props) {
            if (this._private.propsIndex[props] !== undefined) {
                return this._private.propsIndex[props];
            }
            return -1;
        },
        // get the column count
        columns: function() {
            return this._instance.options.columnData.length;
        },
        // set column to be visible or hidden
        // `index` is the #0 based column index
        // if `show` is undefined then the column visibility will be toggled
        toggleColumn: function(index, show) {
            if ((index >= 0) && (index < this.columns())) {
                if (show === undefined) {
                    var show = !this.isColumn(index);
                }
                this._updateCss('.aciTree.aciTree' + this._instance.index + ' .aciTreeColumn' + index, 'display:' + (show ? 'inherit' : 'none') + ';');
                this._updateWidth();
            }
        },
        // override `_itemHook`
        _itemHook: function(parent, item, itemData, level) {
            if (this.columns()) {
                var position = item.children('.aciTreeLine').find('.aciTreeEntry');
                var data, column;
                for (var i in this._instance.options.columnData) {
                    data = this._instance.options.columnData[i];
                    column = this._createColumn(itemData, data, i);
                    position.prepend(column);
                }
            }
            // call the parent
            this._super(parent, item, itemData, level);
        },
        // create column markup
        // `itemData` item data object
        // `columnData` column data definition
        // `index` is the #0 based column index
        _createColumn: function(itemData, columnData, index) {
            var value = columnData.props && (itemData[columnData.props] !== undefined) ? itemData[columnData.props] :
                    ((columnData.value === undefined) ? '' : columnData.value);
            return $('<div class="aciTreeColumn aciTreeColumn' + index + '">' + (value.length ? value : '&nbsp;') + '</div>');
        },
        // set column content
        // `options.index` the #0 based column index
        // `options.value` is the new content
        // `options.oldValue` will keep the old content
        setColumn: function(item, options) {
            options = this._options(options, 'columnset', 'columnfail', 'wascolumn', item);
            if (this.isItem(item) && (options.index >= 0) && (options.index < this.columns())) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforecolumn', options)) {
                    this._fail(item, options);
                    return;
                }
                var data = this.itemData(item);
                // keep the old one
                options.oldValue = data[this._instance.options.columnData[options.index].props];
                if (options.value == options.oldValue) {
                    this._notify(item, options);
                } else {
                    // set the column
                    item.children('.aciTreeLine').find('.aciTreeColumn' + options.index).html(options.value);
                    // remember this one
                    data[this._instance.options.columnData[options.index].props] = options.value;
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // get column content
        getColumn: function(item, index) {
            if ((index >= 0) && (index < this.columns())) {
                var data = this.itemData(item);
                return data ? data[this._instance.options.columnData[index].props] : null;
            }
            return null;
        }
    };

    // extend the base aciTree class and add the columns stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_column, 'aciTreeColumn');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

})(jQuery, this);

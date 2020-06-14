#!/usr/bin/node

/*
 * script print terminal methods. it require esprima.
 *
 * To get list of functions, not covered by tests, use:
 *
 * methods | while read method; do
 *     grep $method spec/terminalSpec.js > /dev/null || echo $method;
 * done
 *
 * if you want to find methods not in documentation use www/api_reference.php
 * instead of spec/terminalSpec.js
 */

var fs = require('fs');
var esprima = require('esprima');

fs.readFile('js/jquery.terminal-src.js', function(err, file) {
    var syntax = esprima.parse(file.toString());
    traverse(syntax, function(obj) {
        if (obj.callee && obj.callee.property && obj.callee.property.name == 'omap' &&
            obj.callee.type == 'MemberExpression') {
            var methods = [];
            if (obj.arguments[0].properties) {
                obj.arguments[0].properties.map(function(prop) {
                    console.log(prop.key.name);
                });
                return false;
            }
        }
    });
    function traverse(obj, fn) {
        for (var key in obj) {
            if (obj[key] !== null && fn(obj[key]) === false) {
                return false;
            }
            if (typeof obj[key] == 'object' && obj[key] !== null) {
                if (traverse(obj[key], fn) === false) {
                    return false;
                }
            }
        }
    }

});

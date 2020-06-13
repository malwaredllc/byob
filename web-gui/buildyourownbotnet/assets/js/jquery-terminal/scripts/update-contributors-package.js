#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = require('optimist').argv;

function usage(error) {
    if (error) {
        console.error(error);
    }
    console.log('usage: \n' + path.basename(process.argv[1]) +
                ' -f <package-json-file>' +
                ' -j <Contributor JSON file>');
}

if (argv.f && argv.j) {
    fs.readFile(argv.j, function(err, data) {
        if (err) {
            return usage(err);
        }
        var contributors = JSON.parse(data.toString());
        fs.readFile(argv.f, function(err, data) {
            if (err) {
                return usage(err);
            }
            var _package = JSON.parse(data.toString());
            _package.contributors = contributors.map(function(user) {
                const { name, url } = user;
                return { name, url };
            });
            fs.writeFile(argv.f, JSON.stringify(_package, null, 2) + '\n', 'utf8', function(err) { 
                if (err) {
                    return usage(err);
                }
            });
        });
    });
} else {
    usage();
}
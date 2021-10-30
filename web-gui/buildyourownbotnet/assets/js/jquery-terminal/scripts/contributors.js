#!/usr/bin/env node

var https = require('https');
var path = require('path');
var fs = require('fs');
var argv = require('optimist').argv;
var request = require('request');


function split_equal(array, length) {
    var result = [];
    var len = array.length;
    if (len < length) {
        return [array];
    } else if (length < 0) {
        throw new Error("split_equal: length can't be negative");
    }
    for (var i = 0; i < len; i += length) {
        result.push(array.slice(i, i + length));
    }
    return result;
}

function get(url, query) {
    var options = {
        url: url,
        qs: query,
        headers: {
            'User-Agent': 'Node.js'
        }
    };
    if (argv.auth) {
        var [user,pass] = argv.auth.split(':');
        options.auth = {
            user,
            pass
        };
    }
    //return;
    return new Promise(function(resolve, reject) {
        request(options, function(error, res, body) {
            if (res.statusCode == 200) {
                resolve(JSON.parse(body));
            } else if (+res.headers['x-ratelimit-remaining'] == 0) {
                var date = new Date(+res.headers['x-ratelimit-reset']*1000);
                reject('Rate limit util ' + date);
            } else {
                reject('Error code ' + res.statusCode);
            }
        });
    });
}

function get_file(filename) {
    return new Promise(function(resolve, reject) {
        fs.readFile(filename, function(err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(data.toString()));
            }
        });
    });
}

function get_api(argv) {
    var user = argv.u;
    var repo = argv.r;
    var path = '/repos/' + user + '/' + repo + '/contributors';
    var query = {
        "per_page": 100
    };
    if (argv.t) {
        query['access_token'] = argv.t;
    }
    return get('https://api.github.com' + path, query).then(function(contributors) {
        return Promise.all(contributors.map(function(contributor) {
            var path = contributor.url.replace(/https:\/\/[^\/]+/, '');
            return get('https://api.github.com' + path, query).then(function(user) {
                if (user.name || user.login) {
                    var object = {
                        name: user.name || user.login
                    };
                    if (user.email) {
                        object.email = user.email;
                    }
                    if (user.blog) {
                        object.url = user.blog;
                    } else {
                        object.url = "https://github.com/" + user.login
                    }
                    object.avatar = contributor.avatar_url;
                    object.login = user.login;
                    return object;
                }
            });
        }).filter(Boolean));
    });
}


if ((argv.f && argv.m) || (argv.u && argv.r)) {
    (argv.f ? get_file(argv.f) : get_api(argv)).then(function(contributors) {
        if (argv.m) {
            var split = split_equal(contributors, 7);
            var align = new Array(split[0].length + 1).join('| :---: ') + ' |';
            var rows = split.map(function(list) {
                return '| ' + list.map(function(contributor) {
                    return '[<img src="' + contributor.avatar + '" width="100px;"/>' +
                        '<br /><sub>' + contributor.name + '</sub>](' +
                        contributor.url + ')<br>[commits](https://github.com/jcubic' +
                        '/jquery.terminal/commits?author=' + contributor.login + ')';
                }).join(' | ') + ' |';
            });
            rows.splice(1, 0, align);
            console.log(rows.join('\n'));
        } else {
            console.log(JSON.stringify(contributors, null, 2));
        }
    }).catch(function(error) {
        console.log('ERROR: ' + error);
    });
} else {
    var script = path.basename(process.argv[1]);
    console.log('usage: \n' + script + '-u <user> -r <repo> ' +
                '[--auth githubUsername:githubPassword] [-m]\n' +
                script + ' -f <json filename> -m');
}

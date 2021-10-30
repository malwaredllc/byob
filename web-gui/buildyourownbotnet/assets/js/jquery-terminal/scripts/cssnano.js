var fs = require('fs');
var nano = require('cssnano');

var input = process.argv[2];
var output = process.argv[3];

var options = {
    preset: "default",
    map: {
        inline: false
    },
    discardUnused: false,
    from: input,
    to: output
};

function error(err) {
    if (err) {
        if (err.message && typeof err.showSourceCode === 'function') {
            console.error(err.message);
            console.error(err.showSourceCode());
        } else {
            console.error(err);
        }
        process.exit(1);
    }
}

fs.readFile(input, function(err, buffer) {
    nano.process(String(buffer), options).then(function(result) {
        fs.writeFile(output, result.css, function(err) {
            error(err);
            fs.writeFile(output + '.map', result.map.toString(), error);
        });
    }).catch(error);
});

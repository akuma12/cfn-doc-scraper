var path = require('path'),
    fs = require('fs'),
    childProcess = require('child_process'),
    aws = require('aws-sdk');

// Get the path to the phantomjs application
function getPhantomFileName() {
    var phantomPath = path.join(__dirname, 'node_modules', 'phantomjs', 'bin', 'phantomjs');
    if ( /* process.env.DEBUG && */ fs.existsSync(phantomPath)) {
        return phantomPath;
    }
    return path.join(__dirname, 'phantomjs');
}

// Call the casperJS script
function runCasper(scriptName, callback) {
    var casperPath = path.join(__dirname, 'node_modules', 'casperjs', 'bin', 'casperjs');
    var outputData = [];
    var error = null;
    var s3 = new aws.S3();
    var childArgs = [
        path.join(__dirname, scriptName)
    ];
    var childOptions = {
        'maxBuffer': 1024000,
        'PHANTOMJS_EXECUTABLE': getPhantomFileName()
    };

    process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];

    console.log(JSON.stringify(process.env));

    console.log('Calling casperJS: ', casperPath, childArgs, childOptions);

    var ps = childProcess.execFile(casperPath, childArgs, childOptions);

    ps.stdout.on('data', function(data) {
        console.log(data);
        outputData.push(data);
    });

    ps.stderr.on('data', function(data) {
        console.log('casper error  ---:> ' + data);
        error = new Error(data);
    });

    ps.on('exit', function(code) {
        console.log('Uploading to S3');
        var bucket = "cfn-doc-scraper";
        if (typeof process.env['S3_BUCKET'] != 'undefined') {
            bucket = process.env['S3_BUCKET'];
        }

        var params = {Bucket: bucket, Key: 'cfn.json', ACL: 'public-read', ContentType: 'application/json', ContentEncoding: 'UTF-8', Body: outputData.join()};
        s3.putObject(params, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     console.log(data);           // successful response
            console.log('child process exited with code ' + code);
            callback(error, "Complete!");
        });
    });
}

// Entry Point
exports.handler = function(event, context) {
    // Execute the casperJS call and exit
    runCasper('scraper.js', context.done);
};

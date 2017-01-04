var async = require('async');
var util = require('util');
var spawn = require('child_process').spawn;
var s3 = require('s3');
var AWS = require('aws-sdk');

var syncClient = s3.createClient({
  maxAsyncS3: 20,
});

var HUGO_BINARY = './hugo_0.18.1_linux_amd64';

var tmpDir = '/tmp';
var pubDir = tmpDir + '/public';


function rebuildSite(srcBucket, contentBucket, dstBucket, context) {
  async.waterfall([
    function downloadSite(next) {
      var downloader = syncClient.downloadDir({
        localDir: tmpDir,
        s3Params: {
          Bucket: srcBucket,
        },
      });
      downloader.on('error', (err) => {
        console.error('Unable to sync down: %s', err.stack);
        next(err);
      });
      downloader.on('end', () => {
        console.log('Finished downloading from %s', srcBucket);
        next(null);
      });
    },
    function downloadContent(next) {
      var downloader = syncClient.downloadDir({
        localDir: tmpDir,
        s3Params: {
          Bucket: contentBucket,
        },
      });
      downloader.on('error', (err) => {
        console.error('Unable to sync down: %s', err.stack);
        next(err);
      });
      downloader.on('end', () => {
        console.log('Finished downloading from %s', contentBucket);
        next(null);
      });
    },
    function runHugo(next) {
      console.log('Running Hugo');
      var child = spawn(HUGO_BINARY, ['-v', `--source=${tmpDir}`, `--destination=${pubDir}`], {});
      child.stdout.on('data', (data) => console.log('hugo-stdout: %s', data));
      child.stderr.on('data', (data) => console.log('hugo-stderr: %s', data));
      child.on('error', (err) => {
        console.error('Hugo failed with error: %s', err);
        next(err);
      });
      child.on('close', (code) => {
        console.log('Hugo exited with code: %s', code);
        next(null);
      });
    },
    function upload(next) {
      console.log('Uploading compiled site to %s', dstBucket);
      var uploader = syncClient.uploadDir({
        localDir: pubDir,
        deleteRemoved: true,
        s3Params: {
          ACL: 'public-read',
          Bucket: dstBucket,
        },
      });
      uploader.on('error', (err) => {
        console.error('Unable to sync up: ', err.stack);
        next(err);
      });
      uploader.on('end', () => {
        console.log('Finished uploading');
        next(null);
      });
    },
  ], (err) => {
    if (err) console.error('Failure because of: %s', err)
    else console.log('All methods in waterfall succeeded.');

    context.done();
  });
}

exports.handler = (event, context) => {
  console.log('Reading options from event:\n', util.inspect(event, { depth: 5 }));
  var srcBucket = 'bpho-src';
  var contentBucket = 'bpho-content';
  var dstBucket = 'bpho-live';

  rebuildSite(srcBucket, contentBucket, dstBucket, context);
};

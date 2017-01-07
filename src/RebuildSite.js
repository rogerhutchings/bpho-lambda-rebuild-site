import async from 'async';
import util from 'util';
import {spawn} from 'child_process';
import s3 from 's3';
import AWS from 'aws-sdk';
import uuidV4 from 'uuid/v4';

const syncClient = s3.createClient({
  maxAsyncS3: 20,
});

function _s3Downloader(sourceBucket, tmpDir, callback) {
  const downloader = syncClient.downloadDir({
    localDir: tmpDir,
    s3Params: {
      Bucket: sourceBucket,
    },
  });
  downloader.on('error', (err) => {
    console.error('Unable to download from %s: %s', sourceBucket, err.stack);
    callback(err);
  });
  downloader.on('end', () => {
    console.log('Finished downloading from %s', sourceBucket);
    callback(null);
  });
}

function rebuildSite(srcBucket, contentBucket, destBucket, tmpDir, pubDir, HUGO_BINARY, context) {
  async.waterfall([
    function mkTempDir(next) {
      const child = spawn('mkdir', ['-p', tmpDir], {});
      child.on('error', (err) => {
        console.log('Failed to create directory: %s', err);
        next(err);
      });
      child.on('close', (code) => {
        console.log('Created directory: %s, %s', tmpDir, code);
        next(null);
      });
    },
    function downloadResources(next) {
      async.parallel([
        function downloadSite(next) {
          _s3Downloader(srcBucket, tmpDir, next);
        },
        function downloadContent(next) {
          _s3Downloader(contentBucket, tmpDir, next);
        },
      ], (err) => {
        if (err) {
          console.error('Error downloading resources: %s', err);
          next(err);
        } else {
          console.log('Finished downloading resources');
          next(null);
        }
      });
    },
    function runHugo(next) {
      console.log('Running Hugo');
      const child = spawn(HUGO_BINARY, ['-v', `--source=${tmpDir}`, `--destination=${pubDir}`], {});
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
      console.log('Uploading compiled site to %s', destBucket);
      const uploader = syncClient.uploadDir({
        localDir: pubDir,
        deleteRemoved: true,
        s3Params: {
          ACL: 'public-read',
          Bucket: destBucket,
          CacheControl: 'max-age=0',
        },
      });
      uploader.on('error', (err) => {
        console.error('Error uploading compiled site: %s', err.stack);
        next(err);
      });
      uploader.on('end', () => {
        console.log('Finished uploading');
        next(null);
      });
    },
    function rmTempDir(next) {
      const child = spawn('rm', ['-rf', tmpDir], {});
      child.on('error', (err) => {
        console.log('Failed to delete directory: %s', err);
        next(err);
      });
      child.on('close', (code) => {
        console.log('Deleted directory: %s, %s', tmpDir, code);
        next(null);
      });
    },
  ], (err) => {
    if (err) {
      console.error('Failed to rebuild: %s', err);
    } else {
      console.log('Finished rebuilding site!');
    }
    context.done();
  });
}

exports.handler = (event, context) => {
  console.log('Reading options from event:\n', util.inspect(event, { depth: 5 }));
  const srcBucket = 'bpho-src';
  const contentBucket = 'bpho-content';
  const destBucket = 'bpho-live';
  const HUGO_BINARY = './lib/hugo_0.18.1_linux_amd64';
  const tmpDir = `/tmp/${uuidV4()}`;
  const pubDir = `${tmpDir}/public`;
  rebuildSite(srcBucket, contentBucket, destBucket, tmpDir, pubDir, HUGO_BINARY, context);
};

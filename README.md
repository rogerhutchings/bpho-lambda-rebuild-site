# bpho-lambda-rebuild-site

An AWS Lambda that fetches content and Hugo theme from their respective S3 buckets, and deploys to the live bucket.

Based on https://github.com/ryansb/hugo-lambda, and http://bezdelev.com/post/hugo-aws-lambda-static-website/

## Requirements

- AWS CLI
- A `bpho` profile in your `~/.aws` dir

## Deploying

- Run `npm start` to upload a zipped version of the lambda to S3, and update the `BPhORebuildSite` function

## Notes

This uses webpack to compile and build, including the copying of dependencies into the zip bundle. Note that WebpackCopyPlugin breaks exec permissions on binaries, so we have to fix that manually.

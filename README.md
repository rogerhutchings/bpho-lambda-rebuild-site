# bpho-lambda-rebuild-site

Builds and deploys a Hugo-generated site to an S3 bucket.

Based on https://github.com/ryansb/hugo-lambda, and http://bezdelev.com/post/hugo-aws-lambda-static-website/

## Requirements

- AWS CLI
- A `bpho` profile in your `~/.aws` dir

## Deploying

- Run `npm start` to upload a zipped version of the lambda to S3, and update the `BPhORebuildSite` function

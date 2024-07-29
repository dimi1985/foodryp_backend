// s3Config.js

const aws = require('aws-sdk');

const s3 = new aws.S3({
  endpoint: 'http://foodryp.com:9010/', // Use the proxy endpoint
  accessKeyId: '6KbxK6ZsTdsG1nCzXU9y',
  secretAccessKey: 'KJZ6ymcLzrofB75Ucc9WM5uxjvX4DfxqgFn3OwWp',
  s3ForcePathStyle: true, // needed with MinIO
  signatureVersion: 'v4',
  logger: console // Enable logging for debugging
});

module.exports = s3;
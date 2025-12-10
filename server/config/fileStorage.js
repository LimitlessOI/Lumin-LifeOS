```javascript
const multer = require('multer');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();
const storage = multer.memoryStorage();

const upload = multer({ storage });

const uploadFileToS3 = (file, bucketName) => {
    const params = {
        Bucket: bucketName,
        Key: file.originalname,
        Body: file.buffer
    };

    return s3.upload(params).promise();
};

module.exports = { upload, uploadFileToS3 };
```
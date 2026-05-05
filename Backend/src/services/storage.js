const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('node:crypto');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function uploadImage(buffer, mime, userId) {
  const ext = (mime.split('/')[1] || 'png').toLowerCase();
  const key = `u${userId}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mime,
    }),
  );
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

module.exports = { uploadImage };

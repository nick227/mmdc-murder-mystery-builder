import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { cloudflareR2Config } from './CloudflareR2Config.js';

function contentTypeFromKey(key) {
  const ext = String(key || '').toLowerCase().split('.').pop();
  if (ext === 'png') {
    return 'image/png';
  }
  if (ext === 'webp') {
    return 'image/webp';
  }
  if (ext === 'jpg' || ext === 'jpeg') {
    return 'image/jpeg';
  }
  return 'application/octet-stream';
}

export class CloudflareR2Service {
  constructor() {
    this.initialized = false;
    this.config = null;
    this.s3 = null;

    // NOTE: env is loaded later in the CLI process; initialize lazily.
  }

  initialize() {
    this.config = cloudflareR2Config.getConfig();
    this.s3 = new S3Client(cloudflareR2Config.getAwsConfig());
    this.initialized = true;
  }

  isInitialized() {
    if (!this.initialized && cloudflareR2Config.isConfigured()) {
      this.initialize();
    }
    return this.initialized && this.s3 != null;
  }

  async saveImage(imageBuffer, key, options = {}) {
    if (!this.isInitialized() && cloudflareR2Config.isConfigured()) {
      this.initialize();
    }
    if (!this.isInitialized()) {
      throw new Error('CloudflareR2Service is not initialized. Check R2_* env vars.');
    }
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      throw new Error('saveImage requires a non-empty Buffer');
    }
    if (!key || typeof key !== 'string') {
      throw new Error('saveImage requires a string key');
    }

    const contentType = options.contentType || contentTypeFromKey(key);

    await this.s3.send(new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
      CacheControl: options.cacheControl || 'public, max-age=31536000, immutable'
    }));

    return cloudflareR2Config.getPublicUrl(key);
  }
}

export const cloudflareR2Service = new CloudflareR2Service();


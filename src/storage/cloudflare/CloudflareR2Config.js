function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return String(value).trim();
}

function optionalEnv(name) {
  const value = process.env[name];
  return value == null ? '' : String(value).trim();
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').trim().replace(/\/+$/, '');
}

export const cloudflareR2Config = {
  isConfigured() {
    return Boolean(
      optionalEnv('CLOUDFLARE_R2_ENDPOINT') &&
      optionalEnv('CLOUDFLARE_R2_ACCESS_KEY_ID') &&
      optionalEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY') &&
      optionalEnv('CLOUDFLARE_R2_BUCKET') &&
      optionalEnv('CLOUDFLARE_R2_PUBLIC_BASE_URL')
    );
  },

  getConfig() {
    return {
      endpoint: requiredEnv('CLOUDFLARE_R2_ENDPOINT'),
      accessKeyId: requiredEnv('CLOUDFLARE_R2_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
      bucketName: requiredEnv('CLOUDFLARE_R2_BUCKET'),
      publicBaseUrl: normalizeBaseUrl(requiredEnv('CLOUDFLARE_R2_PUBLIC_BASE_URL'))
    };
  },

  getAwsConfig() {
    const config = this.getConfig();
    return {
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      forcePathStyle: true
    };
  },

  getPublicUrl(key) {
    const { publicBaseUrl } = this.getConfig();
    const normalizedKey = String(key || '').replace(/^\/+/, '');
    return `${publicBaseUrl}/${normalizedKey}`;
  }
};


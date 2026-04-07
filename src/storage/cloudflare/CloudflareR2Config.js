function optionalEnv(name) {
  const value = process.env[name];
  return value == null ? '' : String(value).trim();
}

function envOrAlias(primary, alias) {
  return optionalEnv(primary) || optionalEnv(alias);
}

function requiredEnvOrAlias(primary, alias) {
  const value = envOrAlias(primary, alias);
  if (!value) {
    throw new Error(`Missing required env var: ${primary}`);
  }
  return value;
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').trim().replace(/\/+$/, '');
}

export const cloudflareR2Config = {
  isConfigured() {
    return Boolean(
      envOrAlias('R2_S3_ENDPOINT', 'CLOUDFLARE_R2_ENDPOINT') &&
      envOrAlias('R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID') &&
      envOrAlias('R2_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY') &&
      envOrAlias('R2_BUCKET', 'CLOUDFLARE_R2_BUCKET') &&
      envOrAlias('R2_PUBLIC_BASE_URL', 'CLOUDFLARE_R2_PUBLIC_BASE_URL')
    );
  },

  getConfig() {
    return {
      endpoint: requiredEnvOrAlias('R2_S3_ENDPOINT', 'CLOUDFLARE_R2_ENDPOINT'),
      accessKeyId: requiredEnvOrAlias('R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnvOrAlias('R2_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
      bucketName: requiredEnvOrAlias('R2_BUCKET', 'CLOUDFLARE_R2_BUCKET'),
      publicBaseUrl: normalizeBaseUrl(requiredEnvOrAlias('R2_PUBLIC_BASE_URL', 'CLOUDFLARE_R2_PUBLIC_BASE_URL')),
      region: envOrAlias('R2_REGION', 'CLOUDFLARE_R2_REGION') || 'auto',
      forcePathStyle: (envOrAlias('R2_FORCE_PATH_STYLE', 'CLOUDFLARE_R2_FORCE_PATH_STYLE') || 'true').toLowerCase() !== 'false'
    };
  },

  getAwsConfig() {
    const config = this.getConfig();
    return {
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      forcePathStyle: config.forcePathStyle
    };
  },

  getPublicUrl(key) {
    const { publicBaseUrl } = this.getConfig();
    const normalizedKey = String(key || '').replace(/^\/+/, '');
    return `${publicBaseUrl}/${normalizedKey}`;
  }
};


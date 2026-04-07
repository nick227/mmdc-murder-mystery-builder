import axios from 'axios';
import FormData from 'form-data';

const FLUX_ENDPOINT = 'https://api.dezgo.com/text2image_flux';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return String(value).trim();
}

function createFluxFormData(prompt, options = {}) {
  const form = new FormData();
  form.append('prompt', String(prompt || '').trim());
  form.append('width', String(options.width ?? 1024));
  form.append('height', String(options.height ?? 1024));
  form.append('steps', String(options.steps ?? 4));
  form.append('seed', String(options.seed ?? ''));
  form.append('format', String(options.format ?? 'png'));
  form.append('transparent_background', String(options.transparent_background ?? false));
  form.append('lora1', String(options.lora1 ?? ''));
  form.append('lora1_strength', String(options.lora1_strength ?? 0.7));
  form.append('lora2', String(options.lora2 ?? ''));
  form.append('lora2_strength', String(options.lora2_strength ?? 0.7));
  return form;
}

export async function generateFluxPngBuffer(prompt, options = {}) {
  const apiKey = requiredEnv('DEZGO_API_KEY');
  const form = createFluxFormData(prompt, options);

  const response = await axios.post(FLUX_ENDPOINT, form, {
    headers: {
      'X-Dezgo-Key': apiKey,
      Accept: 'image/*',
      ...form.getHeaders()
    },
    responseType: 'arraybuffer',
    timeout: 120000,
    maxRedirects: 3
  });

  if (!response?.data) {
    throw new Error('Invalid Dezgo response: no data');
  }

  return Buffer.from(response.data);
}


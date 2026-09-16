import crypto from 'crypto';

function keyBuffer() {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY || '';
  if (/^[a-fA-F0-9]{64}$/.test(raw)) return Buffer.from(raw, 'hex');

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceKey) throw new Error('Chave de criptografia indisponível');
  return crypto.createHash('sha256').update(`utmeufy-integrations:${serviceKey}`).digest();
}

export function encryptJson(value: unknown) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptJson<T = Record<string, unknown>>(value?: string | null): T {
  if (!value) return {} as T;
  const [ivRaw, tagRaw, dataRaw] = value.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  const plain = Buffer.concat([decipher.update(Buffer.from(dataRaw, 'base64url')), decipher.final()]).toString('utf8');
  return JSON.parse(plain) as T;
}

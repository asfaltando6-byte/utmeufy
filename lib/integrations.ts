import { getAdminDb } from '@/lib/supabase';
import { decryptJson } from '@/lib/crypto';

export type IntegrationRow = {
  id: string;
  provider: string;
  name: string;
  status: string;
  webhook_key: string;
  config_public: Record<string, any>;
  secret_config?: string | null;
  updated_at?: string;
};

export async function getIntegration(provider: string) {
  const db = getAdminDb();
  const { data, error } = await db.from('integrations').select('*').eq('provider', provider).maybeSingle();
  if (error) throw error;
  return data as IntegrationRow | null;
}

export async function getIntegrationByKey(provider: string, key: string) {
  const db = getAdminDb();
  const { data, error } = await db.from('integrations').select('*').eq('provider', provider).eq('webhook_key', key).maybeSingle();
  if (error) throw error;
  return data as IntegrationRow | null;
}

export function integrationSecrets<T = Record<string, string>>(row: IntegrationRow) {
  return decryptJson<T>(row.secret_config);
}

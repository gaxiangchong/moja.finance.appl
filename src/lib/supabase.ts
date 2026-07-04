import type { SupabaseClient } from '@supabase/supabase-js';
import { SB_TABLES } from './constants';

export function sanitiseSbUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return raw.trim();
  }
}

export async function probeSupabaseTables(
  client: SupabaseClient,
): Promise<Record<string, { ok: boolean; error?: string; code?: string; count: number }>> {
  const results: Record<string, { ok: boolean; error?: string; code?: string; count: number }> = {};
  for (const table of SB_TABLES) {
    const { count, error } = await client.from(table).select('id', { count: 'exact', head: true });
    if (error) {
      results[table] = { ok: false, error: error.message, code: error.code, count: 0 };
    } else {
      results[table] = { ok: true, count: count ?? 0 };
    }
  }
  return results;
}

export function syncStatusLabel(
  status: string,
  detail?: string,
): { icon: string; label: string; color: string } {
  const map: Record<string, [string, string, string]> = {
    syncing: ['🔄', 'Syncing...', 'var(--muted)'],
    synced: ['✅', 'Synced with Supabase', 'var(--credit)'],
    error: ['❌', 'Sync error', 'var(--debit)'],
    offline: ['💾', 'Local only', 'var(--muted)'],
  };
  const [icon, label, color] = map[status] || map.offline;
  return { icon, label: detail || label, color };
}

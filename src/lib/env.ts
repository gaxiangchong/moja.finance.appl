/** Vite exposes only variables prefixed with VITE_ to the client bundle. */

export function envSupabaseUrl(): string {
  return (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
}

export function envSupabaseAnonKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
}

export function envLlmApiKey(): string {
  return (import.meta.env.VITE_LLM_API_KEY as string | undefined)?.trim() || '';
}

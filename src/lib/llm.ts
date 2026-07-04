import { PROVIDER_DEFAULTS } from './config';
import { envLlmApiKey } from './env';
import type {
  ExtractedTransaction,
  ExtractFromFileParams,
  ExtractFromFileResult,
  LLMConfig,
  LLMProvider,
  LLMSettings,
  LLMTestResult,
} from './types';
import { loadLLMSettings, saveLLMSettings as persistLLMSettings } from './storage';

export const EXTRACT_PROMPT = (today: string) => `You are a financial data extractor. Analyze this payment screenshot, bank statement, or PDF and extract ALL transactions.

Return ONLY a JSON array with this exact structure (no markdown, no explanation):
[
  {
    "date": "YYYY-MM-DD",
    "description": "merchant or description",
    "amount": 123.45,
    "type": "debit or credit",
    "account": "account name if visible",
    "category": "one of: Salary/Payroll, Sales Revenue, Rent/Lease, Utilities, Ingredient - Hot Kitchen, Ingredient - Cake Kitchen, Drinks & Beverages Ingredient, General Supplies, Equipment, Construction, Facility, Supplies, Marketing, Travel, Software/SaaS, Professional Services, Insurance, Taxes, Meals/Entertainment, Bank Fees, Startup Cost, Misc, Other",
    "notes": "reference numbers or extra info"
  }
]

Rules:
- Amounts are positive numbers; use type field for direction
- Debits/payments/expenses = "debit"; Credits/income/deposits = "credit"
- If date unclear, use today: ${today}
- Use "Startup Cost" for: renovation, fitting out, interior works, signage, furniture, tables, chairs, shelving, initial setup or one-time pre-opening costs`;

export function getLLMConfig(settings?: Partial<LLMSettings>): LLMConfig {
  const stored = loadLLMSettings();
  const merged = { ...stored, ...settings };
  const provider = (merged.provider || 'claude') as LLMProvider;
  const defaults = PROVIDER_DEFAULTS[provider];
  const model = (merged.model || '').trim() || defaults.model;
  const base = ((merged.base || '').trim() || defaults.base).replace(/\/$/, '');
  const key = (merged.key || '').trim() || envLlmApiKey();
  return { provider, model, base, key };
}

export function applyProviderDefaults(
  provider: LLMProvider,
  current?: Partial<LLMSettings>,
): LLMSettings {
  const d = PROVIDER_DEFAULTS[provider];
  return {
    provider,
    base: d.base,
    model: d.model,
    key: current?.key ?? envLlmApiKey(),
  };
}

export function saveLLMSettings(settings: LLMSettings): void {
  persistLLMSettings(settings);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function testLLMConnection(cfg?: LLMConfig): Promise<LLMTestResult> {
  const config = cfg ?? getLLMConfig();
  try {
    if (config.provider === 'claude') {
      if (!config.key) throw new Error('API key required for Claude');
      const res = await fetch(`${config.base}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': config.key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config.model || 'claude-opus-4-5',
          max_tokens: 8,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
    } else {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (config.key) headers['Authorization'] = `Bearer ${config.key}`;
      const res = await fetch(`${config.base}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          max_tokens: 8,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(typeof data.error === 'string' ? data.error : data.error.message);
      }
      if (!data.choices) throw new Error('Unexpected response format');
    }
    return { ok: true, message: 'Connected' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message };
  }
}

export async function extractFromFile(
  params: ExtractFromFileParams,
): Promise<ExtractFromFileResult> {
  const { file, cfg, defaultCat = 'Other' } = params;
  const b64 = await fileToBase64(file);
  const today = new Date().toISOString().slice(0, 10);
  const prompt = EXTRACT_PROMPT(today);
  const isPDF = file.type === 'application/pdf';

  let responseText: string;

  if (cfg.provider === 'claude') {
    const contentBlock = isPDF
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
      : { type: 'image', source: { type: 'base64', media_type: file.type, data: b64 } };

    const res = await fetch(`${cfg.base}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': cfg.key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: cfg.model || 'claude-opus-4-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: prompt }] }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    responseText = data.content[0].text.trim();
  } else {
    if (isPDF) {
      throw new Error('PDF extraction requires Claude. For local LLMs, upload a screenshot instead.');
    }

    const imageUrl = `data:${file.type};base64,${b64}`;
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (cfg.key) headers['Authorization'] = `Bearer ${cfg.key}`;

    const res = await fetch(`${cfg.base}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(typeof data.error === 'string' ? data.error : data.error.message);
    }
    responseText = data.choices[0].message.content.trim();
  }

  const match = responseText.match(/\[[\s\S]*\]/);
  const parsed = JSON.parse(match ? match[0] : responseText) as ExtractedTransaction[];

  if (defaultCat) {
    parsed.forEach(item => { item.category = defaultCat; });
  }

  return { items: parsed, filename: file.name };
}

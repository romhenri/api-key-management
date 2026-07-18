// Quota reference + local usage tracking.
//
// IMPORTANT: The Gemini API does NOT expose "remaining quota" to an API key —
// real consumption lives in Google Cloud (Service Usage / Monitoring) behind
// OAuth. So everything here is an *estimate*: known tier limits from the docs,
// plus a count of what THIS app sent through the key today. Usage made outside
// this tool is invisible to us.

export type Tier = 'unknown' | 'free' | 'paid';

export const TIER_LABELS: Record<Tier, string> = {
  unknown: 'Unknown',
  free: 'Free',
  paid: 'Paid'
};

export interface ModelLimit {
  family: string;
  rpm: number | null; // requests per minute
  tpm: number | null; // tokens per minute
  rpd: number | null; // requests per day (null = unlimited)
}

// Reference values per tier (Google AI Studio docs). Shared with the
// "Quota Reference" tab so numbers never diverge.
export const QUOTA_TABLE: Record<Exclude<Tier, 'unknown'>, ModelLimit[]> = {
  free: [
    { family: 'Gemini 1.5 Flash', rpm: 15, tpm: 1_000_000, rpd: 1500 },
    { family: 'Gemini 1.5 Pro', rpm: 2, tpm: 32_000, rpd: 50 },
    { family: 'Gemini 1.0 Pro', rpm: 15, tpm: 32_000, rpd: 1500 }
  ],
  paid: [
    { family: 'Gemini 1.5 Flash', rpm: 360, tpm: 4_000_000, rpd: null },
    { family: 'Gemini 1.5 Pro', rpm: 360, tpm: 4_000_000, rpd: null },
    { family: 'Gemini 1.0 Pro', rpm: 360, tpm: 120_000, rpd: null }
  ]
};

// Per-key, per-day usage counted locally by this app.
export interface UsageStat {
  date: string; // YYYY-MM-DD — used to reset counters each day
  requests: number;
  totalTokens: number;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Increment (or reset, if the day rolled over) a key's usage.
export function bumpUsage(prev: UsageStat | undefined, tokens: number): UsageStat {
  const today = todayStr();
  if (!prev || prev.date !== today) {
    return { date: today, requests: 1, totalTokens: tokens };
  }
  return {
    date: today,
    requests: prev.requests + 1,
    totalTokens: prev.totalTokens + tokens
  };
}

// Read usage as of today (zeros if the stored stat is stale/absent).
export function usageForToday(prev: UsageStat | undefined): UsageStat {
  if (!prev || prev.date !== todayStr()) {
    return { date: todayStr(), requests: 0, totalTokens: 0 };
  }
  return prev;
}

// Best-effort match of a model name to a reference row.
function matchRow(rows: ModelLimit[], model: string): ModelLimit {
  const m = model.toLowerCase();
  if (m.includes('flash')) return rows.find((r) => r.family.includes('Flash')) || rows[0];
  if (m.includes('1.0')) return rows.find((r) => r.family.includes('1.0')) || rows[0];
  if (m.includes('pro')) return rows.find((r) => r.family.includes('1.5 Pro')) || rows[0];
  return rows[0];
}

// Limits for a specific model under a tier. Null when tier is unknown.
export function limitForModel(tier: Tier, model: string): ModelLimit | null {
  if (tier === 'unknown') return null;
  return matchRow(QUOTA_TABLE[tier], model);
}

// A single representative limit for a key that may expose several models —
// prefers a Flash model (the common default), else the first available.
export function representativeLimit(tier: Tier, models: string[]): ModelLimit | null {
  if (tier === 'unknown' || models.length === 0) return null;
  const preferred = models.find((m) => m.toLowerCase().includes('flash')) || models[0];
  return limitForModel(tier, preferred);
}

// Compact number formatting: 1_000_000 -> "1M", 32_000 -> "32k".
export function fmtNum(n: number | null): string {
  if (n === null) return 'Unlimited';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`;
  return String(n);
}

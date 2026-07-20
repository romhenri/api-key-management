import { ValidationResult, validateGeminiKey } from './gemini';

export type Provider = 'gemini' | 'openai' | 'claude' | 'openrouter';

export const PROVIDERS: Provider[] = ['gemini', 'openai', 'claude', 'openrouter'];

export const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  claude: 'Claude',
  openrouter: 'OpenRouter'
};

async function validateOpenAIKey(key: string): Promise<ValidationResult> {
  const cleanKey = key.trim();
  if (!cleanKey) {
    return { status: 'invalid', models: [], errorDetails: 'The key is empty.' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${cleanKey}` }
    });

    // A rate limit means the KEY IS VALID — it just exhausted its quota.
    if (response.status === 429) {
      return {
        status: 'valid',
        models: [],
        errorDetails: 'Valid key, but currently out of quota (request limit reached).',
        rateLimited: true
      };
    }

    const data = await response.json();

    if (!response.ok) {
      const message = data?.error?.message || `HTTP ${response.status}`;
      return { status: 'invalid', models: [], errorDetails: `[${response.status}] ${message}` };
    }

    const models = (data.data || []).map((m: any) => m.id as string).sort();
    return { status: 'valid', models };
  } catch (error: any) {
    return { status: 'invalid', models: [], errorDetails: `Network request failed: ${error.message || error}` };
  }
}

async function validateClaudeKey(key: string): Promise<ValidationResult> {
  const cleanKey = key.trim();
  if (!cleanKey) {
    return { status: 'invalid', models: [], errorDetails: 'The key is empty.' };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': cleanKey,
        'anthropic-version': '2023-06-01',
        // Required for the Anthropic API to accept direct browser calls (CORS).
        'anthropic-dangerous-direct-browser-access': 'true'
      }
    });

    if (response.status === 429) {
      return {
        status: 'valid',
        models: [],
        errorDetails: 'Valid key, but currently out of quota (request limit reached).',
        rateLimited: true
      };
    }

    const data = await response.json();

    if (!response.ok) {
      const message = data?.error?.message || `HTTP ${response.status}`;
      return { status: 'invalid', models: [], errorDetails: `[${response.status}] ${message}` };
    }

    const models = (data.data || []).map((m: any) => m.id as string).sort();
    return { status: 'valid', models };
  } catch (error: any) {
    return { status: 'invalid', models: [], errorDetails: `Network request failed: ${error.message || error}` };
  }
}

async function validateOpenRouterKey(key: string): Promise<ValidationResult> {
  const cleanKey = key.trim();
  if (!cleanKey) {
    return { status: 'invalid', models: [], errorDetails: 'The key is empty.' };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { Authorization: `Bearer ${cleanKey}` }
    });

    if (response.status === 429) {
      return {
        status: 'valid',
        models: [],
        errorDetails: 'Valid key, but currently out of quota (request limit reached).',
        rateLimited: true
      };
    }

    const data = await response.json();

    if (!response.ok) {
      const message = data?.error?.message || `HTTP ${response.status}`;
      return { status: 'invalid', models: [], errorDetails: `[${response.status}] ${message}` };
    }

    const info = data?.data;
    const outOfQuota = typeof info?.limit === 'number' && info?.limit_remaining === 0;

    return {
      status: 'valid',
      models: [],
      errorDetails: outOfQuota ? 'Valid key, but currently out of quota (limit reached).' : undefined,
      rateLimited: outOfQuota
    };
  } catch (error: any) {
    return { status: 'invalid', models: [], errorDetails: `Network request failed: ${error.message || error}` };
  }
}

/**
 * Validates an API key against the given provider. Gemini reuses the
 * existing model-listing check; the others use each provider's cheapest
 * "who am I" endpoint so no tokens are spent just to check validity.
 */
export async function validateProviderKey(provider: Provider, key: string): Promise<ValidationResult> {
  switch (provider) {
    case 'gemini':
      return validateGeminiKey(key);
    case 'openai':
      return validateOpenAIKey(key);
    case 'claude':
      return validateClaudeKey(key);
    case 'openrouter':
      return validateOpenRouterKey(key);
  }
}

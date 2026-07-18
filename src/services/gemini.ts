import { Tier, UsageStat } from './quota';

export interface ApiKeyData {
  id: string;
  key: string;
  label: string;
  status: 'untested' | 'valid' | 'invalid';
  lastChecked?: string;
  models: string[];
  errorDetails?: string;
  notes?: string;
  // Billing tier for quota estimates. Defaults to 'unknown' and can be set
  // by the user or inferred when the key hits a rate limit (429).
  tier?: Tier;
  // Local, per-day usage counted by this app (not the real Google quota).
  usage?: UsageStat;
  // Free-form classification tags (e.g. "Rate Limited", "Main").
  tags?: string[];
  // Classification only — keys are NEVER deleted. Archiving hides a key
  // from the active list while preserving it in storage.
  archived?: boolean;
}

export interface ValidationResult {
  status: 'valid' | 'invalid';
  models: string[];
  errorDetails?: string;
  rateLimited?: boolean;
}

export interface GenerationTestResult {
  success: boolean;
  text: string;
  latencyMs: number;
  promptTokens?: number;
  candidatesTokens?: number;
  totalTokens?: number;
  error?: string;
  rateLimited?: boolean;
}

/**
 * Validates a Gemini API key by listing accessible models.
 */
export async function validateGeminiKey(key: string): Promise<ValidationResult> {
  const cleanKey = key.trim();
  
  if (!cleanKey) {
    return {
      status: 'invalid',
      models: [],
      errorDetails: 'The key is empty.'
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      const code = data?.error?.code || response.status;
      const status = data?.error?.status || 'UNKNOWN';
      const message = data?.error?.message || 'Unknown error.';

      let formattedError = `[Status ${code} - ${status}] ${message}`;

      if (code === 400 && message.includes('API key not valid')) {
        formattedError = 'Invalid key. This key does not exist or is incorrect.';
      } else if (code === 403) {
        formattedError = 'Access forbidden. The Gemini API (Generative Language API) may not be enabled in the GCP project, or the key has IP/API restrictions.';
      } else if (code === 429) {
        // A rate limit means the KEY IS VALID — it just exhausted its quota.
        return {
          status: 'valid',
          models: [],
          errorDetails: 'Valid key, but currently out of quota (request limit reached).',
          rateLimited: true
        };
      }

      return {
        status: 'invalid',
        models: [],
        errorDetails: formattedError
      };
    }

    // Extract models
    const modelsList: any[] = data.models || [];
    // Map to simple names, prioritizing standard models and sorting them
    const models = modelsList
      .map((m: any) => m.name.replace('models/', ''))
      .filter((name: string) => {
        // filter out embedding models or older models unless relevant,
        // but it's best to show them, let's keep text generation models first.
        return !name.includes('bison') && !name.includes('gecko');
      })
      .sort((a, b) => {
        // Sort gemini models to the top
        const aGem = a.startsWith('gemini');
        const bGem = b.startsWith('gemini');
        if (aGem && !bGem) return -1;
        if (!aGem && bGem) return 1;
        return a.localeCompare(b);
      });

    return {
      status: 'valid',
      models
    };
  } catch (error: any) {
    return {
      status: 'invalid',
      models: [],
      errorDetails: `Network request failed: ${error.message || error}`
    };
  }
}

/**
 * Runs a content generation test to check key responsiveness and token counts.
 */
export async function testGeminiGeneration(
  key: string,
  modelName: string,
  prompt: string,
  temperature = 0.7
): Promise<GenerationTestResult> {
  const cleanKey = key.trim();
  const startTime = performance.now();

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: 250
        }
      })
    });

    const data = await response.json();
    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    if (!response.ok) {
      const code = data?.error?.code || response.status;
      const status = data?.error?.status || 'UNKNOWN';
      const message = data?.error?.message || 'Content generation error.';
      return {
        success: false,
        text: '',
        latencyMs,
        error: `[Error ${code} - ${status}] ${message}`,
        rateLimited: code === 429
      };
    }

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || 'No response returned.';
    const usage = data.usageMetadata;

    return {
      success: true,
      text,
      latencyMs,
      promptTokens: usage?.promptTokenCount,
      candidatesTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount
    };
  } catch (error: any) {
    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);
    return {
      success: false,
      text: '',
      latencyMs,
      error: `Network error: ${error.message || error}`
    };
  }
}

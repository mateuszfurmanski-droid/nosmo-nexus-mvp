/**
 * OpenAI configuration, sourced exclusively from environment variables.
 *
 * No Replit AI credits / integrations are used here — the integration reads
 * `OPENAI_API_KEY` directly. When the key is absent the app falls back to the
 * built-in mock provider, so the platform works out of the box without a key.
 */
export interface AIConfig {
  apiKey: string | undefined;
  model: string;
  enabled: boolean;
}

export function getAIConfig(): AIConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim() || undefined;
  return {
    apiKey,
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    enabled: Boolean(apiKey),
  };
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

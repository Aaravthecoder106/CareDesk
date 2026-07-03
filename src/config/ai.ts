export type AIProvider = "claude" | "gemini";

export const AI_CONFIG = {
  provider: (process.env.AI_PROVIDER as AIProvider) || "claude",
  timeout: 30000,
  circuitBreaker: { threshold: 5, resetTimeoutMs: 60000 },
  retry: { maxAttempts: 2, baseDelayMs: 2000, maxDelayMs: 5000 },
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: "claude-sonnet-4-20250514",
  },
  gemini: {
    apiKey: process.env.GOOGLE_AI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  },
} as const;

export function getActiveProvider(): AIProvider {
  const provider = AI_CONFIG.provider;
  if (provider !== "claude" && provider !== "gemini") {
    console.warn(`[AI] Unknown AI_PROVIDER "${provider}", falling back to claude`);
    return "claude";
  }
  return provider;
}

export function logAIConfig() {
  const provider = getActiveProvider();
  const key = provider === "gemini" ? AI_CONFIG.gemini.apiKey : AI_CONFIG.claude.apiKey;
  const masked = key ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}` : "(empty)";
  console.log(`[AI] Provider: ${provider} | Model: ${provider === "gemini" ? AI_CONFIG.gemini.model : AI_CONFIG.claude.model} | Key: ${masked}`);
}

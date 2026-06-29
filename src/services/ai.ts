import { AIAnalysisResult } from "../types";
import { withRetry, CircuitBreaker, withTimeout } from "../utils/retry";
import { sanitizeForPrompt } from "../utils/sanitize";
import { AI_CONFIG, getActiveProvider, type AIProvider } from "../config/ai";

// ─── Prompts ────────────────────────────────────────────

const ANALYSIS_PROMPT = `You are a medical report analysis assistant. Analyze the following medical report and extract key information.

Return a JSON response with this exact structure:
{
  "summary": "A plain-English summary of the report that a patient can understand. Explain medical terms in simple language.",
  "metrics": [
    {
      "metricName": "e.g., HbA1c, Systolic BP, Total Cholesterol",
      "value": 6.5,
      "unit": "%",
      "normalRangeLow": 4.0,
      "normalRangeHigh": 5.6,
      "isAbnormal": true
    }
  ],
  "anomalies": ["List any abnormal findings or areas of concern"]
}

Rules:
1. Extract ALL numeric metrics from the report
2. Use standard medical units
3. Flag values outside normal ranges as abnormal
4. Include standard normal ranges for common tests
5. Write the summary in simple, non-medical language
6. If you cannot determine a normal range, use null
7. Return ONLY valid JSON, no additional text`;

const QUESTION_PROMPT = `You are a medical visit preparation assistant. Based on the following information, generate 5-7 smart questions the patient should ask their doctor.

Return ONLY a JSON array of question strings.`;

const SUMMARY_PROMPT = `Summarize the following doctor visit notes in clear, patient-friendly language. Highlight key findings, diagnoses, and next steps.`;

// ─── Shared utilities ───────────────────────────────────

const aiCircuitBreaker = new CircuitBreaker(
  AI_CONFIG.circuitBreaker.threshold,
  AI_CONFIG.circuitBreaker.resetTimeoutMs
);

function parseJSONStrict<T>(text: string, expectedKeys?: string[]): T {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    throw new Error("AI response is not valid JSON");
  }

  let result: T;
  try {
    result = JSON.parse(trimmed);
  } catch (e) {
    throw new Error(`Failed to parse AI response as JSON: ${(e as Error).message}`);
  }

  if (expectedKeys && Array.isArray(result)) {
    return result as T;
  }

  if (expectedKeys && typeof result === "object" && result !== null) {
    for (const key of expectedKeys) {
      if (!(key in result)) {
        throw new Error(`AI response missing required key: ${key}`);
      }
    }
  }

  return result;
}

// ─── Claude Provider ────────────────────────────────────

let anthropicInstance: any = null;

async function getAnthropic() {
  if (!anthropicInstance) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    anthropicInstance = new Anthropic({
      apiKey: AI_CONFIG.claude.apiKey,
    });
  }
  return anthropicInstance;
}

async function callClaude(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number
): Promise<string> {
  if (aiCircuitBreaker.isOpen()) {
    throw new Error("AI circuit breaker is open; too many recent failures");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

  try {
    const anthropic = await getAnthropic();
    type AnthropicMessage = { content: Array<{ type: string; text?: string }> };
    const message = await withRetry<AnthropicMessage>(
      () =>
        withTimeout<AnthropicMessage>(
          () =>
            anthropic.messages.create(
              {
                model: AI_CONFIG.claude.model,
                max_tokens: maxTokens,
                messages,
              },
              { signal: controller.signal }
            ) as Promise<AnthropicMessage>,
          AI_CONFIG.timeout
        ),
      AI_CONFIG.retry
    );
    aiCircuitBreaker.recordSuccess();
    return message.content[0].type === "text" ? message.content[0].text || "" : "";
  } catch (error) {
    aiCircuitBreaker.recordFailure();
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Gemini Provider ────────────────────────────────────

let geminiInstance: any = null;

async function getGemini() {
  if (!geminiInstance) {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    geminiInstance = new GoogleGenerativeAI(AI_CONFIG.gemini.apiKey);
  }
  return geminiInstance;
}

async function callGemini(
  systemPrompt: string,
  userContent: string,
  maxTokens: number
): Promise<string> {
  if (aiCircuitBreaker.isOpen()) {
    throw new Error("AI circuit breaker is open; too many recent failures");
  }

  try {
    const genAI = await getGemini();
    const model = genAI.getGenerativeModel({
      model: AI_CONFIG.gemini.model,
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.3,
      },
    });

    const result = await withRetry<{ response: { text: () => string } }>(
      () =>
        withTimeout(
          () => model.generateContent(userContent),
          AI_CONFIG.timeout
        ),
      AI_CONFIG.retry
    );

    aiCircuitBreaker.recordSuccess();
    return result.response.text();
  } catch (error) {
    aiCircuitBreaker.recordFailure();
    throw error;
  }
}

// ─── Unified provider call ──────────────────────────────

export async function callAI(
  systemPrompt: string,
  userContent: string,
  maxTokens: number
): Promise<string> {
  const provider = getActiveProvider();
  if (provider === "gemini") {
    return callGemini(systemPrompt, userContent, maxTokens);
  }
  return callClaude([{ role: "user", content: userContent }], maxTokens);
}

// ─── Exported functions ─────────────────────────────────

export async function analyzeReport(
  reportText: string,
  reportType?: string
): Promise<AIAnalysisResult> {
  try {
    if (process.env.USE_MOCK_AI === "true") {
      const { mockAnalysisResult } = await import("../test/mockAi");
      return mockAnalysisResult;
    }

    const safeReportType = sanitizeForPrompt(reportType || "Unknown").substring(0, 100);
    const userContent = `Report Type: ${safeReportType}\n\nReport Content:\n${sanitizeForPrompt(reportText)}`;
    const responseText = await callAI(ANALYSIS_PROMPT, userContent, 2048);
    return parseJSONStrict<AIAnalysisResult>(responseText, ["summary", "metrics", "anomalies"]);
  } catch (error) {
    console.error("AI analysis error:", error);
    throw new Error(`Failed to analyze report with AI: ${(error as Error).message}`);
  }
}

export async function generateVisitQuestions(
  symptoms: string[],
  recentMetrics: string[],
  conditions: string[]
): Promise<string[]> {
  try {
    if (process.env.USE_MOCK_AI === "true") {
      const { mockQuestions } = await import("../test/mockAi");
      return mockQuestions;
    }

    const userContent = `Symptoms: ${sanitizeForPrompt(symptoms.join(", "))}\nRecent Lab Results: ${sanitizeForPrompt(recentMetrics.join(", "))}\nKnown Conditions: ${sanitizeForPrompt(conditions.join(", "))}`;
    const responseText = await callAI(QUESTION_PROMPT, userContent, 1024);
    return parseJSONStrict<string[]>(responseText);
  } catch (error) {
    console.error("AI question generation error:", error);
    throw new Error(`Failed to generate questions: ${(error as Error).message}`);
  }
}

export async function summarizeVisit(doctorNotes: string): Promise<string> {
  try {
    if (process.env.USE_MOCK_AI === "true") {
      const { mockSummary } = await import("../test/mockAi");
      return mockSummary;
    }

    return await callAI(SUMMARY_PROMPT, sanitizeForPrompt(doctorNotes), 1024);
  } catch (error) {
    console.error("AI visit summary error:", error);
    throw new Error(`Failed to summarize visit: ${(error as Error).message}`);
  }
}

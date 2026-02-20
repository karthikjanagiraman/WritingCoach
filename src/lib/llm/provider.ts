/**
 * LLM Provider Abstraction
 *
 * Thin layer that routes all LLM calls through either Anthropic Claude or
 * Google Gemini, controlled by environment variables:
 *
 *   LLM_PROVIDER      — "anthropic" (default) | "google"
 *   LLM_MODEL         — model ID (defaults per provider)
 *   ANTHROPIC_API_KEY  — required when provider is anthropic
 *   GOOGLE_AI_API_KEY  — required when provider is google
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------
export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMRequestOptions {
  systemPrompt: string;
  messages: LLMMessage[];
  maxTokens?: number;
  /** Override the env-configured model (e.g. for eval judge) */
  model?: string;
}

export interface LLMResult {
  text: string;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DEFAULT_MAX_TOKENS: Record<string, number> = {
  anthropic: 1024,
  google: 2048,
};

const PROVIDER_DEFAULTS: Record<string, string> = {
  anthropic: "claude-sonnet-4-5-20250929",
  google: "gemini-2.5-flash",
};

export function getLLMConfig(): { provider: string; model: string } {
  const provider = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
  const model = process.env.LLM_MODEL || PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.anthropic;
  return { provider, model };
}

// ---------------------------------------------------------------------------
// Lazy singletons — unused provider is never instantiated
// ---------------------------------------------------------------------------
let anthropicClient: Anthropic | null = null;
let googleClient: GoogleGenAI | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    // Dynamic require so the module isn't loaded when using Google
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: AnthropicSDK } = require("@anthropic-ai/sdk");
    anthropicClient = new AnthropicSDK({
      apiKey: process.env.ANTHROPIC_API_KEY,
    }) as Anthropic;
  }
  return anthropicClient;
}

function getGoogleClient(): GoogleGenAI {
  if (!googleClient) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleGenAI: GoogleGenAISDK } = require("@google/genai");
    googleClient = new GoogleGenAISDK({
      apiKey: process.env.GOOGLE_AI_API_KEY,
    }) as GoogleGenAI;
  }
  return googleClient;
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------
async function sendAnthropic(options: LLMRequestOptions): Promise<LLMResult> {
  const client = getAnthropicClient();
  const { model } = getLLMConfig();
  const resolvedModel = options.model || model;
  const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS.anthropic;

  const start = Date.now();
  const response = await client.messages.create({
    model: resolvedModel,
    max_tokens: maxTokens,
    system: options.systemPrompt,
    messages: options.messages,
  });
  const latencyMs = Date.now() - start;

  const textBlock = response.content.find(
    (block: { type: string }) => block.type === "text"
  );
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Anthropic response");
  }
  return {
    text: (textBlock as { type: "text"; text: string }).text,
    provider: "anthropic",
    model: resolvedModel,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
    latencyMs,
  };
}

async function sendGoogle(options: LLMRequestOptions): Promise<LLMResult> {
  const client = getGoogleClient();
  const { model } = getLLMConfig();
  const resolvedModel = options.model || model;
  const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS.google;

  // Google GenAI expects "model" role instead of "assistant"
  const contents = options.messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  const start = Date.now();
  const response = await client.models.generateContent({
    model: resolvedModel,
    contents,
    config: {
      systemInstruction: options.systemPrompt,
      maxOutputTokens: maxTokens,
    },
  });
  const latencyMs = Date.now() - start;

  const text = response.text;
  if (!text) {
    throw new Error("No text content in Google response");
  }

  // Extract usage from Google's response metadata
  const usage = response.usageMetadata;
  return {
    text,
    provider: "google",
    model: resolvedModel,
    inputTokens: usage?.promptTokenCount ?? null,
    outputTokens: usage?.candidatesTokenCount ?? null,
    latencyMs,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
export async function llmSend(options: LLMRequestOptions): Promise<LLMResult> {
  const { provider } = getLLMConfig();

  let result: LLMResult;
  if (provider === "google") {
    result = await sendGoogle(options);
  } else {
    result = await sendAnthropic(options);
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[LLM RAW RESPONSE]", result.text);
  }

  return result;
}

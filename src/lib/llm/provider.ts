/**
 * LLM Provider Abstraction
 *
 * Thin layer that routes all LLM calls through Anthropic Claude, Google Gemini,
 * DeepInfra, Groq, or Novita (OpenAI-compatible), controlled by environment variables:
 *
 *   LLM_PROVIDER      — "anthropic" (default) | "google" | "deepinfra" | "groq" | "novita"
 *   LLM_MODEL         — model ID (defaults per provider)
 *   ANTHROPIC_API_KEY  — required when provider is anthropic
 *   GOOGLE_AI_API_KEY  — required when provider is google
 *   DEEPINFRA_API_KEY  — required when provider is deepinfra
 *   GROQ_API_KEY       — required when provider is groq
 *   NOVITA_API_KEY     — required when provider is novita
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { GoogleGenAI } from "@google/genai";
import type OpenAI from "openai";

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
  deepinfra: 2048,
  groq: 2048,
  novita: 2048,
};

const PROVIDER_DEFAULTS: Record<string, string> = {
  anthropic: "claude-sonnet-4-5-20250929",
  google: "gemini-2.5-flash",
  deepinfra: "Qwen/Qwen3-235B-A22B-Instruct-2507",
  groq: "qwen/qwen3-32b",
  novita: "qwen/qwen3-235b-a22b-instruct-2507",
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
let deepinfraClient: OpenAI | null = null;
let groqClient: OpenAI | null = null;
let novitaClient: OpenAI | null = null;

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

function getDeepInfraClient(): OpenAI {
  if (!deepinfraClient) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: OpenAISDK } = require("openai");
    deepinfraClient = new OpenAISDK({
      apiKey: process.env.DEEPINFRA_API_KEY,
      baseURL: "https://api.deepinfra.com/v1/openai",
    }) as OpenAI;
  }
  return deepinfraClient;
}

function getGroqClient(): OpenAI {
  if (!groqClient) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: OpenAISDK } = require("openai");
    groqClient = new OpenAISDK({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    }) as OpenAI;
  }
  return groqClient;
}

function getNovitaClient(): OpenAI {
  if (!novitaClient) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: OpenAISDK } = require("openai");
    novitaClient = new OpenAISDK({
      apiKey: process.env.NOVITA_API_KEY,
      baseURL: "https://api.novita.ai/v3/openai",
    }) as OpenAI;
  }
  return novitaClient;
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------
async function sendAnthropic(options: LLMRequestOptions): Promise<LLMResult> {
  const client = getAnthropicClient();
  const { model } = getLLMConfig();
  const resolvedModel = options.model || model;
  const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS.anthropic;

  // Use prompt caching: mark the system prompt for caching so the ~8K token
  // system prompt is reused across turns within a session (5-min TTL, auto-extended).
  // Cached input tokens are billed at 90% discount ($0.30/MTok vs $3/MTok).
  const systemWithCache = [
    {
      type: "text" as const,
      text: options.systemPrompt,
      cache_control: { type: "ephemeral" as const },
    },
  ];

  const start = Date.now();
  const response = await client.messages.create({
    model: resolvedModel,
    max_tokens: maxTokens,
    system: systemWithCache,
    messages: options.messages,
  });
  const latencyMs = Date.now() - start;

  const textBlock = response.content.find(
    (block: { type: string }) => block.type === "text"
  );
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Anthropic response");
  }

  // Log cache performance in development
  const usage = response.usage as Record<string, unknown>;
  if (process.env.NODE_ENV === "development" && usage) {
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cacheWrite = usage.cache_creation_input_tokens ?? 0;
    if (cacheRead || cacheWrite) {
      console.log(`[ANTHROPIC CACHE] read=${cacheRead} tokens, write=${cacheWrite} tokens`);
    }
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

async function sendDeepInfra(options: LLMRequestOptions): Promise<LLMResult> {
  const client = getDeepInfraClient();
  const { model } = getLLMConfig();
  const resolvedModel = options.model || model;
  const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS.deepinfra;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: options.systemPrompt },
    ...options.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const start = Date.now();
  const response = await client.chat.completions.create({
    model: resolvedModel,
    messages,
    max_tokens: maxTokens,
  });
  const latencyMs = Date.now() - start;

  const text = response.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("No text content in DeepInfra response");
  }

  return {
    text,
    provider: "deepinfra",
    model: resolvedModel,
    inputTokens: response.usage?.prompt_tokens ?? null,
    outputTokens: response.usage?.completion_tokens ?? null,
    latencyMs,
  };
}

async function sendGroq(options: LLMRequestOptions): Promise<LLMResult> {
  const client = getGroqClient();
  const { model } = getLLMConfig();
  const resolvedModel = options.model || model;
  const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS.groq;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: options.systemPrompt },
    ...options.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const start = Date.now();
  const response = await client.chat.completions.create({
    model: resolvedModel,
    messages,
    max_tokens: maxTokens,
  });
  const latencyMs = Date.now() - start;

  const text = response.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("No text content in Groq response");
  }

  return {
    text,
    provider: "groq",
    model: resolvedModel,
    inputTokens: response.usage?.prompt_tokens ?? null,
    outputTokens: response.usage?.completion_tokens ?? null,
    latencyMs,
  };
}

async function sendNovita(options: LLMRequestOptions): Promise<LLMResult> {
  const client = getNovitaClient();
  const { model } = getLLMConfig();
  const resolvedModel = options.model || model;
  const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS.novita;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: options.systemPrompt },
    ...options.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const start = Date.now();
  const response = await client.chat.completions.create({
    model: resolvedModel,
    messages,
    max_tokens: maxTokens,
  });
  const latencyMs = Date.now() - start;

  const text = response.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("No text content in Novita response");
  }

  return {
    text,
    provider: "novita",
    model: resolvedModel,
    inputTokens: response.usage?.prompt_tokens ?? null,
    outputTokens: response.usage?.completion_tokens ?? null,
    latencyMs,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
export async function llmSend(options: LLMRequestOptions): Promise<LLMResult> {
  const { provider } = getLLMConfig();

  // If a model override is specified, route to the correct provider based on model name
  // (e.g. judge using claude-opus-4-6 while generation uses Google)
  let effectiveProvider = provider;
  if (options.model) {
    if (options.model.startsWith("claude-")) {
      effectiveProvider = "anthropic";
    } else if (options.model.startsWith("gemini-")) {
      effectiveProvider = "google";
    } else if (options.model.startsWith("Qwen/")) {
      effectiveProvider = "deepinfra";
    } else if (options.model.startsWith("qwen") || options.model.startsWith("llama") || options.model.startsWith("deepseek")) {
      // Groq model names: qwen-qwq-32b, llama-3.3-70b-versatile, deepseek-r1-distill-llama-70b, etc.
      // Also matches Novita model names (qwen/qwen3-235b-...) — use configured provider to disambiguate
      effectiveProvider = provider === "novita" ? "novita" : "groq";
    }
  }

  let result: LLMResult;
  if (effectiveProvider === "google") {
    result = await sendGoogle(options);
  } else if (effectiveProvider === "deepinfra") {
    result = await sendDeepInfra(options);
  } else if (effectiveProvider === "groq") {
    result = await sendGroq(options);
  } else if (effectiveProvider === "novita") {
    result = await sendNovita(options);
  } else {
    result = await sendAnthropic(options);
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[LLM RAW RESPONSE]", result.text);
  }

  return result;
}

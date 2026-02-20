import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import type { LLMResult } from "@/lib/llm/provider";

// ---------------------------------------------------------------------------
// logLessonEvent — fire-and-forget write to LessonEvent
// ---------------------------------------------------------------------------
export function logLessonEvent(params: {
  childId: string;
  sessionId: string;
  lessonId: string;
  eventType: string;
  phase?: string;
  eventData?: Record<string, unknown>;
}): void {
  prisma.lessonEvent
    .create({
      data: {
        childId: params.childId,
        sessionId: params.sessionId,
        lessonId: params.lessonId,
        eventType: params.eventType,
        phase: params.phase ?? null,
        eventData: params.eventData ? JSON.stringify(params.eventData) : null,
      },
    })
    .catch((err) => console.error("[EventLogger] lessonEvent:", err));
}

// ---------------------------------------------------------------------------
// logLLMInteraction — upsert SystemPromptLog then create LLMInteraction
// ---------------------------------------------------------------------------
export function logLLMInteraction(params: {
  sessionId?: string;
  childId?: string;
  lessonId?: string;
  requestType: string;
  systemPrompt: string;
  conversationTurnNumber?: number;
  userMessage?: string;
  rawResponse: string;
  strippedResponse?: string;
  markersDetected?: Record<string, unknown>;
  llmResult: LLMResult;
  error?: string;
}): void {
  const hash = createHash("sha256")
    .update(params.systemPrompt)
    .digest("hex");

  const byteLength = Buffer.byteLength(params.systemPrompt, "utf8");

  // Upsert the system prompt, then create the interaction record
  prisma.systemPromptLog
    .upsert({
      where: { promptHash: hash },
      create: {
        promptHash: hash,
        promptText: params.systemPrompt,
        byteLength,
      },
      update: {},
    })
    .then(() =>
      prisma.lLMInteraction.create({
        data: {
          sessionId: params.sessionId ?? null,
          childId: params.childId ?? null,
          lessonId: params.lessonId ?? null,
          requestType: params.requestType,
          systemPromptHash: hash,
          conversationTurnNumber: params.conversationTurnNumber ?? null,
          userMessage: params.userMessage ?? null,
          rawResponse: params.rawResponse,
          strippedResponse: params.strippedResponse ?? null,
          markersDetected: params.markersDetected
            ? JSON.stringify(params.markersDetected)
            : null,
          provider: params.llmResult.provider,
          model: params.llmResult.model,
          inputTokens: params.llmResult.inputTokens,
          outputTokens: params.llmResult.outputTokens,
          latencyMs: params.llmResult.latencyMs,
          error: params.error ?? null,
        },
      })
    )
    .catch((err) => console.error("[EventLogger] llmInteraction:", err));
}

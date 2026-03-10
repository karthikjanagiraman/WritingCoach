/**
 * WriteWhiz Skill Evaluation Runner
 *
 * Runs the test cases from evals.json against the Claude API using the
 * assembled prompt pipeline, then auto-grades each expectation using
 * a judge LLM call and prints a structured report.
 *
 * Marker validation & retry scoring:
 *   For instruction/guided phase evals, the runner checks whether the raw
 *   LLM response contains required structured markers. If not, it runs the
 *   marker retry prompt and re-checks. The report tracks:
 *     - markersPresent: did the raw response have markers?
 *     - retried: was a retry attempted?
 *     - retryFixed: did the retry add the missing markers?
 *   The summary includes aggregate marker stats and a retry success rate.
 *
 * Usage:
 *   npx tsx scripts/run-evals.ts              # run all evals
 *   npx tsx scripts/run-evals.ts --id tier2   # run evals matching "tier2"
 *   npx tsx scripts/run-evals.ts --concurrency 5  # parallel API calls
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { llmSend, getLLMConfig } from "../src/lib/llm/provider";
import {
  responseHasExpectedMarkers,
  MARKER_RETRY_SYSTEM_PROMPT,
} from "../src/lib/llm/client";
import type { LLMMessage } from "../src/lib/llm/provider";
import type { Phase } from "../src/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const JUDGE_MAX_TOKENS = 1024;
const CONTENT_DIR = path.join(__dirname, "../src/lib/llm/content");
const DEFAULT_CONCURRENCY = 1;
const DELAY_BETWEEN_EVALS_MS = 3000; // Delay between evals to respect rate limits

// ---------------------------------------------------------------------------
// Load skill files
// ---------------------------------------------------------------------------
function loadFile(rel: string): string {
  return fs.readFileSync(path.join(CONTENT_DIR, rel), "utf-8");
}

const skillContent = {
  core: loadFile("SKILL.md"),
  tierInserts: loadFile("prompts/tier_inserts.md"),
  phasePrompts: loadFile("prompts/phase_prompts.md"),
};

function extractSection(content: string, startMarker: string): string {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return "";
  const afterMarker = content.slice(startIndex + startMarker.length);
  const nextHeadingMatch = afterMarker.match(/\n## /);
  const endIndex = nextHeadingMatch
    ? startIndex + startMarker.length + (nextHeadingMatch.index ?? 0)
    : content.length;
  return content.slice(startIndex, endIndex).trim();
}

const TIER_INSERTS: Record<number, string> = {
  1: extractSection(skillContent.tierInserts, "## Tier 1 Insert (Ages 7-9)"),
  2: extractSection(skillContent.tierInserts, "## Tier 2 Insert (Ages 10-12)"),
  3: extractSection(skillContent.tierInserts, "## Tier 3 Insert (Ages 13-15)"),
};

const PHASE_PROMPTS: Record<string, string> = {
  instruction: extractSection(skillContent.phasePrompts, "## Instruction Phase"),
  guided: extractSection(skillContent.phasePrompts, "## Guided Practice Phase"),
  assessment: extractSection(skillContent.phasePrompts, "## Assessment Phase"),
  feedback: extractSection(skillContent.phasePrompts, "## Feedback Phase"),
};

// ---------------------------------------------------------------------------
// Load evals
// ---------------------------------------------------------------------------
interface EvalContext {
  student_name: string;
  student_age?: number;
  student_tier: number;
  lesson_id: string;
  current_phase: string;
  current_step?: number;
  prior_context?: string;
  action?: string;
  phase_state?: Record<string, unknown>;
  previous_answer_types_used?: string[];
}

interface EvalCase {
  id: string;
  name: string;
  description: string;
  prompt: string;
  context: EvalContext;
  expectations: string[];
}

interface EvalsFile {
  skill: string;
  evals: EvalCase[];
  grading_notes: Record<string, string>;
}

const evalsData: EvalsFile = JSON.parse(
  fs.readFileSync(path.join(CONTENT_DIR, "evals/evals.json"), "utf-8")
);

// ---------------------------------------------------------------------------
// Build system prompt for an eval case
// ---------------------------------------------------------------------------
function buildEvalPrompt(evalCase: EvalCase): string {
  const ctx = evalCase.context;
  const parts: string[] = [];

  // 1. Core skill instructions
  parts.push(skillContent.core);

  // 2. Tier adaptation
  parts.push(TIER_INSERTS[ctx.student_tier] ?? "");

  // 3. Phase behavior
  parts.push(PHASE_PROMPTS[ctx.current_phase] ?? "");

  // 4. Session context — match the real buildPrompt() format from prompt-builder.ts
  let sessionContext = `## Current Session Context\n\n`;

  // Student line (matches buildPrompt)
  const ageStr = ctx.student_age
    ? ` (age ${ctx.student_age}, Tier ${ctx.student_tier})`
    : ` (Tier ${ctx.student_tier})`;
  sessionContext += `Student: ${ctx.student_name}${ageStr}\n`;

  sessionContext += `Lesson: ${ctx.lesson_id}\n`;
  sessionContext += `Current Phase: ${ctx.current_phase.toUpperCase()}\n`;

  // Learning objectives (real buildPrompt always includes these)
  sessionContext += `\nLEARNING OBJECTIVES:\n1. Learn and apply the writing techniques for this lesson\n`;

  // Session boundary (real buildPrompt always includes this)
  sessionContext += `\nSESSION BOUNDARY: You are teaching ONLY this lesson. Your responses MUST stay within the learning objectives listed above. NEVER start a new lesson, introduce new topics, or teach content beyond this lesson's scope. If the current phase is complete, direct the student to proceed to the next phase or return to their dashboard to choose another lesson.`;

  // Phase State in structured bullet format (matching buildPrompt exactly)
  const step = ctx.current_step ?? ctx.phase_state?.phase1Step ?? 1;
  const hintsGiven = (ctx.phase_state?.hintsGiven as number) ?? 0;
  const instructionCompleted = (ctx.phase_state?.instructionCompleted as boolean) ?? false;
  const comprehensionPassed = (ctx.phase_state?.comprehensionPassed as boolean) ?? false;
  const guidedAttempts = (ctx.phase_state?.guidedAttempts as number) ?? 0;
  const assessmentSubmitted = (ctx.phase_state?.assessmentSubmitted as boolean) ?? false;

  sessionContext += `\n\nPhase State:\n`;
  sessionContext += `- Instruction completed: ${instructionCompleted}\n`;
  sessionContext += `- Comprehension check passed: ${comprehensionPassed}\n`;
  sessionContext += `- Phase 1 current step: ${step}\n`;
  sessionContext += `- Guided practice attempts: ${guidedAttempts}\n`;
  sessionContext += `- Hints given: ${hintsGiven}\n`;
  sessionContext += `- Assessment submitted: ${assessmentSubmitted}`;

  if (ctx.previous_answer_types_used) {
    sessionContext += `\n- Previous answer types used: ${ctx.previous_answer_types_used.join(", ")}`;
  }

  parts.push(sessionContext);

  return parts.filter(Boolean).join("\n\n---\n\n");
}

// ---------------------------------------------------------------------------
// Retry helper for rate limits
// ---------------------------------------------------------------------------
async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 5000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.includes("429") || msg.toLowerCase().includes("rate") || msg.includes("RESOURCE_EXHAUSTED");
      if (!isRateLimit || attempt === retries) throw err;
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`      Rate limited, retrying in ${(delay / 1000).toFixed(0)}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

// ---------------------------------------------------------------------------
// Marker validation result
// ---------------------------------------------------------------------------
interface MarkerResult {
  /** Phase requires markers (instruction/guided = true, assessment/feedback = false) */
  requiresMarkers: boolean;
  /** Did the raw LLM response contain at least one expected marker? */
  markersPresent: boolean;
  /** Was a retry attempted because markers were missing? */
  retried: boolean;
  /** If retried, did the retry response contain markers? */
  retryFixed: boolean;
  /** The response text used for judging (retried text if retry succeeded, else raw) */
  finalResponse: string;
  /** Raw response before any retry */
  rawResponse: string;
}

// ---------------------------------------------------------------------------
// Run a single eval (generation + marker validation + optional retry)
// ---------------------------------------------------------------------------
async function runEval(evalCase: EvalCase): Promise<MarkerResult> {
  const systemPrompt = buildEvalPrompt(evalCase);

  const messages: LLMMessage[] = [];

  // For step-specific evals (step > 1), inject synthetic prior turns
  // so the LLM sees that earlier steps actually happened (mimics real
  // multi-turn conversation history from buildPrompt)
  const ctx = evalCase.context;
  const currentStep = ctx.current_step ?? (ctx.phase_state?.phase1Step as number | undefined) ?? undefined;
  if (ctx.current_phase === "instruction" && currentStep && currentStep > 1) {
    for (let s = 1; s < currentStep; s++) {
      messages.push({
        role: "assistant",
        content: `[STEP: ${s}]\n(Coach taught step ${s} content for this lesson)`,
      });
      messages.push({
        role: "user",
        content: "(Student responded to step " + s + ")",
      });
    }
  }

  // If there's a prior_context, simulate it as an earlier exchange
  if (ctx.prior_context) {
    messages.push({
      role: "assistant",
      content: ctx.prior_context,
    });
  }

  messages.push({ role: "user", content: evalCase.prompt });

  const rawResponse = await withRetry(async () => {
    const result = await llmSend({ systemPrompt, messages });
    return result.text;
  });

  const phase = ctx.current_phase as Phase;
  const requiresMarkers = phase === "instruction" || phase === "guided";
  const markersPresent = responseHasExpectedMarkers(rawResponse, phase);

  // If markers are present or phase doesn't need them, no retry needed
  if (markersPresent || !requiresMarkers) {
    return {
      requiresMarkers,
      markersPresent,
      retried: false,
      retryFixed: false,
      finalResponse: rawResponse,
      rawResponse,
    };
  }

  // Markers missing — attempt retry
  let retryFixed = false;
  let finalResponse = rawResponse;

  try {
    const retryResult = await withRetry(async () => {
      const result = await llmSend({
        systemPrompt: MARKER_RETRY_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Current phase: ${phase}\n\nResponse to add markers to:\n\n${rawResponse}`,
          },
        ],
        maxTokens: 2048,
      });
      return result.text;
    });

    if (responseHasExpectedMarkers(retryResult, phase)) {
      retryFixed = true;
      finalResponse = retryResult;
    }
  } catch {
    // Retry failed — use raw response
  }

  return {
    requiresMarkers,
    markersPresent,
    retried: true,
    retryFixed,
    finalResponse,
    rawResponse,
  };
}

// ---------------------------------------------------------------------------
// Judge a response against expectations
// ---------------------------------------------------------------------------
interface JudgeResult {
  expectation: string;
  pass: boolean;
  reason: string;
}

async function judgeResponse(
  evalCase: EvalCase,
  response: string
): Promise<JudgeResult[]> {
  const judgeSystemPrompt = `You are an eval judge for an AI writing coach for children. Given the coach's response to a student, evaluate whether each expectation is met.

For each expectation, respond with a JSON array. Each element must have:
- "index": the 1-based expectation number
- "pass": true or false
- "reason": a brief (1 sentence) explanation

Respond with ONLY valid JSON array, no markdown fences, no other text.`;

  const judgeUserContent = `CONTEXT:
- Student: ${evalCase.context.student_name} (Tier ${evalCase.context.student_tier})
- Phase: ${evalCase.context.current_phase}
- Lesson: ${evalCase.context.lesson_id}
${evalCase.context.prior_context ? `- Prior context: ${evalCase.context.prior_context}` : ""}
${evalCase.context.current_step ? `- Current step: ${evalCase.context.current_step}` : ""}

STUDENT SAID: "${evalCase.prompt}"

COACH RESPONSE:
"""
${response}
"""

WORD COUNT: ${wordCount(response)} words

EXPECTATIONS TO EVALUATE:
${evalCase.expectations.map((e, i) => `${i + 1}. ${e}`).join("\n")}`;

  // Use LLM_JUDGE_MODEL env var if set, otherwise use the default configured model
  const judgeModel = process.env.LLM_JUDGE_MODEL || undefined;

  const judgeResult = await withRetry(() =>
    llmSend({
      systemPrompt: judgeSystemPrompt,
      messages: [{ role: "user", content: judgeUserContent }],
      maxTokens: JUDGE_MAX_TOKENS,
      model: judgeModel,
    })
  );
  const judgeText = judgeResult.text;

  try {
    // Strip markdown fences if present
    const cleaned = judgeText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as Array<{
      index: number;
      pass: boolean;
      reason: string;
    }>;

    return evalCase.expectations.map((exp, i) => {
      const judgment = parsed.find((p) => p.index === i + 1);
      return {
        expectation: exp,
        pass: judgment?.pass ?? false,
        reason: judgment?.reason ?? "No judgment returned",
      };
    });
  } catch {
    // If judge response can't be parsed, mark all as unknown
    return evalCase.expectations.map((exp) => ({
      expectation: exp,
      pass: false,
      reason: "Judge response could not be parsed",
    }));
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
      // Delay between evals to respect rate limits
      if (nextIndex < tasks.length && concurrency <= 2) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_EVALS_MS));
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  return results;
}

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------
interface EvalResult {
  id: string;
  name: string;
  phase: string;
  tier: number;
  response: string;
  wordCount: number;
  judgments: JudgeResult[];
  passCount: number;
  totalExpectations: number;
  passed: boolean;
  error?: string;
  // Marker validation fields
  markers: {
    requiresMarkers: boolean;
    markersPresent: boolean;
    retried: boolean;
    retryFixed: boolean;
  };
  rawResponse?: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const { provider, model } = getLLMConfig();
  const judgeModel = process.env.LLM_JUDGE_MODEL || model;

  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is not set.");
    process.exit(1);
  }
  if (provider === "google" && !process.env.GOOGLE_AI_API_KEY) {
    console.error("Error: GOOGLE_AI_API_KEY environment variable is not set.");
    process.exit(1);
  }
  if (provider === "groq" && !process.env.GROQ_API_KEY) {
    console.error("Error: GROQ_API_KEY environment variable is not set.");
    process.exit(1);
  }

  // Parse args
  const args = process.argv.slice(2);
  const filterIdx = args.indexOf("--id");
  const filterId = filterIdx !== -1 ? args[filterIdx + 1] : null;
  const concurrencyIdx = args.indexOf("--concurrency");
  const concurrency = concurrencyIdx !== -1 ? parseInt(args[concurrencyIdx + 1], 10) : DEFAULT_CONCURRENCY;

  let evals = evalsData.evals;
  if (filterId) {
    evals = evals.filter((e) => e.id.includes(filterId));
    console.log(`Filtered to ${evals.length} eval(s) matching "${filterId}"\n`);
  }

  const totalCount = evals.length;
  console.log(`\nWriteWhiz Evals — Running ${totalCount} eval(s) against ${model} (${provider})`);
  console.log(`Judge model: ${judgeModel} | Concurrency: ${concurrency}\n`);
  console.log("=".repeat(80));

  let completed = 0;
  const results: EvalResult[] = [];

  // Build tasks
  const tasks = evals.map((evalCase) => async () => {
    const start = Date.now();
    let result: EvalResult;

    try {
      // Step 1: Generate response + marker validation + optional retry
      const markerResult = await runEval(evalCase);
      const wc = wordCount(markerResult.finalResponse);

      // Step 2: Judge the final response (retried if retry succeeded, raw otherwise)
      const judgments = await judgeResponse(evalCase, markerResult.finalResponse);
      const passCount = judgments.filter((j) => j.pass).length;

      result = {
        id: evalCase.id,
        name: evalCase.name,
        phase: evalCase.context.current_phase,
        tier: evalCase.context.student_tier,
        response: markerResult.finalResponse,
        wordCount: wc,
        judgments,
        passCount,
        totalExpectations: evalCase.expectations.length,
        passed: passCount === evalCase.expectations.length,
        markers: {
          requiresMarkers: markerResult.requiresMarkers,
          markersPresent: markerResult.markersPresent,
          retried: markerResult.retried,
          retryFixed: markerResult.retryFixed,
        },
        rawResponse: markerResult.retried ? markerResult.rawResponse : undefined,
      };
    } catch (err) {
      result = {
        id: evalCase.id,
        name: evalCase.name,
        phase: evalCase.context.current_phase,
        tier: evalCase.context.student_tier,
        response: "",
        wordCount: 0,
        judgments: [],
        passCount: 0,
        totalExpectations: evalCase.expectations.length,
        passed: false,
        error: err instanceof Error ? err.message : String(err),
        markers: {
          requiresMarkers: false,
          markersPresent: false,
          retried: false,
          retryFixed: false,
        },
      };
    }

    completed++;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const status = result.error ? "ERR" : result.passed ? "PASS" : "FAIL";
    const score = `${result.passCount}/${result.totalExpectations}`;

    // Marker status suffix
    let markerTag = "";
    if (result.markers.requiresMarkers) {
      if (result.markers.markersPresent) {
        markerTag = " [markers: ok]";
      } else if (result.markers.retryFixed) {
        markerTag = " [markers: RETRY-FIXED]";
      } else if (result.markers.retried) {
        markerTag = " [markers: RETRY-FAILED]";
      } else {
        markerTag = " [markers: MISSING]";
      }
    }

    console.log(
      `  [${completed}/${totalCount}] ${status} ${score}  ${evalCase.id} (${elapsed}s)${markerTag}`
    );

    results.push(result);
    return result;
  });

  // Run with concurrency
  await runWithConcurrency(tasks, concurrency);

  // ---------------------------------------------------------------------------
  // Print detailed report
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(80));
  console.log("\n  DETAILED RESULTS\n");
  console.log("=".repeat(80));

  for (const r of results) {
    const status = r.error ? "ERROR" : r.passed ? "PASS" : "FAIL";
    console.log(`\n  ${status}  ${r.name} (${r.id})`);
    console.log(`  Phase: ${r.phase} | Tier: ${r.tier} | Words: ${r.wordCount}`);

    // Marker status line
    if (r.markers.requiresMarkers) {
      if (r.markers.markersPresent) {
        console.log(`  Markers: present in raw response`);
      } else if (r.markers.retryFixed) {
        console.log(`  Markers: MISSING in raw → FIXED by retry`);
      } else if (r.markers.retried) {
        console.log(`  Markers: MISSING in raw → retry also FAILED`);
      } else {
        console.log(`  Markers: MISSING (no retry attempted)`);
      }
    }

    if (r.error) {
      console.log(`  Error: ${r.error}`);
      continue;
    }

    // Print response (truncated)
    const truncated = r.response.length > 300
      ? r.response.slice(0, 300) + "..."
      : r.response;
    console.log(`  Response: ${truncated.replace(/\n/g, "\n    ")}`);

    // If retried, also show the raw response (truncated)
    if (r.rawResponse) {
      const rawTruncated = r.rawResponse.length > 200
        ? r.rawResponse.slice(0, 200) + "..."
        : r.rawResponse;
      console.log(`  Raw (pre-retry): ${rawTruncated.replace(/\n/g, "\n    ")}`);
    }

    // Print judgments
    for (const j of r.judgments) {
      const icon = j.pass ? "PASS" : "FAIL";
      console.log(`    [${icon}] ${j.expectation}`);
      if (!j.pass) {
        console.log(`           Reason: ${j.reason}`);
      }
    }

    console.log("-".repeat(80));
  }

  // ---------------------------------------------------------------------------
  // Summary report
  // ---------------------------------------------------------------------------
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed && !r.error).length;
  const errored = results.filter((r) => r.error).length;
  const totalExpectations = results.reduce((s, r) => s + r.totalExpectations, 0);
  const totalPassed = results.reduce((s, r) => s + r.passCount, 0);

  console.log("\n" + "=".repeat(80));
  console.log("\n  SUMMARY REPORT\n");
  console.log("=".repeat(80));
  console.log(`\n  Evals:        ${totalCount}`);
  console.log(`  Passed:       ${passed} (${((passed / totalCount) * 100).toFixed(0)}%)`);
  console.log(`  Failed:       ${failed}`);
  console.log(`  Errors:       ${errored}`);
  console.log(`  Expectations: ${totalPassed}/${totalExpectations} (${((totalPassed / totalExpectations) * 100).toFixed(0)}%)\n`);

  // ---------------------------------------------------------------------------
  // Marker validation summary
  // ---------------------------------------------------------------------------
  const markerEvals = results.filter((r) => r.markers.requiresMarkers && !r.error);
  const markersOk = markerEvals.filter((r) => r.markers.markersPresent).length;
  const markersMissing = markerEvals.filter((r) => !r.markers.markersPresent).length;
  const retriedCount = markerEvals.filter((r) => r.markers.retried).length;
  const retryFixedCount = markerEvals.filter((r) => r.markers.retryFixed).length;
  const retryFailedCount = retriedCount - retryFixedCount;

  if (markerEvals.length > 0) {
    console.log("  Marker Validation (instruction + guided phases):");
    console.log(`    Evals requiring markers: ${markerEvals.length}`);
    console.log(`    Markers present (raw):   ${markersOk}/${markerEvals.length} (${((markersOk / markerEvals.length) * 100).toFixed(0)}%)`);
    if (retriedCount > 0) {
      console.log(`    Missing → retried:       ${retriedCount}`);
      console.log(`    Retry fixed:             ${retryFixedCount}/${retriedCount} (${((retryFixedCount / retriedCount) * 100).toFixed(0)}%)`);
      console.log(`    Retry failed:            ${retryFailedCount}`);
      const effectiveRate = markersOk + retryFixedCount;
      console.log(`    Effective marker rate:    ${effectiveRate}/${markerEvals.length} (${((effectiveRate / markerEvals.length) * 100).toFixed(0)}%) — after retry`);
    } else {
      console.log(`    No retries needed — all raw responses had markers`);
    }
    console.log();

    // List evals where markers were missing
    const missingList = markerEvals.filter((r) => !r.markers.markersPresent);
    if (missingList.length > 0) {
      console.log("    Evals with missing markers:");
      for (const r of missingList) {
        const fixStatus = r.markers.retryFixed ? "FIXED by retry" : "NOT fixed";
        console.log(`      - ${r.id} (${r.phase}) → ${fixStatus}`);
      }
      console.log();
    }
  }

  // Group by category
  const categories: Record<string, { pass: number; fail: number; total: number }> = {};
  for (const r of results) {
    // Derive category from id prefix
    const cat = r.id.replace(/_[^_]*$/, "").replace(/_/g, " ");
    if (!categories[cat]) categories[cat] = { pass: 0, fail: 0, total: 0 };
    categories[cat].total++;
    if (r.passed) categories[cat].pass++;
    else categories[cat].fail++;
  }

  console.log("  By Category:");
  for (const [cat, stats] of Object.entries(categories).sort((a, b) => a[0].localeCompare(b[0]))) {
    const pct = ((stats.pass / stats.total) * 100).toFixed(0);
    const bar = stats.pass === stats.total ? "PASS" : `${stats.pass}/${stats.total}`;
    console.log(`    ${bar.padEnd(8)} ${cat}`);
  }

  // List failures
  const failures = results.filter((r) => !r.passed && !r.error);
  if (failures.length > 0) {
    console.log(`\n  Failed Evals:`);
    for (const f of failures) {
      const failedExps = f.judgments.filter((j) => !j.pass);
      console.log(`    - ${f.id}: ${failedExps.length} failed expectation(s)`);
      for (const fe of failedExps) {
        console.log(`      * ${fe.expectation}`);
        console.log(`        ${fe.reason}`);
      }
    }
  }

  console.log("\n" + "=".repeat(80));

  // Save full results to file
  const reportPath = path.join(__dirname, "../eval-report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        model,
        judgeModel,
        totalEvals: totalCount,
        passed,
        failed,
        errored,
        expectationsPass: totalPassed,
        expectationsTotal: totalExpectations,
        markers: {
          evalsRequiringMarkers: markerEvals.length,
          markersPresent: markersOk,
          markersMissing,
          retried: retriedCount,
          retryFixed: retryFixedCount,
          retryFailed: retryFailedCount,
          rawMarkerRate: markerEvals.length > 0
            ? `${((markersOk / markerEvals.length) * 100).toFixed(1)}%`
            : "N/A",
          effectiveMarkerRate: markerEvals.length > 0
            ? `${(((markersOk + retryFixedCount) / markerEvals.length) * 100).toFixed(1)}%`
            : "N/A",
        },
        results: results.map((r) => ({
          id: r.id,
          name: r.name,
          passed: r.passed,
          score: `${r.passCount}/${r.totalExpectations}`,
          wordCount: r.wordCount,
          response: r.response,
          rawResponse: r.rawResponse,
          judgments: r.judgments,
          error: r.error,
          markers: r.markers,
        })),
      },
      null,
      2
    )
  );
  console.log(`\n  Full report saved to: ${reportPath}\n`);
}

main().catch(console.error);

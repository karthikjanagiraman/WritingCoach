/**
 * WriteWise Skill Evaluation Runner
 *
 * Runs the test cases from evals.json against the Claude API using the
 * assembled prompt pipeline, then auto-grades each expectation using
 * a judge LLM call and prints a structured report.
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
import type { LLMMessage } from "../src/lib/llm/provider";

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
// Run a single eval (generation)
// ---------------------------------------------------------------------------
async function runEval(
  evalCase: EvalCase
): Promise<string> {
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

  return withRetry(async () => {
    const result = await llmSend({ systemPrompt, messages });
    return result.text;
  });
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
  console.log(`\nWriteWise Evals — Running ${totalCount} eval(s) against ${model} (${provider})`);
  console.log(`Judge model: ${judgeModel} | Concurrency: ${concurrency}\n`);
  console.log("=".repeat(80));

  let completed = 0;
  const results: EvalResult[] = [];

  // Build tasks
  const tasks = evals.map((evalCase) => async () => {
    const start = Date.now();
    let result: EvalResult;

    try {
      // Step 1: Generate response
      const response = await runEval(evalCase);
      const wc = wordCount(response);

      // Step 2: Judge response
      const judgments = await judgeResponse(evalCase, response);
      const passCount = judgments.filter((j) => j.pass).length;

      result = {
        id: evalCase.id,
        name: evalCase.name,
        phase: evalCase.context.current_phase,
        tier: evalCase.context.student_tier,
        response,
        wordCount: wc,
        judgments,
        passCount,
        totalExpectations: evalCase.expectations.length,
        passed: passCount === evalCase.expectations.length,
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
      };
    }

    completed++;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const status = result.error ? "ERR" : result.passed ? "PASS" : "FAIL";
    const score = `${result.passCount}/${result.totalExpectations}`;
    console.log(
      `  [${completed}/${totalCount}] ${status} ${score}  ${evalCase.id} (${elapsed}s)`
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

    if (r.error) {
      console.log(`  Error: ${r.error}`);
      continue;
    }

    // Print response (truncated)
    const truncated = r.response.length > 300
      ? r.response.slice(0, 300) + "..."
      : r.response;
    console.log(`  Response: ${truncated.replace(/\n/g, "\n    ")}`);

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
        results: results.map((r) => ({
          id: r.id,
          name: r.name,
          passed: r.passed,
          score: `${r.passCount}/${r.totalExpectations}`,
          wordCount: r.wordCount,
          response: r.response,
          judgments: r.judgments,
          error: r.error,
        })),
      },
      null,
      2
    )
  );
  console.log(`\n  Full report saved to: ${reportPath}\n`);
}

main().catch(console.error);

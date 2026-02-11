/**
 * WriteWise Skill Evaluation Runner
 *
 * Runs the test cases from evals.json against the Claude API using the
 * assembled prompt pipeline, then prints results for manual review.
 *
 * Usage:
 *   npx tsx scripts/run-evals.ts              # run all evals
 *   npx tsx scripts/run-evals.ts --id tier2   # run evals matching "tier2"
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 1024;
const CONTENT_DIR = path.join(__dirname, "../src/lib/llm/content");

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
interface EvalCase {
  id: string;
  name: string;
  description: string;
  prompt: string;
  context: {
    student_name: string;
    student_age?: number;
    student_tier: number;
    lesson_id: string;
    current_phase: string;
    prior_context?: string;
    action?: string;
  };
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

  parts.push(skillContent.core);
  parts.push(TIER_INSERTS[ctx.student_tier] ?? "");
  parts.push(PHASE_PROMPTS[ctx.current_phase] ?? "");

  parts.push(`## Current Session Context

Student: ${ctx.student_name}${ctx.student_age ? ` (age ${ctx.student_age}, Tier ${ctx.student_tier})` : ` (Tier ${ctx.student_tier})`}
Lesson: ${ctx.lesson_id}
Current Phase: ${ctx.current_phase.toUpperCase()}
${ctx.prior_context ? `\nPrior context: ${ctx.prior_context}` : ""}`);

  return parts.filter(Boolean).join("\n\n---\n\n");
}

// ---------------------------------------------------------------------------
// Run a single eval
// ---------------------------------------------------------------------------
async function runEval(
  client: Anthropic,
  evalCase: EvalCase
): Promise<{ id: string; name: string; response: string; expectations: string[] }> {
  const systemPrompt = buildEvalPrompt(evalCase);

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  // If there's a prior_context, simulate it as an earlier exchange
  if (evalCase.context.prior_context) {
    messages.push({
      role: "assistant",
      content: evalCase.context.prior_context,
    });
  }

  messages.push({ role: "user", content: evalCase.prompt });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  const text =
    response.content.find((b) => b.type === "text")?.text ?? "(no text)";

  return {
    id: evalCase.id,
    name: evalCase.name,
    response: text,
    expectations: evalCase.expectations,
  };
}

// ---------------------------------------------------------------------------
// Word count helper
// ---------------------------------------------------------------------------
function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is not set.");
    console.error("Set it in your .env.local or export it before running.");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const filterArg = process.argv.find((a) => a === "--id");
  const filterId = filterArg ? process.argv[process.argv.indexOf(filterArg) + 1] : null;

  let evals = evalsData.evals;
  if (filterId) {
    evals = evals.filter((e) => e.id.includes(filterId));
    console.log(`Filtered to ${evals.length} eval(s) matching "${filterId}"\n`);
  }

  console.log(`Running ${evals.length} eval(s) against ${MODEL}...\n`);
  console.log("=".repeat(80));

  for (const evalCase of evals) {
    console.log(`\n  EVAL: ${evalCase.name} (${evalCase.id})`);
    console.log(`  ${evalCase.description}`);
    console.log(`  Student prompt: "${evalCase.prompt.slice(0, 80)}${evalCase.prompt.length > 80 ? "..." : ""}"`);
    console.log("-".repeat(80));

    try {
      const result = await runEval(client, evalCase);

      console.log(`\n  RESPONSE (${wordCount(result.response)} words):\n`);
      // Indent the response for readability
      const indented = result.response
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n");
      console.log(indented);

      console.log(`\n  EXPECTATIONS (check manually):`);
      for (const exp of result.expectations) {
        console.log(`    [ ] ${exp}`);
      }
    } catch (err) {
      console.error(`  ERROR: ${err instanceof Error ? err.message : err}`);
    }

    console.log("\n" + "=".repeat(80));
  }

  console.log("\nDone. Review each response against its expectations above.");
  console.log(`Grading notes: ${JSON.stringify(evalsData.grading_notes, null, 2)}`);
}

main().catch(console.error);

import fs from "fs";
import path from "path";
import type { Rubric, RubricCriterion } from "@/types";

// ---------------------------------------------------------------------------
// Load all rubric JSON files from content/rubrics/ at module init time
// ---------------------------------------------------------------------------
interface RawRubricFile {
  rubric_id: string;
  lesson_ids: string[];
  description: string;
  word_range: [number, number];
  criteria: RubricCriterion[];
}

const RUBRICS_DIR = path.join(process.cwd(), "src/lib/llm/content/rubrics");

function loadAllRubrics(): Map<string, Rubric> {
  const map = new Map<string, Rubric>();
  const files = fs.readdirSync(RUBRICS_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const raw: RawRubricFile = JSON.parse(
      fs.readFileSync(path.join(RUBRICS_DIR, file), "utf-8"),
    );
    const rubric: Rubric = {
      id: raw.rubric_id,
      description: raw.description,
      word_range: raw.word_range,
      criteria: raw.criteria,
    };
    map.set(rubric.id, rubric);
  }
  return map;
}

const rubricMap = loadAllRubrics();

// ---------------------------------------------------------------------------
// getRubric — look up a rubric by its ID (e.g. "N1_story_beginning")
// ---------------------------------------------------------------------------
export function getRubric(rubricId: string): Rubric | undefined {
  return rubricMap.get(rubricId);
}

// ---------------------------------------------------------------------------
// getAllRubricIds — return all available rubric IDs
// ---------------------------------------------------------------------------
export function getAllRubricIds(): string[] {
  return Array.from(rubricMap.keys());
}

// ---------------------------------------------------------------------------
// formatRubricForPrompt — render a rubric as human-readable text for the LLM
// ---------------------------------------------------------------------------
export function formatRubricForPrompt(rubric: Rubric): string {
  const lines: string[] = [];

  lines.push(`Rubric: ${rubric.description}`);
  lines.push(`Expected length: ${rubric.word_range[0]}-${rubric.word_range[1]} words`);
  lines.push("");

  for (const criterion of rubric.criteria) {
    lines.push(`CRITERION: ${criterion.display_name} (weight: ${Math.round(criterion.weight * 100)}%)`);
    lines.push(`  4 — ${criterion.levels["4"]}`);
    lines.push(`  3 — ${criterion.levels["3"]}`);
    lines.push(`  2 — ${criterion.levels["2"]}`);
    lines.push(`  1 — ${criterion.levels["1"]}`);
    lines.push("");
  }

  return lines.join("\n");
}

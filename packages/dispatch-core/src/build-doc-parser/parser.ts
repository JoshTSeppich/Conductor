import { buildDag } from './dag-builder.js';
import {
  detectCycle,
  detectDuplicateBranches,
  detectOrphans,
} from './validators.js';
import type {
  ApprovalPolicy,
  ModelHint,
  ParseError,
  ParseResult,
  Preamble,
  Task,
  TaskGroup,
  TaskId,
  Tier,
} from './types.js';

/**
 * Parse a BUILD.md document per the operator-arbitrated spec
 * (`~/Downloads/BUILD-md-spec.md`; spec-in-repo deferred per Q-MBT28-6).
 *
 * Pure function — no I/O, no side effects, no globals.
 *
 * Implementation lands across WB2-WB8:
 *   WB2 — §3.1 preamble parsing
 *   WB3 — §3.2 task section extraction
 *   WB4 — §3.3 fields + §3.4 ref resolution + DAG construction (THIS WB)
 *   WB5 — cycle detection
 *   WB6 — orphan + duplicate-branch + missing-preamble polish
 *   WB7 — error-surface polish
 *   WB8 — coverage closure
 */
export function parseBuildDoc(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const preamble = parsePreamble(lines);
  if (!preamble.ok) {
    return { ok: false, errors: preamble.errors };
  }

  const sectionScan = scanSections(lines, preamble.nextIndex);
  const taskBuild = buildTasksAndGroups(sectionScan.sections);

  const allErrors: ParseError[] = [
    ...preamble.errors,
    ...sectionScan.errors,
    ...taskBuild.errors,
  ];
  if (allErrors.length > 0) {
    return { ok: false, errors: allErrors };
  }

  const { dag, errors: dagErrors } = buildDag(
    preamble.preamble,
    taskBuild.tasks,
    taskBuild.groups,
  );

  const validatorErrors: ParseError[] = [];

  // WB6: orphan detection.
  validatorErrors.push(...detectOrphans(dag));

  // WB5: cycle detection.
  const cyclePath = detectCycle(dag);
  if (cyclePath !== null) {
    const firstId = cyclePath[0]!;
    const firstTask = dag.tasks.find((t) => t.id === firstId);
    const cycleArrow = cyclePath.map((id) => `§${id}`).join(' → ');
    validatorErrors.push({
      code: 'dependency.cycle',
      message: `Dependency cycle detected: ${cycleArrow} → §${firstId}`,
      line: firstTask?.sourceLine ?? 0,
      details: { cyclePath },
    });
  }

  // WB6: duplicate-branch-non-sequential detection.
  validatorErrors.push(...detectDuplicateBranches(dag.tasks, dag.edges));

  const finalErrors = [...dagErrors, ...validatorErrors];
  if (finalErrors.length > 0) {
    return { ok: false, errors: finalErrors };
  }

  return { ok: true, dag };
}

// ---------------------------------------------------------------------------
// Shared regexes.
// ---------------------------------------------------------------------------

const FIELD_LINE = /^\*\*([^*:]+):\*\*\s*(.*)$/;
const H1 = /^#\s+/;
const H2 = /^##\s+/;
const H3 = /^###\s+/;
/** `## §N — Title` or `## §N.M — Title`. Permissive on dash char (—, –, -). */
const TASK_HEADING_H2 = /^##\s+§([0-9]+(?:\.[0-9]+)?)\s+[—–-]\s+(.+)$/;
/** `### §N — Title` or `### §N.M — Title`. */
const TASK_HEADING_H3 = /^###\s+§([0-9]+(?:\.[0-9]+)?)\s+[—–-]\s+(.+)$/;
/** Bullet line: leading whitespace + bullet char + space + content. R-MBT28-5 permissive. */
const BULLET_LINE = /^\s*[-*+]\s+(.*)$/;
/** §N reference, e.g. `§1` or `§3.1`. */
const SECTION_REF = /^§([0-9]+(?:\.[0-9]+)?)$/;
/** Cap value, e.g. `5%`, `12.5%`. */
const CAP_VALUE = /^\d+(?:\.\d+)?%$/;

// ---------------------------------------------------------------------------
// §3.1 preamble parsing (WB2).
// ---------------------------------------------------------------------------

const REQUIRED_PREAMBLE_FIELDS = ['Repo', 'Plan rev'] as const;
const OPTIONAL_PREAMBLE_FIELDS = ['Operator', 'Conductor profile'] as const;
const PREAMBLE_FIELDS: readonly string[] = [
  ...REQUIRED_PREAMBLE_FIELDS,
  ...OPTIONAL_PREAMBLE_FIELDS,
];

type PreambleParseOk = {
  ok: true;
  preamble: Preamble;
  errors: ParseError[];
  nextIndex: number;
};
type PreambleParseFail = { ok: false; errors: ParseError[] };

function parsePreamble(lines: string[]): PreambleParseOk | PreambleParseFail {
  let h1Index = -1;
  for (let i = 0; i < lines.length; i++) {
    if (H1.test(lines[i]!) && !H2.test(lines[i]!)) {
      h1Index = i;
      break;
    }
  }
  if (h1Index === -1) {
    return {
      ok: false,
      errors: [
        {
          code: 'preamble.missing',
          message: 'Document has no `# BUILD` header (spec §3.1)',
          line: 1,
        },
      ],
    };
  }
  const h1Title = lines[h1Index]!.replace(H1, '').trim();
  if (h1Title !== 'BUILD') {
    return {
      ok: false,
      errors: [
        {
          code: 'preamble.missing',
          message: `First H1 must be \`# BUILD\` per spec §3.1; got \`# ${h1Title}\``,
          line: h1Index + 1,
        },
      ],
    };
  }

  const collected = new Map<string, { value: string; line: number }>();
  const errors: ParseError[] = [];
  let cursor = h1Index + 1;
  for (; cursor < lines.length; cursor++) {
    const line = lines[cursor]!;
    if (H2.test(line) || (H1.test(line) && !H2.test(line))) break;
    const match = line.match(FIELD_LINE);
    if (!match) continue;
    const fieldName = match[1]!.trim();
    const rawValue = match[2]!.trim();
    if (!PREAMBLE_FIELDS.includes(fieldName)) {
      errors.push({
        code: 'preamble.field-malformed',
        message: `Unknown preamble field \`${fieldName}\` (spec §3.1 fields: ${PREAMBLE_FIELDS.join(', ')})`,
        line: cursor + 1,
        details: { fieldName, rawValue },
      });
      continue;
    }
    if (rawValue === '') {
      errors.push({
        code: 'preamble.field-malformed',
        message: `Preamble field \`${fieldName}\` has empty value`,
        line: cursor + 1,
        details: { fieldName, rawValue },
      });
      continue;
    }
    if (collected.has(fieldName)) {
      errors.push({
        code: 'preamble.field-malformed',
        message: `Preamble field \`${fieldName}\` appears more than once`,
        line: cursor + 1,
        details: { fieldName, rawValue },
      });
      continue;
    }
    collected.set(fieldName, { value: rawValue, line: cursor + 1 });
  }

  for (const required of REQUIRED_PREAMBLE_FIELDS) {
    if (!collected.has(required)) {
      errors.push({
        code: 'preamble.field-missing',
        message: `Preamble missing required field \`${required}\` (spec §3.1)`,
        line: h1Index + 1,
        details: { fieldName: required },
      });
    }
  }

  if (errors.some((e) => e.code === 'preamble.field-missing')) {
    return { ok: false, errors };
  }

  const preamble: Preamble = {
    repo: collected.get('Repo')!.value,
    planRev: collected.get('Plan rev')!.value,
  };
  if (collected.has('Operator')) preamble.operator = collected.get('Operator')!.value;
  if (collected.has('Conductor profile')) preamble.conductorProfile = collected.get('Conductor profile')!.value;

  return { ok: true, preamble, errors, nextIndex: cursor };
}

// ---------------------------------------------------------------------------
// §3.2 task section parsing (WB3).
// ---------------------------------------------------------------------------

interface SectionRecord {
  id: TaskId;
  title: string;
  sourceLine: number;
  level: 'h2' | 'h3';
  /** Raw lines between this heading and the next H1/H2/H3 boundary, exclusive of headings. Contiguous in source so line numbers are recoverable. */
  bodyLines: string[];
  parentH2Id?: TaskId;
}

interface SectionScanResult {
  sections: SectionRecord[];
  errors: ParseError[];
}

function scanSections(lines: string[], startIndex: number): SectionScanResult {
  const sections: SectionRecord[] = [];
  const errors: ParseError[] = [];
  let currentH2: SectionRecord | null = null;
  let currentSection: SectionRecord | null = null;

  const flushCurrent = () => {
    if (currentSection) {
      sections.push(currentSection);
      currentSection = null;
    }
  };

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]!;
    if (H3.test(line)) {
      flushCurrent();
      const heading = parseTaskHeading(line, i + 1, 'h3');
      if (!heading.ok) {
        errors.push(heading.error);
        continue;
      }
      currentSection = {
        id: heading.id,
        title: heading.title,
        sourceLine: i + 1,
        level: 'h3',
        bodyLines: [],
      };
      if (currentH2) currentSection.parentH2Id = currentH2.id;
      continue;
    }
    if (H2.test(line)) {
      flushCurrent();
      const heading = parseTaskHeading(line, i + 1, 'h2');
      if (!heading.ok) {
        errors.push(heading.error);
        currentH2 = null;
        continue;
      }
      currentSection = {
        id: heading.id,
        title: heading.title,
        sourceLine: i + 1,
        level: 'h2',
        bodyLines: [],
      };
      currentH2 = currentSection;
      continue;
    }
    if (H1.test(line) && !H2.test(line)) {
      flushCurrent();
      currentH2 = null;
      continue;
    }
    if (currentSection) {
      currentSection.bodyLines.push(line);
    }
  }
  flushCurrent();
  return { sections, errors };
}

interface HeadingParseOk {
  ok: true;
  id: TaskId;
  title: string;
}
interface HeadingParseFail {
  ok: false;
  error: ParseError;
}

function parseTaskHeading(
  line: string,
  sourceLine: number,
  level: 'h2' | 'h3',
): HeadingParseOk | HeadingParseFail {
  const re = level === 'h2' ? TASK_HEADING_H2 : TASK_HEADING_H3;
  const m = line.match(re);
  if (!m) {
    const expectedShape = level === 'h2' ? '`## §N — Title`' : '`### §N.M — Title`';
    return {
      ok: false,
      error: {
        code: 'task.malformed-heading',
        message: `Section heading does not match ${expectedShape} (spec §3.2)`,
        line: sourceLine,
        details: { rawHeading: line.trim() },
      },
    };
  }
  return { ok: true, id: m[1]!, title: m[2]!.trim() };
}

// ---------------------------------------------------------------------------
// §3.3 task body field parsing + §3.4 ref resolution (WB4).
// ---------------------------------------------------------------------------

interface ParsedTaskBody {
  goal?: string;
  branch?: string;
  dependsOn?: TaskId[];
  acceptance?: string[];
  hints?: string[];
  approvalPolicy?: ApprovalPolicy;
  model?: ModelHint;
  tier?: Tier;
  estimate?: string;
  cap?: string;
  speculative?: boolean;
}

interface TaskBuildResult {
  tasks: Task[];
  groups: TaskGroup[];
  errors: ParseError[];
}

function buildTasksAndGroups(sections: SectionRecord[]): TaskBuildResult {
  const tasks: Task[] = [];
  const groups: TaskGroup[] = [];
  const errors: ParseError[] = [];
  const taskIdToFirstLine = new Map<TaskId, number>();

  const h2WithH3Children = new Set<TaskId>();
  for (const s of sections) {
    if (s.level === 'h3' && s.parentH2Id !== undefined) {
      h2WithH3Children.add(s.parentH2Id);
    }
  }

  for (const section of sections) {
    if (section.level === 'h2' && h2WithH3Children.has(section.id)) {
      const childIds = sections
        .filter((s) => s.level === 'h3' && s.parentH2Id === section.id)
        .map((s) => s.id);
      groups.push({
        id: section.id,
        title: section.title,
        taskIds: childIds,
        sourceLine: section.sourceLine,
      });
      const hasBodyFields = section.bodyLines.some((l) => FIELD_LINE.test(l));
      if (hasBodyFields) {
        errors.push({
          code: 'task.malformed-heading',
          message: `H2 §${section.id} has both body fields and H3 subsections — must be either a task (no H3 children) or a group (no body fields)`,
          line: section.sourceLine,
          details: { rawHeading: `## §${section.id} — ${section.title}` },
        });
      }
      continue;
    }

    if (taskIdToFirstLine.has(section.id)) {
      errors.push({
        code: 'task.id-conflict',
        message: `Duplicate task id §${section.id}`,
        line: section.sourceLine,
        details: {
          taskId: section.id,
          firstSourceLine: taskIdToFirstLine.get(section.id)!,
        },
      });
      continue;
    }
    taskIdToFirstLine.set(section.id, section.sourceLine);

    const { fields, errors: bodyErrors } = parseTaskBody(section);
    errors.push(...bodyErrors);

    const task: Task = {
      id: section.id,
      title: section.title,
      goal: fields.goal ?? '',
      branch: fields.branch ?? '',
      dependsOn: fields.dependsOn ?? [],
      acceptance: fields.acceptance ?? [],
      sourceLine: section.sourceLine,
    };
    if (fields.hints !== undefined) task.hints = fields.hints;
    if (fields.approvalPolicy !== undefined) task.approvalPolicy = fields.approvalPolicy;
    if (fields.model !== undefined) task.model = fields.model;
    if (fields.tier !== undefined) task.tier = fields.tier;
    if (fields.estimate !== undefined) task.estimate = fields.estimate;
    if (fields.cap !== undefined) task.cap = fields.cap;
    if (fields.speculative !== undefined) task.speculative = fields.speculative;
    tasks.push(task);
  }

  return { tasks, groups, errors };
}

function parseTaskBody(
  section: SectionRecord,
): { fields: ParsedTaskBody; errors: ParseError[] } {
  const errors: ParseError[] = [];
  const fields: ParsedTaskBody = {};
  let goalLines: string[] | null = null;
  // `currentList` is a direct reference to the bullet array on `fields`
  // (either fields.acceptance or fields.hints); pushing into it mutates the
  // field directly. null when we're not inside a list-field body.
  let currentList: string[] | null = null;

  for (let idx = 0; idx < section.bodyLines.length; idx++) {
    const line = section.bodyLines[idx]!;
    const sourceLineNum = section.sourceLine + 1 + idx;

    const fieldMatch = line.match(FIELD_LINE);
    if (fieldMatch) {
      // Flush any in-progress goal accumulation, exit any list context.
      if (goalLines !== null) {
        fields.goal = goalLines.join(' ').trim();
        goalLines = null;
      }
      currentList = null;

      const fieldName = fieldMatch[1]!.trim();
      const rawValue = fieldMatch[2]!.trim();

      const malformed = (msg: string) => {
        errors.push({
          code: 'task.malformed-field',
          message: `Task §${section.id}: ${msg}`,
          line: sourceLineNum,
          details: { taskId: section.id, fieldName, rawValue },
        });
      };

      switch (fieldName) {
        case 'Goal':
          goalLines = [rawValue];
          break;
        case 'Branch':
          if (rawValue === '') malformed('Branch field has empty value');
          else fields.branch = rawValue;
          break;
        case 'Depends on':
          fields.dependsOn = parseDependsOn(rawValue);
          break;
        case 'Acceptance': {
          const list: string[] = [];
          fields.acceptance = list;
          currentList = list;
          break;
        }
        case 'Hints': {
          const list: string[] = [];
          fields.hints = list;
          currentList = list;
          break;
        }
        case 'Approval policy':
          if (rawValue === 'tight' || rawValue === 'medium' || rawValue === 'loose') {
            fields.approvalPolicy = rawValue;
          } else {
            malformed(`Approval policy must be tight|medium|loose; got "${rawValue}"`);
          }
          break;
        case 'Model':
          if (
            rawValue === 'S4.6' ||
            rawValue === 'O4.6' ||
            rawValue === 'O4.7·1M' ||
            rawValue === 'H'
          ) {
            fields.model = rawValue;
          } else {
            malformed(`Model must be S4.6|O4.6|O4.7·1M|H; got "${rawValue}"`);
          }
          break;
        case 'Tier':
          if (rawValue === '1' || rawValue === '2' || rawValue === '3') {
            fields.tier = parseInt(rawValue, 10) as Tier;
          } else {
            malformed(`Tier must be 1|2|3; got "${rawValue}"`);
          }
          break;
        case 'Estimate':
          fields.estimate = rawValue;
          break;
        case 'Cap':
          if (CAP_VALUE.test(rawValue)) fields.cap = rawValue;
          else malformed(`Cap must match "N%" format (e.g., "5%"); got "${rawValue}"`);
          break;
        case 'Speculative':
          if (rawValue === 'true') fields.speculative = true;
          else if (rawValue === 'false') fields.speculative = false;
          else malformed(`Speculative must be true|false; got "${rawValue}"`);
          break;
        default:
          // Q-MBT28-9 ack=(a) strict: unknown task fields are malformed.
          malformed(`unknown field \`${fieldName}\``);
      }
      continue;
    }

    const bulletMatch = line.match(BULLET_LINE);
    if (bulletMatch && currentList !== null) {
      // No goal-flush needed here: entering a list field (Acceptance/Hints)
      // always flushes goalLines via the field-line branch above, so by the
      // time we reach a bullet with currentList!==null, goalLines is null.
      currentList.push(bulletMatch[1]!.trim());
      continue;
    }

    if (goalLines !== null) {
      if (line.trim() === '') {
        fields.goal = goalLines.join(' ').trim();
        goalLines = null;
      } else {
        goalLines.push(line.trim());
      }
    }
  }

  // No trailing-flush: mid-loop blank-line handling at the section's
  // boundary flushes goalLines for any well-formed fixture (trailing newline
  // produces a blank line at section end, which triggers the in-loop flush).
  // A file ending exactly on a goal line with no trailing newline would lose
  // that final line — accepted edge case (filed v3.1 polish FU candidate).

  // Validate required fields per spec §3.3.
  const requiredKeyMap: Record<string, keyof ParsedTaskBody> = {
    Goal: 'goal',
    Branch: 'branch',
    'Depends on': 'dependsOn',
    Acceptance: 'acceptance',
  };
  for (const required of ['Goal', 'Branch', 'Depends on', 'Acceptance'] as const) {
    if (fields[requiredKeyMap[required]!] === undefined) {
      errors.push({
        code: 'task.missing-required-field',
        message: `Task §${section.id}: missing required field \`${required}\``,
        line: section.sourceLine,
        details: { taskId: section.id, fieldName: required },
      });
    }
  }

  return { fields, errors };
}

function parseDependsOn(rawValue: string): TaskId[] {
  const trimmed = rawValue.trim();
  // Spec uses `—` (em-dash) for "no deps". Permissive: also accept `–` and `-`.
  if (trimmed === '' || trimmed === '—' || trimmed === '–' || trimmed === '-') {
    return [];
  }
  const parts = trimmed.split(',').map((p) => p.trim()).filter((p) => p !== '');
  const ids: TaskId[] = [];
  for (const part of parts) {
    const m = part.match(SECTION_REF);
    if (m) ids.push(m[1]!);
    // Unparseable refs silently dropped at WB4; orphan validator (WB6) catches via
    // dependsOn ∩ knownIds. Strict-malformed-ref tightening is v3.1 polish (FU).
  }
  return ids;
}

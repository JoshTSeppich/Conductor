import jsYaml from 'js-yaml';
import { z } from 'zod';
import {
  BuildDocFrontmatterSchema,
  BuildDocTicketSchema,
  type BuildDoc,
  type BuildDocFrontmatter,
  type BuildDocTicket,
} from 'dispatch-core/dist/v3/schema.js';

export interface ValidationErrorInfo {
  field_path: string;
  issue: string;
}

export type ValidationResult =
  | { success: true; doc: BuildDoc }
  | { success: false; errors: ValidationErrorInfo[] };

export class BuildDocValidationError extends Error {
  readonly errors: ValidationErrorInfo[];

  constructor(errors: ValidationErrorInfo[]) {
    super(`Build doc validation failed: ${errors.map((e) => e.field_path).join(', ')}`);
    this.name = 'BuildDocValidationError';
    this.errors = errors;
  }
}

function splitFrontmatter(content: string): { yaml: string; body: string } | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/s.exec(content);
  if (!match) return null;
  return { yaml: match[1], body: match[2] };
}

function zodErrorsToValidationErrors(zodError: z.ZodError, prefix: string): ValidationErrorInfo[] {
  return zodError.issues.map((e) => ({
    field_path: [prefix, ...e.path.map(String)].filter(Boolean).join('.'),
    issue: e.message,
  }));
}

/** Parse inline array notation `[item1, item2]` or `[]`. */
function parseInlineArray(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed === '[]' || trimmed === '') return [];
  return trimmed
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Extract the text of a **SectionName:** block within a ticket. */
function extractSection(block: string, sectionName: string): string | null {
  const regex = new RegExp(
    `\\*\\*${sectionName}:\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*[A-Za-z]|$)`,
    'm',
  );
  const m = regex.exec(block);
  if (!m) return null;
  return m[1].trim() || null;
}

/** Extract a single-line **Field:** value. */
function extractField(block: string, fieldName: string): string | null {
  const regex = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, 'm');
  const m = regex.exec(block);
  return m ? m[1].trim() : null;
}

function parseTicketsFromBody(body: string): BuildDocTicket[] {
  const ticketsSectionMatch = /^## Tickets.*\n([\s\S]*?)(?=^## |\s*$)/m.exec(body);
  if (!ticketsSectionMatch) return [];

  const ticketsSection = ticketsSectionMatch[1];
  const blocks = ticketsSection.split(/^(?=### )/m).filter((b) => b.trim());

  return blocks.flatMap((block): BuildDocTicket[] => {
    // ### TICKET-ID: Title {#section-id}
    const headingMatch = /^### ([^\s:]+):?[^{]*\{#([^}]+)\}/.exec(block);
    if (!headingMatch) return [];

    const ticket_id = headingMatch[1];
    const section_id = headingMatch[2];

    const type = extractField(block, 'Type');
    const domain = extractField(block, 'Domain') ?? '';
    const phase = extractField(block, 'Phase') ?? '';
    const status = extractField(block, 'Status') ?? 'pending';
    const dependsOnRaw = extractField(block, 'Depends on') ?? '[]';
    const allowedActionsRaw = extractField(block, 'Allowed actions') ?? '[]';
    const description = extractSection(block, 'Description') ?? extractField(block, 'Description') ?? '';
    const red = extractSection(block, 'Red') ?? extractField(block, 'Red');
    const green = extractSection(block, 'Green') ?? extractField(block, 'Green');
    const refactor = extractSection(block, 'Refactor') ?? extractField(block, 'Refactor');

    const raw = {
      ticket_id,
      section_id,
      type,
      domain,
      phase,
      depends_on: parseInlineArray(dependsOnRaw),
      allowed_actions: parseInlineArray(allowedActionsRaw),
      status,
      description,
      red,
      green,
      refactor,
      open_questions_refs: [],
    };

    const parsed = BuildDocTicketSchema.safeParse(raw);
    if (!parsed.success) return [];
    return [parsed.data];
  });
}

/**
 * Validate a build doc string against the v3 schema (stage 1: frontmatter,
 * stage 2: body/tickets, stage 3: dependency graph).
 * Per build-doc-schema-spec.md §4 + ratified P-0.5 Q2.
 */
export function validateBuildDoc(content: string): ValidationResult {
  const parts = splitFrontmatter(content);
  if (!parts) {
    return {
      success: false,
      errors: [{ field_path: 'frontmatter', issue: 'Missing YAML frontmatter (expected --- delimiters)' }],
    };
  }

  // Stage 1: YAML parse
  let rawYaml: unknown;
  try {
    rawYaml = jsYaml.load(parts.yaml);
  } catch (err) {
    return {
      success: false,
      errors: [{ field_path: 'frontmatter', issue: `YAML parse error: ${String(err)}` }],
    };
  }

  // Stage 1: Frontmatter validation
  const fmResult = BuildDocFrontmatterSchema.safeParse(rawYaml);
  if (!fmResult.success) {
    return {
      success: false,
      errors: zodErrorsToValidationErrors(fmResult.error, 'frontmatter'),
    };
  }
  const frontmatter: BuildDocFrontmatter = fmResult.data;

  // Stage 2: Parse tickets from body
  const tickets = parseTicketsFromBody(parts.body);

  // Stage 3: Dependency cycle detection (per build-doc-schema-spec.md §3.5 + §4.3)
  const ticketIds = new Set(tickets.map((t) => t.ticket_id));
  const cycleErrors: ValidationErrorInfo[] = [];

  for (const ticket of tickets) {
    for (const dep of ticket.depends_on) {
      if (!ticketIds.has(dep)) {
        cycleErrors.push({
          field_path: `tickets.${ticket.ticket_id}.depends_on`,
          issue: `Unknown dependency: ${dep}`,
        });
      }
    }
  }

  if (cycleErrors.length > 0) {
    return { success: false, errors: cycleErrors };
  }

  // Detect cycles via DFS
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const depMap = new Map(tickets.map((t) => [t.ticket_id, t.depends_on]));

  function hasCycle(id: string): boolean {
    if (inStack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    inStack.add(id);
    for (const dep of depMap.get(id) ?? []) {
      if (hasCycle(dep)) return true;
    }
    inStack.delete(id);
    return false;
  }

  for (const id of ticketIds) {
    if (hasCycle(id)) {
      return {
        success: false,
        errors: [{ field_path: 'tickets.depends_on', issue: `Circular dependency detected involving ticket: ${id}` }],
      };
    }
  }

  const doc: BuildDoc = {
    frontmatter,
    tickets,
    open_questions: [],
    multi_choice_templates: [],
  };

  return { success: true, doc };
}

/**
 * Prompt Editor types for viewing, editing, and versioning agent prompts
 */

/** A saved version of a prompt */
export interface PromptVersion {
  /** Unique identifier (e.g., "factory", "2024-01-15_stricter-tests") */
  id: string;
  /** Display name for the version */
  name: string;
  /** Whether this version is read-only (factory default) */
  readonly?: boolean;
  /** ISO timestamp when version was created */
  createdAt?: string;
}

/** Information about a single prompt */
export interface PromptInfo {
  /** Prompt filename without extension (e.g., "qa_reviewer") */
  name: string;
  /** Category for grouping (e.g., "QA & Validation") */
  category: string;
  /** Brief description of what this prompt does */
  description: string;
  /** Currently active version ID */
  activeVersion: string;
  /** All available versions including factory */
  versions: PromptVersion[];
  /** Whether this prompt has a project override */
  isCustomized: boolean;
}

/** Metadata stored in .auto-claude/prompts/.meta.json */
export interface PromptMeta {
  prompts: Record<string, {
    activeVersion: string;
    versions: PromptVersion[];
  }>;
}

/** Category definition for prompt grouping */
export interface PromptCategory {
  id: string;
  name: string;
  description: string;
  prompts: string[];
}

/** Prompt categories with their member prompts */
export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'qa',
    name: 'QA & Validation',
    description: 'Quality assurance and validation prompts',
    prompts: ['qa_reviewer', 'qa_fixer', 'validation_fixer'],
  },
  {
    id: 'build',
    name: 'Build & Implementation',
    description: 'Code implementation and planning prompts',
    prompts: ['coder', 'planner', 'coder_recovery', 'followup_planner'],
  },
  {
    id: 'spec',
    name: 'Spec Creation',
    description: 'Specification and requirements gathering prompts',
    prompts: ['spec_gatherer', 'spec_writer', 'spec_quick', 'spec_critic', 'spec_researcher', 'complexity_assessor'],
  },
  {
    id: 'ideation',
    name: 'Ideation',
    description: 'Feature ideation and improvement prompts',
    prompts: ['ideation_code_improvements', 'ideation_code_quality', 'ideation_documentation', 'ideation_performance', 'ideation_security', 'ideation_ui_ux'],
  },
  {
    id: 'roadmap',
    name: 'Roadmap',
    description: 'Roadmap and feature planning prompts',
    prompts: ['roadmap_discovery', 'roadmap_features', 'competitor_analysis'],
  },
  {
    id: 'other',
    name: 'Other',
    description: 'Miscellaneous prompts',
    prompts: ['insight_extractor'],
  },
];

/** Prompt descriptions for display */
export const PROMPT_DESCRIPTIONS: Record<string, string> = {
  qa_reviewer: 'Validates implementation against acceptance criteria, runs tests, checks for issues',
  qa_fixer: 'Fixes issues found by QA reviewer',
  validation_fixer: 'Fixes validation errors in specs',
  coder: 'Main implementation agent that writes code',
  planner: 'Creates subtask-based implementation plans',
  coder_recovery: 'Recovers from stuck or failed coding sessions',
  followup_planner: 'Plans follow-up tasks after initial implementation',
  spec_gatherer: 'Collects user requirements interactively',
  spec_writer: 'Writes detailed spec.md documents',
  spec_quick: 'Quick spec creation for simple tasks',
  spec_critic: 'Self-critique using ultrathink for complex specs',
  spec_researcher: 'Researches external integrations and APIs',
  complexity_assessor: 'Analyzes task complexity to determine workflow',
  ideation_code_improvements: 'Suggests code improvements and refactoring',
  ideation_code_quality: 'Identifies code quality issues',
  ideation_documentation: 'Suggests documentation improvements',
  ideation_performance: 'Identifies performance optimization opportunities',
  ideation_security: 'Identifies security vulnerabilities',
  ideation_ui_ux: 'Suggests UI/UX improvements',
  roadmap_discovery: 'Discovers project context for roadmap generation',
  roadmap_features: 'Generates feature ideas for roadmap',
  competitor_analysis: 'Analyzes competitor products',
  insight_extractor: 'Extracts insights from coding sessions',
};

/** Get category for a prompt name */
export function getPromptCategory(promptName: string): PromptCategory | undefined {
  return PROMPT_CATEGORIES.find(cat => cat.prompts.includes(promptName));
}

/** Get description for a prompt name */
export function getPromptDescription(promptName: string): string {
  return PROMPT_DESCRIPTIONS[promptName] || 'No description available';
}

/**
 * Application configuration constants
 * Default settings, file paths, and project structure
 */

// ============================================
// Default App Settings
// ============================================

export const DEFAULT_APP_SETTINGS = {
  theme: 'system' as const,
  defaultModel: 'opus',
  agentFramework: 'auto-claude',
  pythonPath: undefined as string | undefined,
  autoBuildPath: undefined as string | undefined,
  autoUpdateAutoBuild: true,
  autoNameTerminals: true,
  onboardingCompleted: false,
  notifications: {
    onTaskComplete: true,
    onTaskFailed: true,
    onReviewNeeded: true,
    sound: false
  },
  // Provider settings
  activeProvider: 'claude' as const,
  providerModel: 'claude-opus-4-5-20251101',
  customCliTemplate: 'droid exec --model {model} --output-format stream-json --auto high',
  customCliWorkDir: undefined as string | undefined,
  customCliTokenEnvName: 'DROID_API_KEY',
  customCliTokenValue: undefined as string | undefined,
  // Global API keys (used as defaults for all projects)
  globalClaudeOAuthToken: undefined as string | undefined,
  globalOpenAIApiKey: undefined as string | undefined,
  globalGLMApiKey: undefined as string | undefined,
  globalGeminiApiKey: undefined as string | undefined,
  // Global API base URLs (for custom OpenAI-compatible endpoints)
  globalZaiBaseUrl: 'https://api.z.ai/api/coding/paas/v4',
  globalGeminiBaseUrl: undefined as string | undefined,
  globalOpenAIBaseUrl: 'https://api.openai.com/v1',
  globalOllamaBaseUrl: 'http://localhost:11434/v1',
  // Selected agent profile - defaults to 'balanced' for good speed/quality balance
  selectedAgentProfile: 'balanced',
  // Changelog preferences (persisted between sessions)
  changelogFormat: 'keep-a-changelog' as const,
  changelogAudience: 'user-facing' as const,
  changelogEmojiLevel: 'none' as const
};

// ============================================
// Default Project Settings
// ============================================

export const DEFAULT_PROJECT_SETTINGS = {
  model: 'opus',
  memoryBackend: 'kba-memory' as const,
  linearSync: false,
  notifications: {
    onTaskComplete: true,
    onTaskFailed: true,
    onReviewNeeded: true,
    sound: false
  },
  // Graphiti MCP server for agent-accessible knowledge graph
  graphitiMcpEnabled: false,
  graphitiMcpUrl: 'http://localhost:8000/mcp/',
  // KBA Memory server URL
  kbaMemoryUrl: 'http://localhost:3002'
};

// ============================================
// Auto Build File Paths
// ============================================

// File paths relative to project
// IMPORTANT: All paths use .auto-claude/ (the installed instance), NOT auto-claude/ (source code)
export const AUTO_BUILD_PATHS = {
  SPECS_DIR: '.auto-claude/specs',
  ROADMAP_DIR: '.auto-claude/roadmap',
  IDEATION_DIR: '.auto-claude/ideation',
  IMPLEMENTATION_PLAN: 'implementation_plan.json',
  SPEC_FILE: 'spec.md',
  QA_REPORT: 'qa_report.md',
  BUILD_PROGRESS: 'build-progress.txt',
  CONTEXT: 'context.json',
  REQUIREMENTS: 'requirements.json',
  ROADMAP_FILE: 'roadmap.json',
  ROADMAP_DISCOVERY: 'roadmap_discovery.json',
  COMPETITOR_ANALYSIS: 'competitor_analysis.json',
  IDEATION_FILE: 'ideation.json',
  IDEATION_CONTEXT: 'ideation_context.json',
  PROJECT_INDEX: '.auto-claude/project_index.json',
  GRAPHITI_STATE: '.graphiti_state.json'
} as const;

/**
 * Get the specs directory path.
 * All specs go to .auto-claude/specs/ (the project's data directory).
 */
export function getSpecsDir(autoBuildPath: string | undefined): string {
  const basePath = autoBuildPath || '.auto-claude';
  return `${basePath}/specs`;
}

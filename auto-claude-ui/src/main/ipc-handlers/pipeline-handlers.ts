/**
 * Pipeline Configuration and Prompt Editor IPC Handlers
 *
 * Handles:
 * - Reading/writing pipeline config from .auto-claude/config.json
 * - Listing, reading, saving, and versioning agent prompts
 */

import { ipcMain } from 'electron';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, copyFileSync } from 'fs';
import path from 'path';
import { IPC_CHANNELS } from '../../shared/constants';
import type { IPCResult, PipelineConfig, PromptInfo, PromptVersion, PromptMeta } from '../../shared/types';
import { DEFAULT_PIPELINE_CONFIG, PROMPT_CATEGORIES, getPromptCategory, getPromptDescription } from '../../shared/types';

/**
 * Get the auto-claude source path (for factory prompts)
 */
function getAutoBuildSourcePath(): string | null {
  const possiblePaths = [
    path.resolve(__dirname, '..', '..', '..', 'auto-claude'),
    path.resolve(__dirname, '..', '..', 'auto-claude'),
    path.resolve(process.cwd(), 'auto-claude'),
    path.resolve(process.cwd(), '..', 'auto-claude'),
  ];

  for (const p of possiblePaths) {
    if (existsSync(p) && existsSync(path.join(p, 'prompts'))) {
      return p;
    }
  }
  return null;
}

/**
 * Get the .auto-claude directory for a project
 */
function getAutoClaudeDir(projectPath: string): string {
  return path.join(projectPath, '.auto-claude');
}

/**
 * Ensure .auto-claude directory exists
 */
function ensureAutoClaudeDir(projectPath: string): string {
  const dir = getAutoClaudeDir(projectPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Register all pipeline and prompt IPC handlers
 */
export function registerPipelineHandlers(): void {
  // ============================================
  // Pipeline Configuration
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.PIPELINE_CONFIG_GET,
    async (_, projectPath: string): Promise<IPCResult<PipelineConfig>> => {
      try {
        const configPath = path.join(getAutoClaudeDir(projectPath), 'config.json');

        if (!existsSync(configPath)) {
          return { success: true, data: DEFAULT_PIPELINE_CONFIG };
        }

        const content = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        const pipelineConfig = config.pipeline || DEFAULT_PIPELINE_CONFIG;

        // Merge with defaults to ensure all fields exist
        const mergedConfig: PipelineConfig = {
          qa: { ...DEFAULT_PIPELINE_CONFIG.qa, ...pipelineConfig.qa },
          complexity: { ...DEFAULT_PIPELINE_CONFIG.complexity, ...pipelineConfig.complexity },
          phases: { ...DEFAULT_PIPELINE_CONFIG.phases, ...pipelineConfig.phases },
          approval: { ...DEFAULT_PIPELINE_CONFIG.approval, ...pipelineConfig.approval },
        };

        return { success: true, data: mergedConfig };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load pipeline config',
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PIPELINE_CONFIG_SAVE,
    async (_, projectPath: string, pipelineConfig: PipelineConfig): Promise<IPCResult> => {
      try {
        const autoClaudeDir = ensureAutoClaudeDir(projectPath);
        const configPath = path.join(autoClaudeDir, 'config.json');

        // Load existing config or create new
        let config: Record<string, unknown> = {};
        if (existsSync(configPath)) {
          const content = readFileSync(configPath, 'utf-8');
          config = JSON.parse(content);
        }

        // Update pipeline section
        config.pipeline = pipelineConfig;

        writeFileSync(configPath, JSON.stringify(config, null, 2));
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save pipeline config',
        };
      }
    }
  );

  // ============================================
  // Prompt Editor
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.PROMPTS_LIST,
    async (_, projectPath: string): Promise<IPCResult<PromptInfo[]>> => {
      try {
        const autoBuildSource = getAutoBuildSourcePath();
        if (!autoBuildSource) {
          return { success: false, error: 'Auto-claude source not found' };
        }

        const factoryPromptsDir = path.join(autoBuildSource, 'prompts');
        const projectPromptsDir = path.join(getAutoClaudeDir(projectPath), 'prompts');
        const metaPath = path.join(projectPromptsDir, '.meta.json');

        // Load metadata if exists
        let meta: PromptMeta = { prompts: {} };
        if (existsSync(metaPath)) {
          meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
        }

        // Get all factory prompts
        const factoryPrompts = readdirSync(factoryPromptsDir)
          .filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== 'AGENTS.md')
          .map(f => f.replace('.md', ''));

        // Build prompt info list
        const prompts: PromptInfo[] = factoryPrompts.map(name => {
          const projectOverride = path.join(projectPromptsDir, `${name}.md`);
          const isCustomized = existsSync(projectOverride);
          const promptMeta = meta.prompts[name];
          const category = getPromptCategory(name);

          // Build versions list
          const versions: PromptVersion[] = [
            { id: 'factory', name: 'Factory Default', readonly: true },
          ];

          // Add saved versions from meta
          if (promptMeta?.versions) {
            versions.push(...promptMeta.versions.filter(v => v.id !== 'factory'));
          }

          return {
            name,
            category: category?.name || 'Other',
            description: getPromptDescription(name),
            activeVersion: promptMeta?.activeVersion || (isCustomized ? 'custom' : 'factory'),
            versions,
            isCustomized,
          };
        });

        return { success: true, data: prompts };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list prompts',
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PROMPTS_GET_CONTENT,
    async (_, projectPath: string, promptName: string, versionId?: string): Promise<IPCResult<string>> => {
      try {
        const autoBuildSource = getAutoBuildSourcePath();
        if (!autoBuildSource) {
          return { success: false, error: 'Auto-claude source not found' };
        }

        const factoryPath = path.join(autoBuildSource, 'prompts', `${promptName}.md`);
        const projectPromptsDir = path.join(getAutoClaudeDir(projectPath), 'prompts');
        const projectPath_ = path.join(projectPromptsDir, `${promptName}.md`);
        const versionsDir = path.join(projectPromptsDir, '.versions', promptName);

        // Determine which file to read
        let filePath: string;

        if (versionId === 'factory' || !versionId) {
          // If no version specified, check for project override first
          if (!versionId && existsSync(projectPath_)) {
            filePath = projectPath_;
          } else {
            filePath = factoryPath;
          }
        } else {
          // Load specific version from archive
          const versionPath = path.join(versionsDir, `${versionId}.md`);
          if (existsSync(versionPath)) {
            filePath = versionPath;
          } else {
            return { success: false, error: `Version ${versionId} not found` };
          }
        }

        if (!existsSync(filePath)) {
          return { success: false, error: `Prompt ${promptName} not found` };
        }

        const content = readFileSync(filePath, 'utf-8');
        return { success: true, data: content };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to read prompt',
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PROMPTS_GET_FACTORY_DEFAULT,
    async (_, promptName: string): Promise<IPCResult<string>> => {
      try {
        const autoBuildSource = getAutoBuildSourcePath();
        if (!autoBuildSource) {
          return { success: false, error: 'Auto-claude source not found' };
        }

        const factoryPath = path.join(autoBuildSource, 'prompts', `${promptName}.md`);
        if (!existsSync(factoryPath)) {
          return { success: false, error: `Factory prompt ${promptName} not found` };
        }

        const content = readFileSync(factoryPath, 'utf-8');
        return { success: true, data: content };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to read factory prompt',
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PROMPTS_SAVE,
    async (_, projectPath: string, promptName: string, content: string, versionName?: string): Promise<IPCResult> => {
      try {
        const projectPromptsDir = path.join(getAutoClaudeDir(projectPath), 'prompts');
        const versionsDir = path.join(projectPromptsDir, '.versions', promptName);
        const metaPath = path.join(projectPromptsDir, '.meta.json');
        const activePath = path.join(projectPromptsDir, `${promptName}.md`);

        // Ensure directories exist
        mkdirSync(projectPromptsDir, { recursive: true });

        // Load or create metadata
        let meta: PromptMeta = { prompts: {} };
        if (existsSync(metaPath)) {
          meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
        }

        // If version name provided, save as new version
        if (versionName) {
          mkdirSync(versionsDir, { recursive: true });

          const timestamp = new Date().toISOString().split('T')[0];
          const versionId = `${timestamp}_${versionName.toLowerCase().replace(/\s+/g, '-')}`;
          const versionPath = path.join(versionsDir, `${versionId}.md`);

          writeFileSync(versionPath, content);

          // Update metadata
          if (!meta.prompts[promptName]) {
            meta.prompts[promptName] = { activeVersion: versionId, versions: [] };
          }

          meta.prompts[promptName].versions.push({
            id: versionId,
            name: versionName,
            createdAt: new Date().toISOString(),
          });
          meta.prompts[promptName].activeVersion = versionId;
        }

        // Always save to active file
        writeFileSync(activePath, content);

        // Update metadata active version if not already set
        if (!meta.prompts[promptName]) {
          meta.prompts[promptName] = { activeVersion: 'custom', versions: [] };
        }

        // Save metadata
        writeFileSync(metaPath, JSON.stringify(meta, null, 2));

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save prompt',
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PROMPTS_SET_ACTIVE_VERSION,
    async (_, projectPath: string, promptName: string, versionId: string): Promise<IPCResult> => {
      try {
        const autoBuildSource = getAutoBuildSourcePath();
        if (!autoBuildSource) {
          return { success: false, error: 'Auto-claude source not found' };
        }

        const projectPromptsDir = path.join(getAutoClaudeDir(projectPath), 'prompts');
        const versionsDir = path.join(projectPromptsDir, '.versions', promptName);
        const metaPath = path.join(projectPromptsDir, '.meta.json');
        const activePath = path.join(projectPromptsDir, `${promptName}.md`);
        const factoryPath = path.join(autoBuildSource, 'prompts', `${promptName}.md`);

        // Ensure directories exist
        mkdirSync(projectPromptsDir, { recursive: true });

        // Determine source file
        let sourcePath: string;
        if (versionId === 'factory') {
          sourcePath = factoryPath;
          // For factory, we delete the override file
          if (existsSync(activePath)) {
            unlinkSync(activePath);
          }
        } else {
          const versionPath = path.join(versionsDir, `${versionId}.md`);
          if (!existsSync(versionPath)) {
            return { success: false, error: `Version ${versionId} not found` };
          }
          sourcePath = versionPath;
          // Copy version to active
          copyFileSync(sourcePath, activePath);
        }

        // Update metadata
        let meta: PromptMeta = { prompts: {} };
        if (existsSync(metaPath)) {
          meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
        }

        if (!meta.prompts[promptName]) {
          meta.prompts[promptName] = { activeVersion: versionId, versions: [] };
        }
        meta.prompts[promptName].activeVersion = versionId;

        writeFileSync(metaPath, JSON.stringify(meta, null, 2));

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set active version',
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PROMPTS_DELETE_VERSION,
    async (_, projectPath: string, promptName: string, versionId: string): Promise<IPCResult> => {
      try {
        if (versionId === 'factory') {
          return { success: false, error: 'Cannot delete factory default' };
        }

        const projectPromptsDir = path.join(getAutoClaudeDir(projectPath), 'prompts');
        const versionsDir = path.join(projectPromptsDir, '.versions', promptName);
        const metaPath = path.join(projectPromptsDir, '.meta.json');
        const versionPath = path.join(versionsDir, `${versionId}.md`);

        // Delete version file
        if (existsSync(versionPath)) {
          unlinkSync(versionPath);
        }

        // Update metadata
        if (existsSync(metaPath)) {
          const meta: PromptMeta = JSON.parse(readFileSync(metaPath, 'utf-8'));

          if (meta.prompts[promptName]) {
            meta.prompts[promptName].versions = meta.prompts[promptName].versions.filter(
              v => v.id !== versionId
            );

            // If deleted version was active, switch to factory
            if (meta.prompts[promptName].activeVersion === versionId) {
              meta.prompts[promptName].activeVersion = 'factory';
              // Delete active override file
              const activePath = path.join(projectPromptsDir, `${promptName}.md`);
              if (existsSync(activePath)) {
                unlinkSync(activePath);
              }
            }

            writeFileSync(metaPath, JSON.stringify(meta, null, 2));
          }
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete version',
        };
      }
    }
  );
}

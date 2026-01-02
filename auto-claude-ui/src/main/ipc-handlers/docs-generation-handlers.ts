/**
 * Documentation Generation IPC Handlers
 * Handles AGENTS.md and README generation via AI agents
 */

import { ipcMain, app } from 'electron';
import type { BrowserWindow } from 'electron';
import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import path from 'path';
import { IPC_CHANNELS, AGENTS_MD_PROMPT, DOCS_GENERATION_SUMMARY_TAGS, DEFAULT_APP_SETTINGS } from '../../shared/constants';
import type { IPCResult, AppSettings } from '../../shared/types';
import { projectStore } from '../project-store';

interface DocsGenerationResult {
  success: boolean;
  filesCreated: string[];
  filesModified: string[];
  summary: string;
}

interface GitDiffResult {
  filesCreated: string[];
  filesModified: string[];
}

const DEFAULT_KBA_URL = 'http://localhost:3002';

/**
 * Load app settings
 */
function loadSettings(): AppSettings {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  try {
    if (existsSync(settingsPath)) {
      const content = readFileSync(settingsPath, 'utf-8');
      return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(content) };
    }
  } catch {
    // Return defaults on error
  }
  return DEFAULT_APP_SETTINGS;
}

/**
 * Get CLI command based on provider settings
 */
function getCliCommand(settings: AppSettings): { command: string; args: string[] } {
  const provider = settings.activeProvider || 'claude';
  
  switch (provider) {
    case 'claude':
      return { command: 'claude', args: ['--print'] };
    
    case 'custom':
    case 'droid': {
      // Parse the custom CLI template
      const template = settings.customCliTemplate || 'droid exec --model {model} --output-format stream-json --auto high';
      // Remove --output-format stream-json for print mode, and replace {model}
      const model = settings.providerModel || 'claude-sonnet-4-20250514';
      let cmd = template
        .replace('--output-format stream-json', '')
        .replace('{model}', model)
        .trim();
      
      // For droid, we need to add -p for print mode
      const parts = cmd.split(' ');
      return { command: parts[0], args: [...parts.slice(1), '-p'] };
    }
    
    case 'gemini':
      return { command: 'gemini', args: ['--print'] };
    
    case 'openai':
      return { command: 'openai', args: ['--print'] };
    
    default:
      return { command: 'claude', args: ['--print'] };
  }
}

/**
 * Get git diff to detect what files changed
 */
async function getGitDiff(projectPath: string): Promise<GitDiffResult> {
  return new Promise((resolve) => {
    const proc = spawn('git', ['status', '--porcelain'], {
      cwd: projectPath,
      env: process.env
    });

    let stdout = '';
    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.on('close', () => {
      const filesCreated: string[] = [];
      const filesModified: string[] = [];

      const lines = stdout.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        const status = line.substring(0, 2).trim();
        const filePath = line.substring(3).trim();

        // Filter for AGENTS.md and README files
        if (filePath.includes('AGENTS.md') || filePath.includes('README.md') || filePath.includes('README')) {
          if (status === '??' || status === 'A') {
            filesCreated.push(filePath);
          } else if (status === 'M' || status === 'MM') {
            filesModified.push(filePath);
          }
        }
      }

      resolve({ filesCreated, filesModified });
    });

    proc.on('error', () => {
      resolve({ filesCreated: [], filesModified: [] });
    });
  });
}

/**
 * Store doc generation summary in KBA memory
 */
async function storeDocsInKBA(
  projectName: string,
  kbaUrl: string,
  filesCreated: string[],
  filesModified: string[],
  projectPath: string
): Promise<boolean> {
  try {
    // Get or create collection
    const collectionsRes = await fetch(`${kbaUrl}/api/collections`);
    if (!collectionsRes.ok) return false;

    const collections = await collectionsRes.json();
    let collection = Array.isArray(collections)
      ? collections.find((c: { name?: string }) => c.name?.toLowerCase() === projectName.toLowerCase())
      : null;

    if (!collection) {
      const createRes = await fetch(`${kbaUrl}/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          description: `Knowledge base for project: ${projectName}`
        })
      });
      if (!createRes.ok) return false;
      collection = await createRes.json();
    }

    // Build summary content
    const allFiles = [...filesCreated, ...filesModified];
    let summaryContent = `# Documentation Generated\n\n`;
    summaryContent += `Generated on: ${new Date().toISOString()}\n\n`;

    if (filesCreated.length > 0) {
      summaryContent += `## Files Created\n`;
      for (const file of filesCreated) {
        summaryContent += `- \`${file}\`\n`;
      }
      summaryContent += '\n';
    }

    if (filesModified.length > 0) {
      summaryContent += `## Files Modified\n`;
      for (const file of filesModified) {
        summaryContent += `- \`${file}\`\n`;
      }
      summaryContent += '\n';
    }

    // Include content preview from main AGENTS.md if it exists
    const rootAgentsMd = path.join(projectPath, 'AGENTS.md');
    if (existsSync(rootAgentsMd)) {
      const content = readFileSync(rootAgentsMd, 'utf-8');
      const preview = content.substring(0, 2000);
      summaryContent += `## Root AGENTS.md Preview\n\n\`\`\`markdown\n${preview}${content.length > 2000 ? '\n...(truncated)' : ''}\n\`\`\`\n`;
    }

    // Create note
    const noteRes = await fetch(`${kbaUrl}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collectionId: collection.id,
        title: `AGENTS.md Documentation - ${new Date().toLocaleDateString()}`,
        content: summaryContent,
        tags: DOCS_GENERATION_SUMMARY_TAGS
      })
    });

    return noteRes.ok;
  } catch (error) {
    console.error('[Docs Generation] Failed to store in KBA:', error);
    return false;
  }
}

export function registerDocsGenerationHandlers(
  getMainWindow: () => BrowserWindow | null
): void {
  // Generate documentation
  ipcMain.handle(
    IPC_CHANNELS.DOCS_GENERATE,
    async (_, projectId: string): Promise<IPCResult<DocsGenerationResult>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const mainWindow = getMainWindow();

      try {
        // Emit progress start
        if (mainWindow) {
          mainWindow.webContents.send(IPC_CHANNELS.DOCS_GENERATION_PROGRESS, {
            projectId,
            phase: 'starting',
            message: 'Starting documentation generation...'
          });
        }

        // Get git baseline before generation
        const baselineDiff = await getGitDiff(project.path);

        // Emit progress
        if (mainWindow) {
          mainWindow.webContents.send(IPC_CHANNELS.DOCS_GENERATION_PROGRESS, {
            projectId,
            phase: 'running',
            message: 'AI agent is analyzing codebase and generating documentation...'
          });
        }

        // Get CLI command based on provider settings
        const settings = loadSettings();
        const { command, args } = getCliCommand(settings);

        // Write prompt to temp file to avoid command-line length limits
        const promptDir = path.join(project.path, '.auto-claude');
        const promptFile = path.join(promptDir, '.docs-prompt.md');
        
        if (!existsSync(promptDir)) {
          mkdirSync(promptDir, { recursive: true });
        }
        writeFileSync(promptFile, AGENTS_MD_PROMPT, 'utf-8');

        // Build the full command with args
        const fullArgs = args.join(' ');
        
        // Run agent: cat prompt file and pipe to the configured CLI
        const agentProcess = spawn('sh', ['-c', `cat "${promptFile}" | ${command} ${fullArgs}`], {
          cwd: project.path,
          env: {
            ...process.env,
            ANTHROPIC_MODEL: settings.providerModel || 'claude-sonnet-4-20250514'
          }
        });

        let stdout = '';
        let stderr = '';

        agentProcess.stdout?.on('data', (data) => {
          const chunk = data.toString();
          stdout += chunk;
          
          // Emit progress with latest output
          if (mainWindow) {
            const lines = chunk.split('\n').filter((l: string) => l.trim());
            const lastLine = lines[lines.length - 1] || 'Processing...';
            mainWindow.webContents.send(IPC_CHANNELS.DOCS_GENERATION_PROGRESS, {
              projectId,
              phase: 'running',
              message: lastLine.substring(0, 200)
            });
          }
        });

        agentProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        // Wait for process to complete
        const exitCode = await new Promise<number | null>((resolve) => {
          agentProcess.on('close', resolve);
          agentProcess.on('error', () => resolve(1));
        });

        // Clean up temp file
        try {
          unlinkSync(promptFile);
        } catch {
          // Ignore cleanup errors
        }

        if (exitCode !== 0) {
          if (mainWindow) {
            mainWindow.webContents.send(IPC_CHANNELS.DOCS_GENERATION_ERROR, {
              projectId,
              error: stderr || 'Agent exited with error'
            });
          }
          return {
            success: false,
            error: stderr || 'Documentation generation failed'
          };
        }

        // Get diff after generation
        const afterDiff = await getGitDiff(project.path);

        // Calculate new files (not in baseline)
        const filesCreated = afterDiff.filesCreated.filter(
          f => !baselineDiff.filesCreated.includes(f) && !baselineDiff.filesModified.includes(f)
        );
        const filesModified = afterDiff.filesModified.filter(
          f => !baselineDiff.filesModified.includes(f)
        );

        // Also include any AGENTS.md that are now modified
        const allChanged = [...new Set([...filesCreated, ...filesModified])];

        // Store in KBA memory
        const kbaUrl = project.settings.kbaMemoryUrl || DEFAULT_KBA_URL;
        await storeDocsInKBA(project.name, kbaUrl, filesCreated, filesModified, project.path);

        const result: DocsGenerationResult = {
          success: true,
          filesCreated,
          filesModified,
          summary: allChanged.length > 0
            ? `Created/updated ${allChanged.length} documentation file(s)`
            : 'Documentation generation completed (no new files detected)'
        };

        // Emit completion
        if (mainWindow) {
          mainWindow.webContents.send(IPC_CHANNELS.DOCS_GENERATION_COMPLETE, {
            projectId,
            result
          });
        }

        return { success: true, data: result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (mainWindow) {
          mainWindow.webContents.send(IPC_CHANNELS.DOCS_GENERATION_ERROR, {
            projectId,
            error: errorMessage
          });
        }

        return { success: false, error: errorMessage };
      }
    }
  );

  // Get changed doc files (for manual check)
  ipcMain.handle(
    IPC_CHANNELS.DOCS_GET_CHANGES,
    async (_, projectId: string): Promise<IPCResult<GitDiffResult>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const diff = await getGitDiff(project.path);
      return { success: true, data: diff };
    }
  );
}

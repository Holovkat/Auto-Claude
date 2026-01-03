/**
 * Pipeline Configuration and Prompt Editor API
 *
 * Provides preload API for pipeline settings and prompt management
 */

import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants';
import type { IPCResult, PipelineConfig, PromptInfo } from '../../../shared/types';

export interface PipelineAPI {
  // Pipeline configuration
  getPipelineConfig: (projectPath: string) => Promise<IPCResult<PipelineConfig>>;
  savePipelineConfig: (projectPath: string, config: PipelineConfig) => Promise<IPCResult>;

  // Prompt management
  listPrompts: (projectPath: string) => Promise<IPCResult<PromptInfo[]>>;
  getPromptContent: (projectPath: string, promptName: string, versionId?: string) => Promise<IPCResult<string>>;
  savePrompt: (projectPath: string, promptName: string, content: string, versionName?: string) => Promise<IPCResult>;
  setActivePromptVersion: (projectPath: string, promptName: string, versionId: string) => Promise<IPCResult>;
  deletePromptVersion: (projectPath: string, promptName: string, versionId: string) => Promise<IPCResult>;
  getFactoryPrompt: (promptName: string) => Promise<IPCResult<string>>;
}

export const createPipelineAPI = (): PipelineAPI => ({
  // Pipeline configuration
  getPipelineConfig: (projectPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_CONFIG_GET, projectPath),

  savePipelineConfig: (projectPath: string, config: PipelineConfig) =>
    ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_CONFIG_SAVE, projectPath, config),

  // Prompt management
  listPrompts: (projectPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_LIST, projectPath),

  getPromptContent: (projectPath: string, promptName: string, versionId?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_GET_CONTENT, projectPath, promptName, versionId),

  savePrompt: (projectPath: string, promptName: string, content: string, versionName?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_SAVE, projectPath, promptName, content, versionName),

  setActivePromptVersion: (projectPath: string, promptName: string, versionId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_SET_ACTIVE_VERSION, projectPath, promptName, versionId),

  deletePromptVersion: (projectPath: string, promptName: string, versionId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_DELETE_VERSION, projectPath, promptName, versionId),

  getFactoryPrompt: (promptName: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_GET_FACTORY_DEFAULT, promptName),
});

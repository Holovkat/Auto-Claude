import { Database, Globe } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { InfrastructureStatus } from './InfrastructureStatus';
import { PasswordInput } from './PasswordInput';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import type { ProjectEnvConfig, ProjectSettings, InfrastructureStatus as InfrastructureStatusType } from '../../../shared/types';

interface MemoryBackendSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  envConfig: ProjectEnvConfig;
  settings: ProjectSettings;
  onUpdateConfig: (updates: Partial<ProjectEnvConfig>) => void;
  onUpdateSettings: (updates: Partial<ProjectSettings>) => void;
  infrastructureStatus: InfrastructureStatusType | null;
  isCheckingInfrastructure: boolean;
  isStartingFalkorDB: boolean;
  isOpeningDocker: boolean;
  onStartFalkorDB: () => void;
  onOpenDockerDesktop: () => void;
  onDownloadDocker: () => void;
}

export function MemoryBackendSection({
  isExpanded,
  onToggle,
  envConfig,
  settings,
  onUpdateConfig,
  onUpdateSettings,
  infrastructureStatus,
  isCheckingInfrastructure,
  isStartingFalkorDB,
  isOpeningDocker,
  onStartFalkorDB,
  onOpenDockerDesktop,
  onDownloadDocker,
}: MemoryBackendSectionProps) {
  const memoryBackend = settings.memoryBackend || 'kba-memory';
  
  const badgeText = memoryBackend === 'kba-memory' ? 'KBA Memory' : 
                    memoryBackend === 'graphiti' ? 'Graphiti' : 'File-based';
  const badgeClass = memoryBackend !== 'file' 
    ? 'bg-success/10 text-success' 
    : 'bg-muted text-muted-foreground';
  
  const badge = (
    <span className={`px-2 py-0.5 text-xs rounded-full ${badgeClass}`}>
      {badgeText}
    </span>
  );

  return (
    <CollapsibleSection
      title="Memory Backend"
      icon={<Database className="h-4 w-4" />}
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={badge}
    >
      {/* Memory Backend Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Memory Backend</Label>
        <p className="text-xs text-muted-foreground">
          Choose how agent memory is stored and retrieved
        </p>
        <Select
          value={memoryBackend}
          onValueChange={(value: 'graphiti' | 'kba-memory' | 'file') => {
            onUpdateSettings({ memoryBackend: value });
            // Sync graphitiEnabled with backend selection
            onUpdateConfig({ graphitiEnabled: value === 'graphiti' });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select memory backend" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kba-memory">KBA Memory (Recommended)</SelectItem>
            <SelectItem value="graphiti">Graphiti (Graph DB)</SelectItem>
            <SelectItem value="file">File-based (Local JSON)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KBA Memory Settings */}
      {memoryBackend === 'kba-memory' && (
        <div className="space-y-4 mt-4">
          <div className="rounded-lg border border-success/30 bg-success/5 p-3">
            <p className="text-xs text-success">
              Using KBA Memory with Qdrant vector database and Ollama embeddings.
              Each project gets its own isolated collection.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">KBA Memory Server URL</Label>
            <p className="text-xs text-muted-foreground">
              URL of your KBA Memory server
            </p>
            <Input
              placeholder="http://localhost:3002"
              value={settings.kbaMemoryUrl || ''}
              onChange={(e) => onUpdateSettings({ kbaMemoryUrl: e.target.value || undefined })}
            />
          </div>
        </div>
      )}

      {/* File-based info */}
      {memoryBackend === 'file' && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 mt-4">
          <p className="text-xs text-muted-foreground">
            Using file-based memory. Session insights are stored locally in JSON files.
            No external services required, but no semantic search or cross-session memory.
          </p>
        </div>
      )}

      {/* Graphiti Settings */}
      {memoryBackend === 'graphiti' && (
        <>
          {/* Infrastructure Status - Dynamic Docker/FalkorDB check */}
          <InfrastructureStatus
            infrastructureStatus={infrastructureStatus}
            isCheckingInfrastructure={isCheckingInfrastructure}
            isStartingFalkorDB={isStartingFalkorDB}
            isOpeningDocker={isOpeningDocker}
            onStartFalkorDB={onStartFalkorDB}
            onOpenDockerDesktop={onOpenDockerDesktop}
            onDownloadDocker={onDownloadDocker}
          />

          {/* Graphiti MCP Server Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-normal text-foreground">Enable Agent Memory Access</Label>
              <p className="text-xs text-muted-foreground">
                Allow agents to search and add to the knowledge graph via MCP
              </p>
            </div>
            <Switch
              checked={settings.graphitiMcpEnabled}
              onCheckedChange={(checked) =>
                onUpdateSettings({ graphitiMcpEnabled: checked })
              }
            />
          </div>

          {settings.graphitiMcpEnabled && (
            <div className="space-y-2 ml-6">
              <Label className="text-sm font-medium text-foreground">Graphiti MCP Server URL</Label>
              <p className="text-xs text-muted-foreground">
                URL of the Graphiti MCP server (requires Docker container)
              </p>
              <Input
                placeholder="http://localhost:8000/mcp/"
                value={settings.graphitiMcpUrl || ''}
                onChange={(e) => onUpdateSettings({ graphitiMcpUrl: e.target.value || undefined })}
              />
              <div className="rounded-lg border border-info/30 bg-info/5 p-3">
                <p className="text-xs text-info">
                  Start the MCP server with:{' '}
                  <code className="px-1 bg-info/10 rounded">docker run -d -p 8000:8000 falkordb/graphiti-knowledge-graph-mcp</code>
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* LLM Provider Selection - V2 Multi-provider support */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">LLM Provider</Label>
            <p className="text-xs text-muted-foreground">
              Provider for graph operations (extraction, search, reasoning)
            </p>
            <Select
              value={envConfig.graphitiProviderConfig?.llmProvider || 'openai'}
              onValueChange={(value) => onUpdateConfig({
                graphitiProviderConfig: {
                  ...envConfig.graphitiProviderConfig,
                  llmProvider: value as 'openai' | 'anthropic' | 'google' | 'groq',
                  embeddingProvider: envConfig.graphitiProviderConfig?.embeddingProvider || 'openai',
                }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select LLM provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI (GPT-5-mini)</SelectItem>
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                <SelectItem value="google">Google (Gemini)</SelectItem>
                <SelectItem value="groq">Groq (Llama)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Embedding Provider Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Embedding Provider</Label>
            <p className="text-xs text-muted-foreground">
              Provider for semantic search embeddings
            </p>
            <Select
              value={envConfig.graphitiProviderConfig?.embeddingProvider || 'openai'}
              onValueChange={(value) => onUpdateConfig({
                graphitiProviderConfig: {
                  ...envConfig.graphitiProviderConfig,
                  llmProvider: envConfig.graphitiProviderConfig?.llmProvider || 'openai',
                  embeddingProvider: value as 'openai' | 'voyage' | 'google' | 'huggingface',
                }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select embedding provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="voyage">Voyage AI</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="huggingface">HuggingFace (Local)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">
                OpenAI API Key {envConfig.openaiKeyIsGlobal ? '(Override)' : ''}
              </Label>
              {envConfig.openaiKeyIsGlobal && (
                <span className="flex items-center gap-1 text-xs text-info">
                  <Globe className="h-3 w-3" />
                  Using global key
                </span>
              )}
            </div>
            {envConfig.openaiKeyIsGlobal ? (
              <p className="text-xs text-muted-foreground">
                Using key from App Settings. Enter a project-specific key below to override.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Required when using OpenAI as LLM or embedding provider
              </p>
            )}
            <PasswordInput
              value={envConfig.openaiKeyIsGlobal ? '' : (envConfig.openaiApiKey || '')}
              onChange={(value) => onUpdateConfig({ openaiApiKey: value || undefined })}
              placeholder={envConfig.openaiKeyIsGlobal ? 'Enter to override global key...' : 'sk-xxxxxxxx'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">FalkorDB Host</Label>
              <Input
                placeholder="localhost"
                value={envConfig.graphitiFalkorDbHost || ''}
                onChange={(e) => onUpdateConfig({ graphitiFalkorDbHost: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">FalkorDB Port</Label>
              <Input
                type="number"
                placeholder="6380"
                value={envConfig.graphitiFalkorDbPort || ''}
                onChange={(e) => onUpdateConfig({ graphitiFalkorDbPort: parseInt(e.target.value) || undefined })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">FalkorDB Password (Optional)</Label>
            <PasswordInput
              value={envConfig.graphitiFalkorDbPassword || ''}
              onChange={(value) => onUpdateConfig({ graphitiFalkorDbPassword: value })}
              placeholder="Leave empty if none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Database Name</Label>
            <Input
              placeholder="auto_claude_memory"
              value={envConfig.graphitiDatabase || ''}
              onChange={(e) => onUpdateConfig({ graphitiDatabase: e.target.value })}
            />
          </div>
        </>
      )}
    </CollapsibleSection>
  );
}

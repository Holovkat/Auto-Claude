/**
 * Pipeline Settings Component
 *
 * Configures QA iterations, complexity detection, phase skipping, and approval settings
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import type { PipelineConfig, ComplexityMode, Project } from '../../../shared/types';
import { DEFAULT_PIPELINE_CONFIG } from '../../../shared/types';

interface PipelineSettingsProps {
  project: Project;
}

export function PipelineSettings({ project }: PipelineSettingsProps) {
  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_PIPELINE_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await window.electronAPI.getPipelineConfig(project.path);
        if (result.success && result.data) {
          setConfig(result.data);
        } else {
          setError(result.error || 'Failed to load pipeline config');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load config');
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, [project.path]);

  // Update a nested config value
  const updateConfig = useCallback(<K extends keyof PipelineConfig>(
    section: K,
    key: keyof PipelineConfig[K],
    value: PipelineConfig[K][keyof PipelineConfig[K]]
  ) => {
    setConfig((prev: PipelineConfig) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  }, []);

  // Save config
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await window.electronAPI.savePipelineConfig(project.path, config);
      if (!result.success) {
        setError(result.error || 'Failed to save config');
      } else {
        setHasChanges(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setConfig(DEFAULT_PIPELINE_CONFIG);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* QA Settings */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium">QA Validation</h4>
          <p className="text-xs text-muted-foreground">Control how many QA iterations are allowed</p>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="maxIterations">Max QA Iterations</Label>
              <p className="text-xs text-muted-foreground">For standard/complex tasks (default: 10)</p>
            </div>
            <Input
              id="maxIterations"
              type="number"
              min={1}
              max={100}
              className="w-20"
              value={config.qa.maxIterations}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('qa', 'maxIterations', parseInt(e.target.value) || 10)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="simpleMaxIterations">Simple Task Max Iterations</Label>
              <p className="text-xs text-muted-foreground">For simple tasks (default: 3)</p>
            </div>
            <Input
              id="simpleMaxIterations"
              type="number"
              min={1}
              max={50}
              className="w-20"
              value={config.qa.simpleTaskMaxIterations}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('qa', 'simpleTaskMaxIterations', parseInt(e.target.value) || 3)}
            />
          </div>
        </div>
      </div>

      {/* Complexity Settings */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium">Complexity Detection</h4>
          <p className="text-xs text-muted-foreground">How task complexity is determined</p>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="complexityMode">Detection Mode</Label>
              <p className="text-xs text-muted-foreground">How to assess task complexity</p>
            </div>
            <Select
              value={config.complexity.mode}
              onValueChange={(value: ComplexityMode) => updateConfig('complexity', 'mode', value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heuristics">Heuristics</SelectItem>
                <SelectItem value="auto">Auto (AI)</SelectItem>
                <SelectItem value="simple">Always Simple</SelectItem>
                <SelectItem value="standard">Always Standard</SelectItem>
                <SelectItem value="complex">Always Complex</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="useAiAssessment">Use AI Assessment</Label>
              <p className="text-xs text-muted-foreground">Use AI to assess complexity (slower but more accurate)</p>
            </div>
            <Switch
              id="useAiAssessment"
              checked={config.complexity.useAiAssessment}
              onCheckedChange={(checked: boolean) => updateConfig('complexity', 'useAiAssessment', checked)}
            />
          </div>

          {config.complexity.useAiAssessment && (
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="aiProvider">AI Provider</Label>
                <p className="text-xs text-muted-foreground">Provider for complexity assessment</p>
              </div>
              <Select
                value={config.complexity.aiProvider}
                onValueChange={(value: 'droid' | 'claude' | 'openai' | 'gemini' | 'ollama') => updateConfig('complexity', 'aiProvider', value)}
              >
                <SelectTrigger id="aiProvider" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="droid">Droid</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="ollama">Ollama</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Phase Settings */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium">Phase Optimization</h4>
          <p className="text-xs text-muted-foreground">Skip unnecessary phases to speed up builds</p>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="skipResearch">Skip Research Phase</Label>
              <p className="text-xs text-muted-foreground">Skip when no external dependencies detected</p>
            </div>
            <Switch
              id="skipResearch"
              checked={config.phases.skipResearch}
              onCheckedChange={(checked: boolean) => updateConfig('phases', 'skipResearch', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="skipSelfCritique">Skip Self-Critique Phase</Label>
              <p className="text-xs text-muted-foreground">Skip ultrathink self-critique for specs</p>
            </div>
            <Switch
              id="skipSelfCritique"
              checked={config.phases.skipSelfCritique}
              onCheckedChange={(checked: boolean) => updateConfig('phases', 'skipSelfCritique', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="skipHistoricalContext">Skip Historical Context</Label>
              <p className="text-xs text-muted-foreground">Skip loading past session context</p>
            </div>
            <Switch
              id="skipHistoricalContext"
              checked={config.phases.skipHistoricalContext}
              onCheckedChange={(checked: boolean) => updateConfig('phases', 'skipHistoricalContext', checked)}
            />
          </div>
        </div>
      </div>

      {/* Approval Settings */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium">Approval Settings</h4>
          <p className="text-xs text-muted-foreground">Control review checkpoints</p>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoApproveSpecs">Auto-Approve Specs</Label>
              <p className="text-xs text-muted-foreground">Skip manual spec review checkpoint</p>
            </div>
            <Switch
              id="autoApproveSpecs"
              checked={config.approval.autoApproveSpecs}
              onCheckedChange={(checked: boolean) => updateConfig('approval', 'autoApproveSpecs', checked)}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}

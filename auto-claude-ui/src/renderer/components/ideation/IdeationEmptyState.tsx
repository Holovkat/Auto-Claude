import { Lightbulb, Settings2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  IDEATION_TYPE_LABELS,
  IDEATION_PROVIDERS
} from '../../../shared/constants';
import type { IdeationType, IdeationConfig } from '../../../shared/types';
import { TypeIcon } from './TypeIcon';
import { ALL_IDEATION_TYPES } from './constants';

interface IdeationEmptyStateProps {
  config: IdeationConfig;
  hasToken: boolean | null;
  isCheckingToken: boolean;
  onGenerate: () => void;
  onOpenConfig: () => void;
  onToggleIdeationType: (type: IdeationType) => void;
  onProviderChange?: (provider: IdeationConfig['provider']) => void;
}

export function IdeationEmptyState({
  config,
  hasToken,
  isCheckingToken,
  onGenerate,
  onOpenConfig,
  onToggleIdeationType,
  onProviderChange
}: IdeationEmptyStateProps) {
  const needsClaudeToken = config.provider === 'claude' && hasToken === false;
  
  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-lg p-8 text-center">
        <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Ideas Yet</h2>
        <p className="text-muted-foreground mb-6">
          Generate AI-powered feature ideas based on your project's context,
          existing patterns, and target audience.
        </p>

        {/* Provider Selection */}
        <div className="mb-4 p-4 bg-muted/50 rounded-lg text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">AI Provider</span>
          </div>
          <Select
            value={config.provider || 'claude'}
            onValueChange={(value) => onProviderChange?.(value as IdeationConfig['provider'])}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {IDEATION_PROVIDERS.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  <div className="flex flex-col">
                    <span>{provider.name}</span>
                    <span className="text-xs text-muted-foreground">{provider.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Configuration Preview */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Enabled Ideation Types</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenConfig}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {ALL_IDEATION_TYPES.map((type) => (
              <div
                key={type}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <TypeIcon type={type} />
                  <span className="text-sm">{IDEATION_TYPE_LABELS[type]}</span>
                </div>
                <Switch
                  checked={config.enabledTypes.includes(type)}
                  onCheckedChange={() => onToggleIdeationType(type)}
                />
              </div>
            ))}
          </div>
        </div>

        <Button onClick={onGenerate} size="lg" disabled={isCheckingToken}>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Ideas
        </Button>

        {/* Show warning if Claude token is missing and Claude is selected */}
        {needsClaudeToken && !isCheckingToken && (
          <p className="mt-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 inline-block mr-1 text-warning" />
            Claude token not configured. You'll be prompted to enter it when generating.
          </p>
        )}
      </Card>
    </div>
  );
}

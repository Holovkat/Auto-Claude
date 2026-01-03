/**
 * Prompts Page
 *
 * Main page for viewing and editing agent prompts
 */

import { useState, useEffect, useCallback } from 'react';
import { FileText, Search, RefreshCw, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';
import { PromptEditor } from './PromptEditor';
import { useProjectStore } from '../../stores/project-store';
import type { PromptInfo } from '../../../shared/types';
import { PROMPT_CATEGORIES } from '../../../shared/types';

export function PromptsPage() {
  const selectedProject = useProjectStore((state) => {
    const projects = state.projects;
    const selectedId = state.selectedProjectId;
    return projects.find((p) => p.id === selectedId);
  });

  const [prompts, setPrompts] = useState<PromptInfo[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load prompts
  const loadPrompts = useCallback(async () => {
    if (!selectedProject) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.listPrompts(selectedProject.path);
      if (result.success && result.data) {
        setPrompts(result.data);
        // Select first prompt if none selected
        if (!selectedPrompt && result.data.length > 0) {
          setSelectedPrompt(result.data[0].name);
        }
      } else {
        setError(result.error || 'Failed to load prompts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, selectedPrompt]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // Filter prompts by search
  const filteredPrompts = prompts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group prompts by category
  const groupedPrompts = PROMPT_CATEGORIES.map((cat) => ({
    ...cat,
    prompts: filteredPrompts.filter((p) => p.category === cat.name),
  })).filter((cat) => cat.prompts.length > 0);

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a project to view prompts
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - Prompt List */}
      <div className="w-72 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5" />
            <h2 className="font-semibold">Agent Prompts</h2>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={loadPrompts}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-destructive">{error}</div>
          ) : (
            <div className="p-2">
              {groupedPrompts.map((category) => (
                <div key={category.id} className="mb-4">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {category.name}
                  </div>
                  <div className="space-y-1">
                    {category.prompts.map((prompt) => (
                      <button
                        key={prompt.name}
                        onClick={() => setSelectedPrompt(prompt.name)}
                        className={cn(
                          "w-full text-left px-2 py-2 rounded-md text-sm transition-colors",
                          selectedPrompt === prompt.name
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{prompt.name}</span>
                          {prompt.isCustomized && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {prompt.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Content - Prompt Editor */}
      <div className="flex-1">
        {selectedPrompt ? (
          <PromptEditor
            projectPath={selectedProject.path}
            promptName={selectedPrompt}
            onSaved={loadPrompts}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a prompt to view and edit
          </div>
        )}
      </div>
    </div>
  );
}

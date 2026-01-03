/**
 * Prompt Editor Component
 *
 * Displays and edits a single prompt with version management
 * Shows markdown preview by default, with edit mode for plain text editing
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Save,
  RotateCcw,
  History,
  Trash2,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
  Eye,
  Pencil,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { cn } from '../../lib/utils';
import type { PromptInfo } from '../../../shared/types';

interface PromptEditorProps {
  projectPath: string;
  promptName: string;
  onSaved?: () => void;
}

export function PromptEditor({ projectPath, promptName, onSaved }: PromptEditorProps) {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [promptInfo, setPromptInfo] = useState<PromptInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Version dialog state
  const [showSaveVersionDialog, setShowSaveVersionDialog] = useState(false);
  const [versionName, setVersionName] = useState('');

  // Load prompt content
  const loadPrompt = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Load prompt list to get info
      const listResult = await window.electronAPI.listPrompts(projectPath);
      if (listResult.success && listResult.data) {
        const info = listResult.data.find((p: PromptInfo) => p.name === promptName);
        setPromptInfo(info || null);
      }

      // Load content
      const contentResult = await window.electronAPI.getPromptContent(
        projectPath,
        promptName
      );
      if (contentResult.success && contentResult.data) {
        setContent(contentResult.data);
        setOriginalContent(contentResult.data);
      } else {
        setError(contentResult.error || 'Failed to load prompt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompt');
    } finally {
      setIsLoading(false);
    }
  }, [projectPath, promptName]);

  useEffect(() => {
    loadPrompt();
  }, [loadPrompt]);

  const hasChanges = content !== originalContent;

  // Save without version
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await window.electronAPI.savePrompt(
        projectPath,
        promptName,
        content
      );
      if (result.success) {
        setOriginalContent(content);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        onSaved?.();
      } else {
        setError(result.error || 'Failed to save prompt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setIsSaving(false);
    }
  };

  // Save as new version
  const handleSaveVersion = async () => {
    if (!versionName.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
      const result = await window.electronAPI.savePrompt(
        projectPath,
        promptName,
        content,
        versionName.trim()
      );
      if (result.success) {
        setOriginalContent(content);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        setShowSaveVersionDialog(false);
        setVersionName('');
        onSaved?.();
        loadPrompt(); // Reload to get updated versions
      } else {
        setError(result.error || 'Failed to save version');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save version');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to factory default
  const handleResetToFactory = async () => {
    try {
      const result = await window.electronAPI.setActivePromptVersion(
        projectPath,
        promptName,
        'factory'
      );
      if (result.success) {
        loadPrompt();
        onSaved?.();
      } else {
        setError(result.error || 'Failed to reset to factory');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset');
    }
  };

  // Switch to a version
  const handleSwitchVersion = async (versionId: string) => {
    try {
      const result = await window.electronAPI.setActivePromptVersion(
        projectPath,
        promptName,
        versionId
      );
      if (result.success) {
        loadPrompt();
        onSaved?.();
      } else {
        setError(result.error || 'Failed to switch version');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch version');
    }
  };

  // Delete a version
  const handleDeleteVersion = async (versionId: string) => {
    try {
      const result = await window.electronAPI.deletePromptVersion(
        projectPath,
        promptName,
        versionId
      );
      if (result.success) {
        loadPrompt();
        onSaved?.();
      } else {
        setError(result.error || 'Failed to delete version');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete version');
    }
  };

  // View factory default (compare)
  const handleViewFactory = async () => {
    try {
      const result = await window.electronAPI.getFactoryPrompt(promptName);
      if (result.success && result.data) {
        setContent(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load factory default');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold">{promptName}.md</h2>
          <p className="text-sm text-muted-foreground">
            {promptInfo?.description || 'Agent prompt'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Version selector */}
          {promptInfo && promptInfo.versions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  {promptInfo.activeVersion === 'factory'
                    ? 'System Default'
                    : promptInfo.versions.find((v) => v.id === promptInfo.activeVersion)
                        ?.name || 'Custom'}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {promptInfo.versions.map((version) => (
                  <DropdownMenuItem
                    key={version.id}
                    onClick={() => handleSwitchVersion(version.id)}
                    className="flex items-center justify-between"
                  >
                    <span>{version.name}</span>
                    <div className="flex items-center gap-1">
                      {promptInfo.activeVersion === version.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      {!version.readonly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVersion(version.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleViewFactory}>
                  View System Default
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Reset to factory */}
          {promptInfo?.isCustomized && (
            <Button variant="outline" size="sm" onClick={handleResetToFactory}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}

          {/* Save as version */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveVersionDialog(true)}
            disabled={!hasChanges}
          >
            <History className="h-4 w-4 mr-2" />
            Save Version
          </Button>

          {/* Save */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saveSuccess ? 'Saved!' : 'Save'}
          </Button>

          {/* Preview/Edit toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 mx-4 mt-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Content Area - fills remaining space */}
      <div className="flex-1 min-h-0 overflow-auto">
        {isEditMode ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={cn(
              "w-full h-full p-4 bg-background font-mono text-sm resize-none border-0 focus:outline-none focus:ring-0",
              hasChanges && "bg-primary/5"
            )}
            placeholder="Prompt content..."
            spellCheck={false}
          />
        ) : (
          <div className="h-full overflow-auto p-6">
            <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-ul:text-muted-foreground prose-ol:text-muted-foreground prose-li:marker:text-muted-foreground prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </article>
          </div>
        )}
      </div>

      {/* Save Version Dialog */}
      <Dialog open={showSaveVersionDialog} onOpenChange={setShowSaveVersionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Version</DialogTitle>
            <DialogDescription>
              Save the current prompt as a named version for easy switching later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="versionName">Version Name</Label>
            <Input
              id="versionName"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g., stricter-tests, verbose-mode"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveVersionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVersion} disabled={!versionName.trim() || isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useCallback, useEffect } from 'react';
import { FolderTree, Brain } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useContextStore, loadKBAMemory, searchKBANotes, addKBANote, updateKBANote, deleteKBANote } from '../../stores/context-store';
import { useProjectContext, useRefreshIndex, useMemorySearch } from './hooks';
import { ProjectIndexTab } from './ProjectIndexTab';
import { MemoriesTab } from './MemoriesTab';
import { KBANotesTab } from './KBANotesTab';
import type { ContextProps } from './types';

export function Context({ projectId }: ContextProps) {
  const {
    projectIndex,
    indexLoading,
    indexError,
    memoryBackend,
    memoryStatus,
    memoryState,
    recentMemories,
    memoriesLoading,
    kbaStatus,
    kbaNotes,
    kbaLoading,
    searchResults,
    searchLoading
  } = useContextStore();

  const [activeTab, setActiveTab] = useState('index');
  const [docsGenerating, setDocsGenerating] = useState(false);
  const [docsMessage, setDocsMessage] = useState<string | null>(null);

  // Custom hooks
  useProjectContext(projectId);

  // Listen for docs generation events
  useEffect(() => {
    const unsubProgress = window.electronAPI.onDocsGenerationProgress((data) => {
      if (data.projectId === projectId) {
        console.log('[Docs Generation]', data.phase, data.message);
        setDocsMessage(data.message);
      }
    });

    const unsubComplete = window.electronAPI.onDocsGenerationComplete((data) => {
      if (data.projectId === projectId) {
        setDocsGenerating(false);
        const { filesCreated, filesModified, summary } = data.result;
        const totalFiles = filesCreated.length + filesModified.length;
        
        const message = totalFiles > 0 
          ? `${summary}. Check the Notes tab for details.`
          : summary;
        setDocsMessage(message);
        
        // Auto-clear message after 10 seconds
        setTimeout(() => setDocsMessage(null), 10000);

        // Refresh KBA notes to show the new summary
        if (memoryBackend === 'kba-memory') {
          loadKBAMemory(projectId);
        }
      }
    });

    const unsubError = window.electronAPI.onDocsGenerationError((data) => {
      if (data.projectId === projectId) {
        setDocsGenerating(false);
        setDocsMessage(`Error: ${data.error}`);
        setTimeout(() => setDocsMessage(null), 10000);
      }
    });

    return () => {
      unsubProgress();
      unsubComplete();
      unsubError();
    };
  }, [projectId, memoryBackend]);
  const handleRefreshIndex = useRefreshIndex(projectId);
  const handleGraphitiSearch = useMemorySearch(projectId);

  // KBA Memory handlers
  const handleKBASearch = useCallback((query: string) => {
    searchKBANotes(projectId, query);
  }, [projectId]);

  const handleAddKBANote = useCallback(async (title: string, content: string, tags: string[]) => {
    return addKBANote(projectId, title, content, tags);
  }, [projectId]);

  const handleUpdateKBANote = useCallback(async (noteId: string, updates: { title?: string; content?: string; tags?: string[] }) => {
    return updateKBANote(projectId, noteId, updates);
  }, [projectId]);

  const handleDeleteKBANote = useCallback(async (noteId: string) => {
    return deleteKBANote(projectId, noteId);
  }, [projectId]);

  const handleRefreshKBA = useCallback(() => {
    loadKBAMemory(projectId);
  }, [projectId]);

  // Documentation generation handler
  const handleGenerateDocs = useCallback(async (model: string) => {
    setDocsGenerating(true);
    setDocsMessage(`Generating docs with ${model}...`);
    try {
      const result = await window.electronAPI.generateDocs(projectId, model);
      if (!result.success) {
        // Error will be handled by the error event listener
        setDocsGenerating(false);
      }
    } catch (error) {
      setDocsGenerating(false);
      setDocsMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setDocsMessage(null), 5000);
    }
  }, [projectId]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="border-b border-border px-6 py-3">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="index" className="gap-2">
              <FolderTree className="h-4 w-4" />
              Project Index
            </TabsTrigger>
            <TabsTrigger value="memories" className="gap-2">
              <Brain className="h-4 w-4" />
              {memoryBackend === 'kba-memory' ? 'Notes' : 'Memories'}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Project Index Tab */}
        <TabsContent value="index" className="flex-1 overflow-hidden m-0">
          <ProjectIndexTab
            projectIndex={projectIndex}
            indexLoading={indexLoading}
            indexError={indexError}
            onRefresh={handleRefreshIndex}
            onGenerateDocs={handleGenerateDocs}
            docsGenerating={docsGenerating}
            docsMessage={docsMessage}
          />
        </TabsContent>

        {/* Memories/Notes Tab */}
        <TabsContent value="memories" className="flex-1 overflow-hidden m-0">
          {memoryBackend === 'kba-memory' ? (
            <KBANotesTab
              kbaStatus={kbaStatus}
              kbaNotes={kbaNotes}
              kbaLoading={kbaLoading}
              searchResults={searchResults}
              searchLoading={searchLoading}
              onSearch={handleKBASearch}
              onAddNote={handleAddKBANote}
              onUpdateNote={handleUpdateKBANote}
              onDeleteNote={handleDeleteKBANote}
              onRefresh={handleRefreshKBA}
            />
          ) : (
            <MemoriesTab
              memoryStatus={memoryStatus}
              memoryState={memoryState}
              recentMemories={recentMemories}
              memoriesLoading={memoriesLoading}
              searchResults={searchResults}
              searchLoading={searchLoading}
              onSearch={handleGraphitiSearch}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useEffect } from 'react';
import {
  loadProjectContext,
  refreshProjectIndex,
  searchMemories,
  loadKBAMemory,
  useContextStore
} from '../../stores/context-store';
import { useProjectStore } from '../../stores/project-store';

export function useProjectContext(projectId: string) {
  const setMemoryBackend = useContextStore((state) => state.setMemoryBackend);

  useEffect(() => {
    if (projectId) {
      // Load project context (index, graphiti status)
      loadProjectContext(projectId);

      // Get project settings to determine memory backend
      const projects = useProjectStore.getState().projects;
      const project = projects.find((p) => p.id === projectId);
      const memoryBackend = project?.settings?.memoryBackend || 'kba-memory';
      
      setMemoryBackend(memoryBackend);

      // Load appropriate memory data based on backend
      if (memoryBackend === 'kba-memory') {
        loadKBAMemory(projectId);
      }
    }
  }, [projectId, setMemoryBackend]);
}

export function useRefreshIndex(projectId: string) {
  return async () => {
    await refreshProjectIndex(projectId);
  };
}

export function useMemorySearch(projectId: string) {
  return async (query: string) => {
    if (query.trim()) {
      await searchMemories(projectId, query);
    }
  };
}

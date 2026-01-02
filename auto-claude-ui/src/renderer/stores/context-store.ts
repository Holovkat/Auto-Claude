import { create } from 'zustand';
import type {
  ProjectIndex,
  GraphitiMemoryStatus,
  GraphitiMemoryState,
  MemoryEpisode,
  ContextSearchResult,
  KBAMemoryStatus,
  KBAMemoryNote
} from '../../shared/types';

type MemoryBackend = 'graphiti' | 'kba-memory' | 'file';

interface ContextState {
  // Project Index
  projectIndex: ProjectIndex | null;
  indexLoading: boolean;
  indexError: string | null;

  // Memory Backend
  memoryBackend: MemoryBackend;

  // Graphiti Memory Status
  memoryStatus: GraphitiMemoryStatus | null;
  memoryState: GraphitiMemoryState | null;
  memoryLoading: boolean;
  memoryError: string | null;

  // KBA Memory Status
  kbaStatus: KBAMemoryStatus | null;
  kbaNotes: KBAMemoryNote[];
  kbaLoading: boolean;

  // Recent Memories (Graphiti/File)
  recentMemories: MemoryEpisode[];
  memoriesLoading: boolean;

  // Search
  searchResults: ContextSearchResult[];
  searchLoading: boolean;
  searchQuery: string;

  // Actions
  setProjectIndex: (index: ProjectIndex | null) => void;
  setIndexLoading: (loading: boolean) => void;
  setIndexError: (error: string | null) => void;
  setMemoryBackend: (backend: MemoryBackend) => void;
  setMemoryStatus: (status: GraphitiMemoryStatus | null) => void;
  setMemoryState: (state: GraphitiMemoryState | null) => void;
  setMemoryLoading: (loading: boolean) => void;
  setMemoryError: (error: string | null) => void;
  setKBAStatus: (status: KBAMemoryStatus | null) => void;
  setKBANotes: (notes: KBAMemoryNote[]) => void;
  setKBALoading: (loading: boolean) => void;
  setRecentMemories: (memories: MemoryEpisode[]) => void;
  setMemoriesLoading: (loading: boolean) => void;
  setSearchResults: (results: ContextSearchResult[]) => void;
  setSearchLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  addKBANote: (note: KBAMemoryNote) => void;
  updateKBANote: (noteId: string, updates: Partial<KBAMemoryNote>) => void;
  removeKBANote: (noteId: string) => void;
  clearAll: () => void;
}

export const useContextStore = create<ContextState>((set) => ({
  // Project Index
  projectIndex: null,
  indexLoading: false,
  indexError: null,

  // Memory Backend
  memoryBackend: 'kba-memory',

  // Graphiti Memory Status
  memoryStatus: null,
  memoryState: null,
  memoryLoading: false,
  memoryError: null,

  // KBA Memory Status
  kbaStatus: null,
  kbaNotes: [],
  kbaLoading: false,

  // Recent Memories (Graphiti/File)
  recentMemories: [],
  memoriesLoading: false,

  // Search
  searchResults: [],
  searchLoading: false,
  searchQuery: '',

  // Actions
  setProjectIndex: (index) => set({ projectIndex: index }),
  setIndexLoading: (loading) => set({ indexLoading: loading }),
  setIndexError: (error) => set({ indexError: error }),
  setMemoryBackend: (backend) => set({ memoryBackend: backend }),
  setMemoryStatus: (status) => set({ memoryStatus: status }),
  setMemoryState: (state) => set({ memoryState: state }),
  setMemoryLoading: (loading) => set({ memoryLoading: loading }),
  setMemoryError: (error) => set({ memoryError: error }),
  setKBAStatus: (status) => set({ kbaStatus: status }),
  setKBANotes: (notes) => set({ kbaNotes: notes }),
  setKBALoading: (loading) => set({ kbaLoading: loading }),
  setRecentMemories: (memories) => set({ recentMemories: memories }),
  setMemoriesLoading: (loading) => set({ memoriesLoading: loading }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSearchLoading: (loading) => set({ searchLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  addKBANote: (note) => set((state) => ({ kbaNotes: [note, ...state.kbaNotes] })),
  updateKBANote: (noteId, updates) => set((state) => ({
    kbaNotes: state.kbaNotes.map((n) => n.id === noteId ? { ...n, ...updates } : n)
  })),
  removeKBANote: (noteId) => set((state) => ({
    kbaNotes: state.kbaNotes.filter((n) => n.id !== noteId)
  })),
  clearAll: () =>
    set({
      projectIndex: null,
      indexLoading: false,
      indexError: null,
      memoryBackend: 'kba-memory',
      memoryStatus: null,
      memoryState: null,
      memoryLoading: false,
      memoryError: null,
      kbaStatus: null,
      kbaNotes: [],
      kbaLoading: false,
      recentMemories: [],
      memoriesLoading: false,
      searchResults: [],
      searchLoading: false,
      searchQuery: ''
    })
}));

/**
 * Load project context (project index + memory status)
 */
export async function loadProjectContext(projectId: string): Promise<void> {
  const store = useContextStore.getState();
  store.setIndexLoading(true);
  store.setMemoryLoading(true);
  store.setIndexError(null);
  store.setMemoryError(null);

  try {
    const result = await window.electronAPI.getProjectContext(projectId);
    if (result.success && result.data) {
      store.setProjectIndex(result.data.projectIndex);
      store.setMemoryStatus(result.data.memoryStatus);
      store.setMemoryState(result.data.memoryState);
      store.setRecentMemories(result.data.recentMemories || []);
    } else {
      store.setIndexError(result.error || 'Failed to load project context');
    }
  } catch (error) {
    store.setIndexError(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    store.setIndexLoading(false);
    store.setMemoryLoading(false);
  }
}

/**
 * Refresh project index by re-running analyzer
 */
export async function refreshProjectIndex(projectId: string): Promise<void> {
  const store = useContextStore.getState();
  store.setIndexLoading(true);
  store.setIndexError(null);

  try {
    const result = await window.electronAPI.refreshProjectIndex(projectId);
    if (result.success && result.data) {
      store.setProjectIndex(result.data);
    } else {
      store.setIndexError(result.error || 'Failed to refresh project index');
    }
  } catch (error) {
    store.setIndexError(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    store.setIndexLoading(false);
  }
}

/**
 * Search memories using semantic search
 */
export async function searchMemories(
  projectId: string,
  query: string
): Promise<void> {
  const store = useContextStore.getState();
  store.setSearchQuery(query);

  if (!query.trim()) {
    store.setSearchResults([]);
    return;
  }

  store.setSearchLoading(true);

  try {
    const result = await window.electronAPI.searchMemories(projectId, query);
    if (result.success && result.data) {
      store.setSearchResults(result.data);
    } else {
      store.setSearchResults([]);
    }
  } catch (_error) {
    store.setSearchResults([]);
  } finally {
    store.setSearchLoading(false);
  }
}

/**
 * Load recent memories
 */
export async function loadRecentMemories(
  projectId: string,
  limit: number = 20
): Promise<void> {
  const store = useContextStore.getState();
  store.setMemoriesLoading(true);

  try {
    const result = await window.electronAPI.getRecentMemories(projectId, limit);
    if (result.success && result.data) {
      store.setRecentMemories(result.data);
    }
  } catch (_error) {
    // Silently fail - memories are optional
  } finally {
    store.setMemoriesLoading(false);
  }
}

/**
 * Load KBA memory status and notes
 */
export async function loadKBAMemory(
  projectId: string,
  limit: number = 20
): Promise<void> {
  const store = useContextStore.getState();
  store.setKBALoading(true);

  try {
    // Load status
    const statusResult = await window.electronAPI.getKBAStatus(projectId);
    if (statusResult.success && statusResult.data) {
      store.setKBAStatus(statusResult.data);
    }

    // Load notes
    const notesResult = await window.electronAPI.getKBANotes(projectId, limit);
    if (notesResult.success && notesResult.data) {
      store.setKBANotes(notesResult.data);
    }
  } catch (_error) {
    // Silently fail - KBA memory is optional
  } finally {
    store.setKBALoading(false);
  }
}

/**
 * Search KBA notes
 */
export async function searchKBANotes(
  projectId: string,
  query: string
): Promise<void> {
  const store = useContextStore.getState();
  store.setSearchQuery(query);

  if (!query.trim()) {
    store.setSearchResults([]);
    return;
  }

  store.setSearchLoading(true);

  try {
    const result = await window.electronAPI.searchKBANotes(projectId, query);
    if (result.success && result.data) {
      store.setSearchResults(result.data);
    } else {
      store.setSearchResults([]);
    }
  } catch (_error) {
    store.setSearchResults([]);
  } finally {
    store.setSearchLoading(false);
  }
}

/**
 * Add a new KBA note
 */
export async function addKBANote(
  projectId: string,
  title: string,
  content: string,
  tags: string[] = []
): Promise<boolean> {
  const store = useContextStore.getState();

  try {
    const result = await window.electronAPI.addKBANote(projectId, title, content, tags);
    if (result.success && result.data) {
      store.addKBANote(result.data);
      return true;
    }
    return false;
  } catch (_error) {
    return false;
  }
}

/**
 * Delete a KBA note
 */
export async function deleteKBANote(
  projectId: string,
  noteId: string
): Promise<boolean> {
  const store = useContextStore.getState();

  try {
    const result = await window.electronAPI.deleteKBANote(projectId, noteId);
    if (result.success) {
      store.removeKBANote(noteId);
      return true;
    }
    return false;
  } catch (_error) {
    return false;
  }
}

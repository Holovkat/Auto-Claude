import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type {
  IPCResult,
  KBAMemoryStatus,
  KBAMemoryNote,
  ContextSearchResult
} from '../../shared/types';
import { projectStore } from '../project-store';

const DEFAULT_KBA_URL = 'http://localhost:3002';

async function fetchKBA(
  baseUrl: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${baseUrl}${endpoint}`;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}

export function registerKBAMemoryHandlers(
  _getMainWindow: () => BrowserWindow | null
): void {
  // Get KBA memory status for a project
  ipcMain.handle(
    IPC_CHANNELS.KBA_GET_STATUS,
    async (_, projectId: string): Promise<IPCResult<KBAMemoryStatus>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const kbaUrl = project.settings.kbaMemoryUrl || DEFAULT_KBA_URL;

      try {
        // Check if server is available
        const collectionsRes = await fetchKBA(kbaUrl, '/api/collections');
        if (!collectionsRes.ok) {
          return {
            success: true,
            data: {
              available: false,
              serverUrl: kbaUrl,
              reason: `Server returned ${collectionsRes.status}`
            }
          };
        }

        const collections = await collectionsRes.json();
        
        // Find collection for this project
        const projectName = project.name.toLowerCase();
        const collection = Array.isArray(collections)
          ? collections.find((c: { name?: string }) => 
              c.name?.toLowerCase() === projectName
            )
          : null;

        if (collection) {
          // Get note count for this collection
          const notesRes = await fetchKBA(
            kbaUrl,
            `/api/notes?collectionId=${collection.id}&limit=1`
          );
          let noteCount = 0;
          if (notesRes.ok) {
            const notes = await notesRes.json();
            noteCount = Array.isArray(notes) ? notes.length : 0;
            // Try to get total count from headers or response
            const totalHeader = notesRes.headers.get('X-Total-Count');
            if (totalHeader) {
              noteCount = parseInt(totalHeader, 10);
            }
          }

          return {
            success: true,
            data: {
              available: true,
              serverUrl: kbaUrl,
              collectionId: collection.id,
              collectionName: collection.name,
              noteCount
            }
          };
        }

        // No collection yet, but server is available
        return {
          success: true,
          data: {
            available: true,
            serverUrl: kbaUrl,
            reason: 'No collection for this project yet'
          }
        };
      } catch (error) {
        return {
          success: true,
          data: {
            available: false,
            serverUrl: kbaUrl,
            reason: error instanceof Error ? error.message : 'Connection failed'
          }
        };
      }
    }
  );

  // Get notes for a project
  ipcMain.handle(
    IPC_CHANNELS.KBA_GET_NOTES,
    async (_, projectId: string, limit: number = 20): Promise<IPCResult<KBAMemoryNote[]>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const kbaUrl = project.settings.kbaMemoryUrl || DEFAULT_KBA_URL;

      try {
        // First get or create collection
        const collectionsRes = await fetchKBA(kbaUrl, '/api/collections');
        if (!collectionsRes.ok) {
          return { success: true, data: [] };
        }

        const collections = await collectionsRes.json();
        const projectName = project.name.toLowerCase();
        let collection = Array.isArray(collections)
          ? collections.find((c: { name?: string }) => 
              c.name?.toLowerCase() === projectName
            )
          : null;

        if (!collection) {
          // Create collection
          const createRes = await fetchKBA(kbaUrl, '/api/collections', {
            method: 'POST',
            body: JSON.stringify({
              name: project.name,
              description: `Knowledge base for project: ${project.name}`
            })
          });
          if (createRes.ok) {
            collection = await createRes.json();
          } else {
            return { success: true, data: [] };
          }
        }

        // Get notes
        const notesRes = await fetchKBA(
          kbaUrl,
          `/api/notes?collectionId=${collection.id}&limit=${limit}`
        );
        if (!notesRes.ok) {
          return { success: true, data: [] };
        }

        const notes = await notesRes.json();
        const formattedNotes: KBAMemoryNote[] = (Array.isArray(notes) ? notes : []).map(
          (note: {
            id: string;
            title?: string;
            content?: string;
            tags?: string[];
            collectionId?: string;
            createdAt?: string;
            updatedAt?: string;
          }) => ({
            id: note.id,
            title: note.title || 'Untitled',
            content: note.content || '',
            tags: note.tags || [],
            collectionId: note.collectionId || collection.id,
            createdAt: note.createdAt || new Date().toISOString(),
            updatedAt: note.updatedAt || new Date().toISOString()
          })
        );

        return { success: true, data: formattedNotes };
      } catch (error) {
        console.error('[KBA Memory] Failed to get notes:', error);
        return { success: true, data: [] };
      }
    }
  );

  // Search notes
  ipcMain.handle(
    IPC_CHANNELS.KBA_SEARCH_NOTES,
    async (_, projectId: string, query: string): Promise<IPCResult<ContextSearchResult[]>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const kbaUrl = project.settings.kbaMemoryUrl || DEFAULT_KBA_URL;

      try {
        // Get collection
        const collectionsRes = await fetchKBA(kbaUrl, '/api/collections');
        if (!collectionsRes.ok) {
          return { success: true, data: [] };
        }

        const collections = await collectionsRes.json();
        const projectName = project.name.toLowerCase();
        const collection = Array.isArray(collections)
          ? collections.find((c: { name?: string }) => 
              c.name?.toLowerCase() === projectName
            )
          : null;

        if (!collection) {
          return { success: true, data: [] };
        }

        // Search notes
        const searchRes = await fetchKBA(
          kbaUrl,
          `/api/notes/search?query=${encodeURIComponent(query)}&collectionId=${collection.id}&limit=20`
        );

        if (!searchRes.ok) {
          // Fallback to listing and filtering
          const notesRes = await fetchKBA(
            kbaUrl,
            `/api/notes?collectionId=${collection.id}&limit=50`
          );
          if (!notesRes.ok) {
            return { success: true, data: [] };
          }

          const notes = await notesRes.json();
          const queryLower = query.toLowerCase();
          const filtered = (Array.isArray(notes) ? notes : [])
            .filter((note: { title?: string; content?: string }) =>
              note.title?.toLowerCase().includes(queryLower) ||
              note.content?.toLowerCase().includes(queryLower)
            )
            .slice(0, 20);

          return {
            success: true,
            data: filtered.map((note: { title?: string; content?: string }) => ({
              content: `${note.title || 'Untitled'}\n\n${note.content || ''}`,
              score: 1.0,
              type: 'kba_note'
            }))
          };
        }

        const results = await searchRes.json();
        return {
          success: true,
          data: (Array.isArray(results) ? results : []).map(
            (result: { title?: string; content?: string; score?: number }) => ({
              content: `${result.title || 'Untitled'}\n\n${result.content || ''}`,
              score: result.score || 1.0,
              type: 'kba_note'
            })
          )
        };
      } catch (error) {
        console.error('[KBA Memory] Search failed:', error);
        return { success: true, data: [] };
      }
    }
  );

  // Add a note
  ipcMain.handle(
    IPC_CHANNELS.KBA_ADD_NOTE,
    async (
      _,
      projectId: string,
      title: string,
      content: string,
      tags: string[] = []
    ): Promise<IPCResult<KBAMemoryNote>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const kbaUrl = project.settings.kbaMemoryUrl || DEFAULT_KBA_URL;

      try {
        // Get or create collection
        const collectionsRes = await fetchKBA(kbaUrl, '/api/collections');
        if (!collectionsRes.ok) {
          return { success: false, error: 'Failed to get collections' };
        }

        const collections = await collectionsRes.json();
        const projectName = project.name.toLowerCase();
        let collection = Array.isArray(collections)
          ? collections.find((c: { name?: string }) => 
              c.name?.toLowerCase() === projectName
            )
          : null;

        if (!collection) {
          const createRes = await fetchKBA(kbaUrl, '/api/collections', {
            method: 'POST',
            body: JSON.stringify({
              name: project.name,
              description: `Knowledge base for project: ${project.name}`
            })
          });
          if (!createRes.ok) {
            return { success: false, error: 'Failed to create collection' };
          }
          collection = await createRes.json();
        }

        // Create note
        const noteRes = await fetchKBA(kbaUrl, '/api/notes', {
          method: 'POST',
          body: JSON.stringify({
            collectionId: collection.id,
            title,
            content,
            tags
          })
        });

        if (!noteRes.ok) {
          return { success: false, error: 'Failed to create note' };
        }

        const note = await noteRes.json();
        return {
          success: true,
          data: {
            id: note.id,
            title: note.title || title,
            content: note.content || content,
            tags: note.tags || tags,
            collectionId: note.collectionId || collection.id,
            createdAt: note.createdAt || new Date().toISOString(),
            updatedAt: note.updatedAt || new Date().toISOString()
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to add note'
        };
      }
    }
  );

  // Update a note
  ipcMain.handle(
    IPC_CHANNELS.KBA_UPDATE_NOTE,
    async (
      _,
      projectId: string,
      noteId: string,
      updates: { title?: string; content?: string; tags?: string[] }
    ): Promise<IPCResult<KBAMemoryNote>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const kbaUrl = project.settings.kbaMemoryUrl || DEFAULT_KBA_URL;

      try {
        const updateRes = await fetchKBA(kbaUrl, `/api/notes/${noteId}`, {
          method: 'PATCH',
          body: JSON.stringify(updates)
        });

        if (!updateRes.ok) {
          return { success: false, error: 'Failed to update note' };
        }

        const note = await updateRes.json();
        return {
          success: true,
          data: {
            id: note.id,
            title: note.title,
            content: note.content,
            tags: note.tags || [],
            collectionId: note.collectionId,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update note'
        };
      }
    }
  );

  // Delete a note
  ipcMain.handle(
    IPC_CHANNELS.KBA_DELETE_NOTE,
    async (_, projectId: string, noteId: string): Promise<IPCResult> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const kbaUrl = project.settings.kbaMemoryUrl || DEFAULT_KBA_URL;

      try {
        const deleteRes = await fetchKBA(kbaUrl, `/api/notes/${noteId}`, {
          method: 'DELETE'
        });

        if (!deleteRes.ok) {
          return { success: false, error: 'Failed to delete note' };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete note'
        };
      }
    }
  );
}

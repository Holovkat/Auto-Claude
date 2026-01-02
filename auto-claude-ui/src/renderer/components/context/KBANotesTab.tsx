import { useState } from 'react';
import {
  RefreshCw,
  Database,
  Search,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  StickyNote,
  Tag
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';
import { InfoItem } from './InfoItem';
import type { KBAMemoryStatus, KBAMemoryNote, ContextSearchResult } from '../../../shared/types';

interface KBANotesTabProps {
  kbaStatus: KBAMemoryStatus | null;
  kbaNotes: KBAMemoryNote[];
  kbaLoading: boolean;
  searchResults: ContextSearchResult[];
  searchLoading: boolean;
  onSearch: (query: string) => void;
  onAddNote: (title: string, content: string, tags: string[]) => Promise<boolean>;
  onDeleteNote: (noteId: string) => Promise<boolean>;
  onRefresh: () => void;
}

export function KBANotesTab({
  kbaStatus,
  kbaNotes,
  kbaLoading,
  searchResults,
  searchLoading,
  onSearch,
  onAddNote,
  onDeleteNote,
  onRefresh
}: KBANotesTabProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTags, setNewNoteTags] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSearch = () => {
    if (localSearchQuery.trim()) {
      onSearch(localSearchQuery);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAddNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    
    setIsAdding(true);
    const tags = newNoteTags.split(',').map(t => t.trim()).filter(Boolean);
    const success = await onAddNote(newNoteTitle, newNoteContent, tags);
    
    if (success) {
      setNewNoteTitle('');
      setNewNoteContent('');
      setNewNoteTags('');
      setShowAddForm(false);
    }
    setIsAdding(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    await onDeleteNote(noteId);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* KBA Memory Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                KBA Memory Status
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onRefresh} disabled={kbaLoading}>
                  <RefreshCw className={cn('h-4 w-4', kbaLoading && 'animate-spin')} />
                </Button>
                {kbaStatus?.available ? (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Available
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {kbaStatus?.available ? (
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <InfoItem label="Server" value={kbaStatus.serverUrl} />
                {kbaStatus.collectionName && (
                  <InfoItem label="Collection" value={kbaStatus.collectionName} />
                )}
                <InfoItem label="Notes" value={(kbaStatus.noteCount ?? kbaNotes.length).toString()} />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p>{kbaStatus?.reason || 'KBA Memory server is not available'}</p>
                <p className="mt-2 text-xs">
                  Make sure the kba-memory server is running at the configured URL.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Search Notes
          </h3>
          <div className="flex gap-2">
            <Input
              placeholder="Search for notes, patterns, insights..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <Button onClick={handleSearch} disabled={searchLoading}>
              <Search className={cn('h-4 w-4', searchLoading && 'animate-pulse')} />
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </p>
              {searchResults.map((result, idx) => (
                <Card key={idx} className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {result.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Score: {result.score.toFixed(2)}
                      </span>
                    </div>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-40 overflow-auto">
                      {result.content}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Add Note Form */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Project Notes
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              disabled={!kbaStatus?.available}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
          </div>

          {showAddForm && (
            <Card className="border-primary/50">
              <CardContent className="pt-4 space-y-3">
                <Input
                  placeholder="Note title"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Note content..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={4}
                />
                <Input
                  placeholder="Tags (comma-separated)"
                  value={newNoteTags}
                  onChange={(e) => setNewNoteTags(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={isAdding || !newNoteTitle.trim() || !newNoteContent.trim()}
                  >
                    {isAdding ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Save Note'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Notes List */}
        <div className="space-y-3">
          {kbaLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!kbaLoading && kbaNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <StickyNote className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No notes yet. Add notes to capture project knowledge and insights.
              </p>
            </div>
          )}

          {kbaNotes.map((note) => (
            <Card key={note.id} className="group">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{note.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                      {note.content.length > 200 ? note.content.slice(0, 200) + '...' : note.content}
                    </p>
                    {note.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        {note.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

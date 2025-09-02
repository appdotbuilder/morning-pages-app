import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { MorningPageEntry, StreakInfo, EntryListItem } from '../../server/src/schema';

interface AppState {
  currentEntry: MorningPageEntry | null;
  streakInfo: StreakInfo;
  entryList: EntryListItem[];
  isLoading: boolean;
  isSaving: boolean;
  selectedEntry: MorningPageEntry | null;
  currentView: 'write' | 'entries';
}

function App() {
  const [state, setState] = useState<AppState>({
    currentEntry: null,
    streakInfo: { current_streak: 0, total_days: 0, last_entry_date: null },
    entryList: [],
    isLoading: true,
    isSaving: false,
    selectedEntry: null,
    currentView: 'write'
  });

  const [content, setContent] = useState('');

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const [todaysEntry, streakInfo, entryList] = await Promise.all([
        trpc.getTodaysEntry.query(),
        trpc.getStreakInfo.query(),
        trpc.getEntryList.query()
      ]);

      setState(prev => ({
        ...prev,
        currentEntry: todaysEntry,
        streakInfo,
        entryList,
        isLoading: false
      }));

      // Set content from today's entry
      if (todaysEntry) {
        setContent(todaysEntry.content);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveEntry = useCallback(async (entryContent: string) => {
    try {
      setState(prev => ({ ...prev, isSaving: true }));
      
      const today = new Date().toISOString().split('T')[0];
      const wordCount = entryContent.trim() 
        ? entryContent.trim().split(/\s+/).filter(word => word.length > 0).length 
        : 0;
      
      const savedEntry = await trpc.upsertMorningPageEntry.mutate({
        date: today,
        content: entryContent,
        word_count: wordCount
      });

      // Refresh data after save
      const [updatedStreakInfo, updatedEntryList] = await Promise.all([
        trpc.getStreakInfo.query(),
        trpc.getEntryList.query()
      ]);

      setState(prev => ({
        ...prev,
        currentEntry: savedEntry,
        streakInfo: updatedStreakInfo,
        entryList: updatedEntryList,
        isSaving: false
      }));
    } catch (error) {
      console.error('Failed to save entry:', error);
      setState(prev => ({ ...prev, isSaving: false }));
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key to go back to writing mode
      if (event.key === 'Escape' && state.currentView === 'entries') {
        setState(prev => ({ ...prev, currentView: 'write', selectedEntry: null }));
      }
      // Ctrl/Cmd + E to switch to entries view
      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        setState(prev => ({ 
          ...prev, 
          currentView: prev.currentView === 'write' ? 'entries' : 'write',
          selectedEntry: null 
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.currentView]);

  // Auto-save functionality with debounce
  useEffect(() => {
    // Only auto-save if there's content or if we're updating an existing entry
    if (!content.trim()) return;

    const timeoutId = setTimeout(async () => {
      await saveEntry(content);
    }, 2000); // Save after 2 seconds of no typing

    return () => clearTimeout(timeoutId);
  }, [content, saveEntry]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const loadEntry = async (date: string) => {
    try {
      const entry = await trpc.getEntryByDate.query({ date });
      setState(prev => ({ ...prev, selectedEntry: entry }));
    } catch (error) {
      console.error('Failed to load entry:', error);
      // Set selectedEntry to a placeholder to show error state
      setState(prev => ({ 
        ...prev, 
        selectedEntry: { 
          id: -1, 
          date: new Date(date), 
          content: '', 
          word_count: 0, 
          created_at: new Date(), 
          updated_at: new Date() 
        } as MorningPageEntry 
      }));
    }
  };

  const getWordCount = () => {
    if (!content.trim()) return 0;
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getProgressPercentage = () => {
    const wordCount = getWordCount();
    return Math.min((wordCount / 750) * 100, 100); // 750 words = 3 pages target
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateString = dateObj.toDateString();
    const todayString = today.toDateString();
    const yesterdayString = yesterday.toDateString();
    
    if (dateString === todayString) return 'Today';
    if (dateString === yesterdayString) return 'Yesterday';
    
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const today = new Date();
  const todayString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (state.isLoading) {
    return (
      <div className="min-h-screen morning-gradient flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-3xl pulse-soft">☀️</div>
          <p className="text-gray-600">Loading your morning pages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen morning-gradient">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-4xl">☀️</span>
            <h1 className="text-3xl font-light text-gray-800">Morning Pages</h1>
          </div>
          <p className="text-gray-600 font-light">
            Three pages of stream-of-consciousness writing
          </p>
        </header>

        {/* Navigation */}
        <div className="flex justify-center gap-2 mb-6">
          <Button
            variant={state.currentView === 'write' ? 'default' : 'outline'}
            onClick={() => setState(prev => ({ ...prev, currentView: 'write', selectedEntry: null }))}
            className="rounded-full"
          >
            ✏️ Today's Pages
          </Button>
          <Button
            variant={state.currentView === 'entries' ? 'default' : 'outline'}
            onClick={() => setState(prev => ({ ...prev, currentView: 'entries' }))}
            className="rounded-full"
          >
            📚 Past Entries
          </Button>
        </div>

        {/* Streak Information */}
        <Card className="mb-6 bg-white/70 backdrop-blur-sm border-amber-200 morning-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {state.streakInfo.current_streak}
                </div>
                <div className="text-sm text-gray-600">Current Streak</div>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {state.streakInfo.total_days}
                </div>
                <div className="text-sm text-gray-600">Total Days</div>
              </div>
              {state.streakInfo.last_entry_date && (
                <>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-800">
                      {formatDate(state.streakInfo.last_entry_date)}
                    </div>
                    <div className="text-xs text-gray-500">Last Entry</div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {state.currentView === 'write' ? (
          /* Writing View */
          <div className="space-y-6">
            {/* Today's Date */}
            <Card className="bg-white/70 backdrop-blur-sm border-amber-200 morning-card">
              <CardContent className="pt-4">
                <div className="text-center">
                  <h2 className="text-lg font-medium text-gray-800">{todayString}</h2>
                </div>
              </CardContent>
            </Card>

            {/* Progress Indicator */}
            <Card className="bg-white/70 backdrop-blur-sm border-amber-200 morning-card">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Progress</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-amber-700 border-amber-300">
                      {getWordCount()} words
                    </Badge>
                    <Badge variant="outline" className="text-amber-700 border-amber-300">
                      {(getWordCount() / 250).toFixed(1)} pages
                    </Badge>
                    {state.isSaving && (
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                        💾 Saving...
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="w-full bg-amber-100 rounded-full h-2">
                  <div
                    className="progress-morning h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
                <div className="text-right text-xs mt-1">
                  {getWordCount() >= 750 ? (
                    <span className="text-green-600 font-medium">🎉 Target reached! Great work!</span>
                  ) : (
                    <span className="text-gray-500">Target: 750 words (3 pages)</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Writing Area */}
            <Card className="bg-white/70 backdrop-blur-sm border-amber-200 morning-card">
              <CardContent className="pt-4">
                <Textarea
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Begin your morning pages... Write without stopping, editing, or censoring. Let your thoughts flow freely onto the page."
                  className="min-h-[400px] resize-none border-0 focus-visible:ring-0 text-base leading-relaxed bg-transparent placeholder:text-gray-400"
                  autoFocus
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Entries View */
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Entry List */}
            <Card className="bg-white/70 backdrop-blur-sm border-amber-200 morning-card">
              <CardHeader>
                <CardTitle className="text-lg font-medium">📚 Your Journey</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] custom-scrollbar">
                  {state.entryList.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-2xl mb-2">📝</div>
                      <p>No entries yet. Start your first morning pages today!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {state.entryList.map((entry: EntryListItem) => (
                        <div
                          key={entry.id}
                          onClick={() => loadEntry(entry.date.toISOString().split('T')[0])}
                          className="entry-item p-3 rounded-md border border-amber-200 cursor-pointer hover:bg-amber-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-800">
                                {formatDate(entry.date)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {entry.word_count} words
                              </div>
                            </div>
                            <div className="text-right">
                              {entry.has_content ? (
                                <Badge className="bg-green-100 text-green-700 border-green-300">
                                  ✓ Complete
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-500 border-gray-300">
                                  Empty
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Selected Entry Display */}
            <Card className="bg-white/70 backdrop-blur-sm border-amber-200 morning-card">
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  {state.selectedEntry 
                    ? `📖 ${formatDate(state.selectedEntry.date)}`
                    : '👆 Select an entry to read'
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                {state.selectedEntry ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{state.selectedEntry.word_count} words</span>
                      <span>•</span>
                      <span>{(state.selectedEntry.word_count / 250).toFixed(1)} pages</span>
                    </div>
                    <ScrollArea className="h-[320px] custom-scrollbar">
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                          {state.selectedEntry.content || 'This entry is empty.'}
                        </p>
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <div className="text-3xl mb-4">📖</div>
                    <p>Click on any date from your entries to read your morning pages</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Keyboard shortcuts hint */}
        <div className="text-center mt-8 text-xs text-gray-400">
          <p>
            Keyboard shortcuts: <kbd className="px-1 bg-gray-200 rounded">Ctrl+E</kbd> to switch views
            {state.currentView === 'entries' && (
              <> • <kbd className="px-1 bg-gray-200 rounded">Esc</kbd> to return to writing</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
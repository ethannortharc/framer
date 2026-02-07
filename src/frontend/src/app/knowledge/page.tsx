'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LeftNav } from '@/components/layout/LeftNav';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFrameStore } from '@/store';
import { KnowledgeCategory } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  BookOpen,
  Lightbulb,
  GitBranch,
  Target,
  FileText,
  GraduationCap,
  Loader2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryConfig: Record<
  KnowledgeCategory,
  { label: string; icon: React.ElementType; color: string }
> = {
  pattern: { label: 'Pattern', icon: GitBranch, color: 'text-violet-600 bg-violet-100' },
  decision: { label: 'Decision', icon: Target, color: 'text-blue-600 bg-blue-100' },
  prediction: { label: 'Prediction', icon: Lightbulb, color: 'text-amber-600 bg-amber-100' },
  context: { label: 'Context', icon: FileText, color: 'text-emerald-600 bg-emerald-100' },
  lesson: { label: 'Lesson', icon: GraduationCap, color: 'text-rose-600 bg-rose-100' },
};

const allCategories: KnowledgeCategory[] = [
  'pattern',
  'decision',
  'prediction',
  'context',
  'lesson',
];

export default function KnowledgePage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { currentSpace, setCurrentSpace } = useFrameStore();
  const {
    entries,
    isLoading,
    error,
    selectedCategory,
    loadEntries,
    createEntry,
    deleteEntry,
    searchKnowledge,
    searchResults,
    setSelectedCategory,
  } = useKnowledgeStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    category: 'lesson' as KnowledgeCategory,
    tags: '',
  });

  useEffect(() => {
    setCurrentSpace('knowledge');
    loadEntries();
  }, [loadEntries, setCurrentSpace]);

  // Redirect when navigating away from knowledge space
  useEffect(() => {
    if (currentSpace !== 'knowledge') {
      router.push('/dashboard');
    }
  }, [currentSpace, router]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    await searchKnowledge(searchQuery, selectedCategory || undefined);
  };

  const handleCategoryFilter = (category: KnowledgeCategory | null) => {
    setSelectedCategory(category);
    if (category) {
      loadEntries(category);
    } else {
      loadEntries();
    }
    setIsSearching(false);
    setSearchQuery('');
  };

  const handleCreateEntry = async () => {
    if (!user || !newEntry.title.trim() || !newEntry.content.trim()) return;

    await createEntry({
      title: newEntry.title,
      content: newEntry.content,
      category: newEntry.category,
      author: user.id,
      tags: newEntry.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });

    setNewEntry({ title: '', content: '', category: 'lesson', tags: '' });
    setShowAddModal(false);
  };

  const displayEntries = isSearching
    ? searchResults.map((r) => ({
        id: r.id,
        title: '',
        content: r.content,
        category: (r.metadata as any)?.category || 'lesson',
        source: 'manual',
        author: (r.metadata as any)?.author || '',
        tags: [],
        createdAt: '',
        updatedAt: '',
      }))
    : entries;

  return (
    <div className="flex h-screen bg-slate-50">
      <LeftNav onSettingsClick={() => setShowSettings(true)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Knowledge Base
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Team patterns, decisions, and lessons learned
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Knowledge
            </Button>
          </div>

          {/* Search */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search knowledge semantically..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              Search
            </Button>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => handleCategoryFilter(null)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                !selectedCategory
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              All
            </button>
            {allCategories.map((cat) => {
              const config = categoryConfig[cat];
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryFilter(cat)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {config.label}
                </button>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Entries */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : displayEntries.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {isSearching
                  ? 'No matching knowledge found'
                  : 'No knowledge entries yet. Add your first one!'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {displayEntries.map((entry) => {
                const cat = entry.category as KnowledgeCategory;
                const config = categoryConfig[cat] || categoryConfig.lesson;
                const Icon = config.icon;

                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'p-2 rounded-lg flex-shrink-0',
                          config.color
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-900 truncate">
                          {entry.title || 'Untitled'}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-3">
                          {entry.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            {config.label}
                          </span>
                          {(entry.tags || []).slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Knowledge Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Knowledge</DialogTitle>
            <DialogDescription>
              Record a pattern, decision, or lesson for the team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={newEntry.title}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, title: e.target.value })
                }
                placeholder="Short descriptive title"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Category
              </label>
              <Select
                value={newEntry.category}
                onValueChange={(v) =>
                  setNewEntry({
                    ...newEntry,
                    category: v as KnowledgeCategory,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryConfig[cat].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Content
              </label>
              <Textarea
                value={newEntry.content}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, content: e.target.value })
                }
                placeholder="The pattern, decision, or lesson..."
                className="min-h-[100px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={newEntry.tags}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, tags: e.target.value })
                }
                placeholder="auth, database, performance"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateEntry}
              disabled={!newEntry.title.trim() || !newEntry.content.trim()}
            >
              Add Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal placeholder */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure your Framer preferences
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-slate-500">
            Settings panel coming soon.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

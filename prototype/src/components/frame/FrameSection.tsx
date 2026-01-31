'use client';

import React, { useState } from 'react';
import {
  Edit2,
  Sparkles,
  ClipboardList,
  Wand2,
  MessageSquare,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Check,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FrameSection as FrameSectionType, ReviewComment } from '@/types';
import { cn } from '@/lib/utils';

interface FrameSectionProps {
  title: string;
  section: FrameSectionType;
  isActive: boolean;
  isReadOnly?: boolean;
  isCollapsed?: boolean;
  isEmpty?: boolean;
  onToggleCollapse?: () => void;
  children: React.ReactNode;
  onFocus: () => void;
  onAIGenerate?: () => void;
  onAIImprove?: () => void;
  onAIRefine?: () => void;
  onStartQuestionnaire?: () => void;
  comments?: ReviewComment[];
  onAddComment?: () => void;
}

export function FrameSection({
  title,
  section,
  isActive,
  isReadOnly,
  isCollapsed = false,
  isEmpty = false,
  onToggleCollapse,
  children,
  onFocus,
  onAIGenerate,
  onAIImprove,
  onAIRefine,
  onStartQuestionnaire,
  comments,
  onAddComment,
}: FrameSectionProps) {
  return (
    <div
      onClick={onFocus}
      className={cn(
        'rounded-xl border bg-white transition-all duration-200',
        isActive
          ? 'border-slate-400 ring-2 ring-slate-200 shadow-sm'
          : 'border-slate-200 hover:border-slate-300'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-5 py-3 cursor-pointer select-none',
          !isCollapsed && 'border-b border-slate-100'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse?.();
        }}
      >
        <div className="flex items-center gap-2">
          <button className="p-0.5 hover:bg-slate-100 rounded transition-colors">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            {title}
          </h3>
          {comments && comments.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <MessageCircle className="h-3 w-3" />
              {comments.length}
            </span>
          )}
          {isEmpty && !isCollapsed && (
            <span className="text-xs text-slate-400 ml-2">Empty</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isReadOnly && !isCollapsed && onStartQuestionnaire && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStartQuestionnaire();
              }}
              className="text-violet-600 gap-1.5 h-7 hover:bg-violet-50"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="text-xs">Questionnaire</span>
            </Button>
          )}
          {isReadOnly && onAddComment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddComment();
              }}
              className="text-slate-500 gap-1.5 h-7"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-xs">Comment</span>
            </Button>
          )}
        </div>
      </div>

      {/* Content - Collapsible */}
      {!isCollapsed && (
        <>
          <div className="p-5">
            {isEmpty && !isReadOnly ? (
              <div className="text-center py-8">
                <HelpCircle className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-4">
                  This section is empty. Use the questionnaire to get started, or add content manually.
                </p>
                {onStartQuestionnaire && (
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartQuestionnaire();
                    }}
                    className="gap-2"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Start Questionnaire
                  </Button>
                )}
              </div>
            ) : (
              children
            )}
          </div>

          {/* AI Actions (only for editable mode and non-empty) */}
          {!isReadOnly && !isEmpty && (
            <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAIGenerate?.();
                }}
                className="text-slate-600 gap-1.5 text-xs h-7"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Regenerate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAIImprove?.();
                }}
                className="text-slate-600 gap-1.5 text-xs h-7"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Improve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAIRefine?.();
                }}
                className="text-slate-600 gap-1.5 text-xs h-7"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Refine...
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Editable List Component with full functionality
interface EditableListProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  isReadOnly?: boolean;
  minItems?: number;
  ordered?: boolean;
}

export function EditableList({
  items,
  onChange,
  placeholder = 'Add item...',
  isReadOnly = false,
  minItems = 0,
  ordered = true,
}: EditableListProps) {
  const [newItem, setNewItem] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const handleAddItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleEditItem = (index: number) => {
    setEditingIndex(index);
    setEditingValue(items[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editingValue.trim()) {
      const newItems = [...items];
      newItems[editingIndex] = editingValue.trim();
      onChange(newItems);
    }
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  if (isReadOnly) {
    if (items.length === 0) {
      return (
        <p className="text-sm text-slate-400 italic">{placeholder}</p>
      );
    }
    return (
      <ListDisplay items={items} ordered={ordered} />
    );
  }

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item, index) => (
            <div
              key={index}
              className="group flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {ordered && (
                <span className="text-xs font-medium text-slate-400 mt-0.5 w-5">
                  {index + 1}.
                </span>
              )}
              {!ordered && (
                <span className="text-slate-400 mt-0.5">•</span>
              )}
              {editingIndex === index ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleSaveEdit}
                    className="h-7 w-7 text-emerald-600"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    className="h-7 w-7 text-slate-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <p
                    className="flex-1 text-sm text-slate-700 leading-relaxed cursor-pointer"
                    onClick={() => handleEditItem(index)}
                  >
                    {item}
                  </p>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleEditItem(index)}
                      className="h-6 w-6 text-slate-400"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleRemoveItem(index)}
                      className="h-6 w-6 text-slate-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new item */}
      <div className="flex items-center gap-2 mt-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddItem();
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddItem}
          disabled={!newItem.trim()}
          className="h-8 gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {minItems > 0 && items.length < minItems && (
        <p className="text-xs text-amber-600 mt-1">
          Minimum {minItems} items required ({minItems - items.length} more needed)
        </p>
      )}
    </div>
  );
}

// Read-only list display
function ListDisplay({ items, ordered }: { items: string[]; ordered: boolean }) {
  if (ordered) {
    return (
      <ol className="space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
            <span className="text-slate-400 font-medium">{index + 1}.</span>
            {item}
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
          <span className="text-slate-400">•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

// Editable text content
interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isReadOnly?: boolean;
  multiline?: boolean;
}

export function EditableText({
  value,
  onChange,
  placeholder,
  isReadOnly = false,
  multiline = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isReadOnly) {
    if (!value) {
      return (
        <p className="text-sm text-slate-400 italic">
          {placeholder || 'Not specified'}
        </p>
      );
    }
    return <p className="text-sm text-slate-700 leading-relaxed">{value}</p>;
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        {multiline ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="min-h-[80px] text-sm"
            autoFocus
          />
        ) : (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group cursor-pointer p-2 -m-2 rounded-lg hover:bg-slate-50 transition-colors"
      onClick={() => {
        setEditValue(value);
        setIsEditing(true);
      }}
    >
      {value ? (
        <p className="text-sm text-slate-700 leading-relaxed">{value}</p>
      ) : (
        <p className="text-sm text-slate-400 italic">
          {placeholder || 'Click to add...'}
        </p>
      )}
      <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
        Click to edit
      </span>
    </div>
  );
}

// Display-only text content (legacy support)
interface TextContentProps {
  content: string;
  placeholder?: string;
}

export function TextContent({ content, placeholder }: TextContentProps) {
  if (!content) {
    return (
      <p className="text-sm text-slate-400 italic">
        {placeholder || 'Click to add content...'}
      </p>
    );
  }

  return <p className="text-sm text-slate-700 leading-relaxed">{content}</p>;
}

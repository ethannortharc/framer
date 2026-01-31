'use client';

import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { FrameSection } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: FrameSection | null;
  onSubmit: (content: string) => void;
}

const sectionLabels: Record<FrameSection, string> = {
  header: 'Header',
  user: 'User Perspective',
  engineering: 'Engineering Framing',
  validation: 'Validation Thinking',
};

export function CommentDialog({
  open,
  onOpenChange,
  section,
  onSubmit,
}: CommentDialogProps) {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim());
      setContent('');
      onOpenChange(false);
    }
  };

  if (!section) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-slate-600" />
            Add Comment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-slate-500">
            Commenting on: <span className="font-medium text-slate-700">{sectionLabels[section]}</span>
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your feedback or question..."
            className="min-h-[120px]"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!content.trim()}>
            Add Comment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

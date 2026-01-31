'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Check, RefreshCw, Sparkles } from 'lucide-react';
import { FrameSection, ChatMessage, Frame } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface RefineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: FrameSection | null;
  frame: Frame | null;
  onApply: (section: FrameSection, content: string) => void;
}

const sectionLabels: Record<FrameSection, string> = {
  header: 'Problem Statement',
  user: 'User Perspective',
  engineering: 'Engineering Framing',
  validation: 'Validation Thinking',
};

export function RefineDialog({
  open,
  onOpenChange,
  section,
  frame,
  onApply,
}: RefineDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current content based on section
  const getCurrentContent = () => {
    if (!frame || !section) return '';
    switch (section) {
      case 'header':
        return frame.problemStatement;
      case 'user':
        return `User: ${frame.userPerspective.user || 'Not defined'}\n\nContext: ${frame.userPerspective.context || 'Not defined'}\n\nJourney Steps:\n${frame.userPerspective.journeySteps.map((s, i) => `${i + 1}. ${s}`).join('\n') || 'None'}\n\nPain Points:\n${frame.userPerspective.painPoints.map(p => `• ${p}`).join('\n') || 'None'}`;
      case 'engineering':
        return `Principles:\n${frame.engineeringFraming.principles.map((p, i) => `${i + 1}. ${p}`).join('\n') || 'None'}\n\nNon-goals:\n${frame.engineeringFraming.nonGoals.map(n => `• ${n}`).join('\n') || 'None'}`;
      case 'validation':
        return `Success Signals:\n${frame.validationThinking.successSignals.map(s => `• ${s}`).join('\n') || 'None'}\n\nDisconfirming Evidence:\n${frame.validationThinking.disconfirmingEvidence.map(d => `• ${d}`).join('\n') || 'None'}`;
      default:
        return '';
    }
  };

  // Reset when dialog opens with new section
  useEffect(() => {
    if (open && section && frame) {
      const content = getCurrentContent();
      setEditableContent(content);

      // Start with an AI message
      const initialMessages: ChatMessage[] = [
        {
          id: 'init-1',
          role: 'assistant',
          content: getInitialQuestion(section, content),
        },
      ];
      setMessages(initialMessages);
    }
  }, [open, section, frame]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getInitialQuestion = (section: FrameSection, content: string): string => {
    const hasContent = content.length > 50;
    const questions: Record<FrameSection, { empty: string; filled: string }> = {
      header: {
        empty: "Let's craft a clear problem statement. What's the core issue you're trying to solve? Focus on the problem, not the solution.",
        filled: "I see your problem statement. Is it focused on the problem rather than the solution? What happens when users encounter this issue?",
      },
      user: {
        empty: "Let's build the user perspective. Who is the primary user affected? What's their role or persona?",
        filled: "Good foundation! The user journey helps capture the experience. Is there a moment of frustration or discovery we should highlight?",
      },
      engineering: {
        empty: "Let's define the engineering framing. What principles or invariants must hold true in your solution?",
        filled: "I see your engineering constraints. Are these principles specific and testable? Consider what you're explicitly NOT doing.",
      },
      validation: {
        empty: "How will you know this work succeeded? What would prove your approach is wrong?",
        filled: "Good validation criteria! Are these signals measurable? What edge cases might invalidate your assumptions?",
      },
    };
    return hasContent ? questions[section].filled : questions[section].empty;
  };

  const generateAIResponse = (userMessage: string, section: FrameSection): { content: string; suggestion?: string } => {
    // Contextual responses based on section and user input
    const responses: Record<FrameSection, Array<{ content: string; suggestion?: string }>> = {
      header: [
        {
          content: "Good context! Let me suggest a more focused problem statement:",
          suggestion: `When [specific trigger], [user role] experiences [problem], resulting in [negative outcome]. Currently, [workaround or lack thereof].`,
        },
        {
          content: "I'd recommend focusing on the user impact. Here's a refined version:",
          suggestion: `[User role] cannot [desired action] because [root cause], which leads to [business/user impact].`,
        },
      ],
      user: [
        {
          content: "Based on your input, here's an enhanced user journey:",
          suggestion: `User: [Specific role/persona]\n\nContext: [Their environment and goals]\n\nJourney:\n1. User attempts to [initial action]\n2. System responds with [actual behavior]\n3. User notices [the problem]\n4. User tries [workaround]\n5. User realizes [the limitation]\n6. User is blocked because [consequence]\n\nPain Points:\n• No clear error message\n• No workaround available\n• Time lost on troubleshooting`,
        },
      ],
      engineering: [
        {
          content: "Here's a more structured engineering framing:",
          suggestion: `Principles:\n1. [Specific invariant that must hold]\n2. [Constraint on behavior]\n3. [Quality attribute requirement]\n\nNon-goals:\n• We are NOT [explicitly excluded feature]\n• We accept [known limitation]\n• Out of scope: [future consideration]`,
        },
      ],
      validation: [
        {
          content: "Let me suggest more measurable validation criteria:",
          suggestion: `Success Signals:\n• [Observable behavior] occurs when [trigger]\n• [Metric] improves by [amount]\n• [Automated test] passes\n\nDisconfirming Evidence:\n• If [condition], our assumptions are wrong\n• If [edge case] fails, the scope is broader\n• If [metric] doesn't change, approach needs revision`,
        },
      ],
    };

    const sectionResponses = responses[section];
    return sectionResponses[Math.floor(Math.random() * sectionResponses.length)];
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !section) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const response = generateAIResponse(userMessage.content, section);
    const aiResponse: ChatMessage = {
      id: `msg-${Date.now()}-ai`,
      role: 'assistant',
      content: response.content,
      suggestion: response.suggestion,
    };

    setMessages((prev) => [...prev, aiResponse]);
    setIsLoading(false);
  };

  const handleApplySuggestion = (suggestion: string) => {
    setEditableContent(suggestion);
  };

  const handleSaveAndClose = () => {
    if (section && editableContent) {
      onApply(section, editableContent);
    }
    onOpenChange(false);
  };

  if (!section || !frame) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Refine: {sectionLabels[section]}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Editable Content */}
          <div className="flex-1 flex flex-col border-r border-slate-200">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Working Content
              </span>
            </div>
            <div className="flex-1 p-4">
              <Textarea
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                placeholder="Your content will appear here..."
                className="h-full min-h-0 resize-none font-mono text-sm"
              />
            </div>
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAndClose}>
                Save Changes
              </Button>
            </div>
          </div>

          {/* Right: Chat */}
          <div className="w-96 flex flex-col bg-slate-50">
            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                AI Assistant
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onApply={handleApplySuggestion}
                />
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-slate-500">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe what you want to improve..."
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onApply: (suggestion: string) => void;
}

function MessageBubble({ message, onApply }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[90%] rounded-xl px-4 py-3',
          isUser
            ? 'bg-slate-900 text-white'
            : 'bg-white text-slate-700 border border-slate-200'
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>

        {/* Suggestion Box */}
        {message.suggestion && (
          <div className="mt-3 p-3 rounded-lg bg-violet-50 border border-violet-200 text-slate-700">
            <pre className="text-xs whitespace-pre-wrap font-mono mb-3 text-slate-600">
              {message.suggestion}
            </pre>
            <Button
              size="sm"
              onClick={() => onApply(message.suggestion!)}
              className="gap-1 bg-violet-600 hover:bg-violet-700"
            >
              <Check className="h-3.5 w-3.5" />
              Apply to Editor
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

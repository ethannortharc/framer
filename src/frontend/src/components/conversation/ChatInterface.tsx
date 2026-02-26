'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Send, Loader2, User, Bot, RotateCcw } from 'lucide-react';
import { ConversationMessage } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFrameStore } from '@/store';
import { pickLang } from '@/lib/api/transforms';

interface ChatInterfaceProps {
  messages: ConversationMessage[];
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  onRetryMessage?: (messageId: string) => void;
  disabled?: boolean;
  userName?: string;
  botName?: string;
}

export function ChatInterface({
  messages,
  isTyping,
  onSendMessage,
  onRetryMessage,
  disabled = false,
  userName,
  botName = 'Coach',
}: ChatInterfaceProps) {
  const contentLanguage = useFrameStore((s) => s.contentLanguage);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isTyping) return;
    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-700 mb-1">
              Start a conversation
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Describe what you&apos;re working on. I&apos;ll help you frame the
              problem, understand the user perspective, and define validation
              criteria.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-3',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 flex flex-col items-center gap-0.5 mt-0.5">
                <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-violet-600" />
                </div>
                <span className="text-[10px] text-slate-400">{botName}</span>
              </div>
            )}
            <div className="flex flex-col items-end gap-1">
              <div
                className={cn(
                  'max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? msg.status === 'failed'
                      ? 'bg-red-900 text-white'
                      : 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-800'
                )}
              >
                <p className="whitespace-pre-wrap">{pickLang(msg.content, msg.contentEn, msg.contentZh, contentLanguage)}</p>
              </div>
              {msg.status === 'failed' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-red-500">Failed to send</span>
                  {onRetryMessage && (
                    <button
                      onClick={() => onRetryMessage(msg.id)}
                      className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 font-medium"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Retry
                    </button>
                  )}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="flex-shrink-0 flex flex-col items-center gap-0.5 mt-0.5">
                <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-slate-600" />
                </div>
                {(msg.senderName || userName) && (
                  <span className="text-[10px] text-slate-400">{(msg.senderName || userName || '').split(' ')[0]}</span>
                )}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center mt-0.5">
              <Bot className="h-4 w-4 text-violet-600" />
            </div>
            <div className="bg-slate-100 rounded-xl px-4 py-2.5">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-slate-200 p-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you're working on..."
            disabled={disabled || isTyping}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || disabled || isTyping}
            className="h-10 w-10 rounded-xl p-0"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

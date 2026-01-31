'use client';

import React, { useState } from 'react';
import { Bug, Rocket, Compass, ClipboardList, Edit3 } from 'lucide-react';
import { FrameType } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NewFrameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (type: FrameType, useQuestionnaire: boolean) => void;
}

const frameTypes = [
  {
    type: 'bug' as FrameType,
    title: 'Bug Fix',
    description: "Something isn't working as expected",
    icon: Bug,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    hoverBg: 'hover:bg-rose-100',
  },
  {
    type: 'feature' as FrameType,
    title: 'Feature Development',
    description: 'Adding new functionality with known goals',
    icon: Rocket,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    hoverBg: 'hover:bg-emerald-100',
  },
  {
    type: 'exploration' as FrameType,
    title: 'Exploration',
    description: 'Open-ended research or investigation',
    icon: Compass,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverBg: 'hover:bg-blue-100',
  },
];

export function NewFrameModal({
  open,
  onOpenChange,
  onSelectType,
}: NewFrameModalProps) {
  const [selectedType, setSelectedType] = useState<FrameType | null>(null);
  const [step, setStep] = useState<'type' | 'method'>('type');

  const handleTypeSelect = (type: FrameType) => {
    setSelectedType(type);
    setStep('method');
  };

  const handleMethodSelect = (useQuestionnaire: boolean) => {
    if (selectedType) {
      onSelectType(selectedType, useQuestionnaire);
      // Reset state
      setSelectedType(null);
      setStep('type');
    }
  };

  const handleBack = () => {
    setStep('type');
    setSelectedType(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedType(null);
      setStep('type');
    }
    onOpenChange(open);
  };

  const selectedFrameType = frameTypes.find(ft => ft.type === selectedType);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'type' ? 'Create New Frame' : 'Choose How to Start'}
          </DialogTitle>
        </DialogHeader>

        {step === 'type' ? (
          <div className="py-4">
            <p className="text-sm text-slate-500 mb-4">
              What type of work are you framing?
            </p>
            <div className="space-y-3">
              {frameTypes.map((frameType) => {
                const Icon = frameType.icon;
                return (
                  <button
                    key={frameType.type}
                    onClick={() => handleTypeSelect(frameType.type)}
                    className={cn(
                      'w-full p-4 rounded-xl border text-left transition-all duration-200',
                      frameType.bgColor,
                      frameType.borderColor,
                      frameType.hoverBg,
                      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'p-2 rounded-lg bg-white shadow-sm',
                          frameType.color
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {frameType.title}
                        </div>
                        <div className="text-sm text-slate-500">
                          {frameType.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-4">
            {selectedFrameType && (
              <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                <div className={cn('p-1.5 rounded-lg', selectedFrameType.bgColor, selectedFrameType.color)}>
                  <selectedFrameType.icon className="h-4 w-4" />
                </div>
                <span className="font-medium text-slate-900">{selectedFrameType.title}</span>
              </div>
            )}

            <p className="text-sm text-slate-500 mb-4">
              How would you like to create this frame?
            </p>

            <div className="space-y-3">
              {/* Questionnaire Option */}
              <button
                onClick={() => handleMethodSelect(true)}
                className={cn(
                  'w-full p-4 rounded-xl border text-left transition-all duration-200',
                  'bg-violet-50 border-violet-200 hover:bg-violet-100',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-400'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white shadow-sm text-violet-600">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">
                      Guided Questionnaire
                    </div>
                    <div className="text-sm text-slate-500">
                      Answer questions to help structure your thinking. AI will generate a draft for you.
                    </div>
                    <div className="text-xs text-violet-600 mt-1 font-medium">
                      Recommended for new users
                    </div>
                  </div>
                </div>
              </button>

              {/* Manual Option */}
              <button
                onClick={() => handleMethodSelect(false)}
                className={cn(
                  'w-full p-4 rounded-xl border text-left transition-all duration-200',
                  'bg-slate-50 border-slate-200 hover:bg-slate-100',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white shadow-sm text-slate-600">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">
                      Manual Input
                    </div>
                    <div className="text-sm text-slate-500">
                      Start with a blank frame and fill in details yourself.
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      You can still use section questionnaires later
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-start mt-6 pt-4 border-t">
              <Button variant="ghost" onClick={handleBack}>
                ← Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from 'react';
import { X, CheckCircle2, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';
import { RevisionItem, RatingScore } from '../types';
import { calculateNextReview } from '../services/learningEngine';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { ModalPortal } from '@/components/ui/modal-portal';

interface AssessmentModalProps {
  items: RevisionItem[];
  onClose: () => void;
  onRecordRating: (item: RevisionItem, rating: RatingScore) => void;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({
  items,
  onClose,
  onRecordRating
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [selectedMCQ, setSelectedMCQ] = useState<string | null>(null);
  const [lastCalculatedResult, setLastCalculatedResult] = useState<{
    interval_days: number;
    next_review_due: string;
    rating: RatingScore;
  } | null>(null);

  if (items.length === 0) {
    return (
      <ModalPortal>
        <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto safe-top safe-bottom animate-in fade-in duration-150">
          <Empty className="bg-white border border-slate-200/90 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl my-auto animate-in zoom-in-95 duration-150">
            <EmptyHeader>
              <EmptyMedia
                variant="icon"
                className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center mb-0.5"
              >
                <CheckCircle2 size={28} />
              </EmptyMedia>
              <EmptyTitle className="text-base font-bold text-slate-900">All Caught Up!</EmptyTitle>
              <EmptyDescription className="text-xs text-slate-500 leading-relaxed">
                No recall assessments are due right now. Continue listening to your audio notes to strengthen retrieval cues.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="w-full pt-1">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                Back to Lessons
              </button>
            </EmptyContent>
          </Empty>
        </div>
      </ModalPortal>
    );
  }

  const currentItem = items[currentIndex];

  const handleRatingSelect = (rating: RatingScore) => {
    const result = calculateNextReview(currentItem, rating);
    setLastCalculatedResult({
      interval_days: result.interval_days,
      next_review_due: result.next_review_due,
      rating
    });
    onRecordRating(currentItem, rating);
  };

  const handleNext = () => {
    setLastCalculatedResult(null);
    setIsAnswerRevealed(false);
    setSelectedMCQ(null);
    if (currentIndex + 1 < items.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 overflow-y-auto safe-top safe-bottom text-slate-900 animate-in fade-in duration-150">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xl max-w-md mx-auto w-full my-auto space-y-5 animate-in zoom-in-95 duration-150">
          {/* Question Step Pills */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {items.map((_, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsAnswerRevealed(false);
                    setSelectedMCQ(null);
                    setLastCalculatedResult(null);
                  }}
                  className={`w-6 h-6 rounded-full text-[11px] font-mono font-bold flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-slate-900 text-white shadow-2xs scale-105'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  aria-label={`Jump to question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-slate-500">
              {currentIndex + 1}/{items.length}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800"
              aria-label="Close assessment"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Source Lesson Badge */}
        <div className="text-center">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700">
            {currentItem.subject_name || 'Lesson'}: {currentItem.audio_title}
          </span>
        </div>

        {/* Question Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-3.5 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <HelpCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <h3 className="text-sm font-bold text-slate-900 leading-snug">
              {currentItem.prompt}
            </h3>
          </div>

          {/* Multiple Choice Options */}
          {currentItem.options && currentItem.options.length > 0 && !isAnswerRevealed && (
            <div className="space-y-2 pt-1">
              {currentItem.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedMCQ(opt);
                    setIsAnswerRevealed(true);
                  }}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all ${
                    selectedMCQ === opt
                      ? 'bg-amber-50 border-amber-400 text-amber-900 font-semibold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* 1-Tap Recall Confidence & Reveal for Flashcards */}
          {(!currentItem.options || currentItem.options.length === 0) && !isAnswerRevealed && (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-semibold text-slate-600 block text-center">
                Test your memory before revealing:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAnswerRevealed(true);
                    handleRatingSelect(3); // Easy/Confident
                  }}
                  className="py-2 px-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold active:scale-95 transition-all text-center shadow-2xs"
                >
                  ⚡ Confident
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAnswerRevealed(true);
                    handleRatingSelect(1); // Hard/Unsure
                  }}
                  className="py-2 px-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold active:scale-95 transition-all text-center shadow-2xs"
                >
                  🤔 Vague
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAnswerRevealed(true);
                    handleRatingSelect(0); // Blank/Forgot
                  }}
                  className="py-2 px-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold active:scale-95 transition-all text-center shadow-2xs"
                >
                  🤷 Forgot
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsAnswerRevealed(true)}
                className="w-full mt-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>Just Show Answer</span>
              </button>
            </div>
          )}

          {/* Answer Section */}
          {isAnswerRevealed && (
            <div className="pt-3 border-t border-slate-200/80 space-y-2.5 animate-in fade-in duration-150">
              <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-800 block mb-0.5">
                  Correct Answer & Explanation
                </span>
                <p className="text-xs font-bold text-slate-900 leading-relaxed">
                  {currentItem.correct_answer}
                </p>
                {currentItem.explanation && (
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                    {currentItem.explanation}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Spaced Repetition Rating Buttons */}
        {isAnswerRevealed && !lastCalculatedResult && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-150">
            <p className="text-center text-xs font-semibold text-slate-600">
              How easily did you recall this?
            </p>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleRatingSelect(0)}
                className="py-2.5 px-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 active:scale-95 flex flex-col items-center justify-center transition-all shadow-2xs"
              >
                <span className="text-xs font-bold">Again</span>
                <span className="text-[10px] opacity-75 font-mono">1d</span>
              </button>

              <button
                onClick={() => handleRatingSelect(1)}
                className="py-2.5 px-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 active:scale-95 flex flex-col items-center justify-center transition-all shadow-2xs"
              >
                <span className="text-xs font-bold">Hard</span>
                <span className="text-[10px] opacity-75 font-mono">1d</span>
              </button>

              <button
                onClick={() => handleRatingSelect(2)}
                className="py-2.5 px-1 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 active:scale-95 flex flex-col items-center justify-center transition-all shadow-2xs"
              >
                <span className="text-xs font-bold">Good</span>
                <span className="text-[10px] opacity-75 font-mono">{Math.max(1, currentItem.interval_days * 2)}d</span>
              </button>

              <button
                onClick={() => handleRatingSelect(3)}
                className="py-2.5 px-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 active:scale-95 flex flex-col items-center justify-center transition-all shadow-2xs"
              >
                <span className="text-xs font-bold">Easy</span>
                <span className="text-[10px] opacity-75 font-mono">{Math.max(2, currentItem.interval_days * 3)}d</span>
              </button>
            </div>
          </div>
        )}

        {/* Next Review Feedback Banner */}
        {lastCalculatedResult && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Recall Saved to Spaced Repetition Schedule</span>
            </div>
            <p className="text-xs text-slate-700">
              Next scheduled review in <span className="font-bold text-slate-900">{lastCalculatedResult.interval_days} day(s)</span> on{' '}
              <span className="font-mono font-bold text-slate-900">{lastCalculatedResult.next_review_due}</span>.
            </p>
            <button
              onClick={handleNext}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold active:scale-95 transition-all flex items-center justify-center gap-1.5 text-xs shadow-xs"
            >
              <span>{currentIndex + 1 < items.length ? 'Next Question' : 'Complete Session'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        <div className="text-center text-[10px] text-slate-400 font-medium">
          Deterministic SuperMemo SM-2 Spaced Repetition Engine
        </div>
      </div>
    </div>
  </ModalPortal>
  );
};

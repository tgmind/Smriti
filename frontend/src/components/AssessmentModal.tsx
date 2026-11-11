import React, { useState } from 'react';
import { X, CheckCircle2, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';
import { RevisionItem, RatingScore } from '../types';
import { calculateNextReview } from '../services/learningEngine';

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
      <div className="fixed inset-0 z-50 bg-surface-950/95 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="bg-surface-850 border border-surface-700 p-6 rounded-3xl max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-surface-50">All Caught Up!</h3>
          <p className="text-xs text-surface-400 leading-relaxed">
            No recall assessments are due right now. You can continue listening to your lessons to strengthen exposure.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-amber-500 text-surface-950 font-bold hover:bg-amber-400 active:scale-95 transition-all"
          >
            Back to Lessons
          </button>
        </div>
      </div>
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
    <div className="fixed inset-0 z-50 bg-surface-950/95 backdrop-blur-xl flex flex-col justify-between p-5 overflow-y-auto safe-top safe-bottom text-surface-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Active Recall Assessment
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-surface-400">
            {currentIndex + 1} of {items.length}
          </span>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-surface-900 border border-surface-800 text-surface-400 hover:text-surface-200"
            aria-label="Close assessment"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Flashcard / Question Area */}
      <div className="max-w-md mx-auto w-full my-auto py-6 space-y-5">
        {/* Source Lesson Badge */}
        <div className="text-center">
          <span className="inline-block px-2.5 py-1 rounded-full bg-surface-800 border border-surface-700 text-[11px] font-semibold text-amber-300">
            {currentItem.subject_name || 'Lesson'}: {currentItem.audio_title}
          </span>
        </div>

        {/* Question Card */}
        <div className="bg-surface-850 border border-surface-700/80 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-start gap-2.5">
            <HelpCircle size={20} className="text-teal-400 flex-shrink-0 mt-0.5" />
            <h3 className="text-base font-bold text-surface-100 leading-snug">
              {currentItem.prompt}
            </h3>
          </div>

          {/* Multiple Choice Options (if present) */}
          {currentItem.options && currentItem.options.length > 0 && !isAnswerRevealed && (
            <div className="space-y-2 pt-2">
              {currentItem.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedMCQ(opt);
                    setIsAnswerRevealed(true);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs font-medium transition-all ${
                    selectedMCQ === opt
                      ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                      : 'bg-surface-800/80 border-surface-700 text-surface-300 hover:bg-surface-700'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Flip / Reveal Button for Flashcards */}
          {(!currentItem.options || currentItem.options.length === 0) && !isAnswerRevealed && (
            <button
              onClick={() => setIsAnswerRevealed(true)}
              className="w-full mt-4 py-3 rounded-2xl bg-surface-800 border border-surface-700 text-amber-400 font-bold text-xs hover:bg-surface-750 active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles size={14} />
              <span>Reveal Correct Answer</span>
            </button>
          )}

          {/* Answer Section */}
          {isAnswerRevealed && (
            <div className="pt-4 border-t border-surface-750 space-y-3 animate-in fade-in duration-200">
              <div className="bg-surface-900/90 border border-surface-700 p-4 rounded-2xl">
                <span className="text-[10px] uppercase tracking-wider font-bold text-teal-400 block mb-1">
                  Correct Answer & Explanation
                </span>
                <p className="text-sm font-semibold text-surface-50 leading-relaxed">
                  {currentItem.correct_answer}
                </p>
                {currentItem.explanation && (
                  <p className="text-xs text-surface-400 mt-2 leading-relaxed">
                    {currentItem.explanation}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Spaced Repetition Rating Buttons */}
        {isAnswerRevealed && !lastCalculatedResult && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <p className="text-center text-xs font-semibold text-surface-300">
              How easily did you recall this?
            </p>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleRatingSelect(0)}
                className="py-3 px-1 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 active:scale-95 flex flex-col items-center justify-center"
              >
                <span className="text-xs font-bold">Again</span>
                <span className="text-[10px] opacity-75 font-mono">1d</span>
              </button>

              <button
                onClick={() => handleRatingSelect(1)}
                className="py-3 px-1 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 active:scale-95 flex flex-col items-center justify-center"
              >
                <span className="text-xs font-bold">Hard</span>
                <span className="text-[10px] opacity-75 font-mono">1d</span>
              </button>

              <button
                onClick={() => handleRatingSelect(2)}
                className="py-3 px-1 rounded-2xl bg-teal-500/15 border border-teal-500/40 text-teal-300 hover:bg-teal-500/25 active:scale-95 flex flex-col items-center justify-center"
              >
                <span className="text-xs font-bold">Good</span>
                <span className="text-[10px] opacity-75 font-mono">{Math.max(1, currentItem.interval_days * 2)}d</span>
              </button>

              <button
                onClick={() => handleRatingSelect(3)}
                className="py-3 px-1 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 active:scale-95 flex flex-col items-center justify-center"
              >
                <span className="text-xs font-bold">Easy</span>
                <span className="text-[10px] opacity-75 font-mono">{Math.max(2, currentItem.interval_days * 3)}d</span>
              </button>
            </div>
          </div>
        )}

        {/* Next Review Feedback Banner */}
        {lastCalculatedResult && (
          <div className="bg-surface-850 border border-emerald-500/40 p-4 rounded-2xl text-center space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs">
              <CheckCircle2 size={16} />
              <span>Recall Saved to Spaced Repetition Schedule</span>
            </div>
            <p className="text-xs text-surface-300">
              Next scheduled review in <span className="font-bold text-amber-400">{lastCalculatedResult.interval_days} day(s)</span> on{' '}
              <span className="font-mono font-bold text-surface-100">{lastCalculatedResult.next_review_due}</span>.
            </p>
            <button
              onClick={handleNext}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-surface-950 font-bold hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-xs"
            >
              <span>{currentIndex + 1 < items.length ? 'Next Question' : 'Complete Session'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-surface-500 pb-2">
        Spaced Repetition Algorithm: SuperMemo SM-2 (Deterministic & Transparent)
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Headphones, CheckCircle2, Brain, Zap } from 'lucide-react';
import { DailyStudyStats, RevisionItem } from '../types';
import { formatDuration } from '../services/learningEngine';

interface ProgressTabProps {
  dailyStats: DailyStudyStats[];
  revisionItems: RevisionItem[];
  onOpenAssessment?: () => void;
}

export const ProgressTab: React.FC<ProgressTabProps> = ({
  dailyStats,
  revisionItems,
  onOpenAssessment
}) => {
  const [selectedStage, setSelectedStage] = useState<'learning' | 'review' | 'mastered' | null>('review');

  // 1. Exposure Metrics
  const totalLifetimeSeconds = dailyStats.reduce((acc, curr) => acc + curr.total_listening_seconds, 0);
  const totalCompletedPlays = dailyStats.reduce((acc, curr) => acc + curr.completed_plays, 0);
  const totalHours = (totalLifetimeSeconds / 3600).toFixed(1);

  // 2. Recall Metrics
  const totalAssessments = dailyStats.reduce((acc, curr) => acc + curr.assessments_taken, 0);
  const totalSuccessfulRecalls = dailyStats.reduce((acc, curr) => acc + curr.successful_recalls, 0);
  const recallSuccessRate = totalAssessments > 0 ? Math.round((totalSuccessfulRecalls / totalAssessments) * 100) : 0;

  // 3. Retention & Spaced Repetition Distribution
  const learningCount = revisionItems.filter(r => r.status === 'learning').length;
  const reviewCount = revisionItems.filter(r => r.status === 'review').length;
  const masteredCount = revisionItems.filter(r => r.status === 'mastered').length;

  const stageItems = selectedStage ? revisionItems.filter(r => r.status === selectedStage) : [];

  return (
    <div className="space-y-4 pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <div>
        <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-amber-700">
          STUDY ANALYTICS
        </span>
        <h1 className="text-xl font-extrabold text-slate-950 tracking-tight">
          Learning & Memory Progress
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Objective cognitive metrics. No fabricated retention scores.
        </p>
      </div>

      {/* Tripartite Philosophy Notice */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-xl text-center space-y-0.5 shadow-2xs">
          <Headphones size={16} className="mx-auto text-amber-700" />
          <span className="text-[10px] uppercase font-bold text-amber-900 block font-mono">1. Exposure</span>
          <span className="text-[11px] font-semibold text-slate-800">Listening</span>
        </div>
        <div className="bg-sky-50/70 border border-sky-200/80 p-2.5 rounded-xl text-center space-y-0.5 shadow-2xs">
          <Zap size={16} className="mx-auto text-sky-700" />
          <span className="text-[10px] uppercase font-bold text-sky-900 block font-mono">2. Recall</span>
          <span className="text-[11px] font-semibold text-slate-800">Active Test</span>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-200/80 p-2.5 rounded-xl text-center space-y-0.5 shadow-2xs">
          <Brain size={16} className="mx-auto text-emerald-700" />
          <span className="text-[10px] uppercase font-bold text-emerald-900 block font-mono">3. Retention</span>
          <span className="text-[11px] font-semibold text-slate-800">Spaced SM-2</span>
        </div>
      </div>

      {/* SECTION 1: EXPOSURE ANALYTICS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-1.5">
            <Headphones size={16} className="text-amber-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Exposure (Listening Time)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Actual Duration</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
              Total Listening
            </span>
            <span className="text-xl font-extrabold font-mono text-slate-950 mt-0.5 block">
              {totalHours} <span className="text-xs font-normal text-slate-500">hrs</span>
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {formatDuration(totalLifetimeSeconds)} total
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
              Completed Plays
            </span>
            <span className="text-xl font-extrabold font-mono text-slate-950 mt-0.5 block">
              {totalCompletedPlays} <span className="text-xs font-normal text-slate-500">plays</span>
            </span>
            <span className="text-[10px] text-emerald-700 mt-0.5 block flex items-center gap-0.5 font-medium">
              <CheckCircle2 size={11} /> ≥75% listened
            </span>
          </div>
        </div>

        {/* 6-Day Trend Visual */}
        <div className="pt-1">
          <span className="text-xs font-semibold text-slate-700 block mb-2">
            6-Day Study Exposure
          </span>
          <div className="flex items-end justify-between gap-2 h-20 pt-2 border-b border-slate-100 pb-1.5">
            {dailyStats.map((stat, idx) => {
              const maxSecs = Math.max(...dailyStats.map(s => s.total_listening_seconds), 3600);
              const heightPct = Math.max(12, (stat.total_listening_seconds / maxSecs) * 100);
              const dayLabel = stat.study_date.split('-').slice(1).join('/');

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    className="w-full max-w-[24px] rounded-md bg-amber-500 hover:bg-amber-600 transition-all shadow-2xs"
                    style={{ height: `${heightPct}%` }}
                    title={`${Math.round(stat.total_listening_seconds / 60)} minutes`}
                  />
                  <span className="text-[9px] font-mono text-slate-400">
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: RECALL ANALYTICS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-1.5">
            <Zap size={16} className="text-sky-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recall Performance
            </h2>
          </div>
          <span className="text-[11px] font-mono font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
            {recallSuccessRate}% Success
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
              Assessments
            </span>
            <span className="text-xl font-extrabold font-mono text-slate-950 mt-0.5 block">
              {totalAssessments} <span className="text-xs font-normal text-slate-500">checks</span>
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Active memory tests
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
              Accurate Recalls
            </span>
            <span className="text-xl font-extrabold font-mono text-sky-700 mt-0.5 block">
              {totalSuccessfulRecalls} <span className="text-xs font-normal text-slate-500">correct</span>
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Rated Good or Easy
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: RETENTION & SPACED REPETITION ENGINE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-1.5">
            <Brain size={16} className="text-emerald-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Retention Stability (SM-2)
            </h2>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            {revisionItems.length} concepts
          </span>
        </div>

        {/* 3 Interactive Clickable Stages */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setSelectedStage(selectedStage === 'learning' ? null : 'learning')}
            className={`p-2.5 rounded-xl text-center transition-all border ${
              selectedStage === 'learning'
                ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                : 'bg-amber-50/50 border-amber-200/70 hover:bg-amber-50'
            }`}
          >
            <span className="text-sm font-bold text-amber-800 block font-mono">
              {learningCount}
            </span>
            <span className="text-[10px] text-amber-900 uppercase font-bold mt-0.5 block">
              Learning
            </span>
            <span className="text-[9px] text-slate-500 font-mono">1–3d gap</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStage(selectedStage === 'review' ? null : 'review')}
            className={`p-2.5 rounded-xl text-center transition-all border ${
              selectedStage === 'review'
                ? 'bg-sky-100 border-sky-400 ring-2 ring-sky-400/20 shadow-xs'
                : 'bg-sky-50/50 border-sky-200/70 hover:bg-sky-50'
            }`}
          >
            <span className="text-sm font-bold text-sky-800 block font-mono">
              {reviewCount}
            </span>
            <span className="text-[10px] text-sky-900 uppercase font-bold mt-0.5 block">
              Review
            </span>
            <span className="text-[9px] text-slate-500 font-mono">4–20d gap</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStage(selectedStage === 'mastered' ? null : 'mastered')}
            className={`p-2.5 rounded-xl text-center transition-all border ${
              selectedStage === 'mastered'
                ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs'
                : 'bg-emerald-50/50 border-emerald-200/70 hover:bg-emerald-50'
            }`}
          >
            <span className="text-sm font-bold text-emerald-800 block font-mono">
              {masteredCount}
            </span>
            <span className="text-[10px] text-emerald-900 uppercase font-bold mt-0.5 block">
              Mastered
            </span>
            <span className="text-[9px] text-slate-500 font-mono">≥21d gap</span>
          </button>
        </div>

        {/* Selected Stage Concepts Breakdown */}
        {selectedStage && (
          <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-100">
            <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold px-0.5">
              <span className="capitalize">{selectedStage} Concepts ({stageItems.length}):</span>
              <span className="text-[10px] font-mono text-slate-400">SM-2 Spaced Interval</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
              {stageItems.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-2">
                  No concepts currently in this retention stage.
                </p>
              ) : (
                stageItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-slate-600 block uppercase">
                        {item.subject_name || 'Subject'}
                      </span>
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {item.prompt}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Due: {item.next_review_due} (Interval: {item.interval_days}d)
                      </span>
                    </div>

                    {onOpenAssessment && (
                      <button
                        type="button"
                        onClick={onOpenAssessment}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-amber-50 hover:border-amber-300 text-slate-700 hover:text-amber-800 text-[10px] font-mono font-bold flex items-center gap-0.5 active:scale-95 transition-all shadow-2xs flex-shrink-0"
                      >
                        <Zap size={10} fill="currentColor" />
                        <span>Test</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
          Review intervals expand dynamically via SuperMemo SM-2. When you rate items as "Easy" or "Good", intervals scale geometrically to build durable long-term retention.
        </p>
      </div>
    </div>
  );
};

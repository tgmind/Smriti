import React from 'react';
import { Headphones, CheckCircle2, Brain, Zap } from 'lucide-react';
import { DailyStudyStats, RevisionItem } from '../types';
import { formatDuration } from '../services/learningEngine';

interface ProgressTabProps {
  dailyStats: DailyStudyStats[];
  revisionItems: RevisionItem[];
}

export const ProgressTab: React.FC<ProgressTabProps> = ({
  dailyStats,
  revisionItems
}) => {
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

  return (
    <div className="space-y-6 pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <div>
        <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-amber-400">
          STUDY ANALYTICS
        </span>
        <h1 className="text-xl font-extrabold text-surface-50 tracking-tight">
          Learning & Memory Progress
        </h1>
        <p className="text-xs text-surface-400 mt-0.5">
          Transparent metrics. No fabricated retention scores.
        </p>
      </div>

      {/* Tripartite Philosophy Notice */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface-850 border border-surface-750 p-3 rounded-2xl text-center space-y-1">
          <Headphones size={18} className="mx-auto text-amber-400" />
          <span className="text-[10px] uppercase font-bold text-surface-400 block font-mono">1. Exposure</span>
          <span className="text-xs font-semibold text-surface-100">Audio Listening</span>
        </div>
        <div className="bg-surface-850 border border-surface-750 p-3 rounded-2xl text-center space-y-1">
          <Zap size={18} className="mx-auto text-teal-400" />
          <span className="text-[10px] uppercase font-bold text-surface-400 block font-mono">2. Recall</span>
          <span className="text-xs font-semibold text-surface-100">Active Testing</span>
        </div>
        <div className="bg-surface-850 border border-surface-750 p-3 rounded-2xl text-center space-y-1">
          <Brain size={18} className="mx-auto text-emerald-400" />
          <span className="text-[10px] uppercase font-bold text-surface-400 block font-mono">3. Retention</span>
          <span className="text-xs font-semibold text-surface-100">Spaced Review</span>
        </div>
      </div>

      {/* SECTION 1: EXPOSURE ANALYTICS */}
      <div className="bg-surface-850 border border-surface-750 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-surface-800 pb-3">
          <div className="flex items-center gap-2">
            <Headphones size={18} className="text-amber-400" />
            <h2 className="text-sm font-bold text-surface-100">
              Exposure (Listening Exposure)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-surface-400">Actual Duration</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-900 border border-surface-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-mono uppercase text-surface-400 font-semibold block">
              Lifetime Listening
            </span>
            <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
              {totalHours} <span className="text-xs font-normal text-surface-400">hrs</span>
            </span>
            <span className="text-[10px] text-surface-500 mt-0.5 block">
              {formatDuration(totalLifetimeSeconds)} total
            </span>
          </div>

          <div className="bg-surface-900 border border-surface-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-mono uppercase text-surface-400 font-semibold block">
              Completed Plays
            </span>
            <span className="text-2xl font-black font-mono text-surface-100 mt-1 block">
              {totalCompletedPlays} <span className="text-xs font-normal text-surface-400">sessions</span>
            </span>
            <span className="text-[10px] text-emerald-400/90 mt-0.5 block flex items-center gap-1">
              <CheckCircle2 size={11} /> ≥75% duration met
            </span>
          </div>
        </div>

        {/* 7-Day Listening Trend Visual */}
        <div className="pt-2">
          <span className="text-xs font-semibold text-surface-300 block mb-2">
            Recent 6-Day Study Exposure
          </span>
          <div className="flex items-end justify-between gap-2 h-24 pt-4 border-b border-surface-800 pb-2">
            {dailyStats.map((stat, idx) => {
              const maxSecs = Math.max(...dailyStats.map(s => s.total_listening_seconds), 3600);
              const heightPct = Math.max(12, (stat.total_listening_seconds / maxSecs) * 100);
              const dayLabel = stat.study_date.split('-').slice(1).join('/');

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className="w-full max-w-[28px] rounded-lg bg-gradient-to-t from-amber-600 to-amber-400 transition-all"
                    style={{ height: `${heightPct}%` }}
                    title={`${Math.round(stat.total_listening_seconds / 60)} minutes`}
                  />
                  <span className="text-[9px] font-mono text-surface-400">
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: RECALL ANALYTICS */}
      <div className="bg-surface-850 border border-surface-750 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-surface-800 pb-3">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-teal-400" />
            <h2 className="text-sm font-bold text-surface-100">
              Recall (Assessment Performance)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-teal-400">{recallSuccessRate}% Success</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-900 border border-surface-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-mono uppercase text-surface-400 font-semibold block">
              Assessments Taken
            </span>
            <span className="text-2xl font-black font-mono text-surface-100 mt-1 block">
              {totalAssessments} <span className="text-xs font-normal text-surface-400">checks</span>
            </span>
            <span className="text-[10px] text-surface-500 mt-0.5 block">
              Active memory tests
            </span>
          </div>

          <div className="bg-surface-900 border border-surface-800 p-3.5 rounded-2xl">
            <span className="text-[10px] font-mono uppercase text-surface-400 font-semibold block">
              Accurate Recalls
            </span>
            <span className="text-2xl font-black font-mono text-teal-400 mt-1 block">
              {totalSuccessfulRecalls} <span className="text-xs font-normal text-surface-400">correct</span>
            </span>
            <span className="text-[10px] text-surface-500 mt-0.5 block">
              Rated Good or Easy
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: RETENTION & SPACED REPETITION ENGINE */}
      <div className="bg-surface-850 border border-surface-750 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-surface-800 pb-3">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-emerald-400" />
            <h2 className="text-sm font-bold text-surface-100">
              Retention Stability (SM-2 State)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
            {revisionItems.length} concepts tracked
          </span>
        </div>

        {/* 3 Stages */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-900 border border-surface-800 p-3 rounded-xl text-center">
            <span className="text-xs font-bold text-amber-400 block font-mono">
              {learningCount}
            </span>
            <span className="text-[10px] text-surface-400 uppercase font-semibold mt-0.5 block">
              Learning
            </span>
            <span className="text-[9px] text-surface-500 font-mono">1–3d gap</span>
          </div>

          <div className="bg-surface-900 border border-surface-800 p-3 rounded-xl text-center">
            <span className="text-xs font-bold text-teal-400 block font-mono">
              {reviewCount}
            </span>
            <span className="text-[10px] text-surface-400 uppercase font-semibold mt-0.5 block">
              Review
            </span>
            <span className="text-[9px] text-surface-500 font-mono">4–20d gap</span>
          </div>

          <div className="bg-surface-900 border border-surface-800 p-3 rounded-xl text-center">
            <span className="text-xs font-bold text-emerald-400 block font-mono">
              {masteredCount}
            </span>
            <span className="text-[10px] text-surface-400 uppercase font-semibold mt-0.5 block">
              Mastered
            </span>
            <span className="text-[9px] text-surface-500 font-mono">≥21d gap</span>
          </div>
        </div>

        <p className="text-[11px] text-surface-400 leading-relaxed">
          Memory retention intervals are dynamically scheduled using SuperMemo SM-2. When you rate items as "Easy" or "Good", review gaps expand exponentially to reinforce long-term consolidation.
        </p>
      </div>
    </div>
  );
};

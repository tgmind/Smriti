import React from 'react';
import { Headphones, CheckCircle2, Calendar, TrendingUp } from 'lucide-react';
import { DailyStudyStats, RevisionItem } from '../types';
import { formatDuration } from '../services/learningEngine';

interface ProgressTabProps {
  dailyStats: DailyStudyStats[];
  revisionItems?: RevisionItem[];
}

export const ProgressTab: React.FC<ProgressTabProps> = ({
  dailyStats
}) => {
  // Exposure Metrics
  const totalLifetimeSeconds = dailyStats.reduce((acc, curr) => acc + curr.total_listening_seconds, 0);
  const totalCompletedPlays = dailyStats.reduce((acc, curr) => acc + curr.completed_plays, 0);
  const totalHours = (totalLifetimeSeconds / 3600).toFixed(1);
  const activeDays = dailyStats.filter(s => s.total_listening_seconds > 0).length;
  const avgMinutesPerActiveDay = activeDays > 0 ? Math.round((totalLifetimeSeconds / activeDays) / 60) : 0;

  return (
    <div className="space-y-4 pb-28 pt-3 px-4 max-w-md mx-auto">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-2xl font-black text-slate-950 tracking-tight">
          Study Progress
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Objective listening exposure & daily audio consistency.
        </p>
      </div>

      {/* Overview Metrics Cards (Matching the 3 pastel palettes) */}
      <div className="grid grid-cols-3 gap-2">
        {/* Exposure (Lavender / Blue) */}
        <div className="bg-[#EEECFE] border border-indigo-150/70 p-3 rounded-2xl text-center space-y-1 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto shadow-2xs">
            <Headphones size={15} />
          </div>
          <span className="text-lg font-black font-mono text-slate-950 block">
            {totalHours}h
          </span>
          <span className="text-[10px] uppercase font-bold text-indigo-900 block font-mono">
            Exposure
          </span>
        </div>

        {/* Completed (Mint Green) */}
        <div className="bg-[#E8F8F0] border border-emerald-200/70 p-3 rounded-2xl text-center space-y-1 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 size={15} />
          </div>
          <span className="text-lg font-black font-mono text-slate-950 block">
            {totalCompletedPlays}
          </span>
          <span className="text-[10px] uppercase font-bold text-emerald-900 block font-mono">
            Completed
          </span>
        </div>

        {/* Active Days (Yellow / Amber) */}
        <div className="bg-[#FFF5D6] border border-amber-200/70 p-3 rounded-2xl text-center space-y-1 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-2xs">
            <Calendar size={15} />
          </div>
          <span className="text-lg font-black font-mono text-slate-950 block">
            {activeDays}d
          </span>
          <span className="text-[10px] uppercase font-bold text-amber-900 block font-mono">
            Active Days
          </span>
        </div>
      </div>

      {/* EXPOSURE ANALYTICS & VISUAL CHART */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4.5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={16} className="text-blue-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Study Exposure Trend
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Avg ~{avgMinutesPerActiveDay}m/day
          </span>
        </div>

        {/* 6-Day Trend Visual */}
        <div className="pt-1">
          <div className="flex items-end justify-between gap-2 h-24 pt-2 border-b border-slate-100 pb-2">
            {dailyStats.map((stat, idx) => {
              const maxSecs = Math.max(...dailyStats.map(s => s.total_listening_seconds), 3600);
              const heightPct = Math.max(14, (stat.total_listening_seconds / maxSecs) * 100);
              const dayLabel = stat.study_date.split('-').slice(1).join('/');

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className="w-full max-w-[28px] rounded-xl bg-blue-600 hover:bg-blue-500 transition-all shadow-2xs cursor-default"
                    style={{ height: `${heightPct}%` }}
                    title={`${stat.study_date}: ${Math.round(stat.total_listening_seconds / 60)} minutes (${stat.completed_plays} plays)`}
                  />
                  <span className="text-[9px] font-mono font-medium text-slate-500">
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
              Total Duration
            </span>
            <span className="text-lg font-black font-mono text-slate-950 mt-0.5 block">
              {formatDuration(totalLifetimeSeconds)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Accumulated audio study
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
              Full Completions
            </span>
            <span className="text-lg font-black font-mono text-slate-950 mt-0.5 block">
              {totalCompletedPlays} <span className="text-xs font-normal text-slate-500">lectures</span>
            </span>
            <span className="text-[10px] text-emerald-700 mt-0.5 block flex items-center gap-0.5 font-medium">
              <CheckCircle2 size={11} /> ≥75% listened
            </span>
          </div>
        </div>
      </div>

      {/* DAILY STUDY ACTIVITY LOG */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-1.5">
            <Calendar size={16} className="text-slate-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recent Activity Log
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {dailyStats.length} records
          </span>
        </div>

        <div className="space-y-1.5">
          {[...dailyStats].reverse().map((stat, idx) => {
            const minutes = Math.round(stat.total_listening_seconds / 60);
            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/70 border border-slate-100 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-slate-800 block">
                    {stat.study_date}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {stat.completed_plays} completed {stat.completed_plays === 1 ? 'play' : 'plays'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-blue-700 block">
                    {minutes} min
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatDuration(stat.total_listening_seconds)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

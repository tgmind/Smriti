import React from 'react';
import { Play, Sparkles, Clock, Flame, ArrowRight, Mic, CheckCircle2 } from 'lucide-react';
import { AudioItem, RevisionItem, UserSettings } from '../types';
import { formatDuration } from '../services/learningEngine';

interface HomeTabProps {
  recentAudio: AudioItem[];
  revisionsDue: RevisionItem[];
  userSettings: UserSettings;
  todayListeningSeconds: number;
  onPlayAudio: (audio: AudioItem) => void;
  onOpenAssessment: () => void;
  onGoToRecord: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  recentAudio,
  revisionsDue,
  userSettings,
  todayListeningSeconds,
  onPlayAudio,
  onOpenAssessment,
  onGoToRecord
}) => {
  const goalSeconds = userSettings.daily_listening_goal_minutes * 60;
  const goalProgress = Math.min(100, Math.round((todayListeningSeconds / (goalSeconds || 1)) * 100));
  const continueAudio = recentAudio.length > 0 ? recentAudio[0] : null;

  return (
    <div className="space-y-5 pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Brand & Streak Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 font-extrabold flex items-center justify-center text-sm shadow-xs">
            स्म
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-950 tracking-tight leading-tight">
              SMRITI
            </h1>
            <p className="text-[11px] font-medium text-slate-500 tracking-tight">
              Listen • Repeat • Recall • Remember
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 shadow-2xs">
          <Flame size={14} className="text-amber-600 fill-amber-500" />
          <span className="text-xs font-mono font-bold">6 Day Streak</span>
        </div>
      </div>

      {/* Daily Listening Goal Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Clock size={14} />
            </div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daily Goal
            </h2>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
            {formatDuration(todayListeningSeconds)} / {userSettings.daily_listening_goal_minutes}m ({goalProgress}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${goalProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Targeted repetition builds durable recall.</span>
          {goalProgress >= 100 && (
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 size={13} /> Completed
            </span>
          )}
        </div>
      </div>

      {/* Today's Spaced Repetition Due Card */}
      {revisionsDue.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white border border-amber-200/90 rounded-2xl p-4.5 shadow-[0_2px_8px_rgba(245,158,11,0.08)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                <Sparkles size={15} />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Spaced Recall Due
              </h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold shadow-2xs">
              {revisionsDue.length} Due
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Active retrieval right now halts forgetting curves and recalculates your optimal retention intervals.
          </p>

          <button
            onClick={onOpenAssessment}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs shadow-xs"
          >
            <span>Start Active Recall Check</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Continue Listening Hero */}
      {continueAudio && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Continue Listening
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">Resume last</span>
          </div>

          <div
            onClick={() => onPlayAudio(continueAudio)}
            className="group bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center gap-3.5 cursor-pointer transition-all active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Play size={18} fill="currentColor" className="translate-x-0.5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.2 rounded-full bg-slate-100 border border-slate-200 text-[10px] uppercase font-bold text-slate-700 font-mono">
                  {continueAudio.subject_name || 'Subject'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatDuration(continueAudio.duration_seconds)}
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                {continueAudio.title}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Quick Record Studio Shortcut */}
      <div
        onClick={onGoToRecord}
        className="bg-white border border-dashed border-slate-300 hover:border-slate-400 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer transition-all active:scale-[0.98]"
      >
        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center flex-shrink-0">
          <Mic size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-slate-900">
            Record Audio Lesson or Voice Notes
          </h4>
          <p className="text-[11px] text-slate-500 truncate">
            DSP noise suppression & personal Google Drive sync
          </p>
        </div>
      </div>

      {/* Recent Audio Lessons */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Recent Lessons
          </h2>
          <span className="text-xs text-slate-600 font-medium font-mono">
            {recentAudio.length} total
          </span>
        </div>

        <div className="space-y-1.5">
          {recentAudio.slice(0, 4).map((audio) => (
            <div
              key={audio.id}
              onClick={() => onPlayAudio(audio)}
              className="bg-white border border-slate-200/70 hover:border-slate-300 p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] shadow-2xs"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="px-2 py-0.2 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 font-mono">
                    {audio.subject_name || 'General'}
                  </span>
                  {audio.is_downloaded_offline && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold font-mono">
                      OFFLINE
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {audio.title}
                </h4>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatDuration(audio.duration_seconds)}
                </span>
                <div className="w-7 h-7 rounded-full bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 flex items-center justify-center transition-colors">
                  <Play size={12} fill="currentColor" className="translate-x-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

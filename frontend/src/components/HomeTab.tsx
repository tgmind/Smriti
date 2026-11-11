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
    <div className="space-y-6 pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Top Welcome / Brand Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-amber-400">
            SMRITI LEARNING
          </span>
          <h1 className="text-xl font-extrabold text-surface-50 tracking-tight">
            Listen. Recall. Remember.
          </h1>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-850 border border-surface-750">
          <Flame size={16} className="text-amber-400 fill-amber-400" />
          <span className="text-xs font-mono font-bold text-surface-100">6 Day Streak</span>
        </div>
      </div>

      {/* Daily Listening Goal Card */}
      <div className="bg-surface-850 border border-surface-750/90 rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-400" />
            <h2 className="text-xs font-bold text-surface-200 uppercase tracking-wider">
              Daily Listening Goal
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400">
            {formatDuration(todayListeningSeconds)} / {userSettings.daily_listening_goal_minutes}m ({goalProgress}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-surface-900 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
            style={{ width: `${goalProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-3 text-[11px] text-surface-400">
          <span>Active exposure reinforces neural retrieval paths.</span>
          {goalProgress >= 100 && (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 size={13} /> Goal Achieved!
            </span>
          )}
        </div>
      </div>

      {/* Today's Spaced Repetition Due Card */}
      {revisionsDue.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/15 via-surface-850 to-surface-850 border border-amber-500/30 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <h2 className="text-sm font-bold text-surface-50">
                Spaced Revision Due
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-surface-950 text-xs font-extrabold">
              {revisionsDue.length} Due Today
            </span>
          </div>

          <p className="text-xs text-surface-300 leading-relaxed">
            Testing your memory now prevents forgetting curves from decaying your knowledge.
          </p>

          <button
            onClick={onOpenAssessment}
            className="w-full py-3 rounded-2xl bg-amber-500 text-surface-950 font-bold hover:bg-amber-400 active:scale-98 transition-all flex items-center justify-center gap-2 text-xs shadow-md"
          >
            <span>Start Active Recall Check</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Continue Listening Hero */}
      {continueAudio && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-400">
              Continue Listening
            </h2>
            <span className="text-[11px] text-surface-500 font-mono">Last studied</span>
          </div>

          <div
            onClick={() => onPlayAudio(continueAudio)}
            className="group bg-surface-850 border border-surface-750 hover:border-amber-500/40 rounded-3xl p-4 shadow-md flex items-center gap-4 cursor-pointer transition-all active:scale-98"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-surface-950 flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <Play size={20} fill="currentColor" className="translate-x-0.5" />
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-amber-400 font-mono tracking-wider">
                {continueAudio.subject_name || 'Subject'}
              </span>
              <h3 className="text-sm font-bold text-surface-100 truncate group-hover:text-amber-300 transition-colors">
                {continueAudio.title}
              </h3>
              <p className="text-xs text-surface-400 mt-0.5 font-mono">
                Duration: {formatDuration(continueAudio.duration_seconds)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Record Studio Shortcut */}
      <div
        onClick={onGoToRecord}
        className="bg-surface-850/60 border border-dashed border-surface-700 hover:border-amber-500/50 rounded-3xl p-4 flex items-center gap-3.5 cursor-pointer transition-all active:scale-98"
      >
        <div className="w-10 h-10 rounded-xl bg-surface-800 text-amber-400 flex items-center justify-center flex-shrink-0">
          <Mic size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-surface-200">
            Record New Lesson or Notes
          </h4>
          <p className="text-[11px] text-surface-400">
            One-tap recording with on-device noise reduction & Drive upload.
          </p>
        </div>
      </div>

      {/* Recently Added Audio */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-400">
            Recent Audio Lessons
          </h2>
          <span className="text-xs text-amber-400 font-semibold cursor-pointer">
            {recentAudio.length} audio files
          </span>
        </div>

        <div className="space-y-2">
          {recentAudio.slice(0, 4).map((audio) => (
            <div
              key={audio.id}
              onClick={() => onPlayAudio(audio)}
              className="bg-surface-850 border border-surface-800 hover:border-surface-700 p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-98"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-amber-400/90 uppercase font-mono">
                    {audio.subject_name || 'General'}
                  </span>
                  {audio.is_downloaded_offline && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-800 text-emerald-400 border border-emerald-500/20 font-mono">
                      OFFLINE
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-surface-100 truncate">
                  {audio.title}
                </h4>
              </div>

              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className="text-xs text-surface-400 font-mono">
                  {formatDuration(audio.duration_seconds)}
                </span>
                <div className="w-8 h-8 rounded-full bg-surface-800 hover:bg-amber-500 text-surface-300 hover:text-surface-950 flex items-center justify-center transition-colors">
                  <Play size={14} fill="currentColor" className="translate-x-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

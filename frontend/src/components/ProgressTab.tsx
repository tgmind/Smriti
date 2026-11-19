import React, { useState, useMemo } from 'react';
import { Play, BookOpen, RotateCcw } from 'lucide-react';
import { AudioItem, DailyStudyStats, RevisionItem } from '../types';
import { getPlayCountTheme, formatPlayCountBadge } from '../utils/playCountColor';
import { formatDuration, calculateMemoryStrength } from '../services/learningEngine';

export interface ProgressTabProps {
  audioItems?: AudioItem[];
  dailyStats?: DailyStudyStats[];
  revisionItems?: RevisionItem[];
  onPlayAudio?: (audio: AudioItem) => void;
}

export type MasteryFilter =
  | 'most_played'
  | 'yet_to_learn'
  | 'in_memory'
  | 'learned'
  | 'needs_revision';

export const ProgressTab: React.FC<ProgressTabProps> = ({
  audioItems = [],
  onPlayAudio
}) => {
  const [activeFilter, setActiveFilter] = useState<MasteryFilter>('most_played');

  // Compute 4-Tier mastery counts across all student audio notes
  const masteryCounts = useMemo(() => {
    let tier1 = 0; // < 20 (Not Still Learned)
    let tier2 = 0; // 20..49 (Building Memory)
    let tier3 = 0; // 50..70 (In Memory)
    let tier4 = 0; // > 70 (Learned by Heart)
    let needsRevisionCount = 0;

    for (const item of audioItems) {
      const count = item.play_count || 0;
      if (count < 20) tier1++;
      else if (count < 50) tier2++;
      else if (count <= 70) tier3++;
      else tier4++;

      const mem = calculateMemoryStrength(count, item.last_played_at || item.last_listened_at);
      if (mem.status === 'needs_revision') {
        needsRevisionCount++;
      }
    }

    return {
      tier1, // < 20 (Red)
      tier2, // 20..49 (Orange)
      tier3, // 50..70 (Yellow)
      tier4, // > 70 (Dark Green)
      needsRevisionCount,
      total: audioItems.length
    };
  }, [audioItems]);

  // Filter and sort tracks according to the active tab
  const displayedTracks = useMemo(() => {
    const list = [...audioItems];

    switch (activeFilter) {
      case 'needs_revision':
        return list
          .filter((a) => {
            const mem = calculateMemoryStrength(a.play_count || 0, a.last_played_at || a.last_listened_at);
            return mem.status === 'needs_revision';
          })
          .sort((a, b) => {
            const memA = calculateMemoryStrength(a.play_count || 0, a.last_played_at || a.last_listened_at);
            const memB = calculateMemoryStrength(b.play_count || 0, b.last_played_at || b.last_listened_at);
            return memA.score - memB.score; // Weakest memory first
          });

      case 'yet_to_learn':
        // playCount < 50, sorted lowest-first so weak tracks surface immediately
        return list
          .filter((a) => (a.play_count || 0) < 50)
          .sort((a, b) => (a.play_count || 0) - (b.play_count || 0));

      case 'in_memory':
        // 50 <= playCount <= 70, close to mastery
        return list
          .filter((a) => {
            const c = a.play_count || 0;
            return c >= 50 && c <= 70;
          })
          .sort((a, b) => (b.play_count || 0) - (a.play_count || 0));

      case 'learned':
        // playCount > 70, learned by heart
        return list
          .filter((a) => (a.play_count || 0) > 70)
          .sort((a, b) => (b.play_count || 0) - (a.play_count || 0));

      case 'most_played':
      default:
        // All tracks sorted descending by play count
        return list.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
    }
  }, [audioItems, activeFilter]);

  return (
    <div className="space-y-4 pb-36 pt-3 px-4 max-w-md mx-auto animate-in">
      {/* 1. Header with Vedic Philosophy Accent */}
      <div className="pt-1 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Study Progress
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[11px] font-semibold border border-amber-500/20">
              Smriti
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified play count analytics &amp; memorization mastery.
          </p>
        </div>

        {/* Revision Due Alert Pill if applicable */}
        {masteryCounts.needsRevisionCount > 0 && (
          <button
            onClick={() => setActiveFilter('needs_revision')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-bold hover:bg-orange-100 transition-colors shadow-2xs cursor-pointer animate-pulse"
            title="View notes that need revision"
          >
            <RotateCcw size={12} className="text-orange-600" />
            <span>{masteryCounts.needsRevisionCount} Needs Review</span>
          </button>
        )}
      </div>

      {/* 2. Mastery Breakdown Summary Strip (4-Tier Overview) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Tier 4: Learned by Heart (> 70) - Dark Green */}
        <div
          onClick={() => setActiveFilter('learned')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'learned'
              ? 'bg-green-100/90 border-green-400 ring-2 ring-green-600/30'
              : 'bg-green-50/70 border-green-200/90 hover:bg-green-100/60'
          }`}
          role="button"
          tabIndex={0}
          aria-label="Filter Learned by Heart tracks"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-800">
              Learned by Heart
            </span>
            <span className="size-2 rounded-full bg-green-700" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-green-950 tabular-nums">
              {masteryCounts.tier4}
            </span>
            <span className="text-[11px] font-medium text-green-700">tracks</span>
          </div>
          <span className="text-[10px] font-semibold text-green-800 block mt-0.5">
            &gt; 70 Plays
          </span>
        </div>

        {/* Tier 3: In Memory (50..70) - Yellow */}
        <div
          onClick={() => setActiveFilter('in_memory')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'in_memory'
              ? 'bg-yellow-100/90 border-yellow-400 ring-2 ring-yellow-500/30'
              : 'bg-yellow-50/70 border-yellow-200/90 hover:bg-yellow-100/60'
          }`}
          role="button"
          tabIndex={0}
          aria-label="Filter In Memory tracks"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-800">
              In Memory
            </span>
            <span className="size-2 rounded-full bg-yellow-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-yellow-950 tabular-nums">
              {masteryCounts.tier3}
            </span>
            <span className="text-[11px] font-medium text-yellow-700">tracks</span>
          </div>
          <span className="text-[10px] font-semibold text-yellow-800 block mt-0.5">
            50–70 Plays
          </span>
        </div>

        {/* Tier 2: Building Memory (20..49) - Orange */}
        <div
          onClick={() => setActiveFilter('yet_to_learn')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'yet_to_learn'
              ? 'bg-orange-100/90 border-orange-400 ring-2 ring-orange-500/30'
              : 'bg-orange-50/70 border-orange-200/90 hover:bg-orange-100/60'
          }`}
          role="button"
          tabIndex={0}
          aria-label="Filter Building Memory tracks"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800">
              Building Memory
            </span>
            <span className="size-2 rounded-full bg-orange-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-orange-950 tabular-nums">
              {masteryCounts.tier2}
            </span>
            <span className="text-[11px] font-medium text-orange-700">tracks</span>
          </div>
          <span className="text-[10px] font-semibold text-orange-800 block mt-0.5">
            20–49 Plays
          </span>
        </div>

        {/* Tier 1: Not Still Learned (< 20) - Red */}
        <div
          onClick={() => setActiveFilter('yet_to_learn')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'yet_to_learn'
              ? 'bg-red-100/90 border-red-400 ring-2 ring-red-500/30'
              : 'bg-red-50/70 border-red-200/90 hover:bg-red-100/60'
          }`}
          role="button"
          tabIndex={0}
          aria-label="Filter Not Still Learned tracks"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-800">
              Not Still Learned
            </span>
            <span className="size-2 rounded-full bg-red-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-red-950 tabular-nums">
              {masteryCounts.tier1}
            </span>
            <span className="text-[11px] font-medium text-red-700">tracks</span>
          </div>
          <span className="text-[10px] font-semibold text-red-800 block mt-0.5">
            &lt; 20 Plays
          </span>
        </div>
      </div>

      {/* 3. Interactive Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 border border-slate-200/80 rounded-2xl overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveFilter('most_played')}
          className={`flex-1 min-w-[75px] py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
            activeFilter === 'most_played'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Most Played
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('yet_to_learn')}
          className={`flex-1 min-w-[75px] py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
            activeFilter === 'yet_to_learn'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Yet to Learn
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('in_memory')}
          className={`flex-1 min-w-[75px] py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
            activeFilter === 'in_memory'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          In Memory
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('learned')}
          className={`flex-1 min-w-[75px] py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
            activeFilter === 'learned'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Learned
        </button>
        {masteryCounts.needsRevisionCount > 0 && (
          <button
            type="button"
            onClick={() => setActiveFilter('needs_revision')}
            className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
              activeFilter === 'needs_revision'
                ? 'bg-orange-500 text-white shadow-2xs'
                : 'text-orange-600 hover:text-orange-900'
            }`}
          >
            Revision
          </button>
        )}
      </div>

      {/* 4. Minimalist Track Analytics Rows (With Direct Practice Tap) */}
      <div className="space-y-2.5">
        {displayedTracks.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-2xs">
            <div className="size-10 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center shadow-2xs">
              <BookOpen size={18} />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No tracks in this category</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {activeFilter === 'learned'
                ? 'Keep listening to your audio notes! Complete 71+ genuine listens to master tracks by heart.'
                : activeFilter === 'in_memory'
                ? 'Tracks reach this stage when played between 50 and 70 times.'
                : activeFilter === 'needs_revision'
                ? 'All tracks are currently fresh in memory! Excellent consistency.'
                : 'Upload or record study notes to begin your memorization journey.'}
            </p>
          </div>
        ) : (
          displayedTracks.map((track, idx) => {
            const count = track.play_count || 0;
            const theme = getPlayCountTheme(count);
            const mem = calculateMemoryStrength(
              count,
              track.last_played_at || track.last_listened_at
            );

            return (
              <div
                key={track.id}
                onClick={() => onPlayAudio && onPlayAudio(track)}
                className="group relative bg-white hover:bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-[0.99] space-y-2.5"
                role="button"
                tabIndex={0}
                aria-label={`Play ${track.title} - ${count} plays`}
              >
                {/* Top: Rank, Title, Folder, Play Button */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Rank / Status indicator */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: theme.hex }}
                      />
                      <span className="text-xs font-mono font-semibold text-slate-400 tabular-nums">
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                    </div>

                    {/* Track Title & Subject */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate leading-tight">
                        {track.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 truncate">
                        <span>{track.subject_name || 'General'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="tabular-nums">{formatDuration(track.duration_seconds)}</span>
                        {mem.daysSinceLastPlay > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px] text-slate-400">
                              {mem.daysSinceLastPlay}d ago
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Color-Coded Play Count Badge + Practice Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span
                        className="text-sm font-extrabold tabular-nums block leading-none"
                        style={{ color: theme.hex }}
                      >
                        {formatPlayCountBadge(count)}
                      </span>
                      <span
                        className={`inline-block mt-0.5 px-1.5 py-0.2 rounded-md text-[9.5px] font-bold border ${theme.badgeClass}`}
                      >
                        {theme.label}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="size-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 active:scale-90 transition-all shrink-0 cursor-pointer"
                      title={`Practice ${track.title}`}
                      aria-label={`Practice ${track.title}`}
                    >
                      <Play size={12} fill="currentColor" className="translate-x-0.5" />
                    </button>
                  </div>
                </div>

                {/* Bottom: Subtle Horizontal Mastery Progress Bar + Vedic Stage Tag */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${mem.score}%`,
                        backgroundColor:
                          mem.status === 'needs_revision'
                            ? '#ea580c'
                            : mem.status === 'mastered'
                            ? '#166534'
                            : theme.hex
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                    <span className="text-amber-700/80 font-medium">
                      {mem.stageName}
                    </span>
                    <span className="tabular-nums font-mono text-[10px]">
                      {mem.score}% strength
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

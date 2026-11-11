import React, { useState } from 'react';
import { Search, Star, Play, CheckCircle2, Download, Filter, Sparkles, Plus } from 'lucide-react';
import { AudioItem, Subject } from '../types';
import { formatDuration } from '../services/learningEngine';

interface LibraryTabProps {
  audioItems: AudioItem[];
  subjects: Subject[];
  onPlayAudio: (audio: AudioItem) => void;
  onToggleFavorite: (audioId: string) => void;
  onToggleOffline: (audio: AudioItem) => void;
  onGoToRecord: () => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  audioItems,
  subjects,
  onPlayAudio,
  onToggleFavorite,
  onToggleOffline,
  onGoToRecord
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavoritesOnly, setFilterFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'duration' | 'title'>('recent');

  const filteredItems = audioItems.filter((item) => {
    if (selectedSubjectId && item.subject_id !== selectedSubjectId) return false;
    if (filterFavoritesOnly && !item.is_favorite) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchTerms = item.key_terms?.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTerms) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'duration') return b.duration_seconds - a.duration_seconds;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-4 pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-amber-400">
            AUDIO REPOSITORY
          </span>
          <h1 className="text-xl font-extrabold text-surface-50 tracking-tight">
            Study Library
          </h1>
        </div>

        <button
          onClick={onGoToRecord}
          className="py-1.5 px-3 rounded-full bg-amber-500 text-surface-950 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-400 active:scale-95 transition-all shadow-md"
        >
          <Plus size={16} />
          <span>New Audio</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search formulas, concepts, lessons..."
          className="w-full bg-surface-850 border border-surface-750 focus:border-amber-400 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-surface-100 placeholder:text-surface-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Subject Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedSubjectId(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${
            selectedSubjectId === null
              ? 'bg-amber-500 border-amber-400 text-surface-950 shadow-sm'
              : 'bg-surface-850 border-surface-750 text-surface-300 hover:bg-surface-800'
          }`}
        >
          All Subjects ({audioItems.length})
        </button>
        {subjects.map((sub) => {
          const isSelected = selectedSubjectId === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectId(isSelected ? null : sub.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${
                isSelected
                  ? 'bg-amber-500 border-amber-400 text-surface-950 shadow-sm'
                  : 'bg-surface-850 border-surface-750 text-surface-300 hover:bg-surface-800'
              }`}
            >
              {sub.name}
            </button>
          );
        })}
      </div>

      {/* Filter and Sorting Sub-Bar */}
      <div className="flex items-center justify-between text-xs text-surface-400 px-1 pt-1">
        <button
          onClick={() => setFilterFavoritesOnly(!filterFavoritesOnly)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
            filterFavoritesOnly
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
              : 'bg-surface-850 border-surface-800 text-surface-400 hover:text-surface-200'
          }`}
        >
          <Star size={13} fill={filterFavoritesOnly ? 'currentColor' : 'none'} />
          <span>Favorites Only</span>
        </button>

        <div className="flex items-center gap-1">
          <Filter size={13} />
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-surface-850 border border-surface-800 rounded-lg py-1 px-2 text-xs text-surface-300 focus:outline-none"
          >
            <option value="recent">Recently Added</option>
            <option value="duration">Longest Duration</option>
            <option value="title">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Audio Items List */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="bg-surface-850 border border-surface-800 rounded-3xl p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-surface-300">No audio found</p>
            <p className="text-xs text-surface-500">
              Try adjusting your search terms or subject filters.
            </p>
          </div>
        ) : (
          filteredItems.map((audio) => (
            <div
              key={audio.id}
              className="bg-surface-850 border border-surface-800 hover:border-surface-700 rounded-2xl p-4 transition-all shadow-sm space-y-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onPlayAudio(audio)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                      {audio.subject_name || 'Academic'}
                    </span>
                    {audio.audio_enhancement_applied && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono flex items-center gap-0.5">
                        <Sparkles size={9} /> ENHANCED
                      </span>
                    )}
                    {audio.is_downloaded_offline && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        OFFLINE
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-surface-100 hover:text-amber-300 transition-colors leading-snug">
                    {audio.title}
                  </h3>
                  {audio.description && (
                    <p className="text-xs text-surface-400 mt-1 line-clamp-1">
                      {audio.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onToggleFavorite(audio.id)}
                    className={`p-2 rounded-xl border transition-colors ${
                      audio.is_favorite
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-surface-900 border-surface-800 text-surface-400 hover:text-surface-200'
                    }`}
                    aria-label="Toggle favorite"
                  >
                    <Star size={15} fill={audio.is_favorite ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    onClick={() => onToggleOffline(audio)}
                    className={`p-2 rounded-xl border transition-colors ${
                      audio.is_downloaded_offline
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-surface-900 border-surface-800 text-surface-400 hover:text-surface-200'
                    }`}
                    aria-label="Toggle offline download"
                  >
                    {audio.is_downloaded_offline ? <CheckCircle2 size={15} /> : <Download size={15} />}
                  </button>

                  <button
                    onClick={() => onPlayAudio(audio)}
                    className="p-2.5 rounded-xl bg-amber-500 text-surface-950 hover:bg-amber-400 active:scale-95 transition-transform shadow-md"
                    aria-label="Play audio"
                  >
                    <Play size={16} fill="currentColor" className="translate-x-0.5" />
                  </button>
                </div>
              </div>

              {/* Key terms pills */}
              {audio.key_terms && audio.key_terms.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {audio.key_terms.map((term, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-surface-900 border border-surface-750 text-[10px] text-surface-300 font-mono"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              )}

              {/* Duration and Format info */}
              <div className="flex items-center justify-between text-[11px] text-surface-400 font-mono pt-1 border-t border-surface-800">
                <span>Duration: {formatDuration(audio.duration_seconds)}</span>
                <span className="uppercase">{audio.file_format} · {(audio.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

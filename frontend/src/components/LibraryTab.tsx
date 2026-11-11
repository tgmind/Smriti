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
          <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-amber-700">
            AUDIO REPOSITORY
          </span>
          <h1 className="text-xl font-extrabold text-slate-950 tracking-tight">
            Study Library
          </h1>
        </div>

        <button
          onClick={onGoToRecord}
          className="py-1.5 px-3 rounded-full bg-slate-900 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-800 active:scale-95 transition-all shadow-xs"
        >
          <Plus size={15} />
          <span>New Audio</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search formulas, concepts, lessons..."
          className="w-full bg-white border border-slate-200 focus:border-slate-400 rounded-xl pl-9.5 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
        />
      </div>

      {/* Subject Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedSubjectId(null)}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shadow-2xs ${
            selectedSubjectId === null
              ? 'bg-slate-900 border-slate-900 text-white'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
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
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shadow-2xs ${
                isSelected
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              {sub.name}
            </button>
          );
        })}
      </div>

      {/* Filter and Sorting Sub-Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-0.5 pt-0.5">
        <button
          onClick={() => setFilterFavoritesOnly(!filterFavoritesOnly)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors text-xs font-medium ${
            filterFavoritesOnly
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Star size={13} fill={filterFavoritesOnly ? 'currentColor' : 'none'} />
          <span>Favorites Only</span>
        </button>

        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-slate-400" />
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs text-slate-700 focus:outline-none shadow-2xs"
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
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-1.5 shadow-2xs">
            <p className="text-sm font-bold text-slate-800">No audio found</p>
            <p className="text-xs text-slate-500">
              Try adjusting your search terms or subject filters.
            </p>
          </div>
        ) : (
          filteredItems.map((audio) => (
            <div
              key={audio.id}
              className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onPlayAudio(audio)}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-2 py-0.2 rounded-full bg-slate-100 text-[10px] font-mono font-bold text-slate-700 uppercase">
                      {audio.subject_name || 'Academic'}
                    </span>
                    {audio.audio_enhancement_applied && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-mono flex items-center gap-0.5">
                        <Sparkles size={8} /> ENHANCED
                      </span>
                    )}
                    {audio.is_downloaded_offline && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                        OFFLINE
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-950 hover:text-amber-700 transition-colors leading-snug">
                    {audio.title}
                  </h3>
                  {audio.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {audio.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onToggleFavorite(audio.id)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      audio.is_favorite
                        ? 'bg-amber-50 border-amber-300 text-amber-600'
                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                    }`}
                    aria-label="Toggle favorite"
                  >
                    <Star size={14} fill={audio.is_favorite ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    onClick={() => onToggleOffline(audio)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      audio.is_downloaded_offline
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                    }`}
                    aria-label="Toggle offline download"
                  >
                    {audio.is_downloaded_offline ? <CheckCircle2 size={14} /> : <Download size={14} />}
                  </button>

                  <button
                    onClick={() => onPlayAudio(audio)}
                    className="p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-transform shadow-xs"
                    aria-label="Play audio"
                  >
                    <Play size={14} fill="currentColor" className="translate-x-0.5" />
                  </button>
                </div>
              </div>

              {/* Key terms pills */}
              {audio.key_terms && audio.key_terms.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {audio.key_terms.map((term, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-600 font-mono"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              )}

              {/* Duration and Format info */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1.5 border-t border-slate-100">
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

import React, { useState, useMemo } from 'react';
import { Search, Star, Play, CheckCircle2, Download, Sparkles, Plus, Zap, X } from 'lucide-react';
import { AudioItem, Subject } from '../types';
import { formatDuration } from '../services/learningEngine';

interface LibraryTabProps {
  audioItems: AudioItem[];
  subjects: Subject[];
  onPlayAudio: (audio: AudioItem) => void;
  onToggleFavorite: (audioId: string) => void;
  onToggleOffline: (audio: AudioItem) => void;
  onGoToRecord: () => void;
  onOpenAssessmentForAudio?: (audio: AudioItem) => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  audioItems,
  subjects,
  onPlayAudio,
  onToggleFavorite,
  onToggleOffline,
  onGoToRecord,
  onOpenAssessmentForAudio
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'favorites' | 'offline' | 'short' | 'long'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'duration' | 'title'>('recent');

  // Extract top key terms across library for 1-tap filter chips
  const popularTerms = useMemo(() => {
    const termCounts = new Map<string, number>();
    audioItems.forEach(item => {
      item.key_terms?.forEach(term => {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      });
    });
    return Array.from(termCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(entry => entry[0]);
  }, [audioItems]);

  const filteredItems = audioItems.filter((item) => {
    if (selectedSubjectId && item.subject_id !== selectedSubjectId) return false;
    if (filterMode === 'favorites' && !item.is_favorite) return false;
    if (filterMode === 'offline' && !item.is_downloaded_offline) return false;
    if (filterMode === 'short' && item.duration_seconds > 300) return false;
    if (filterMode === 'long' && item.duration_seconds <= 300) return false;

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

      {/* 1-Tap Smart Filter Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        <button
          onClick={() => setFilterMode('all')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold font-mono transition-all border whitespace-nowrap ${
            filterMode === 'all'
              ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          All ({audioItems.length})
        </button>
        <button
          onClick={() => setFilterMode('favorites')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold font-mono transition-all border whitespace-nowrap flex items-center gap-1 ${
            filterMode === 'favorites'
              ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-2xs'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <Star size={11} fill={filterMode === 'favorites' ? 'currentColor' : 'none'} />
          <span>Favorites</span>
        </button>
        <button
          onClick={() => setFilterMode('offline')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold font-mono transition-all border whitespace-nowrap flex items-center gap-1 ${
            filterMode === 'offline'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <CheckCircle2 size={11} />
          <span>Offline Ready</span>
        </button>
        <button
          onClick={() => setFilterMode('short')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold font-mono transition-all border whitespace-nowrap ${
            filterMode === 'short'
              ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          ⚡ Quick &lt;5m
        </button>
        <button
          onClick={() => setFilterMode('long')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold font-mono transition-all border whitespace-nowrap ${
            filterMode === 'long'
              ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          📚 Deep Dive &gt;5m
        </button>
      </div>

      {/* Search Input with Clear Button */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter or search formulas, concepts..."
          className="w-full bg-white border border-slate-200 focus:border-slate-400 rounded-xl pl-9.5 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 1-Tap Popular Topic Filter Chips */}
      {popularTerms.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block px-0.5">
            Quick Topic Filters:
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {popularTerms.map(term => {
              const isSelected = searchQuery.toLowerCase() === term.toLowerCase();
              return (
                <button
                  key={term}
                  onClick={() => setSearchQuery(isSelected ? '' : term)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-medium transition-all border whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {isSelected ? `✕ ${term}` : term}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
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
          const count = audioItems.filter(a => a.subject_id === sub.id).length;
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
              {sub.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Sorting Segmented Button Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-0.5 pt-0.5">
        <span className="text-[11px] font-mono text-slate-500">
          Showing {filteredItems.length} of {audioItems.length} lessons
        </span>

        {/* 1-Tap Sort Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => setSortBy('recent')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-all ${
              sortBy === 'recent'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setSortBy('duration')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-all ${
              sortBy === 'duration'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Length
          </button>
          <button
            onClick={() => setSortBy('title')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-all ${
              sortBy === 'title'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            A–Z
          </button>
        </div>
      </div>

      {/* Audio Items List */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-1.5 shadow-2xs">
            <p className="text-sm font-bold text-slate-800">No lessons match your filters</p>
            <p className="text-xs text-slate-500">
              Tap 'All' or clear the topic filters to see all lessons.
            </p>
            <button
              onClick={() => {
                setFilterMode('all');
                setSelectedSubjectId(null);
                setSearchQuery('');
              }}
              className="mt-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold"
            >
              Reset Filters
            </button>
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

                {/* Actions: Favorite, Offline, Recall, Play */}
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

                  {/* 1-Tap Recall Button */}
                  <button
                    onClick={() => onOpenAssessmentForAudio ? onOpenAssessmentForAudio(audio) : onPlayAudio(audio)}
                    className="p-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 active:scale-95 transition-all shadow-2xs"
                    title="Active recall test for this lesson"
                  >
                    <Zap size={14} fill="currentColor" />
                  </button>

                  {/* 1-Tap Play Button */}
                  <button
                    onClick={() => onPlayAudio(audio)}
                    className="p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-transform shadow-xs"
                    aria-label="Play audio"
                  >
                    <Play size={14} fill="currentColor" className="translate-x-0.5" />
                  </button>
                </div>
              </div>

              {/* Clickable Key terms pills */}
              {audio.key_terms && audio.key_terms.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {audio.key_terms.map((term, i) => (
                    <button
                      key={i}
                      onClick={() => setSearchQuery(term)}
                      className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] text-slate-600 hover:text-slate-900 font-mono transition-colors active:scale-95"
                      title={`Filter by ${term}`}
                    >
                      #{term}
                    </button>
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

import React, { useState, useMemo } from 'react';
import {
  Search,
  Star,
  Play,
  Pause,
  CheckCircle2,
  Download,
  Sparkles,
  Plus,
  Zap,
  X,
  ChevronRight,
  ArrowLeft,
  Atom,
  FlaskConical,
  Dna,
  Binary,
  BookOpen,
  Folder,
  Clock,
  FileAudio,
  Check,
  SlidersHorizontal,
  Cloud
} from 'lucide-react';
import { AudioItem, Subject, PlaybackState } from '../types';
import { formatDuration } from '../services/learningEngine';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface LibraryTabProps {
  audioItems: AudioItem[];
  subjects: Subject[];
  playbackState?: PlaybackState;
  onTogglePlay?: () => void;
  onSeek?: (seconds: number) => void;
  onSetSpeed?: (speed: number) => void;
  onPlayAudio: (audio: AudioItem) => void;
  onToggleFavorite: (audioId: string) => void;
  onToggleOffline: (audio: AudioItem) => void;
  onGoToRecord: () => void;
}

type LibraryViewMode = 'topics' | 'subject' | 'note';
type FilterMode = 'all' | 'favorites' | 'offline' | 'short';
type SortMode = 'recent' | 'duration' | 'title';

export const LibraryTab: React.FC<LibraryTabProps> = ({
  audioItems,
  subjects,
  playbackState,
  onTogglePlay,
  onSeek,
  onSetSpeed,
  onPlayAudio,
  onToggleFavorite,
  onToggleOffline,
  onGoToRecord
}) => {
  // 3-Tier Navigation State: Library (topics) -> Subject -> Audio Note
  const [viewMode, setViewMode] = useState<LibraryViewMode>('topics');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [selectedTopicTag, setSelectedTopicTag] = useState<string | null>(null);

  // Selected subject & audio objects
  const selectedSubject = useMemo(
    () => subjects.find(s => s.id === selectedSubjectId) || null,
    [subjects, selectedSubjectId]
  );

  const selectedAudio = useMemo(
    () => audioItems.find(a => a.id === selectedAudioId) || null,
    [audioItems, selectedAudioId]
  );

  // Navigation handlers
  const handleOpenSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedAudioId(null);
    setViewMode('subject');
    setSelectedTopicTag(null);
  };

  const handleOpenAudioNote = (audio: AudioItem) => {
    setSelectedAudioId(audio.id);
    if (!selectedSubjectId && audio.subject_id) {
      setSelectedSubjectId(audio.subject_id);
    }
    setViewMode('note');
  };

  const handleBackToTopics = () => {
    setSelectedSubjectId(null);
    setSelectedAudioId(null);
    setViewMode('topics');
    setSelectedTopicTag(null);
  };

  const handleBackToSubject = () => {
    setSelectedAudioId(null);
    setViewMode('subject');
  };

  // Helper: map icon_name to Lucide icon component
  const getSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'Atom': return Atom;
      case 'FlaskConical': return FlaskConical;
      case 'Dna': return Dna;
      case 'Binary': return Binary;
      default: return BookOpen;
    }
  };

  // Helper: subject theme colors
  const getSubjectTheme = (colorHex: string) => {
    switch (colorHex) {
      case '#38bdf8': // Sky blue (Physics)
        return {
          bg: 'bg-sky-50 text-sky-700',
          border: 'border-sky-200/80',
          activeBg: 'bg-sky-500 text-white',
          badge: 'bg-sky-100 text-sky-800 border-sky-200',
          dot: 'bg-sky-500',
          accent: 'text-sky-600',
          lightBg: 'from-sky-50/70 via-white to-white'
        };
      case '#f59e0b': // Amber (Chemistry)
        return {
          bg: 'bg-amber-50 text-amber-700',
          border: 'border-amber-200/80',
          activeBg: 'bg-amber-500 text-slate-950',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          accent: 'text-amber-600',
          lightBg: 'from-amber-50/70 via-white to-white'
        };
      case '#10b981': // Emerald (Biology)
        return {
          bg: 'bg-emerald-50 text-emerald-700',
          border: 'border-emerald-200/80',
          activeBg: 'bg-emerald-600 text-white',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          accent: 'text-emerald-600',
          lightBg: 'from-emerald-50/70 via-white to-white'
        };
      case '#a855f7': // Purple (Mathematics)
        return {
          bg: 'bg-purple-50 text-purple-700',
          border: 'border-purple-200/80',
          activeBg: 'bg-purple-600 text-white',
          badge: 'bg-purple-100 text-purple-800 border-purple-200',
          dot: 'bg-purple-500',
          accent: 'text-purple-600',
          lightBg: 'from-purple-50/70 via-white to-white'
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700',
          border: 'border-slate-200',
          activeBg: 'bg-slate-900 text-white',
          badge: 'bg-slate-100 text-slate-800 border-slate-200',
          dot: 'bg-slate-500',
          accent: 'text-slate-600',
          lightBg: 'from-slate-50 to-white'
        };
    }
  };

  // Group audio items by subject ID
  const audiosBySubject = useMemo(() => {
    const map = new Map<string, AudioItem[]>();
    audioItems.forEach(item => {
      const subId = item.subject_id || 'general';
      if (!map.has(subId)) map.set(subId, []);
      map.get(subId)!.push(item);
    });
    return map;
  }, [audioItems]);

  // Aggregate stats across all subjects
  const libraryStats = useMemo(() => {
    const totalDurationSeconds = audioItems.reduce((acc, curr) => acc + curr.duration_seconds, 0);
    const totalOffline = audioItems.filter(a => a.is_downloaded_offline).length;
    const totalFavorites = audioItems.filter(a => a.is_favorite).length;
    return {
      totalSubjects: subjects.length,
      totalAudios: audioItems.length,
      totalDurationSeconds,
      totalOffline,
      totalFavorites
    };
  }, [audioItems, subjects]);

  // Filter and sort audio items for a specific subject (or all if subject is null)
  const getSubjectAudios = (subjectId: string | null) => {
    let items = audioItems;
    if (subjectId) {
      items = items.filter(a => a.subject_id === subjectId);
    }

    if (filterMode === 'favorites') items = items.filter(a => a.is_favorite);
    if (filterMode === 'offline') items = items.filter(a => a.is_downloaded_offline);
    if (filterMode === 'short') items = items.filter(a => a.duration_seconds <= 300);

    if (selectedTopicTag) {
      items = items.filter(a => a.key_terms?.some(t => t.toLowerCase() === selectedTopicTag.toLowerCase()));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item => {
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchTerms = item.key_terms?.some(t => t.toLowerCase().includes(q));
        const matchSubject = item.subject_name?.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchTerms || matchSubject;
      });
    }

    return items.sort((a, b) => {
      if (sortMode === 'duration') return b.duration_seconds - a.duration_seconds;
      if (sortMode === 'title') return a.title.localeCompare(b.title);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  // Popular key terms for the current active scope
  const popularTerms = useMemo(() => {
    const scopeAudios = selectedSubjectId
      ? audioItems.filter(a => a.subject_id === selectedSubjectId)
      : audioItems;

    const termCounts = new Map<string, number>();
    scopeAudios.forEach(item => {
      item.key_terms?.forEach(term => {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      });
    });

    return Array.from(termCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(entry => entry[0]);
  }, [audioItems, selectedSubjectId]);

  // Is an audio currently playing in the active session
  const isAudioPlaying = (audioId: string) => {
    return playbackState?.currentAudio?.id === audioId && playbackState.isPlaying;
  };

  // =========================================================================
  // RENDER LEVEL 3: AUDIO NOTE VIEW
  // =========================================================================
  if (viewMode === 'note' && selectedAudio) {
    const isPlaying = isAudioPlaying(selectedAudio.id);
    const audioSubject = subjects.find(s => s.id === selectedAudio.subject_id);
    const subjectTheme = audioSubject ? getSubjectTheme(audioSubject.color_hex) : getSubjectTheme('');
    const SubjectIcon = audioSubject ? getSubjectIcon(audioSubject.icon_name) : BookOpen;

    return (
      <div className="space-y-4 pb-28 pt-3 px-4 max-w-md mx-auto animate-in">
        {/* Navigation Breadcrumb & Back Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <button
            onClick={handleBackToSubject}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 transition-colors cursor-pointer group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to {audioSubject?.name || 'Subject'}</span>
          </button>

          {/* Quick Actions (Favorite & Offline) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleFavorite(selectedAudio.id)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                selectedAudio.is_favorite
                  ? 'bg-amber-50 border-amber-300 text-amber-600 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title={selectedAudio.is_favorite ? 'Favorited' : 'Add to Favorites'}
            >
              <Star size={15} fill={selectedAudio.is_favorite ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={() => onToggleOffline(selectedAudio)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                selectedAudio.is_downloaded_offline
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title={selectedAudio.is_downloaded_offline ? 'Downloaded offline' : 'Download for offline study'}
            >
              {selectedAudio.is_downloaded_offline ? <CheckCircle2 size={15} /> : <Download size={15} />}
            </button>
          </div>
        </div>

        {/* Audio Note Header Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-3">
          {/* Subject Badge & Status Indicators */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono border ${subjectTheme.badge}`}>
                <SubjectIcon size={12} />
                <span>{audioSubject?.name || selectedAudio.subject_name || 'Academic'}</span>
              </span>

              {selectedAudio.is_downloaded_offline && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold font-mono flex items-center gap-1">
                  <Check size={10} /> OFFLINE
                </span>
              )}
            </div>
          </div>

          {/* Title & Metadata */}
          <div>
            <h1 className="text-base font-extrabold text-slate-950 leading-snug tracking-tight">
              {selectedAudio.title}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDuration(selectedAudio.duration_seconds)}
              </span>
              <span>•</span>
              <span className="uppercase">{selectedAudio.file_format || 'M4A'} Audio</span>
              <span>•</span>
              <span>{(selectedAudio.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          </div>

          {/* Dedicated Playback Controller */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (isPlaying && onTogglePlay) {
                      onTogglePlay();
                    } else {
                      onPlayAudio(selectedAudio);
                    }
                  }}
                  className="w-12 h-12 rounded-full bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center transition-all active:scale-95 shadow-md shadow-slate-950/20 cursor-pointer"
                  aria-label={isPlaying ? 'Pause audio' : 'Play audio note'}
                >
                  {isPlaying ? (
                    <Pause size={20} fill="currentColor" />
                  ) : (
                    <Play size={20} fill="currentColor" className="translate-x-0.5" />
                  )}
                </button>

                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {isPlaying ? 'Now Playing' : 'Ready to Listen'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatDuration(selectedAudio.duration_seconds)} full duration
                  </span>
                </div>
              </div>

              {/* Speed chips */}
              {onSetSpeed && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  {[1.0, 1.25, 1.5].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => onSetSpeed(speed)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        playbackState?.playbackSpeed === speed
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scrubber Progress Bar */}
            <div className="space-y-1 pt-1">
              <input
                type="range"
                min={0}
                max={selectedAudio.duration_seconds}
                value={isPlaying ? playbackState?.positionSeconds || 0 : 0}
                onChange={(e) => onSeek && onSeek(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>{formatDuration(isPlaying ? playbackState?.positionSeconds || 0 : 0)}</span>
                <span>{formatDuration(selectedAudio.duration_seconds)}</span>
              </div>
            </div>

            {/* Waveform Visualization Bars */}
            <div className="flex items-end justify-between h-9 gap-1 pt-1 px-1">
              {selectedAudio.waveform_peaks.slice(0, 32).map((peak, idx) => {
                const heightPercent = Math.max(15, Math.min(100, peak));
                const barIsActive = isPlaying && ((idx / 32) * selectedAudio.duration_seconds <= (playbackState?.positionSeconds || 0));
                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-full transition-all duration-150 ${
                      barIsActive ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Concept Notes & Formula Breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <BookOpen size={16} className="text-slate-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Concept & Formula Summary
            </h3>
          </div>

          {selectedAudio.description && (
            <p className="text-xs text-slate-700 leading-relaxed">
              {selectedAudio.description}
            </p>
          )}

          {/* Key terms pills */}
          {selectedAudio.key_terms && selectedAudio.key_terms.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                Target Concepts / Formulas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedAudio.key_terms.map(term => (
                  <span
                    key={term}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-mono font-medium border border-slate-200/70"
                  >
                    #{term}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sovereign Storage & Audio File Status */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
            Storage & Sovereign Ownership:
          </span>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Google Drive Location:</span>
            <span className="font-mono text-slate-800 font-semibold truncate max-w-[200px]">
              My Drive/Smriti/{audioSubject?.name || 'Academic'}/
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Offline Audio Cache:</span>
            <span className={`font-mono font-semibold ${selectedAudio.is_downloaded_offline ? 'text-emerald-600' : 'text-slate-400'}`}>
              {selectedAudio.is_downloaded_offline ? 'Available (Instant Local Play)' : 'Stream via Cloud'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER LEVEL 2: SUBJECT TOPIC DETAIL (Audio files inside selected subject)
  // =========================================================================
  if (viewMode === 'subject' && selectedSubject) {
    const subjectAudios = getSubjectAudios(selectedSubject.id);
    const subjectTheme = getSubjectTheme(selectedSubject.color_hex);
    const SubjectIcon = getSubjectIcon(selectedSubject.icon_name);
    const totalSubjectDuration = subjectAudios.reduce((acc, curr) => acc + curr.duration_seconds, 0);

    return (
      <div className="space-y-4 pb-28 pt-3 px-4 max-w-md mx-auto animate-in">
        {/* Navigation Breadcrumb Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToTopics}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 transition-colors cursor-pointer group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>All Subject Topics</span>
          </button>

          <button
            onClick={onGoToRecord}
            className="py-1 px-2.5 rounded-full bg-slate-950 text-white font-semibold text-[11px] flex items-center gap-1 hover:bg-slate-800 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <Plus size={13} />
            <span>Add to {selectedSubject.name}</span>
          </button>
        </div>

        {/* Subject Topic Banner Card (Telegram Style Topic Card) */}
        <div className={`bg-gradient-to-br ${subjectTheme.lightBg || 'from-slate-50 to-white'} border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl ${subjectTheme.bg} flex items-center justify-center shrink-0 shadow-xs border ${subjectTheme.border}`}>
                <SubjectIcon size={24} />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-950 tracking-tight leading-tight">
                  {selectedSubject.name}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  {selectedSubject.description || `${subjectAudios.length} recorded audio study lessons`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-600 pt-1 border-t border-slate-200/60">
            <span className="font-bold text-slate-900">{subjectAudios.length} Audio Notes</span>
            <span>•</span>
            <span>{formatDuration(totalSubjectDuration)} total</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">
              {subjectAudios.filter(a => a.is_downloaded_offline).length} Offline
            </span>
          </div>
        </div>

        {/* Search bar inside this Subject */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${selectedSubject.name} formulas & notes...`}
            className="w-full bg-white border border-slate-200/90 focus:border-slate-400 rounded-xl pl-9.5 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Quick Topic Chips for this Subject */}
        {popularTerms.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Subject Key Concepts:
              </span>
              {selectedTopicTag && (
                <button
                  onClick={() => setSelectedTopicTag(null)}
                  className="text-[10px] text-amber-700 hover:underline font-mono"
                >
                  Clear Tag
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {popularTerms.map(term => {
                const isSelected = selectedTopicTag?.toLowerCase() === term.toLowerCase();
                return (
                  <button
                    key={term}
                    onClick={() => setSelectedTopicTag(isSelected ? null : term)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all border whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-slate-950 border-slate-950 text-white font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    #{term}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sort & Scope Header */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-0.5 pt-1">
          <span className="font-mono text-[11px] text-slate-600 font-medium">
            Showing {subjectAudios.length} audio notes
          </span>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            <button
              onClick={() => setSortMode('recent')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                sortMode === 'recent' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setSortMode('duration')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                sortMode === 'duration' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Length
            </button>
            <button
              onClick={() => setSortMode('title')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                sortMode === 'title' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A–Z
            </button>
          </div>
        </div>

        {/* Audio Files List for Selected Subject */}
        <div className="space-y-2.5">
          {subjectAudios.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-7 text-center space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <FileAudio size={20} />
              </div>
              <p className="text-xs font-bold text-slate-800">No audio notes match criteria</p>
              <p className="text-[11px] text-slate-500">
                Clear active filters or record a new lesson for {selectedSubject.name}.
              </p>
            </div>
          ) : (
            subjectAudios.map((audio) => {
              const isPlaying = isAudioPlaying(audio.id);

              return (
                <div
                  key={audio.id}
                  className="group bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-3.5 transition-all shadow-2xs hover:shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => handleOpenAudioNote(audio)}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        {audio.is_downloaded_offline && (
                          <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[9px] font-bold font-mono">
                            OFFLINE
                          </span>
                        )}
                        {audio.audio_enhancement_applied && (
                          <span className="px-1.5 py-0.2 rounded-md bg-sky-50 text-sky-700 border border-sky-200/80 text-[9px] font-bold font-mono flex items-center gap-0.5">
                            <Sparkles size={8} /> DSP
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-amber-600 transition-colors">
                        {audio.title}
                      </h3>

                      {audio.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {audio.description}
                        </p>
                      )}
                    </div>

                    {/* Quick Play & Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onToggleFavorite(audio.id)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          audio.is_favorite
                            ? 'bg-amber-50 border-amber-300 text-amber-500 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-300 hover:text-slate-500'
                        }`}
                        title="Toggle Favorite"
                      >
                        <Star size={13} fill={audio.is_favorite ? 'currentColor' : 'none'} />
                      </button>

                      <button
                        onClick={() => {
                          if (isPlaying && onTogglePlay) {
                            onTogglePlay();
                          } else {
                            onPlayAudio(audio);
                          }
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xs hover:scale-105 cursor-pointer ${
                          isPlaying
                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-500/30'
                            : 'bg-slate-950 text-white hover:bg-slate-800'
                        }`}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <Pause size={13} fill="currentColor" />
                        ) : (
                          <Play size={13} fill="currentColor" className="translate-x-0.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Card Footer: Tags & Detail CTA */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                    <span className="font-semibold text-slate-600">
                      {formatDuration(audio.duration_seconds)}
                    </span>

                    <button
                      onClick={() => handleOpenAudioNote(audio)}
                      className="text-slate-700 hover:text-slate-950 font-bold flex items-center gap-0.5 text-xs cursor-pointer"
                    >
                      <span>View Note</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER LEVEL 1: LIBRARY (DROPBOX / TELEGRAM STYLE FOLDERS LIST)
  // =========================================================================
  const allFilteredAudios = getSubjectAudios(null);

  return (
    <div className="space-y-4 pb-28 pt-3 px-4 max-w-md mx-auto animate-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">
            Library
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured subject topics & audio notes.
          </p>
        </div>

        <button
          onClick={onGoToRecord}
          className="py-1.5 px-3 rounded-full bg-slate-950 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-800 active:scale-95 transition-all shadow-xs cursor-pointer"
        >
          <Plus size={15} />
          <span>New Audio</span>
        </button>
      </div>

      {/* Global Search with Filter Sliders */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search subjects, formulas, concepts..."
          className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
        />
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Filter"
            className="absolute right-3 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <SlidersHorizontal size={15} />
          </button>
        )}
      </div>

      {/* Action Chips Row (Upload, Folder, Scan style in Image 1) */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onGoToRecord}
          className="bg-[#E8F8F0] hover:bg-[#DCF3E7] text-emerald-800 border border-emerald-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          <Plus size={15} className="text-emerald-700" />
          <span>Upload</span>
        </button>

        <button
          onClick={onGoToRecord}
          className="bg-[#FFEFEF] hover:bg-[#FFE5E5] text-rose-800 border border-rose-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          <Folder size={15} className="text-rose-700" />
          <span>New Topic</span>
        </button>

        <button
          onClick={onGoToRecord}
          className="bg-[#EEF6FF] hover:bg-[#E0EEFF] text-sky-800 border border-sky-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          <Cloud size={15} className="text-sky-700" />
          <span>Drive</span>
        </button>
      </div>

      {/* Base UI Tabs for Filter Modes */}
      <Tabs
        value={filterMode}
        onValueChange={(val) => setFilterMode(val as FilterMode)}
        className="w-full space-y-3"
      >
        <TabsList className="w-full grid grid-cols-4 p-1 bg-slate-100/90 border border-slate-200/80 rounded-2xl h-10 shadow-2xs">
          <TabsTrigger value="all" className="flex items-center justify-center gap-1 text-xs rounded-xl">
            <span>All</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700">
              {libraryStats.totalAudios}
            </span>
          </TabsTrigger>

          <TabsTrigger value="favorites" className="flex items-center justify-center gap-1 text-xs rounded-xl">
            <Star className="size-3.5 text-amber-500 fill-amber-400" />
            <span>Favs</span>
          </TabsTrigger>

          <TabsTrigger value="offline" className="flex items-center justify-center gap-1 text-xs rounded-xl">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>Offline</span>
          </TabsTrigger>

          <TabsTrigger value="short" className="flex items-center justify-center gap-1 text-xs rounded-xl">
            <Zap className="size-3.5 text-sky-500 fill-sky-500" />
            <span>&lt;5m</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* SOFT SAGE CONTAINER FOR SUBJECT FOLDERS (Matching Image 1 Screen 2) */}
      <div className="bg-[#EAF5F0] border border-emerald-150/70 rounded-3xl p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900">
              Subject Folders
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/70 text-emerald-900 border border-emerald-200/60">
            {subjects.length} Topics
          </span>
        </div>

        {/* Clean Subject Folder Cards */}
        <div className="space-y-2">
          {subjects.map((subject) => {
            const subjectAudios = audiosBySubject.get(subject.id) || [];
            const totalDuration = subjectAudios.reduce((acc, curr) => acc + curr.duration_seconds, 0);
            const latestAudio = subjectAudios[0];
            const SubjectIcon = getSubjectIcon(subject.icon_name);
            const subjectTheme = getSubjectTheme(subject.color_hex);

            const subjectTerms = Array.from(
              new Set(subjectAudios.flatMap(a => a.key_terms || []))
            ).slice(0, 3);

            return (
              <div
                key={subject.id}
                onClick={() => handleOpenSubject(subject.id)}
                className="group bg-white hover:bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]"
              >
                {/* Left: Soft Squircle */}
                <div className={`w-11 h-11 rounded-2xl ${subjectTheme.bg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                  <SubjectIcon size={20} />
                </div>

                {/* Middle: Subject Title & Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-950 group-hover:text-blue-600 transition-colors">
                    {subject.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {latestAudio
                      ? `Latest: ${latestAudio.title}`
                      : subject.description || 'No audio notes recorded yet'}
                  </p>

                  {subjectTerms.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 overflow-hidden">
                      {subjectTerms.map(tag => (
                        <span
                          key={tag}
                          className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: File Count & Chevron */}
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full block">
                      {subjectAudios.length} {subjectAudios.length === 1 ? 'file' : 'files'}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                      {formatDuration(totalDuration)}
                    </span>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* If Searching: Direct Audio Search Results */}
      {searchQuery.trim() && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Matching Audio Notes ({allFilteredAudios.length})
            </h3>
          </div>

          <div className="space-y-2">
            {allFilteredAudios.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-500">
                No individual notes matched "{searchQuery}"
              </div>
            ) : (
              allFilteredAudios.map(audio => (
                <div
                  key={audio.id}
                  onClick={() => handleOpenAudioNote(audio)}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-2xs hover:shadow-xs"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                      {audio.subject_name || 'Academic'}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {audio.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatDuration(audio.duration_seconds)}
                    </span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

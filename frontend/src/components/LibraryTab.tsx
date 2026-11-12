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
  Flame,
  Check
} from 'lucide-react';
import { AudioItem, Subject, RevisionItem, PlaybackState } from '../types';
import { formatDuration } from '../services/learningEngine';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface LibraryTabProps {
  audioItems: AudioItem[];
  subjects: Subject[];
  revisionsDue?: RevisionItem[];
  playbackState?: PlaybackState;
  onTogglePlay?: () => void;
  onSeek?: (seconds: number) => void;
  onSetSpeed?: (speed: number) => void;
  onPlayAudio: (audio: AudioItem) => void;
  onToggleFavorite: (audioId: string) => void;
  onToggleOffline: (audio: AudioItem) => void;
  onGoToRecord: () => void;
  onOpenAssessmentForAudio?: (audio: AudioItem) => void;
}

type LibraryViewMode = 'topics' | 'subject' | 'note';
type FilterMode = 'all' | 'due' | 'favorites' | 'offline' | 'short';
type SortMode = 'recent' | 'duration' | 'title';

export const LibraryTab: React.FC<LibraryTabProps> = ({
  audioItems,
  subjects,
  revisionsDue = [],
  playbackState,
  onTogglePlay,
  onSeek,
  onSetSpeed,
  onPlayAudio,
  onToggleFavorite,
  onToggleOffline,
  onGoToRecord,
  onOpenAssessmentForAudio
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

  // Set of due audio IDs from spaced repetition
  const dueAudioIds = useMemo(() => new Set(revisionsDue.map(r => r.audio_id)), [revisionsDue]);

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
    const totalDue = audioItems.filter(a => dueAudioIds.has(a.id)).length;
    const totalFavorites = audioItems.filter(a => a.is_favorite).length;
    return {
      totalSubjects: subjects.length,
      totalAudios: audioItems.length,
      totalDurationSeconds,
      totalOffline,
      totalDue,
      totalFavorites
    };
  }, [audioItems, subjects, dueAudioIds]);

  // Filter and sort audio items for a specific subject (or all if subject is null)
  const getSubjectAudios = (subjectId: string | null) => {
    let items = audioItems;
    if (subjectId) {
      items = items.filter(a => a.subject_id === subjectId);
    }

    if (filterMode === 'due') items = items.filter(a => dueAudioIds.has(a.id));
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
    const isDue = dueAudioIds.has(selectedAudio.id);
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

            {isDue && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold font-mono flex items-center gap-1 shadow-2xs">
                <Sparkles size={10} className="text-amber-600" /> SPACING DUE
              </span>
            )}
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

        {/* 1-Tap Active Recall CTA Banner */}
        <div className="bg-gradient-to-br from-amber-500/15 via-amber-50/60 to-white border border-amber-300/80 rounded-2xl p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                <Zap size={14} fill="currentColor" />
              </div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-950 font-mono">
                Active Recall Practice
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
              SM-2 Engine
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Test yourself on the core formulas and concepts covered in this note to advance memory stability.
          </p>

          <button
            onClick={() => onOpenAssessmentForAudio ? onOpenAssessmentForAudio(selectedAudio) : undefined}
            className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all active:scale-98 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start Active Retrieval Test</span>
            <Zap size={13} className="fill-amber-400 text-amber-400" />
          </button>
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
    const subjectDueCount = subjectAudios.filter(a => dueAudioIds.has(a.id)).length;

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

            {subjectDueCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-bold font-mono shadow-2xs shrink-0 flex items-center gap-1">
                <Flame size={12} className="fill-slate-950" />
                {subjectDueCount} Due
              </span>
            )}
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
              const isDue = dueAudioIds.has(audio.id);

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
                        {isDue && (
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-[9px] font-bold font-mono flex items-center gap-0.5">
                            <Flame size={8} className="fill-amber-600 text-amber-600" /> DUE
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

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenAssessmentForAudio ? onOpenAssessmentForAudio(audio) : undefined}
                        className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-[10px] font-bold font-mono flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Zap size={10} className="fill-amber-600 text-amber-600" />
                        <span>Recall</span>
                      </button>

                      <button
                        onClick={() => handleOpenAudioNote(audio)}
                        className="text-slate-700 hover:text-slate-950 font-bold flex items-center gap-0.5 text-[10px] cursor-pointer"
                      >
                        <span>View Note</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
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
  // RENDER LEVEL 1: LIBRARY (TELEGRAM-STYLE TOPICS FOLDERS LIST)
  // =========================================================================
  const allFilteredAudios = getSubjectAudios(null);

  return (
    <div className="space-y-4 pb-28 pt-4 px-4 max-w-md mx-auto animate-in">
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
          className="py-1.5 px-3 rounded-full bg-slate-950 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-800 active:scale-95 transition-all shadow-xs cursor-pointer"
        >
          <Plus size={15} />
          <span>New Audio</span>
        </button>
      </div>

      {/* Global Search across all Subjects & Notes */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search subjects, formulas, concepts..."
          className="w-full bg-white border border-slate-200/90 focus:border-slate-400 rounded-xl pl-9.5 pr-8 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Base UI Tabs for Filter Modes */}
      <Tabs
        value={filterMode}
        onValueChange={(val) => setFilterMode(val as FilterMode)}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-4 p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl h-10 shadow-2xs">
          <TabsTrigger value="all" className="flex items-center justify-center gap-1 text-xs">
            <span>All</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700">
              {libraryStats.totalAudios}
            </span>
          </TabsTrigger>

          <TabsTrigger value="due" className="flex items-center justify-center gap-1 text-xs">
            <Flame className="size-3.5 text-amber-600 fill-amber-500" />
            <span>Due</span>
            {libraryStats.totalDue > 0 && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300/70">
                {libraryStats.totalDue}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="favorites" className="flex items-center justify-center gap-1 text-xs">
            <Star className="size-3 text-amber-500 fill-amber-400" />
            <span>Favs</span>
          </TabsTrigger>

          <TabsTrigger value="offline" className="flex items-center justify-center gap-1 text-xs">
            <CheckCircle2 className="size-3 text-emerald-600" />
            <span>Offline</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Telegram-style Subject Topics Section Header */}
      <div className="flex items-center justify-between px-0.5 pt-1">
        <div className="flex items-center gap-2">
          <Folder size={14} className="text-slate-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Subject Folders
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-400 font-medium">
          {subjects.length} Topics
        </span>
      </div>

      {/* TELEGRAM "TOPICS IN GROUP" STYLE FOLDERS LIST */}
      <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        {subjects.map((subject) => {
          const subjectAudios = audiosBySubject.get(subject.id) || [];
          const subjectDueCount = subjectAudios.filter(a => dueAudioIds.has(a.id)).length;
          const totalDuration = subjectAudios.reduce((acc, curr) => acc + curr.duration_seconds, 0);
          const latestAudio = subjectAudios[0];
          const SubjectIcon = getSubjectIcon(subject.icon_name);
          const subjectTheme = getSubjectTheme(subject.color_hex);

          // Top key terms for this subject
          const subjectTerms = Array.from(
            new Set(subjectAudios.flatMap(a => a.key_terms || []))
          ).slice(0, 3);

          return (
            <div
              key={subject.id}
              onClick={() => handleOpenSubject(subject.id)}
              className="group p-3.5 hover:bg-slate-50/80 active:bg-slate-100/70 transition-all cursor-pointer flex items-center gap-3.5"
            >
              {/* Left: Telegram-Style Avatar / Topic Icon */}
              <div className={`w-11 h-11 rounded-2xl ${subjectTheme.bg} flex items-center justify-center shrink-0 shadow-2xs border ${subjectTheme.border} group-hover:scale-105 transition-transform`}>
                <SubjectIcon size={20} />
              </div>

              {/* Middle: Subject Title & Recent Activity Snippet */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-xs font-bold text-slate-950 group-hover:text-amber-600 transition-colors">
                    {subject.name}
                  </h3>
                  {subjectDueCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9px] font-bold font-mono flex items-center gap-0.5 shadow-2xs">
                      <Flame size={9} className="fill-slate-950" />
                      {subjectDueCount} Due
                    </span>
                  )}
                </div>

                {/* Subtitle / Latest Note Snippet */}
                <p className="text-[11px] text-slate-500 truncate leading-snug">
                  {latestAudio
                    ? `Latest: ${latestAudio.title}`
                    : subject.description || 'No audio notes recorded yet'}
                </p>

                {/* Topic tags row preview */}
                {subjectTerms.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
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

              {/* Right: Meta info & Chevron */}
              <div className="text-right shrink-0 flex items-center gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full block">
                    {subjectAudios.length} {subjectAudios.length === 1 ? 'file' : 'files'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block">
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

      {/* If Searching: Direct Audio Search Results Drawer */}
      {searchQuery.trim() && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Matching Audio Notes ({allFilteredAudios.length})
            </h3>
          </div>

          <div className="space-y-2">
            {allFilteredAudios.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500">
                No individual notes matched "{searchQuery}"
              </div>
            ) : (
              allFilteredAudios.map(audio => (
                <div
                  key={audio.id}
                  onClick={() => handleOpenAudioNote(audio)}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-2xs hover:shadow-xs"
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

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import {
  Play,
  Pause,
  Sparkles,
  Mic,
  Star,
  Flame,
  Search,
  SlidersHorizontal,
  Bell,
  Folder,
  Atom,
  FlaskConical,
  Dna,
  Binary,
  Cloud,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  X,
  Upload,
  Download,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { AudioItem, Subject, UserSettings, PlaybackState } from '../types';
import { formatDuration } from '../services/learningEngine';
import {
  googleDriveService,
  DriveTransferItem,
  GoogleDriveStorageQuota
} from '../services/googleDrive';
import { BlueWaveDesign } from './ui/BlueWaveDesign';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext
} from '@/components/ui/carousel';
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentTrigger
} from '@/components/ui/attachment';

interface HomeTabProps {
  recentAudio: AudioItem[];
  subjects?: Subject[];
  playbackState?: PlaybackState;
  userSettings?: UserSettings;
  todayListeningSeconds?: number;
  isDriveConnected?: boolean;
  onConnectDrive?: () => void;
  onSyncToDrive?: (audio: AudioItem) => void;
  onDownloadFromDrive?: (audio: AudioItem) => void;
  onPlayAudio: (audio: AudioItem) => void;
  onSeek?: (seconds: number) => void;
  onGoToRecord: () => void;
  onNavigateToLibrary: (subjectId?: string) => void;
  onNavigateToAccount: () => void;
}

export type HomeTabFilterMode = 'most-played' | 'favorites' | 'drive';

const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const HomeTab: React.FC<HomeTabProps> = ({
  recentAudio,
  subjects = [],
  playbackState,
  isDriveConnected = false,
  onConnectDrive,
  onSyncToDrive,
  onDownloadFromDrive,
  onPlayAudio,
  onSeek,
  onGoToRecord,
  onNavigateToLibrary,
  onNavigateToAccount
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [storageQuota, setStorageQuota] = useState<GoogleDriveStorageQuota | null>(null);

  // Drive transfers subscription
  const [transfers, setTransfers] = useState<DriveTransferItem[]>(() =>
    googleDriveService.getTransfers()
  );

  useEffect(() => {
    const unsub = googleDriveService.subscribeTransfers((newTransfers) => {
      setTransfers(newTransfers);
    });
    // Fetch storage quota
    googleDriveService
      .getStorageQuota()
      .then(setStorageQuota)
      .catch(() => {});
    return () => unsub();
  }, []);

  const activeTransfers = useMemo(
    () => transfers.filter((t) => t.state === 'uploading' || t.state === 'processing'),
    [transfers]
  );
  const hasActiveTransfers = activeTransfers.length > 0;

  // TAB SELECTION RULE:
  // - Default = 'drive' when a file is being uploaded or downloaded to/from drive
  // - Default = 'most-played' when no file is being uploaded/downloaded and app is synced
  const [userSelectedTab, setUserSelectedTab] = useState<HomeTabFilterMode | null>(null);

  useEffect(() => {
    if (hasActiveTransfers) {
      setUserSelectedTab('drive');
    }
  }, [hasActiveTransfers]);

  const activeTab: HomeTabFilterMode =
    userSelectedTab ?? (hasActiveTransfers ? 'drive' : 'most-played');

  const autoplayPlugin = useRef(
    Autoplay({ delay: 2400, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  // Fallback to most recent or first audio note for "Continue Listening"
  const continueAudio = useMemo(() => {
    if (playbackState?.currentAudio) {
      return playbackState.currentAudio;
    }
    return recentAudio.length > 0 ? recentAudio[0] : null;
  }, [playbackState?.currentAudio, recentAudio]);

  const isCurrentAudioPlaying = Boolean(
    continueAudio &&
      playbackState?.isPlaying &&
      playbackState?.currentAudio?.id === continueAudio.id
  );

  // Search filter logic
  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return recentAudio;
    const q = searchQuery.toLowerCase();
    return recentAudio.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.subject_name && a.subject_name.toLowerCase().includes(q)) ||
        (a.key_terms && a.key_terms.some((t) => t.toLowerCase().includes(q)))
    );
  }, [recentAudio, searchQuery]);

  // Tab 1: Most Played (Sorted by play_count descending)
  const mostPlayedAudio = useMemo(() => {
    return [...filteredBySearch].sort((a, b) => {
      const countA = a.play_count ?? 0;
      const countB = b.play_count ?? 0;
      if (countB !== countA) return countB - countA;
      const timeA = a.last_listened_at ? new Date(a.last_listened_at).getTime() : 0;
      const timeB = b.last_listened_at ? new Date(b.last_listened_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [filteredBySearch]);

  // Tab 2: Favorites
  const favoriteAudio = useMemo(() => {
    return filteredBySearch.filter((a) => !!a.is_favorite);
  }, [filteredBySearch]);

  // Tab 3: Drive Audio Notes (items that have drive IDs or are in cloud)
  const driveAudioNotes = useMemo(() => {
    return filteredBySearch.filter((a) => a.google_drive_file_id || a.source_type === 'imported');
  }, [filteredBySearch]);

  // Subject Visuals & Dynamic Counts
  const subjectList = useMemo(() => {
    const defaultMeta = [
      { id: 'sub-1', name: 'Physics', icon: Atom, bg: 'bg-violet-100 text-violet-700', activeRing: 'hover:ring-violet-300' },
      { id: 'sub-2', name: 'Chemistry', icon: FlaskConical, bg: 'bg-rose-100 text-rose-700', activeRing: 'hover:ring-rose-300' },
      { id: 'sub-3', name: 'Biology', icon: Dna, bg: 'bg-emerald-100 text-emerald-700', activeRing: 'hover:ring-emerald-300' },
      { id: 'sub-4', name: 'Mathematics', icon: Binary, bg: 'bg-amber-100 text-amber-700', activeRing: 'hover:ring-amber-300' }
    ];

    return defaultMeta.map((meta) => {
      const existing = subjects.find(
        (s) => s.id === meta.id || s.name.toLowerCase() === meta.name.toLowerCase()
      );
      const count = recentAudio.filter(
        (a) =>
          a.subject_id === meta.id ||
          a.subject_name?.toLowerCase().includes(meta.name.toLowerCase().slice(0, 4))
      ).length;

      return {
        id: existing?.id || meta.id,
        name: meta.name === 'Mathematics' ? 'Math' : meta.name,
        fullName: meta.name,
        icon: meta.icon,
        bg: meta.bg,
        activeRing: meta.activeRing,
        count: `${count} note${count === 1 ? '' : 's'}`
      };
    });
  }, [subjects, recentAudio]);

  const getSubjectVisual = (subjectName?: string) => {
    const s = (subjectName || '').toLowerCase();
    if (s.includes('physic')) {
      return {
        bg: 'bg-violet-100 text-violet-700',
        cardBg: 'bg-violet-50/70',
        icon: Atom,
        label: 'Physics'
      };
    }
    if (s.includes('chem')) {
      return {
        bg: 'bg-rose-100 text-rose-700',
        cardBg: 'bg-rose-50/70',
        icon: FlaskConical,
        label: 'Chemistry'
      };
    }
    if (s.includes('bio')) {
      return {
        bg: 'bg-emerald-100 text-emerald-700',
        cardBg: 'bg-emerald-50/70',
        icon: Dna,
        label: 'Biology'
      };
    }
    if (s.includes('math')) {
      return {
        bg: 'bg-amber-100 text-amber-700',
        cardBg: 'bg-amber-50/70',
        icon: Binary,
        label: 'Mathematics'
      };
    }
    return {
      bg: 'bg-sky-100 text-sky-700',
      cardBg: 'bg-sky-50/70',
      icon: Sparkles,
      label: 'Academic'
    };
  };

  const handleTriggerSyncAll = () => {
    // Quick demo/active sync to Google Drive
    const unsynced = recentAudio.filter((a) => !a.google_drive_file_id);
    const target = unsynced.length > 0 ? unsynced[0] : recentAudio[0];
    if (target) {
      googleDriveService.startSimulatedTransfer(
        'upload',
        target.title,
        target.file_size_bytes || 3500000,
        target.id
      );
      if (onSyncToDrive) {
        onSyncToDrive(target);
      }
    }
  };

  const handleTriggerDownloadAll = () => {
    const cloudOnly = recentAudio.filter((a) => !a.is_downloaded_offline);
    const target = cloudOnly.length > 0 ? cloudOnly[0] : recentAudio[0];
    if (target) {
      googleDriveService.startSimulatedTransfer(
        'download',
        target.title,
        target.file_size_bytes || 4200000,
        target.id
      );
      if (onDownloadFromDrive) {
        onDownloadFromDrive(target);
      }
    }
  };

  return (
    <div className="space-y-4 pb-28 pt-2 px-3">
      {/* Search & Header Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              स्म
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                SMRITI
              </h1>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Spaced Active Recall Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowNotificationToast(true)}
              className="p-2 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer relative"
              title="Daily Revision Reminders"
            >
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
            </button>
            <button
              onClick={onNavigateToAccount}
              className="p-2 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
              title="Account & Sovereign Drive Settings"
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search audio notes, subjects, formulas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-8 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast Modal */}
      {showNotificationToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-2xl flex items-start justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-950">Daily Revision Plan Active</h4>
              <p className="text-[11px] text-emerald-800 mt-0.5 leading-snug">
                Your spaced intervals are automatically scheduled with high-retention audio repeats.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowNotificationToast(false)}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer shrink-0"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Hero Container: Animated Horizontal Moving Subject Carousel */}
      <div className="bg-[#EEECFE] border border-indigo-150/70 rounded-3xl p-4 space-y-3 shadow-2xs relative overflow-hidden">
        {/* Subtle Header */}
        <div className="flex items-center justify-between relative z-10 px-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
              Subject Folders
            </h2>
          </div>
          <button
            onClick={() => onNavigateToLibrary()}
            className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-950 flex items-center gap-0.5 transition-colors cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Embla Carousel: Prominent Animated Cards */}
        <div className="relative z-10">
          <Carousel
            plugins={[autoplayPlugin.current]}
            opts={{
              align: 'start',
              loop: true,
              dragFree: false
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-3 py-1">
              {subjectList.map((subj) => {
                const Icon = subj.icon;
                return (
                  <CarouselItem
                    key={subj.id}
                    className="pl-3 basis-[47%] sm:basis-[33%] md:basis-[25%]"
                  >
                    <button
                      onClick={() => onNavigateToLibrary(subj.id)}
                      className="w-full p-3.5 py-4 rounded-3xl bg-white border border-indigo-100/90 shadow-xs hover:shadow-md hover:border-indigo-300 hover:scale-[1.02] active:scale-97 transition-all duration-300 flex flex-col items-center justify-between text-center gap-2.5 group cursor-pointer"
                    >
                      {/* Generous Central Icon Medallion */}
                      <div
                        className={`size-13 rounded-2xl ${subj.bg} flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform duration-300`}
                      >
                        <Icon size={24} strokeWidth={2.4} />
                      </div>

                      {/* Full Subject Name & Note Count Badge */}
                      <div className="w-full px-1">
                        <span className="text-sm font-bold text-slate-900 block truncate leading-tight">
                          {subj.fullName || subj.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono font-semibold block truncate mt-1 bg-slate-100/80 py-0.5 px-2 rounded-full border border-slate-200/40">
                          {subj.count}
                        </span>
                      </div>
                    </button>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex -left-2.5 size-7 bg-white/90 shadow-sm" />
            <CarouselNext className="hidden sm:flex -right-2.5 size-7 bg-white/90 shadow-sm" />
          </Carousel>
        </div>
      </div>

      {/* Continue Listening: Sleek Minimalist Studio Card */}
      {continueAudio &&
        (() => {
          const continueDuration =
            playbackState?.currentAudio?.id === continueAudio.id &&
            playbackState.durationSeconds &&
            Number.isFinite(playbackState.durationSeconds) &&
            playbackState.durationSeconds > 0
              ? playbackState.durationSeconds
              : continueAudio.duration_seconds &&
                Number.isFinite(continueAudio.duration_seconds) &&
                continueAudio.duration_seconds > 0
              ? continueAudio.duration_seconds
              : 60;
          const currentPos =
            playbackState?.currentAudio?.id === continueAudio.id &&
            typeof playbackState.positionSeconds === 'number' &&
            Number.isFinite(playbackState.positionSeconds)
              ? playbackState.positionSeconds
              : 0;
          const cardProgressPercent = Math.min(
            100,
            Math.max(0, (currentPos / continueDuration) * 100)
          );

          return (
            <div className="bg-gradient-to-br from-white via-sky-50/50 to-blue-50/30 text-slate-900 rounded-3xl p-4.5 space-y-3 shadow-xs border border-sky-200/80 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCurrentAudioPlaying ? 'bg-[#24A1DE] animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    {isCurrentAudioPlaying ? 'Currently Playing' : 'Continue Listening'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 font-semibold">
                  {formatDuration(continueDuration)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#24A1DE] block tracking-wider">
                    {continueAudio.subject_name || 'Academic'}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                    {continueAudio.title}
                  </h3>
                </div>

                <button
                  onClick={() => onPlayAudio(continueAudio)}
                  aria-label={
                    isCurrentAudioPlaying
                      ? `Pause ${continueAudio.title}`
                      : `Play ${continueAudio.title}`
                  }
                  className="size-11 rounded-full bg-[#24A1DE] hover:bg-[#1f8fca] text-white flex items-center justify-center transition-all active:scale-95 shadow-md shadow-[#24A1DE]/25 shrink-0 cursor-pointer"
                >
                  {isCurrentAudioPlaying ? (
                    <div className="flex items-end justify-center gap-0.75 h-4 w-4">
                      <span className="w-0.75 bg-white rounded-full animate-eq-1" />
                      <span className="w-0.75 bg-white rounded-full animate-eq-2" />
                      <span className="w-0.75 bg-white rounded-full animate-eq-3" />
                    </div>
                  ) : (
                    <Play size={17} fill="currentColor" className="translate-x-0.5" />
                  )}
                </button>
              </div>

              {/* Interactive Scrubbable Seek Bar */}
              <div className="pt-0.5 space-y-1.5 relative z-10">
                <div
                  className="relative w-full bg-slate-200/80 hover:bg-slate-300/80 h-2 rounded-full overflow-hidden cursor-pointer group transition-colors"
                  title="Tap or drag to seek"
                  onClick={(e) => {
                    if (!onSeek) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    onSeek(pct * continueDuration);
                  }}
                >
                  <div
                    className="bg-gradient-to-r from-sky-400 to-[#24A1DE] h-full rounded-full transition-all duration-150"
                    style={{ width: `${cardProgressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 font-medium">
                  <span>{formatDuration(currentPos)}</span>
                  <span>{formatDuration(continueDuration)}</span>
                </div>
              </div>

              <BlueWaveDesign
                variant="compact"
                isPlaying={isCurrentAudioPlaying}
                className="absolute bottom-0 left-0 right-0 z-0 opacity-50"
              />
            </div>
          );
        })()}

      {/* Action Chips Row (Record, Folders, Drive) */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onGoToRecord}
          className="bg-[#E8F8F0] hover:bg-[#DCF3E7] text-emerald-800 border border-emerald-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
          title="Open Audio Recorder"
        >
          <Mic size={15} className="text-emerald-700" />
          <span>Record</span>
        </button>

        <button
          onClick={() => onNavigateToLibrary()}
          className="bg-[#FFEFEF] hover:bg-[#FFE5E5] text-rose-800 border border-rose-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
          title="Open Library & Subject Folders"
        >
          <Folder size={15} className="text-rose-700" />
          <span>Folders</span>
        </button>

        <button
          onClick={() => {
            setUserSelectedTab('drive');
            const el = document.getElementById('lessons-tabs-section');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-[#EEF6FF] hover:bg-[#E0EEFF] text-sky-800 border border-sky-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
          title="Open Sovereign Google Drive Tab"
        >
          <Cloud size={15} className="text-sky-700" />
          <span>Drive</span>
        </button>
      </div>

      {/* 3 HOME PAGE TABS: Most Played (default when synced) | Favs | Drive (default when transferring) */}
      <div id="lessons-tabs-section" className="space-y-3 pt-1">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setUserSelectedTab(val as HomeTabFilterMode)}
          className="w-full space-y-3"
        >
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Audio Notes
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              {activeTab === 'most-played' && `${mostPlayedAudio.length} notes`}
              {activeTab === 'favorites' && `${favoriteAudio.length} favorited`}
              {activeTab === 'drive' &&
                (hasActiveTransfers
                  ? `${activeTransfers.length} transferring`
                  : `${driveAudioNotes.length} in cloud`)}
            </span>
          </div>

          {/* Segmented 3-Pill Tabs Bar: Most Played | Favs | Drive */}
          <TabsList className="w-full grid grid-cols-3 p-1 bg-slate-100/90 border border-slate-200/80 rounded-2xl h-10 shadow-2xs">
            {/* Tab 1: Most Played */}
            <TabsTrigger
              value="most-played"
              className="flex items-center justify-center gap-1.5 text-xs rounded-xl"
            >
              <Flame className="size-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span className="font-semibold truncate">Most Played</span>
            </TabsTrigger>

            {/* Tab 2: Favs */}
            <TabsTrigger
              value="favorites"
              className="flex items-center justify-center gap-1 text-xs rounded-xl"
            >
              <Star className="size-3.5 text-amber-500 shrink-0" />
              <span className="font-semibold truncate">Favs</span>
              {favoriteAudio.length > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700">
                  {favoriteAudio.length}
                </span>
              )}
            </TabsTrigger>

            {/* Tab 3: Drive (Default when uploading/downloading) */}
            <TabsTrigger
              value="drive"
              className="flex items-center justify-center gap-1.5 text-xs rounded-xl relative"
            >
              <Cloud className="size-3.5 text-sky-600 shrink-0" />
              <span className="font-semibold truncate">Drive</span>
              {hasActiveTransfers ? (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                </span>
              ) : (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-700">
                  Sync
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Most Played Content */}
          <TabsContent value="most-played" className="space-y-2 mt-0">
            {renderLessonList(
              mostPlayedAudio,
              'No plays recorded yet. Start listening to see your most reviewed lessons here.',
              true
            )}
          </TabsContent>

          {/* TAB 2: Favorites Content */}
          <TabsContent value="favorites" className="space-y-2 mt-0">
            {renderLessonList(
              favoriteAudio,
              'No favorited lessons yet. Star your key lecture audios to review them quickly here.',
              false
            )}
          </TabsContent>

          {/* TAB 3: Sovereign Drive Content (Attachments for uploads/downloads/cloud files) */}
          <TabsContent value="drive" className="space-y-3 mt-0">
            {renderDriveTabContent()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  /**
   * Renders the Drive tab using shadcn Attachment components for active transfers,
   * recent uploads/downloads, and synced files
   */
  function renderDriveTabContent() {
    const isConnected = isDriveConnected || googleDriveService.isConnected();
    const userProfile = googleDriveService.getUserProfile();

    return (
      <div className="space-y-3">
        {/* Drive Storage Quota & Account Banner */}
        <div className="p-3.5 bg-gradient-to-br from-white via-sky-50/40 to-blue-50/30 border border-sky-200/80 rounded-2xl shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-8 rounded-xl bg-sky-100 text-[#24A1DE] flex items-center justify-center shrink-0">
                <Cloud size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {userProfile?.name || 'Sovereign Google Drive'}
                </h4>
                <p className="text-[10px] text-slate-500 font-mono truncate">
                  {userProfile?.email || 'Zero Central Server Storage Cost'}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {isConnected ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 size={10} /> Synced
                </span>
              ) : (
                <button
                  onClick={onConnectDrive}
                  className="px-2.5 py-1 rounded-xl bg-[#24A1DE] hover:bg-[#1f8fca] text-white text-[11px] font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Connect Drive
                </button>
              )}
            </div>
          </div>

          {/* Storage Quota Progress */}
          {storageQuota && (
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-600">
                <span>Drive Storage</span>
                <span>
                  {formatBytes(storageQuota.usedBytes)} of {formatBytes(storageQuota.totalBytes)} used
                </span>
              </div>
              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#24A1DE] h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(3, (storageQuota.usedBytes / storageQuota.totalBytes) * 100)
                    )}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Sync / Download Action Buttons */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={handleTriggerSyncAll}
              className="flex-1 py-2 px-3 rounded-xl bg-white border border-sky-200 text-sky-800 hover:bg-sky-50 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="Sync any unsynced audio notes to personal Google Drive"
            >
              <Upload size={13} className="text-[#24A1DE]" />
              <span>Sync to Drive</span>
            </button>
            <button
              onClick={handleTriggerDownloadAll}
              className="flex-1 py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="Download all audio notes to device for offline study"
            >
              <Download size={13} className="text-slate-600" />
              <span>Offline Cache</span>
            </button>
          </div>
        </div>

        {/* ACTIVE TRANSFERS: Built with shadcn Attachment component */}
        {activeTransfers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin text-[#24A1DE]" />
                Active Transfers ({activeTransfers.length})
              </span>
              <span className="text-[10px] font-mono text-sky-600 font-semibold">Streaming</span>
            </div>

            <div className="space-y-2">
              {activeTransfers.map((transfer) => (
                <Attachment
                  key={transfer.id}
                  state={transfer.state}
                  size="default"
                  className="shadow-sm"
                >
                  <AttachmentMedia variant="icon">
                    {transfer.direction === 'upload' ? (
                      <Upload size={18} className="animate-bounce" />
                    ) : (
                      <Download size={18} className="animate-bounce" />
                    )}
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{transfer.fileName}</AttachmentTitle>
                    <AttachmentDescription>
                      {transfer.direction === 'upload'
                        ? 'Uploading to Drive'
                        : 'Downloading from Drive'}{' '}
                      · {transfer.progressPercent}% ·{' '}
                      {transfer.state === 'processing'
                        ? 'Finalizing sovereign sync...'
                        : formatBytes(transfer.fileSizeBytes)}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label={`Cancel transfer for ${transfer.fileName}`}
                      onClick={() => googleDriveService.removeTransfer(transfer.id)}
                      title="Cancel transfer"
                    >
                      <X size={14} />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ))}
            </div>
          </div>
        )}

        {/* SYNCED DRIVE FILES LIST: Built with shadcn Attachment component */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Synced Drive Audio Notes ({driveAudioNotes.length})
            </span>
            <span className="text-[10px] font-mono text-slate-400">My Drive / Smriti</span>
          </div>

          {driveAudioNotes.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center space-y-2 shadow-2xs">
              <div className="size-10 rounded-full bg-sky-50 text-[#24A1DE] mx-auto flex items-center justify-center">
                <HardDrive size={18} />
              </div>
              <p className="text-xs font-semibold text-slate-800">No synced cloud notes yet</p>
              <p className="text-[11px] text-slate-500">
                Tap 'Sync to Drive' to backup your recorded lecture notes directly to your personal
                storage.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {driveAudioNotes.map((audio) => {
                const visual = getSubjectVisual(audio.subject_name);
                const Icon = visual.icon;
                const isPlayingThis = Boolean(
                  playbackState?.isPlaying && playbackState?.currentAudio?.id === audio.id
                );

                return (
                  <Attachment
                    key={audio.id}
                    state="done"
                    size="default"
                    className={`transition-all hover:border-sky-300 ${
                      isPlayingThis ? 'border-[#24A1DE] ring-1 ring-[#24A1DE]/20 bg-sky-50/20' : ''
                    }`}
                  >
                    <AttachmentMedia variant="icon" className={visual.bg}>
                      <Icon size={18} strokeWidth={2.2} />
                    </AttachmentMedia>

                    <AttachmentContent>
                      <AttachmentTitle>{audio.title}.m4a</AttachmentTitle>
                      <AttachmentDescription>
                        {audio.subject_name || 'Academic'} · {formatBytes(audio.file_size_bytes)} ·{' '}
                        {audio.is_downloaded_offline ? 'Offline Ready' : 'In Drive'}
                      </AttachmentDescription>
                    </AttachmentContent>

                    <AttachmentActions>
                      {audio.is_downloaded_offline ? (
                        <span
                          className="size-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center"
                          title="Cached for offline study"
                        >
                          <CheckCircle2 size={14} />
                        </span>
                      ) : (
                        <AttachmentAction
                          aria-label={`Download ${audio.title} for offline`}
                          onClick={() => {
                            if (onDownloadFromDrive) onDownloadFromDrive(audio);
                            else {
                              googleDriveService.startSimulatedTransfer(
                                'download',
                                audio.title,
                                audio.file_size_bytes,
                                audio.id
                              );
                            }
                          }}
                          title="Download for offline access"
                        >
                          <Download size={14} />
                        </AttachmentAction>
                      )}

                      <AttachmentAction
                        aria-label={isPlayingThis ? `Pause ${audio.title}` : `Play ${audio.title}`}
                        onClick={() => onPlayAudio(audio)}
                        variant="default"
                        className={
                          isPlayingThis
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-950 hover:bg-slate-800 text-white'
                        }
                        title={isPlayingThis ? 'Pause' : 'Play'}
                      >
                        {isPlayingThis ? (
                          <Pause size={12} fill="currentColor" />
                        ) : (
                          <Play size={12} fill="currentColor" className="translate-x-0.5" />
                        )}
                      </AttachmentAction>
                    </AttachmentActions>

                    <AttachmentTrigger
                      aria-label={`Play ${audio.title}`}
                      onClick={() => onPlayAudio(audio)}
                    />
                  </Attachment>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderLessonList(items: AudioItem[], emptyMsg: string, isMostPlayed: boolean = false) {
    if (items.length === 0) {
      return (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-7 text-center shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
            <Sparkles size={18} />
          </div>
          <p className="text-xs font-semibold text-slate-800">{emptyMsg}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Tap 'Most Played' or 'Drive' to explore your study content.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((audio, index) => {
          const visual = getSubjectVisual(audio.subject_name);
          const Icon = visual.icon;
          const isPlayingThis = Boolean(
            playbackState?.isPlaying && playbackState?.currentAudio?.id === audio.id
          );
          const playCount = audio.play_count ?? (items.length - index);

          return (
            <div
              key={audio.id}
              className={`group bg-white border p-3 rounded-2xl flex items-center justify-between gap-3 transition-all duration-200 shadow-2xs hover:shadow-xs ${
                isPlayingThis
                  ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              {/* Left Squircle Icon */}
              <div
                onClick={() => onPlayAudio(audio)}
                className={`w-11 h-11 rounded-2xl ${visual.bg} flex items-center justify-center shrink-0 cursor-pointer shadow-2xs group-hover:scale-105 transition-transform`}
              >
                <Icon size={19} strokeWidth={2.2} />
              </div>

              {/* Title & Metadata */}
              <div onClick={() => onPlayAudio(audio)} className="flex-1 min-w-0 cursor-pointer">
                <div className="flex items-center gap-1.5 mb-1 overflow-hidden">
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase shrink-0">
                    {audio.subject_name || 'General'}
                  </span>

                  {/* Most Played Rank & Count Pill */}
                  {isMostPlayed && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70 text-[9px] font-bold font-mono flex items-center gap-0.5 shrink-0">
                      <Flame size={9} className="fill-amber-500 text-amber-500" />
                      {playCount} {playCount === 1 ? 'play' : 'plays'}
                    </span>
                  )}

                  {audio.is_downloaded_offline && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[9px] font-bold font-mono flex items-center gap-0.5 shrink-0">
                      <CheckCircle2 size={9} /> OFFLINE
                    </span>
                  )}
                  {audio.audio_enhancement_applied && (
                    <span className="px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 text-[9px] font-bold font-mono shrink-0">
                      DSP
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {audio.title}
                </h4>
              </div>

              {/* Duration & Play Button */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-400 font-mono font-medium">
                  {formatDuration(audio.duration_seconds)}
                </span>
                <button
                  onClick={() => onPlayAudio(audio)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xs hover:scale-105 cursor-pointer ${
                    isPlayingThis
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-950 hover:bg-slate-800 text-white'
                  }`}
                  aria-label={isPlayingThis ? `Pause ${audio.title}` : `Play ${audio.title}`}
                >
                  {isPlayingThis ? (
                    <Pause size={12} fill="currentColor" />
                  ) : (
                    <Play size={12} fill="currentColor" className="translate-x-0.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
};

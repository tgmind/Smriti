import React, { useState, useMemo, useEffect } from 'react';
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
  BookOpen,
  Folder,
  Clock,
  FileAudio,
  Check,
  SlidersHorizontal,
  Cloud,
  RefreshCw,
  Scissors,
  Calculator,
  Globe,
  Music,
  Flame,
  GraduationCap,
  Landmark,
  Scale,
  Code,
  TrendingUp,
  Lightbulb,
  Languages,
  Trash2,
  Bell,
  ShieldCheck
} from 'lucide-react';
import { AudioItem, Subject, PlaybackState, UserSettings } from '../types';
import { formatDuration } from '../services/learningEngine';
import { ACADEMIC_ICON_MAP } from '../utils/subjectVisuals';
import { googleDriveService } from '../services/googleDrive';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ModalPortal } from '@/components/ui/modal-portal';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription
} from '@/components/ui/empty';
import { AudioTrimmer } from './AudioTrimmer';

export interface LibraryTabProps {
  audioItems: AudioItem[];
  subjects: Subject[];
  initialSubjectId?: string | null;
  initialAudioId?: string | null;
  playbackState?: PlaybackState;
  isDriveConnected?: boolean;
  isSyncingDrive?: boolean;
  onSyncDrive?: () => void;
  onConnectDrive?: () => void;
  onTogglePlay?: () => void;
  onSeek?: (seconds: number) => void;
  onSetSpeed?: (speed: number) => void;
  onPlayAudio: (audio: AudioItem) => void;
  onToggleFavorite: (audioId: string) => void;
  onToggleOffline: (audio: AudioItem) => void;
  onGoToRecord: () => void;
  onCreateSubject?: (newSubject: Subject) => void;
  onDeleteSubject?: (subjectId: string, options?: { deleteRecordings?: boolean }) => Promise<void> | void;
  onDeleteAudio?: (audioId: string) => Promise<void> | void;
  initialCreateFolderOpen?: boolean;
  userSettings?: UserSettings;
  onNavigateToAccount?: () => void;
}

type LibraryViewMode = 'topics' | 'subject' | 'note';
type SortMode = 'recent' | 'duration' | 'title';

const FOLDER_ICON_OPTIONS = [
  { name: 'Folder', label: 'General Folder', icon: Folder },
  { name: 'BookOpen', label: 'Academic & Reading', icon: BookOpen },
  { name: 'GraduationCap', label: 'Degree & Study', icon: GraduationCap },
  { name: 'Landmark', label: 'History & Polity', icon: Landmark },
  { name: 'Scale', label: 'Law & Justice', icon: Scale },
  { name: 'TrendingUp', label: 'Economics & Business', icon: TrendingUp },
  { name: 'Code', label: 'Computer Science & Code', icon: Code },
  { name: 'Calculator', label: 'Calculus & Stats', icon: Calculator },
  { name: 'Globe', label: 'Social Sciences & Geo', icon: Globe },
  { name: 'Languages', label: 'Languages & Linguistics', icon: Languages },
  { name: 'Lightbulb', label: 'Philosophy & Ideas', icon: Lightbulb },
  { name: 'Music', label: 'Arts & Audios', icon: Music },
  { name: 'Flame', label: 'Exam Sprint & High Yield', icon: Flame },
  { name: 'Sparkles', label: 'Important Summaries', icon: Sparkles },
  { name: 'Zap', label: 'Rapid Recall', icon: Zap },
];

const FOLDER_COLOR_OPTIONS = [
  { hex: '#38bdf8', label: 'Sky' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#a855f7', label: 'Purple' },
  { hex: '#f43f5e', label: 'Rose' },
  { hex: '#6366f1', label: 'Indigo' },
];

export const LibraryTab: React.FC<LibraryTabProps> = ({
  audioItems,
  subjects,
  initialSubjectId,
  initialAudioId,
  playbackState,
  isDriveConnected = false,
  isSyncingDrive = false,
  onSyncDrive,
  onConnectDrive,
  onTogglePlay,
  onSeek,
  onSetSpeed,
  onPlayAudio,
  onToggleFavorite,
  onToggleOffline,
  onGoToRecord,
  onCreateSubject,
  onDeleteSubject,
  onDeleteAudio,
  initialCreateFolderOpen = false,
  userSettings,
  onNavigateToAccount
}) => {
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  // 3-Tier Navigation State: Library (topics) -> Subject -> Audio Note
  const [viewMode, setViewMode] = useState<LibraryViewMode>(
    initialAudioId ? 'note' : initialSubjectId ? 'subject' : 'topics'
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialSubjectId || null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(initialAudioId || null);
  const [scrubValue, setScrubValue] = useState<number | null>(null);

  // Subject Deletion modal state
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [deleteRecordingsOption, setDeleteRecordingsOption] = useState<boolean>(false);
  const [isDeletingSubject, setIsDeletingSubject] = useState<boolean>(false);

  // Folder creation modal state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(initialCreateFolderOpen);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('Folder');
  const [newFolderColor, setNewFolderColor] = useState('#38bdf8');

  // Close modal on Escape
  useEffect(() => {
    if (!isCreateFolderOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateFolderOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateFolderOpen]);

  const handleCreateFolderSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    const newId = `sub-${Date.now()}`;
    const newSubject: Subject = {
      id: newId,
      name: trimmed,
      description: newFolderDesc.trim() || `${trimmed} study & lecture notes`,
      icon_name: newFolderIcon,
      color_hex: newFolderColor,
      sort_order: subjects.length + 1,
      item_count: 0
    };

    if (onCreateSubject) {
      onCreateSubject(newSubject);
    }

    setNewFolderName('');
    setNewFolderDesc('');
    setNewFolderIcon('Folder');
    setNewFolderColor('#38bdf8');
    setIsCreateFolderOpen(false);

    // Automatically navigate to the new subject folder
    handleOpenSubject(newId);
  };

  const handleConfirmDeleteSubject = async () => {
    if (!subjectToDelete || !onDeleteSubject) return;
    try {
      setIsDeletingSubject(true);
      await onDeleteSubject(subjectToDelete.id, { deleteRecordings: deleteRecordingsOption });
      if (selectedSubjectId === subjectToDelete.id || selectedSubjectId?.toLowerCase() === subjectToDelete.name.toLowerCase()) {
        handleBackToTopics();
      }
      setSubjectToDelete(null);
      setDeleteRecordingsOption(false);
    } catch (e) {
      console.warn('Failed to delete subject folder:', e);
    } finally {
      setIsDeletingSubject(false);
    }
  };

  // Sync initialSubjectId changes from external navigation (e.g. Home tab cards)
  useEffect(() => {
    if (initialAudioId) {
      setSelectedAudioId(initialAudioId);
      const targetAudio = audioItems.find(a => a.id === initialAudioId);
      if (targetAudio?.subject_id) {
        setSelectedSubjectId(targetAudio.subject_id);
      }
      setViewMode('note');
    } else if (initialSubjectId) {
      setSelectedSubjectId(initialSubjectId);
      setSelectedAudioId(null);
      setViewMode('subject');
      setSelectedTopicTag(null);
    }
  }, [initialSubjectId, initialAudioId, audioItems]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [selectedTopicTag, setSelectedTopicTag] = useState<string | null>(null);
  const [isTrimmingNote, setIsTrimmingNote] = useState(false);

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

  // Helper: map icon_name to Lucide icon component (supports all generalized academic icons)
  const getSubjectIcon = (iconName: string) => {
    return ACADEMIC_ICON_MAP[iconName] || BookOpen;
  };

  // Helper: subject theme colors
  const getSubjectTheme = (colorHex: string) => {
    switch (colorHex?.toLowerCase()) {
      case '#38bdf8': // Sky blue (Physics)
      case '#0284c7':
        return {
          bg: 'bg-gradient-to-br from-sky-50 to-sky-100/80 text-sky-600',
          border: 'border-sky-200/80',
          activeBg: 'bg-sky-500 text-white',
          badge: 'bg-sky-100 text-sky-800 border-sky-200',
          dot: 'bg-sky-500',
          accent: 'text-sky-600',
          lightBg: 'from-sky-50/70 via-white to-white'
        };
      case '#f59e0b': // Amber (Chemistry)
      case '#d97706':
        return {
          bg: 'bg-gradient-to-br from-amber-50 to-amber-100/80 text-amber-600',
          border: 'border-amber-200/80',
          activeBg: 'bg-amber-500 text-slate-950',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          accent: 'text-amber-600',
          lightBg: 'from-amber-50/70 via-white to-white'
        };
      case '#10b981': // Emerald (Biology)
      case '#059669':
        return {
          bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/80 text-emerald-600',
          border: 'border-emerald-200/80',
          activeBg: 'bg-emerald-600 text-white',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          accent: 'text-emerald-600',
          lightBg: 'from-emerald-50/70 via-white to-white'
        };
      case '#a855f7': // Purple (Mathematics)
      case '#8b5cf6':
        return {
          bg: 'bg-gradient-to-br from-purple-50 to-purple-100/80 text-purple-600',
          border: 'border-purple-200/80',
          activeBg: 'bg-purple-600 text-white',
          badge: 'bg-purple-100 text-purple-800 border-purple-200',
          dot: 'bg-purple-500',
          accent: 'text-purple-600',
          lightBg: 'from-purple-50/70 via-white to-white'
        };
      case '#f43f5e': // Rose
      case '#e11d48':
        return {
          bg: 'bg-gradient-to-br from-rose-50 to-rose-100/80 text-rose-600',
          border: 'border-rose-200/80',
          activeBg: 'bg-rose-500 text-white',
          badge: 'bg-rose-100 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
          accent: 'text-rose-600',
          lightBg: 'from-rose-50/70 via-white to-white'
        };
      case '#6366f1': // Indigo
      case '#4f46e5':
        return {
          bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/80 text-indigo-600',
          border: 'border-indigo-200/80',
          activeBg: 'bg-indigo-600 text-white',
          badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
          accent: 'text-indigo-600',
          lightBg: 'from-indigo-50/70 via-white to-white'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-slate-50 to-slate-100/80 text-slate-700',
          border: 'border-slate-200',
          activeBg: 'bg-slate-900 text-white',
          badge: 'bg-slate-100 text-slate-800 border-slate-200',
          dot: 'bg-slate-500',
          accent: 'text-slate-600',
          lightBg: 'from-slate-50 to-white'
        };
    }
  };

  // Group audio items by subject ID and subject name
  const audiosBySubject = useMemo(() => {
    const map = new Map<string, AudioItem[]>();
    audioItems.forEach(item => {
      const subId = item.subject_id || 'general';
      const subName = item.subject_name?.trim().toLowerCase();
      if (!map.has(subId)) map.set(subId, []);
      map.get(subId)!.push(item);
      if (subName && subName !== subId.toLowerCase()) {
        if (!map.has(subName)) map.set(subName, []);
        map.get(subName)!.push(item);
      }
    });
    return map;
  }, [audioItems]);

  // Strictly deduplicate subjects by normalized name to eliminate visual duplicates
  const deduplicatedSubjects = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const s of subjects) {
      if (!s || !s.name) continue;
      const key = s.name.trim().toLowerCase();
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, s);
      } else {
        const cur = map.get(key)!;
        const curItems = (audiosBySubject.get(cur.id) || audiosBySubject.get(key) || []).length;
        const sItems = (audiosBySubject.get(s.id) || audiosBySubject.get(key) || []).length;
        if (sItems > curItems) {
          map.set(key, s);
        }
      }
    }
    return Array.from(map.values());
  }, [subjects, audiosBySubject]);

  // Filter and sort audio items for a specific subject (or all if subject is null)
  const getSubjectAudios = (subjectId: string | null) => {
    let items = audioItems;
    if (subjectId) {
      const targetSub = subjects.find(s => s.id === subjectId);
      const targetSubName = targetSub?.name?.trim().toLowerCase();
      items = items.filter(
        a => a.subject_id === subjectId ||
        (targetSubName && a.subject_name?.trim().toLowerCase() === targetSubName)
      );
    }

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

  // Create Subject Folder Modal Dialog using modern shadcn Card
  const renderCreateFolderModal = () => {
    if (!isCreateFolderOpen) return null;

    const ActiveModalIcon = getSubjectIcon(newFolderIcon);

    return (
      <ModalPortal>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-subject-title"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto safe-top safe-bottom animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCreateFolderOpen(false);
            }
          }}
        >
          <Card className="w-full max-w-sm sm:max-w-md bg-white border border-slate-200/90 shadow-2xl rounded-3xl overflow-hidden my-auto max-h-[85vh] sm:max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-100 pb-3.5 shrink-0 bg-white">
              <CardTitle id="create-subject-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs transition-colors"
                  style={{ backgroundColor: newFolderColor }}
                >
                  <ActiveModalIcon size={15} />
                </span>
                <span>New Subject Folder</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Create a subject folder to organize lecture recordings and revisions
              </CardDescription>
              <CardAction>
                <button
                  type="button"
                  onClick={() => setIsCreateFolderOpen(false)}
                  aria-label="Close dialog"
                  className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </CardAction>
            </CardHeader>

            <form onSubmit={handleCreateFolderSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <CardContent className="space-y-4 pt-4 pb-3 overflow-y-auto flex-1 min-h-0">
                {/* Folder Name */}
                <div className="space-y-1.5">
                  <label htmlFor="folder-name-input" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Folder Name <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-slate-400 font-normal">e.g., Organic Chemistry, Mechanics</span>
                  </label>
                  <input
                    id="folder-name-input"
                    type="text"
                    required
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter subject or topic name..."
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-slate-900 placeholder:text-slate-400"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label htmlFor="folder-desc-input" className="text-xs font-semibold text-slate-700">
                    Description <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="folder-desc-input"
                    type="text"
                    value={newFolderDesc}
                    onChange={(e) => setNewFolderDesc(e.target.value)}
                    placeholder="e.g. Chapter 4-8 exam revision notes..."
                    className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                {/* Choose Icon */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Choose Icon</label>
                  <div className="grid grid-cols-6 gap-2">
                    {FOLDER_ICON_OPTIONS.map((item) => {
                      const IconComp = item.icon;
                      const isSelected = newFolderIcon === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setNewFolderIcon(item.name)}
                          title={item.label}
                          className={`h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-slate-900 bg-slate-900 text-white shadow-xs scale-105'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <IconComp size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Choose Theme Color */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Theme Color</label>
                  <div className="flex items-center gap-2.5">
                    {FOLDER_COLOR_OPTIONS.map((c) => {
                      const isSelected = newFolderColor === c.hex;
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setNewFolderColor(c.hex)}
                          title={c.label}
                          className={`w-7 h-7 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-xs'
                              : 'hover:scale-105 opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {isSelected && <Check size={13} className="text-white drop-shadow-xs" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Preview Pill */}
                <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/80 flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white shadow-2xs transition-colors"
                    style={{ backgroundColor: newFolderColor }}
                  >
                    <ActiveModalIcon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {newFolderName.trim() || 'Untitled Subject'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {newFolderDesc.trim() || 'No recordings yet · 0 lessons'}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: `${newFolderColor}20`,
                      color: newFolderColor
                    }}
                  >
                    Preview
                  </span>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/90 p-3.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateFolderOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Folder size={13} />
                  <span>Create Folder</span>
                </button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </ModalPortal>
    );
  };

  // =========================================================================
  // RENDER LEVEL 3: AUDIO NOTE VIEW
  // =========================================================================
  if (viewMode === 'note' && selectedAudio) {
    const audioSubject = subjects.find(s => s.id === selectedAudio.subject_id);
    const SubjectIcon = audioSubject ? getSubjectIcon(audioSubject.icon_name) : BookOpen;

    return (
      <div className="space-y-4 pb-28 pt-3 px-4 max-w-md mx-auto animate-in">
        {/* Navigation Breadcrumb Header with Back Button */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={handleBackToSubject}
              className="w-8 h-8 rounded-full bg-white border border-slate-200/80 hover:bg-slate-100 active:scale-95 text-slate-700 flex items-center justify-center transition-all shadow-2xs cursor-pointer shrink-0"
              title={`Back to ${audioSubject?.name || 'folder'}`}
              aria-label="Back to subject folder"
            >
              <ArrowLeft size={16} strokeWidth={2.2} />
            </button>
            <Breadcrumb className="min-w-0">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={handleBackToTopics} className="cursor-pointer font-medium text-slate-500 hover:text-slate-900">
                    Library
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={handleBackToSubject} className="cursor-pointer font-medium text-slate-700 hover:text-slate-900">
                    {audioSubject?.name || 'Folder'}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-slate-900 truncate max-w-[130px] sm:max-w-[190px]">
                    {selectedAudio.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Quick Actions (Favorite, Offline, Trim) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsTrimmingNote(!isTrimmingNote)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isTrimmingNote
                  ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Toggle Audio Trimmer"
            >
              <Scissors size={14} />
            </button>

            <button
              onClick={() => onToggleFavorite(selectedAudio.id)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                selectedAudio.is_favorite
                  ? 'bg-amber-50 border-amber-300 text-amber-600 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title={selectedAudio.is_favorite ? 'Favorited' : 'Add to Favorites'}
            >
              <Star size={14} fill={selectedAudio.is_favorite ? 'currentColor' : 'none'} />
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
              {selectedAudio.is_downloaded_offline ? <CheckCircle2 size={14} /> : <Download size={14} />}
            </button>
          </div>
        </div>

        {/* Visual Audio Trimmer Preview */}
        {isTrimmingNote && (
          <AudioTrimmer
            durationSeconds={selectedAudio.duration_seconds}
            audioUrl={selectedAudio.file_url}
            waveformPeaks={selectedAudio.waveform_peaks}
            onTrimChange={() => {}}
          />
        )}

        {/* Audio Note Header Card (Whitish theme, minimal pill, beautiful text hierarchy) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs space-y-3.5">
          {/* Subject & Status */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <SubjectIcon size={14} className="text-slate-500" />
              {audioSubject?.name || selectedAudio.subject_name || 'Academic'}
            </span>
            {selectedAudio.is_downloaded_offline && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 font-medium inline-flex items-center gap-1 text-[11px]">
                  <CheckCircle2 size={12} /> Offline Ready
                </span>
              </>
            )}
          </div>

          {/* Title & Metadata (No text clipping) */}
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug tracking-tight">
              {selectedAudio.title}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1 text-slate-700 font-semibold">
                <Clock size={12} className="text-slate-400" />
                {formatDuration(selectedAudio.duration_seconds)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="uppercase text-[11px] font-medium text-slate-600">
                {`${(selectedAudio.file_format || 'M4A').replace(/^audio\//i, '').toUpperCase()} Audio`}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">{(selectedAudio.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          </div>

          {/* Upgraded Dedicated Playback Controller & Authoritative Seekbar Engine */}
          {(() => {
            const isCurrentPlayingAudio = playbackState?.currentAudio?.id === selectedAudio.id;
            const isPlaying = isCurrentPlayingAudio && !!playbackState?.isPlaying;
            const currentTrackPosition = isCurrentPlayingAudio ? (playbackState?.positionSeconds || 0) : 0;
            const activePosition = scrubValue !== null ? scrubValue : currentTrackPosition;
            const noteDuration = selectedAudio.duration_seconds || 1;
            const progressPercent = Math.min(100, Math.max(0, (activePosition / noteDuration) * 100));

            return (
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (isCurrentPlayingAudio && onTogglePlay) {
                          onTogglePlay();
                        } else {
                          onPlayAudio(selectedAudio);
                        }
                      }}
                      className="w-12 h-12 rounded-full bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center transition-all active:scale-95 shadow-md shadow-slate-950/20 cursor-pointer shrink-0"
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
                        {isPlaying ? 'Now Playing' : isCurrentPlayingAudio && currentTrackPosition > 0 ? 'Paused' : 'Ready to Listen'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {formatDuration(noteDuration)} full duration
                      </span>
                    </div>
                  </div>

                  {/* Clean speed selector */}
                  {onSetSpeed && (
                    <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200/90 shadow-2xs">
                      {[1.0, 1.25, 1.5, 2.0].map((speed) => {
                        const isSelected = (playbackState?.playbackSpeed || 1.0) === speed;
                        return (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => onSetSpeed(speed)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            {`${speed}x`}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Authoritative Scrubber Progress Bar */}
                <div className="space-y-1 pt-1">
                  <input
                    type="range"
                    min={0}
                    max={noteDuration}
                    step={0.1}
                    value={activePosition}
                    onChange={(e) => {
                      setScrubValue(Number(e.target.value));
                    }}
                    onPointerUp={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      setScrubValue(null);
                      if (onSeek) onSeek(val);
                    }}
                    onKeyUp={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      setScrubValue(null);
                      if (onSeek) onSeek(val);
                    }}
                    className="w-full h-1.5 bg-slate-200/90 rounded-lg appearance-none cursor-pointer accent-slate-900 transition-all hover:bg-slate-300"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>{formatDuration(activePosition)}</span>
                    <span>{formatDuration(noteDuration)}</span>
                  </div>
                </div>

                {/* Waveform Visualization Bars */}
                <div className="flex items-end justify-between h-8 gap-1 pt-1 px-1">
                  {(selectedAudio.waveform_peaks && selectedAudio.waveform_peaks.length > 0
                    ? selectedAudio.waveform_peaks.slice(0, 32)
                    : [20, 35, 60, 45, 80, 65, 40, 70, 85, 55, 30, 65, 50, 75, 90, 60, 40, 80, 70, 50, 65, 85, 45, 60, 75, 40, 55, 70, 80, 50, 30, 20]
                  ).map((peak, idx) => {
                    const heightPercent = Math.max(15, Math.min(100, peak));
                    const barIsActive = (idx / 32) <= (progressPercent / 100);
                    return (
                      <div
                        key={idx}
                        className={`flex-1 rounded-full transition-colors duration-150 ${
                          barIsActive ? 'bg-slate-900' : 'bg-slate-300/80'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Sovereign Storage & Audio File Status (Whitish theme, clean text hierarchy) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Storage & Ownership
          </span>
          <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
            <span>Google Drive Location</span>
            <span className="font-mono text-slate-900 font-medium truncate max-w-[200px] sm:max-w-xs text-right">
              My Drive/Smriti/{audioSubject?.name || selectedAudio.subject_name || 'Academic'}/
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2">
            <span>Audio Availability</span>
            <span className={`font-mono font-medium ${selectedAudio.is_downloaded_offline ? 'text-emerald-700' : 'text-slate-500'}`}>
              {selectedAudio.is_downloaded_offline ? 'Downloaded (Instant Local Play)' : 'Stream via Cloud'}
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
        {/* Navigation Header with Back Button */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={handleBackToTopics}
              className="w-8 h-8 rounded-full bg-white border border-slate-200/80 hover:bg-slate-100 active:scale-95 text-slate-700 flex items-center justify-center transition-all shadow-2xs cursor-pointer shrink-0"
              title="Back to all folders"
              aria-label="Back to folders"
            >
              <ArrowLeft size={16} strokeWidth={2.2} />
            </button>
            <Breadcrumb className="min-w-0">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={handleBackToTopics} className="cursor-pointer font-medium text-slate-500 hover:text-slate-900">
                    Library
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-slate-900 truncate max-w-[140px] sm:max-w-[200px]">
                    {selectedSubject.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onDeleteSubject && (
              <button
                type="button"
                onClick={() => setSubjectToDelete(selectedSubject)}
                className="py-1 px-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer"
                title={`Delete ${selectedSubject.name} folder`}
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            )}

            <button
              onClick={onGoToRecord}
              className="py-1 px-2.5 rounded-lg bg-slate-950 text-white font-semibold text-xs flex items-center gap-1 hover:bg-slate-800 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Record</span>
            </button>
          </div>
        </div>

        {/* Compact Subject Folder Header (Whitish theme, minimal pill, beautiful text hierarchy) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-xl ${subjectTheme.bg} flex items-center justify-center shrink-0 border ${subjectTheme.border} text-slate-800 shadow-2xs`}>
              <SubjectIcon size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight truncate">
                {selectedSubject.name}
              </h1>
              <p className="text-xs text-slate-500 leading-snug mt-0.5 truncate">
                {selectedSubject.description || `${subjectAudios.length} recorded audio study lessons`}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs font-bold text-slate-900">
              {`${subjectAudios.length} ${subjectAudios.length === 1 ? 'lesson' : 'lessons'}`}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              <span>{formatDuration(totalSubjectDuration)}</span>
              {subjectAudios.filter(a => a.is_downloaded_offline).length > 0 && (
                <span className="text-emerald-700 font-medium ml-1.5">
                  {`· ${subjectAudios.filter(a => a.is_downloaded_offline).length} offline`}
                </span>
              )}
            </div>
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
            <Empty className="bg-white border border-slate-200 rounded-2xl p-7 text-center shadow-2xs">
              <EmptyHeader>
                <EmptyMedia
                  variant="icon"
                  className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-0.5"
                >
                  <FileAudio size={20} />
                </EmptyMedia>
                <EmptyTitle className="text-xs font-bold text-slate-800">
                  No audio notes match criteria
                </EmptyTitle>
                <EmptyDescription className="text-[11px] text-slate-500">
                  Clear active filters or record a new lesson for {selectedSubject.name}.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
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
                        {audio.is_downloaded_offline ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[9px] font-bold font-mono inline-flex items-center gap-1">
                            <CheckCircle2 size={9} /> OFFLINE READY
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/80 text-[9px] font-medium font-mono inline-flex items-center gap-1">
                            <Cloud size={9} /> IN DRIVE
                          </span>
                        )}
                        {audio.audio_enhancement_applied && (
                          <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/80 text-[9px] font-bold font-mono flex items-center gap-0.5">
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

                    {/* Quick Play, Download & Favorite Action Buttons */}
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

                      {/* Small Download Arrow Button or Downloaded Checked Symbol */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleOffline(audio);
                        }}
                        className={`size-8 rounded-lg border flex items-center justify-center transition-all active:scale-90 shadow-2xs cursor-pointer ${
                          audio.is_downloaded_offline
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-600 hover:bg-emerald-100'
                            : 'bg-white border-slate-200 text-slate-400 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50'
                        }`}
                        title={
                          audio.is_downloaded_offline
                            ? 'Downloaded offline (tap to remove)'
                            : 'Download from Google Drive for fast local playback'
                        }
                        aria-label={audio.is_downloaded_offline ? 'Downloaded offline' : `Download ${audio.title}`}
                      >
                        {audio.is_downloaded_offline ? (
                          <CheckCircle2 size={13} strokeWidth={2.4} />
                        ) : (
                          <Download size={13} strokeWidth={2.2} />
                        )}
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
                      {onDeleteAudio && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete audio note "${audio.title}"?`)) {
                              onDeleteAudio(audio.id);
                            }
                          }}
                          className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete audio note"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenAudioNote(audio)}
                        className="text-slate-700 hover:text-slate-950 font-bold flex items-center gap-0.5 text-xs cursor-pointer"
                      >
                        <span>View Note</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {renderCreateFolderModal()}
      </div>
    );
  }

  // =========================================================================
  // RENDER LEVEL 1: LIBRARY (DROPBOX / TELEGRAM STYLE FOLDERS LIST)
  // =========================================================================
  const allFilteredAudios = getSubjectAudios(null);

  return (
    <div className="space-y-4 pb-28 pt-3 px-4 max-w-md mx-auto animate-in">
      {/* 1. Restored Top Welcome Greeting Header (from Image 1) above Search Bar */}
      <div className="space-y-3 pt-1">
        {/* Row 1: Profile & Greeting with Notification Bell */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mint Circle Avatar */}
            <div
              onClick={onNavigateToAccount}
              className="size-10.5 rounded-full bg-[#A7F3D0]/60 border border-[#34D399]/40 text-[#065F46] flex items-center justify-center font-bold text-sm shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="View Account Profile"
            >
              स्म
            </div>

            {/* Greeting & Vault Status */}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 tracking-tight">
                  {`Hi, ${userSettings?.display_name || googleDriveService.getUserProfile()?.name || 'Scholar'}`}
                </span>
                <span className="size-2 rounded-full bg-[#10B981] inline-block" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Offline-First Vault • Ready to Study
              </p>
            </div>
          </div>

          {/* Notification Bell Button */}
          <button
            onClick={() => setShowNotificationToast(true)}
            className="size-10 rounded-full bg-white border border-slate-200/80 text-slate-700 hover:text-slate-950 hover:bg-slate-50 shadow-2xs transition-all active:scale-90 flex items-center justify-center relative cursor-pointer"
            title="Daily Revision Reminders"
          >
            <Bell size={17} />
            <span className="absolute top-2 right-2.5 size-2 rounded-full bg-[#10B981]" />
          </button>
        </div>

        {/* Row 2: Hero Brand Title & Tagline */}
        <div className="pt-0.5 space-y-0.5">
          <h2 className="text-2xl font-black text-slate-950 tracking-tight leading-tight">
            Save With Smriti
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            The Vedic tool for learning anything.
          </p>
        </div>

        {/* Row 3: Search Bar with Filters icon */}
        <div className="relative pt-0.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search audio notes, subjects, concepts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              onClick={onNavigateToAccount}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
              title="Filter & Settings"
            >
              <SlidersHorizontal size={15} />
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

      {/* Action Chips Row (Upload, New Topic, Sync Drive) */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onGoToRecord}
          className="bg-[#E8F8F0] hover:bg-[#DCF3E7] text-emerald-800 border border-emerald-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          <Plus size={15} className="text-emerald-700" />
          <span>Upload</span>
        </button>

        <button
          onClick={() => setIsCreateFolderOpen(true)}
          className="bg-[#FFEFEF] hover:bg-[#FFE5E5] text-rose-800 border border-rose-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          <Folder size={15} className="text-rose-700" />
          <span>New Topic</span>
        </button>

        <button
          onClick={onSyncDrive || onConnectDrive || onGoToRecord}
          disabled={isSyncingDrive}
          title={isDriveConnected ? "Sync and refresh cloud notes from Google Drive" : "Connect Google Drive"}
          className="bg-[#EEF6FF] hover:bg-[#E0EEFF] text-sky-800 border border-sky-200/70 p-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
        >
          {isSyncingDrive ? (
            <RefreshCw size={15} className="text-sky-700 animate-spin" />
          ) : (
            <Cloud size={15} className="text-sky-700" />
          )}
          <span>{isSyncingDrive ? 'Syncing...' : isDriveConnected ? 'Sync Drive' : 'Drive'}</span>
        </button>
      </div>

      {/* DIRECT SUBJECT FOLDERS CONTAINER (Tabs "All, favs, Offline, <5m" & Catalog view removed) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-3 sm:p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Subject Folders
            </span>
            <span className="text-[11px] font-mono text-slate-400 font-medium">
              {`(${deduplicatedSubjects.length})`}
            </span>
          </div>
        </div>

        {/* Clean Minimalist Subject Cards */}
        <div className="space-y-2">
          {deduplicatedSubjects.map((subject) => {
            const subjectAudios = audiosBySubject.get(subject.id) || audiosBySubject.get(subject.name.toLowerCase()) || [];
            const totalDuration = subjectAudios.reduce((acc, curr) => acc + curr.duration_seconds, 0);
            const latestAudio = subjectAudios[0];
            const SubjectIcon = getSubjectIcon(subject.icon_name);
            const subjectTheme = getSubjectTheme(subject.color_hex);

            return (
              <div
                key={subject.id}
                onClick={() => handleOpenSubject(subject.id)}
                className="group bg-white hover:bg-slate-50/90 border border-slate-200/80 hover:border-slate-300 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]"
              >
                {/* Left: Minimalist Subject Icon */}
                <div className={`w-10 h-10 rounded-2xl ${subjectTheme.bg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform border ${subjectTheme.border}`}>
                  <SubjectIcon size={20} />
                </div>

                {/* Middle: Subject Title & Clean Subtitle */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-950 group-hover:text-blue-600 transition-colors truncate">
                    {subject.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate font-normal">
                    {subjectAudios.length > 0
                      ? `${subjectAudios.length} ${subjectAudios.length === 1 ? 'lesson' : 'lessons'} · ${formatDuration(totalDuration)}`
                      : 'No recordings yet'}
                  </p>
                  {latestAudio && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Recent: <span className="text-slate-600 font-medium">{latestAudio.title}</span>
                    </p>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {onDeleteSubject && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSubjectToDelete(subject);
                      }}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      title={`Delete ${subject.name} folder`}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  <div className="text-slate-300 group-hover:text-slate-600 transition-colors">
                    <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
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
              <Empty className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-2xs">
                <EmptyHeader>
                  <EmptyMedia
                    variant="icon"
                    className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-0.5"
                  >
                    <Search size={18} />
                  </EmptyMedia>
                  <EmptyTitle className="text-xs font-bold text-slate-800">
                    No individual notes matched "{searchQuery}"
                  </EmptyTitle>
                  <EmptyDescription className="text-[11px] text-slate-500">
                    Try searching with another keyword or explore your subject folders.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
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

      {/* Subject Folder Deletion Confirmation Modal Dialog */}
      {subjectToDelete && (
        <ModalPortal>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-subject-title"
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto safe-top safe-bottom animate-in fade-in duration-200"
            onClick={() => !isDeletingSubject && setSubjectToDelete(null)}
          >
            <div
              className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl border border-slate-200/90 space-y-4 my-auto max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 id="delete-subject-title" className="text-base font-bold text-slate-900 leading-tight">
                    Delete Subject Folder
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium truncate">
                    "{subjectToDelete.name}"
                  </p>
                </div>
              </div>

              {/* Description & Options */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs text-slate-600 space-y-2.5">
                <p>
                  This will delete the <strong className="text-slate-900">{subjectToDelete.name}</strong> folder from your Smriti Library and Google Drive.
                </p>

                {(() => {
                  const subAudios = audiosBySubject.get(subjectToDelete.id) || audiosBySubject.get(subjectToDelete.name.toLowerCase()) || [];
                  const count = subAudios.length;
                  if (count > 0) {
                    return (
                      <div className="pt-2.5 border-t border-slate-200 space-y-2">
                        <p className="font-semibold text-slate-800">
                          This folder contains {count} {count === 1 ? 'recording' : 'recordings'}:
                        </p>
                        <div className="space-y-2">
                          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                              type="radio"
                              name="deleteRecordingsOption"
                              checked={!deleteRecordingsOption}
                              onChange={() => setDeleteRecordingsOption(false)}
                              className="mt-0.5 accent-blue-600 cursor-pointer"
                            />
                            <span className="text-[11px] font-medium text-slate-800">
                              Keep recordings (move to <strong className="text-blue-600">General</strong> folder)
                            </span>
                          </label>
                          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-200 cursor-pointer hover:bg-rose-50/50 transition-colors">
                            <input
                              type="radio"
                              name="deleteRecordingsOption"
                              checked={deleteRecordingsOption}
                              onChange={() => setDeleteRecordingsOption(true)}
                              className="mt-0.5 accent-rose-600 cursor-pointer"
                            />
                            <span className="text-[11px] font-medium text-rose-700">
                              Delete all recordings inside permanently
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <p className="text-[11px] text-slate-500 italic">
                      This folder is empty and will be safely deleted.
                    </p>
                  );
                })()}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isDeletingSubject}
                  onClick={() => setSubjectToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingSubject}
                  onClick={handleConfirmDeleteSubject}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingSubject ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} />
                      <span>Delete Folder</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Subject Folder Creation Modal Dialog */}
      {renderCreateFolderModal()}
    </div>
  );
};

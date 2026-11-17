import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  FolderPlus,
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
  Upload,
  Mic,
  AlertCircle,
  WifiOff,
  CloudOff,
  MoreVertical,
  Clock,
  AudioLines,
  Copy,
  Edit3,
  FolderInput,
  Share2
} from 'lucide-react';
import { SyncModePill } from './ui/SyncModePill';
import { bridge } from '../services/bridge';
import { AudioItem, Subject, PlaybackState, UserSettings, UploadProgressState } from '../types';
import { formatDuration } from '../services/learningEngine';
import { getPlayCountTheme, formatPlayCountBadge } from '../utils/playCountColor';
import { ACADEMIC_ICON_MAP } from '../utils/subjectVisuals';
import { googleDriveService } from '../services/googleDrive';
import { toastService } from '../services/toastService';
import { networkService } from '../services/networkService';
import { audioStorage } from '../services/audioStorage';
import {
  getAudioFileDuration,
  sanitizeAudioTitle,
  generateWaveformPeaks,
  formatFileSize
} from '../utils/audioUtils';
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
  syncState?: 'idle' | 'syncing' | 'waiting_for_wifi' | 'offline' | 'error' | 'disconnected';
  onSyncDrive?: () => void;
  onConnectDrive?: () => void;
  onTogglePlay?: () => void;
  onSeek?: (seconds: number) => void;
  onSetSpeed?: (speed: number) => void;
  onPlayAudio: (audio: AudioItem, queue?: AudioItem[], startIndex?: number) => void;
  onPlayQueue?: (queue: AudioItem[], startIndex?: number) => void;
  onToggleFavorite: (audioId: string) => void;
  onToggleOffline: (audio: AudioItem) => void;
  onGoToRecord: () => void;
  onCreateSubject?: (newSubject: Subject) => void;
  onDeleteSubject?: (subjectId: string, options?: { deleteRecordings?: boolean }) => Promise<void> | void;
  onDeleteAudio?: (audioId: string) => Promise<void> | void;
  onSaveAudio?: (
    partialItem: Partial<AudioItem>,
    fileBlob?: Blob,
    options?: { syncToDrive?: boolean },
    onProgress?: (progress: UploadProgressState) => void
  ) => Promise<AudioItem | void>;
  initialCreateFolderOpen?: boolean;
  userSettings?: UserSettings;
  onUpdateSettings?: (settings: Partial<UserSettings>) => void;
  onNavigateToAccount?: () => void;
  onRenameSubject?: (subjectId: string, newName: string) => Promise<void> | void;
  onCopySubject?: (subjectId: string) => Promise<void> | void;
  onRenameAudio?: (audioId: string, newTitle: string) => Promise<void> | void;
  onCopyAudio?: (audioId: string) => Promise<void> | void;
  onMoveAudio?: (audioId: string, targetSubjectId: string) => Promise<void> | void;
  forceResetRootKey?: number;
  initialActiveMenuFolderId?: string | null;
}

type LibraryViewMode = 'topics' | 'subject';
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
  syncState = 'idle',
  onSyncDrive,
  onConnectDrive,
  onTogglePlay: _onTogglePlay,
  onSeek: _onSeek,
  onSetSpeed: _onSetSpeed,
  onPlayAudio,
  onPlayQueue,
  onToggleFavorite,
  onToggleOffline,
  onGoToRecord,
  onCreateSubject,
  onDeleteSubject,
  onDeleteAudio,
  onSaveAudio,
  initialCreateFolderOpen = false,
  initialActiveMenuFolderId = null,
  userSettings,
  onUpdateSettings,
  onNavigateToAccount,
  onRenameSubject,
  onCopySubject,
  onRenameAudio,
  onCopyAudio,
  onMoveAudio,
  forceResetRootKey
}) => {
  // 2-Tier Navigation State: Library (topics) -> Subject Folder
  const [viewMode, setViewMode] = useState<LibraryViewMode>(
    initialSubjectId || initialAudioId ? 'subject' : 'topics'
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(() => {
    if (initialSubjectId) return initialSubjectId;
    if (initialAudioId) {
      const match = audioItems.find(a => a.id === initialAudioId);
      return match?.subject_id || null;
    }
    return null;
  });

  // Tap-and-Hold (Long Press) Multi-Select Playback State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedAudioIds, setSelectedAudioIds] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<any>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const pointerStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Track Overflow Menu & Audio Trimmer Modal State
  const [activeMenuAudioId, setActiveMenuAudioId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [trimmingAudio, setTrimmingAudio] = useState<AudioItem | null>(null);

  // Folder Overflow Menu State
  const [activeMenuFolderId, setActiveMenuFolderId] = useState<string | null>(initialActiveMenuFolderId);
  const [folderMenuPosition, setFolderMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(initialActiveMenuFolderId ? { top: 100, right: 20 } : null);

  // Drive Actions Modal State (Rename, Move, Permanent Delete)
  type ActionModalType =
    | { type: 'rename_folder'; folder: Subject }
    | { type: 'rename_track'; track: AudioItem }
    | { type: 'move_track'; track: AudioItem }
    | { type: 'delete_folder'; folder: Subject }
    | { type: 'delete_track'; track: AudioItem }
    | null;

  const [actionModal, setActionModal] = useState<ActionModalType>(null);
  const [modalInputValue, setModalInputValue] = useState('');
  const [modalTargetFolderId, setModalTargetFolderId] = useState('');
  const [modalDeleteRecordings, setModalDeleteRecordings] = useState(true);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

  // Non-blocking Feedback Toast for Drive Actions routed through unified Obsidian Dark Toast
  const showDriveToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    if (type === 'error') {
      toastService.danger(message);
    } else {
      toastService.drive(message);
    }
  };

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [selectedTopicTag, setSelectedTopicTag] = useState<string | null>(null);

  const handleToggleSearch = () => {
    setIsSearchOpen(prev => {
      const next = !prev;
      if (next) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else {
        setSearchQuery('');
      }
      return next;
    });
  };

  const handleToggleFolderMenu = (e: React.MouseEvent<HTMLButtonElement>, folder: Subject) => {
    e.stopPropagation();
    if (activeMenuFolderId === folder.id) {
      setActiveMenuFolderId(null);
      setFolderMenuPosition(null);
      return;
    }

    if (typeof window !== 'undefined' && e.currentTarget && typeof e.currentTarget.getBoundingClientRect === 'function') {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const isUpward = spaceBelow < 220;
      const right = Math.max(12, window.innerWidth - rect.right);

      if (isUpward) {
        setFolderMenuPosition({
          bottom: Math.max(8, window.innerHeight - rect.top + 6),
          right,
        });
      } else {
        setFolderMenuPosition({
          top: rect.bottom + 6,
          right,
        });
      }
    } else {
      setFolderMenuPosition({ top: 100, right: 16 });
    }

    setActiveMenuFolderId(folder.id);
  };

  const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>, audio: AudioItem) => {
    e.stopPropagation();
    if (activeMenuAudioId === audio.id) {
      setActiveMenuAudioId(null);
      setMenuPosition(null);
      return;
    }

    if (typeof window !== 'undefined' && e.currentTarget && typeof e.currentTarget.getBoundingClientRect === 'function') {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 180px available below (accounting for bottom dock & MiniPlayer), flip above
      const isUpward = spaceBelow < 180;
      const right = Math.max(12, window.innerWidth - rect.right);

      if (isUpward) {
        setMenuPosition({
          bottom: Math.max(8, window.innerHeight - rect.top + 6),
          right,
        });
      } else {
        setMenuPosition({
          top: rect.bottom + 6,
          right,
        });
      }
    } else {
      setMenuPosition({ top: 100, right: 16 });
    }

    setActiveMenuAudioId(audio.id);
  };

  // Audio File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTargetSubjectId, setUploadTargetSubjectId] = useState<string>('');
  const [uploadDuration, setUploadDuration] = useState<number>(60);
  const [isExtractingDuration, setIsExtractingDuration] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  // Close modals on Escape & clean up outside clicks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (actionModal && !isModalSubmitting) setActionModal(null);
        if (activeMenuFolderId) {
          setActiveMenuFolderId(null);
          setFolderMenuPosition(null);
        }
        if (isCreateFolderOpen) setIsCreateFolderOpen(false);
        if (isUploadModalOpen && !isUploading) handleCloseUploadModal();
        if (trimmingAudio) setTrimmingAudio(null);
        if (activeMenuAudioId) {
          setActiveMenuAudioId(null);
          setMenuPosition(null);
        }
        if (isSelectionMode) {
          setIsSelectionMode(false);
          setSelectedAudioIds(new Set());
        }
        if (isSearchOpen) {
          setSearchQuery('');
          setIsSearchOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateFolderOpen, isUploadModalOpen, isUploading, trimmingAudio, activeMenuAudioId, activeMenuFolderId, actionModal, isModalSubmitting, isSelectionMode, isSearchOpen]);

  useEffect(() => {
    if (!activeMenuAudioId && !activeMenuFolderId) return;

    const handleDismissMenu = () => {
      setActiveMenuAudioId(null);
      setMenuPosition(null);
      setActiveMenuFolderId(null);
      setFolderMenuPosition(null);
    };

    window.addEventListener('scroll', handleDismissMenu, true);
    window.addEventListener('resize', handleDismissMenu);
    return () => {
      window.removeEventListener('scroll', handleDismissMenu, true);
      window.removeEventListener('resize', handleDismissMenu);
    };
  }, [activeMenuAudioId, activeMenuFolderId]);

  // Global Back Handler for Android & Web Two-Step Navigation
  useEffect(() => {
    (window as any).__smritiLibraryBackHandler = () => {
      if (actionModal && !isModalSubmitting) {
        setActionModal(null);
        return true;
      }
      if (activeMenuFolderId) {
        setActiveMenuFolderId(null);
        setFolderMenuPosition(null);
        return true;
      }
      if (activeMenuAudioId) {
        setActiveMenuAudioId(null);
        setMenuPosition(null);
        return true;
      }
      if (trimmingAudio) {
        setTrimmingAudio(null);
        return true;
      }
      if (isUploadModalOpen && !isUploading) {
        handleCloseUploadModal();
        return true;
      }
      if (isCreateFolderOpen) {
        setIsCreateFolderOpen(false);
        return true;
      }
      if (isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedAudioIds(new Set());
        return true;
      }
      if (isSearchOpen) {
        setSearchQuery('');
        setIsSearchOpen(false);
        return true;
      }
      if (viewMode === 'subject') {
        handleBackToTopics();
        return true;
      }
      return false;
    };
    return () => {
      delete (window as any).__smritiLibraryBackHandler;
    };
  }, [
    actionModal,
    isModalSubmitting,
    activeMenuFolderId,
    activeMenuAudioId,
    trimmingAudio,
    isUploadModalOpen,
    isUploading,
    isCreateFolderOpen,
    isSelectionMode,
    isSearchOpen,
    viewMode
  ]);

  // Handle Forced Reset to Root Homepage from Bottom Navigation
  useEffect(() => {
    if (forceResetRootKey !== undefined && forceResetRootKey > 0) {
      setViewMode('topics');
      setSelectedSubjectId(null);
      setIsSearchOpen(false);
      setSearchQuery('');
      setActiveMenuAudioId(null);
      setActiveMenuFolderId(null);
      setActionModal(null);
      setTrimmingAudio(null);
      setIsSelectionMode(false);
      setSelectedAudioIds(new Set());
    }
  }, [forceResetRootKey]);

  // Share Public Link for Subject Folders (with real Drive folder ID resolution)
  const handleShareFolder = async (folder: Subject) => {
    if (!isDriveConnected || !networkService.isOnline()) {
      toastService.danger('Google Drive Disconnected', 'Please connect Google Drive to share folders.');
      return;
    }

    toastService.drive('Creating folder link...', `Resolving public link for "${folder.name}"...`);
    try {
      const res = await googleDriveService.shareDriveFolderPublic(folder);
      if (!res?.webViewLink) {
        toastService.danger('Could not create public link', 'Google Drive could not share this folder.');
        return;
      }

      const webViewLink = res.webViewLink;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(webViewLink).catch(() => {});
      }
      await bridge.shareText(`Study Folder: ${folder.name}`, webViewLink);
      toastService.downloads('Folder link copied to clipboard', webViewLink);
    } catch (e: any) {
      console.warn('Share folder error:', e);
      toastService.danger('Could not create public link');
    }
  };

  // Share Public Link for Audio Tracks
  const handleShareTrack = async (track: AudioItem) => {
    if (!isDriveConnected || !networkService.isOnline()) {
      toastService.danger('Google Drive Disconnected', 'Please connect Google Drive to share audio lessons.');
      return;
    }

    if (!track.google_drive_file_id) {
      toastService.danger('Track not synced to Google Drive', 'This audio note has not synced to Google Drive yet.');
      return;
    }

    toastService.drive('Creating audio link...', `Preparing public link for "${track.title}"...`);
    try {
      const res = await googleDriveService.shareDriveItemPublic(track.google_drive_file_id);
      if (!res?.webViewLink) {
        toastService.danger('Could not create public link', 'Google Drive permissions failed.');
        return;
      }

      const webViewLink = res.webViewLink;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(webViewLink).catch(() => {});
      }
      await bridge.shareText(`Audio Lesson: ${track.title}`, webViewLink);
      toastService.downloads('Track link copied to clipboard', webViewLink);
    } catch (e: any) {
      console.warn('Share track error:', e);
      toastService.danger('Could not create public link');
    }
  };

  // Copy Folder Action
  const handleCopyFolderAction = async (folder: Subject) => {
    showDriveToast(`Creating copy of "${folder.name}"...`);
    try {
      if (onCopySubject) {
        await onCopySubject(folder.id);
      } else if (folder.google_drive_folder_id) {
        await googleDriveService.copyDriveFolder(folder.google_drive_folder_id, `${folder.name} (Copy)`);
      }
      showDriveToast(`Created copy: "${folder.name} (Copy)"`, 'success');
    } catch (e) {
      showDriveToast('Copy folder failed', 'error');
    }
  };

  // Copy Track Action
  const handleCopyTrackAction = async (track: AudioItem) => {
    showDriveToast(`Creating copy of "${track.title}"...`);
    try {
      if (onCopyAudio) {
        await onCopyAudio(track.id);
      } else if (track.google_drive_file_id) {
        await googleDriveService.copyDriveFile(track.google_drive_file_id, `${track.title} (Copy)`);
      }
      showDriveToast(`Created copy of "${track.title}"`, 'success');
    } catch (e) {
      showDriveToast('Copy audio note failed', 'error');
    }
  };

  // Modal Submit (Rename, Move, Permanent Delete)
  const handleModalSubmit = async () => {
    if (!actionModal || isModalSubmitting) return;
    setIsModalSubmitting(true);
    try {
      if (actionModal.type === 'rename_folder') {
        const newName = modalInputValue.trim();
        if (newName && newName !== actionModal.folder.name) {
          showDriveToast(`Renaming to "${newName}"...`);
          if (onRenameSubject) {
            await onRenameSubject(actionModal.folder.id, newName);
          } else if (actionModal.folder.google_drive_folder_id) {
            await googleDriveService.renameDriveItem(actionModal.folder.google_drive_folder_id, newName);
          }
          showDriveToast(`Renamed to "${newName}"`, 'success');
        }
      } else if (actionModal.type === 'rename_track') {
        const newTitle = modalInputValue.trim();
        if (newTitle && newTitle !== actionModal.track.title) {
          showDriveToast(`Renaming to "${newTitle}"...`);
          if (onRenameAudio) {
            await onRenameAudio(actionModal.track.id, newTitle);
          } else if (actionModal.track.google_drive_file_id) {
            await googleDriveService.renameDriveItem(actionModal.track.google_drive_file_id, newTitle);
          }
          showDriveToast(`Renamed to "${newTitle}"`, 'success');
        }
      } else if (actionModal.type === 'move_track') {
        const targetId = modalTargetFolderId;
        const targetSub = subjects.find(s => s.id === targetId);
        if (targetId && targetSub && targetId !== actionModal.track.subject_id) {
          showDriveToast(`Moving to ${targetSub.name}...`);
          if (onMoveAudio) {
            await onMoveAudio(actionModal.track.id, targetId);
          }
          showDriveToast(`Moved to ${targetSub.name}`, 'success');
        }
      } else if (actionModal.type === 'delete_folder') {
        showDriveToast(`Deleting folder "${actionModal.folder.name}"...`);
        if (onDeleteSubject) {
          await onDeleteSubject(actionModal.folder.id, { deleteRecordings: modalDeleteRecordings });
        }
        showDriveToast(`Folder "${actionModal.folder.name}" deleted`, 'info');
      } else if (actionModal.type === 'delete_track') {
        showDriveToast(`Deleting "${actionModal.track.title}"...`);
        if (onDeleteAudio) {
          await onDeleteAudio(actionModal.track.id);
        }
        showDriveToast(`Deleted "${actionModal.track.title}"`, 'info');
      }
      setActionModal(null);
    } catch (err: any) {
      console.warn('Action modal error:', err);
      showDriveToast(err.message || 'Operation failed', 'error');
    } finally {
      setIsModalSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handleTriggerUpload = (presetSubjectId?: string) => {
    const targetId = presetSubjectId || selectedSubjectId || deduplicatedSubjects[0]?.id || 'general';
    setUploadTargetSubjectId(targetId);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validAudioFiles = files.filter(file => {
      return (
        file.type.startsWith('audio/') ||
        /\.(mp3|m4a|wav|aac|ogg|flac|webm|m4b|opus|wma|aiff)$/i.test(file.name)
      );
    });

    if (validAudioFiles.length === 0) {
      toastService.danger('Invalid Audio File', 'Please select valid audio files (.mp3, .m4a, .wav, .aac, .ogg, .flac).');
      e.target.value = '';
      return;
    }

    setUploadFiles(validAudioFiles);
    setUploadError(null);

    const activeSubId = selectedSubjectId || deduplicatedSubjects[0]?.id || 'general';
    setUploadTargetSubjectId(prev => prev || activeSubId);

    if (validAudioFiles.length === 1) {
      const single = validAudioFiles[0];
      const initialTitle = sanitizeAudioTitle(single.name);
      setUploadTitle(initialTitle);
      setIsExtractingDuration(true);
      try {
        const dur = await getAudioFileDuration(single);
        setUploadDuration(dur);
      } catch {
        setUploadDuration(60);
      } finally {
        setIsExtractingDuration(false);
      }
    } else {
      setUploadTitle('');
      setUploadDuration(60);
    }

    setIsUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    if (isUploading) return;
    setIsUploadModalOpen(false);
    setUploadFiles([]);
    setUploadProgress(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmUpload = async () => {
    if (uploadFiles.length === 0 || !uploadTargetSubjectId) return;

    const targetSub = deduplicatedSubjects.find(s => s.id === uploadTargetSubjectId) || {
      id: uploadTargetSubjectId,
      name: 'General',
      icon_name: 'Folder',
      color_hex: '#38bdf8',
      sort_order: 0
    };

    setIsUploading(true);
    setUploadError(null);

    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'm4a';
        const cleanTitle = uploadFiles.length === 1 && uploadTitle.trim()
          ? uploadTitle.trim()
          : sanitizeAudioTitle(file.name);

        let duration = uploadDuration;
        if (uploadFiles.length > 1) {
          try {
            duration = await getAudioFileDuration(file);
          } catch {
            duration = 60;
          }
        }

        const peaks = generateWaveformPeaks(32);

        if (onSaveAudio) {
          await onSaveAudio(
            {
              title: cleanTitle,
              subject_id: targetSub.id,
              subject_name: targetSub.name,
              duration_seconds: duration,
              source_type: 'imported',
              file_format: fileExt,
              file_size_bytes: file.size,
              waveform_peaks: peaks,
              key_terms: [],
              is_favorite: false,
              is_downloaded_offline: true
            },
            file,
            { syncToDrive: isDriveConnected },
            (progress) => {
              setUploadProgress({
                ...progress,
                message: uploadFiles.length > 1
                  ? `[${i + 1}/${uploadFiles.length}] ${progress.message}`
                  : progress.message
              });
            }
          );
        } else {
          const fallbackId = `aud-${Date.now()}-${i}`;
          await audioStorage.saveAudioBlob(fallbackId, file);
        }
      }

      // Success!
      setIsUploadModalOpen(false);
      const uploadedCount = uploadFiles.length;
      const uploadedName = uploadTitle.trim() || sanitizeAudioTitle(uploadFiles[0].name);
      setUploadFiles([]);
      setUploadProgress(null);

      // Navigate to target subject folder so user sees the newly uploaded file(s)
      setSelectedSubjectId(targetSub.id);
      setViewMode('subject');

      // Trigger unified Obsidian Dark toast
      const toastTitle = uploadedCount === 1 ? `"${uploadedName}"` : `${uploadedCount} audio notes`;
      toastService.library('Audio Note Uploaded', `${toastTitle} added to ${targetSub.name}.`);

    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Failed to upload audio file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

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

  const handleConfirmDeleteSubject = () => {
    if (!subjectToDelete || !onDeleteSubject) return;
    const target = subjectToDelete;
    const deleteRecordings = deleteRecordingsOption;

    // 1. Immediately dismiss modal so the screen is NEVER obstructed or blocked
    setSubjectToDelete(null);
    setDeleteRecordingsOption(false);
    setIsDeletingSubject(false);

    // 2. Immediately navigate back to topics if currently inside this deleted folder
    if (selectedSubjectId === target.id || selectedSubjectId?.toLowerCase() === target.name.toLowerCase()) {
      handleBackToTopics();
    }

    // 3. Asynchronously execute sturdy Google Drive and local storage deletion in the background
    onDeleteSubject(target.id, { deleteRecordings });
  };

  // Sync initialSubjectId or initialAudioId changes from external navigation
  useEffect(() => {
    if (initialAudioId) {
      const targetAudio = audioItems.find(a => a.id === initialAudioId);
      if (targetAudio?.subject_id) {
        setSelectedSubjectId(targetAudio.subject_id);
      }
      setViewMode('subject');
      setSelectedTopicTag(null);
    } else if (initialSubjectId) {
      setSelectedSubjectId(initialSubjectId);
      setViewMode('subject');
      setSelectedTopicTag(null);
    } else if (initialSubjectId === null) {
      setSelectedSubjectId(null);
      setViewMode('topics');
      setSelectedTopicTag(null);
    }
  }, [initialSubjectId, initialAudioId, audioItems]);

  // Selected subject object
  const selectedSubject = useMemo(
    () => subjects.find(s => s.id === selectedSubjectId) || null,
    [subjects, selectedSubjectId]
  );

  // Navigation handlers
  const handleOpenSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setViewMode('subject');
    setSelectedTopicTag(null);
    setIsSelectionMode(false);
    setSelectedAudioIds(new Set());
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleBackToTopics = () => {
    setSelectedSubjectId(null);
    setViewMode('topics');
    setSelectedTopicTag(null);
    setIsSelectionMode(false);
    setSelectedAudioIds(new Set());
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  // Tap-and-Hold (Long Press) Pointer Handlers for Multi-Select
  const handlePointerDown = (e: React.PointerEvent, audio: AudioItem) => {
    if (e.button !== 0) return;
    if (isSelectionMode) return;

    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    isLongPressTriggeredRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setIsSelectionMode(true);
      setSelectedAudioIds(new Set([audio.id]));
    }, 400);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!longPressTimerRef.current) return;
    const dist = Math.hypot(
      e.clientX - pointerStartPosRef.current.x,
      e.clientY - pointerStartPosRef.current.y
    );
    if (dist > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTrackClick = (_e: React.MouseEvent, audio: AudioItem, _index: number) => {
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }

    if (isSelectionMode) {
      setSelectedAudioIds(prev => {
        const next = new Set(prev);
        if (next.has(audio.id)) {
          next.delete(audio.id);
        } else {
          next.add(audio.id);
        }
        return next;
      });
      return;
    }

    // Single-Tap Track Behavior (Normal Mode):
    // Sets playbackQueue = [audio], currentQueueIndex = 0, immediately starts audio playback, and opens FullScreenPlayer
    if (onPlayQueue) {
      onPlayQueue([audio], 0);
    } else {
      onPlayAudio(audio);
    }
  };

  const handlePlaySelected = (subjectAudios: AudioItem[]) => {
    const selectedTracks = subjectAudios.filter(a => selectedAudioIds.has(a.id));
    if (selectedTracks.length === 0) return;

    setIsSelectionMode(false);
    setSelectedAudioIds(new Set());

    if (onPlayQueue) {
      onPlayQueue(selectedTracks, 0);
    } else {
      onPlayAudio(selectedTracks[0]);
    }
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

  // Upload Audio Modal Dialog
  const renderUploadModal = () => {
    if (!isUploadModalOpen || uploadFiles.length === 0) return null;

    const totalBytes = uploadFiles.reduce((acc, f) => acc + f.size, 0);
    const targetSub = deduplicatedSubjects.find(s => s.id === uploadTargetSubjectId);

    return (
      <ModalPortal>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-audio-modal-title"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto safe-top safe-bottom animate-in fade-in duration-200"
          onClick={() => !isUploading && handleCloseUploadModal()}
        >
          <div
            className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-slate-200/90 space-y-4 my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <Upload size={22} />
                </div>
                <div>
                  <h3 id="upload-audio-modal-title" className="text-base font-bold text-slate-900 leading-tight">
                    {uploadFiles.length === 1 ? 'Upload Audio Note' : `Upload ${uploadFiles.length} Audio Notes`}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Choose destination subject folder and review details
                  </p>
                </div>
              </div>
              {!isUploading && (
                <button
                  type="button"
                  onClick={handleCloseUploadModal}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* File info card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
              {uploadFiles.length === 1 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-800 flex items-center justify-center shrink-0">
                      <FileAudio size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {uploadFiles[0].name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 mt-0.5">
                        <span className="uppercase font-bold text-slate-700">
                          {uploadFiles[0].name.split('.').pop()?.toLowerCase() || 'audio'}
                        </span>
                        <span>·</span>
                        <span>{formatFileSize(uploadFiles[0].size)}</span>
                        <span>·</span>
                        <span>
                          {isExtractingDuration
                            ? 'Detecting length...'
                            : formatDuration(uploadDuration)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Note Title Input */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Note Title
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      disabled={isUploading}
                      placeholder="Enter note title..."
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Selected Files ({uploadFiles.length})</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {formatFileSize(totalBytes)} total
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {uploadFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileAudio size={14} className="text-emerald-700 shrink-0" />
                          <span className="truncate text-slate-800 font-medium">{file.name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Target Subject Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Target Subject Folder
                </label>
                <span className="text-[11px] font-mono text-slate-400 font-medium">
                  {`(${deduplicatedSubjects.length})`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-0.5">
                {deduplicatedSubjects.map((sub) => {
                  const isSelected = uploadTargetSubjectId === sub.id;
                  const SubIcon = getSubjectIcon(sub.icon_name);
                  const subTheme = getSubjectTheme(sub.color_hex);
                  const subAudios = audiosBySubject.get(sub.id) || audiosBySubject.get(sub.name.toLowerCase()) || [];

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      disabled={isUploading}
                      onClick={() => setUploadTargetSubjectId(sub.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl ${subTheme.bg} border ${subTheme.border} flex items-center justify-center shrink-0 text-slate-800`}
                      >
                        <SubIcon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {sub.name}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500 truncate">
                          {subAudios.length} {subAudios.length === 1 ? 'lesson' : 'lessons'}
                        </p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check size={10} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cloud Sync info */}
            <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-200/80 flex items-start gap-2.5 text-xs text-sky-900">
              <Cloud size={16} className="text-sky-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                {isDriveConnected ? (
                  <span>
                    Audio will back up directly to Google Drive under{' '}
                    <strong className="text-sky-950 font-semibold">
                      Smriti / {targetSub?.name || 'General'}
                    </strong>{' '}
                    and will be saved for instant offline playback.
                  </span>
                ) : (
                  <span>
                    Audio will be stored safely in your device's <strong>offline vault</strong>.
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar if uploading */}
            {isUploading && (
              <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 truncate pr-2">
                    {uploadProgress?.message || 'Processing and saving audio note...'}
                  </span>
                  <span className="font-mono font-bold text-emerald-700 shrink-0">
                    {uploadProgress?.percent ? `${uploadProgress.percent}%` : '...'}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress?.percent || 25}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error message */}
            {uploadError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle size={15} className="shrink-0" />
                <span className="font-medium">{uploadError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={isUploading}
                onClick={handleCloseUploadModal}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUploading || !uploadTargetSubjectId || (uploadFiles.length === 1 && !uploadTitle.trim())}
                onClick={handleConfirmUpload}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>
                      {uploadFiles.length === 1 ? 'Save & Upload' : `Upload All (${uploadFiles.length})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  };

  // Audio Trimmer Modal Portal Dialog
  const renderTrimmerModal = () => {
    if (!trimmingAudio) return null;

    return (
      <ModalPortal>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trimmer-modal-title"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTrimmingAudio(null);
          }}
        >
          <Card className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xl space-y-4 my-auto">
            <CardHeader className="p-0 border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <CardTitle id="trimmer-modal-title" className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Scissors size={16} className="text-blue-600" />
                <span className="truncate">Trim Audio: {trimmingAudio.title}</span>
              </CardTitle>
              <button
                type="button"
                onClick={() => setTrimmingAudio(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                aria-label="Close trimmer"
              >
                <X size={16} />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              <AudioTrimmer
                durationSeconds={trimmingAudio.duration_seconds}
                audioUrl={trimmingAudio.file_url}
                waveformPeaks={trimmingAudio.waveform_peaks}
                onTrimChange={() => {}}
              />
            </CardContent>
            <CardFooter className="p-0 pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setTrimmingAudio(null)}
                className="px-4 py-2 rounded-xl bg-slate-950 text-white text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                Done
              </button>
            </CardFooter>
          </Card>
        </div>
      </ModalPortal>
    );
  };

  // Floating Viewport-Safe Track Overflow Menu Portal
  const renderTrackMenu = () => {
    if (!activeMenuAudioId || !menuPosition || typeof document === 'undefined') {
      return null;
    }

    const activeAudio = audioItems.find(a => a.id === activeMenuAudioId);
    if (!activeAudio) return null;

    return (
      <ModalPortal>
        {/* Transparent backdrop overlay: intercepts clicks and prevents accidental track play */}
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            setActiveMenuAudioId(null);
            setMenuPosition(null);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            setActiveMenuAudioId(null);
            setMenuPosition(null);
          }}
          aria-hidden="true"
        />

        {/* Viewport-Safe Floating Menu Popover */}
        <div
          style={{
            ...(menuPosition.top !== undefined ? { top: `${menuPosition.top}px` } : {}),
            ...(menuPosition.bottom !== undefined ? { bottom: `${menuPosition.bottom}px` } : {}),
            right: `${menuPosition.right}px`,
          }}
          className="fixed z-50 w-52 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100 outline-none select-none overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          role="menu"
          aria-label={`Actions for ${activeAudio.title}`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuAudioId(null);
              setMenuPosition(null);
              setTrimmingAudio(activeAudio);
            }}
            className="w-full min-h-11 px-3.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80 flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <Scissors size={16} className="text-blue-500 shrink-0" />
            <span>Trim Audio</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuAudioId(null);
              setMenuPosition(null);
              onToggleOffline(activeAudio);
            }}
            className="w-full min-h-11 px-3.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80 flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            {activeAudio.is_downloaded_offline ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Remove Offline</span>
              </>
            ) : (
              <>
                <Download size={16} className="text-slate-500 shrink-0" />
                <span>Download Offline</span>
              </>
            )}
          </button>

          {/* Subtle divider */}
          <div className="my-1 border-t border-slate-100" />

          {/* 3. Rename */}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuAudioId(null);
              setMenuPosition(null);
              setModalInputValue(activeAudio.title);
              setActionModal({ type: 'rename_track', track: activeAudio });
            }}
            className="w-full min-h-11 px-3.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80 flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <Edit3 size={16} className="text-indigo-600 shrink-0" />
            <span>Rename</span>
          </button>

          {/* 4. Make a Copy */}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuAudioId(null);
              setMenuPosition(null);
              handleCopyTrackAction(activeAudio);
            }}
            className="w-full min-h-11 px-3.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80 flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <Copy size={16} className="text-sky-600 shrink-0" />
            <span>Make a Copy</span>
          </button>

          {/* 5. Move to Folder */}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuAudioId(null);
              setMenuPosition(null);
              setModalTargetFolderId(activeAudio.subject_id || deduplicatedSubjects[0]?.id || '');
              setActionModal({ type: 'move_track', track: activeAudio });
            }}
            className="w-full min-h-11 px-3.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80 flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <FolderInput size={16} className="text-amber-500 shrink-0" />
            <span>Move to Folder</span>
          </button>

          {/* 6. Share Public Link - Only when connected to Google Drive and device is online */}
          {Boolean(isDriveConnected && (typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true) && networkService.isOnline()) && (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuAudioId(null);
                setMenuPosition(null);
                handleShareTrack(activeAudio);
              }}
              className="w-full min-h-11 px-3.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80 flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <Share2 size={16} className="text-emerald-600 shrink-0" />
              <span>Share Public Link</span>
            </button>
          )}

          {/* Subtle divider */}
          <div className="my-1 border-t border-slate-100" />

          {/* 7. Delete */}
          {onDeleteAudio && (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuAudioId(null);
                setMenuPosition(null);
                setActionModal({ type: 'delete_track', track: activeAudio });
              }}
              className="w-full min-h-11 px-3.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 active:bg-rose-100 flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <Trash2 size={16} className="shrink-0" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </ModalPortal>
    );
  };

  // Floating Viewport-Safe Folder Overflow Menu Portal
  const renderFolderMenu = () => {
    if (!activeMenuFolderId || !folderMenuPosition) {
      return null;
    }

    const activeFolder = deduplicatedSubjects.find(s => s.id === activeMenuFolderId);
    if (!activeFolder) return null;

    return (
      <ModalPortal>
        {/* Transparent backdrop overlay */}
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            setActiveMenuFolderId(null);
            setFolderMenuPosition(null);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            setActiveMenuFolderId(null);
            setFolderMenuPosition(null);
          }}
          aria-hidden="true"
        />

        {/* Viewport-Safe Floating Menu Popover */}
        <div
          style={{
            ...(folderMenuPosition.top !== undefined ? { top: `${folderMenuPosition.top}px` } : {}),
            ...(folderMenuPosition.bottom !== undefined ? { bottom: `${folderMenuPosition.bottom}px` } : {}),
            right: `${folderMenuPosition.right}px`,
          }}
          className="fixed z-50 w-52 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100 outline-none select-none overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          role="menu"
          aria-label={`Actions for ${activeFolder.name}`}
        >
          {/* 1. Rename */}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuFolderId(null);
              setFolderMenuPosition(null);
              setModalInputValue(activeFolder.name);
              setActionModal({ type: 'rename_folder', folder: activeFolder });
            }}
            className="w-full min-h-11 px-3.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80 flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <Edit3 size={16} className="text-indigo-600 shrink-0" />
            <span>Rename</span>
          </button>

          {/* 2. Make a Copy */}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuFolderId(null);
              setFolderMenuPosition(null);
              handleCopyFolderAction(activeFolder);
            }}
            className="w-full min-h-11 px-3.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80 flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <Copy size={16} className="text-sky-600 shrink-0" />
            <span>Make a Copy</span>
          </button>

          {/* 3. Share Public Link - Only when connected to Google Drive and device is online */}
          {Boolean(isDriveConnected && (typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true) && networkService.isOnline()) && (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuFolderId(null);
                setFolderMenuPosition(null);
                handleShareFolder(activeFolder);
              }}
              className="w-full min-h-11 px-3.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80 flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <Share2 size={16} className="text-emerald-600 shrink-0" />
              <span>Share Public Link</span>
            </button>
          )}

          {/* Subtle divider */}
          <div className="my-1 border-t border-slate-100" />

          {/* 4. Delete */}
          {onDeleteSubject && (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuFolderId(null);
                setFolderMenuPosition(null);
                setModalDeleteRecordings(true);
                setActionModal({ type: 'delete_folder', folder: activeFolder });
              }}
              className="w-full min-h-11 px-3.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 active:bg-rose-100 flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <Trash2 size={16} className="shrink-0" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </ModalPortal>
    );
  };

  // Floating Action Dialog / Modal (Rename, Move, Permanent Delete)
  const renderActionModal = () => {
    if (!actionModal) return null;

    return (
      <ModalPortal>
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isModalSubmitting && setActionModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {actionModal.type === 'rename_folder' && 'Rename Subject Folder'}
                {actionModal.type === 'rename_track' && 'Rename Audio Note'}
                {actionModal.type === 'move_track' && 'Move to Folder'}
                {actionModal.type === 'delete_folder' && `Delete "${actionModal.folder.name}"?`}
                {actionModal.type === 'delete_track' && `Delete "${actionModal.track.title}"?`}
              </h3>
              <button
                type="button"
                disabled={isModalSubmitting}
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            {(actionModal.type === 'rename_folder' || actionModal.type === 'rename_track') && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-600 block">
                  {actionModal.type === 'rename_folder' ? 'Folder Name' : 'Audio Title'}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={modalInputValue}
                  onChange={(e) => setModalInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleModalSubmit()}
                  placeholder="Enter new name..."
                  className="w-full bg-slate-100 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none transition-all"
                />
              </div>
            )}

            {actionModal.type === 'move_track' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Select target folder for <strong className="text-slate-800 font-semibold">{actionModal.track.title}</strong>:
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {deduplicatedSubjects.map((sub) => {
                    const isSelected = modalTargetFolderId === sub.id;
                    const SubIcon = getSubjectIcon(sub.icon_name);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setModalTargetFolderId(sub.id)}
                        className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <SubIcon size={14} className={isSelected ? 'text-white' : 'text-slate-500'} />
                          <span className="truncate">{sub.name}</span>
                        </div>
                        {isSelected && <Check size={14} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(actionModal.type === 'delete_folder' || actionModal.type === 'delete_track') && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  This item will be <strong className="text-rose-600 font-semibold">permanently deleted</strong> from Google Drive and device storage. This action cannot be undone.
                </p>
                {actionModal.type === 'delete_folder' && (
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={modalDeleteRecordings}
                      onChange={(e) => setModalDeleteRecordings(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Also delete all audio recordings inside</span>
                  </label>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isModalSubmitting}
                onClick={() => setActionModal(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isModalSubmitting || (
                  (actionModal.type === 'rename_folder' || actionModal.type === 'rename_track') && !modalInputValue.trim()
                ) || (actionModal.type === 'move_track' && !modalTargetFolderId)}
                onClick={handleModalSubmit}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 ${
                  actionModal.type === 'delete_folder' || actionModal.type === 'delete_track'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {isModalSubmitting
                  ? 'Processing...'
                  : actionModal.type === 'delete_folder' || actionModal.type === 'delete_track'
                  ? 'Permanently Delete'
                  : actionModal.type === 'move_track'
                  ? 'Move Note'
                  : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  };


  // =========================================================================
  // RENDER LEVEL 2: SUBJECT TOPIC DETAIL (Audio files inside selected subject)
  // =========================================================================
  if (viewMode === 'subject' && selectedSubject) {
    const subjectAudios = getSubjectAudios(selectedSubject.id);
    const subjectTheme = getSubjectTheme(selectedSubject.color_hex);
    const SubjectIcon = getSubjectIcon(selectedSubject.icon_name);
    const totalSubjectDuration = subjectAudios.reduce((acc, curr) => acc + curr.duration_seconds, 0);
    const offlineCount = subjectAudios.filter(a => a.is_downloaded_offline).length;

    return (
      <div className="space-y-3.5 pb-36 pt-3 px-4 max-w-md mx-auto animate-in">
        {/* 1. Unified Top Navigation Header: Back Arrow + Subject Icon + Bold Folder Name + Right Actions */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={handleBackToTopics}
                className="w-9 h-9 rounded-full bg-white border border-slate-200/80 hover:bg-slate-100 active:scale-95 text-slate-700 flex items-center justify-center transition-all shadow-2xs cursor-pointer shrink-0"
                title="Back to all folders"
                aria-label="Back to folders"
              >
                <ArrowLeft size={17} strokeWidth={2.2} />
              </button>

              {/* Subject Symbol/Icon in refined size-9 compact badge */}
              <div className={`size-9 rounded-xl ${subjectTheme.bg} border ${subjectTheme.border} text-slate-800 flex items-center justify-center shadow-2xs shrink-0`}>
                <SubjectIcon size={18} strokeWidth={2.2} />
              </div>

              {/* Folder Name in big, bold, prominent typography */}
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 truncate leading-none">
                {selectedSubject.name}
              </h1>
            </div>

            {/* Right Action Icons: Search Lens + Delete Folder */}
            <div className="shrink-0 flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleSearch}
                className={`size-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                  isSearchOpen
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={isSearchOpen ? 'Close search' : `Search ${selectedSubject.name}`}
                aria-label={isSearchOpen ? 'Close search' : 'Search folder'}
              >
                <Search size={16} />
              </button>
              {onDeleteSubject && (
                <button
                  type="button"
                  onClick={() => setSubjectToDelete(selectedSubject)}
                  className="size-9 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title={`Delete ${selectedSubject.name} folder`}
                  aria-label={`Delete ${selectedSubject.name} folder`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Search Input */}
          {isSearchOpen && (
            <div className="relative pt-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }
                }}
                placeholder={`Search ${selectedSubject.name} notes & formulas...`}
                className="w-full bg-slate-100/90 focus:bg-white border border-slate-200/90 focus:border-slate-300 rounded-xl pl-8.5 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                title="Clear and close search"
                aria-label="Clear and close search"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* 2. Aesthetic Folder Info Strip (Symbols + Minimalistic Text Labels) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5 text-xs font-medium text-slate-600 tabular-nums">
          <span
            className="flex items-center gap-1.5 text-slate-600"
            title={`${subjectAudios.length} ${subjectAudios.length === 1 ? 'Note' : 'Notes'}`}
            aria-label={`${subjectAudios.length} ${subjectAudios.length === 1 ? 'Note' : 'Notes'}`}
          >
            <AudioLines size={14} className="text-slate-400 shrink-0" />
            <span>{subjectAudios.length} {subjectAudios.length === 1 ? 'Note' : 'Notes'}</span>
          </span>

          <span
            className="flex items-center gap-1.5 text-slate-600"
            title={`Total duration: ${formatDuration(totalSubjectDuration)}`}
            aria-label={`Total duration: ${formatDuration(totalSubjectDuration)} Total`}
          >
            <Clock size={14} className="text-slate-400 shrink-0" />
            <span>{formatDuration(totalSubjectDuration)} Total</span>
          </span>

          {offlineCount > 0 && (
            <span
              className="flex items-center gap-1.5 text-emerald-700 font-semibold"
              title={`${offlineCount} ${offlineCount === 1 ? 'Note' : 'Notes'} Offline`}
              aria-label={`${offlineCount} Offline`}
            >
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>{offlineCount} Offline</span>
            </span>
          )}
        </div>

        {/* 3. Hero Action Toolbar (Play All, Upload, Record) */}
        <div className="flex items-center gap-2 flex-wrap">
          {subjectAudios.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (onPlayQueue) {
                  onPlayQueue(subjectAudios, 0);
                } else {
                  onPlayAudio(subjectAudios[0]);
                }
              }}
              className="h-9 px-4 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-slate-950/20 cursor-pointer"
              title={`Play all ${selectedSubject.name} lessons`}
              aria-label={`Play all ${selectedSubject.name} lessons`}
            >
              <Play size={14} fill="white" className="translate-x-0.5" />
              <span>Play All</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleTriggerUpload(selectedSubject.id)}
            className="h-9 px-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer"
            title={`Upload audio to ${selectedSubject.name}`}
          >
            <Upload size={13} className="text-emerald-600" />
            <span>Upload</span>
          </button>

          <button
            onClick={onGoToRecord}
            className="h-9 px-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.4} />
            <span>Record</span>
          </button>
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

        {/* Selection Action Bar (in Selection Mode) */}
        {isSelectionMode && (
          <div className="sticky top-2 z-40 bg-slate-900 text-white rounded-2xl p-3 px-4 shadow-xl border border-slate-800 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400">
                {selectedAudioIds.size} selected
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedAudioIds.size === subjectAudios.length) {
                    setSelectedAudioIds(new Set());
                  } else {
                    setSelectedAudioIds(new Set(subjectAudios.map(a => a.id)));
                  }
                }}
                className="text-[11px] font-semibold text-slate-300 hover:text-white underline cursor-pointer ml-1"
              >
                {selectedAudioIds.size === subjectAudios.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedAudioIds(new Set());
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedAudioIds.size === 0}
                onClick={() => handlePlaySelected(subjectAudios)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Play size={13} fill="currentColor" className="translate-x-0.5" />
                <span>Play Selected ({selectedAudioIds.size})</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. Minimalist Music-Playlist Track Rows */}
        <div>
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
                  {`Upload an audio file or record a new lesson for ${selectedSubject.name}.`}
                </EmptyDescription>
              </EmptyHeader>
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => handleTriggerUpload(selectedSubject.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  title={`Upload audio to ${selectedSubject.name}`}
                >
                  <Upload size={13} />
                  <span>Upload Audio</span>
                </button>
                <button
                  type="button"
                  onClick={onGoToRecord}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Mic size={13} />
                  <span>Record Lesson</span>
                </button>
              </div>
            </Empty>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs divide-y divide-slate-100">
              {/* Subtle internal list header row with minimal sort tabs */}
              <div
                title={`${subjectAudios.length} audio notes`}
                className="px-3.5 py-2.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-white rounded-t-2xl border-b border-slate-100/80"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{searchQuery.trim() ? 'Search Results' : 'Folder Tracks'}</span>
                  {isSelectionMode ? (
                    <span className="text-amber-500 font-bold lowercase text-[10px] shrink-0">
                      ({selectedAudioIds.size} selected)
                    </span>
                  ) : (
                    <span className="text-[10px] font-normal text-slate-400 normal-case hidden sm:inline shrink-0" title="Hold to select">
                      • Hold to select
                    </span>
                  )}
                  <span className="sr-only">Hold to select</span>
                  <span className="sr-only">{subjectAudios.length} audio notes</span>
                </div>

                {/* Minimal borderless sort tabs */}
                <div className="flex items-center gap-1.5 text-[11px] font-semibold normal-case tracking-normal shrink-0">
                  <button
                    type="button"
                    onClick={() => setSortMode('recent')}
                    className={`transition-colors cursor-pointer py-0.5 ${
                      sortMode === 'recent'
                        ? 'text-slate-900 font-bold border-b-2 border-slate-900'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Recent
                  </button>
                  <span className="text-slate-200">·</span>
                  <button
                    type="button"
                    onClick={() => setSortMode('duration')}
                    className={`transition-colors cursor-pointer py-0.5 ${
                      sortMode === 'duration'
                        ? 'text-slate-900 font-bold border-b-2 border-slate-900'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Length
                  </button>
                  <span className="text-slate-200">·</span>
                  <button
                    type="button"
                    onClick={() => setSortMode('title')}
                    className={`transition-colors cursor-pointer py-0.5 ${
                      sortMode === 'title'
                        ? 'text-slate-900 font-bold border-b-2 border-slate-900'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    A–Z
                  </button>
                </div>
              </div>

              {/* Natural scrolling track list */}
              <ul className="divide-y divide-slate-100">
                {subjectAudios.map((audio, idx) => {
                  const isPlaying = isAudioPlaying(audio.id);
                  const isSelected = selectedAudioIds.has(audio.id);
                  const formattedIndex = String(idx + 1).padStart(2, '0');
                  const isLastTrack = idx === subjectAudios.length - 1;

                  return (
                    <li
                      key={audio.id}
                      onPointerDown={(e) => handlePointerDown(e, audio)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerCancel}
                      onClick={(e) => handleTrackClick(e, audio, idx)}
                      className={`group grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-slate-50/90 active:bg-slate-100/70 select-none cursor-pointer ${
                        isLastTrack ? 'rounded-b-2xl' : ''
                      } ${
                        isSelected
                          ? 'bg-amber-50/70'
                          : isPlaying
                          ? 'bg-slate-900/[0.04]'
                          : ''
                      }`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${isPlaying ? 'Pause' : 'Play'} ${audio.title}`}
                    >
                      {/* Column 1: Compact Track Index */}
                      <div className="w-7 text-center shrink-0 flex items-center justify-center">
                        {isSelectionMode ? (
                          <div
                            className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-2xs' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        ) : isPlaying ? (
                          <div className="flex items-end justify-center gap-0.5 h-3.5 w-3.5 mx-auto text-amber-600" aria-label="Playing">
                            <span className="w-0.5 bg-amber-600 rounded-full animate-eq-1 h-full" />
                            <span className="w-0.5 bg-amber-600 rounded-full animate-eq-2 h-2/3" />
                            <span className="w-0.5 bg-amber-600 rounded-full animate-eq-3 h-4/5" />
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 tabular-nums">
                            {formattedIndex}
                          </span>
                        )}
                      </div>

                      {/* Column 2: Title & Single-Line Metadata */}
                      <div className="min-w-0 overflow-hidden">
                        <h4
                          className={`text-[14px] font-semibold leading-snug truncate transition-colors ${
                            isPlaying ? 'text-amber-800 font-bold' : 'text-slate-900 group-hover:text-amber-700'
                          }`}
                        >
                          {audio.title}
                        </h4>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 tabular-nums whitespace-nowrap overflow-hidden">
                          <span>{formatDuration(audio.duration_seconds)}</span>
                          <span className="text-slate-300">•</span>
                          <span className="whitespace-nowrap">{formatFileSize(audio.file_size_bytes)}</span>
                          <span className="text-slate-300">•</span>
                          {(() => {
                            const playTheme = getPlayCountTheme(audio.play_count);
                            return (
                              <span
                                className={`shrink-0 whitespace-nowrap text-[10px] font-bold px-1.5 py-0.2 rounded-md border font-mono ${playTheme.badgeClass}`}
                                title={`Play count: ${audio.play_count || 0} (${playTheme.label})`}
                              >
                                {formatPlayCountBadge(audio.play_count)}
                              </span>
                            );
                          })()}
                          <span className="text-slate-300">•</span>
                          {audio.is_downloaded_offline ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold whitespace-nowrap">
                              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                              <span>Offline</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 font-normal whitespace-nowrap" title="Available in cloud">
                              <Cloud size={12} className="text-slate-400 shrink-0" />
                              <span>Cloud</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Column 3: Compact Ghost Action Buttons */}
                      {!isSelectionMode && (
                        <div className="shrink-0 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(audio.id);
                            }}
                            className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                            title={audio.is_favorite ? 'Favorited' : 'Favorite'}
                            aria-label={audio.is_favorite ? `Unfavorite ${audio.title}` : `Favorite ${audio.title}`}
                          >
                            <Star
                              size={14}
                              className={audio.is_favorite ? 'fill-amber-400 text-amber-500' : 'text-slate-300 hover:text-slate-500'}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleToggleMenu(e, audio)}
                            className={`size-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                              activeMenuAudioId === audio.id
                                ? 'bg-slate-100 text-slate-900'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                            title="More actions"
                            aria-label={`More actions for ${audio.title}`}
                            aria-haspopup="menu"
                            aria-expanded={activeMenuAudioId === audio.id}
                          >
                            <MoreVertical size={15} />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        {renderTrackMenu()}
        {renderFolderMenu()}
        {renderActionModal()}
        {renderTrimmerModal()}
        {renderCreateFolderModal()}
        {renderUploadModal()}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac,.webm,.m4b,.opus,.wma,.aiff"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          data-testid="audio-file-input"
        />
      </div>
    );
  }

  // =========================================================================
  // RENDER LEVEL 1: LIBRARY (DROPBOX / TELEGRAM STYLE FOLDERS LIST)
  // =========================================================================
  const allFilteredAudios = getSubjectAudios(null);

  return (
    <div className="space-y-4 pb-28 pt-3 px-4 max-w-md mx-auto animate-in">
      {/* 1. Header & User Identity Bar */}
      <div className="space-y-3 pt-1">
        {/* Row 1: Profile & Greeting with Wi-Fi Sync Pill */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Medallion Avatar with Status Indicator */}
            <div
              onClick={onNavigateToAccount}
              className="relative size-10 sm:size-11 rounded-full bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 border border-emerald-300/60 text-emerald-800 flex items-center justify-center font-bold text-sm shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer group shrink-0"
              title="View Account Profile & Settings"
            >
              <span>स्म</span>
              <span className="absolute bottom-0 right-0 size-2.5 sm:size-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400/30" />
            </div>

            {/* Greeting & Vault Status */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 tracking-normal block leading-tight truncate">
                  {(() => {
                    const hour = new Date().getHours();
                    if (hour < 12) return 'Good morning';
                    if (hour < 17) return 'Good afternoon';
                    return 'Good evening';
                  })()}
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-950 tracking-tight leading-tight flex items-center gap-1.5 mt-0.5 truncate">
                <span className="truncate">{`Hi, ${userSettings?.display_name || googleDriveService.getUserProfile()?.name || 'Scholar'}`}</span>
              </h1>
            </div>
          </div>

          {/* Right: Self-Aware Live Sync Mode Pill */}
          <div className="shrink-0 flex items-center">
            <SyncModePill
              onToggle={(nextWifiOnly) => {
                if (onUpdateSettings) {
                  onUpdateSettings({ offline_sync_wifi_only: nextWifiOnly });
                }
              }}
            />
          </div>
        </div>

        {/* Row 2: Headline & Vault Capacity Badge */}
        <div className="pt-0.5 flex items-baseline justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight leading-tight">
              Smriti Library
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Simplest Vedic Tool For Learning Anything.
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
            {deduplicatedSubjects.length} {deduplicatedSubjects.length === 1 ? 'folder' : 'folders'}
          </span>
        </div>

        {/* Row 3: Modern Full-Width Search Bar */}
        <div className="relative pt-0.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search audio notes, subjects, concepts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all font-medium"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              onClick={onNavigateToAccount}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
              title="Account & Storage Preferences"
            >
              <SlidersHorizontal size={15} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Cohesive Premium Action Deck (Upload, New Folder, Cloud Sync) */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Action 1: Upload Audio */}
        <button
          type="button"
          onClick={() => handleTriggerUpload()}
          className="bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-emerald-300/80 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer group"
          title="Upload audio notes from device"
          aria-label="Upload audio notes from device"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
            <Upload size={15} strokeWidth={2.2} />
          </div>
          <div className="w-full min-w-0">
            <span className="text-xs font-bold text-slate-900 block truncate leading-tight">Upload</span>
            <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">Audio File</span>
          </div>
        </button>

        {/* Action 2: New Topic */}
        <button
          type="button"
          onClick={() => setIsCreateFolderOpen(true)}
          className="bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-indigo-300/80 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer group"
          title="Create a new topic folder"
          aria-label="New Topic"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
            <FolderPlus size={15} strokeWidth={2.2} />
          </div>
          <div className="w-full min-w-0">
            <span className="text-xs font-bold text-slate-900 block truncate leading-tight">New Topic</span>
            <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">Folder</span>
          </div>
        </button>

        {/* Action 3: Cloud Sync with Intelligent Wi-Fi Only State */}
        <button
          type="button"
          onClick={() => (onSyncDrive ? onSyncDrive() : onConnectDrive ? onConnectDrive() : onGoToRecord())}
          disabled={isSyncingDrive}
          title={
            syncState === 'waiting_for_wifi'
              ? 'Wi-Fi Only Sync active: Paused on mobile data'
              : syncState === 'offline'
              ? 'Offline mode: Changes stored safely on device'
              : isDriveConnected
              ? 'Tap to sync library with Google Drive'
              : 'Connect Google Drive account'
          }
          aria-label={
            syncState === 'waiting_for_wifi'
              ? 'Sync paused waiting for Wi-Fi'
              : isSyncingDrive
              ? 'Synchronizing library'
              : 'Sync Google Drive'
          }
          className="bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-sky-300/80 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer group disabled:opacity-75"
        >
          {syncState === 'syncing' || isSyncingDrive ? (
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-2xs">
              <RefreshCw size={15} className="animate-spin" />
            </div>
          ) : syncState === 'waiting_for_wifi' ? (
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs">
              <WifiOff size={15} strokeWidth={2.2} />
            </div>
          ) : syncState === 'offline' ? (
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shadow-2xs">
              <CloudOff size={15} strokeWidth={2.2} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
              <Cloud size={15} strokeWidth={2.2} />
            </div>
          )}

          <div className="w-full min-w-0">
            <span className="text-xs font-bold text-slate-900 block truncate leading-tight">
              {syncState === 'syncing' || isSyncingDrive
                ? 'Syncing...'
                : syncState === 'waiting_for_wifi'
                ? 'Waiting'
                : syncState === 'offline'
                ? 'Offline'
                : isDriveConnected
                ? 'Sync Drive'
                : 'Connect'}
            </span>
            <span
              className={`text-[10px] font-medium block truncate mt-0.5 ${
                syncState === 'waiting_for_wifi'
                  ? 'text-amber-600 font-semibold'
                  : syncState === 'syncing'
                  ? 'text-sky-600 font-semibold'
                  : isDriveConnected
                  ? 'text-emerald-600 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              {syncState === 'waiting_for_wifi'
                ? 'Wi-Fi Only'
                : syncState === 'syncing'
                ? 'Active'
                : isDriveConnected
                ? 'Cloud Active'
                : 'Google Drive'}
            </span>
          </div>
        </button>
      </div>

      {/* 3. Direct Subject Folders Section */}
      <div className="rounded-3xl bg-gradient-to-br from-rose-100/95 via-pink-100/85 to-fuchsia-100/80 border border-rose-300/80 p-4 shadow-[0_10px_26px_-8px_rgba(225,29,72,0.16)] transition-colors space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-950/80">
              Subject Folders
            </span>
            <span className="text-[11px] font-bold text-rose-700 tabular-nums">
              {`(${deduplicatedSubjects.length})`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateFolderOpen(true)}
            className="inline-flex items-center gap-1 rounded-full bg-white/90 hover:bg-white px-3 py-1 text-xs font-semibold text-rose-800 border border-rose-300/70 shadow-2xs active:scale-95 transition cursor-pointer"
          >
            <Plus size={13} strokeWidth={2.2} />
            <span>New Folder</span>
          </button>
        </div>

        {/* Clean Minimalist Subject Cards */}
        <div className="space-y-2.5">
          {deduplicatedSubjects.length === 0 ? (
            <div className="py-8 px-4 text-center space-y-3 bg-white/80 border border-dashed border-rose-200 rounded-2xl">
              <div className="size-11 rounded-2xl bg-white border border-rose-200 text-rose-400 mx-auto flex items-center justify-center shadow-2xs">
                <Folder size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900">No subject folders</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Create custom folders to organize your lectures and study recordings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateFolderOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <FolderPlus size={13} />
                <span>Create Folder</span>
              </button>
            </div>
          ) : (
            deduplicatedSubjects.map((subject) => {
              const subjectAudios = audiosBySubject.get(subject.id) || audiosBySubject.get(subject.name.toLowerCase()) || [];
              const totalDuration = subjectAudios.reduce((acc, curr) => acc + curr.duration_seconds, 0);
              const latestAudio = subjectAudios[0];
              const SubjectIcon = getSubjectIcon(subject.icon_name);

              return (
                <div
                  key={subject.id}
                  onClick={() => handleOpenSubject(subject.id)}
                  className="group relative flex items-center justify-between rounded-2xl bg-white/95 hover:bg-white border border-rose-200/90 hover:border-rose-400/80 px-3.5 py-3 shadow-[0_4px_12px_-3px_rgba(190,24,93,0.10)] transition-all cursor-pointer active:scale-[0.99] gap-3"
                >
                  {/* Left: Minimalist Subject Icon */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 text-rose-700 border border-rose-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <SubjectIcon size={20} strokeWidth={2.2} />
                  </div>

                  {/* Middle: Subject Title & Clean Subtitle */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-rose-600 transition-colors truncate">
                        {subject.name}
                      </h3>
                    </div>
                    <p className="text-xs font-medium text-slate-600 tabular-nums mt-0.5 truncate">
                      {subjectAudios.length > 0
                        ? `${subjectAudios.length} ${subjectAudios.length === 1 ? 'lesson' : 'lessons'} · ${formatDuration(totalDuration)}`
                        : 'No recordings yet'}
                    </p>
                    {latestAudio && (
                      <p className="text-xs text-rose-900/70 truncate mt-0.5">
                        Recent: <span className="font-medium text-slate-700">{latestAudio.title}</span>
                      </p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleToggleFolderMenu(e, subject)}
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        activeMenuFolderId === subject.id
                          ? 'text-rose-600 bg-rose-50'
                          : 'text-slate-400 hover:text-slate-700 hover:bg-rose-50/60'
                      }`}
                      title={`Folder options for ${subject.name}`}
                      aria-label={`Folder options for ${subject.name}`}
                    >
                      <MoreVertical size={16} />
                      <span className="sr-only" title={`Delete ${subject.name} folder`} aria-label={`Delete ${subject.name} folder`}>
                        Delete {subject.name} folder
                      </span>
                    </button>
                    <div className="text-slate-300 group-hover:text-rose-600 transition-colors pr-1">
                      <ChevronRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Recent Audio Notes or Quick Start Guide */}
      {audioItems.length > 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Recent Audio Notes
            </span>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              {audioItems.length} total
            </span>
          </div>

          <div className="space-y-2">
            {audioItems.slice(0, 3).map((audio) => {
              const isPlaying = playbackState?.currentAudio?.id === audio.id && playbackState.isPlaying;
              return (
                <div
                  key={audio.id}
                  onClick={() => {
                    if (onPlayQueue) {
                      onPlayQueue([audio], 0);
                    } else {
                      onPlayAudio(audio);
                    }
                  }}
                  className="group bg-slate-50/60 hover:bg-slate-100/80 border border-slate-200/60 hover:border-slate-300/80 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onPlayQueue) {
                          onPlayQueue([audio], 0);
                        } else {
                          onPlayAudio(audio);
                        }
                      }}
                      className={`size-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform active:scale-90 ${
                        isPlaying ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50'
                      }`}
                      aria-label={isPlaying ? `Pause ${audio.title}` : `Play ${audio.title}`}
                    >
                      {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="translate-x-0.5" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {audio.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">{audio.subject_name || 'General'}</span>
                        <span>•</span>
                        <span>{formatDuration(audio.duration_seconds)}</span>
                        <span>•</span>
                        {(() => {
                          const playTheme = getPlayCountTheme(audio.play_count);
                          return (
                            <span
                              className={`shrink-0 whitespace-nowrap text-[9.5px] font-bold px-1.5 py-0.2 rounded-md border font-mono ${playTheme.badgeClass}`}
                              title={`Play count: ${audio.play_count || 0} (${playTheme.label})`}
                            >
                              {formatPlayCountBadge(audio.play_count)}
                            </span>
                          );
                        })()}
                        {audio.is_favorite && <Star size={11} className="text-amber-500 fill-amber-500" />}
                      </p>
                    </div>
                  </div>

                  <div className="text-slate-300 group-hover:text-slate-600 transition-colors pr-1">
                    <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-white via-slate-50/60 to-emerald-50/20 border border-slate-200/80 rounded-3xl p-5 text-center space-y-3.5 shadow-2xs">
          <div className="size-11 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-emerald-700 mx-auto flex items-center justify-center shadow-2xs">
            <Mic size={22} strokeWidth={2.2} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">Start Your Audio Study Vault</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Capture your first lesson, voice reflection, or upload lecture audio to activate spaced retention repeats.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 pt-0.5">
            <button
              type="button"
              onClick={onGoToRecord}
              className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <Mic size={14} />
              <span>Record Note</span>
            </button>
            <button
              type="button"
              onClick={() => handleTriggerUpload()}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <Upload size={14} />
              <span>Upload Audio</span>
            </button>
          </div>
        </div>
      )}

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
                  onClick={() => {
                    if (onPlayQueue) {
                      onPlayQueue([audio], 0);
                    } else {
                      onPlayAudio(audio);
                    }
                  }}
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
                    {(() => {
                      const playTheme = getPlayCountTheme(audio.play_count);
                      return (
                        <span
                          className={`shrink-0 whitespace-nowrap text-[9.5px] font-bold px-1.5 py-0.2 rounded-md border font-mono ${playTheme.badgeClass}`}
                          title={`Play count: ${audio.play_count || 0} (${playTheme.label})`}
                        >
                          {formatPlayCountBadge(audio.play_count)}
                        </span>
                      );
                    })()}
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
                    const otherSubjects = deduplicatedSubjects.filter(
                      s => s.id !== subjectToDelete.id && s.name.toLowerCase() !== subjectToDelete.name.toLowerCase()
                    );
                    const fallbackSubject = otherSubjects.find(s => s.name.toLowerCase() === 'general') || otherSubjects[0];

                    return (
                      <div className="pt-2.5 border-t border-slate-200 space-y-2">
                        <p className="font-semibold text-slate-800">
                          This folder contains {count} {count === 1 ? 'recording' : 'recordings'}:
                        </p>
                        <div className="space-y-2">
                          {fallbackSubject && (
                            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                              <input
                                type="radio"
                                name="deleteRecordingsOption"
                                checked={!deleteRecordingsOption}
                                onChange={() => setDeleteRecordingsOption(false)}
                                className="mt-0.5 accent-blue-600 cursor-pointer"
                              />
                              <span className="text-[11px] font-medium text-slate-800">
                                Keep recordings (move to <strong className="text-blue-600">{fallbackSubject.name}</strong> folder)
                              </span>
                            </label>
                          )}
                          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-200 cursor-pointer hover:bg-rose-50/50 transition-colors">
                            <input
                              type="radio"
                              name="deleteRecordingsOption"
                              checked={deleteRecordingsOption || !fallbackSubject}
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

      {/* Portaled Track & Folder Menus, Actions Modal, and Drive Toast */}
      {renderTrackMenu()}
      {renderFolderMenu()}
      {renderActionModal()}
      {renderTrimmerModal()}

      {/* Subject Folder Creation Modal Dialog */}
      {renderCreateFolderModal()}

      {/* Audio File Upload Modal Dialog */}
      {renderUploadModal()}

      {/* Hidden File Input for Native Audio Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac,.webm,.m4b,.opus,.wma,.aiff"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        data-testid="audio-file-input"
      />
    </div>
  );
};

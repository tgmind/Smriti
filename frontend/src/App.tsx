import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TabType, Navigation } from './components/Navigation';
import { MiniPlayer } from './components/MiniPlayer';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { LibraryTab } from './components/LibraryTab';
import { DownloadsTab } from './components/DownloadsTab';
import { ProgressTab } from './components/ProgressTab';
import { RecordTab } from './components/RecordTab';
import { ProfileTab } from './components/ProfileTab';

import {
  AudioItem,
  Subject,
  RevisionItem,
  DailyStudyStats,
  UserSettings,
  PlaybackState,
  StorageOverview,
  UploadProgressState
} from './types';
import { ArrowLeft, ShieldAlert, Cloud, ChevronRight, HardDrive, ChevronDown, ChevronUp } from 'lucide-react';
import {
  DEFAULT_USER_SETTINGS,
  DEFAULT_SUBJECTS,
  checkStudentStatus
} from './services/supabase';
import { bridge } from './services/bridge';
import { verifiedPlayTracker } from './services/learningEngine';
import { playCountService } from './services/playCountService';
import { getPlayCountTheme } from './utils/playCountColor';
import { googleDriveService } from './services/googleDrive';
import { audioStorage } from './services/audioStorage';
import { networkService } from './services/networkService';
import { BackgroundSyncBanner, ActiveSyncTask } from './components/BackgroundSyncBanner';
import { SyncToastState } from './components/SyncStatusToast';
import { ToastContainer } from './components/ui/ToastContainer';
import { toastService, ToastSection } from './services/toastService';
import { AuthScreen } from './components/AuthScreen';

// --- Multi-Context Storage Isolation (Guest Mode vs Connected User) ---
const getStorageKey = (key: 'subjects' | 'audio_items' | 'revisions' | 'daily_stats', isGuest: boolean): string => {
  return isGuest ? `smriti_guest_${key}` : `smriti_${key}`;
};

const loadGuestSubjects = (): Subject[] => {
  if (typeof window === 'undefined') return DEFAULT_SUBJECTS;
  const saved = localStorage.getItem('smriti_guest_subjects');
  if (!saved) return DEFAULT_SUBJECTS;
  try {
    const parsed: Subject[] = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_SUBJECTS;
  } catch {
    return DEFAULT_SUBJECTS;
  }
};

const loadGuestAudioItems = (): AudioItem[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('smriti_guest_audio_items');
  if (!saved) return [];
  try {
    const parsed: AudioItem[] = JSON.parse(saved);
    const demoIds = new Set(['aud-1', 'aud-2', 'aud-3', 'aud-4']);
    return parsed
      .filter(item => !demoIds.has(item.id))
      .map(item => playCountService.mergeAudioItem(item));
  } catch {
    return [];
  }
};

const loadUserSubjects = (): Subject[] => {
  if (typeof window === 'undefined') return DEFAULT_SUBJECTS;
  const saved = localStorage.getItem('smriti_subjects');
  if (!saved) return DEFAULT_SUBJECTS;
  try {
    const parsed: Subject[] = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const map = new Map<string, Subject>();
      for (const s of parsed) {
        if (!s || !s.name) continue;
        const norm = s.name.trim().toLowerCase();
        if (!map.has(norm)) {
          map.set(norm, {
            ...s,
            icon_name:
              s.icon_name === 'Atom' ||
              s.icon_name === 'FlaskConical' ||
              s.icon_name === 'Dna' ||
              s.icon_name === 'Binary' ||
              s.icon_name === 'Folder'
                ? 'BookOpen'
                : (s.icon_name || 'BookOpen'),
          });
        }
      }
      return Array.from(map.values());
    }
    return DEFAULT_SUBJECTS;
  } catch {
    return DEFAULT_SUBJECTS;
  }
};

const loadUserAudioItems = (): AudioItem[] => {
  if (typeof window === 'undefined') return [];
  if (!googleDriveService.isConnected()) return [];
  const saved = localStorage.getItem('smriti_audio_items');
  if (!saved) return [];
  try {
    const parsed: AudioItem[] = JSON.parse(saved);
    const demoIds = new Set(['aud-1', 'aud-2', 'aud-3', 'aud-4']);
    return parsed
      .filter(item => !demoIds.has(item.id))
      .map(item => playCountService.mergeAudioItem(item));
  } catch {
    return [];
  }
};

const persistSubjects = (subs: Subject[], isGuest: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey('subjects', isGuest), JSON.stringify(subs));
  } catch (e) {
    console.warn('Failed to save subjects to storage', e);
  }
};

const persistAudioItems = (items: AudioItem[], isGuest: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey('audio_items', isGuest), JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to save audio items to storage', e);
  }
};

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('library');
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('smriti_guest_mode') === 'true';
  });

  const [audioItems, setAudioItems] = useState<AudioItem[]>(() => {
    const isGuest = typeof window !== 'undefined' && localStorage.getItem('smriti_guest_mode') === 'true';
    if (isGuest) {
      return loadGuestAudioItems();
    }
    if (googleDriveService.isConnected()) {
      return loadUserAudioItems();
    }
    return [];
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const isGuest = typeof window !== 'undefined' && localStorage.getItem('smriti_guest_mode') === 'true';
    if (isGuest) {
      return loadGuestSubjects();
    }
    if (googleDriveService.isConnected()) {
      return loadUserSubjects();
    }
    return DEFAULT_SUBJECTS;
  });

  const [revisionItems] = useState<RevisionItem[]>(() => {
    const isGuest = typeof window !== 'undefined' && localStorage.getItem('smriti_guest_mode') === 'true';
    const saved = typeof window !== 'undefined' ? localStorage.getItem(getStorageKey('revisions', isGuest)) : null;
    if (!saved) return [];
    try {
      const parsed: RevisionItem[] = JSON.parse(saved);
      const demoRevIds = new Set(['rev-1', 'rev-2', 'rev-3']);
      return parsed.filter(item => !demoRevIds.has(item.id));
    } catch {
      return [];
    }
  });

  const [dailyStats, setDailyStats] = useState<DailyStudyStats[]>(() => {
    const isGuest = typeof window !== 'undefined' && localStorage.getItem('smriti_guest_mode') === 'true';
    const saved = typeof window !== 'undefined' ? localStorage.getItem(getStorageKey('daily_stats', isGuest)) : null;
    if (!saved) return [];
    try {
      const parsed: DailyStudyStats[] = JSON.parse(saved);
      const demoDates = new Set(['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11']);
      return parsed.filter(stat => !demoDates.has(stat.study_date));
    } catch {
      return [];
    }
  });

  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('smriti_settings');
    return saved ? JSON.parse(saved) : DEFAULT_USER_SETTINGS;
  });

  // Auto-tune local cache limit on initial app mount by analyzing device hardware capacity
  useEffect(() => {
    audioStorage.estimateDeviceCapacity().then(estimate => {
      if (estimate?.optimalCacheLimitMB) {
        setUserSettings(prev => {
          if (!localStorage.getItem('smriti_settings')) {
            const updated: UserSettings = { ...prev, cache_limit_mb: estimate.optimalCacheLimitMB || 500 };
            try {
              localStorage.setItem('smriti_settings', JSON.stringify(updated));
            } catch {}
            return updated;
          }
          return prev;
        });
      }
    }).catch(err => {
      console.warn('[App] Device cache capacity estimate note:', err);
    });
  }, []);

  const [storageInfo, setStorageInfo] = useState<StorageOverview>(() => bridge.getStorageInfo());

  // Synchronize dynamic device storage metrics on mount and when navigating tabs
  useEffect(() => {
    bridge.getStorageInfoAsync().then(info => {
      setStorageInfo(info);
    }).catch(() => {});
  }, [currentTab]);
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(() => googleDriveService.isConnected());
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);
  const [isUserBlocked, setIsUserBlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('smriti_blocked_user') === 'true';
    }
    return false;
  });
  const [blockedReason, setBlockedReason] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('smriti_blocked_reason') || 'Your student account has been suspended by the administrator.';
    }
    return 'Your student account has been suspended by the administrator.';
  });

  // Check remote account status on startup if connected to Google
  useEffect(() => {
    if (isDriveConnected && !isGuestMode) {
      checkStudentStatus()
        .then((status) => {
          if (status.isBlocked) {
            setIsUserBlocked(true);
            setBlockedReason(status.blockedReason || 'Your student account has been suspended by the administrator.');
          }
        })
        .catch(() => {});
    }
  }, [isDriveConnected, isGuestMode]);

  // Guest Mode auto-collapsing floating banner state (Stitch Vedic Sacred Memory)
  const [isGuestBannerExpanded, setIsGuestBannerExpanded] = useState<boolean>(true);
  const guestBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isGuestMode && !isDriveConnected) {
      setIsGuestBannerExpanded(true);
      if (guestBannerTimerRef.current) {
        clearTimeout(guestBannerTimerRef.current);
      }
      guestBannerTimerRef.current = setTimeout(() => {
        setIsGuestBannerExpanded(false);
      }, 5000);

      return () => {
        if (guestBannerTimerRef.current) {
          clearTimeout(guestBannerTimerRef.current);
        }
      };
    }
  }, [isGuestMode, isDriveConnected]);

  const handleBannerMouseEnter = () => {
    if (guestBannerTimerRef.current) {
      clearTimeout(guestBannerTimerRef.current);
      guestBannerTimerRef.current = null;
    }
  };

  // Background non-blocking sync tasks (e.g., folder deletion, audio deletion, Drive sync)
  const [activeSyncTasks, setActiveSyncTasks] = useState<ActiveSyncTask[]>([]);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'waiting_for_wifi' | 'offline' | 'error' | 'disconnected'>('idle');

  // Unified Obsidian Dark Toast System for Network & Sync Status
  const showSyncToast = (toast: Omit<SyncToastState, 'id'>) => {
    const isPaused = toast.type === 'wifi_only_paused';
    const isWifiConnected = toast.type === 'wifi_connected';
    const isSynced = toast.type === 'synced';
    const isOffline = toast.type === 'offline';

    const section: ToastSection = isPaused || isWifiConnected || isSynced
      ? 'downloads'
      : isOffline
      ? 'danger'
      : 'neutral';

    toastService.show({
      title: toast.title || (isPaused ? 'Wi-Fi Only Sync' : isWifiConnected ? 'Wi-Fi Connected' : 'Sync Status'),
      description: toast.message,
      section,
      duration: toast.durationMs,
      action: toast.actionLabel && toast.onAction ? {
        label: toast.actionLabel,
        onClick: toast.onAction
      } : undefined
    });
  };

  const updateSyncTask = (taskId: string, updates: Partial<ActiveSyncTask>) => {
    setActiveSyncTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, ...updates } : t))
    );
  };

  const dismissSyncTask = (taskId: string) => {
    setActiveSyncTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleRetryTask = (task: ActiveSyncTask) => {
    if (task.type === 'delete_folder' || task.type === 'delete_audio' || task.type === 'sync') {
      const permission = networkService.canSync(userSettings.offline_sync_wifi_only);
      if (!permission.allowed && (permission.reason === 'wifi_only_on_cellular' || permission.reason === 'wifi_only_unverified')) {
        updateSyncTask(task.id, {
          status: 'pending',
          stageMessage: 'Sync deferred: Waiting for Wi-Fi connection...'
        });
        showSyncToast({
          type: 'wifi_only_paused',
          title: 'Retry Deferred on Mobile Data',
          message: 'Wi-Fi Only Sync is active. Task will retry automatically when connected to Wi-Fi.',
          actionLabel: 'Retry Anyway',
          onAction: () => {
            updateSyncTask(task.id, {
              status: 'running',
              progressPercent: 20,
              stageMessage: 'Retrying sync with Google Drive...'
            });
            handleSyncDrive({ forceSync: true });
          },
          durationMs: 6500
        });
        return;
      }

      updateSyncTask(task.id, {
        status: 'running',
        progressPercent: 20,
        stageMessage: 'Retrying sync with Google Drive...'
      });
      handleSyncDrive()
        .then(() => {
          updateSyncTask(task.id, {
            status: 'completed',
            progressPercent: 100,
            stageMessage: 'Drive synchronized successfully'
          });
          setTimeout(() => dismissSyncTask(task.id), 2500);
        })
        .catch(err => {
          updateSyncTask(task.id, {
            status: 'error',
            stageMessage: `Retry failed: ${err.message || 'Drive unavailable'}`
          });
        });
    }
  };

  // Playback & UI Modals
  const [isFullScreenPlayerOpen, setIsFullScreenPlayerOpen] = useState(false);
  const [playbackQueue, setPlaybackQueue] = useState<AudioItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    currentAudio: null,
    isPlaying: false,
    positionSeconds: 0,
    durationSeconds: 0,
    playbackSpeed: 1.0,
    isRepeatTrack: false,
    isRepeatQueue: false,
    repeatMode: 'off',
    abLoop: null,
    sleepTimerRemainingSeconds: null,
    learningModeActive: false
  });

  // Track listening metrics per session for completed-play rules
  const currentSessionListeningSeconds = useRef<number>(0);
  const completedPlayRecordedForSession = useRef<boolean>(false);

  // Synchronized refs to avoid stale closure state during native/bridge events
  const playbackStateRef = useRef(playbackState);
  playbackStateRef.current = playbackState;
  const playbackQueueRef = useRef(playbackQueue);
  playbackQueueRef.current = playbackQueue;
  const currentQueueIndexRef = useRef(currentQueueIndex);
  currentQueueIndexRef.current = currentQueueIndex;
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;

  const recordCompletedPlayStats = (listeningSeconds: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setDailyStats(prev => {
      const existingIdx = prev.findIndex(s => s.study_date === todayStr);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          completed_plays: updated[existingIdx].completed_plays + 1,
          total_listening_seconds: updated[existingIdx].total_listening_seconds + Math.round(listeningSeconds)
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            study_date: todayStr,
            total_listening_seconds: Math.round(listeningSeconds),
            completed_plays: 1,
            assessments_taken: 0,
            successful_recalls: 0
          }
        ];
      }
    });
  };

  const handleVerifiedPlayCompleted = async (audio: AudioItem) => {
    // Record study session statistics
    recordCompletedPlayStats(currentSessionListeningSeconds.current);

    // 1. Instant local optimistic increment + asynchronous Supabase sync
    const newCount = await playCountService.incrementPlayCount(audio);

    // 2. Android native Room SQLite persistence
    bridge.recordVerifiedFullPlay(audio.id, audio.duration_seconds || 60, playbackState.playbackSpeed);

    // 3. Update React state for all audio items
    const nowIso = new Date().toISOString();
    setAudioItems(prev => {
      const updated = prev.map(item =>
        item.id === audio.id
          ? { ...item, play_count: newCount, last_listened_at: nowIso }
          : item
      );
      persistAudioItems(updated, isGuestMode);
      return updated;
    });

    // 4. Update playbackState.currentAudio if it matches
    setPlaybackState(prev => {
      if (prev.currentAudio?.id === audio.id) {
        return {
          ...prev,
          currentAudio: {
            ...prev.currentAudio,
            play_count: newCount,
            last_listened_at: nowIso
          }
        };
      }
      return prev;
    });

    // 5. Celebration Toast
    const theme = getPlayCountTheme(newCount);
    toastService.progress(
      'Play Count Verified (+1)',
      `"${audio.title}" reached ${newCount} plays • ${theme.label}`
    );
  };

  // Sync to localStorage with strict guest vs user isolation
  useEffect(() => {
    if (isGuestMode) {
      persistAudioItems(audioItems, true);
    } else if (isDriveConnected) {
      persistAudioItems(audioItems, false);
    }
  }, [audioItems, isGuestMode, isDriveConnected]);

  useEffect(() => {
    if (isGuestMode) {
      persistSubjects(subjects, true);
    } else if (isDriveConnected) {
      persistSubjects(subjects, false);
    }
  }, [subjects, isGuestMode, isDriveConnected]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(getStorageKey('revisions', isGuestMode), JSON.stringify(revisionItems));
    } catch {}
  }, [revisionItems, isGuestMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(getStorageKey('daily_stats', isGuestMode), JSON.stringify(dailyStats));
    } catch {}
  }, [dailyStats, isGuestMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('smriti_settings', JSON.stringify(userSettings));
    } catch {}
    networkService.offline_sync_wifi_only = userSettings.offline_sync_wifi_only;
  }, [userSettings]);

  // Real-time Network Monitoring & Wi-Fi Only Sync Handshake
  useEffect(() => {
    return networkService.subscribe((current, prev) => {
      // 1. Transitioned to Cellular with Wi-Fi Only Sync enabled
      if (current.isOnline && current.isCellular && !prev.isCellular && userSettings.offline_sync_wifi_only) {
        // Abort in-flight network activity cleanly to avoid consuming cellular data
        googleDriveService.cancelActiveTransfers('Paused: Device transitioned to mobile data under Wi-Fi Only Mode');
        setIsSyncingDrive(false);
        setSyncState('waiting_for_wifi');
        showSyncToast({
          type: 'wifi_only_paused',
          title: 'Wi-Fi Only Sync Active',
          message: 'Connected via mobile data. Google Drive sync is paused to preserve your cellular allowance.',
          actionLabel: 'Settings',
          onAction: () => handleNavigateToAccount(),
          durationMs: 6500
        });
      }

      // 2. Transitioned from Cellular / Offline to Wi-Fi
      if (current.isOnline && current.isWifi && (!prev.isWifi || !prev.isOnline)) {
        if (googleDriveService.isConnected()) {
          showSyncToast({
            type: 'wifi_connected',
            title: 'Wi-Fi Connected',
            message: 'Google Drive sync resumed automatically over Wi-Fi.',
            durationMs: 4000
          });
          // Auto-sync library safely on Wi-Fi
          handleSyncDrive({ silent: true }).catch(() => {});
        }
      }
    });
  }, [userSettings.offline_sync_wifi_only, isDriveConnected]);

  // Intelligent Cyclic & Scheduled Synchronization Engine
  useEffect(() => {
    // 5-minute cyclic interval for periodic background sync
    const CYCLIC_INTERVAL_MS = 5 * 60 * 1000;
    const interval = setInterval(() => {
      // 1. Only run if Google Drive is authenticated & connected
      if (!googleDriveService.isConnected()) return;

      // 2. Avoid collision if a sync is already running
      if (isSyncingDrive) return;

      // 3. Strict Network Eligibility Check
      const permission = networkService.canSync(userSettings.offline_sync_wifi_only);
      if (!permission.allowed) {
        if (permission.reason === 'wifi_only_on_cellular' || permission.reason === 'wifi_only_unverified') {
          setSyncState('waiting_for_wifi');
        } else if (permission.reason === 'offline') {
          setSyncState('offline');
        }
        return;
      }

      // 4. Eligible: Execute silent background cyclic sync
      handleSyncDrive({ silent: true, isCyclic: true }).catch(err => {
        console.warn('[CyclicSync] Periodic sync notice:', err);
      });
    }, CYCLIC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [userSettings.offline_sync_wifi_only, isSyncingDrive, isDriveConnected]);

  // Foreground Resume Synchronization Engine
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && googleDriveService.isConnected() && !isSyncingDrive) {
        const permission = networkService.canSync(userSettings.offline_sync_wifi_only);
        if (permission.allowed) {
          handleSyncDrive({ silent: true, isForegroundResume: true }).catch(() => {});
        } else if (permission.reason === 'wifi_only_on_cellular' || permission.reason === 'wifi_only_unverified') {
          setSyncState('waiting_for_wifi');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userSettings.offline_sync_wifi_only, isSyncingDrive]);

  // Subscribe to Bridge events
  useEffect(() => {
    const unsubscribe = bridge.subscribe((eventName, data) => {
      if (eventName === 'playbackPositionUpdated') {
        const rawPos = data.positionSeconds;
        const rawDur = data.durationSeconds;

        const pos = (typeof rawPos === 'number' && Number.isFinite(rawPos) && rawPos >= 0) ? rawPos : 0;

        let dur = playbackState.durationSeconds;
        if (typeof rawDur === 'number' && Number.isFinite(rawDur) && rawDur > 0) {
          dur = rawDur;
        } else if (!dur || !Number.isFinite(dur) || dur <= 0) {
          dur = (playbackState.currentAudio?.duration_seconds && Number.isFinite(playbackState.currentAudio.duration_seconds) && playbackState.currentAudio.duration_seconds > 0)
            ? playbackState.currentAudio.duration_seconds
            : 60;
        }

        setPlaybackState(prev => {
          // Check A-B loop
          if (prev.abLoop?.enabled && pos >= prev.abLoop.endSeconds) {
            bridge.seek(prev.abLoop.startSeconds);
            return { ...prev, positionSeconds: prev.abLoop.startSeconds, durationSeconds: dur };
          }

          return { ...prev, positionSeconds: pos, durationSeconds: dur };
        });

        // Accumulate active listening seconds
        currentSessionListeningSeconds.current += 0.25;

        // Anti-Cheat Verified Play Coverage Tracking
        const activeAudio = playbackState.currentAudio;
        if (activeAudio) {
          verifiedPlayTracker.trackProgress(activeAudio.id, pos, dur);

          // If playback is within 0.5s of the natural end, attempt verified completion
          if (pos >= (dur - 0.5) && !completedPlayRecordedForSession.current) {
            const isCompleted = verifiedPlayTracker.recordCompletion(
              activeAudio.id,
              pos,
              dur,
              false
            );
            if (isCompleted) {
              completedPlayRecordedForSession.current = true;
              handleVerifiedPlayCompleted(activeAudio);
            }
          }
        }
      } else if (eventName === 'playbackStateChanged') {
        setPlaybackState(prev => ({
          ...prev,
          isPlaying: !!data.isPlaying
        }));

        if (data.isEnded) {
          handleTrackEnded();
        }
      }
    });

    return () => unsubscribe();
  }, [playbackState.currentAudio, playbackState.durationSeconds, playbackState.playbackSpeed, audioItems]);

  // Strict End-of-Track / End-of-Queue Transition Rules Engine
  const handleTrackEnded = () => {
    const state = playbackStateRef.current;
    const queue = playbackQueueRef.current;
    const qIndex = currentQueueIndexRef.current;
    const repMode = repeatModeRef.current;

    // 1. Transparent SM-2 & Anti-Cheat Verified Full Play Completion
    if (state.currentAudio && state.durationSeconds > 0 && !completedPlayRecordedForSession.current) {
      const isCompleted = verifiedPlayTracker.recordCompletion(
        state.currentAudio.id,
        state.positionSeconds,
        state.durationSeconds,
        true // isEnded = true
      );
      if (isCompleted) {
        completedPlayRecordedForSession.current = true;
        handleVerifiedPlayCompleted(state.currentAudio);
      }
    }

    // 2. Strict Transition Rules
    // Rule A: If A-B Loop is active: seek back to Point A and keep looping
    if (state.abLoop?.enabled) {
      bridge.seek(state.abLoop.startSeconds);
      if (state.currentAudio) {
        bridge.play(state.currentAudio, state.playbackSpeed);
      }
      setPlaybackState(prev => ({ ...prev, isPlaying: true, positionSeconds: state.abLoop!.startSeconds }));
      return;
    }

    // Rule B: Else if repeatMode === 'one': restart the current track from 0:00
    if (repMode === 'one' && state.currentAudio) {
      currentSessionListeningSeconds.current = 0;
      completedPlayRecordedForSession.current = false;
      verifiedPlayTracker.resetForNewPass();
      bridge.seek(0);
      bridge.play(state.currentAudio, state.playbackSpeed);
      setPlaybackState(prev => ({ ...prev, isPlaying: true, positionSeconds: 0 }));
      return;
    }

    // Rule C: Else if currentQueueIndex < playbackQueue.length - 1: advance by 1
    if (queue.length > 0 && qIndex < queue.length - 1) {
      const nextIndex = qIndex + 1;
      handlePlayQueue(queue, nextIndex, false);
      return;
    }

    // Rule D: Else if repeatMode === 'all': wrap to currentQueueIndex = 0 and replay queue
    if (repMode === 'all' && queue.length > 0) {
      handlePlayQueue(queue, 0, false);
      return;
    }

    // Rule E: Else (repeatMode === 'off' and final track in queue finished):
    // Stop playback completely! Never auto-advance into unselected folder tracks outside queue.
    bridge.pause();
    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false,
      positionSeconds: prev.durationSeconds
    }));
  };

  // Sleep Timer countdown
  useEffect(() => {
    let interval: any = null;
    if (playbackState.sleepTimerRemainingSeconds && playbackState.sleepTimerRemainingSeconds > 0) {
      interval = setInterval(() => {
        setPlaybackState(prev => {
          if (!prev.sleepTimerRemainingSeconds || prev.sleepTimerRemainingSeconds <= 1) {
            bridge.pause();
            return { ...prev, isPlaying: false, sleepTimerRemainingSeconds: null };
          }
          return { ...prev, sleepTimerRemainingSeconds: prev.sleepTimerRemainingSeconds - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [playbackState.sleepTimerRemainingSeconds]);

  // Unified Playback Queue Engine Handlers
  const handlePlayQueue = (
    queue: AudioItem[],
    startIndex: number = 0,
    openFullScreen: boolean = true
  ) => {
    if (queue.length === 0) return;
    const safeIndex = Math.max(0, Math.min(queue.length - 1, startIndex));
    const audio = queue[safeIndex];

    setPlaybackQueue(queue);
    setCurrentQueueIndex(safeIndex);

    currentSessionListeningSeconds.current = 0;
    completedPlayRecordedForSession.current = false;

    const safeDuration = (audio.duration_seconds && Number.isFinite(audio.duration_seconds) && audio.duration_seconds > 0)
      ? audio.duration_seconds
      : 60;

    // Arm anti-cheat verified play tracker for this track
    verifiedPlayTracker.setActiveTrack(audio.id, safeDuration);

    setPlaybackState(prev => ({
      ...prev,
      currentAudio: audio,
      isPlaying: true,
      positionSeconds: 0,
      durationSeconds: safeDuration
    }));

    // Update last_listened_at only (play_count is strictly earned via complete verified listen)
    setAudioItems(prev =>
      prev.map(item =>
        item.id === audio.id
          ? {
              ...item,
              last_listened_at: new Date().toISOString()
            }
          : item
      )
    );

    bridge.play(audio, playbackState.playbackSpeed);
    if (openFullScreen) {
      setIsFullScreenPlayerOpen(true);
    }
  };

  // Audio Playback Handler (Single tap track row -> sets 1-track queue, plays, and opens FullScreenPlayer)
  const handlePlayAudio = (
    audio: AudioItem,
    queue?: AudioItem[],
    startIndex?: number,
    openFullScreen: boolean = true
  ) => {
    // If tapping the currently playing audio without specifying a new queue, toggle play/pause
    if (!queue && playbackState.currentAudio?.id === audio.id) {
      handleTogglePlay();
      if (openFullScreen) {
        setIsFullScreenPlayerOpen(true);
      }
      return;
    }

    const effectiveQueue = queue && queue.length > 0 ? queue : [audio];
    const effectiveIndex = startIndex !== undefined && startIndex >= 0
      ? startIndex
      : effectiveQueue.findIndex(a => a.id === audio.id);

    handlePlayQueue(effectiveQueue, effectiveIndex >= 0 ? effectiveIndex : 0, openFullScreen);
  };

  const handleTogglePlay = () => {
    if (playbackState.isPlaying) {
      bridge.pause();
      setPlaybackState(prev => ({ ...prev, isPlaying: false }));
    } else if (playbackState.currentAudio) {
      bridge.resume();
      setPlaybackState(prev => ({ ...prev, isPlaying: true }));
    }
  };

  const handleDismissPlayer = () => {
    bridge.pause();
    setPlaybackQueue([]);
    setCurrentQueueIndex(0);
    setPlaybackState(prev => ({
      ...prev,
      currentAudio: null,
      isPlaying: false,
      positionSeconds: 0
    }));
  };

  const handleSeek = (seconds: number) => {
    bridge.seek(seconds);
    verifiedPlayTracker.handleSeek(seconds);
    setPlaybackState(prev => ({ ...prev, positionSeconds: seconds }));
  };

  const handleSeekRelative = (deltaSeconds: number) => {
    const target = Math.max(0, Math.min(playbackState.durationSeconds, playbackState.positionSeconds + deltaSeconds));
    handleSeek(target);
  };

  const handleSetSpeed = (speed: number) => {
    bridge.setSpeed(speed);
    setPlaybackState(prev => ({ ...prev, playbackSpeed: speed }));
  };

  const handleToggleRepeat = () => {
    setRepeatMode(prevMode => {
      const nextMode: 'off' | 'one' | 'all' =
        prevMode === 'off' ? 'one' : prevMode === 'one' ? 'all' : 'off';

      setPlaybackState(prev => ({
        ...prev,
        repeatMode: nextMode,
        isRepeatTrack: nextMode === 'one',
        isRepeatQueue: nextMode === 'all'
      }));

      toastService.library(
        nextMode === 'one' ? 'Repeat Track Active' : nextMode === 'all' ? 'Repeat Queue Active' : 'Repeat Off',
        undefined,
        undefined,
        1800
      );
      return nextMode;
    });
  };

  const handleToggleABLoop = (start?: number, end?: number) => {
    if (start === undefined || end === undefined) {
      setPlaybackState(prev => ({ ...prev, abLoop: null }));
    } else {
      setPlaybackState(prev => ({
        ...prev,
        abLoop: {
          enabled: true,
          startSeconds: Math.min(start, end),
          endSeconds: Math.max(start, end)
        }
      }));
    }
  };

  const handleSetSleepTimer = (minutes: number | null) => {
    setPlaybackState(prev => ({
      ...prev,
      sleepTimerRemainingSeconds: minutes ? minutes * 60 : null
    }));
  };

  const handleToggleFavorite = (audioId: string) => {
    setAudioItems(prev => {
      const target = prev.find(item => item.id === audioId);
      const isFav = !target?.is_favorite;
      toastService.library(
        isFav ? 'Added to Favorites' : 'Removed from Favorites',
        target?.title,
        undefined,
        2000
      );
      return prev.map(item => (item.id === audioId ? { ...item, is_favorite: isFav } : item));
    });
    if (playbackState.currentAudio?.id === audioId) {
      setPlaybackState(prev => ({
        ...prev,
        currentAudio: prev.currentAudio ? { ...prev.currentAudio, is_favorite: !prev.currentAudio.is_favorite } : null
      }));
    }
  };

  const handleToggleOffline = (audio: AudioItem) => {
    const nextState = !audio.is_downloaded_offline;
    if (nextState) {
      bridge.downloadForOffline(audio);
      if (audio.google_drive_file_id && googleDriveService.isConnected()) {
        handleDownloadItemFromDrive(audio);
      }
    } else {
      bridge.removeOfflineDownload(audio.id);
      audioStorage.deleteAudioBlob(audio.id).catch(() => {});
      toastService.downloads('Removed from Offline Storage', audio.title);
    }
    setAudioItems(prev =>
      prev.map(item => (item.id === audio.id ? { ...item, is_downloaded_offline: nextState } : item))
    );
    setStorageInfo(bridge.getStorageInfo());
    bridge.getStorageInfoAsync().then(info => setStorageInfo(info)).catch(() => {});
  };

  const handleDeleteAllDownloads = async () => {
    try {
      await audioStorage.clearAllAudioBlobs();
      for (const item of audioItems) {
        if (item.is_downloaded_offline) {
          bridge.removeOfflineDownload(item.id);
        }
      }
      setAudioItems(prev =>
        prev.map(item => ({ ...item, is_downloaded_offline: false }))
      );
      const freshInfo = await bridge.getStorageInfoAsync();
      setStorageInfo(freshInfo);
      bridge.triggerHaptic('medium');
    } catch (err) {
      console.error('Failed to clear downloaded files:', err);
    }
  };

  const handleClearCache = async (emptySlate: boolean = true) => {
    try {
      if (emptySlate) {
        // 1. Immediately halt audio playback and reset player state
        bridge.stopAudio();
        setPlaybackQueue([]);
        setCurrentQueueIndex(0);
        setRepeatMode('off');
        setPlaybackState({
          currentAudio: null,
          isPlaying: false,
          positionSeconds: 0,
          durationSeconds: 0,
          playbackSpeed: 1.0,
          isRepeatTrack: false,
          isRepeatQueue: false,
          repeatMode: 'off',
          abLoop: null,
          sleepTimerRemainingSeconds: null,
          learningModeActive: false
        });
        setIsFullScreenPlayerOpen(false);

        // 2. Comprehensive local cache, IndexedDB blobs, files, and webview purge
        await bridge.purgeAllLocalData();

        // 3. Clear local storage items for both guest and connected accounts
        if (typeof window !== 'undefined') {
          localStorage.removeItem('smriti_audio_items');
          localStorage.removeItem('smriti_guest_audio_items');
          localStorage.removeItem('smriti_revisions');
          localStorage.removeItem('smriti_guest_revisions');
          localStorage.removeItem('smriti_daily_stats');
          localStorage.removeItem('smriti_guest_daily_stats');
          localStorage.removeItem('smriti_drive_transfers');
          // Clear verified learning and play count keys
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('smriti_play_count_') || k.startsWith('smriti_verified_'))) {
              localStorage.removeItem(k);
            }
          }
        }

        // 4. Reset React state to empty slate
        setAudioItems([]);
        setDailyStats([]);
        const cleanSubjects = DEFAULT_SUBJECTS.map(s => ({ ...s, item_count: 0 }));
        setSubjects(cleanSubjects);
        persistSubjects(cleanSubjects, isGuestMode);

        // 5. Update storage info to actual 0 values
        const freshInfo = await bridge.getStorageInfoAsync();
        setStorageInfo(freshInfo);

        bridge.triggerHaptic('heavy');
        toastService.success(
          'App Reset to Empty Slate',
          'All audio cache, offline downloads, and local data cleared safely.'
        );
      } else {
        // Clear streaming cache only (preserves offline downloads)
        await bridge.clearTemporaryCache();
        const freshInfo = await bridge.getStorageInfoAsync();
        setStorageInfo(freshInfo);
        bridge.triggerHaptic('medium');
        toastService.downloads(
          'Streaming Cache Cleared',
          'Temporary streaming cache removed. Pinned offline downloads preserved!'
        );
      }
    } catch (err) {
      console.error('Error during cache clear:', err);
      toastService.danger('Cache Clear Error', 'Failed to clear local cache.');
    }
  };

  const handleCycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const curIdx = speeds.indexOf(playbackState.playbackSpeed);
    const nextSpeed = speeds[(curIdx + 1) % speeds.length];
    handleSetSpeed(nextSpeed);
    toastService.library(`Playback Speed: ${nextSpeed}x`, undefined, undefined, 1800);
  };

  const handleNextTrack = () => {
    const queue = playbackQueueRef.current;
    const qIndex = currentQueueIndexRef.current;
    const repMode = repeatModeRef.current;

    if (!playbackState.currentAudio || queue.length === 0) return;

    if (qIndex < queue.length - 1) {
      handlePlayQueue(queue, qIndex + 1, false);
    } else if (repMode === 'all') {
      handlePlayQueue(queue, 0, false);
    } else if (repMode === 'one') {
      handleSeek(0);
      bridge.play(playbackState.currentAudio, playbackState.playbackSpeed);
    } else {
      // Reached end of queue with repeat off: pause and hold at end
      bridge.pause();
      setPlaybackState(prev => ({ ...prev, isPlaying: false, positionSeconds: prev.durationSeconds }));
    }
  };

  const handlePreviousTrack = () => {
    const queue = playbackQueueRef.current;
    const qIndex = currentQueueIndexRef.current;
    const repMode = repeatModeRef.current;

    if (!playbackState.currentAudio || queue.length === 0) return;

    if (playbackState.positionSeconds > 3) {
      handleSeek(0);
      return;
    }

    if (qIndex > 0) {
      handlePlayQueue(queue, qIndex - 1, false);
    } else if (repMode === 'all') {
      handlePlayQueue(queue, queue.length - 1, false);
    } else {
      handleSeek(0);
    }
  };

  // Check Google Drive connection status on mount and load cloud data if connected
  useEffect(() => {
    if (googleDriveService.isConnected()) {
      setIsDriveConnected(true);
      googleDriveService.fetchUserProfile().catch(() => {});
      googleDriveService.ensureFreshAccessToken().then(() => {
        setIsSyncingDrive(true);
        return googleDriveService.fetchDriveData();
      }).then(data => {
        if (data && data.audioItems) {
          setAudioItems(data.audioItems.map(item => playCountService.mergeAudioItem(item)));
        }
        if (data && data.subjects && data.subjects.length > 0) {
          setSubjects(data.subjects);
        }
      }).catch(err => {
        console.warn('Initial Drive data fetch warning:', err);
      }).finally(() => {
        setIsSyncingDrive(false);
      });
    }
  }, []);

  // Save new recording or uploaded audio with real-time progress reporting
  const handleSaveAudio = async (
    partialItem: Partial<AudioItem>,
    fileBlob?: Blob,
    options?: { syncToDrive?: boolean },
    onProgress?: (progress: UploadProgressState) => void
  ): Promise<AudioItem> => {
    const newId = `aud-${Date.now()}`;
    const totalBytes = fileBlob ? fileBlob.size : (partialItem.file_size_bytes || 2000000);
    const isImported = partialItem.source_type === 'imported';
    const newItem: AudioItem = {
      id: newId,
      title: partialItem.title || 'Untitled Lecture Note',
      subject_id: partialItem.subject_id,
      subject_name: partialItem.subject_name || 'General',
      duration_seconds: partialItem.duration_seconds || 60,
      source_type: partialItem.source_type || 'recorded',
      file_format: partialItem.file_format || 'm4a',
      file_size_bytes: totalBytes,
      audio_enhancement_applied: !!partialItem.audio_enhancement_applied,
      waveform_peaks: partialItem.waveform_peaks || [20, 40, 60, 80, 50],
      key_terms: partialItem.key_terms || [],
      is_favorite: false,
      is_downloaded_offline: partialItem.is_downloaded_offline !== undefined ? partialItem.is_downloaded_offline : isImported,
      created_at: new Date().toISOString()
    };

    // 1. Save blob to IndexedDB for 100% offline local playback
    if (fileBlob) {
      onProgress?.({
        stage: 'local_save',
        percent: 15,
        loadedBytes: Math.round(totalBytes * 0.15),
        totalBytes,
        message: 'Saving offline audio copy to device...'
      });

      try {
        await audioStorage.saveAudioBlob(newId, fileBlob, { isPinned: true });
        newItem.file_url = URL.createObjectURL(fileBlob);
        onProgress?.({
          stage: 'local_save',
          percent: 25,
          loadedBytes: Math.round(totalBytes * 0.25),
          totalBytes,
          message: 'Saved to local device storage'
        });
      } catch (e) {
        console.warn('Failed saving blob to IndexedDB', e);
      }
    }

    // 2. If Google Drive connected and sync enabled, check Wi-Fi only restriction
    const shouldSyncDrive =
      options?.syncToDrive !== false &&
      (googleDriveService.isConnected() || options?.syncToDrive === true);

    const syncPermission = networkService.canSync(userSettings.offline_sync_wifi_only);

    if (shouldSyncDrive && fileBlob && !syncPermission.allowed) {
      // Saved offline; Drive sync deferred to avoid consuming cellular data
      onProgress?.({
        stage: 'done',
        percent: 100,
        loadedBytes: totalBytes,
        totalBytes,
        message: 'Saved offline on device. Drive sync will resume on Wi-Fi.'
      });

      if (syncPermission.reason === 'wifi_only_on_cellular') {
        showSyncToast({
          type: 'wifi_only_paused',
          title: 'Saved to Device Offline',
          message: `Note "${newItem.title}" saved offline. Drive upload paused on mobile data per your Wi-Fi Only setting.`,
          actionLabel: 'Upload Anyway',
          onAction: () => {
            handleSyncItemToDrive(newItem, true);
          },
          durationMs: 7000
        });
      }
    } else if (shouldSyncDrive && fileBlob) {
      try {
        onProgress?.({
          stage: 'uploading',
          percent: 28,
          loadedBytes: Math.round(totalBytes * 0.28),
          totalBytes,
          message: 'Connecting to Google Drive...'
        });

        const uploaded = await googleDriveService.uploadAudio(
          fileBlob,
          `${newItem.title}.${newItem.file_format || 'm4a'}`,
          newItem.subject_name || 'General',
          (drivePercent, loadedBytes, fileTotal) => {
            // Map 0-100% drive upload into 30%-98% range for overall, or report actual drive percentage
            const effectivePercent = Math.min(
              99,
              Math.max(30, Math.round(30 + drivePercent * 0.68))
            );
            onProgress?.({
              stage: 'uploading',
              percent: effectivePercent,
              loadedBytes,
              totalBytes: fileTotal,
              message:
                drivePercent < 95
                  ? `Uploading to Google Drive (${drivePercent}%)...`
                  : 'Finalizing file on Google Drive...'
            });
          }
        );

        newItem.google_drive_file_id = uploaded.id;
        if (uploaded.webContentLink) {
          newItem.file_url = uploaded.webContentLink;
        }

        onProgress?.({
          stage: 'done',
          percent: 100,
          loadedBytes: totalBytes,
          totalBytes,
          driveFileId: uploaded.id,
          message: 'Successfully backed up to Google Drive!'
        });
      } catch (err: any) {
        console.warn('Google Drive direct upload failed, kept in local offline storage:', err);
        onProgress?.({
          stage: 'error',
          percent: 100,
          loadedBytes: totalBytes,
          totalBytes,
          message: 'Drive sync interrupted. Note safely stored on device.',
          error: err.message || 'Upload failed'
        });
      }
    } else {
      onProgress?.({
        stage: 'done',
        percent: 100,
        loadedBytes: totalBytes,
        totalBytes,
        message: 'Audio note saved offline successfully!'
      });
    }

    setAudioItems(prev => {
      const next = [newItem, ...prev];
      if (googleDriveService.isConnected()) {
        googleDriveService.saveCatalog({ subjects, audioItems: next });
      }
      return next;
    });

    return newItem;
  };

  // Google Drive connection trigger: Authorizes account, fetches account cloud data, and displays it
  const handleConnectDrive = async () => {
    try {
      setIsSyncingDrive(true);
      await googleDriveService.authorize();
      setIsDriveConnected(true);
      setIsGuestMode(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('smriti_guest_mode');
      }

      // Fetch cloud catalog and recordings for this specific connected account
      const driveData = await googleDriveService.fetchDriveData();
      if (driveData) {
        const nextAudios = (driveData.audioItems || []).map(item => playCountService.mergeAudioItem(item));
        const nextSubs = driveData.subjects && driveData.subjects.length > 0 ? driveData.subjects : DEFAULT_SUBJECTS;
        setAudioItems(nextAudios);
        setSubjects(nextSubs);
        persistSubjects(nextSubs, false);
        persistAudioItems(nextAudios, false);
      }

      const info = await bridge.getStorageInfoAsync();
      setStorageInfo(info);
    } catch (err: any) {
      console.error('Google Drive sign-in error:', err);
      alert(`Google Drive Sign-In: ${err.message || 'Could not complete authorization'}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Direct token connection trigger (useful for manual token or restricted WebViews)
  const handleConnectWithToken = async (token: string) => {
    try {
      setIsSyncingDrive(true);
      await googleDriveService.connectWithToken(token);
      setIsDriveConnected(true);
      setIsGuestMode(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('smriti_guest_mode');
      }

      const driveData = await googleDriveService.fetchDriveData();
      if (driveData) {
        const nextAudios = (driveData.audioItems || []).map(item => playCountService.mergeAudioItem(item));
        const nextSubs = driveData.subjects && driveData.subjects.length > 0 ? driveData.subjects : DEFAULT_SUBJECTS;
        setAudioItems(nextAudios);
        setSubjects(nextSubs);
        persistSubjects(nextSubs, false);
        persistAudioItems(nextAudios, false);
      }

      const info = await bridge.getStorageInfoAsync();
      setStorageInfo(info);
    } catch (err: any) {
      console.error('Google Drive token connection error:', err);
      alert(`Google Drive Error: ${err.message || 'Could not connect with token'}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Re-sync cloud data from Google Drive
  const handleSyncDrive = async (options?: {
    silent?: boolean;
    forceSync?: boolean;
    isCyclic?: boolean;
    isForegroundResume?: boolean;
  }) => {
    if (!googleDriveService.isConnected()) {
      await handleConnectDrive();
      return;
    }

    // Check Wi-Fi Only restriction
    if (!options?.forceSync) {
      const permission = networkService.canSync(userSettings.offline_sync_wifi_only);
      if (!permission.allowed) {
        if (permission.reason === 'wifi_only_on_cellular' || permission.reason === 'wifi_only_unverified') {
          setSyncState('waiting_for_wifi');
          if (!options?.silent && !options?.isCyclic && !options?.isForegroundResume) {
            showSyncToast({
              type: 'wifi_only_paused',
              title: 'Sync Paused on Mobile Data',
              message: 'Wi-Fi Only Sync is active. Sync paused to avoid cellular data usage.',
              actionLabel: 'Sync Anyway',
              onAction: () => {
                handleSyncDrive({ forceSync: true });
              },
              durationMs: 7000
            });
          }
          return;
        } else if (permission.reason === 'offline') {
          setSyncState('offline');
          if (!options?.silent && !options?.isCyclic && !options?.isForegroundResume) {
            showSyncToast({
              type: 'offline',
              title: 'Offline Mode',
              message: 'No internet connection detected. Library is safely preserved on device.',
              durationMs: 4000
            });
          }
          return;
        }
      }
    }

    try {
      setIsSyncingDrive(true);
      setSyncState('syncing');
      const driveData = await googleDriveService.fetchDriveData();
      if (driveData) {
        const nextAudios = (driveData.audioItems || []).map(item => playCountService.mergeAudioItem(item));
        const nextSubs = driveData.subjects && driveData.subjects.length > 0 ? driveData.subjects : DEFAULT_SUBJECTS;
        setAudioItems(nextAudios);
        setSubjects(nextSubs);
        persistSubjects(nextSubs, false);
        persistAudioItems(nextAudios, false);
        setSyncState('idle');
        if (!options?.silent) {
          showSyncToast({
            type: 'synced',
            title: 'Library Synchronized',
            message: 'Google Drive folders and notes are up to date.',
            durationMs: 3000
          });
        }
      }
      const info = await bridge.getStorageInfoAsync();
      setStorageInfo(info);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('cellular') || err?.message?.includes('cancelled')) {
        console.log('[Sync] Sync safely paused / cancelled on network switch');
        setSyncState('waiting_for_wifi');
      } else {
        console.error('Error syncing with Google Drive:', err);
        setSyncState('error');
      }
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Listen to networkService automatic and UI sync policy changes
  useEffect(() => {
    const unsubSettings = networkService.registerSettingsUpdater(({ offline_sync_wifi_only }) => {
      setUserSettings((prev) => {
        if (prev.offline_sync_wifi_only === offline_sync_wifi_only) return prev;
        const next = { ...prev, offline_sync_wifi_only };
        localStorage.setItem('smriti_settings', JSON.stringify(next));
        return next;
      });
    });

    const unsubSyncTrigger = networkService.registerSyncTrigger(() => {
      if (googleDriveService.isConnected()) {
        handleSyncDrive({ silent: true }).catch(() => {});
      }
    });

    return () => {
      unsubSettings();
      unsubSyncTrigger();
    };
  }, [handleSyncDrive]);

  const computedSyncState: 'idle' | 'syncing' | 'waiting_for_wifi' | 'offline' | 'error' | 'disconnected' = useMemo(() => {
    if (!isDriveConnected) return 'disconnected';
    if (isSyncingDrive) return 'syncing';
    if (!networkService.isOnline()) return 'offline';
    if (userSettings.offline_sync_wifi_only && (networkService.isCellular() || !networkService.isWifi())) {
      return 'waiting_for_wifi';
    }
    return syncState;
  }, [isDriveConnected, isSyncingDrive, userSettings.offline_sync_wifi_only, syncState]);

  const handleUpdateSettings = useCallback(
    (updates: Partial<UserSettings>) => {
      setUserSettings((prev) => {
        const next = { ...prev, ...updates };
        localStorage.setItem('smriti_settings', JSON.stringify(next));
        return next;
      });

      // Side effects when offline_sync_wifi_only changes
      if (updates.offline_sync_wifi_only !== undefined) {
        const wifiOnly = updates.offline_sync_wifi_only;
        networkService.offline_sync_wifi_only = wifiOnly;

        if (wifiOnly) {
          // Switched to Wi-Fi Only:
          // Immediately halt in-flight network activity if on cellular / mobile data
          if (networkService.isCellular() || !networkService.isWifi()) {
            googleDriveService.cancelActiveTransfers(
              'Paused: Device switched to Wi-Fi Only mode on mobile data'
            );
            setIsSyncingDrive(false);
            setSyncState('waiting_for_wifi');
            showSyncToast({
              type: 'wifi_only_paused',
              title: 'Wi-Fi Only Sync Active',
              message:
                'Switched to Wi-Fi Only. Google Drive sync is paused on mobile data to preserve your cellular allowance.',
              durationMs: 4000,
            });
          }
        } else {
          // Switched to Mobile Data:
          // Immediately notify networkService and trigger a sync check so any queued uploads/downloads begin right away over cellular data
          if (googleDriveService.isConnected()) {
            setSyncState('idle');
            showSyncToast({
              type: 'info',
              title: 'Mobile Data Sync Enabled',
              message: 'Google Drive sync is now allowed over mobile data.',
              durationMs: 3000,
            });
            handleSyncDrive({ silent: true }).catch(() => {});
          }
        }
      }
    },
    [handleSyncDrive]
  );

  // Google Drive disconnect trigger: Stops playback, safely purges all local cache/audio files across Android and Web, clears UI to protect privacy
  const handleDisconnectDrive = async () => {
    try {
      // 1. Immediately halt playback and reset player
      bridge.stopAudio();
      setPlaybackQueue([]);
      setCurrentQueueIndex(0);
      setRepeatMode('off');
      setPlaybackState({
        currentAudio: null,
        isPlaying: false,
        positionSeconds: 0,
        durationSeconds: 0,
        playbackSpeed: 1.0,
        isRepeatTrack: false,
        isRepeatQueue: false,
        repeatMode: 'off',
        abLoop: null,
        sleepTimerRemainingSeconds: null,
        learningModeActive: false
      });
      setIsFullScreenPlayerOpen(false);

      // 2. Comprehensive local data purge across Android and Web apps
      await bridge.purgeAllLocalData();

      // 3. Clear Google Drive credentials and tokens
      googleDriveService.disconnect();

      // 4. Safely clear local account cache
      localStorage.removeItem('smriti_audio_items');
      localStorage.removeItem('smriti_subjects');
      localStorage.removeItem('smriti_revisions');
      localStorage.removeItem('smriti_drive_transfers');

      // 5. Zero data displayed - 100% privacy protection with clean neutral default
      setAudioItems([]);
      setSubjects([
        { id: 'general', name: 'General', icon_name: 'BookOpen', color_hex: '#38bdf8', description: 'General study & lecture notes', sort_order: 1 }
      ]);
      setIsDriveConnected(false);
      setIsGuestMode(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('smriti_guest_mode');
      }

      const info = await bridge.getStorageInfoAsync();
      setStorageInfo(info);
    } catch (e) {
      console.error('Error during Google Drive disconnect and data purge', e);
    }
  };

  const handleSyncItemToDrive = async (audio: AudioItem, forceSync = false) => {
    try {
      if (!googleDriveService.isConnected()) {
        await handleConnectDrive();
        return;
      }

      if (!forceSync) {
        const permission = networkService.canSync(userSettings.offline_sync_wifi_only);
        if (!permission.allowed) {
          if (permission.reason === 'wifi_only_on_cellular') {
            showSyncToast({
              type: 'wifi_only_paused',
              title: 'Upload Paused on Mobile Data',
              message: `Wi-Fi Only Sync active: Uploading "${audio.title}" is paused to save mobile data.`,
              actionLabel: 'Upload Anyway',
              onAction: () => handleSyncItemToDrive(audio, true),
              durationMs: 7000
            });
            return;
          } else if (permission.reason === 'offline') {
            showSyncToast({
              type: 'offline',
              title: 'Offline Mode',
              message: 'Connect to internet to back up this note to Google Drive.'
            });
            return;
          }
        }
      }

      const blob = await audioStorage.getAudioBlob(audio.id);
      if (blob && googleDriveService.isConnected()) {
        const uploaded = await googleDriveService.uploadAudio(
          blob,
          `${audio.title}.m4a`,
          audio.subject_name || 'General'
        );
        setAudioItems(prev =>
          prev.map(item =>
            item.id === audio.id
              ? { ...item, google_drive_file_id: uploaded.id, file_url: uploaded.webContentLink || item.file_url }
              : item
          )
        );
        showSyncToast({
          type: 'synced',
          title: 'Backed Up to Drive',
          message: `"${audio.title}" safely backed up to Google Drive.`,
          durationMs: 3000
        });
      }
    } catch (e) {
      console.warn('Sync to drive error:', e);
    }
  };

  const handleDownloadItemFromDrive = async (audio: AudioItem, forceDownload = false) => {
    try {
      if (!googleDriveService.isConnected()) {
        await handleConnectDrive();
        return;
      }

      if (!forceDownload) {
        const permission = networkService.canSync(userSettings.offline_sync_wifi_only);
        if (!permission.allowed && permission.reason === 'wifi_only_on_cellular') {
          showSyncToast({
            type: 'wifi_only_paused',
            title: 'Download Paused on Mobile Data',
            message: `Wi-Fi Only Sync active: Downloading "${audio.title}" is paused on mobile data.`,
            actionLabel: 'Download Anyway',
            onAction: () => handleDownloadItemFromDrive(audio, true),
            durationMs: 7000
          });
          return;
        }
      }

      if (audio.google_drive_file_id && googleDriveService.isConnected()) {
        const blob = await googleDriveService.downloadAudio(audio.google_drive_file_id, audio.title);
        if (blob) {
          await audioStorage.enforceLRUEviction(userSettings.cache_limit_mb || 500, blob.size);
          await audioStorage.saveAudioBlob(audio.id, blob, { isPinned: true });
          setAudioItems(prev =>
            prev.map(item => (item.id === audio.id ? { ...item, is_downloaded_offline: true } : item))
          );
          showSyncToast({
            type: 'synced',
            title: 'Downloaded for Offline',
            message: `"${audio.title}" is ready for 100% offline playback.`,
            durationMs: 3000
          });
        }
      }
    } catch (e) {
      console.warn('Download from drive error:', e);
    }
  };

  // Navigation helper for targeted subject opening and unconditional root return
  const [selectedSubjectForLibrary, setSelectedSubjectForLibrary] = useState<string | null>(null);
  const [forceResetLibraryRootKey, setForceResetLibraryRootKey] = useState<number>(0);

  const handleSelectTab = useCallback((tab: TabType) => {
    if (tab === 'library' || tab === 'home') {
      setSelectedSubjectForLibrary(null);
      setForceResetLibraryRootKey(k => k + 1);
      setCurrentTab('library');
    } else {
      setCurrentTab(tab);
    }
  }, []);

  const handleNavigateToLibrary = (subjectId?: string) => {
    setSelectedSubjectForLibrary(subjectId || null);
    setCurrentTab('library');
  };

  const handleCreateSubject = (newSubject: Subject) => {
    setSubjects(prev => {
      if (prev.some(s => s.id === newSubject.id || s.name.toLowerCase() === newSubject.name.toLowerCase())) return prev;
      const next = [...prev, newSubject];
      if (googleDriveService.isConnected()) {
        googleDriveService.saveCatalog({ subjects: next, audioItems });
      }
      return next;
    });

    if (googleDriveService.isConnected()) {
      googleDriveService.getOrCreateSubjectFolder(newSubject.name).catch(e => {
        console.warn('Could not create subject folder on Google Drive:', newSubject.name, e);
      });
    }
  };

  // 1. Rename Subject Folder
  const handleRenameSubject = async (subjectId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const oldSubject = subjects.find(s => s.id === subjectId || s.name.toLowerCase() === subjectId.toLowerCase());
    const oldName = oldSubject?.name || subjectId;
    const nextSubjects = subjects.map(s => {
      if (s.id === subjectId || s.name.toLowerCase() === subjectId.toLowerCase()) {
        return { ...s, name: trimmed };
      }
      return s;
    });
    const nextAudioItems = audioItems.map(a => {
      if (a.subject_id === subjectId || a.subject_name?.toLowerCase() === oldName.toLowerCase()) {
        return { ...a, subject_name: trimmed };
      }
      return a;
    });
    setSubjects(nextSubjects);
    setAudioItems(nextAudioItems);
    persistSubjects(nextSubjects, isGuestMode);
    persistAudioItems(nextAudioItems, isGuestMode);

    if (googleDriveService.isConnected()) {
      try {
        const driveFolderId = oldSubject?.google_drive_folder_id || await googleDriveService.getOrCreateSubjectFolder(oldName).catch(() => null);
        if (driveFolderId) {
          await googleDriveService.renameDriveItem(driveFolderId, trimmed);
        }
        await googleDriveService.saveCatalog({ subjects: nextSubjects, audioItems: nextAudioItems });
      } catch (e) {
        console.warn('Failed to rename subject folder on Drive:', e);
      }
    }
  };

  // 2. Duplicate / Make a Copy of Subject Folder
  const handleCopySubject = async (subjectId: string) => {
    const sourceSubject = subjects.find(s => s.id === subjectId || s.name.toLowerCase() === subjectId.toLowerCase());
    if (!sourceSubject) return;

    const newId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newName = `${sourceSubject.name} (Copy)`;
    const newSubject: Subject = {
      ...sourceSubject,
      id: newId,
      name: newName,
      sort_order: subjects.length
    };

    const subjectAudios = audioItems.filter(
      a => a.subject_id === sourceSubject.id || a.subject_name?.toLowerCase() === sourceSubject.name.toLowerCase()
    );

    const copiedAudios: AudioItem[] = subjectAudios.map(a => ({
      ...a,
      id: `audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      subject_id: newId,
      subject_name: newName,
      title: `${a.title} (Copy)`,
      created_at: new Date().toISOString()
    }));

    const nextSubjects = [...subjects, newSubject];
    const nextAudioItems = [...copiedAudios, ...audioItems];

    setSubjects(nextSubjects);
    setAudioItems(nextAudioItems);
    persistSubjects(nextSubjects, isGuestMode);
    persistAudioItems(nextAudioItems, isGuestMode);

    if (googleDriveService.isConnected()) {
      try {
        const sourceFolderId = sourceSubject.google_drive_folder_id || await googleDriveService.getOrCreateSubjectFolder(sourceSubject.name).catch(() => null);
        if (sourceFolderId) {
          await googleDriveService.copyDriveFolder(sourceFolderId, newName);
        }
        await googleDriveService.saveCatalog({ subjects: nextSubjects, audioItems: nextAudioItems });
      } catch (e) {
        console.warn('Failed to copy subject on Google Drive:', e);
      }
    }
  };

  // 3. Rename Audio Track
  const handleRenameAudio = async (audioId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const item = audioItems.find(a => a.id === audioId);
    if (!item) return;

    const nextAudioItems = audioItems.map(a => {
      if (a.id === audioId) {
        return { ...a, title: trimmed };
      }
      return a;
    });

    setAudioItems(nextAudioItems);
    persistAudioItems(nextAudioItems, isGuestMode);

    if (playbackState.currentAudio?.id === audioId) {
      setPlaybackState(prev => ({
        ...prev,
        currentAudio: prev.currentAudio ? { ...prev.currentAudio, title: trimmed } : null
      }));
    }

    if (googleDriveService.isConnected()) {
      try {
        if (item.google_drive_file_id) {
          await googleDriveService.renameDriveItem(item.google_drive_file_id, trimmed);
        }
        await googleDriveService.saveCatalog({ subjects, audioItems: nextAudioItems });
      } catch (e) {
        console.warn('Failed to rename audio on Drive:', e);
      }
    }
  };

  // 4. Duplicate / Make a Copy of Audio Track
  const handleCopyAudio = async (audioId: string) => {
    const item = audioItems.find(a => a.id === audioId);
    if (!item) return;

    const newId = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTitle = `${item.title} (Copy)`;
    const newItem: AudioItem = {
      ...item,
      id: newId,
      title: newTitle,
      created_at: new Date().toISOString()
    };

    const nextAudioItems = [newItem, ...audioItems];
    setAudioItems(nextAudioItems);
    persistAudioItems(nextAudioItems, isGuestMode);

    if (googleDriveService.isConnected()) {
      try {
        if (item.google_drive_file_id) {
          const parentFolderId = item.subject_name
            ? await googleDriveService.getOrCreateSubjectFolder(item.subject_name).catch(() => undefined)
            : undefined;
          await googleDriveService.copyDriveFile(item.google_drive_file_id, newTitle, parentFolderId);
        }
        await googleDriveService.saveCatalog({ subjects, audioItems: nextAudioItems });
      } catch (e) {
        console.warn('Failed to copy audio on Drive:', e);
      }
    }
  };

  // 5. Move Audio Track to another Subject Folder
  const handleMoveAudio = async (audioId: string, targetSubjectId: string) => {
    const item = audioItems.find(a => a.id === audioId);
    const targetSubject = subjects.find(s => s.id === targetSubjectId || s.name.toLowerCase() === targetSubjectId.toLowerCase());
    if (!item || !targetSubject) return;

    const oldSubjectName = item.subject_name;
    const nextAudioItems = audioItems.map(a => {
      if (a.id === audioId) {
        return {
          ...a,
          subject_id: targetSubject.id,
          subject_name: targetSubject.name
        };
      }
      return a;
    });

    setAudioItems(nextAudioItems);
    persistAudioItems(nextAudioItems, isGuestMode);

    if (playbackState.currentAudio?.id === audioId) {
      setPlaybackState(prev => ({
        ...prev,
        currentAudio: prev.currentAudio ? {
          ...prev.currentAudio,
          subject_id: targetSubject.id,
          subject_name: targetSubject.name
        } : null
      }));
    }

    if (googleDriveService.isConnected() && item.google_drive_file_id) {
      try {
        const oldParentId = oldSubjectName
          ? await googleDriveService.getOrCreateSubjectFolder(oldSubjectName).catch(() => undefined)
          : undefined;
        const newParentId = await googleDriveService.getOrCreateSubjectFolder(targetSubject.name).catch(() => undefined);
        if (newParentId) {
          await googleDriveService.moveDriveFile(item.google_drive_file_id, oldParentId, newParentId);
        }
        await googleDriveService.saveCatalog({ subjects, audioItems: nextAudioItems });
      } catch (e) {
        console.warn('Failed to move audio on Drive:', e);
      }
    }
  };

  const runSubjectDeletionInBackground = async (
    taskId: string,
    subjectName: string,
    deleteRecordings: boolean,
    nextSubjects: Subject[],
    nextAudioItems: AudioItem[],
    toDeleteAudio: AudioItem[]
  ) => {
    try {
      // 1. Local IndexedDB clean up if deleting recordings
      if (deleteRecordings && toDeleteAudio.length > 0) {
        updateSyncTask(taskId, {
          stageMessage: `Cleaning up ${toDeleteAudio.length} local audio note${toDeleteAudio.length > 1 ? 's' : ''}...`,
          progressPercent: 35
        });
        for (const item of toDeleteAudio) {
          audioStorage.deleteAudioBlob(item.id).catch(() => {});
          bridge.removeOfflineDownload(item.id);
        }
      }

      // 2. Google Drive two-way deletion and sync
      const syncCheck = networkService.canSync(userSettings.offline_sync_wifi_only);
      if (googleDriveService.isConnected() && !syncCheck.allowed && syncCheck.reason === 'wifi_only_on_cellular') {
        updateSyncTask(taskId, {
          stageMessage: 'Folder deleted locally. Cloud sync deferred for Wi-Fi...',
          progressPercent: 100,
          status: 'completed'
        });
        showSyncToast({
          type: 'wifi_only_paused',
          title: 'Folder Deleted Locally',
          message: `Folder "${subjectName}" deleted on device. Drive sync deferred until connected to Wi-Fi.`,
          durationMs: 5000
        });
      } else if (googleDriveService.isConnected()) {
        updateSyncTask(taskId, {
          stageMessage: 'Deleting folder from Google Drive...',
          progressPercent: deleteRecordings ? 55 : 45
        });

        let targetFolderId: string | undefined;
        if (!deleteRecordings && nextSubjects.length > 0) {
          const fallbackSubject = nextSubjects.find(s => s.name.toLowerCase() === 'general') || nextSubjects[0];
          targetFolderId = await googleDriveService.getOrCreateSubjectFolder(fallbackSubject.name);
        }

        await googleDriveService.deleteSubjectFolder(subjectName, {
          deleteFiles: deleteRecordings || nextSubjects.length === 0,
          moveToFolderId: targetFolderId
        });

        updateSyncTask(taskId, {
          stageMessage: 'Updating cloud catalog...',
          progressPercent: 78
        });

        await googleDriveService.saveCatalog({
          subjects: nextSubjects,
          audioItems: nextAudioItems
        });

        updateSyncTask(taskId, {
          stageMessage: 'Syncing Drive changes...',
          progressPercent: 92
        });

        const driveData = await googleDriveService.fetchDriveData(nextSubjects);
        if (driveData) {
          if (driveData.audioItems) {
            setAudioItems(driveData.audioItems.map(item => playCountService.mergeAudioItem(item)));
          }
          if (driveData.subjects && driveData.subjects.length > 0) {
            setSubjects(driveData.subjects);
          }
        }
      } else {
        updateSyncTask(taskId, {
          progressPercent: 100
        });
      }

      const info = await bridge.getStorageInfoAsync();
      setStorageInfo(info);

      updateSyncTask(taskId, {
        stageMessage: 'Folder deleted and Drive synchronized',
        progressPercent: 100,
        status: 'completed'
      });

      // Auto-dismiss after 3.2 seconds
      setTimeout(() => {
        dismissSyncTask(taskId);
      }, 3200);
    } catch (err: any) {
      console.error('Error during background subject deletion:', err);
      updateSyncTask(taskId, {
        stageMessage: `Drive deletion error: ${err.message || 'Check connection'}`,
        progressPercent: 100,
        status: 'error',
        errorMessage: err.message || 'Deletion failed'
      });
    }
  };

  const handleDeleteSubject = async (
    subjectId: string,
    options?: { deleteRecordings?: boolean }
  ) => {
    const targetSubject = subjects.find(
      s => s.id === subjectId || s.name.toLowerCase() === subjectId.toLowerCase()
    );
    if (!targetSubject) return;

    const subjectName = targetSubject.name;
    const deleteRecordings = !!options?.deleteRecordings;

    // 1. Immediate optimistic UI and local persistence update (instant feedback, never blocks UI)
    const nextSubjects = subjects.filter(
      s => s.id !== targetSubject.id && s.name.toLowerCase() !== subjectName.toLowerCase()
    );
    setSubjects(nextSubjects);

    let nextAudioItems: AudioItem[] = [];
    const toDeleteAudio = audioItems.filter(
      a => a.subject_id === targetSubject.id || a.subject_name?.toLowerCase() === subjectName.toLowerCase()
    );

    if (deleteRecordings || nextSubjects.length === 0) {
      nextAudioItems = audioItems.filter(
        a => a.subject_id !== targetSubject.id && a.subject_name?.toLowerCase() !== subjectName.toLowerCase()
      );
      setAudioItems(nextAudioItems);
    } else {
      const fallbackSubject = nextSubjects.find(s => s.name.toLowerCase() === 'general') || nextSubjects[0];
      nextAudioItems = audioItems.map(a => {
        if (a.subject_id === targetSubject.id || a.subject_name?.toLowerCase() === subjectName.toLowerCase()) {
          return {
            ...a,
            subject_id: fallbackSubject.id,
            subject_name: fallbackSubject.name
          };
        }
        return a;
      });
      setAudioItems(nextAudioItems);
    }

    persistSubjects(nextSubjects, isGuestMode);
    persistAudioItems(nextAudioItems, isGuestMode);

    // 2. Register non-blocking active sync task with progress bar
    const taskId = `task-del-subj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const initialTask: ActiveSyncTask = {
      id: taskId,
      type: 'delete_folder',
      title: `Deleting "${subjectName}"`,
      targetName: subjectName,
      stageMessage: 'Removing folder and cleaning up offline notes...',
      progressPercent: 20,
      status: 'running',
      timestamp: Date.now()
    };
    setActiveSyncTasks(prev => [initialTask, ...prev]);

    // 3. Sturdily complete deletion & Drive synchronization in the background
    return runSubjectDeletionInBackground(
      taskId,
      subjectName,
      deleteRecordings,
      nextSubjects,
      nextAudioItems,
      toDeleteAudio
    );
  };

  const runAudioDeletionInBackground = async (
    taskId: string,
    itemToDelete: AudioItem,
    nextAudioItems: AudioItem[]
  ) => {
    try {
      await audioStorage.deleteAudioBlob(itemToDelete.id).catch(() => {});
      bridge.removeOfflineDownload(itemToDelete.id);

      const syncCheck = networkService.canSync(userSettings.offline_sync_wifi_only);
      if (googleDriveService.isConnected() && !syncCheck.allowed && syncCheck.reason === 'wifi_only_on_cellular') {
        updateSyncTask(taskId, {
          stageMessage: 'Audio deleted locally. Cloud sync deferred for Wi-Fi...',
          progressPercent: 100,
          status: 'completed'
        });
        showSyncToast({
          type: 'wifi_only_paused',
          title: 'Audio Deleted Locally',
          message: `Note "${itemToDelete.title}" deleted on device. Drive sync deferred until connected to Wi-Fi.`,
          durationMs: 5000
        });
      } else if (googleDriveService.isConnected()) {
        updateSyncTask(taskId, {
          stageMessage: 'Deleting audio note from Google Drive...',
          progressPercent: 55
        });

        await googleDriveService.deleteAudio(itemToDelete.google_drive_file_id || '', {
          title: itemToDelete.title,
          subjectName: itemToDelete.subject_name
        });

        updateSyncTask(taskId, {
          stageMessage: 'Updating cloud catalog...',
          progressPercent: 82
        });

        await googleDriveService.saveCatalog({ subjects, audioItems: nextAudioItems });

        updateSyncTask(taskId, {
          stageMessage: 'Syncing Drive changes...',
          progressPercent: 92
        });

        const driveData = await googleDriveService.fetchDriveData(subjects);
        if (driveData) {
          if (driveData.audioItems) {
            setAudioItems(driveData.audioItems.map(item => playCountService.mergeAudioItem(item)));
          }
          if (driveData.subjects && driveData.subjects.length > 0) {
            setSubjects(driveData.subjects);
          }
        }
      } else {
        updateSyncTask(taskId, {
          progressPercent: 100
        });
      }

      const info = await bridge.getStorageInfoAsync();
      setStorageInfo(info);

      updateSyncTask(taskId, {
        stageMessage: 'Audio note deleted and Drive synchronized',
        progressPercent: 100,
        status: 'completed'
      });

      setTimeout(() => {
        dismissSyncTask(taskId);
      }, 3000);
    } catch (err: any) {
      console.error('Error during background audio deletion:', err);
      updateSyncTask(taskId, {
        stageMessage: `Drive deletion error: ${err.message || 'Check connection'}`,
        progressPercent: 100,
        status: 'error',
        errorMessage: err.message || 'Deletion failed'
      });
    }
  };

  const handleDeleteAudio = async (audioId: string) => {
    const itemToDelete = audioItems.find(a => a.id === audioId);
    if (!itemToDelete) return;

    // 1. Optimistic UI and local storage update
    const nextAudioItems = audioItems.filter(a => a.id !== audioId);
    setAudioItems(nextAudioItems);
    persistAudioItems(nextAudioItems, isGuestMode);

    if (playbackState.currentAudio?.id === audioId) {
      handleDismissPlayer();
    }

    // 2. Register non-blocking active sync task with progress bar
    const taskId = `task-del-audio-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const initialTask: ActiveSyncTask = {
      id: taskId,
      type: 'delete_audio',
      title: `Deleting "${itemToDelete.title}"`,
      targetName: itemToDelete.title,
      stageMessage: 'Removing note from device storage...',
      progressPercent: 25,
      status: 'running',
      timestamp: Date.now()
    };
    setActiveSyncTasks(prev => [initialTask, ...prev]);

    return runAudioDeletionInBackground(taskId, itemToDelete, nextAudioItems);
  };

  const handleNavigateToAccount = () => {
    setCurrentTab('profile');
  };

  // Exit Guest Mode and return to the Vedic Welcome Screen
  const handleExitGuestMode = useCallback(() => {
    bridge.stopAudio();
    setIsFullScreenPlayerOpen(false);
    setPlaybackState(prev => ({
      ...prev,
      currentAudio: null,
      isPlaying: false,
      positionSeconds: 0,
      durationSeconds: 0,
      abLoop: null,
      learningModeActive: false
    }));
    setIsGuestMode(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('smriti_guest_mode');
    }
    setCurrentTab('library');
    setSelectedSubjectForLibrary(null);
  }, []);

  // Double-Back Management
  const lastBackPressTimeRef = useRef<number>(0);

  const handleGlobalBackPress = useCallback((): boolean => {
    // Priority 1: If FullScreenPlayer is open, close it
    if (isFullScreenPlayerOpen) {
      setIsFullScreenPlayerOpen(false);
      return true;
    }

    // Priority 1 & 2: Delegate to LibraryTab back handler (closes open modal, overflow menu, search bar, selection mode, or folder view)
    if (typeof (window as any).__smritiLibraryBackHandler === 'function') {
      const handled = (window as any).__smritiLibraryBackHandler();
      if (handled) {
        return true;
      }
    }

    // Priority 2: If on non-library tab, return to root Homepage
    if (currentTab !== 'library' && currentTab !== 'home') {
      setSelectedSubjectForLibrary(null);
      setForceResetLibraryRootKey(k => k + 1);
      setCurrentTab('library');
      return true;
    }

    // Priority 2.5: In Guest Mode on root Homepage, pressing back returns to the Welcome Page!
    if (isGuestMode) {
      handleExitGuestMode();
      return true;
    }

    // Priority 3: On root Homepage, double-back within 2000ms exits app
    const now = Date.now();
    if (now - lastBackPressTimeRef.current < 2000) {
      toastService.dismiss();
      bridge.exitApp();
      return false; // Exit app
    }

    // First back press on root homepage: show sleek Obsidian Dark micro-toast
    lastBackPressTimeRef.current = now;
    toastService.show({
      title: 'Press back again to exit.',
      section: 'neutral',
      duration: 2000
    });
    return true;
  }, [isFullScreenPlayerOpen, currentTab, isGuestMode, handleExitGuestMode]);

  useEffect(() => {
    // Register global window bridge hook for Android MainActivity.kt
    (window as any).handleSmritiBackPress = handleGlobalBackPress;

    // Handle browser / PWA history back navigation
    const handlePopState = () => {
      const handled = handleGlobalBackPress();
      if (handled) {
        // Push state again so next back press will also be caught
        window.history.pushState(null, '', window.location.pathname);
      }
    };
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      delete (window as any).handleSmritiBackPress;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleGlobalBackPress]);

  // Remote Admin Account Suspension Screen
  if (isUserBlocked) {
    return (
      <div className="fixed inset-0 w-full h-full h-[100dvh] max-h-[100dvh] bg-[#FAF5EE] text-[#2C2623] flex flex-col justify-center items-center p-6 select-none font-sans z-50">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 border border-rose-200 shadow-2xl flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="size-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Access Suspended</h2>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {blockedReason}
            </p>
          </div>
          <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 text-left space-y-1">
            <span className="font-semibold block text-slate-800">Need Help?</span>
            <p>If you believe this suspension is in error, please reach out to your administrator or teacher with your registered email.</p>
          </div>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('smriti_blocked_user');
                localStorage.removeItem('smriti_blocked_reason');
                googleDriveService.disconnect();
                setIsDriveConnected(false);
                setIsGuestMode(false);
              } catch {
                // Ignore
              }
              setIsUserBlocked(false);
            }}
            className="w-full py-2.5 px-4 rounded-full bg-[#241F3B] hover:bg-[#302A4E] text-white text-xs font-semibold transition-all cursor-pointer shadow-md active:scale-95"
          >
            Switch Google Account
          </button>
        </div>
      </div>
    );
  }

  // Vedic Welcome & Google Drive Onboarding Gateway
  if (!isDriveConnected && !isGuestMode) {
    return (
      <AuthScreen
        onAuthenticated={() => {
          setIsDriveConnected(true);
          setIsGuestMode(false);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('smriti_guest_mode');
          }
          handleSyncDrive().catch(() => {});
        }}
        onExploreGuest={() => {
          setIsGuestMode(true);
          setIsGuestBannerExpanded(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('smriti_guest_mode', 'true');
          }
          const guestSubs = loadGuestSubjects();
          const guestAudios = loadGuestAudioItems();
          setSubjects(guestSubs);
          setAudioItems(guestAudios);
          setCurrentTab('library');
          setSelectedSubjectForLibrary(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-slate-900 flex flex-col font-sans select-none">
      {/* Sleek, Non-Blocking Background Sync Banner with animated progress */}
      <BackgroundSyncBanner
        tasks={activeSyncTasks}
        onDismissTask={dismissSyncTask}
        onRetryTask={handleRetryTask}
      />

      {/* Sleek Auto-Collapsing Guest Mode Floating Banner (Stitch Vedic Sacred Memory) */}
      {!isDriveConnected && isGuestMode && (
        <div className="w-full max-w-md mx-auto px-4 pt-2.5 pb-1 transition-all duration-500 ease-in-out">
          <div
            onMouseEnter={handleBannerMouseEnter}
            className={`relative overflow-hidden bg-[#FFFDF9]/95 backdrop-blur-md border border-[#DFCEB5] shadow-xs hover:border-[#C59B27]/80 transition-all duration-500 ease-in-out ${
              isGuestBannerExpanded
                ? 'rounded-2xl p-3.5 shadow-md'
                : 'rounded-full h-9 px-3 flex items-center justify-between'
            }`}
          >
            {/* Expanded View */}
            {isGuestBannerExpanded ? (
              <div className="w-full animate-in fade-in duration-300">
                {/* Sacred ornamental micro-accents */}
                <div className="absolute top-2 left-2 text-[#C59B27]/30 text-[8px] select-none pointer-events-none font-serif">✤</div>
                <div className="absolute top-2 right-2 text-[#C59B27]/30 text-[8px] select-none pointer-events-none font-serif">✤</div>

                {/* Line 1: Dedicated Full Title Line with Glowing Amber Indicator, Local Only Tag & Collapse Trigger */}
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#F2E8DC]/80">
                  <div className="flex items-center gap-2 pl-0.5 min-w-0">
                    <span className="relative flex size-2 items-center justify-center shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-2 bg-amber-500 ring-2 ring-amber-200/80" />
                    </span>
                    <h2 className="text-xs font-bold tracking-wide text-[#1E1B4B] uppercase">
                      Offline Guest Mode
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F8F3EC] text-[#8B6B1F] border border-[#EADCC8]">
                      <HardDrive size={10} className="stroke-[2.2]" />
                      <span>Local Only</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsGuestBannerExpanded(false)}
                      className="size-5 rounded-full flex items-center justify-center text-[#7C6A53] hover:text-[#1E1B4B] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
                      title="Collapse banner into sleek top bar"
                      aria-label="Collapse banner into sleek top bar"
                    >
                      <ChevronUp size={13} className="stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Line 2: Explanatory Subtitle with comfortable breathing room */}
                <p className="mt-2 text-[11.5px] leading-relaxed text-[#57534E] pl-0.5 font-normal">
                  Audio saved locally on device. Connect Google Drive to sync across devices.
                </p>

                {/* Line 3: Dedicated Action Buttons at the Bottom */}
                <div className="mt-2.5 pt-2.5 border-t border-[#F5EFE7] flex items-center justify-between gap-2.5">
                  {/* Secondary Pill Button: ← Welcome */}
                  <button
                    type="button"
                    onClick={handleExitGuestMode}
                    className="group inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF5EE] hover:bg-[#F2EADB] active:scale-95 border border-[#DFCEB5] text-[#44403C] hover:text-[#1E1B4B] text-[11.5px] font-medium transition-all shadow-2xs cursor-pointer"
                    title="Return to Welcome Screen"
                    aria-label="Return to Welcome Screen"
                  >
                    <ArrowLeft size={11} className="text-[#8B6B1F] group-hover:-translate-x-0.5 transition-transform stroke-[2.5]" />
                    <span>Welcome</span>
                  </button>

                  {/* Primary Call-to-Action Button: Sign In */}
                  <button
                    type="button"
                    onClick={handleConnectDrive}
                    className="relative group overflow-hidden inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1E1B4B] hover:bg-[#2A2663] active:scale-95 text-[#FFFDF9] text-[11.5px] font-semibold tracking-wide shadow-xs border border-[#C59B27]/40 hover:border-[#C59B27]/70 transition-all cursor-pointer"
                    title="Sign in with Google Drive to enable cloud sync"
                    aria-label="Sign in with Google Drive"
                  >
                    <Cloud size={12} className="text-[#EADCC8] relative z-10" />
                    <span className="relative z-10 font-medium">Sign In</span>
                    <ChevronRight size={12} className="text-[#C59B27] group-hover:translate-x-0.5 transition-transform relative z-10" />
                  </button>
                </div>
              </div>
            ) : (
              /* Collapsed Sleek Top Bar (Stitch Screen Design deaee47b51944148b91d0ded4f456824) */
              <div className="w-full h-full flex items-center justify-between gap-2 animate-in fade-in duration-300">
                {/* Left: Glowing amber bead, title & mini local badge */}
                <button
                  type="button"
                  onClick={() => setIsGuestBannerExpanded(true)}
                  className="flex items-center gap-2 min-w-0 text-left cursor-pointer hover:opacity-85 transition-opacity"
                  title="Click to expand details"
                >
                  <span className="relative flex size-2 items-center justify-center shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-amber-500 ring-2 ring-amber-200/80" />
                  </span>
                  <span className="text-[11px] font-bold tracking-wider text-[#1E1B4B] uppercase truncate">
                    Offline Guest Mode
                  </span>
                  <span className="hidden xs:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-[#FAF6EE] border border-[#DFCEB5]/80 text-[9px] font-medium text-[#7C6A53] shrink-0">
                    Local
                  </span>
                </button>

                {/* Right: Tactile mini action pills & expand trigger */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleExitGuestMode}
                    className="h-[22px] px-2 rounded-full bg-[#FAF6EE] hover:bg-[#F2EADB] active:scale-95 border border-[#DFCEB5] text-[10px] font-medium text-[#5A4632] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="Return to Welcome Screen"
                    aria-label="Return to Welcome Screen"
                  >
                    <ArrowLeft size={10} className="text-[#8B6B1F]" />
                    <span>Welcome</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleConnectDrive}
                    className="h-[22px] px-2.5 rounded-full bg-[#1E1B4B] hover:bg-[#2A2468] active:scale-95 border border-[#DFCEB5]/70 text-[10px] font-semibold text-[#FFFDF9] flex items-center gap-1 transition-all cursor-pointer shadow-btn-indigo"
                    title="Sign in with Google Drive"
                    aria-label="Sign in with Google Drive"
                  >
                    <Cloud size={10} className="text-[#DFCEB5]" />
                    <span>Sign In</span>
                  </button>
                  <div className="h-3 w-px bg-[#DFCEB5]/70 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => setIsGuestBannerExpanded(true)}
                    className="size-5 rounded-full flex items-center justify-center text-[#7C6A53] hover:text-[#1E1B4B] hover:bg-[#FAF6EE] transition-all cursor-pointer active:scale-95"
                    title="Expand offline guest details"
                    aria-label="Expand offline guest details"
                  >
                    <ChevronDown size={13} className="stroke-[2.5]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified High-Contrast Obsidian Dark Notification System */}
      <ToastContainer
        hasMiniPlayer={Boolean(!isFullScreenPlayerOpen && playbackState.currentAudio)}
        isFullScreenPlayerOpen={isFullScreenPlayerOpen}
      />

      {/* Active Tab Screen */}
      <main className={`flex-1 w-full max-w-md mx-auto ${playbackState.currentAudio ? 'pb-36 sm:pb-40' : 'pb-24'}`}>
        {(currentTab === 'library' || currentTab === 'home') && (
          <LibraryTab
            audioItems={audioItems}
            subjects={subjects}
            initialSubjectId={selectedSubjectForLibrary}
            forceResetRootKey={forceResetLibraryRootKey}
            playbackState={playbackState}
            userSettings={userSettings}
            isDriveConnected={isDriveConnected}
            isSyncingDrive={isSyncingDrive}
            syncState={computedSyncState}
            onSyncDrive={handleSyncDrive}
            onConnectDrive={handleConnectDrive}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onSetSpeed={handleSetSpeed}
            onPlayAudio={handlePlayAudio}
            onPlayQueue={handlePlayQueue}
            onToggleFavorite={handleToggleFavorite}
            onToggleOffline={handleToggleOffline}
            onGoToRecord={() => setCurrentTab('record')}
            onNavigateToAccount={handleNavigateToAccount}
            onCreateSubject={handleCreateSubject}
            onRenameSubject={handleRenameSubject}
            onCopySubject={handleCopySubject}
            onDeleteSubject={handleDeleteSubject}
            onRenameAudio={handleRenameAudio}
            onCopyAudio={handleCopyAudio}
            onMoveAudio={handleMoveAudio}
            onDeleteAudio={handleDeleteAudio}
            onSaveAudio={handleSaveAudio}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {currentTab === 'downloads' && (
          <DownloadsTab
            audioItems={audioItems}
            playbackState={playbackState}
            isDriveConnected={isDriveConnected}
            isSyncingDrive={isSyncingDrive}
            onConnectDrive={handleConnectDrive}
            onSyncDrive={handleSyncDrive}
            onSyncItemToDrive={handleSyncItemToDrive}
            onToggleOffline={handleToggleOffline}
            onDeleteAllDownloads={handleDeleteAllDownloads}
            onPlayAudio={handlePlayAudio}
            onNavigateToLibrary={handleNavigateToLibrary}
          />
        )}

        {currentTab === 'progress' && (
          <ProgressTab
            dailyStats={dailyStats}
            audioItems={audioItems}
            onPlayAudio={(audio) => handlePlayAudio(audio, audioItems, undefined, true)}
          />
        )}

        {currentTab === 'record' && (
          <RecordTab
            subjects={subjects}
            onSaveAudio={handleSaveAudio}
            onCancel={() => setCurrentTab('library')}
            isDriveConnected={isDriveConnected}
            onConnectDrive={handleConnectDrive}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileTab
            userSettings={userSettings}
            storageInfo={storageInfo}
            audioItems={audioItems}
            revisionItems={revisionItems}
            dailyStats={dailyStats}
            isDriveConnected={isDriveConnected}
            isGuestMode={isGuestMode}
            isSyncingDrive={isSyncingDrive}
            onUpdateSettings={handleUpdateSettings}
            onConnectDrive={handleConnectDrive}
            onDisconnectDrive={handleDisconnectDrive}
            onExitGuestMode={handleExitGuestMode}
            onSyncDrive={handleSyncDrive}
            onConnectWithToken={handleConnectWithToken}
            onClearCache={handleClearCache}
          />
        )}
      </main>

      {/* Full-Screen Study Player Modal */}
      {isFullScreenPlayerOpen && (
        <FullScreenPlayer
          playbackState={playbackState}
          playbackQueue={playbackQueue}
          currentQueueIndex={currentQueueIndex}
          audioQueue={playbackQueue.length > 0 ? playbackQueue : audioItems}
          subjects={subjects}
          onSelectTrack={(track, index) => {
            handlePlayQueue(playbackQueue.length > 0 ? playbackQueue : [track], index ?? 0, false);
          }}
          onClose={() => setIsFullScreenPlayerOpen(false)}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
          onSeekRelative={handleSeekRelative}
          onSetSpeed={handleSetSpeed}
          onToggleRepeat={handleToggleRepeat}
          onToggleABLoop={handleToggleABLoop}
          onSetSleepTimer={handleSetSleepTimer}
          onToggleFavorite={handleToggleFavorite}
          onToggleOffline={handleToggleOffline}
          onNext={handleNextTrack}
          onPrevious={handlePreviousTrack}
        />
      )}

      {/* Bottom Navigation with Beautifully Attached Telegram-Style Compact Player */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isPlaying={playbackState.isPlaying}
        onTogglePlay={handleTogglePlay}
        attachedPlayer={
          !isFullScreenPlayerOpen && playbackState.currentAudio ? (
            <MiniPlayer
              playbackState={playbackState}
              audioQueue={playbackQueue.length > 0 ? playbackQueue : audioItems}
              onTogglePlay={handleTogglePlay}
              onSeek={handleSeek}
              onSeekRelative={handleSeekRelative}
              onOpenFullScreen={() => setIsFullScreenPlayerOpen(true)}
              onCycleSpeed={handleCycleSpeed}
              onSetSpeed={handleSetSpeed}
              onDismiss={handleDismissPlayer}
              onSelectTrack={(track) => handlePlayAudio(track)}
              onNextTrack={handleNextTrack}
              onPreviousTrack={handlePreviousTrack}
              onToggleRepeat={handleToggleRepeat}
              onToggleFavorite={handleToggleFavorite}
              onToggleOffline={handleToggleOffline}
            />
          ) : undefined
        }
      />
    </div>
  );
};

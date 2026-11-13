import React, { useState, useEffect, useRef } from 'react';
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
import {
  DEFAULT_USER_SETTINGS
} from './services/supabase';
import { bridge } from './services/bridge';
import { evaluateCompletedPlay } from './services/learningEngine';
import { googleDriveService } from './services/googleDrive';
import { audioStorage } from './services/audioStorage';
import { BackgroundSyncBanner, ActiveSyncTask } from './components/BackgroundSyncBanner';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('library');
  const [audioItems, setAudioItems] = useState<AudioItem[]>(() => {
    // If Google Drive is not connected, enforce strict privacy: 0 audio notes displayed
    if (!googleDriveService.isConnected()) {
      return [];
    }
    const saved = localStorage.getItem('smriti_audio_items');
    if (!saved) return [];
    try {
      const parsed: AudioItem[] = JSON.parse(saved);
      // Remove any previously stored demo/fake audio entries
      const demoIds = new Set(['aud-1', 'aud-2', 'aud-3', 'aud-4']);
      return parsed.filter(item => !demoIds.has(item.id));
    } catch {
      return [];
    }
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('smriti_subjects');
    const fallbackSubjects: Subject[] = [
      { id: 'general', name: 'General', icon_name: 'BookOpen', color_hex: '#38bdf8', description: 'General study & lecture notes', sort_order: 1 }
    ];
    if (!saved) return fallbackSubjects;
    try {
      const parsed: Subject[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Strictly deduplicate by normalized name and normalize deprecated icons
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
        const cleaned = Array.from(map.values());
        return cleaned.length > 0 ? cleaned : fallbackSubjects;
      }
      return fallbackSubjects;
    } catch {
      return fallbackSubjects;
    }
  });
  const [revisionItems] = useState<RevisionItem[]>(() => {
    const saved = localStorage.getItem('smriti_revisions');
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
    const saved = localStorage.getItem('smriti_daily_stats');
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

  const [storageInfo, setStorageInfo] = useState<StorageOverview>(() => bridge.getStorageInfo());
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(() => googleDriveService.isConnected());
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);

  // Background non-blocking sync tasks (e.g., folder deletion, audio deletion, Drive sync)
  const [activeSyncTasks, setActiveSyncTasks] = useState<ActiveSyncTask[]>([]);

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

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    currentAudio: null,
    isPlaying: false,
    positionSeconds: 0,
    durationSeconds: 0,
    playbackSpeed: 1.0,
    isRepeatTrack: false,
    isRepeatQueue: false,
    abLoop: null,
    sleepTimerRemainingSeconds: null,
    learningModeActive: false
  });

  // Track listening metrics per session for completed-play rules
  const currentSessionListeningSeconds = useRef<number>(0);
  const completedPlayRecordedForSession = useRef<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('smriti_audio_items', JSON.stringify(audioItems));
  }, [audioItems]);

  useEffect(() => {
    localStorage.setItem('smriti_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('smriti_revisions', JSON.stringify(revisionItems));
  }, [revisionItems]);

  useEffect(() => {
    localStorage.setItem('smriti_daily_stats', JSON.stringify(dailyStats));
  }, [dailyStats]);

  useEffect(() => {
    localStorage.setItem('smriti_settings', JSON.stringify(userSettings));
  }, [userSettings]);

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

        // Check Completed-Play policy
        if (
          !completedPlayRecordedForSession.current &&
          playbackState.currentAudio &&
          dur > 0
        ) {
          const evalResult = evaluateCompletedPlay(
            currentSessionListeningSeconds.current,
            dur
          );

          if (evalResult.isCompleted) {
            completedPlayRecordedForSession.current = true;
            // Record completed play in today's daily statistics
            const todayStr = new Date().toISOString().split('T')[0];
            setDailyStats(prev => {
              const existingIdx = prev.findIndex(s => s.study_date === todayStr);
              if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  completed_plays: updated[existingIdx].completed_plays + 1,
                  total_listening_seconds: updated[existingIdx].total_listening_seconds + Math.round(currentSessionListeningSeconds.current)
                };
                return updated;
              } else {
                return [
                  ...prev,
                  {
                    study_date: todayStr,
                    total_listening_seconds: Math.round(currentSessionListeningSeconds.current),
                    completed_plays: 1,
                    assessments_taken: 0,
                    successful_recalls: 0
                  }
                ];
              }
            });
          }
        }
      } else if (eventName === 'playbackStateChanged') {
        setPlaybackState(prev => ({
          ...prev,
          isPlaying: !!data.isPlaying
        }));

        if (data.isEnded) {
          if (playbackState.isRepeatTrack && playbackState.currentAudio) {
            bridge.seek(0);
            bridge.play(playbackState.currentAudio, playbackState.playbackSpeed);
          } else if (playbackState.isRepeatQueue) {
            handleNextTrack();
          }
        }
      }
    });

    return () => unsubscribe();
  }, [playbackState.currentAudio, playbackState.durationSeconds, playbackState.isRepeatTrack, playbackState.isRepeatQueue, playbackState.playbackSpeed, audioItems]);

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

  // Audio Playback Handlers
  const handlePlayAudio = (audio: AudioItem) => {
    // If tapping the currently playing audio, toggle pause/resume
    if (playbackState.currentAudio?.id === audio.id) {
      handleTogglePlay();
      return;
    }

    currentSessionListeningSeconds.current = 0;
    completedPlayRecordedForSession.current = false;

    const safeDuration = (audio.duration_seconds && Number.isFinite(audio.duration_seconds) && audio.duration_seconds > 0)
      ? audio.duration_seconds
      : 60;

    setPlaybackState(prev => ({
      ...prev,
      currentAudio: audio,
      isPlaying: true,
      positionSeconds: 0,
      durationSeconds: safeDuration
    }));

    // Increment play_count and update last_listened_at
    setAudioItems(prev =>
      prev.map(item =>
        item.id === audio.id
          ? {
              ...item,
              play_count: (item.play_count || 0) + 1,
              last_listened_at: new Date().toISOString()
            }
          : item
      )
    );

    bridge.play(audio, playbackState.playbackSpeed);
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
    setPlaybackState(prev => ({
      ...prev,
      currentAudio: null,
      isPlaying: false,
      positionSeconds: 0
    }));
  };

  const handleSeek = (seconds: number) => {
    bridge.seek(seconds);
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
    setPlaybackState(prev => {
      if (!prev.isRepeatTrack && !prev.isRepeatQueue) {
        return { ...prev, isRepeatTrack: true, isRepeatQueue: false };
      }
      if (prev.isRepeatTrack) {
        return { ...prev, isRepeatTrack: false, isRepeatQueue: true };
      }
      return { ...prev, isRepeatTrack: false, isRepeatQueue: false };
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
    setAudioItems(prev =>
      prev.map(item => (item.id === audioId ? { ...item, is_favorite: !item.is_favorite } : item))
    );
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
    }
    setAudioItems(prev =>
      prev.map(item => (item.id === audio.id ? { ...item, is_downloaded_offline: nextState } : item))
    );
    setStorageInfo(bridge.getStorageInfo());
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
      setStorageInfo(bridge.getStorageInfo());
      bridge.triggerHaptic('medium');
    } catch (err) {
      console.error('Failed to clear downloaded files:', err);
    }
  };

  const handleCycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const curIdx = speeds.indexOf(playbackState.playbackSpeed);
    const nextSpeed = speeds[(curIdx + 1) % speeds.length];
    handleSetSpeed(nextSpeed);
  };

  const handleNextTrack = (subjectScoped: boolean = true) => {
    if (!playbackState.currentAudio || audioItems.length === 0) return;
    const currentSubId = playbackState.currentAudio.subject_id;
    const currentSubName = playbackState.currentAudio.subject_name?.toLowerCase();
    const subjectItems = subjectScoped
      ? audioItems.filter(
          a =>
            (currentSubId && a.subject_id === currentSubId) ||
            (currentSubName && a.subject_name && a.subject_name.toLowerCase() === currentSubName)
        )
      : audioItems;
    const queue = subjectItems.length > 0 ? subjectItems : audioItems;
    const currentIndex = queue.findIndex(a => a.id === playbackState.currentAudio?.id);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % queue.length : 0;
    handlePlayAudio(queue[nextIndex]);
  };

  const handlePreviousTrack = (subjectScoped: boolean = true) => {
    if (!playbackState.currentAudio || audioItems.length === 0) return;
    if (playbackState.positionSeconds > 3) {
      handleSeek(0);
      return;
    }
    const currentSubId = playbackState.currentAudio.subject_id;
    const currentSubName = playbackState.currentAudio.subject_name?.toLowerCase();
    const subjectItems = subjectScoped
      ? audioItems.filter(
          a =>
            (currentSubId && a.subject_id === currentSubId) ||
            (currentSubName && a.subject_name && a.subject_name.toLowerCase() === currentSubName)
        )
      : audioItems;
    const queue = subjectItems.length > 0 ? subjectItems : audioItems;
    const currentIndex = queue.findIndex(a => a.id === playbackState.currentAudio?.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    handlePlayAudio(queue[prevIndex]);
  };

  // Check Google Drive connection status on mount and load cloud data if connected
  useEffect(() => {
    if (googleDriveService.isConnected()) {
      setIsDriveConnected(true);
      googleDriveService.fetchUserProfile().catch(() => {});
      googleDriveService.ensureFreshAccessToken().then(() => {
        setIsSyncingDrive(true);
        return googleDriveService.fetchDriveData(subjects);
      }).then(data => {
        if (data && data.audioItems && data.audioItems.length > 0) {
          setAudioItems(data.audioItems);
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
        await audioStorage.saveAudioBlob(newId, fileBlob);
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

    // 2. If Google Drive connected and sync enabled, upload directly to Drive
    const shouldSyncDrive =
      options?.syncToDrive !== false &&
      (googleDriveService.isConnected() || options?.syncToDrive === true);

    if (shouldSyncDrive && fileBlob) {
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

      // Fetch cloud catalog and recordings for this specific connected account
      const driveData = await googleDriveService.fetchDriveData(subjects);
      if (driveData) {
        setAudioItems(driveData.audioItems || []);
        if (driveData.subjects && driveData.subjects.length > 0) {
          setSubjects(driveData.subjects);
        }
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

      const driveData = await googleDriveService.fetchDriveData(subjects);
      if (driveData) {
        setAudioItems(driveData.audioItems || []);
        if (driveData.subjects && driveData.subjects.length > 0) {
          setSubjects(driveData.subjects);
        }
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
  const handleSyncDrive = async () => {
    if (!googleDriveService.isConnected()) {
      await handleConnectDrive();
      return;
    }
    try {
      setIsSyncingDrive(true);
      const driveData = await googleDriveService.fetchDriveData(subjects);
      if (driveData) {
        setAudioItems(driveData.audioItems || []);
        if (driveData.subjects && driveData.subjects.length > 0) {
          setSubjects(driveData.subjects);
        }
      }
      const info = await bridge.getStorageInfoAsync();
      setStorageInfo(info);
    } catch (err: any) {
      console.error('Error syncing with Google Drive:', err);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Google Drive disconnect trigger: Stops playback, safely purges all local cache/audio files across Android and Web, clears UI to protect privacy
  const handleDisconnectDrive = async () => {
    try {
      // 1. Immediately halt playback and reset player
      bridge.stopAudio();
      setPlaybackState({
        currentAudio: null,
        isPlaying: false,
        positionSeconds: 0,
        durationSeconds: 0,
        playbackSpeed: 1.0,
        isRepeatTrack: false,
        isRepeatQueue: false,
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

      const info = await bridge.getStorageInfoAsync();
      setStorageInfo(info);
    } catch (e) {
      console.error('Error during Google Drive disconnect and data purge', e);
    }
  };

  const handleSyncItemToDrive = async (audio: AudioItem) => {
    try {
      if (!googleDriveService.isConnected()) {
        await handleConnectDrive();
        return;
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
      }
    } catch (e) {
      console.warn('Sync to drive error:', e);
    }
  };

  const handleDownloadItemFromDrive = async (audio: AudioItem) => {
    try {
      if (!googleDriveService.isConnected()) {
        await handleConnectDrive();
        return;
      }
      if (audio.google_drive_file_id && googleDriveService.isConnected()) {
        const blob = await googleDriveService.downloadAudio(audio.google_drive_file_id, audio.title);
        if (blob) {
          await audioStorage.saveAudioBlob(audio.id, blob);
          setAudioItems(prev =>
            prev.map(item => (item.id === audio.id ? { ...item, is_downloaded_offline: true } : item))
          );
        }
      }
    } catch (e) {
      console.warn('Download from drive error:', e);
    }
  };

  // Navigation helper for targeted subject opening
  const [selectedSubjectForLibrary, setSelectedSubjectForLibrary] = useState<string | null>(null);

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
      if (googleDriveService.isConnected()) {
        updateSyncTask(taskId, {
          stageMessage: 'Deleting folder from Google Drive...',
          progressPercent: deleteRecordings ? 55 : 45
        });

        let generalFolderId: string | undefined;
        if (!deleteRecordings) {
          generalFolderId = await googleDriveService.getOrCreateSubjectFolder('General');
        }

        await googleDriveService.deleteSubjectFolder(subjectName, {
          deleteFiles: deleteRecordings,
          moveToFolderId: generalFolderId
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
            setAudioItems(driveData.audioItems);
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
    if (subjectName.toLowerCase() === 'general') {
      console.warn('The General folder is the core default folder and cannot be deleted.');
      return;
    }
    const deleteRecordings = !!options?.deleteRecordings;

    // 1. Immediate optimistic UI and local persistence update (instant feedback, never blocks UI)
    let nextSubjects = subjects.filter(
      s => s.id !== targetSubject.id && s.name.toLowerCase() !== subjectName.toLowerCase()
    );
    if (nextSubjects.length === 0) {
      nextSubjects = [
        { id: 'general', name: 'General', icon_name: 'BookOpen', color_hex: '#38bdf8', description: 'General study & lecture notes', sort_order: 1 }
      ];
    }
    setSubjects(nextSubjects);

    let nextAudioItems: AudioItem[] = [];
    const toDeleteAudio = audioItems.filter(
      a => a.subject_id === targetSubject.id || a.subject_name?.toLowerCase() === subjectName.toLowerCase()
    );

    if (deleteRecordings) {
      nextAudioItems = audioItems.filter(
        a => a.subject_id !== targetSubject.id && a.subject_name?.toLowerCase() !== subjectName.toLowerCase()
      );
      setAudioItems(nextAudioItems);
    } else {
      nextAudioItems = audioItems.map(a => {
        if (a.subject_id === targetSubject.id || a.subject_name?.toLowerCase() === subjectName.toLowerCase()) {
          return {
            ...a,
            subject_id: 'general',
            subject_name: 'General'
          };
        }
        return a;
      });
      setAudioItems(nextAudioItems);
    }

    localStorage.setItem('smriti_subjects', JSON.stringify(nextSubjects));
    localStorage.setItem('smriti_audio_items', JSON.stringify(nextAudioItems));

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

      if (googleDriveService.isConnected()) {
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
            setAudioItems(driveData.audioItems);
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
    localStorage.setItem('smriti_audio_items', JSON.stringify(nextAudioItems));

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

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-slate-900 flex flex-col font-sans select-none">
      {/* Sleek, Non-Blocking Background Sync Banner with animated progress */}
      <BackgroundSyncBanner
        tasks={activeSyncTasks}
        onDismissTask={dismissSyncTask}
        onRetryTask={handleRetryTask}
      />

      {/* Active Tab Screen */}
      <main className={`flex-1 w-full max-w-md mx-auto ${playbackState.currentAudio ? 'pb-36 sm:pb-40' : 'pb-24'}`}>
        {(currentTab === 'library' || currentTab === 'home') && (
          <LibraryTab
            audioItems={audioItems}
            subjects={subjects}
            initialSubjectId={selectedSubjectForLibrary}
            playbackState={playbackState}
            userSettings={userSettings}
            isDriveConnected={isDriveConnected}
            isSyncingDrive={isSyncingDrive}
            onSyncDrive={handleSyncDrive}
            onConnectDrive={handleConnectDrive}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onSetSpeed={handleSetSpeed}
            onPlayAudio={handlePlayAudio}
            onToggleFavorite={handleToggleFavorite}
            onToggleOffline={handleToggleOffline}
            onGoToRecord={() => setCurrentTab('record')}
            onNavigateToAccount={handleNavigateToAccount}
            onCreateSubject={handleCreateSubject}
            onDeleteSubject={handleDeleteSubject}
            onDeleteAudio={handleDeleteAudio}
            onSaveAudio={handleSaveAudio}
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
            onDownloadItemFromDrive={handleDownloadItemFromDrive}
            onToggleOffline={handleToggleOffline}
            onDeleteAllDownloads={handleDeleteAllDownloads}
            onPlayAudio={handlePlayAudio}
            onNavigateToLibrary={handleNavigateToLibrary}
          />
        )}

        {currentTab === 'progress' && (
          <ProgressTab
            dailyStats={dailyStats}
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
            isSyncingDrive={isSyncingDrive}
            onUpdateSettings={(s) => setUserSettings(prev => ({ ...prev, ...s }))}
            onConnectDrive={handleConnectDrive}
            onDisconnectDrive={handleDisconnectDrive}
            onSyncDrive={handleSyncDrive}
            onConnectWithToken={handleConnectWithToken}
            onClearCache={() => {
              bridge.clearTemporaryCache();
              setStorageInfo(bridge.getStorageInfo());
            }}
          />
        )}
      </main>

      {/* Full-Screen Study Player Modal */}
      {isFullScreenPlayerOpen && (
        <FullScreenPlayer
          playbackState={playbackState}
          audioQueue={audioItems}
          subjects={subjects}
          onSelectTrack={handlePlayAudio}
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
          onNext={() => handleNextTrack(true)}
          onPrevious={() => handlePreviousTrack(true)}
        />
      )}

      {/* Bottom Navigation with Beautifully Attached Telegram-Style Compact Player */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isPlaying={playbackState.isPlaying}
        onTogglePlay={handleTogglePlay}
        attachedPlayer={
          !isFullScreenPlayerOpen && playbackState.currentAudio ? (
            <MiniPlayer
              playbackState={playbackState}
              audioQueue={audioItems}
              onTogglePlay={handleTogglePlay}
              onSeek={handleSeek}
              onSeekRelative={handleSeekRelative}
              onOpenFullScreen={() => setIsFullScreenPlayerOpen(true)}
              onCycleSpeed={handleCycleSpeed}
              onSetSpeed={handleSetSpeed}
              onDismiss={handleDismissPlayer}
              onSelectTrack={handlePlayAudio}
              onNextTrack={() => handleNextTrack(true)}
              onPreviousTrack={() => handlePreviousTrack(true)}
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

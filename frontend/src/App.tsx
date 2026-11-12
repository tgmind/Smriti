import React, { useState, useEffect, useRef } from 'react';
import { TabType, Navigation } from './components/Navigation';
import { MiniPlayer } from './components/MiniPlayer';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { HomeTab } from './components/HomeTab';
import { LibraryTab } from './components/LibraryTab';
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
  StorageOverview
} from './types';
import {
  DEMO_SUBJECTS,
  DEFAULT_USER_SETTINGS
} from './services/supabase';
import { bridge } from './services/bridge';
import { evaluateCompletedPlay } from './services/learningEngine';
import { googleDriveService } from './services/googleDrive';
import { audioStorage } from './services/audioStorage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [audioItems, setAudioItems] = useState<AudioItem[]>(() => {
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

  const [subjects] = useState<Subject[]>(DEMO_SUBJECTS);
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
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(false);

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
    } else {
      bridge.removeOfflineDownload(audio.id);
    }
    setAudioItems(prev =>
      prev.map(item => (item.id === audio.id ? { ...item, is_downloaded_offline: nextState } : item))
    );
    setStorageInfo(bridge.getStorageInfo());
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

  // Check Google Drive connection status on mount
  useEffect(() => {
    if (googleDriveService.isConnected()) {
      setIsDriveConnected(true);
      googleDriveService.fetchUserProfile().catch(() => {});
    }
  }, []);

  // Save new recording
  const handleSaveAudio = async (partialItem: Partial<AudioItem>, fileBlob?: Blob) => {
    const newId = `aud-${Date.now()}`;
    const newItem: AudioItem = {
      id: newId,
      title: partialItem.title || 'Untitled Lecture Note',
      subject_id: partialItem.subject_id,
      subject_name: partialItem.subject_name || 'General',
      duration_seconds: partialItem.duration_seconds || 60,
      source_type: 'recorded',
      file_format: 'm4a',
      file_size_bytes: partialItem.file_size_bytes || 2000000,
      audio_enhancement_applied: !!partialItem.audio_enhancement_applied,
      waveform_peaks: partialItem.waveform_peaks || [20, 40, 60, 80, 50],
      key_terms: partialItem.key_terms || [],
      is_favorite: false,
      is_downloaded_offline: true,
      created_at: new Date().toISOString()
    };

    // 1. Save blob to IndexedDB for 100% offline local playback
    if (fileBlob) {
      try {
        await audioStorage.saveAudioBlob(newId, fileBlob);
        newItem.file_url = URL.createObjectURL(fileBlob);
      } catch (e) {
        console.warn('Failed saving blob to IndexedDB', e);
      }
    }

    // 2. If Google Drive connected and blob exists, upload directly to Drive
    if (googleDriveService.isConnected() && fileBlob) {
      try {
        const uploaded = await googleDriveService.uploadAudio(fileBlob, `${newItem.title}.m4a`);
        newItem.google_drive_file_id = uploaded.id;
        if (uploaded.webContentLink) {
          newItem.file_url = uploaded.webContentLink;
        }
      } catch (err: any) {
        console.warn('Google Drive direct upload failed, kept in local offline storage:', err);
      }
    }

    setAudioItems(prev => [newItem, ...prev]);
    setCurrentTab('library');
  };

  // Google Drive connection trigger
  const handleConnectDrive = async () => {
    try {
      await googleDriveService.authorize();
      setIsDriveConnected(true);
      const info = await bridge.getStorageInfoAsync();
      setStorageInfo(info);
    } catch (err: any) {
      console.error('Google Drive sign-in error:', err);
      alert(`Google Drive Sign-In: ${err.message || 'Could not complete authorization'}`);
    }
  };

  const handleDisconnectDrive = () => {
    googleDriveService.disconnect();
    setIsDriveConnected(false);
  };

  const handleSyncItemToDrive = async (audio: AudioItem) => {
    try {
      if (!googleDriveService.isConnected()) {
        await handleConnectDrive();
        return;
      }
      const blob = await audioStorage.getAudioBlob(audio.id);
      if (blob && googleDriveService.isConnected()) {
        const uploaded = await googleDriveService.uploadAudio(blob, `${audio.title}.m4a`);
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

  const handleNavigateToAccount = () => {
    setCurrentTab('profile');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-slate-900 flex flex-col font-sans select-none">
      {/* Active Tab Screen */}
      <main className={`flex-1 w-full max-w-md mx-auto ${playbackState.currentAudio ? 'pb-36 sm:pb-40' : 'pb-24'}`}>
        {currentTab === 'home' && (
          <HomeTab
            recentAudio={audioItems}
            subjects={subjects}
            playbackState={playbackState}
            userSettings={userSettings}
            isDriveConnected={isDriveConnected}
            onConnectDrive={handleConnectDrive}
            onSyncToDrive={handleSyncItemToDrive}
            onDownloadFromDrive={handleDownloadItemFromDrive}
            onPlayAudio={handlePlayAudio}
            onSeek={handleSeek}
            onGoToRecord={() => setCurrentTab('record')}
            onNavigateToLibrary={handleNavigateToLibrary}
            onNavigateToAccount={handleNavigateToAccount}
          />
        )}

        {currentTab === 'library' && (
          <LibraryTab
            audioItems={audioItems}
            subjects={subjects}
            initialSubjectId={selectedSubjectForLibrary}
            playbackState={playbackState}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onSetSpeed={handleSetSpeed}
            onPlayAudio={handlePlayAudio}
            onToggleFavorite={handleToggleFavorite}
            onToggleOffline={handleToggleOffline}
            onGoToRecord={() => setCurrentTab('record')}
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
            onCancel={() => setCurrentTab('home')}
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
            onUpdateSettings={(s) => setUserSettings(prev => ({ ...prev, ...s }))}
            onConnectDrive={handleConnectDrive}
            onDisconnectDrive={handleDisconnectDrive}
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

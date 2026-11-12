import React, { useState, useMemo } from 'react';
import {
  Cloud,
  CheckCircle2,
  Download,
  Upload,
  Trash2,
  Play,
  Pause,
  HardDrive,
  RefreshCw,
  X,
  AlertTriangle,
  Folder,
  ArrowRight
} from 'lucide-react';
import { AudioItem, PlaybackState } from '../types';
import { resolveSubjectVisual } from '../utils/subjectVisuals';
import {
  googleDriveService,
  DriveTransferItem,
  GoogleDriveStorageQuota
} from '../services/googleDrive';
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction
} from '@/components/ui/attachment';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription
} from '@/components/ui/empty';
import { bridge } from '../services/bridge';

export interface DownloadsTabProps {
  audioItems: AudioItem[];
  playbackState?: PlaybackState;
  isDriveConnected?: boolean;
  isSyncingDrive?: boolean;
  storageQuota?: GoogleDriveStorageQuota | null;
  onConnectDrive?: () => void;
  onSyncDrive?: () => void;
  onSyncItemToDrive?: (audio: AudioItem) => void;
  onDownloadItemFromDrive?: (audio: AudioItem) => void;
  onToggleOffline: (audio: AudioItem) => void;
  onDeleteAllDownloads: () => Promise<void> | void;
  onPlayAudio: (audio: AudioItem) => void;
  onNavigateToLibrary?: () => void;
}

const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const DownloadsTab: React.FC<DownloadsTabProps> = ({
  audioItems,
  playbackState,
  isDriveConnected = false,
  isSyncingDrive = false,
  storageQuota: externalStorageQuota,
  onConnectDrive,
  onSyncDrive,
  onSyncItemToDrive,
  onDownloadItemFromDrive,
  onToggleOffline,
  onDeleteAllDownloads,
  onPlayAudio,
  onNavigateToLibrary
}) => {
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

  // Active Transfers from Google Drive Service
  const [transfers, setTransfers] = useState<DriveTransferItem[]>(() =>
    googleDriveService.getTransfers()
  );

  React.useEffect(() => {
    const unsub = googleDriveService.subscribeTransfers((newTransfers) => {
      setTransfers(newTransfers);
    });
    return unsub;
  }, []);

  const isConnected = isDriveConnected || googleDriveService.isConnected();
  const userProfile = googleDriveService.getUserProfile();
  const [storageQuota, setStorageQuota] = useState<GoogleDriveStorageQuota | null>(externalStorageQuota || null);

  React.useEffect(() => {
    if (externalStorageQuota) {
      setStorageQuota(externalStorageQuota);
      return;
    }
    if (googleDriveService.isConnected()) {
      googleDriveService.getStorageQuota().then((q) => {
        if (q) setStorageQuota(q);
      }).catch(() => {});
    }
  }, [externalStorageQuota]);

  // Downloaded notes (physical local storage)
  const downloadedNotes = useMemo(() => {
    return audioItems.filter((item) => Boolean(item.is_downloaded_offline));
  }, [audioItems]);

  // Total size of downloaded files
  const totalDownloadedBytes = useMemo(() => {
    return downloadedNotes.reduce((acc, curr) => acc + (curr.file_size_bytes || 0), 0);
  }, [downloadedNotes]);

  const activeTransfers = transfers.filter(
    (t) => t.state === 'uploading' || t.state === 'processing'
  );

  const handleConfirmDeleteAll = async () => {
    setIsDeleting(true);
    bridge.triggerHaptic('heavy');
    try {
      await onDeleteAllDownloads();
      setShowConfirmDeleteModal(false);
      setDeleteSuccessMessage(`Successfully deleted ${downloadedNotes.length} offline audio files from local storage.`);
      setTimeout(() => setDeleteSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to clear downloads:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTriggerSyncAll = () => {
    bridge.triggerHaptic('medium');
    if (!isConnected) {
      if (onConnectDrive) onConnectDrive();
      return;
    }
    if (onSyncDrive) {
      onSyncDrive();
      return;
    }
    const unsynced = audioItems.filter((a) => !a.google_drive_file_id);
    unsynced.forEach((audio) => {
      if (onSyncItemToDrive) onSyncItemToDrive(audio);
    });
  };

  const handleTriggerDownloadAll = () => {
    bridge.triggerHaptic('medium');
    if (!isConnected) {
      if (onConnectDrive) onConnectDrive();
      return;
    }
    const cloudOnly = audioItems.filter((a) => !a.is_downloaded_offline);
    cloudOnly.forEach((audio) => {
      if (onDownloadItemFromDrive) onDownloadItemFromDrive(audio);
    });
  };

  return (
    <div className="space-y-4 pb-28 pt-3 px-4 max-w-md mx-auto animate-in fade-in duration-200">
      {/* 1. Page Header with Title & Storage Badge */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">
            Downloads
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Offline local storage & Google Drive sync
          </p>
        </div>

        {downloadedNotes.length > 0 && (
          <button
            onClick={() => {
              bridge.triggerHaptic('light');
              setShowConfirmDeleteModal(true);
            }}
            className="py-1.5 px-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-semibold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-2xs cursor-pointer"
            title="Delete all downloaded files from device local storage"
            aria-label="Delete all downloaded files"
          >
            <Trash2 size={13} className="text-rose-600" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Success Notification Banner */}
      {deleteSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 text-xs text-emerald-800 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-medium">{deleteSuccessMessage}</span>
          </div>
          <button
            onClick={() => setDeleteSuccessMessage(null)}
            className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. Google Drive Account & Sovereign Sync Card (from Image 2) */}
      <div className="p-3.5 bg-gradient-to-br from-white via-sky-50/40 to-blue-50/30 border border-sky-200/80 rounded-2xl shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-sky-100 text-[#24A1DE] flex items-center justify-center shrink-0 shadow-2xs">
              <Cloud size={19} />
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
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold flex items-center gap-1 shadow-2xs">
                <CheckCircle2 size={11} className="text-emerald-600" /> Synced
              </span>
            ) : (
              <button
                onClick={onConnectDrive}
                className="px-3 py-1 rounded-xl bg-[#24A1DE] hover:bg-[#1f8fca] text-white text-[11px] font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Connect Drive
              </button>
            )}
          </div>
        </div>

        {/* Storage Quota Usage Bar */}
        {isConnected && storageQuota && (
          <div className="space-y-1 pt-1">
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

        {/* Sync to Drive & Offline Cache Action Buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={handleTriggerSyncAll}
            disabled={isSyncingDrive}
            className="flex-1 py-2 px-3 rounded-xl bg-white border border-sky-200 text-sky-800 hover:bg-sky-50 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            title="Sync any unsynced audio notes to personal Google Drive"
          >
            {isSyncingDrive ? (
              <RefreshCw size={13} className="text-[#24A1DE] animate-spin" />
            ) : (
              <Upload size={13} className="text-[#24A1DE]" />
            )}
            <span>{isSyncingDrive ? 'Syncing...' : 'Sync to Drive'}</span>
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

      {/* 3. One-Click Delete All Local Downloads Banner (when files exist) */}
      <div className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <HardDrive size={16} />
          </div>
          <div className="min-w-0">
            <h5 className="text-xs font-bold text-slate-900 truncate">
              Local Storage
            </h5>
            <p className="text-[10px] text-slate-500 font-mono truncate">
              {`${downloadedNotes.length} files · ${formatBytes(totalDownloadedBytes)} on device`}
            </p>
          </div>
        </div>

        {downloadedNotes.length > 0 ? (
          <button
            onClick={() => {
              bridge.triggerHaptic('medium');
              setShowConfirmDeleteModal(true);
            }}
            className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
            aria-label="Delete all downloaded files"
          >
            <Trash2 size={13} />
            <span>Delete All</span>
          </button>
        ) : (
          <span className="text-[10.5px] font-mono text-emerald-600 font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200/70">
            Clean (0 B)
          </span>
        )}
      </div>

      {/* 4. Active Transfers Stream (if any) */}
      {activeTransfers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
              <RefreshCw size={12} className="animate-spin text-[#24A1DE]" />
              {`Active Transfers (${activeTransfers.length})`}
            </span>
            <span className="text-[10px] font-mono text-sky-600 font-semibold">Streaming</span>
          </div>

          <div className="space-y-2">
            {activeTransfers.map((transfer) => (
              <Attachment
                key={transfer.id}
                state={transfer.state}
                size="default"
                className="shadow-xs"
              >
                <AttachmentMedia variant="icon">
                  {transfer.direction === 'upload' ? (
                    <Upload size={17} className="animate-bounce text-[#24A1DE]" />
                  ) : (
                    <Download size={17} className="animate-bounce text-[#24A1DE]" />
                  )}
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{transfer.fileName}</AttachmentTitle>
                  <AttachmentDescription>
                    {`${
                      transfer.direction === 'upload' ? 'Uploading to Drive' : 'Downloading from Drive'
                    } · ${transfer.progressPercent}% · ${
                      transfer.state === 'processing'
                        ? 'Finalizing sync...'
                        : formatBytes(transfer.fileSizeBytes)
                    }`}
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

      {/* 5. Downloaded Drive Audio Notes List (Directly from Image 2) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            {`DOWNLOADED DRIVE AUDIO NOTES (${downloadedNotes.length})`}
          </span>
          <span className="text-[10px] font-mono text-slate-400">My Drive / Smriti</span>
        </div>

        {downloadedNotes.length === 0 ? (
          <Empty className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center shadow-2xs">
            <EmptyHeader>
              <EmptyMedia
                variant="icon"
                className="size-10 rounded-full bg-sky-50 text-[#24A1DE] mx-auto flex items-center justify-center mb-0.5"
              >
                <HardDrive size={18} />
              </EmptyMedia>
              <EmptyTitle className="text-xs font-semibold text-slate-800">
                No downloaded notes yet
              </EmptyTitle>
              <EmptyDescription className="text-[11px] text-slate-500 max-w-xs mx-auto">
                All notes remain safe in your Google Drive. Tap the download icon in your Subject Folders to cache notes on device for instant offline playback.
              </EmptyDescription>
            </EmptyHeader>
            {onNavigateToLibrary && (
              <div className="mt-3 flex justify-center">
                <button
                  onClick={onNavigateToLibrary}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  <Folder size={14} />
                  <span>Explore Subject Folders</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </Empty>
        ) : (
          <div className="space-y-2">
            {downloadedNotes.map((audio) => {
              const visual = resolveSubjectVisual({
                subjectId: audio.subject_id,
                subjectName: audio.subject_name
              });
              const Icon = visual.icon;
              const isPlayingThis = Boolean(
                playbackState?.isPlaying && playbackState?.currentAudio?.id === audio.id
              );

              return (
                <div
                  key={audio.id}
                  className={`bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs transition-all ${
                    isPlayingThis ? 'border-[#24A1DE] ring-1 ring-[#24A1DE]/20 bg-sky-50/15' : ''
                  }`}
                >
                  {/* Subject Icon Medallion */}
                  <div
                    className="size-10 rounded-xl flex items-center justify-center shrink-0 border border-black/5 shadow-2xs"
                    style={{ background: visual.colorHex + '20', color: visual.colorHex }}
                  >
                    <Icon size={18} strokeWidth={2.2} />
                  </div>

                  {/* Title & Metadata */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-snug">
                      {audio.title}
                    </h4>
                    <p className="text-[10.5px] text-slate-500 font-mono mt-0.5 truncate flex items-center gap-1.5">
                      <span>{audio.subject_name || visual.label}</span>
                      <span>•</span>
                      <span>{formatBytes(audio.file_size_bytes)}</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold">Offline Ready</span>
                    </p>
                  </div>

                  {/* Right Actions: Checkmark, Play/Pause, and Delete Download Button */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Offline ready check badge */}
                    <span
                      className="size-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60 shadow-2xs"
                      title="Stored in local storage for offline playback"
                    >
                      <CheckCircle2 size={15} className="text-emerald-600" />
                    </span>

                    {/* Single Play / Pause Button */}
                    <button
                      onClick={() => onPlayAudio(audio)}
                      className={`size-8 rounded-full flex items-center justify-center text-white transition-all active:scale-90 shadow-xs cursor-pointer ${
                        isPlayingThis
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-slate-950 hover:bg-slate-800'
                      }`}
                      aria-label={isPlayingThis ? `Pause ${audio.title}` : `Play ${audio.title}`}
                      title={isPlayingThis ? 'Pause' : 'Play'}
                    >
                      {isPlayingThis ? (
                        <Pause size={13} fill="currentColor" />
                      ) : (
                        <Play size={13} fill="currentColor" className="translate-x-0.5" />
                      )}
                    </button>

                    {/* Individual Remove from Local Storage */}
                    <button
                      onClick={() => {
                        bridge.triggerHaptic('light');
                        onToggleOffline(audio);
                      }}
                      className="size-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                      title="Remove from offline storage"
                      aria-label={`Remove ${audio.title} from offline downloads`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal Dialog for Delete All Local Downloads */}
      {showConfirmDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-all-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setShowConfirmDeleteModal(false);
            }
          }}
        >
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                <AlertTriangle size={20} />
              </div>
              <div className="min-w-0">
                <h3 id="delete-all-title" className="text-sm font-bold text-slate-900 leading-snug">
                  Delete All Downloaded Files?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Free up device local storage
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
              This will remove all <strong className="text-slate-900">{downloadedNotes.length} offline audio files</strong> ({formatBytes(totalDownloadedBytes)}) from your device's local storage.
              <br /><br />
              <span className="text-emerald-700 font-medium">✓ Your recordings remain safely backed up in your personal Google Drive and can be re-downloaded at any time.</span>
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowConfirmDeleteModal(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
              >
                Keep Files
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteAll}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Delete All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

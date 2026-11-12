import React, { useState, useEffect } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  Trash2,
  HardDrive,
  RefreshCw,
  Tag,
  X,
  Check,
  BookOpen,
  Cloud,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { bridge } from '../services/bridge';
import { Subject, AudioItem, UploadProgressState } from '../types';
import { formatDuration } from '../services/learningEngine';
import { AudioTrimmer } from './AudioTrimmer';
import { trimAudioBlob } from '../services/audioTrimmerEngine';
import { resolveSubjectVisual } from '../utils/subjectVisuals';

interface RecordTabProps {
  subjects: Subject[];
  onSaveAudio: (
    audioItem: Partial<AudioItem>,
    fileBlob?: Blob,
    options?: { syncToDrive?: boolean },
    onProgress?: (progress: UploadProgressState) => void
  ) => Promise<void>;
  onCancel: () => void;
  isDriveConnected?: boolean;
  onConnectDrive?: () => Promise<void>;
  initialState?: 'idle' | 'recording' | 'paused' | 'review';
  initialTitle?: string;
  initialUploadProgress?: UploadProgressState | null;
  initialIsSaving?: boolean;
}

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const RecordTab: React.FC<RecordTabProps> = ({
  subjects,
  onSaveAudio,
  onCancel,
  isDriveConnected = false,
  onConnectDrive,
  initialState = 'idle',
  initialTitle = '',
  initialUploadProgress = null,
  initialIsSaving = false
}) => {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'review'>(initialState);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [liveAmplitudes, setLiveAmplitudes] = useState<number[]>(new Array(32).fill(15));
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  // Post-recording Review & Edit state
  const [title, setTitle] = useState(initialTitle);
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [enhancementEnabled, setEnhancementEnabled] = useState(true);
  const [syncToDrive, setSyncToDrive] = useState(isDriveConnected);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(initialUploadProgress);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);

  useEffect(() => {
    if (isDriveConnected) {
      setSyncToDrive(true);
    }
  }, [isDriveConnected]);

  // Trim state
  const [trimStartSeconds, setTrimStartSeconds] = useState(0);
  const [trimEndSeconds, setTrimEndSeconds] = useState(0);
  const [trimFadeIn, setTrimFadeIn] = useState(true);
  const [trimFadeOut, setTrimFadeOut] = useState(true);

  const [isSaving, setIsSaving] = useState(initialIsSaving);

  // Listen to Bridge live amplitude events
  useEffect(() => {
    const unsubscribe = bridge.subscribe((eventName, data) => {
      if (eventName === 'recordingAmplitudeSample') {
        const amp = data.amplitude || 15;
        setLiveAmplitudes(prev => [...prev.slice(1), amp]);
      } else if (eventName === 'recordingCompleted') {
        const finalUrl = data.fileUri || (data.blob ? URL.createObjectURL(data.blob) : null);
        setRecordedUrl(finalUrl);
        const finalDur = recordedDuration > 0 ? recordedDuration : (data.durationSeconds || 15);
        setRecordedDuration(finalDur);
        setTrimEndSeconds(finalDur);
        setRecordingState('review');

        if (data.blob) {
          setRecordedBlob(data.blob);
        } else if (finalUrl) {
          fetch(finalUrl)
            .then(res => res.blob())
            .then(blob => setRecordedBlob(blob))
            .catch(err => console.warn('Note: Could not convert fileUri to blob', err));
        }
      }
    });

    return () => unsubscribe();
  }, [recordedDuration]);

  // Recording Timer
  useEffect(() => {
    let timer: any = null;
    if (recordingState === 'recording') {
      timer = setInterval(() => {
        setRecordedDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [recordingState]);

  // Initialize title on entering review
  useEffect(() => {
    if (recordingState === 'review' && !title) {
      setTitle(`Lecture Note ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
    }
  }, [recordingState, title]);

  // Subject Visual Helpers - Generalized for all academic and study subjects
  const getSubjectVisual = (name: string, iconName?: string, colorHex?: string) => {
    const visual = resolveSubjectVisual({
      subjectName: name,
      iconName,
      colorHex,
      subjects
    });

    const bgParts = visual.bg.split(' ');
    const bgClass = bgParts[0] || 'bg-indigo-50';
    const colorClass = bgParts[1] || 'text-indigo-600';

    return {
      icon: visual.icon,
      colorClass,
      bgClass,
      activeBorder: `border-indigo-600 ring-2 ring-indigo-500/20 ${visual.cardBg}`,
      badgeBg: visual.badgeBg
    };
  };

  // Title Category Shortcuts
  const categoryPills = [
    'Concept',
    'Derivation',
    'Formula',
    'Revision',
    'Exam Note'
  ];

  const applyCategory = (category: string) => {
    if (!title.trim() || title.startsWith('Lecture Note')) {
      const curSub = subjects.find(s => s.id === selectedSubjectId);
      setTitle(`${curSub?.name || 'Academic'} - ${category}`);
    } else if (!title.includes(category)) {
      setTitle(prev => `${prev} (${category})`);
    }
  };

  // Subject-specific smart concept suggestions
  const subjectConcepts: Record<string, string[]> = {
    'Physics': ['Derivation', 'Formulas', 'SI Units', 'Conservation Laws', 'Numericals'],
    'Chemistry': ['Mechanism', 'Equilibrium', 'Periodic Trends', 'Enthalpy', 'Isomerism'],
    'Biology': ['Cell Biology', 'Metabolic Pathway', 'Physiology', 'Genetics', 'Diagrams'],
    'Mathematics': ['Theorem Proof', 'Identities', 'Calculus', 'Matrix Rules', 'Vectors']
  };

  const currentSubject = subjects.find(s => s.id === selectedSubjectId);
  const currentSubjectName = currentSubject?.name || 'General';
  const suggestedConcepts = subjectConcepts[currentSubjectName] || ['Core Concept', 'Summary', 'Key Note'];

  // Tag Handlers
  const addTag = (tagText: string) => {
    const trimmed = tagText.trim().replace(/^#+/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(newTagInput);
      setNewTagInput('');
    }
  };

  // Recording Controls
  const handleStartRecording = async () => {
    const success = await bridge.startRecording({ enableNoiseSuppression: enhancementEnabled });
    if (success) {
      setRecordedDuration(0);
      setRecordingState('recording');
    }
  };

  const handleStopRecording = () => {
    bridge.stopRecording();
  };

  const handleTrimChange = (start: number, end: number, fadeIn: boolean, fadeOut: boolean) => {
    setTrimStartSeconds(start);
    setTrimEndSeconds(end);
    setTrimFadeIn(fadeIn);
    setTrimFadeOut(fadeOut);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      let finalBlob = recordedBlob;
      if (!finalBlob && recordedUrl) {
        try {
          const res = await fetch(recordedUrl);
          finalBlob = await res.blob();
        } catch (e) {
          console.warn('Note: Could not extract blob from url', e);
        }
      }

      const effectiveEnd = (trimEndSeconds && trimEndSeconds > 0) ? trimEndSeconds : recordedDuration;
      let effectiveDuration = Math.max(1, Math.round(effectiveEnd - trimStartSeconds));
      let peaksToSave = liveAmplitudes;

      // CLIENT-SIDE AUDIO TRIMMING
      if (
        finalBlob &&
        (trimStartSeconds > 0.05 || effectiveEnd < recordedDuration - 0.05 || trimFadeIn || trimFadeOut)
      ) {
        try {
          const trimmedResult = await trimAudioBlob(
            finalBlob,
            trimStartSeconds,
            effectiveEnd,
            {
              fadeIn: trimFadeIn,
              fadeOut: trimFadeOut
            }
          );
          finalBlob = trimmedResult.blob;
          effectiveDuration = Math.round(trimmedResult.durationSeconds);
          peaksToSave = trimmedResult.peaks;
        } catch (trimErr) {
          console.warn('Audio trimming fallback, keeping original blob:', trimErr);
        }
      }

      const sub = subjects.find(s => s.id === selectedSubjectId);

      await onSaveAudio(
        {
          title: title.trim(),
          subject_id: selectedSubjectId,
          subject_name: sub?.name || 'General',
          duration_seconds: effectiveDuration,
          source_type: 'recorded',
          file_format: 'wav',
          file_size_bytes: finalBlob ? finalBlob.size : 2500000,
          audio_enhancement_applied: enhancementEnabled,
          waveform_peaks: peaksToSave,
          key_terms: tags,
          is_favorite: false,
          is_downloaded_offline: false
        },
        finalBlob || undefined,
        { syncToDrive },
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // Reset
      setRecordingState('idle');
      setRecordedDuration(0);
      setRecordedBlob(null);
      setRecordedUrl(null);
      setTags([]);
      setUploadProgress(null);
    } catch (e) {
      console.error('Failed to save audio', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setRecordingState('idle');
    setRecordedDuration(0);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setTags([]);
    onCancel();
  };

  const handleConnectDriveFromRecord = async () => {
    if (!onConnectDrive) return;
    setIsConnectingDrive(true);
    try {
      await onConnectDrive();
      setSyncToDrive(true);
    } finally {
      setIsConnectingDrive(false);
    }
  };

  return (
    <div className="space-y-4 pb-36 pt-3 px-4 max-w-md mx-auto">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-2xl font-black text-slate-950 tracking-tight">
          {recordingState === 'review' ? 'Review & Organize' : 'Record Note'}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {recordingState === 'review'
            ? 'Trim audio, assign to a subject folder, and tag key concepts.'
            : 'Clean voice capture with on-device DSP noise suppression & visual trimming.'}
        </p>
      </div>

      {/* RECORDING / IDLE STATE */}
      {recordingState !== 'review' ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs flex flex-col items-center justify-center space-y-5 min-h-[380px]">
          {/* Status Indicator Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
            <span
              className={`w-2 h-2 rounded-full ${
                recordingState === 'recording'
                  ? 'bg-rose-500 animate-ping'
                  : recordingState === 'paused'
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
              {recordingState === 'recording'
                ? 'Recording Live'
                : recordingState === 'paused'
                ? 'Recording Paused'
                : 'Ready to Record'}
            </span>
          </div>

          {/* Large Digital Timer */}
          <div className="text-5xl font-black font-mono text-slate-950 tracking-tight">
            {formatDuration(recordedDuration)}
          </div>

          {/* Live Waveform Visualizer */}
          <div className="w-full flex items-center justify-center gap-1.5 h-20 px-4">
            {liveAmplitudes.map((amp, idx) => (
              <div
                key={idx}
                className={`w-1.5 rounded-full transition-all duration-100 ${
                  recordingState === 'recording'
                    ? 'bg-blue-600'
                    : 'bg-slate-200'
                }`}
                style={{
                  height: recordingState === 'recording' ? `${Math.max(12, amp)}%` : '15%'
                }}
              />
            ))}
          </div>

          {/* Main Action Buttons */}
          <div className="flex items-center gap-4 pt-2">
            {recordingState === 'idle' ? (
              <button
                onClick={handleStartRecording}
                className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                aria-label="Start recording"
              >
                <Mic size={30} strokeWidth={2.4} />
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="w-18 h-18 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
                aria-label="Stop and review recording"
              >
                <Square size={24} fill="currentColor" />
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 text-center max-w-xs leading-relaxed">
            {recordingState === 'idle'
              ? 'Tap microphone to start recording. Saved to your sovereign Google Drive.'
              : 'Speak clearly into the microphone. Tap red square to stop and trim.'}
          </p>
        </div>
      ) : (
        /* POST-RECORDING REVIEW & INTERACTIVE TRIM STATE */
        <div className="space-y-4">
          {/* Top Status Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Recording Finished
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              {formatDuration(recordedDuration)} total
            </span>
          </div>

          {/* 1. VISUAL AUDIO TRIMMER (Studio dark waveform, tactile handles & timeline) */}
          <AudioTrimmer
            durationSeconds={recordedDuration}
            audioUrl={recordedUrl}
            waveformPeaks={liveAmplitudes}
            initialStartSeconds={0}
            initialEndSeconds={recordedDuration}
            onTrimChange={handleTrimChange}
          />

          {/* 2. SUBJECT ASSIGNMENT (4 Clean Modern Cards) */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BookOpen size={13} className="text-slate-400" />
                <span>Assign to Subject</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                1 tap assignment
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {subjects.map((s) => {
                const visual = getSubjectVisual(s.name, s.icon_name, s.color_hex);
                const Icon = visual.icon;
                const isSelected = selectedSubjectId === s.id;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(s.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? visual.activeBorder
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl ${visual.bgClass} ${visual.colorClass} flex items-center justify-center shrink-0 shadow-2xs`}>
                      <Icon size={18} strokeWidth={2.2} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {s.name}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-slate-950 text-white flex items-center justify-center shrink-0">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block truncate">
                        {s.item_count ? `${s.item_count} notes` : 'Folder'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. LESSON TITLE & CATEGORY CHIPS */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-2xs space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Lesson Title
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Clear & descriptive
                </span>
              </div>

              {/* Title Input */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Thermodynamics Carnot Cycle Derivation"
                className="w-full bg-slate-50/80 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-2xs transition-all font-medium"
              />

              {/* Quick Category Chips (Linear style) */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                <span className="text-[10px] text-slate-400 uppercase font-mono mr-0.5 shrink-0">Type:</span>
                {categoryPills.map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => applyCategory(pill)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    + {pill}
                  </button>
                ))}
              </div>
            </div>

            {/* TAGS & KEY CONCEPTS */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Tag size={12} className="text-slate-400" />
                  <span>Key Concepts & Tags</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {tags.length} added
                </span>
              </div>

              {/* Active Tags Chips */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono font-medium text-slate-800 shadow-2xs group"
                    >
                      <span className="text-slate-400">#</span>
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                        title="Remove tag"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested Concept Tags from Curriculum */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono mr-0.5 shrink-0">Suggest:</span>
                {suggestedConcepts.map((concept) => {
                  const isAlreadyAdded = tags.includes(concept);
                  return (
                    <button
                      key={concept}
                      type="button"
                      onClick={() => isAlreadyAdded ? removeTag(concept) : addTag(concept)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all active:scale-95 cursor-pointer whitespace-nowrap border ${
                        isAlreadyAdded
                          ? 'bg-slate-900 border-slate-900 text-white font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {isAlreadyAdded ? `✓ ${concept}` : `+ ${concept}`}
                    </button>
                  );
                })}
              </div>

              {/* Custom Tag Input */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Type a custom tag and press Enter or comma..."
                  className="w-full bg-slate-50/70 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl pl-3 pr-16 py-2 text-[11px] text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-2xs transition-all font-mono"
                />
                {newTagInput.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      addTag(newTagInput);
                      setNewTagInput('');
                    }}
                    className="absolute right-2 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-semibold active:scale-95 cursor-pointer"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 4. ON-DEVICE DSP NOISE SUPPRESSION */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Neural DSP Voice Clarity
                </span>
                <span className="text-[10px] text-slate-500">
                  On-device background noise reduction applied
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEnhancementEnabled(!enhancementEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                enhancementEnabled ? 'bg-slate-950' : 'bg-slate-200'
              }`}
              aria-label="Toggle DSP Noise Suppression"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  enhancementEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 5. GOOGLE DRIVE CLOUD BACKUP SYNC */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                  isDriveConnected
                    ? 'bg-sky-50 text-sky-600 border-sky-200/80 shadow-2xs'
                    : 'bg-slate-50 text-slate-400 border-slate-200/80'
                }`}
              >
                <Cloud size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    Google Drive Backup
                  </span>
                  {isDriveConnected && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                      CONNECTED
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 block truncate">
                  {isDriveConnected
                    ? 'Sync audio note to Google Drive cloud folder'
                    : 'Connect Drive for free cloud storage backup'}
                </span>
              </div>
            </div>

            {isDriveConnected ? (
              <button
                type="button"
                onClick={() => setSyncToDrive(!syncToDrive)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                  syncToDrive ? 'bg-sky-500' : 'bg-slate-200'
                }`}
                aria-label="Toggle Google Drive Sync"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    syncToDrive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectDriveFromRecord}
                disabled={isConnectingDrive}
                className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 text-[11px] font-semibold flex items-center gap-1 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isConnectingDrive ? (
                  <RefreshCw size={11} className="animate-spin text-sky-600" />
                ) : (
                  <Cloud size={11} />
                )}
                <span>Connect</span>
              </button>
            )}
          </div>

          {/* 6. LIVE UPLOAD & BACKUP PROGRESS BAR */}
          {(isSaving || uploadProgress) && uploadProgress && (
            <div
              role="status"
              aria-live="polite"
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ring-1 ring-sky-500/10"
            >
              {/* Header: Icon, Stage Info & Percentage Badge */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                      uploadProgress.stage === 'done'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200/80'
                        : uploadProgress.stage === 'error'
                        ? 'bg-rose-50 text-rose-600 border-rose-200/80'
                        : 'bg-sky-50 text-sky-600 border-sky-200/80 shadow-2xs'
                    }`}
                  >
                    {uploadProgress.stage === 'done' ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : uploadProgress.stage === 'error' ? (
                      <AlertCircle size={18} className="text-rose-600" />
                    ) : (
                      <Cloud size={18} className="text-sky-600 animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {uploadProgress.stage === 'done'
                        ? 'Backup Complete'
                        : uploadProgress.stage === 'error'
                        ? 'Upload Interrupted (Saved Locally)'
                        : uploadProgress.stage === 'uploading'
                        ? 'Saving to Google Drive'
                        : uploadProgress.stage === 'optimizing'
                        ? 'Optimizing Audio'
                        : 'Saving Audio Note'}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {uploadProgress.message || 'Processing and synchronizing note...'}
                    </p>
                  </div>
                </div>

                {/* Real-time Percentage Badge */}
                <div className="shrink-0 flex items-center gap-1.5">
                  <span
                    data-testid="upload-percentage"
                    className={`font-mono font-bold text-xs px-2.5 py-1 rounded-full border transition-all shadow-2xs ${
                      uploadProgress.stage === 'done'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                        : uploadProgress.stage === 'error'
                        ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                        : 'bg-sky-50 text-sky-700 border-sky-200/80'
                    }`}
                  >
                    {uploadProgress.percent}%
                  </span>
                </div>
              </div>

              {/* Modern Aesthetic Multi-Stop Progress Bar with Shimmer */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-100/90 border border-slate-200/60 rounded-full h-3 p-0.5 overflow-hidden relative shadow-inner">
                  <div
                    data-testid="upload-progress-bar"
                    role="progressbar"
                    aria-valuenow={uploadProgress.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className={`h-full rounded-full transition-all duration-300 ease-out shadow-xs relative overflow-hidden ${
                      uploadProgress.stage === 'done'
                        ? 'bg-emerald-500'
                        : uploadProgress.stage === 'error'
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500'
                    }`}
                    style={{ width: `${Math.max(4, uploadProgress.percent)}%` }}
                  >
                    {/* Animated Shimmer Sweep */}
                    {uploadProgress.stage !== 'done' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    )}
                  </div>
                </div>

                {/* Byte Metrics & Transfer Status Footer */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-700">
                      {uploadProgress.loadedBytes > 0
                        ? formatBytes(uploadProgress.loadedBytes)
                        : '0 KB'}
                    </span>
                    <span>/</span>
                    <span>
                      {uploadProgress.totalBytes > 0
                        ? formatBytes(uploadProgress.totalBytes)
                        : 'Estimating size...'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {uploadProgress.stage === 'uploading' && (
                      <span className="flex items-center gap-1 text-sky-600 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping inline-block" />
                        <span>Real-time transfer</span>
                      </span>
                    )}
                    {uploadProgress.stage === 'done' && (
                      <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                        <span>Synced to Drive</span>
                      </span>
                    )}
                    {uploadProgress.stage === 'local_save' && (
                      <span className="text-slate-500 font-medium">Local Storage</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. ACTION BUTTONS (Generous bottom padding so never obscured by floating nav) */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              className="flex-1 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:bg-rose-50/50 hover:border-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Discard</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="flex-[2] py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs active:scale-98 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-amber-400" />
                  <span>
                    {uploadProgress?.stage === 'uploading'
                      ? `Saving to Drive (${uploadProgress.percent}%)`
                      : uploadProgress?.stage === 'done'
                      ? 'Saved & Uploaded!'
                      : uploadProgress
                      ? `Saving Note (${uploadProgress.percent}%)...`
                      : 'Saving Note...'}
                  </span>
                </>
              ) : (
                <>
                  <HardDrive size={14} className="text-emerald-400" />
                  <span>Save Audio Note</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

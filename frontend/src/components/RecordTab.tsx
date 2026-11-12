import React, { useState, useEffect } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  Trash2,
  HardDrive,
  RefreshCw,
  Atom,
  FlaskConical,
  Dna,
  Binary,
  Tag,
  X,
  Check,
  BookOpen
} from 'lucide-react';
import { bridge } from '../services/bridge';
import { Subject, AudioItem } from '../types';
import { formatDuration } from '../services/learningEngine';
import { AudioTrimmer } from './AudioTrimmer';
import { trimAudioBlob } from '../services/audioTrimmerEngine';

interface RecordTabProps {
  subjects: Subject[];
  onSaveAudio: (audioItem: Partial<AudioItem>, fileBlob?: Blob) => Promise<void>;
  onCancel: () => void;
}

export const RecordTab: React.FC<RecordTabProps> = ({
  subjects,
  onSaveAudio,
  onCancel
}) => {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'review'>('idle');
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [liveAmplitudes, setLiveAmplitudes] = useState<number[]>(new Array(32).fill(15));
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  // Post-recording Review & Edit state
  const [title, setTitle] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [enhancementEnabled, setEnhancementEnabled] = useState(true);

  // Trim state
  const [trimStartSeconds, setTrimStartSeconds] = useState(0);
  const [trimEndSeconds, setTrimEndSeconds] = useState(0);
  const [trimFadeIn, setTrimFadeIn] = useState(true);
  const [trimFadeOut, setTrimFadeOut] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

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

  // Subject Visual Helpers
  const getSubjectVisual = (name: string, iconName?: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('physic') || iconName === 'Atom') {
      return {
        icon: Atom,
        colorClass: 'text-violet-600',
        bgClass: 'bg-violet-50',
        activeBorder: 'border-violet-600 ring-2 ring-violet-500/20 bg-violet-50/50',
        badgeBg: 'bg-violet-100 text-violet-800'
      };
    }
    if (n.includes('chem') || iconName === 'FlaskConical') {
      return {
        icon: FlaskConical,
        colorClass: 'text-rose-600',
        bgClass: 'bg-rose-50',
        activeBorder: 'border-rose-600 ring-2 ring-rose-500/20 bg-rose-50/50',
        badgeBg: 'bg-rose-100 text-rose-800'
      };
    }
    if (n.includes('bio') || iconName === 'Dna') {
      return {
        icon: Dna,
        colorClass: 'text-emerald-600',
        bgClass: 'bg-emerald-50',
        activeBorder: 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/50',
        badgeBg: 'bg-emerald-100 text-emerald-800'
      };
    }
    return {
      icon: Binary,
      colorClass: 'text-amber-600',
      bgClass: 'bg-amber-50',
      activeBorder: 'border-amber-600 ring-2 ring-amber-500/20 bg-amber-50/50',
      badgeBg: 'bg-amber-100 text-amber-800'
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
          is_downloaded_offline: true
        },
        finalBlob || undefined
      );

      // Reset
      setRecordingState('idle');
      setRecordedDuration(0);
      setRecordedBlob(null);
      setRecordedUrl(null);
      setTags([]);
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
                const visual = getSubjectVisual(s.name, s.icon_name);
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

          {/* 5. ACTION BUTTONS (Generous bottom padding so never obscured by floating nav) */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleDiscard}
              className="flex-1 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:bg-rose-50/50 hover:border-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs cursor-pointer"
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
                  <span>Saving Note...</span>
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

import React, { useState, useEffect } from 'react';
import { Mic, Square, Play, Pause, Sparkles, Trash2, Sliders, HardDrive, RefreshCw } from 'lucide-react';
import { bridge } from '../services/bridge';
import { Subject, AudioItem } from '../types';
import { formatDuration } from '../services/learningEngine';

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
  const [liveAmplitudes, setLiveAmplitudes] = useState<number[]>(new Array(24).fill(10));
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  // Post-recording Review & Edit state
  const [title, setTitle] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');
  const [keyTermsInput, setKeyTermsInput] = useState('');
  const [enhancementEnabled, setEnhancementEnabled] = useState(true);
  const [trimStartSeconds, setTrimStartSeconds] = useState(0);
  const [trimEndSeconds, setTrimEndSeconds] = useState(0);

  // Preview Player
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Listen to Bridge live amplitude events
  useEffect(() => {
    const unsubscribe = bridge.subscribe((eventName, data) => {
      if (eventName === 'recordingAmplitudeSample') {
        const amp = data.amplitude || 10;
        setLiveAmplitudes(prev => [...prev.slice(1), amp]);
      } else if (eventName === 'recordingCompleted') {
        const finalUrl = data.fileUri || (data.blob ? URL.createObjectURL(data.blob) : null);
        setRecordedUrl(finalUrl);
        setTrimEndSeconds(recordedDuration > 0 ? recordedDuration : (data.durationSeconds || 15));
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

  // Meta Inputs: Smart Click-Oriented Presets
  const titlePresets = [
    'Formula Derivation',
    'Concept Summary',
    'Rapid Revision',
    'Exam Notes',
    'Core Law',
    'Lecture Recap',
    'Problem Solving'
  ];

  const subjectTermPresets: Record<string, string[]> = {
    'Physics': ['Derivation', 'Formulas', 'SI Units', 'Conservation Laws', 'Numericals', 'Definitions'],
    'Chemistry': ['Reaction Mechanism', 'Equilibrium', 'Periodic Trends', 'Enthalpy', 'Nomenclature'],
    'Biology': ['Metabolic Pathway', 'Diagram Notes', 'Physiology', 'Key Terms', 'Taxonomy'],
    'Mathematics': ['Theorem Proof', 'Identities', 'Matrix Rules', 'Shortcuts', 'Calculus Steps'],
    'General': ['Key Points', 'Exam Cues', 'Mnemonic', 'Quick Summary']
  };

  const currentSubjectObj = subjects.find(s => s.id === selectedSubjectId);
  const currentSubjectName = currentSubjectObj?.name || 'General';
  const availableTerms = subjectTermPresets[currentSubjectName] || subjectTermPresets['General'];

  const selectedTerms = keyTermsInput
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  const toggleTerm = (term: string) => {
    if (selectedTerms.includes(term)) {
      const next = selectedTerms.filter(t => t !== term);
      setKeyTermsInput(next.join(', '));
    } else {
      const next = [...selectedTerms, term];
      setKeyTermsInput(next.join(', '));
    }
  };

  const applyTitlePreset = (preset: string) => {
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    setTitle(`${currentSubjectName}: ${preset} (${dateStr})`);
  };

  const adjustTrimStart = (delta: number) => {
    const maxVal = Math.max(0, (trimEndSeconds || recordedDuration) - 1);
    setTrimStartSeconds(prev => Math.max(0, Math.min(maxVal, prev + delta)));
  };

  const adjustTrimEnd = (delta: number) => {
    const minVal = trimStartSeconds + 1;
    setTrimEndSeconds(prev => Math.min(recordedDuration, Math.max(minVal, (prev || recordedDuration) + delta)));
  };

  const handleApplyPresetTrim = (type: 'full' | 'intro3' | 'outro3' | 'playhead') => {
    if (type === 'full') {
      setTrimStartSeconds(0);
      setTrimEndSeconds(recordedDuration);
    } else if (type === 'intro3') {
      setTrimStartSeconds(Math.min(3, Math.max(0, recordedDuration - 1)));
    } else if (type === 'outro3') {
      setTrimEndSeconds(Math.max(trimStartSeconds + 1, recordedDuration - 3));
    } else if (type === 'playhead' && previewAudio) {
      const cur = Math.floor(previewAudio.currentTime);
      if (cur < (trimEndSeconds || recordedDuration)) {
        setTrimStartSeconds(cur);
      }
    }
  };
  useEffect(() => {
    if (recordedUrl && recordingState === 'review') {
      const audio = new Audio(recordedUrl);
      audio.ontimeupdate = () => setPreviewCurrentTime(audio.currentTime);
      audio.onended = () => setIsPreviewPlaying(false);
      setPreviewAudio(audio);
      setTitle(`Study Note ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);

      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, [recordedUrl, recordingState]);

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

  const handleTogglePreview = () => {
    if (!previewAudio) return;
    if (isPreviewPlaying) {
      previewAudio.pause();
      setIsPreviewPlaying(false);
    } else {
      if (trimStartSeconds > 0 && previewAudio.currentTime < trimStartSeconds) {
        previewAudio.currentTime = trimStartSeconds;
      }
      previewAudio.play().catch(e => console.warn('Preview error', e));
      setIsPreviewPlaying(true);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      const effectiveDuration = Math.max(1, (trimEndSeconds || recordedDuration) - trimStartSeconds);
      const sub = subjects.find(s => s.id === selectedSubjectId);

      const terms = keyTermsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      let finalBlob = recordedBlob;
      if (!finalBlob && recordedUrl) {
        try {
          const res = await fetch(recordedUrl);
          finalBlob = await res.blob();
        } catch (e) {
          console.warn('Note: Could not extract blob from url', e);
        }
      }

      await onSaveAudio(
        {
          title: title.trim(),
          subject_id: selectedSubjectId,
          subject_name: sub?.name || 'General',
          duration_seconds: effectiveDuration,
          source_type: 'recorded',
          file_format: 'm4a',
          file_size_bytes: finalBlob ? finalBlob.size : 2500000,
          audio_enhancement_applied: enhancementEnabled,
          waveform_peaks: liveAmplitudes,
          key_terms: terms,
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
    } catch (e) {
      console.error('Failed to save audio', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (previewAudio) previewAudio.pause();
    setRecordingState('idle');
    setRecordedDuration(0);
    setRecordedBlob(null);
    setRecordedUrl(null);
    onCancel();
  };

  return (
    <div className="space-y-4 pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <div>
        <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-amber-700">
          STUDIO RECORDER
        </span>
        <h1 className="text-xl font-extrabold text-slate-950 tracking-tight">
          Record Audio Note
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Clean voice capture with on-device DSP noise suppression.
        </p>
      </div>

      {/* RECORDING / IDLE STATE */}
      {recordingState !== 'review' ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center space-y-5 min-h-[360px]">
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
          <div className="text-4xl font-extrabold font-mono text-slate-950 tracking-tight">
            {formatDuration(recordedDuration)}
          </div>

          {/* Live Waveform Visualizer */}
          <div className="w-full flex items-center justify-center gap-1.5 h-20 px-4">
            {liveAmplitudes.map((amp, idx) => (
              <div
                key={idx}
                className={`w-1.5 rounded-full transition-all duration-100 ${
                  recordingState === 'recording'
                    ? 'bg-amber-500'
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
                className="w-18 h-18 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20 hover:scale-105 active:scale-95 transition-transform"
                aria-label="Start recording"
              >
                <Mic size={28} />
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md shadow-rose-600/25 active:scale-95 transition-transform"
                aria-label="Stop and save recording"
              >
                <Square size={22} fill="currentColor" />
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 text-center max-w-xs leading-relaxed">
            {recordingState === 'idle'
              ? 'Tap microphone to start recording. Saved to your sovereign Google Drive.'
              : 'Speak clearly into the microphone. Noise filtering is applied automatically.'}
          </p>
        </div>
      ) : (
        /* POST-RECORDING REVIEW & TRIM STATE */
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Review & Save Recording
            </h3>
            <span className="text-xs font-mono font-semibold text-slate-500">
              {formatDuration(recordedDuration)} recorded
            </span>
          </div>

          {/* Audio Preview Bar */}
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center justify-between gap-3">
            <button
              onClick={handleTogglePreview}
              className="p-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-transform flex-shrink-0 shadow-2xs"
              aria-label={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
            >
              {isPreviewPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>

            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-900 block truncate">
                Preview Audio
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {formatDuration(previewCurrentTime)} / {formatDuration(recordedDuration)}
              </span>
            </div>
          </div>

          {/* On-Device Audio Enhancement Toggle */}
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center">
                <Sparkles size={14} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Hardware Noise Suppression
                </span>
                <span className="text-[10px] text-slate-500">
                  On-device background noise reduction
                </span>
              </div>
            </div>

            <button
              onClick={() => setEnhancementEnabled(!enhancementEnabled)}
              className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 ${
                enhancementEnabled ? 'bg-slate-900' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                  enhancementEnabled ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Trim Range with Steppers & Quick 1-Tap Presets */}
          <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders size={13} className="text-amber-600" />
                <span>Trim Boundaries</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {formatDuration(trimStartSeconds)} → {formatDuration(trimEndSeconds || recordedDuration)} ({Math.max(1, (trimEndSeconds || recordedDuration) - trimStartSeconds)}s)
              </span>
            </div>

            {/* 1-Tap Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              <button
                type="button"
                onClick={() => handleApplyPresetTrim('full')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-[11px] font-medium text-slate-700 whitespace-nowrap active:scale-95 shadow-2xs"
              >
                Keep Full
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetTrim('intro3')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-[11px] font-medium text-slate-700 whitespace-nowrap active:scale-95 shadow-2xs"
              >
                Trim 3s Intro
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetTrim('outro3')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-[11px] font-medium text-slate-700 whitespace-nowrap active:scale-95 shadow-2xs"
              >
                Trim 3s Outro
              </button>
              {previewAudio && (
                <button
                  type="button"
                  onClick={() => handleApplyPresetTrim('playhead')}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold whitespace-nowrap active:scale-95 shadow-2xs"
                >
                  Start at {formatDuration(Math.floor(previewCurrentTime))}
                </button>
              )}
            </div>

            {/* Steppers for Start & End */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Start Steppers */}
              <div className="bg-white border border-slate-200 rounded-xl p-2 space-y-1 shadow-2xs">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>START</span>
                  <span className="font-bold text-slate-900">{formatDuration(trimStartSeconds)}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => adjustTrimStart(-5)}
                    className="flex-1 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold active:scale-90"
                  >
                    -5s
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustTrimStart(-1)}
                    className="flex-1 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold active:scale-90"
                  >
                    -1s
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustTrimStart(1)}
                    className="flex-1 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold active:scale-90"
                  >
                    +1s
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustTrimStart(5)}
                    className="flex-1 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold active:scale-90"
                  >
                    +5s
                  </button>
                </div>
              </div>

              {/* End Steppers */}
              <div className="bg-white border border-slate-200 rounded-xl p-2 space-y-1 shadow-2xs">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>END</span>
                  <span className="font-bold text-slate-900">{formatDuration(trimEndSeconds || recordedDuration)}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => adjustTrimEnd(-5)}
                    className="flex-1 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold active:scale-90"
                  >
                    -5s
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustTrimEnd(-1)}
                    className="flex-1 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold active:scale-90"
                  >
                    -1s
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustTrimEnd(1)}
                    className="flex-1 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold active:scale-90"
                  >
                    +1s
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustTrimEnd(5)}
                    className="flex-1 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold active:scale-90"
                  >
                    +5s
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Subject 1-Tap Horizontal Pill Bar */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Select Subject
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {subjects.map((s) => {
                const isSelected = selectedSubjectId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(s.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xs scale-[1.02]'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meta Inputs: Title with 1-Tap Style Presets */}
          <div className="space-y-2 pt-0.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Lesson Title
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Tap preset or edit</span>
              </div>

              {/* Title One-Tap Quick Style Chips */}
              <div className="flex flex-wrap gap-1 pb-1">
                {titlePresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyTitlePreset(preset)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 text-[10px] font-medium transition-colors border border-slate-200/80 active:scale-95"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Thermodynamics First Law Derivation"
                className="w-full bg-white border border-slate-200 focus:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-2xs"
              />
            </div>

            {/* Key Terms: One-Tap Topic Chips */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Key Terms & Concepts
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Tap to toggle</span>
              </div>

              {/* Suggested Terms for Chosen Subject */}
              <div className="flex flex-wrap gap-1">
                {availableTerms.map((term) => {
                  const isChecked = selectedTerms.includes(term);
                  return (
                    <button
                      key={term}
                      type="button"
                      onClick={() => toggleTerm(term)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                        isChecked
                          ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {isChecked ? `✓ ${term}` : `+ ${term}`}
                    </button>
                  );
                })}
              </div>

              {/* Active Terms Pills Display */}
              {selectedTerms.length > 0 && (
                <div className="flex flex-wrap gap-1 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                  {selectedTerms.map((term) => (
                    <span
                      key={term}
                      onClick={() => toggleTerm(term)}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-800 flex items-center gap-1 cursor-pointer hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
                      title="Tap to remove"
                    >
                      <span>{term}</span>
                      <span className="text-slate-400 hover:text-rose-600">✕</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Optional Custom Input */}
              <input
                type="text"
                value={keyTermsInput}
                onChange={(e) => setKeyTermsInput(e.target.value)}
                placeholder="Or type custom terms (comma separated)..."
                className="w-full bg-white border border-slate-200 focus:border-slate-400 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-2xs text-[11px]"
              />
            </div>
          </div>

          {/* Save & Discard Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleDiscard}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-rose-600 hover:bg-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Trash2 size={14} />
              <span>Discard</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="flex-[2] py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-amber-400" />
                  <span>Saving to Drive...</span>
                </>
              ) : (
                <>
                  <HardDrive size={14} className="text-amber-400" />
                  <span>Save to Google Drive</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

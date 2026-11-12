import React, { useState, useEffect } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  Trash2,
  HardDrive,
  RefreshCw
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
  const [keyTermsInput, setKeyTermsInput] = useState('');
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
    let next: string[];
    if (selectedTerms.includes(term)) {
      next = selectedTerms.filter(t => t !== term);
    } else {
      next = [...selectedTerms, term];
    }
    setKeyTermsInput(next.join(', '));
  };

  const applyTitlePreset = (preset: string) => {
    if (!title.trim() || title.startsWith('Lecture Note')) {
      setTitle(`${currentSubjectName}: ${preset}`);
    } else {
      setTitle(prev => `${prev} - ${preset}`);
    }
  };

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

      let effectiveDuration = Math.max(1, (trimEndSeconds || recordedDuration) - trimStartSeconds);
      let peaksToSave = liveAmplitudes;

      // GENUINE CLIENT-SIDE AUDIO TRIMMING
      // If user adjusted trim boundaries and blob exists, slice and export trimmed audio
      if (
        finalBlob &&
        (trimStartSeconds > 0.05 || (trimEndSeconds && trimEndSeconds < recordedDuration - 0.2))
      ) {
        try {
          const trimmedResult = await trimAudioBlob(
            finalBlob,
            trimStartSeconds,
            trimEndSeconds || recordedDuration,
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
      const terms = keyTermsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

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
    setRecordingState('idle');
    setRecordedDuration(0);
    setRecordedBlob(null);
    setRecordedUrl(null);
    onCancel();
  };

  return (
    <div className="space-y-4 pb-28 pt-3 px-4 max-w-md mx-auto">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-2xl font-black text-slate-950 tracking-tight">
          Record Note
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Clean voice capture with on-device DSP noise suppression & visual trimming.
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
                Review & Trim Note
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              {formatDuration(recordedDuration)} recorded
            </span>
          </div>

          {/* 1. VISUAL AUDIO TRIMMER (Interactive timeline, handles, steppers & preview) */}
          <AudioTrimmer
            durationSeconds={recordedDuration}
            audioUrl={recordedUrl}
            waveformPeaks={liveAmplitudes}
            initialStartSeconds={0}
            initialEndSeconds={recordedDuration}
            onTrimChange={handleTrimChange}
          />

          {/* 2. ON-DEVICE AUDIO ENHANCEMENT TOGGLE */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Hardware Noise Suppression
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
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  enhancementEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 3. METADATA: SUBJECT, TITLE & CONCEPTS */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4.5 shadow-2xs space-y-3.5">
            {/* Subject Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Assign Subject
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {subjects.map((s) => {
                  const isSelected = selectedSubjectId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSubjectId(s.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-slate-950 border-slate-950 text-white shadow-2xs scale-[1.02]'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lesson Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Lesson Title
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Tap preset or edit</span>
              </div>

              {/* Title Presets */}
              <div className="flex flex-wrap gap-1 pb-1">
                {titlePresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyTitlePreset(preset)}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 text-[10px] font-medium transition-colors border border-slate-200/80 active:scale-95 cursor-pointer"
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
                className="w-full bg-slate-50/70 border border-slate-200 focus:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-2xs"
              />
            </div>

            {/* Key Terms & Concepts */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Concepts & Key Terms
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Tap to toggle</span>
              </div>

              {/* Suggested Terms */}
              <div className="flex flex-wrap gap-1">
                {availableTerms.map((term) => {
                  const isChecked = selectedTerms.includes(term);
                  return (
                    <button
                      key={term}
                      type="button"
                      onClick={() => toggleTerm(term)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border cursor-pointer ${
                        isChecked
                          ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {isChecked ? `✓ ${term}` : `+ ${term}`}
                    </button>
                  );
                })}
              </div>

              {/* Active Terms Pills */}
              {selectedTerms.length > 0 && (
                <div className="flex flex-wrap gap-1 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                  {selectedTerms.map((term) => (
                    <span
                      key={term}
                      onClick={() => toggleTerm(term)}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-800 flex items-center gap-1 cursor-pointer hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
                      title="Tap to remove"
                    >
                      <span>#{term}</span>
                      <span className="text-slate-400 hover:text-rose-600">✕</span>
                    </span>
                  ))}
                </div>
              )}

              <input
                type="text"
                value={keyTermsInput}
                onChange={(e) => setKeyTermsInput(e.target.value)}
                placeholder="Or type custom terms (comma separated)..."
                className="w-full bg-slate-50/70 border border-slate-200 focus:border-slate-400 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-2xs text-[11px]"
              />
            </div>
          </div>

          {/* 4. SAVE & DISCARD BUTTONS */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleDiscard}
              className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:bg-rose-50/50 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Discard</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="flex-[2] py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs active:scale-98 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-amber-400" />
                  <span>Saving Trimmed Audio...</span>
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

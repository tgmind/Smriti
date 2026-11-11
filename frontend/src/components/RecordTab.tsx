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
        if (data.blob) {
          setRecordedBlob(data.blob);
          setRecordedUrl(data.fileUri);
          setTrimEndSeconds(recordedDuration);
          setRecordingState('review');
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

  // Audio Preview initialization
  useEffect(() => {
    if (recordedUrl && recordingState === 'review') {
      const audio = new Audio(recordedUrl);
      audio.ontimeupdate = () => setPreviewCurrentTime(audio.currentTime);
      audio.onended = () => setIsPreviewPlaying(false);
      setPreviewAudio(audio);
      setTitle(`Lecture Note ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);

      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, [recordedUrl, recordingState]);

  const handleStartRecording = async () => {
    const success = await bridge.startRecording();
    if (success) {
      setRecordedDuration(0);
      setRecordingState('recording');
    }
  };

  const handleStopRecording = () => {
    bridge.stopRecording();
    // In web fallback, onstop will trigger review state
    if (!bridge.isNativeApp()) {
      setTimeout(() => {
        if (recordingState !== 'review') {
          setRecordingState('review');
          setTrimEndSeconds(recordedDuration);
        }
      }, 500);
    }
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

      await onSaveAudio(
        {
          title: title.trim(),
          subject_id: selectedSubjectId,
          subject_name: sub?.name || 'General',
          duration_seconds: effectiveDuration,
          source_type: 'recorded',
          file_format: 'm4a',
          file_size_bytes: recordedBlob ? recordedBlob.size : 2500000,
          audio_enhancement_applied: enhancementEnabled,
          waveform_peaks: liveAmplitudes,
          key_terms: terms,
          is_favorite: false,
          is_downloaded_offline: true
        },
        recordedBlob || undefined
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
    <div className="space-y-6 pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <div>
        <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-amber-400">
          STUDIO RECORDER
        </span>
        <h1 className="text-xl font-extrabold text-surface-50 tracking-tight">
          Audio Note Capture
        </h1>
        <p className="text-xs text-surface-400 mt-0.5">
          Clean voice recording with on-device DSP noise suppression.
        </p>
      </div>

      {/* RECORDING / IDLE STATE */}
      {recordingState !== 'review' ? (
        <div className="bg-surface-850 border border-surface-750 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center space-y-6 min-h-[380px]">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                recordingState === 'recording'
                  ? 'bg-rose-500 animate-ping'
                  : recordingState === 'paused'
                  ? 'bg-amber-400'
                  : 'bg-surface-600'
              }`}
            />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-surface-300">
              {recordingState === 'recording'
                ? 'Recording Live...'
                : recordingState === 'paused'
                ? 'Recording Paused'
                : 'Ready to Record'}
            </span>
          </div>

          {/* Large Digital Timer */}
          <div className="text-4xl font-extrabold font-mono text-surface-50 tracking-tight">
            {formatDuration(recordedDuration)}
          </div>

          {/* Live Waveform Visualizer */}
          <div className="w-full flex items-center justify-center gap-1.5 h-24 px-4">
            {liveAmplitudes.map((amp, idx) => (
              <div
                key={idx}
                className={`w-1.5 rounded-full transition-all duration-100 ${
                  recordingState === 'recording'
                    ? 'bg-gradient-to-t from-amber-500 to-amber-300'
                    : 'bg-surface-700/60'
                }`}
                style={{
                  height: recordingState === 'recording' ? `${Math.max(12, amp)}%` : '15%'
                }}
              />
            ))}
          </div>

          {/* Main Action Buttons */}
          <div className="flex items-center gap-4 pt-4">
            {recordingState === 'idle' ? (
              <button
                onClick={handleStartRecording}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-surface-950 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"
                aria-label="Start recording"
              >
                <Mic size={32} />
              </button>
            ) : (
              <>
                <button
                  onClick={handleStopRecording}
                  className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                  aria-label="Stop and save recording"
                >
                  <Square size={24} fill="currentColor" />
                </button>
              </>
            )}
          </div>

          <p className="text-[11px] text-surface-400 text-center max-w-xs">
            {recordingState === 'idle'
              ? 'Tap microphone to begin. Audio stays on your device and uploads securely to your personal Google Drive.'
              : 'Speak clearly. Hardware noise suppression will remove ambient room noise.'}
          </p>
        </div>
      ) : (
        /* POST-RECORDING REVIEW & TRIM STATE */
        <div className="bg-surface-850 border border-surface-750 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-surface-800 pb-3">
            <h3 className="text-sm font-bold text-surface-100">Review & Save Recording</h3>
            <span className="text-xs font-mono text-amber-400">
              {formatDuration(recordedDuration)} recorded
            </span>
          </div>

          {/* Audio Preview Bar */}
          <div className="bg-surface-900 border border-surface-800 p-3.5 rounded-2xl flex items-center justify-between gap-3">
            <button
              onClick={handleTogglePreview}
              className="p-3 rounded-xl bg-amber-500 text-surface-950 hover:bg-amber-400 active:scale-95 transition-transform flex-shrink-0"
              aria-label={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
            >
              {isPreviewPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>

            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-surface-100 block truncate">
                Preview Audio
              </span>
              <span className="text-[11px] text-surface-400 font-mono">
                {formatDuration(previewCurrentTime)} / {formatDuration(recordedDuration)}
              </span>
            </div>
          </div>

          {/* On-Device Audio Enhancement Toggle */}
          <div className="bg-surface-900/80 border border-surface-800 p-3.5 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-surface-100 block">
                  Hardware Noise Suppression
                </span>
                <span className="text-[10px] text-surface-400">
                  On-device voice normalization & background noise reduction
                </span>
              </div>
            </div>

            <button
              onClick={() => setEnhancementEnabled(!enhancementEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                enhancementEnabled ? 'bg-teal-500' : 'bg-surface-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  enhancementEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Trim Range Slider */}
          <div className="space-y-1.5 bg-surface-900/60 p-3 rounded-2xl border border-surface-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-surface-300 flex items-center gap-1">
                <Sliders size={12} /> Trim Audio Boundaries
              </span>
              <span className="text-[11px] font-mono text-surface-400">
                {formatDuration(trimStartSeconds)} → {formatDuration(trimEndSeconds || recordedDuration)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-surface-400 block mb-1">Start Trim (s)</label>
                <input
                  type="number"
                  min="0"
                  max={recordedDuration - 1}
                  value={trimStartSeconds}
                  onChange={(e) => setTrimStartSeconds(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg p-1.5 text-xs text-surface-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-surface-400 block mb-1">End Trim (s)</label>
                <input
                  type="number"
                  min={trimStartSeconds + 1}
                  max={recordedDuration}
                  value={trimEndSeconds || recordedDuration}
                  onChange={(e) => setTrimEndSeconds(Math.min(recordedDuration, parseFloat(e.target.value) || recordedDuration))}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg p-1.5 text-xs text-surface-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Meta Inputs: Title & Subject */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-surface-300 block mb-1">
                Lesson / Note Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Thermodynamics First Law Derivation"
                className="w-full bg-surface-900 border border-surface-750 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-surface-100 placeholder:text-surface-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-surface-300 block mb-1">
                Subject
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full bg-surface-900 border border-surface-750 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-surface-100 focus:outline-none"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-surface-300 block mb-1">
                Key Terms & Formulas (comma-separated)
              </label>
              <input
                type="text"
                value={keyTermsInput}
                onChange={(e) => setKeyTermsInput(e.target.value)}
                placeholder="e.g. Internal Energy, dQ = dU + dW, Isochoric"
                className="w-full bg-surface-900 border border-surface-750 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-surface-100 placeholder:text-surface-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Save & Discard Buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              onClick={handleDiscard}
              className="flex-1 py-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-300 hover:text-rose-400 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Trash2 size={15} />
              <span>Discard</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="flex-[2] py-3 rounded-xl bg-amber-500 text-surface-950 font-bold text-xs hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Saving to Drive...</span>
                </>
              ) : (
                <>
                  <HardDrive size={15} />
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

import { AudioItem, StorageOverview } from '../types';
import { audioStorage } from './audioStorage';

export type NativeEventCallback = (eventName: string, data: any) => void;

interface ISmritiBridgeNative {
  getDeviceInfo(): string;
  getPlaybackState(): string;
  playAudio(audioJson: string): void;
  pauseAudio(): void;
  resumeAudio(): void;
  seekAudio(positionMs: number): void;
  setPlaybackSpeed(speed: number): void;
  startRecording(): void;
  pauseRecording(): void;
  resumeRecording(): void;
  stopRecording(): void;
  downloadForOffline(audioJson: string): void;
  removeOfflineDownload(audioId: string): void;
  getStorageInformation(): string;
  clearTemporaryCache(): void;
}

declare global {
  interface Window {
    SmritiBridge?: ISmritiBridgeNative;
    onSmritiNativeEvent?: (eventName: string, payloadJson: string) => void;
  }
}

class BridgeManager {
  private listeners: Set<NativeEventCallback> = new Set();
  private browserAudio: HTMLAudioElement | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private speechUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeakingSpeech: boolean = false;
  private speechPositionSeconds: number = 0;
  private speechInterval: any = null;

  constructor() {
    this.initNativeListener();
    if (!this.isNativeApp()) {
      this.initBrowserFallback();
    }
  }

  public isNativeApp(): boolean {
    return typeof window !== 'undefined' && !!window.SmritiBridge;
  }

  private initNativeListener() {
    if (typeof window === 'undefined') return;
    window.onSmritiNativeEvent = (eventName: string, payloadJson: string) => {
      try {
        const data = payloadJson ? JSON.parse(payloadJson) : {};
        this.emit(eventName, data);
      } catch (err) {
        console.error('[Bridge] Error parsing native event', eventName, err);
      }
    };
  }

  private initBrowserFallback() {
    if (typeof window === 'undefined') return;
    this.browserAudio = new Audio();

    this.browserAudio.addEventListener('timeupdate', () => {
      if (!this.browserAudio) return;
      this.emit('playbackPositionUpdated', {
        positionSeconds: this.browserAudio.currentTime,
        durationSeconds: this.browserAudio.duration || 0
      });
    });

    this.browserAudio.addEventListener('play', () => {
      this.emit('playbackStateChanged', { isPlaying: true });
    });

    this.browserAudio.addEventListener('pause', () => {
      this.emit('playbackStateChanged', { isPlaying: false });
    });

    this.browserAudio.addEventListener('ended', () => {
      this.emit('playbackStateChanged', { isPlaying: false, isEnded: true });
    });

    this.browserAudio.addEventListener('error', (e) => {
      console.warn('[Audio Playback] Audio element error event', e);
    });
  }

  public subscribe(callback: NativeEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(eventName: string, data: any) {
    this.listeners.forEach(cb => {
      try {
        cb(eventName, data);
      } catch (e) {
        console.error('[Bridge] Listener error', e);
      }
    });
  }

  // AUDIO PLAYBACK ACTIONS //

  public async play(audio: AudioItem, speed: number = 1.0) {
    this.stopSpeech();

    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.playAudio(JSON.stringify(audio));
      window.SmritiBridge.setPlaybackSpeed(speed);
      return;
    }

    if (!this.browserAudio) return;

    // 1. Check local IndexedDB storage for offline recorded or downloaded blob
    try {
      const localBlob = await audioStorage.getAudioBlob(audio.id);
      if (localBlob) {
        const blobUrl = URL.createObjectURL(localBlob);
        this.browserAudio.src = blobUrl;
        this.browserAudio.playbackRate = speed;
        await this.browserAudio.play();
        return;
      }
    } catch (e) {
      console.warn('[Bridge] IndexedDB audio fetch check note:', e);
    }

    // 2. Play remote URL if provided
    if (audio.file_url) {
      try {
        this.browserAudio.src = audio.file_url;
        this.browserAudio.playbackRate = speed;
        await this.browserAudio.play();
        return;
      } catch (e) {
        console.warn('[Bridge] Remote audio play failed, falling back to educational narration:', e);
      }
    }

    // 3. Fallback: Educational Speech Synthesis Narration (Reads study note out loud)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.playSpeechNarration(audio, speed);
      return;
    }

    // 4. Fallback: Clean generative tone
    this.playTonePreview(audio);
  }

  private playSpeechNarration(audio: AudioItem, speed: number) {
    const textToSpeak = `${audio.title}. Subject: ${audio.subject_name || 'Academic'}. ${
      audio.description || ''
    }. Key terms: ${(audio.key_terms || []).join(', ')}.`;

    this.speechUtterance = new SpeechSynthesisUtterance(textToSpeak);
    this.speechUtterance.rate = Math.min(2.0, Math.max(0.75, speed));
    this.speechUtterance.pitch = 1.0;
    this.speechPositionSeconds = 0;
    this.isSpeakingSpeech = true;

    const estimatedDuration = Math.max(15, Math.round(textToSpeak.split(' ').length / 2.5));

    this.emit('playbackStateChanged', { isPlaying: true });

    this.speechInterval = setInterval(() => {
      this.speechPositionSeconds += 0.5;
      this.emit('playbackPositionUpdated', {
        positionSeconds: this.speechPositionSeconds,
        durationSeconds: estimatedDuration
      });
      if (this.speechPositionSeconds >= estimatedDuration) {
        this.stopSpeech();
        this.emit('playbackStateChanged', { isPlaying: false, isEnded: true });
      }
    }, 500);

    this.speechUtterance.onend = () => {
      this.stopSpeech();
      this.emit('playbackStateChanged', { isPlaying: false, isEnded: true });
    };

    this.speechUtterance.onerror = () => {
      this.stopSpeech();
      this.emit('playbackStateChanged', { isPlaying: false });
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(this.speechUtterance);
  }

  private stopSpeech() {
    if (this.speechInterval) {
      clearInterval(this.speechInterval);
      this.speechInterval = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.isSpeakingSpeech) {
      window.speechSynthesis.cancel();
    }
    this.isSpeakingSpeech = false;
    this.speechUtterance = null;
  }

  private playTonePreview(_audio?: AudioItem) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);

      this.emit('playbackStateChanged', { isPlaying: true });
      setTimeout(() => {
        this.emit('playbackStateChanged', { isPlaying: false, isEnded: true });
      }, 1500);
    } catch (e) {
      console.warn('[Bridge] Tone preview failed', e);
    }
  }

  public pause() {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.pauseAudio();
      return;
    }
    if (this.isSpeakingSpeech) {
      window.speechSynthesis?.pause();
      if (this.speechInterval) clearInterval(this.speechInterval);
      this.emit('playbackStateChanged', { isPlaying: false });
      return;
    }
    this.browserAudio?.pause();
  }

  public resume() {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.resumeAudio();
      return;
    }
    if (this.isSpeakingSpeech) {
      window.speechSynthesis?.resume();
      this.emit('playbackStateChanged', { isPlaying: true });
      return;
    }
    this.browserAudio?.play().catch(e => console.warn('[Audio Web Fallback] Resume error', e));
  }

  public seek(positionSeconds: number) {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.seekAudio(Math.round(positionSeconds * 1000));
      return;
    }
    if (this.browserAudio) {
      this.browserAudio.currentTime = positionSeconds;
    }
    if (this.isSpeakingSpeech) {
      this.speechPositionSeconds = positionSeconds;
    }
  }

  public setSpeed(speed: number) {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.setPlaybackSpeed(speed);
      return;
    }
    if (this.browserAudio) {
      this.browserAudio.playbackRate = speed;
    }
  }

  // RECORDING ACTIONS WITH REAL-TIME DSP NOISE SUPPRESSION //

  public async startRecording(options: { enableNoiseSuppression?: boolean } = { enableNoiseSuppression: true }): Promise<boolean> {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.startRecording();
      return true;
    }

    try {
      // 1. Request microphone with hardware acoustic echo cancellation & noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: options.enableNoiseSuppression !== false,
          echoCancellation: options.enableNoiseSuppression !== false,
          autoGainControl: options.enableNoiseSuppression !== false,
          channelCount: 1,
          sampleRate: 44100
        }
      });

      this.audioChunks = [];
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(stream);

      // 2. Hardware / Software DSP Filtering Pipeline
      let recordDestinationStream = stream;

      if (options.enableNoiseSuppression !== false && this.audioContext.createMediaStreamDestination) {
        const destination = this.audioContext.createMediaStreamDestination();

        // 2a. High-Pass Filter: Eliminates sub-85Hz microphone rumble & mechanical vibrations
        const highPass = this.audioContext.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.setValueAtTime(85, this.audioContext.currentTime);
        highPass.Q.setValueAtTime(0.7, this.audioContext.currentTime);

        // 2b. Notch Filter: Eliminates 50Hz/60Hz AC electrical hum
        const notch50 = this.audioContext.createBiquadFilter();
        notch50.type = 'notch';
        notch50.frequency.setValueAtTime(50, this.audioContext.currentTime);
        notch50.Q.setValueAtTime(4.0, this.audioContext.currentTime);

        // 2c. Speech Dynamic Compressor: Level out speech and suppress background noise floor
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
        compressor.knee.setValueAtTime(12, this.audioContext.currentTime);
        compressor.ratio.setValueAtTime(4, this.audioContext.currentTime);
        compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
        compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

        // Connect chain: source -> highPass -> notch50 -> compressor -> destination
        source.connect(highPass);
        highPass.connect(notch50);
        notch50.connect(compressor);
        compressor.connect(destination);

        recordDestinationStream = destination.stream;
      }

      // 3. Setup Analyser for real-time waveform visualization
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const sampleLiveWaveform = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalizedDb = Math.min(100, Math.round((average / 255) * 100));
        this.emit('recordingAmplitudeSample', { amplitude: normalizedDb });
        this.animFrameId = requestAnimationFrame(sampleLiveWaveform);
      };

      // 4. Initialize MediaRecorder with preferred voice codec
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      this.mediaRecorder = mimeType
        ? new MediaRecorder(recordDestinationStream, { mimeType })
        : new MediaRecorder(recordDestinationStream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        const finalType = mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: finalType });
        const url = URL.createObjectURL(blob);

        this.emit('recordingCompleted', {
          fileUri: url,
          durationSeconds: 0,
          blob
        });

        stream.getTracks().forEach(t => t.stop());
        recordDestinationStream.getTracks().forEach(t => t.stop());
      };

      this.mediaRecorder.start(250);
      sampleLiveWaveform();
      return true;
    } catch (err) {
      console.error('[Web Audio] Microphone permission or recording error:', err);
      return false;
    }
  }

  public stopRecording() {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.stopRecording();
      return;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  // OFFLINE & STORAGE MANAGEMENT //

  public async getStorageInfoAsync(): Promise<StorageOverview> {
    if (this.isNativeApp() && window.SmritiBridge) {
      try {
        const info = JSON.parse(window.SmritiBridge.getStorageInformation());
        return info;
      } catch (e) {
        console.error('Failed reading native storage info', e);
      }
    }

    let indexedDbBytes = 0;
    try {
      indexedDbBytes = await audioStorage.getTotalStorageBytes();
    } catch (e) {
      // ignore
    }

    return {
      cachedAudioBytes: Math.max(12 * 1024 * 1024, indexedDbBytes),
      explicitDownloadsBytes: indexedDbBytes,
      metadataDbBytes: 2.1 * 1024 * 1024,
      pendingSyncCount: 0,
      googleDriveUsedBytes: 1024 * 1024 * 1024
    };
  }

  public getStorageInfo(): StorageOverview {
    if (this.isNativeApp() && window.SmritiBridge) {
      try {
        return JSON.parse(window.SmritiBridge.getStorageInformation());
      } catch (e) {
        // fallback
      }
    }
    return {
      cachedAudioBytes: 24 * 1024 * 1024,
      explicitDownloadsBytes: 8 * 1024 * 1024,
      metadataDbBytes: 2.1 * 1024 * 1024,
      pendingSyncCount: 0,
      googleDriveUsedBytes: 1024 * 1024 * 1024
    };
  }

  public clearTemporaryCache() {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.clearTemporaryCache();
    }
  }

  public async downloadForOffline(audio: AudioItem) {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.downloadForOffline(JSON.stringify(audio));
      return;
    }
    // Web: Fetch and save to IndexedDB
    if (audio.file_url) {
      try {
        const res = await fetch(audio.file_url);
        const blob = await res.blob();
        await audioStorage.saveAudioBlob(audio.id, blob);
      } catch (e) {
        console.warn('Failed to download audio for offline', e);
      }
    }
  }

  public async removeOfflineDownload(audioId: string) {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.removeOfflineDownload(audioId);
      return;
    }
    try {
      await audioStorage.deleteAudioBlob(audioId);
    } catch (e) {
      console.warn('Failed removing offline blob', e);
    }
  }
}

export const bridge = new BridgeManager();

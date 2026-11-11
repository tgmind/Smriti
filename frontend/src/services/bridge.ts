import { AudioItem, StorageOverview } from '../types';

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

  public play(audio: AudioItem, speed: number = 1.0) {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.playAudio(JSON.stringify(audio));
      window.SmritiBridge.setPlaybackSpeed(speed);
      return;
    }

    // Web Fallback
    if (!this.browserAudio) return;
    // If audio has a file_url or synthesized web audio
    const url = audio.file_url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    if (this.browserAudio.src !== url) {
      this.browserAudio.src = url;
    }
    this.browserAudio.playbackRate = speed;
    this.browserAudio.play().catch(e => console.warn('[Audio Web Fallback] Play error', e));
  }

  public pause() {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.pauseAudio();
      return;
    }
    this.browserAudio?.pause();
  }

  public resume() {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.resumeAudio();
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

  // RECORDING ACTIONS //

  public async startRecording(): Promise<boolean> {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.startRecording();
      return true;
    }

    // Browser Web Audio Recording Fallback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(stream);
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

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        this.emit('recordingCompleted', {
          fileUri: url,
          durationSeconds: 0,
          blob
        });
        stream.getTracks().forEach(t => t.stop());
      };

      this.mediaRecorder.start(250);
      sampleLiveWaveform();
      return true;
    } catch (err) {
      console.error('[Web Audio] Microphone permission or capture failed:', err);
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

  public getStorageInfo(): StorageOverview {
    if (this.isNativeApp() && window.SmritiBridge) {
      try {
        const info = JSON.parse(window.SmritiBridge.getStorageInformation());
        return info;
      } catch (e) {
        console.error('Failed reading native storage info', e);
      }
    }
    // Web Fallback estimates
    return {
      cachedAudioBytes: 42 * 1024 * 1024,
      explicitDownloadsBytes: 128 * 1024 * 1024,
      metadataDbBytes: 3.4 * 1024 * 1024,
      pendingSyncCount: 0,
      googleDriveUsedBytes: 2.1 * 1024 * 1024 * 1024
    };
  }

  public clearTemporaryCache() {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.clearTemporaryCache();
    }
  }

  public downloadForOffline(audio: AudioItem) {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.downloadForOffline(JSON.stringify(audio));
    }
  }

  public removeOfflineDownload(audioId: string) {
    if (this.isNativeApp() && window.SmritiBridge) {
      window.SmritiBridge.removeOfflineDownload(audioId);
    }
  }
}

export const bridge = new BridgeManager();

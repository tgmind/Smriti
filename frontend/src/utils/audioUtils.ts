/**
 * Audio Utilities for Smriti
 * Handles audio duration extraction, waveform generation, title sanitization, and size formatting.
 */

/**
 * Extracts audio duration in seconds from a File or Blob.
 * Uses HTML5 Audio in browser with safe timeout and error handling.
 * Falls back to 60s in environments without full Audio API support (e.g., node/jsdom).
 */
export const getAudioFileDuration = (file: File | Blob): Promise<number> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      resolve(60);
      return;
    }

    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'metadata';

      let settled = false;
      const cleanup = () => {
        if (!settled) {
          settled = true;
          try {
            URL.revokeObjectURL(url);
            audio.removeAttribute('src');
          } catch {}
        }
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve(60); // 60s fallback on metadata timeout
      }, 3000);

      audio.onloadedmetadata = () => {
        clearTimeout(timer);
        const duration = Math.round(audio.duration);
        cleanup();
        resolve(Number.isFinite(duration) && duration > 0 ? duration : 60);
      };

      audio.onerror = () => {
        clearTimeout(timer);
        cleanup();
        resolve(60);
      };

      audio.src = url;
    } catch {
      resolve(60);
    }
  });
};

/**
 * Sanitizes a raw audio file name into a clean, human-readable study note title.
 * e.g., "Physics_Lecture_04-Optics.mp3" -> "Physics Lecture 04 Optics"
 */
export const sanitizeAudioTitle = (fileName: string): string => {
  if (!fileName) return 'Audio Note';
  // Remove file extension
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  // Replace underscores, hyphens, and multiple dots with single spaces
  const clean = withoutExt
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return clean || 'Audio Note';
};

/**
 * Generates an array of normalized waveform peaks (15-95) for visual audio rendering.
 */
export const generateWaveformPeaks = (sampleCount = 32): number[] => {
  const peaks: number[] = [];
  for (let i = 0; i < sampleCount; i++) {
    // Generate organic-looking speech/audio energy curves
    const base = Math.sin((i / sampleCount) * Math.PI) * 45;
    const variation = Math.sin(i * 1.5) * 20 + 20;
    peaks.push(Math.max(15, Math.min(95, Math.round(base + variation))));
  }
  return peaks;
};

/**
 * Formats byte count into human-readable string (e.g. "4.2 MB", "850 KB").
 */
export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
  }
  const kb = bytes / 1024;
  return `${Math.round(kb)} KB`;
};
